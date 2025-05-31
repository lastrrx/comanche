// Enhanced Cypher Portfolio Analytics - v2.0
// Advanced state management and API-ready architecture

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
    // ONBOARDING SYSTEM
    // =================
    
    showOnboarding() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.classList.add('show');
            this.state.ui.modals.add('welcome');
        }
    }
    
    nextOnboardingStep() {
        const currentStep = document.querySelector('.onboarding-step.active');
        const currentStepNum = parseInt(currentStep.dataset.step);
        const nextStepNum = currentStepNum + 1;
        const nextStep = document.querySelector(`[data-step="${nextStepNum}"]`);
        
        if (nextStep) {
            currentStep.classList.remove('active');
            nextStep.classList.add('active');
            
            // Update navigation
            this.updateOnboardingNavigation(nextStepNum);
            
            // Special handling for wallet connection step
            if (nextStepNum === 2) {
                this.prepareWalletConnectionStep();
            }
        } else {
            // Onboarding complete
            this.completeOnboarding();
        }
    }
    
    previousOnboardingStep() {
        const currentStep = document.querySelector('.onboarding-step.active');
        const currentStepNum = parseInt(currentStep.dataset.step);
        const prevStepNum = currentStepNum - 1;
        const prevStep = document.querySelector(`[data-step="${prevStepNum}"]`);
        
        if (prevStep) {
            currentStep.classList.remove('active');
            prevStep.classList.add('active');
            this.updateOnboardingNavigation(prevStepNum);
        }
    }
    
    updateOnboardingNavigation(stepNum) {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dots = document.querySelectorAll('.step-dots .dot');
        
        // Update previous button
        prevBtn.style.display = stepNum > 1 ? 'block' : 'none';
        
        // Update next button text
        if (stepNum === 3) {
            nextBtn.innerHTML = 'Get Started <i class="fas fa-rocket"></i>';
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
        }
        
        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < stepNum);
        });
    }
    
    async connectWalletFromOnboarding(walletType) {
        try {
            this.updateLoadingStatus('Connecting to wallet...');
            await this.connectWallet(walletType);
            
            if (this.state.wallet.connected) {
                // Auto-advance to next step
                setTimeout(() => {
                    this.nextOnboardingStep();
                }, 1000);
            }
        } catch (error) {
            console.error('Wallet connection from onboarding failed:', error);
            this.showToast('Failed to connect wallet. Please try again.', 'error');
        }
    }
    
    completeOnboarding() {
        this.state.user.isFirstTime = false;
        this.state.user.onboardingCompleted = true;
        this.saveUserState();
        
        // Close onboarding modal
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.classList.remove('show');
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
    // WALLET MANAGEMENT
    // =================
    
    async connectWallet(walletType = 'auto') {
        try {
            this.updateLoadingStatus('Looking for wallet...');
            
            let walletAdapter;
            
            // Auto-detect or use specific wallet
            if (walletType === 'auto' || walletType === 'phantom') {
                walletAdapter = this.getPhantomWallet();
            } else if (walletType === 'solflare') {
                walletAdapter = this.getSolflareWallet();
            } else if (walletType === 'backpack') {
                walletAdapter = this.getBackpackWallet();
            }
            
            if (!walletAdapter) {
                throw new Error(`${walletType} wallet not found. Please install the wallet extension.`);
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
                
                this.showToast('Wallet connected successfully! 🎉', 'success');
                
                // Analytics: Track wallet connection
                this.trackEvent('wallet_connected', { wallet_type: walletType });
                
                return true;
            }
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            
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
            const shouldOpen = confirm(`${walletType} wallet not found. Would you like to install it?`);
            if (shouldOpen) {
                window.open(url, '_blank');
            }
        }
    }
    
    async loadWalletData() {
        if (!this.state.wallet.connected || !this.solana.connection) {
            console.log('Cannot load wallet data: wallet not connected or no RPC connection');
            return;
        }
        
        try {
            const publicKey = new solanaWeb3.PublicKey(this.state.wallet.publicKey);
            
            // Get SOL balance
            const balance = await this.solana.connection.getBalance(publicKey);
            this.state.wallet.balance = balance / solanaWeb3.LAMPORTS_PER_SOL;
            
            // Get token accounts
            const tokenAccounts = await this.solana.connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            });
            
            // Process tokens
            await this.processWalletTokens(tokenAccounts.value);
            
            // Calculate portfolio performance
            await this.calculatePortfolioPerformance();
            
            // Update analytics
            this.updateWalletAnalytics();
            
            console.log('✅ Wallet data loaded successfully');
            
        } catch (error) {
            console.error('Error loading wallet data:', error);
            
            // Fallback to mock data for demo
            this.loadMockWalletData();
        }
    }
    
    async processWalletTokens(tokenAccounts) {
        this.state.wallet.tokens = [];
        let totalValue = 0;
        
        // Add SOL as first token
        const solPrice = await this.getSolPrice();
        const solValue = this.state.wallet.balance * solPrice;
        
        this.state.wallet.tokens.push({
            address: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Solana',
            amount: this.state.wallet.balance,
            price: solPrice,
            value: solValue,
            change24h: await this.getTokenChange24h('SOL'),
            logo: null,
            isNative: true
        });
        
        totalValue += solValue;
        
        // Process SPL tokens (limit for performance)
        for (const tokenAccount of tokenAccounts.slice(0, 20)) {
            try {
                const accountData = tokenAccount.account.data.parsed.info;
                const amount = parseFloat(accountData.tokenAmount.uiAmount);
                
                if (amount > 0) {
                    const tokenInfo = await this.getTokenInfo(accountData.mint);
                    const tokenPrice = await this.getTokenPrice(accountData.mint);
                    const tokenValue = amount * tokenPrice;
                    
                    this.state.wallet.tokens.push({
                        address: accountData.mint,
                        symbol: tokenInfo.symbol || 'UNKNOWN',
                        name: tokenInfo.name || 'Unknown Token',
                        amount: amount,
                        price: tokenPrice,
                        value: tokenValue,
                        change24h: await this.getTokenChange24h(tokenInfo.symbol),
                        logo: tokenInfo.logoURI,
                        isNative: false
                    });
                    
                    totalValue += tokenValue;
                }
            } catch (tokenError) {
                console.warn('Error processing token:', tokenError);
            }
        }
        
        this.state.wallet.performance.totalValue = totalValue;
    }
    
    // =================
    // API INTEGRATIONS
    // =================
    
    async apiCall(endpoint, params = {}, options = {}) {
        const { retries = 0, useCache = true, cacheTimeout = 60000 } = options;
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
        
        // Check cache first
        if (useCache && this.api.cache.has(cacheKey)) {
            const cached = this.api.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            // Rate limiting check
            if (this.isRateLimited(endpoint)) {
                throw new Error('Rate limited');
            }
            
            const url = new URL(endpoint);
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    url.searchParams.append(k, v);
                }
            });
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Cypher/2.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache successful response
            if (useCache) {
                this.api.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }
            
            // Update rate limit tracking
            this.updateRateLimit(endpoint);
            
            return data;
            
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            
            // Retry logic
            if (retries < this.api.retryConfig.maxRetries) {
                await this.sleep(this.api.retryConfig.backoffMs * (retries + 1));
                return this.apiCall(endpoint, params, { ...options, retries: retries + 1 });
            }
            
            // Return mock data as fallback
            return this.getMockData(endpoint);
        }
    }
    
    async getSolPrice() {
        try {
            const data = await this.apiCall(`${this.api.endpoints.coingecko}/simple/price`, {
                ids: 'solana',
                vs_currencies: 'usd',
                include_24hr_change: true
            });
            
            if (data?.solana?.usd) {
                this.state.market.solPrice = data.solana.usd;
                return data.solana.usd;
            }
            
        } catch (error) {
            console.error('Error fetching SOL price:', error);
        }
        
        // Fallback price
        return 98.50;
    }
    
    async getTokenPrice(mintAddress) {
        try {
            // Try Jupiter API first
            const jupiterData = await this.apiCall(`${this.api.endpoints.jupiter}/price`, {
                ids: mintAddress
            });
            
            if (jupiterData?.data?.[mintAddress]?.price) {
                return jupiterData.data[mintAddress].price;
            }
            
        } catch (error) {
            console.warn('Jupiter API failed, using fallback');
        }
        
        // Fallback to mock price
        return Math.random() * 10;
    }
    
    async getTokenInfo(mintAddress) {
        try {
            // This would integrate with a token metadata service
            // For now, return basic info
            return {
                symbol: `TOKEN`,
                name: `Token ${mintAddress.slice(0, 6)}`,
                logoURI: null
            };
        } catch (error) {
            console.error('Error fetching token info:', error);
            return { symbol: 'UNKNOWN', name: 'Unknown Token', logoURI: null };
        }
    }
    
    async getTokenChange24h(symbol) {
        try {
            const data = await this.apiCall(`${this.api.endpoints.coingecko}/simple/price`, {
                ids: symbol.toLowerCase(),
                vs_currencies: 'usd',
                include_24hr_change: true
            });
            
            return data?.[symbol.toLowerCase()]?.usd_24h_change || 0;
        } catch (error) {
            return (Math.random() - 0.5) * 20; // Mock change
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
            
            // Search tokens (this would integrate with a real token search API)
            const results = await this.searchTokens(query);
            
            if (results.length > 0) {
                searchResults.innerHTML = results.map(token => `
                    <div class="search-result-item" onclick="app.selectSearchResult('${token.address}')">
                        <div class="token-icon">${token.symbol.charAt(0)}</div>
                        <div class="token-info">
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-name">${token.name}</div>
                        </div>
                        <div class="token-price">${token.price.toFixed(4)}</div>
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
    
    async searchTokens(query) {
        // Mock implementation - would integrate with real token search API
        const mockTokens = [
            { address: 'SOL', symbol: 'SOL', name: 'Solana', price: this.state.market.solPrice },
            { address: 'RAY', symbol: 'RAY', name: 'Raydium', price: 2.45 },
            { address: 'SRM', symbol: 'SRM', name: 'Serum', price: 0.85 }
        ];
        
        return mockTokens.filter(token => 
            token.symbol.toLowerCase().includes(query.toLowerCase()) ||
            token.name.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    selectSearchResult(tokenAddress) {
        const searchResults = document.getElementById('searchResults');
        searchResults.style.display = 'none';
        
        // Navigate to token details or create alert
        this.showTokenDetails(tokenAddress);
    }
    
    initializeCharts() {
        this.initPortfolioChart();
        this.initAllocationChart();
        this.initBenchmarkChart();
        this.initMarketOverviewChart();
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
                labels: this.generateTimeLabels('7D'),
                datasets: [{
                    label: 'Portfolio Value',
                    data: this.generatePortfolioHistory('7D'),
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
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
                            label: (context) => `${context.parsed.y.toLocaleString()}`
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
                            callback: (value) => `${value.toLocaleString()}`
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
        
        const tokens = this.state.wallet.tokens.slice(0, 8); // Top 8 tokens
        const data = tokens.map(token => token.value);
        const labels = tokens.map(token => token.symbol);
        const colors = this.generateChartColors(tokens.length);
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
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
                                const percentage = ((context.parsed / this.state.wallet.performance.totalValue) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        this.state.ui.charts.set('allocation', chart);
        this.updateAllocationLegend(tokens, colors);
    }
    
    updateAllocationLegend(tokens, colors) {
        const legend = document.getElementById('allocationLegend');
        if (!legend) return;
        
        legend.innerHTML = tokens.map((token, index) => {
            const percentage = ((token.value / this.state.wallet.performance.totalValue) * 100).toFixed(1);
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${colors[index]}"></div>
                    <span class="legend-label">${token.symbol}</span>
                    <span class="legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }
    
    generateChartColors(count) {
        const baseColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
            '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }
    
    generateTimeLabels(timeframe) {
        const labels = [];
        const now = new Date();
        
        switch (timeframe) {
            case '1D':
                for (let i = 23; i >= 0; i--) {
                    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
                    labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
                break;
            case '7D':
                for (let i = 6; i >= 0; i--) {
                    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    labels.push(time.toLocaleDateString([], { weekday: 'short' }));
                }
                break;
            case '30D':
                for (let i = 29; i >= 0; i--) {
                    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    labels.push(time.toLocaleDateString([], { month: 'short', day: 'numeric' }));
                }
                break;
            case '1Y':
                for (let i = 11; i >= 0; i--) {
                    const time = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(time.toLocaleDateString([], { month: 'short' }));
                }
                break;
        }
        
        return labels;
    }
    
    generatePortfolioHistory(timeframe) {
        const baseValue = this.state.wallet.performance.totalValue || 1000;
        const dataPoints = {
            '1D': 24,
            '7D': 7,
            '30D': 30,
            '1Y': 12
        };
        
        const count = dataPoints[timeframe] || 7;
        const data = [];
        
        for (let i = 0; i < count; i++) {
            const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
            data.push(baseValue * (1 + variance));
        }
        
        return data;
    }
    
    // =================
    // SECTION MANAGEMENT
    // =================
    
    switchSection(sectionName) {
        // Update state
        this.state.currentSection = sectionName;
        
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[onclick="app.switchSection('${sectionName}')"]`)?.classList.add('active');
        
        // Update sections
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionName)?.classList.add('active');
        
        // Load section-specific data
        this.loadSectionData(sectionName);
        
        // Track analytics
        this.trackEvent('section_viewed', { section: sectionName });
    }
    
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
        if (!toast) return;
        
        // Set message and type
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Auto hide
        setTimeout(() => {
            toast.classList.remove('show');
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
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    isRateLimited(endpoint) {
        const limit = this.api.rateLimits.get(endpoint);
        if (!limit) return false;
        
        return Date.now() - limit.lastCall < limit.interval;
    }
    
    updateRateLimit(endpoint) {
        this.api.rateLimits.set(endpoint, {
            lastCall: Date.now(),
            interval: 1000 // 1 second between calls
        });
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
    // PLACEHOLDER METHODS (to be implemented)
    // =================
    
    async initSolanaConnection() {
        try {
            this.solana.connection = new solanaWeb3.Connection(
                this.solana.rpcEndpoint, 
                this.solana.commitment
            );
            console.log('✅ Solana connection initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Solana connection:', error);
        }
    }
    
    async checkExistingWalletConnection() {
        // Implementation for checking existing wallet connections
    }
    
    async loadInitialData() {
        // Load initial market data and other required information
        await this.getSolPrice();
    }
    
    setupEventListeners() {
        // Set up all event listeners for the application
        window.addEventListener('resize', () => this.handleResize());
        
        // Connect wallet button
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
    }
    
    handleResize() {
        // Handle responsive layout changes
        this.state.ui.charts.forEach(chart => {
            chart.resize();
        });
    }
    
    // Additional methods would be implemented here...
    loadMockWalletData() { /* Mock data implementation */ }
    calculatePortfolioPerformance() { /* Portfolio calculations */ }
    updateWalletAnalytics() { /* Analytics updates */ }
    updateWalletUI() { /* UI updates */ }
    checkAchievements() { /* Achievement system */ }
    initializeTooltips() { /* Tooltip system */ }
    setupResponsiveHandlers() { /* Responsive design */ }
    initializeModals() { /* Modal management */ }
    initBenchmarkChart() { /* Benchmark chart */ }
    initMarketOverviewChart() { /* Market overview chart */ }
    refreshPortfolioData() { /* Portfolio refresh */ }
    loadAnalyticsData() { /* Analytics data */ }
    loadMarketData() { /* Market data */ }
    loadWhaleData() { /* Whale tracking */ }
    renderAlerts() { /* Alerts rendering */ }
    loadSocialData() { /* Social features */ }
    getMockData() { /* Mock data fallback */ }
    showTokenDetails() { /* Token details */ }
}

// Global app instance
const app = new CypherApp();

// Global function assignments for onclick handlers (backward compatibility)
window.app = app;
window.connectWallet = () => app.connectWallet();
window.switchSection = (section) => app.switchSection(section);
window.nextOnboardingStep = () => app.nextOnboardingStep();
window.previousOnboardingStep = () => app.previousOnboardingStep();
window.connectWalletFromOnboarding = (type) => app.connectWalletFromOnboarding(type);
window.showHelp = () => app.showHelp();

// Additional global functions for UI interactions
window.changeChartTimeframe = (timeframe) => {
    // Update chart timeframe
    const chart = app.state.ui.charts.get('portfolio');
    if (chart) {
        chart.data.labels = app.generateTimeLabels(timeframe);
        chart.data.datasets[0].data = app.generatePortfolioHistory(timeframe);
        chart.update();
    }
    
    // Update active button
    document.querySelectorAll('.chart-controls .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
};

window.sortHoldings = () => {
    const sortBy = document.getElementById('sortHoldings').value;
    // Implementation for sorting holdings
};

window.exportHoldings = () => {
    // Implementation for exporting holdings
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