// Cypher Portfolio Analytics - Main Application Controller
// Enhanced with authentication and backend integration

import { WalletManager } from './modules/wallet.js';
import { MarketDataManager } from './modules/market.js';
import { AnalyticsEngine } from './modules/analytics.js';
import { UIManager } from './modules/ui.js';
import { ChartManager } from './modules/charts.js';
import { WhaleTracker } from './modules/whale.js';
import { SocialManager } from './modules/social.js';
import { AlertsManager } from './modules/alerts.js';
import { APIManager, BackendAPI, DataCache, WebSocketManager } from './modules/api.js';
import { CONFIG } from './config.js';

class CypherApp {
    constructor() {
        this.state = {
            initialized: false,
            loading: false,
            authenticated: false,
            user: null,
            currentSection: 'portfolio',
            currentTimeframe: '7D',
            backendHealthy: false
        };

        // Initialize core services
        this.cache = new DataCache();
        this.api = new APIManager();
        this.backendAPI = new BackendAPI(this.api, this.cache);
        this.ws = new WebSocketManager();
        
        // Initialize managers
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
            
            // Check backend health
            await this.checkBackendHealth();
            
            // Check for existing session
            await this.checkExistingSession();
            
            // Load user state
            await this.loadUserState();
            
            // Initialize managers
            await this.initializeManagers();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Check for existing wallet connection
            await this.wallet.checkExistingConnection();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Initialize WebSocket if authenticated
            if (this.state.authenticated) {
                this.initializeWebSocket();
            }
            
            this.state.initialized = true;
            this.ui.hideLoadingOverlay();
            
            this.ui.showToast('Cypher initialized successfully', 'success', 3000);
            
        } catch (error) {
            console.error('❌ Failed to initialize Cypher:', error);
            this.handleInitializationError(error);
        }
    }

    async checkBackendHealth() {
        if (!CONFIG.features.useBackendProxy) {
            this.state.backendHealthy = true;
            return;
        }
        
        try {
            const healthy = await this.backendAPI.healthCheck();
            this.state.backendHealthy = healthy;
            
            if (!healthy) {
                console.warn('Backend is not healthy, falling back to limited functionality');
                this.ui.showToast('Running in offline mode - some features may be limited', 'warning', 5000);
            }
        } catch (error) {
            console.error('Failed to check backend health:', error);
            this.state.backendHealthy = false;
        }
    }

    async checkExistingSession() {
        if (!CONFIG.features.requireAuth) return;
        
        try {
            const authToken = localStorage.getItem('cypher_auth_token');
            const refreshToken = localStorage.getItem('cypher_refresh_token');
            
            if (authToken && refreshToken) {
                // Verify token with backend
                const response = await fetch(`${CONFIG.api.baseUrl}/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.state.authenticated = true;
                    this.state.user = data.user;
                    this.api.setAuthTokens(authToken, refreshToken, data.expiresIn);
                    
                    console.log('✅ Restored session for user:', data.user.email);
                } else {
                    // Try to refresh token
                    this.api.setAuthTokens(null, refreshToken, 0);
                    await this.api.refreshAuthToken();
                }
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            this.clearSession();
        }
    }

    async loadInitialData() {
        try {
            if (CONFIG.features.useBackendProxy && this.state.backendHealthy) {
                await this.market.loadInitialData();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
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
            connectBtn.addEventListener('click', () => this.handleWalletConnect());
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
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showCommandPalette();
            }
        });

        // Authentication events
        if (CONFIG.features.requireAuth) {
            this.setupAuthListeners();
        }

        // Window events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    setupAuthListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async handleWalletConnect() {
        if (CONFIG.features.requireAuth && !this.state.authenticated) {
            this.ui.showToast('Please login first to connect your wallet', 'warning');
            this.showLoginModal();
            return;
        }
        
        await this.wallet.connect();
    }

    async switchSection(sectionName) {
        console.log('🔄 Switching to section:', sectionName);
        
        // Check authentication for protected sections
        if (CONFIG.features.requireAuth && !this.state.authenticated) {
            const protectedSections = ['portfolio', 'analytics', 'alerts', 'social'];
            if (protectedSections.includes(sectionName)) {
                this.ui.showToast('Please login to access this feature', 'warning');
                this.showLoginModal();
                return;
            }
        }
        
        this.state.currentSection = sectionName;
        this.ui.updateNavigation(sectionName);
        
        // Load section-specific data
        try {
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
        } catch (error) {
            console.error(`Failed to load ${sectionName} data:`, error);
            this.ui.showError(`Failed to load ${sectionName} data`);
        }
        
        this.ui.showToast(`Switched to ${sectionName}`, 'info', 1500);
    }

    async refreshPortfolio() {
        if (!this.wallet.isConnected()) return;
        
        try {
            this.ui.showLoadingOverlay('Refreshing portfolio...');
            await this.wallet.loadWalletData();
            await this.analytics.calculate();
            this.charts.updateAll();
            this.ui.hideLoadingOverlay();
            
            // Check achievements
            if (this.social) {
                await this.social.checkAllAchievements();
            }
        } catch (error) {
            console.error('Failed to refresh portfolio:', error);
            this.ui.hideLoadingOverlay();
            this.ui.showError('Failed to refresh portfolio data');
        }
    }

    startRealTimeUpdates() {
        // Market data updates
        setInterval(() => {
            if (this.state.backendHealthy) {
                this.market.updatePrices();
            }
        }, CONFIG.updateIntervals.marketData);

        // Portfolio updates
        setInterval(() => {
            if (this.wallet.isConnected()) {
                this.refreshPortfolio();
            }
        }, CONFIG.updateIntervals.portfolio);

        // Whale monitoring
        setInterval(() => {
            if (this.wallet.isConnected() && this.state.backendHealthy) {
                this.whale.refresh();
            }
        }, CONFIG.updateIntervals.whaleTracking);

        // Backend health check
        setInterval(() => {
            this.checkBackendHealth();
        }, CONFIG.updateIntervals.healthCheck);

        // Cache cleanup
        setInterval(() => {
            this.cache.cleanExpired();
        }, CONFIG.updateIntervals.cacheCleanup);

        console.log('🔄 Real-time updates started');
    }

    initializeWebSocket() {
        if (!CONFIG.features.enableWebSocket || !this.state.authenticated) return;
        
        this.ws.connect(this.api.authToken);
        
        // Subscribe to relevant channels
        this.ws.subscribe('portfolio_update', (data) => {
            this.handlePortfolioUpdate(data);
        });
        
        this.ws.subscribe('price_update', (data) => {
            this.handlePriceUpdate(data);
        });
        
        this.ws.subscribe('whale_alert', (data) => {
            this.handleWhaleAlert(data);
        });
        
        this.ws.subscribe('achievement_unlocked', (data) => {
            this.handleAchievementUnlocked(data);
        });
    }

    handlePortfolioUpdate(data) {
        console.log('Portfolio update received:', data);
        this.refreshPortfolio();
    }

    handlePriceUpdate(data) {
        console.log('Price update received:', data);
        this.market.handlePriceUpdate(data);
    }

    handleWhaleAlert(data) {
        console.log('Whale alert received:', data);
        this.whale.handleWhaleAlert(data);
    }

    handleAchievementUnlocked(data) {
        console.log('Achievement unlocked:', data);
        this.social.handleAchievementUnlocked(data);
    }

    handleOnline() {
        console.log('🌐 Back online');
        this.ui.showToast('Connection restored', 'success');
        this.checkBackendHealth();
    }

    handleOffline() {
        console.log('📴 Offline');
        this.ui.showToast('No internet connection - running in offline mode', 'warning');
        this.state.backendHealthy = false;
    }

    handleInitializationError(error) {
        this.ui.hideLoadingOverlay();
        
        let message = 'Failed to initialize application';
        let showReload = true;
        
        if (error.message.includes('backend')) {
            message = 'Cannot connect to server. Running in limited mode.';
            showReload = false;
        } else if (error.message.includes('network')) {
            message = 'Network error. Please check your connection.';
        }
        
        const errorHTML = `
            <div class="init-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${message}</h3>
                <p>${error.message}</p>
                ${showReload ? '<button class="btn btn-primary" onclick="location.reload()">Reload Page</button>' : ''}
            </div>
        `;
        
        document.querySelector('.content').innerHTML = errorHTML;
    }

    showLoginModal() {
        // Would show login modal
        this.ui.showToast('Login feature coming soon', 'info');
    }

    showCommandPalette() {
        // Would show command palette for quick actions
        this.ui.showToast('Command palette coming soon (Ctrl+K)', 'info');
    }

    async logout() {
        try {
            if (this.api.authToken) {
                await fetch(`${CONFIG.api.baseUrl}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.api.authToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.clearSession();
        this.ui.showToast('Logged out successfully', 'success');
        location.reload();
    }

    clearSession() {
        this.state.authenticated = false;
        this.state.user = null;
        this.api.clearAuthTokens();
        localStorage.removeItem('cypher_auth_token');
        localStorage.removeItem('cypher_refresh_token');
        
        if (this.ws) {
            this.ws.disconnect();
        }
    }

    async loadUserState() {
        try {
            const saved = localStorage.getItem('cypher_user_state');
            if (saved) {
                const state = JSON.parse(saved);
                // Distribute state to appropriate managers
                if (state.achievements) this.social.loadAchievements(state.achievements);
                if (state.preferences) this.ui.loadPreferences(state.preferences);
                if (state.lastSection) this.state.currentSection = state.lastSection;
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
                lastVisit: Date.now(),
                lastSection: this.state.currentSection
            };
            localStorage.setItem('cypher_user_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save user state:', error);
        }
    }

    cleanup() {
        this.saveUserState();
        if (this.ws) {
            this.ws.disconnect();
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

    async exportHoldings() {
        if (!CONFIG.features.enableExport) {
            this.ui.showToast('Export feature is disabled', 'warning');
            return;
        }
        
        const data = this.wallet.getExportData();
        
        try {
            const csv = this.generateCSV(data);
            this.downloadFile(csv, 'cypher-portfolio.csv', 'text/csv');
            this.ui.showToast('Portfolio exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.ui.showError('Failed to export portfolio');
        }
    }

    generateCSV(data) {
        const headers = ['Symbol', 'Name', 'Amount', 'Value (USD)', 'Price', '24h Change (%)'];
        const rows = data.tokens.map(token => [
            token.symbol,
            token.name,
            token.amount,
            token.value.toFixed(2),
            token.price.toFixed(6),
            token.change24h.toFixed(2)
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        return csv;
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Global instance and function wrappers
let cypherApp = null;

document.addEventListener('DOMContentLoaded', function() {
    cypherApp = new CypherApp();
    
    // Expose global functions for HTML onclick handlers
    window.cypherApp = cypherApp;
    window.switchSection = (section) => cypherApp?.switchSection(section);
    window.connectWallet = () => cypherApp?.handleWalletConnect();
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
    window.logout = () => cypherApp?.logout();
});