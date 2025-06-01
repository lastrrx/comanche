// Market Data Module
// Handles market data fetching, trending tokens, and price updates

import { CONFIG } from '../config.js';
import { CoinGeckoAPI } from './api.js';

export class MarketDataManager {
    constructor(app) {
        this.app = app;
        this.coingeckoAPI = new CoinGeckoAPI(CONFIG.apis.coingecko, app.api, app.cache);
        this.state = {
            solPrice: 0,
            marketCap: 0,
            volume24h: 0,
            priceChange24h: 0,
            sentiment: 'neutral',
            trending: [],
            gainers: [],
            losers: [],
            topVolume: []
        };
    }
    
    async loadInitialData() {
        try {
            console.log('📈 Loading market data...');
            const marketData = await this.coingeckoAPI.getMarketData();
            
            if (marketData) {
                this.state = { ...this.state, ...marketData };
                this.updateUI();
                console.log('✅ Market data loaded successfully');
            }
        } catch (error) {
            console.error('❌ Failed to load market data:', error);
            this.app.ui.showError('Failed to load market data');
        }
    }
    
    async loadTrendingTokens() {
        try {
            console.log('📈 Loading trending tokens...');
            const trending = await this.coingeckoAPI.getTrendingTokens();
            
            this.state.trending = trending;
            this.updateTrendingUI();
            
            console.log('✅ Trending tokens loaded successfully');
        } catch (error) {
            console.warn('Failed to fetch trending tokens:', error);
        }
    }
    
    async updatePrices() {
        try {
            const marketData = await this.coingeckoAPI.getMarketData();
            if (marketData) {
                this.state = { ...this.state, ...marketData };
                this.updateUI();
                
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
        return this.coingeckoAPI.getTokenPrices(tokenIds);
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
                <div class="trending-rank">${token.trending_rank}</div>
                <div class="token-icon">${token.symbol.charAt(0)}</div>
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                </div>
                <div class="token-rank">#${token.rank}</div>
            </div>
        `).join('');
    }
    
    filterTokens(filter) {
        // Implement token filtering logic
        this.app.ui.showToast(`Market filter: ${filter}`, 'info', 1500);
    }
    
    filterTrending(timeframe) {
        this.app.ui.showToast(`Trending: ${timeframe}`, 'info', 1500);
    }
    
    showMovers(type) {
        this.app.ui.showToast(`Showing ${type}`, 'info', 1500);
    }
    
    calculateMarketSentiment() {
        // Simple sentiment calculation based on market data
        const change = this.state.priceChange24h;
        
        if (change > 5) return 'bullish';
        if (change > 0) return 'positive';
        if (change > -5) return 'neutral';
        return 'bearish';
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
}