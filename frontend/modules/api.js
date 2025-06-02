// API Management Module
// Handles all API interactions through secure backend proxy

import { CONFIG } from '../config.js';

export class DataCache {
    constructor() {
        this.cache = new Map();
        this.accessOrder = [];
        this.maxSize = CONFIG.cache.maxSize || 100;
    }
    
    set(key, data, ttl = CONFIG.cache.ttl.default) {
        // LRU cache implementation
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            lastAccess: Date.now()
        });
        
        // Update access order
        this.updateAccessOrder(key);
        
        // Enforce size limit
        if (this.cache.size > this.maxSize) {
            this.evictLeastRecentlyUsed();
        }
    }
    
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            return null;
        }
        
        // Update last access time and order
        cached.lastAccess = Date.now();
        this.updateAccessOrder(key);
        
        return cached.data;
    }
    
    updateAccessOrder(key) {
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);
    }
    
    removeFromAccessOrder(key) {
        this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    
    evictLeastRecentlyUsed() {
        if (this.accessOrder.length > 0) {
            const lru = this.accessOrder.shift();
            this.cache.delete(lru);
        }
    }
    
    cleanExpired() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
                this.removeFromAccessOrder(key);
            }
        }
    }
    
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }
    
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.calculateHitRate()
        };
    }
    
    calculateHitRate() {
        // Would track hits/misses in production
        return 0.75; // Placeholder
    }
}

export class APIManager {
    constructor() {
        this.lastCalls = new Map();
        this.requestCounts = new Map();
        this.authToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }
    
    setAuthTokens(authToken, refreshToken, expiresIn) {
        this.authToken = authToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
    }
    
    clearAuthTokens() {
        this.authToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }
    
    isAuthenticated() {
        return this.authToken && Date.now() < this.tokenExpiry;
    }
    
    async refreshAuthToken() {
        if (!this.refreshToken) throw new Error('No refresh token available');
        
        try {
            const response = await fetch(`${CONFIG.api.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            
            if (!response.ok) throw new Error('Token refresh failed');
            
            const data = await response.json();
            this.setAuthTokens(data.authToken, data.refreshToken, data.expiresIn);
            
            return data.authToken;
        } catch (error) {
            this.clearAuthTokens();
            throw error;
        }
    }
    
    async makeRequest(endpoint, options = {}) {
        // Check if auth is required
        if (CONFIG.features.requireAuth && !this.isAuthenticated()) {
            if (this.refreshToken) {
                await this.refreshAuthToken();
            } else {
                throw new Error('Authentication required');
            }
        }
        
        // Build request options
        const requestOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        // Add auth header if available
        if (this.authToken) {
            requestOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        // Add CSRF token if required
        if (CONFIG.security.csrfProtection && options.method !== 'GET') {
            requestOptions.headers['X-CSRF-Token'] = this.getCSRFToken();
        }
        
        const url = `${CONFIG.api.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, requestOptions);
            
            // Handle auth errors
            if (response.status === 401 && this.refreshToken) {
                await this.refreshAuthToken();
                requestOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
                return fetch(url, requestOptions);
            }
            
            return response;
        } catch (error) {
            this.handleNetworkError(error);
            throw error;
        }
    }
    
    handleNetworkError(error) {
        console.error('Network error:', error);
        
        // Track errors for monitoring
        if (CONFIG.errorTracking.enabled && 
            !CONFIG.errorTracking.ignoredErrors.includes(error.message)) {
            this.reportError(error);
        }
    }
    
    reportError(error) {
        // Would send to error tracking service
        console.log('Error reported:', error.message);
    }
    
    getCSRFToken() {
        // Would get from cookie or meta tag
        return 'csrf-token-placeholder';
    }
}

export class BackendAPI {
    constructor(apiManager, cache) {
        this.api = apiManager;
        this.cache = cache;
    }
    
    async getMarketData() {
        const cacheKey = 'backend_market_data';
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.api.makeRequest(
                CONFIG.apis.backend.endpoints.marketData
            );
            
            if (!response.ok) throw new Error(`Market data API error: ${response.status}`);
            
            const data = await response.json();
            this.cache.set(cacheKey, data, CONFIG.cache.ttl.marketData);
            return data;
        } catch (error) {
            console.error('Failed to fetch market data:', error);
            throw error;
        }
    }
    
    async getTrendingTokens() {
        const cacheKey = 'backend_trending';
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.api.makeRequest(
                CONFIG.apis.backend.endpoints.trending
            );
            
            if (!response.ok) throw new Error('Trending API failed');
            
            const data = await response.json();
            this.cache.set(cacheKey, data, CONFIG.cache.ttl.trendingTokens);
            return data;
        } catch (error) {
            console.error('Failed to fetch trending tokens:', error);
            throw error;
        }
    }
    
    async getTokenPrices(tokenIds) {
        if (!tokenIds.length) return {};
        
        const cacheKey = `backend_prices_${tokenIds.join(',')}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.api.makeRequest(
                CONFIG.apis.backend.endpoints.tokenPrices,
                {
                    method: 'POST',
                    body: JSON.stringify({ tokenIds })
                }
            );
            
            if (!response.ok) throw new Error(`Token price API error: ${response.status}`);
            
            const data = await response.json();
            this.cache.set(cacheKey, data, CONFIG.cache.ttl.tokenPrices);
            return data;
        } catch (error) {
            console.error('Failed to fetch token prices:', error);
            throw error;
        }
    }
    
    async getAccountInfo(address) {
        const cacheKey = `backend_account_${address}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.api.makeRequest(
                `${CONFIG.apis.backend.endpoints.accountInfo}/${address}`
            );
            
            if (!response.ok) throw new Error(`Account info API error: ${response.status}`);
            
            const data = await response.json();
            this.cache.set(cacheKey, data, CONFIG.cache.ttl.accountInfo);
            return data;
        } catch (error) {
            console.error('Failed to fetch account info:', error);
            throw error;
        }
    }
    
    async getTokenHolders(tokenAddress, options = {}) {
        const cacheKey = `backend_holders_${tokenAddress}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams({
                limit: options.limit || 20,
                offset: options.offset || 0
            });
            
            const response = await this.api.makeRequest(
                `${CONFIG.apis.backend.endpoints.tokenHolders}/${tokenAddress}?${params}`
            );
            
            if (!response.ok) throw new Error(`Token holders API error: ${response.status}`);
            
            const data = await response.json();
            this.cache.set(cacheKey, data, CONFIG.cache.ttl.default);
            return data;
        } catch (error) {
            console.error('Failed to fetch token holders:', error);
            throw error;
        }
    }
    
    async getWhaleMovements(options = {}) {
        const cacheKey = `backend_whale_${options.tokenAddress || 'all'}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        try {
            const params = new URLSearchParams({
                limit: options.limit || 50,
                minAmount: options.minAmount || 1000000
            });
            
            if (options.tokenAddress) {
                params.append('tokenAddress', options.tokenAddress);
            }
            
            const response = await this.api.makeRequest(
                `${CONFIG.apis.backend.endpoints.whaleMovements}?${params}`
            );
            
            if (!response.ok) throw new Error(`Whale movements API error: ${response.status}`);
            
            const data = await response.json();
            this.cache.set(cacheKey, data, CONFIG.cache.ttl.whaleMovements);
            return data;
        } catch (error) {
            console.error('Failed to fetch whale movements:', error);
            throw error;
        }
    }
    
    async healthCheck() {
        try {
            const response = await this.api.makeRequest('/health');
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// WebSocket manager for real-time updates
export class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.listeners = new Map();
        this.isConnected = false;
    }
    
    connect(authToken) {
        if (!CONFIG.features.enableWebSocket) return;
        
        const wsUrl = CONFIG.api.baseUrl.replace('http', 'ws') + '/ws';
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Authenticate
                if (authToken) {
                    this.send({ type: 'auth', token: authToken });
                }
                
                // Resubscribe to channels
                this.resubscribeAll();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.handleReconnect();
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }
    
    handleMessage(data) {
        const listeners = this.listeners.get(data.type) || [];
        listeners.forEach(callback => {
            try {
                callback(data.data);
            } catch (error) {
                console.error('WebSocket listener error:', error);
            }
        });
    }
    
    subscribe(channel, callback) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, []);
        }
        this.listeners.get(channel).push(callback);
        
        if (this.isConnected) {
            this.send({ type: 'subscribe', channel });
        }
    }
    
    unsubscribe(channel, callback) {
        const listeners = this.listeners.get(channel) || [];
        this.listeners.set(channel, listeners.filter(cb => cb !== callback));
        
        if (this.isConnected && listeners.length === 0) {
            this.send({ type: 'unsubscribe', channel });
        }
    }
    
    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    resubscribeAll() {
        for (const [channel, listeners] of this.listeners.entries()) {
            if (listeners.length > 0) {
                this.send({ type: 'subscribe', channel });
            }
        }
    }
    
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.listeners.clear();
    }
}