// Market Data Module
// Updated to use backend API proxy for secure data fetching

import { CONFIG } from '../config.js';

export class MarketDataManager {
    constructor(app) {
        this.app = app;
        this.state = {
            solPrice: 0,
            marketCap: 0,
            volume24h: 0,
            priceChange24h: 0,
            sentiment: 'neutral',
            trending: [],
            gainers: [],
            losers: [],
            topVolume: [],
            lastUpdate: null,
            isLoading: false,
            error: null
        };
        
        // Price update subscribers
        this.priceUpdateSubscribers = new Map();
    }
    
    async loadInitialData() {
        if (!CONFIG.features.useBackendProxy) {
            console.log('📈 Backend proxy disabled, skipping market data');
            return;
        }
        
        try {
            console.log('📈 Loading market data...');
            this.state.isLoading = true;
            this.state.error = null;
            
            const marketData = await this.app.backendAPI.getMarketData();
            
            if (marketData) {
                this.updateState(marketData);
                this.updateUI();
                console.log('✅ Market data loaded successfully');
            }
        } catch (error) {
            console.error('❌ Failed to load market data:', error);
            this.handleError(error);
        } finally {
            this.state.isLoading = false;
        }
    }
    
    async loadTrendingTokens() {
        if (!CONFIG.features.useBackendProxy || !this.app.state.backendHealthy) {
            this.showOfflineMessage('trending');
            return;
        }
        
        try {
            console.log('📈 Loading trending tokens...');
            const trending = await this.app.backendAPI.getTrendingTokens();
            
            this.state.trending = trending;
            this.updateTrendingUI();
            
            console.log('✅ Trending tokens loaded successfully');
        } catch (error) {
            console.warn('Failed to fetch trending tokens:', error);
            this.showErrorInTrending();
        }
    }
    
    async updatePrices() {
        if (!CONFIG.features.useBackendProxy || !this.app.state.backendHealthy) {
            return;
        }
        
        try {
            const marketData = await this.app.backendAPI.getMarketData();
            if (marketData) {
                const previousPrice = this.state.solPrice;
                this.updateState(marketData);
                this.updateUI();
                
                // Notify price update subscribers
                this.notifyPriceUpdate({
                    solPrice: marketData.solPrice,
                    previousPrice,
                    change: marketData.priceChange24h
                });
                
                // Update portfolio values if wallet is connected
                if (this.app.wallet.isConnected()) {
                    this.updatePortfolioPrices(marketData);
                }
            }
        } catch (error) {
            console.error('Failed to update market data:', error);
        }
    }
    
    async fetchTokenPrices(tokenIds) {
        if (!CONFIG.features.useBackendProxy || !this.app.state.backendHealthy) {
            // Return mock prices in offline mode
            return this.getMockPrices(tokenIds);
        }
        
        return this.app.backendAPI.getTokenPrices(tokenIds);
    }
    
    updateState(marketData) {
        this.state = {
            ...this.state,
            ...marketData,
            lastUpdate: Date.now(),
            sentiment: this.calculateMarketSentiment(marketData.priceChange24h)
        };
    }
    
    updatePortfolioPrices(marketData) {
        const tokens = this.app.wallet.getTokens();
        const solToken = tokens.find(t => t.symbol === 'SOL');
        
        if (solToken) {
            solToken.price = marketData.solPrice;
            solToken.value = solToken.amount * marketData.solPrice;
            solToken.change24h = marketData.priceChange24h;
            
            // Recalculate total value
            const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
            const performance = this.app.wallet.getPerformance();
            performance.totalValue = totalValue;
            
            this.app.ui.updatePortfolioStats(this.app.wallet.state);
        }
    }
    
    updateUI() {
        this.app.ui.updateElement('solPrice', `$${this.state.solPrice.toFixed(2)}`);
        
        const solChangeEl = document.getElementById('solChange');
        if (solChangeEl) {
            const change = this.state.priceChange24h || 0;
            const isPositive = change >= 0;
            solChangeEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change.toFixed(2)}%</span>`;
        }
        
        const marketVolEl = document.getElementById('marketVol');
        if (marketVolEl) {
            marketVolEl.textContent = `$${this.app.ui.formatLargeNumber(this.state.volume24h)}`;
        }
        
        this.app.ui.updateElement('trackedTokens', this.state.trending.length);
        this.app.ui.updateElement('marketSentiment', this.state.sentiment);
        
        const sentimentScore = this.getSentimentScore();
        this.app.ui.updateElement('sentimentScore', `${sentimentScore}/100`);
    }
    
    updateTrendingUI() {
        const container = document.getElementById('trendingTokens');
        if (!container) return;
        
        if (this.state.trending.length === 0) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            return;
        }
        
        container.innerHTML = this.state.trending.map((token, index) => `
            <div class="trending-item">
                <div class="trending-rank">${token.trending_rank || index + 1}</div>
                <div class="token-icon">
                    ${token.thumb ? 
                        `<img src="${token.thumb}" alt="${token.symbol}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="token-icon-fallback" ${token.thumb ? 'style="display:none;"' : ''}>
                        ${token.symbol.charAt(0)}
                    </div>
                </div>
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                </div>
                <div class="token-stats">
                    ${token.price_change_24h !== undefined ? `
                        <span class="token-change ${token.price_change_24h >= 0 ? 'positive' : 'negative'}">
                            ${token.price_change_24h >= 0 ? '+' : ''}${token.price_change_24h.toFixed(2)}%
                        </span>
                    ` : ''}
                    <span class="token-rank">#${token.rank || '-'}</span>
                </div>
            </div>
        `).join('');
    }
    
    filterTokens(filter) {
        this.state.currentFilter = filter;
        
        // Update UI to show loading
        const container = document.getElementById('marketMovers');
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }
        
        // In production, would fetch filtered data from backend
        this.app.ui.showToast(`Market filter: ${filter}`, 'info', 1500);
        
        // For now, show mock data
        setTimeout(() => {
            this.updateMoversUI(filter);
        }, 500);
    }
    
    filterTrending(timeframe) {
        this.state.trendingTimeframe = timeframe;
        
        // Update active button
        document.querySelectorAll('.trend-filters .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.trend-filters .btn[onclick*="${timeframe}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        this.app.ui.showToast(`Trending: ${timeframe}`, 'info', 1500);
        
        // In production, would fetch timeframe-specific trending data
        this.loadTrendingTokens();
    }
    
    showMovers(type) {
        this.state.moversType = type;
        
        // Update active tab
        document.querySelectorAll('.mover-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.mover-tabs .tab-btn[onclick*="${type}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        this.updateMoversUI(type);
    }
    
    updateMoversUI(type) {
        const container = document.getElementById('marketMovers');
        if (!container) return;
        
        // Mock data for demonstration
        const mockMovers = type === 'gainers' ? [
            { symbol: 'WIF', name: 'dogwifhat', change: 25.5, price: 2.45 },
            { symbol: 'POPCAT', name: 'Popcat', change: 18.2, price: 0.85 },
            { symbol: 'MEW', name: 'cat in a dogs world', change: 15.7, price: 0.012 }
        ] : [
            { symbol: 'SAMO', name: 'Samoyedcoin', change: -12.3, price: 0.008 },
            { symbol: 'ORCA', name: 'Orca', change: -8.5, price: 3.21 },
            { symbol: 'RAY', name: 'Raydium', change: -6.2, price: 1.45 }
        ];
        
        container.innerHTML = mockMovers.map(token => `
            <div class="mover-item">
                <div class="token-icon">${token.symbol.charAt(0)}</div>
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                </div>
                <div class="token-stats">
                    <div class="token-price">$${token.price}</div>
                    <div class="token-change ${token.change >= 0 ? 'positive' : 'negative'}">
                        ${token.change >= 0 ? '+' : ''}${token.change.toFixed(2)}%
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    calculateMarketSentiment(change) {
        if (change > 10) return 'Very Bullish';
        if (change > 5) return 'Bullish';
        if (change > 0) return 'Positive';
        if (change > -5) return 'Neutral';
        if (change > -10) return 'Bearish';
        return 'Very Bearish';
    }
    
    getSentimentScore() {
        const change = this.state.priceChange24h;
        // Convert to 0-100 scale
        const normalized = Math.max(0, Math.min(100, 50 + (change * 2)));
        return Math.round(normalized);
    }
    
    // Real-time price updates via WebSocket
    handlePriceUpdate(data) {
        if (data.symbol === 'SOL') {
            this.state.solPrice = data.price;
            this.state.priceChange24h = data.change24h;
            this.updateUI();
            
            this.notifyPriceUpdate({
                solPrice: data.price,
                change: data.change24h
            });
        }
    }
    
    // Subscribe to price updates
    subscribeToPriceUpdates(callback, id) {
        this.priceUpdateSubscribers.set(id, callback);
    }
    
    unsubscribeFromPriceUpdates(id) {
        this.priceUpdateSubscribers.delete(id);
    }
    
    notifyPriceUpdate(data) {
        for (const callback of this.priceUpdateSubscribers.values()) {
            try {
                callback(data);
            } catch (error) {
                console.error('Price update subscriber error:', error);
            }
        }
    }
    
    // Offline mode helpers
    showOfflineMessage(section) {
        const messages = {
            trending: 'Trending tokens unavailable in offline mode',
            movers: 'Market movers unavailable in offline mode'
        };
        
        this.app.ui.showToast(messages[section] || 'Feature unavailable offline', 'warning');
    }
    
    showErrorInTrending() {
        const container = document.getElementById('trendingTokens');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load trending tokens</p>
                    <button class="btn btn-sm" onclick="cypherApp.market.loadTrendingTokens()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
    
    getMockPrices(tokenIds) {
        // Return mock prices for offline mode
        const mockPrices = {
            'solana': { usd: 100, usd_24h_change: 2.5 },
            'usd-coin': { usd: 1, usd_24h_change: 0 },
            'bonk': { usd: 0.00001, usd_24h_change: -5.2 }
        };
        
        const result = {};
        tokenIds.forEach(id => {
            if (mockPrices[id]) {
                result[id] = mockPrices[id];
            }
        });
        
        return result;
    }
    
    handleError(error) {
        this.state.error = error.message;
        console.error('Market data error:', error);
        
        // Show user-friendly error message
        if (error.message.includes('network')) {
            this.app.ui.showError('Network error - check your connection');
        } else if (error.message.includes('unauthorized')) {
            this.app.ui.showError('Please login to access market data');
        } else {
            this.app.ui.showError('Failed to load market data');
        }
    }
    
    getSolPrice() {
        return this.state.solPrice;
    }
    
    getSolPriceChange() {
        return this.state.priceChange24h;
    }
    
    getMarketData() {
        return this.state;
    }
    
    isDataStale() {
        if (!this.state.lastUpdate) return true;
        const staleThreshold = 5 * 60 * 1000; // 5 minutes
        return Date.now() - this.state.lastUpdate > staleThreshold;
    }
}