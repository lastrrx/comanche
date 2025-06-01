// API Management Module
// Handles all external API interactions with rate limiting and caching

export class DataCache {
    constructor() {
        this.cache = new Map();
    }
    
    set(key, data, ttl = 120000) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
        
        if (this.cache.size > 50) this.cleanExpired();
    }
    
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    cleanExpired() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
            }
        }
    }
    
    clear() {
        this.cache.clear();
    }
}

export class APIManager {
    constructor() {
        this.lastCalls = new Map();
        this.requestCounts = new Map();
        this.minIntervals = {
            coingecko: 6000,
            solana_rpc: 1000,
            solscan: 200,
            default: 2000
        };
    }
    
    async rateLimitedFetch(url, options = {}, serviceType = 'default') {
        const now = Date.now();
        const lastCall = this.lastCalls.get(serviceType) || 0;
        const minInterval = this.minIntervals[serviceType] || this.minIntervals.default;
        const timeSince = now - lastCall;
        
        if (timeSince < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - timeSince));
        }
        
        this.lastCalls.set(serviceType, Date.now());
        this.incrementRequestCount(serviceType);
        
        return fetch(url, options);
    }
    
    incrementRequestCount(serviceType) {
        const count = this.requestCounts.get(serviceType) || 0;
        this.requestCounts.set(serviceType, count + 1);
    }
}

export class SolscanAPI {
    constructor(config, cache) {
        this.config = config;
        this.cache = cache;
        this.lastRequestTime = 0;
    }
    
    async makeRequest(endpoint, params = {}) {
        // Rate limiting
        const now = Date.now();
        const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
        }
        
        this.lastRequestTime = Date.now();
        
        const url = new URL(`${this.config.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.config.key}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Solscan API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    async getAccountInfo(address) {
        const cacheKey = `solscan_account_${address}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const data = await this.makeRequest(`/account/${address}`);
        this.cache.set(cacheKey, data, 60000);
        return data;
    }
    
    async getAccountTokens(address) {
        const cacheKey = `solscan_tokens_${address}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const data = await this.makeRequest('/account/token-accounts', { address });
        this.cache.set(cacheKey, data, 120000);
        return data;
    }
    
    async getAccountTransactions(address, options = {}) {
        const params = {
            address,
            limit: options.limit || 50,
            offset: options.offset || 0
        };
        
        return this.makeRequest('/account/transactions', params);
    }
    
    async getTokenHolders(tokenAddress, options = {}) {
        const cacheKey = `solscan_holders_${tokenAddress}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const params = {
            tokenAddress,
            limit: options.limit || 20,
            offset: options.offset || 0
        };
        
        const data = await this.makeRequest('/token/holders', params);
        this.cache.set(cacheKey, data, 300000);
        return data;
    }
    
    async getTokenTransfers(tokenAddress, options = {}) {
        const params = {
            tokenAddress,
            limit: options.limit || 50,
            offset: options.offset || 0
        };
        
        if (options.minAmount) {
            params.minAmount = options.minAmount;
        }
        
        return this.makeRequest('/token/transfers', params);
    }
}

export class CoinGeckoAPI {
    constructor(config, apiManager, cache) {
        this.config = config;
        this.api = apiManager;
        this.cache = cache;
    }
    
    async getMarketData() {
        const cacheKey = 'coingecko_market_data';
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const response = await this.api.rateLimitedFetch(
            `${this.config.baseUrl}/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
            { headers: { 'Accept': 'application/json' } },
            'coingecko'
        );
        
        if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
        
        const data = await response.json();
        const marketData = {
            solPrice: data.solana?.usd || 0,
            marketCap: data.solana?.usd_market_cap || 0,
            volume24h: data.solana?.usd_24h_vol || 0,
            priceChange24h: data.solana?.usd_24h_change || 0
        };
        
        this.cache.set(cacheKey, marketData, 120000);
        return marketData;
    }
    
    async getTrendingTokens() {
        const cacheKey = 'coingecko_trending';
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const response = await this.api.rateLimitedFetch(
            `${this.config.baseUrl}/search/trending`,
            { headers: { 'Accept': 'application/json' } },
            'coingecko'
        );
        
        if (!response.ok) throw new Error('Trending API failed');
        
        const data = await response.json();
        const trending = data.coins.slice(0, 10).map((coin, index) => ({
            id: coin.item.id,
            symbol: coin.item.symbol.toUpperCase(),
            name: coin.item.name,
            rank: coin.item.market_cap_rank || (index + 1),
            thumb: coin.item.thumb,
            trending_rank: index + 1
        }));
        
        this.cache.set(cacheKey, trending, 600000);
        return trending;
    }
    
    async getTokenPrices(tokenIds) {
        if (!tokenIds.length) return {};
        
        const cacheKey = `coingecko_prices_${tokenIds.join(',')}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const response = await this.api.rateLimitedFetch(
            `${this.config.baseUrl}/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
            { headers: { 'Accept': 'application/json' } },
            'coingecko'
        );
        
        if (!response.ok) throw new Error(`Token price API error: ${response.status}`);
        
        const data = await response.json();
        this.cache.set(cacheKey, data, 60000);
        return data;
    }
}
