// Cypher Portfolio Analytics - Main Application Controller
// Condensed and modularized version

import { WalletManager } from './modules/wallet.js';
import { MarketDataManager } from './modules/market.js';
import { AnalyticsEngine } from './modules/analytics.js';
import { UIManager } from './modules/ui.js';
import { ChartManager } from './modules/charts.js';
import { WhaleTracker } from './modules/whale.js';
import { SocialManager } from './modules/social.js';
import { AlertsManager } from './modules/alerts.js';
import { APIManager, SolscanAPI, DataCache } from './modules/api.js';
import { CONFIG } from './config.js';

class CypherApp {
    constructor() {
        this.state = {
            initialized: false,
            loading: false,
            currentSection: 'portfolio',
            currentTimeframe: '7D'
        };

        // Initialize managers
        this.cache = new DataCache();
        this.api = new APIManager();
        this.solscanAPI = new SolscanAPI(CONFIG.apis.solscan, this.cache);
        
        this.wallet = new WalletManager(this);
        this.market = new MarketDataManager(this);
        this.analytics = new AnalyticsEngine(this);
        this.ui = new UIManager(this);
        this.charts = new ChartManager(this);
        this.whale = new WhaleTracker(this);
        this.social = new SocialManager(this);
        this.alerts = new AlertsManager(this);

        this.init();
    }

    async init() {
        try {
            this.ui.showLoadingOverlay('Initializing Cypher...');
            
            await this.loadUserState();
            await this.initializeManagers();
            this.setupEventListeners();
            
            await this.market.loadInitialData();
            await this.wallet.checkExistingConnection();
            
            this.state.initialized = true;
            this.ui.hideLoadingOverlay();
            this.startRealTimeUpdates();
            
            this.ui.showToast('Cypher initialized successfully', 'success', 3000);
        } catch (error) {
            console.error('❌ Failed to initialize Cypher:', error);
            this.ui.showError('Failed to initialize application. Please refresh the page.');
            this.ui.hideLoadingOverlay();
        }
    }

    async initializeManagers() {
        await this.wallet.initSolanaConnection();
        this.ui.initialize();
        this.charts.initialize();
    }

    setupEventListeners() {
        // Wallet connection
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.wallet.connect());
        }

        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('onclick')?.match(/switchSection\('(\w+)'\)/)?.[1];
                if (section) this.switchSection(section);
            });
        });

        // Mobile navigation
        this.ui.setupMobileNav();

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.wallet.isConnected()) {
                e.preventDefault();
                this.refreshPortfolio();
            }
        });
    }

    async switchSection(sectionName) {
        console.log('🔄 Switching to section:', sectionName);
        this.state.currentSection = sectionName;
        
        this.ui.updateNavigation(sectionName);
        
        // Load section-specific data
        switch (sectionName) {
            case 'portfolio':
                if (this.wallet.isConnected()) await this.refreshPortfolio();
                break;
            case 'analytics':
                await this.analytics.loadData();
                break;
            case 'market':
                await this.market.loadTrendingTokens();
                break;
            case 'whale':
                await this.whale.loadData();
                break;
            case 'alerts':
                this.alerts.render();
                break;
            case 'social':
                await this.social.loadData();
                break;
        }
        
        this.ui.showToast(`Switched to ${sectionName}`, 'info', 1500);
    }

    async refreshPortfolio() {
        if (!this.wallet.isConnected()) return;
        
        try {
            await this.wallet.loadWalletData();
            await this.analytics.calculate();
            this.charts.updateAll();
        } catch (error) {
            console.error('Failed to refresh portfolio:', error);
            this.ui.showError('Failed to refresh portfolio data');
        }
    }

    startRealTimeUpdates() {
        // Market data updates every 2 minutes
        setInterval(() => this.market.updatePrices(), 120000);

        // Portfolio updates every 5 minutes
        setInterval(() => {
            if (this.wallet.isConnected()) this.refreshPortfolio();
        }, 300000);

        // Whale monitoring every 3 minutes
        setInterval(() => {
            if (this.wallet.isConnected()) this.whale.refresh();
        }, 180000);

        console.log('🔄 Real-time updates started');
    }

    async loadUserState() {
        try {
            const saved = localStorage.getItem('cypher_user_state');
            if (saved) {
                const state = JSON.parse(saved);
                // Distribute state to appropriate managers
                if (state.achievements) this.social.loadAchievements(state.achievements);
                if (state.preferences) this.ui.loadPreferences(state.preferences);
            }
        } catch (error) {
            console.warn('Failed to load user state:', error);
        }
    }

    saveUserState() {
        try {
            const state = {
                achievements: this.social.getAchievements(),
                preferences: this.ui.getPreferences(),
                lastVisit: Date.now()
            };
            localStorage.setItem('cypher_user_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save user state:', error);
        }
    }

    // Public methods for global access
    changeChartTimeframe(timeframe) {
        this.state.currentTimeframe = timeframe;
        this.charts.updateTimeframe(timeframe);
    }

    sortHoldings(sortBy) {
        this.wallet.sortTokens(sortBy);
        this.ui.updateHoldingsList();
    }

    exportHoldings() {
        const data = this.wallet.getExportData();
        // Implement CSV export
        this.ui.showToast('Export feature coming soon', 'info');
    }
}

// Global instance and function wrappers
let cypherApp = null;

document.addEventListener('DOMContentLoaded', function() {
    cypherApp = new CypherApp();
    
    // Expose global functions for HTML onclick handlers
    window.cypherApp = cypherApp;
    window.switchSection = (section) => cypherApp?.switchSection(section);
    window.connectWallet = () => cypherApp?.wallet.connect();
    window.refreshPortfolio = () => cypherApp?.refreshPortfolio();
    window.changeChartTimeframe = (tf) => cypherApp?.changeChartTimeframe(tf);
    window.sortHoldings = (sort) => cypherApp?.sortHoldings(sort);
    window.exportHoldings = () => cypherApp?.exportHoldings();
    window.generateAnalysisReport = () => cypherApp?.analytics.generateReport();
    window.refreshWhaleData = () => cypherApp?.whale.refresh();
    window.openFollowModal = () => cypherApp?.social.openFollowModal();
    window.closeFollowModal = () => cypherApp?.social.closeFollowModal();
    window.followWallet = (event) => cypherApp?.social.followWallet(event);
    window.unfollowWallet = (address) => cypherApp?.social.unfollowWallet(address);
    window.setWhaleThreshold = (threshold) => cypherApp?.whale.setThreshold(threshold);
    window.setCustomThreshold = () => cypherApp?.whale.setCustomThreshold();
    window.filterTrending = (timeframe) => cypherApp?.market.filterTrending(timeframe);
    window.showMovers = (type) => cypherApp?.market.showMovers(type);
    window.filterMarket = (filter) => cypherApp?.market.filterTokens(filter);
    window.filterWhaleMovements = (filter) => cypherApp?.whale.filterMovements(filter);
    window.pauseAllAlerts = () => cypherApp?.alerts.pauseAll();
    window.exportAlerts = () => cypherApp?.alerts.export();
    window.openAlertModal = () => cypherApp?.alerts.openModal();
    window.closeAlertModal = () => cypherApp?.alerts.closeModal();
    window.createAlert = (event) => cypherApp?.alerts.create(event);
    window.createQuickAlert = (event) => cypherApp?.alerts.createQuick(event);
    window.clearAlertHistory = () => cypherApp?.alerts.clearHistory();
    window.updateAlertOptions = () => cypherApp?.alerts.updateOptions();
    window.useAlertTemplate = (template) => cypherApp?.alerts.useTemplate(template);
    window.sharePortfolio = () => cypherApp?.social.sharePortfolio();
    window.findTraders = () => cypherApp?.social.findTraders();
    window.joinCommunity = () => cypherApp?.social.joinCommunity();
    window.filterLeaderboard = (period) => cypherApp?.social.filterLeaderboard(period);
    window.filterAchievements = (filter) => cypherApp?.social.filterAchievements(filter);
    window.viewWalletDetails = (address) => cypherApp?.social.viewWalletDetails(address);
    window.copyWalletTrades = (address) => cypherApp?.social.copyWalletTrades(address);
    window.followTrader = (address) => cypherApp?.social.followWallet(null, address);
    window.showHelp = () => cypherApp?.ui.showHelp();
    window.showHelpTab = (tab) => cypherApp?.ui.showHelpTab(tab);
    window.closeHelpModal = () => cypherApp?.ui.closeHelpModal();
});