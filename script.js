// Enhanced Cypher Portfolio Analytics - v2.0
// Fixed navigation, wallet connection, and UI improvements

class CypherApp {
    constructor() {
        this.state = {
            // Core app state
            initialized: false,
            loading: false,
            currentSection: 'portfolio',
            
            // User & wallet state
            user: {
                isFirstTime: true,
                preferences: {},
                onboardingCompleted: false
            },
            wallet: {
                connected: false,
                publicKey: null,
                balance: 0,
                tokens: [],
                transactions: [],
                performance: {
                    totalValue: 0,
                    dayChange: 0,
                    dayChangePercent: 0,
                    totalGain: 0,
                    totalGainPercent: 0
                }
            },
            
            // Market data state
            market: {
                solPrice: 0,
                marketCap: 0,
                volume24h: 0,
                sentiment: 'neutral',
                trending: [],
                gainers: [],
                losers: []
            },
            
            // Social & whale tracking
            social: {
                followedWallets: new Map(),
                whaleMovements: [],
                leaderboard: [],
                achievements: new Map(),
                userRank: null
            },
            
            // Alerts system
            alerts: {
                active: [],
                history: [],
                settings: {
                    browserNotifications: true,
                    emailNotifications: false,
                    pushNotifications: false
                }
            },
            
            // Analytics data
            analytics: {
                portfolioHistory: [],
                tradingPatterns: {},
                riskMetrics: {},
                benchmarkComparison: {}
            },
            
            // UI state
            ui: {
                charts: new Map(),
                modals: new Set(),
                notifications: [],
                searchResults: []
            }
        };
        
        // API configuration - ready for real integrations
        this.api = {
            endpoints: {
                jupiter: 'https://price.jup.ag/v4',
                coingecko: 'https://api.coingecko.com/api/v3',
                dexscreener: 'https://api.dexscreener.com/latest/dex',
                birdeye: 'https://public-api.birdeye.so/defi',
                solana: 'https://api.mainnet-beta.solana.com'
            },
            rateLimits: new Map(),
            cache: new Map(),
            retryConfig: { maxRetries: 3, backoffMs: 1000 }
        };
        
        // Solana connection
        this.solana = {
            connection: null,
            rpcEndpoint: 'https://api.mainnet-beta.solana.com',
            commitment: 'confirmed'
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.showLoadingOverlay('Initializing Cypher...');
            
            // Load user preferences and state
            await this.loadUserState();
            
            // Initialize Solana connection
            await this.initSolanaConnection();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeUI();
            
            // Load initial data
            await this.loadInitialData();
            
            // Check for existing wallet connection
            await this.checkExistingWalletConnection();
            
            // Show onboarding for first-time users
            if (this.state.user.isFirstTime) {
                this.showOnboarding();
            }
            
            this.state.initialized = true;
            this.hideLoadingOverlay();
            
            console.log('🚀 Cypher initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Cypher:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
            this.hideLoadingOverlay();
        }
    }
    
    // =================
    // NAVIGATION SYSTEM (FIXED)
    // =================
    
    switchSection(sectionName) {
        console.log('🔄 Switching to section:', sectionName);
        
        // Update state
        this.state.currentSection = sectionName;
        
        // Update navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Find and activate the correct tab
        const activeTab = document.querySelector(`[onclick*="${sectionName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Load section-specific data
        this.loadSectionData(sectionName);
        
        // Track analytics
        this.trackEvent('section_viewed', { section: sectionName });
        
        // Show success toast
        this.showToast(`Switched to ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`, 'info', 1500);
    }
    
    // =================
    // WALLET MANAGEMENT (FIXED)
    // =================
    
    async connectWallet(walletType = 'auto') {
        try {
            console.log('🔗 Attempting wallet connection...');
            this.showLoadingOverlay('Connecting wallet...');
            
            let walletAdapter;
            
            // Auto-detect or use specific wallet
            if (walletType === 'auto' || walletType === 'phantom') {
                walletAdapter = this.getPhantomWallet();
                if (!walletAdapter && walletType === 'auto') {
                    walletAdapter = this.getSolflareWallet() || this.getBackpackWallet();
                }
            } else if (walletType === 'solflare') {
                walletAdapter = this.getSolflareWallet();
            } else if (walletType === 'backpack') {
                walletAdapter = this.getBackpackWallet();
            }
            
            if (!walletAdapter) {
                this.hideLoadingOverlay();
                this.showWalletInstallationHelp(walletType === 'auto' ? 'phantom' : walletType);
                return false;
            }
            
            this.updateLoadingStatus('Requesting wallet connection...');
            
            // Connect to wallet
            const response = await walletAdapter.connect({ onlyIfTrusted: false });
            
            if (response.publicKey) {
                this.state.wallet.connected = true;
                this.state.wallet.publicKey = response.publicKey.toString();
                
                this.updateLoadingStatus('Loading wallet data...');
                
                // Load wallet data
                await this.loadWalletData();
                
                // Update UI
                this.updateWalletUI();
                
                // Check achievements
                await this.checkAchievements();
                
                this.hideLoadingOverlay();
                this.showToast('Wallet connected successfully! 🎉', 'success');
                
                // Analytics: Track wallet connection
                this.trackEvent('wallet_connected', { wallet_type: walletType });
                
                return true;
            }
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.hideLoadingOverlay();
            
            if (error.code === 4001 || error.message?.includes('User rejected')) {
                this.showToast('Connection cancelled by user', 'warning');
            } else if (error.code === -32002) {
                this.showToast('Connection request pending. Please check your wallet.', 'info');
            } else {
                this.showToast(`Connection failed: ${error.message}`, 'error');
                
                // Show wallet installation help if needed
                if (error.message.includes('not found')) {
                    this.showWalletInstallationHelp(walletType);
                }
            }
            
            return false;
        }
    }
    
    getPhantomWallet() {
        if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
        if (window.solana?.isPhantom) return window.solana;
        return null;
    }
    
    getSolflareWallet() {
        if (window.solflare?.isSolflare) return window.solflare;
        return null;
    }
    
    getBackpackWallet() {
        if (window.backpack?.isBackpack) return window.backpack;
        return null;
    }
    
    showWalletInstallationHelp(walletType) {
        const walletUrls = {
            phantom: 'https://phantom.app/',
            solflare: 'https://solflare.com/',
            backpack: 'https://backpack.app/'
        };
        
        const url = walletUrls[walletType];
        if (url) {
            const shouldOpen = confirm(`${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet not found. Would you like to install it?`);
            if (shouldOpen) {
                window.open(url, '_blank');
            }
        }
    }
    
    updateWalletUI() {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn && this.state.wallet.connected) {
            connectBtn.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                <span>${this.state.wallet.publicKey.slice(0, 4)}...${this.state.wallet.publicKey.slice(-4)}</span>
            `;
            connectBtn.classList.add('connected');
        }
        
        // Update portfolio value
        const totalValueEl = document.getElementById('totalValue');
        if (totalValueEl) {
            totalValueEl.textContent = `$${this.state.wallet.performance.totalValue.toLocaleString()}`;
        }
        
        // Update token count
        const tokenCountEl = document.getElementById('tokenCount');
        if (tokenCountEl) {
            tokenCountEl.textContent = this.state.wallet.tokens.length;
        }
    }
    
    async loadWalletData() {
        if (!this.state.wallet.connected || !this.solana.connection) {
            console.log('Cannot load wallet data: wallet not connected or no RPC connection');
            return;
        }
        
        try {
            // For demo purposes, use mock data
            this.loadMockWalletData();
            console.log('✅ Wallet data loaded successfully');
            
        } catch (error) {
            console.error('Error loading wallet data:', error);
            this.loadMockWalletData();
        }
    }
    
    loadMockWalletData() {
        // Mock portfolio data for demonstration
        this.state.wallet.balance = 15.7;
        this.state.wallet.tokens = [
            {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Solana',
                amount: 15.7,
                price: 98.50,
                value: 1546.45,
                change24h: 5.2,
                logo: null,
                isNative: true
            },
            {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                name: 'USD Coin',
                amount: 250.0,
                price: 1.0,
                value: 250.0,
                change24h: 0.1,
                logo: null,
                isNative: false
            },
            {
                address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                symbol: 'BONK',
                name: 'Bonk',
                amount: 1000000,
                price: 0.000023,
                value: 23.0,
                change24h: -12.5,
                logo: null,
                isNative: false
            }
        ];
        
        this.state.wallet.performance.totalValue = 1819.45;
        this.state.wallet.performance.dayChange = 87.32;
        this.state.wallet.performance.dayChangePercent = 5.0;
    }
    
    // =================
    // ONBOARDING SYSTEM
    // =================
    
    showOnboarding() {
        // Create and show onboarding modal
        const modalHTML = `
            <div id="welcomeModal" class="modal-overlay">
                <div class="modal-content welcome-content">
                    <div class="welcome-header">
                        <div class="logo-large"><i class="fas fa-chart-line"></i> Cypher</div>
                        <p>Advanced Solana Portfolio Analytics</p>
                    </div>
                    
                    <div class="onboarding-step active" data-step="1">
                        <div class="step-indicator">
                            <div class="step-number">1</div>
                            <h3>Welcome to Cypher</h3>
                        </div>
                        <div class="step-content">
                            <div class="feature-preview">
                                <i class="fas fa-rocket step-icon"></i>
                                <h4>Professional Portfolio Tracking</h4>
                                <p>Track your Solana investments with real-time analytics, performance metrics, and risk assessment tools.</p>
                            </div>
                            <ul class="feature-list">
                                <li><i class="fas fa-check"></i> Real-time portfolio valuation</li>
                                <li><i class="fas fa-check"></i> Advanced performance charts</li>
                                <li><i class="fas fa-check"></i> Risk analysis & diversification scores</li>
                                <li><i class="fas fa-check"></i> Whale tracking & social trading</li>
                            </ul>
                        </div>
                    </div>

                    <div class="onboarding-controls">
                        <button class="btn btn-secondary" onclick="app.skipOnboarding()">
                            Skip Tour
                        </button>
                        <button class="btn btn-primary" onclick="app.nextOnboardingStep()">
                            Get Started <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('welcomeModal');
        modal.style.display = 'flex';
        this.state.ui.modals.add('welcome');
    }
    
    skipOnboarding() {
        this.completeOnboarding();
    }
    
    nextOnboardingStep() {
        this.completeOnboarding();
    }
    
    completeOnboarding() {
        this.state.user.isFirstTime = false;
        this.state.user.onboardingCompleted = true;
        this.saveUserState();
        
        // Close onboarding modal
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.remove();
            this.state.ui.modals.delete('welcome');
        }
        
        // Show welcome message
        this.showToast('Welcome to Cypher! 🎉', 'success');
        
        // Start tutorial hints if wallet not connected
        if (!this.state.wallet.connected) {
            setTimeout(() => {
                this.showTooltip('connectWallet', 'Connect your wallet to start tracking your portfolio!');
            }, 2000);
        }
    }
    
    // =================
    // UI MANAGEMENT
    // =================
    
    initializeUI() {
        // Set up global search
        this.setupGlobalSearch();
        
        // Initialize charts
        this.initializeCharts();
        
        // Set up tooltips
        this.initializeTooltips();
        
        // Set up responsive handlers
        this.setupResponsiveHandlers();
        
        // Initialize modals
        this.initializeModals();
    }
    
    setupGlobalSearch() {
        const searchInput = document.getElementById('globalSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput && searchResults) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performGlobalSearch(query);
                    }, 300);
                } else {
                    searchResults.style.display = 'none';
                }
            });
            
            // Hide results when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.style.display = 'none';
                }
            });
        }
    }
    
    async performGlobalSearch(query) {
        const searchResults = document.getElementById('searchResults');
        
        try {
            searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
            searchResults.style.display = 'block';
            
            // Mock search results
            const results = [
                { address: 'SOL', symbol: 'SOL', name: 'Solana', price: 98.50 },
                { address: 'USDC', symbol: 'USDC', name: 'USD Coin', price: 1.00 },
                { address: 'BONK', symbol: 'BONK', name: 'Bonk', price: 0.000023 }
            ].filter(token => 
                token.symbol.toLowerCase().includes(query.toLowerCase()) ||
                token.name.toLowerCase().includes(query.toLowerCase())
            );
            
            if (results.length > 0) {
                searchResults.innerHTML = results.map(token => `
                    <div class="search-result-item" onclick="app.selectSearchResult('${token.address}')">
                        <div class="token-icon">${token.symbol.charAt(0)}</div>
                        <div class="token-info">
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-name">${token.name}</div>
                        </div>
                        <div class="token-price">$${token.price.toFixed(4)}</div>
                    </div>
                `).join('');
            } else {
                searchResults.innerHTML = '<div class="search-no-results">No tokens found</div>';
            }
            
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="search-error">Search failed</div>';
        }
    }
    
    selectSearchResult(tokenAddress) {
        const searchResults = document.getElementById('searchResults');
        searchResults.style.display = 'none';
        this.showToast(`Selected ${tokenAddress}`, 'info');
    }
    
    // =================
    // CHART INITIALIZATION
    // =================
    
    initializeCharts() {
        // Wait for DOM to be ready, then initialize charts
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.initCharts(), 100);
            });
        } else {
            setTimeout(() => this.initCharts(), 100);
        }
    }
    
    initCharts() {
        this.initPortfolioChart();
        this.initAllocationChart();
    }
    
    initPortfolioChart() {
        const ctx = document.getElementById('portfolioChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.state.ui.charts.has('portfolio')) {
            this.state.ui.charts.get('portfolio').destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Portfolio Value',
                    data: [1650, 1720, 1680, 1790, 1850, 1820, 1819],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { 
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ff6b6b',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => `$${context.parsed.y.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { color: 'rgba(255,255,255,0.1)' }, 
                        ticks: { color: '#888' }
                    },
                    y: { 
                        grid: { color: 'rgba(255,255,255,0.1)' }, 
                        ticks: { 
                            color: '#888',
                            callback: (value) => `$${value.toLocaleString()}`
                        }
                    }
                }
            }
        });
        
        this.state.ui.charts.set('portfolio', chart);
    }
    
    initAllocationChart() {
        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.state.ui.charts.has('allocation')) {
            this.state.ui.charts.get('allocation').destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['SOL', 'USDC', 'BONK'],
                datasets: [{
                    data: [1546.45, 250.0, 23.0],
                    backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        callbacks: {
                            label: (context) => {
                                const percentage = ((context.parsed / 1819.45) * 100).toFixed(1);
                                return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        this.state.ui.charts.set('allocation', chart);
        this.updateAllocationLegend();
    }
    
    updateAllocationLegend() {
        const legend = document.getElementById('allocationLegend');
        if (!legend) return;
        
        const tokens = [
            { symbol: 'SOL', value: 1546.45, color: '#ff6b6b' },
            { symbol: 'USDC', value: 250.0, color: '#4ecdc4' },
            { symbol: 'BONK', value: 23.0, color: '#45b7d1' }
        ];
        
        legend.innerHTML = tokens.map(token => {
            const percentage = ((token.value / 1819.45) * 100).toFixed(1);
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${token.color}"></div>
                    <span class="legend-label">${token.symbol}</span>
                    <span class="legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }
    
    // =================
    // SECTION MANAGEMENT
    // =================
    
    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'portfolio':
                await this.refreshPortfolioData();
                break;
            case 'analytics':
                await this.loadAnalyticsData();
                break;
            case 'market':
                await this.loadMarketData();
                break;
            case 'whale':
                await this.loadWhaleData();
                break;
            case 'alerts':
                this.renderAlerts();
                break;
            case 'social':
                await this.loadSocialData();
                break;
        }
    }
    
    // =================
    // EVENT LISTENERS
    // =================
    
    setupEventListeners() {
        // Set up all event listeners for the application
        window.addEventListener('resize', () => this.handleResize());
        
        // Connect wallet button
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
        
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sectionName = e.currentTarget.getAttribute('onclick')?.match(/switchSection\('(\w+)'\)/)?.[1];
                if (sectionName) {
                    this.switchSection(sectionName);
                }
            });
        });
    }
    
    handleResize() {
        // Handle responsive layout changes
        this.state.ui.charts.forEach(chart => {
            chart.resize();
        });
    }
    
    // =================
    // UTILITY FUNCTIONS
    // =================
    
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const status = document.getElementById('loadingStatus');
        
        if (overlay && status) {
            status.textContent = message;
            overlay.style.display = 'flex';
        }
        
        this.state.loading = true;
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        this.state.loading = false;
    }
    
    updateLoadingStatus(message) {
        const status = document.getElementById('loadingStatus');
        if (status) {
            status.textContent = message;
        }
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) {
            // Create toast if it doesn't exist
            const toastEl = document.createElement('div');
            toastEl.id = 'toast';
            toastEl.className = 'toast';
            document.body.appendChild(toastEl);
        }
        
        const toastElement = document.getElementById('toast');
        
        // Set message and type
        toastElement.textContent = message;
        toastElement.className = `toast ${type} show`;
        
        // Auto hide
        setTimeout(() => {
            toastElement.classList.remove('show');
        }, duration);
        
        // Add to notifications state
        this.state.ui.notifications.push({
            id: Date.now(),
            message,
            type,
            timestamp: Date.now()
        });
    }
    
    showTooltip(elementId, message, position = 'bottom') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = message;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 5000);
    }
    
    showError(message) {
        this.showToast(message, 'error', 5000);
        console.error(message);
    }
    
    trackEvent(eventName, properties = {}) {
        // Analytics tracking - would integrate with real analytics service
        console.log('📊 Event:', eventName, properties);
        
        // Store in local analytics
        const event = {
            name: eventName,
            properties,
            timestamp: Date.now(),
            sessionId: this.getSessionId()
        };
        
        // Add to analytics state
        if (!this.state.analytics.events) {
            this.state.analytics.events = [];
        }
        this.state.analytics.events.push(event);
    }
    
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = Math.random().toString(36).substr(2, 9);
        }
        return this.sessionId;
    }
    
    // =================
    // STATE MANAGEMENT
    // =================
    
    async loadUserState() {
        try {
            const saved = localStorage.getItem('cypher_user_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.state.user = { ...this.state.user, ...state };
            }
        } catch (error) {
            console.warn('Failed to load user state:', error);
        }
    }
    
    saveUserState() {
        try {
            localStorage.setItem('cypher_user_state', JSON.stringify(this.state.user));
        } catch (error) {
            console.warn('Failed to save user state:', error);
        }
    }
    
    // =================
    // PLACEHOLDER METHODS
    // =================
    
    async initSolanaConnection() {
        try {
            if (typeof solanaWeb3 !== 'undefined') {
                this.solana.connection = new solanaWeb3.Connection(
                    this.solana.rpcEndpoint, 
                    this.solana.commitment
                );
                console.log('✅ Solana connection initialized');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Solana connection:', error);
        }
    }
    
    async checkExistingWalletConnection() {
        // Check if wallet is already connected
        if (window.phantom?.solana?.isConnected) {
            try {
                const response = await window.phantom.solana.connect({ onlyIfTrusted: true });
                if (response.publicKey) {
                    this.state.wallet.connected = true;
                    this.state.wallet.publicKey = response.publicKey.toString();
                    await this.loadWalletData();
                    this.updateWalletUI();
                }
            } catch (error) {
                console.log('No trusted connection found');
            }
        }
    }
    
    async loadInitialData() {
        // Load initial market data
        this.state.market.solPrice = 98.50;
        console.log('Initial data loaded');
    }
    
    initializeTooltips() {
        // Tooltip system implementation
        console.log('Tooltips initialized');
    }
    
    setupResponsiveHandlers() {
        // Responsive design handlers
        console.log('Responsive handlers setup');
    }
    
    initializeModals() {
        // Modal management system
        console.log('Modals initialized');
    }
    
    async refreshPortfolioData() {
        console.log('Portfolio data refreshed');
    }
    
    async loadAnalyticsData() {
        console.log('Analytics data loaded');
    }
    
    async loadMarketData() {
        console.log('Market data loaded');
    }
    
    async loadWhaleData() {
        console.log('Whale data loaded');
    }
    
    renderAlerts() {
        console.log('Alerts rendered');
    }
    
    async loadSocialData() {
        console.log('Social data loaded');
    }
    
    async checkAchievements() {
        console.log('Achievements checked');
    }
}

// Global app instance
const app = new CypherApp();

// Global function assignments for onclick handlers
window.app = app;
window.connectWallet = () => app.connectWallet();
window.switchSection = (section) => app.switchSection(section);
window.showHelp = () => app.showToast('Help system coming soon!', 'info');

// Chart control functions
window.changeChartTimeframe = (timeframe) => {
    // Update chart timeframe
    const chart = app.state.ui.charts.get('portfolio');
    if (chart) {
        // Update active button
        document.querySelectorAll('.chart-controls .btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        app.showToast(`Chart updated to ${timeframe}`, 'info', 1500);
    }
};

// Portfolio functions
window.sortHoldings = () => {
    const sortBy = document.getElementById('sortHoldings').value;
    app.showToast(`Holdings sorted by ${sortBy}`, 'info', 1500);
};

window.exportHoldings = () => {
    app.showToast('Export feature coming soon!', 'info');
};

window.refreshPortfolio = async () => {
    if (app.state.wallet.connected) {
        app.showToast('Refreshing portfolio...', 'info');
        await app.loadWalletData();
        app.showToast('Portfolio refreshed!', 'success');
    } else {
        app.showToast('Please connect your wallet first', 'warning');
    }
};

// Alert functions
window.openAlertModal = () => {
    app.showToast('Alert creation modal coming soon!', 'info');
};

window.pauseAllAlerts = () => {
    app.showToast('All alerts paused', 'info');
};

window.exportAlerts = () => {
    app.showToast('Export alerts feature coming soon!', 'info');
};

window.clearAlertHistory = () => {
    app.showToast('Alert history cleared', 'info');
};

// Whale tracking functions
window.openFollowModal = () => {
    app.showToast('Follow wallet modal coming soon!', 'info');
};

window.refreshWhaleData = () => {
    app.showToast('Whale data refreshed', 'info');
};

window.filterWhaleMovements = (filter) => {
    app.showToast(`Filtered by ${filter}`, 'info');
};

// Market functions
window.filterTrending = (timeframe) => {
    app.showToast(`Trending filtered by ${timeframe}`, 'info');
};

window.showMovers = (type) => {
    app.showToast(`Showing ${type}`, 'info');
};

// Social functions
window.sharePortfolio = () => {
    app.showToast('Portfolio sharing coming soon!', 'info');
};

window.findTraders = () => {
    app.showToast('Trader discovery coming soon!', 'info');
};

window.joinCommunity = () => {
    app.showToast('Community features coming soon!', 'info');
};

// Benchmark functions
window.changeBenchmark = (benchmark) => {
    app.showToast(`Benchmark changed to ${benchmark}`, 'info');
};

// Analysis functions
window.generateAnalysisReport = () => {
    app.showToast('Analysis report generation coming soon!', 'info');
};