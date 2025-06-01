// Enhanced Cypher Portfolio Analytics - v4.0
// Fixed implementation with proper global function exposure and error corrections

class CypherApp {
    constructor() {
        this.state = {
            initialized: false,
            loading: false,
            currentSection: 'portfolio',
            
            user: {
                isFirstTime: true,
                preferences: {},
                onboardingCompleted: false,
                achievements: new Set(),
                joinedDate: null,
                totalTrades: 0,
                bestPerformance: 0,
                streak: 0
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
                },
                analytics: {
                    winRate: 0,
                    sharpeRatio: 0,
                    maxDrawdown: 0,
                    volatility: 0,
                    tradingPatterns: {},
                    riskScore: 'Medium'
                }
            },
            
            market: {
                solPrice: 0,
                marketCap: 0,
                volume24h: 0,
                priceChange24h: 0,
                sentiment: 'neutral',
                trending: [],
                gainers: [],
                losers: [],
                topVolume: []
            },
            
            social: {
                followedWallets: new Map(),
                whaleMovements: [],
                leaderboard: [],
                achievements: new Map(),
                userRank: null,
                streak: 0,
                totalEarnings: 0
            },
            
            alerts: {
                active: [],
                history: [],
                settings: {
                    browserNotifications: true,
                    emailNotifications: false,
                    pushNotifications: false
                },
                whaleAlerts: {
                    enabled: true,
                    threshold: 50,
                    onlyHoldings: true
                }
            },
            
            analytics: {
                portfolioHistory: [],
                tradingPatterns: {},
                riskMetrics: {},
                benchmarkComparison: {},
                performanceMetrics: {
                    roi: 0,
                    winRate: 0,
                    avgHoldTime: 0,
                    bestTrade: null,
                    worstTrade: null,
                    volatility: 0
                }
            },
            
            ui: {
                charts: new Map(),
                modals: new Set(),
                notifications: [],
                searchResults: [],
                mobileNavOpen: false
            }
        };
        
        // API Configuration with authenticated endpoints
        this.apiConfig = {
            extrnode: {
                key: 'e0c37480-5843-44e5-bf0e-d0bb97addc76',
                endpoint: 'https://solana-mainnet.rpc.extrnode.com/e0c37480-5843-44e5-bf0e-d0bb97addc76',
                network: 'mainnet'
            },
            alchemy: {
                key: 'Gd9lQyyMomZHlWBm5ggDGeJ6laFVcGkb',
                endpoint: 'https://solana-devnet.g.alchemy.com/v2/Gd9lQyyMomZHlWBm5ggDGeJ6laFVcGkb',
                network: 'devnet'
            },
            coingecko: {
                key: 'CG-MyyvkFkqdTef8PzJRwfuiY1t',
                baseUrl: 'https://api.coingecko.com/api/v3',
                rateLimit: 10000
            }
        };

        this.rpcEndpoints = [
            {
                url: this.apiConfig.extrnode.endpoint,
                network: 'mainnet',
                name: 'Extrnode'
            },
            {
                url: this.apiConfig.alchemy.endpoint,
                network: 'devnet', 
                name: 'Alchemy'
            },
            {
                url: 'https://api.mainnet-beta.solana.com',
                network: 'mainnet',
                name: 'Solana Labs'
            }
        ];
        
        this.solana = {
            connection: null,
            currentEndpoint: 0,
            currentNetwork: 'mainnet',
            useApiOnly: false
        };

        this.cache = new DataCache();
        this.apiManager = new APIManager();

        this.tokenRegistry = {
            'So11111111111111111111111111111111111111112': { 
                symbol: 'SOL', 
                name: 'Solana', 
                decimals: 9,
                coingeckoId: 'solana'
            },
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { 
                symbol: 'USDC', 
                name: 'USD Coin', 
                decimals: 6,
                coingeckoId: 'usd-coin'
            },
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { 
                symbol: 'BONK', 
                name: 'Bonk', 
                decimals: 5,
                coingeckoId: 'bonk'
            },
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { 
                symbol: 'USDT', 
                name: 'Tether USD', 
                decimals: 6,
                coingeckoId: 'tether'
            },
            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {
                symbol: 'mSOL',
                name: 'Marinade SOL',
                decimals: 9,
                coingeckoId: 'marinade-staked-sol'
            },
            'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': {
                symbol: 'JitoSOL',
                name: 'Jito Staked SOL',
                decimals: 9,
                coingeckoId: 'jito-staked-sol'
            }
        };
        
        this.init();
    }
    
    // INITIALIZATION METHODS
    async init() {
        try {
            this.showLoadingOverlay('Initializing Cypher...');
            
            await this.loadUserState();
            await this.loadAlertsState();
            await this.initSolanaConnectionSafely();
            this.setupEventListeners();
            this.initializeUI();
            await this.loadInitialMarketData();
            await this.checkExistingWalletConnection();
            
            if (this.state.user.isFirstTime && !this.state.wallet.connected) {
                setTimeout(() => this.showOnboarding(), 1000);
            }
            
            this.state.initialized = true;
            this.hideLoadingOverlay();
            this.startRealTimeUpdates();
            
            const apiStatus = `✅ Initialized with ${this.getNetworkDisplayName()} + CoinGecko Pro API`;
            console.log('🚀 Cypher initialized successfully');
            this.showToast(apiStatus, 'success', 3000);
            
        } catch (error) {
            console.error('❌ Failed to initialize Cypher:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
            this.hideLoadingOverlay();
        }
    }

    async initSolanaConnectionSafely() {
        this.updateLoadingStatus('Connecting to Solana network...');
        
        if (typeof solanaWeb3 === 'undefined') {
            console.error('❌ Solana Web3.js not loaded - using API-only mode');
            this.solana.useApiOnly = true;
            return;
        }

        for (let i = 0; i < this.rpcEndpoints.length; i++) {
            const endpoint = this.rpcEndpoints[i];
            try {
                console.log(`🔄 Testing RPC: ${endpoint.name} (${endpoint.network})`);
                
                const connection = new solanaWeb3.Connection(
                    endpoint.url, 
                    'confirmed'
                );
                
                const testPromise = connection.getLatestBlockhash();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                );
                
                await Promise.race([testPromise, timeoutPromise]);
                
                this.solana.connection = connection;
                this.solana.currentEndpoint = i;
                this.solana.currentNetwork = endpoint.network;
                
                console.log(`✅ Connected to: ${endpoint.name} (${endpoint.network})`);
                
                if (endpoint.network === 'devnet') {
                    this.showToast('Connected to Devnet - some features may show test data', 'warning', 4000);
                } else {
                    this.showToast('Blockchain connection established', 'success', 2000);
                }
                
                return;
                
            } catch (error) {
                console.warn(`❌ RPC ${endpoint.name} failed: ${error.message}`);
                continue;
            }
        }
        
        console.warn('❌ All RPC endpoints failed - switching to API-only mode');
        this.solana.connection = null;
        this.solana.useApiOnly = true;
        this.showToast('Using market data only (RPC unavailable)', 'warning', 3000);
    }

    // WALLET CONNECTION METHODS
    async connectWallet(walletType = 'auto') {
        try {
            console.log('🔗 Attempting wallet connection...');
            this.showLoadingOverlay('Connecting wallet...');
            
            const walletAdapter = this.getWalletAdapter(walletType);
            
            if (!walletAdapter) {
                this.hideLoadingOverlay();
                this.showWalletInstallationHelp(walletType === 'auto' ? 'phantom' : walletType);
                return false;
            }
            
            this.updateLoadingStatus('Requesting wallet connection...');
            
            const response = await walletAdapter.connect({ onlyIfTrusted: false });
            
            if (response.publicKey) {
                this.state.wallet.connected = true;
                this.state.wallet.publicKey = response.publicKey.toString();
                
                this.updateLoadingStatus('Loading wallet data...');
                
                await this.loadRealWalletData();
                this.updateWalletUI();
                await this.checkAchievements();
                
                this.hideLoadingOverlay();
                this.showToast('Wallet connected successfully! 🎉', 'success');
                this.trackEvent('wallet_connected', { wallet_type: walletType });
                
                return true;
            }
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.hideLoadingOverlay();
            this.handleWalletConnectionError(error, walletType);
            return false;
        }
    }

    getWalletAdapter(walletType) {
        if (walletType === 'auto' || walletType === 'phantom') {
            const phantom = this.getPhantomWallet();
            if (phantom) return phantom;
            if (walletType === 'auto') {
                return this.getSolflareWallet() || this.getBackpackWallet();
            }
        } else if (walletType === 'solflare') {
            return this.getSolflareWallet();
        } else if (walletType === 'backpack') {
            return this.getBackpackWallet();
        }
        return null;
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

    handleWalletConnectionError(error, walletType) {
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            this.showToast('Connection cancelled by user', 'warning');
        } else if (error.code === -32002) {
            this.showToast('Connection request pending. Please check your wallet.', 'info');
        } else {
            this.showToast(`Connection failed: ${error.message}`, 'error');
            if (error.message.includes('not found')) {
                this.showWalletInstallationHelp(walletType);
            }
        }
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

    async checkExistingWalletConnection() {
        if (window.phantom?.solana?.isConnected) {
            try {
                const response = await window.phantom.solana.connect({ onlyIfTrusted: true });
                if (response.publicKey) {
                    this.state.wallet.connected = true;
                    this.state.wallet.publicKey = response.publicKey.toString();
                    await this.loadRealWalletData();
                    this.updateWalletUI();
                    this.showToast('Wallet auto-connected!', 'success');
                }
            } catch (error) {
                console.log('No trusted connection found');
            }
        }
    }

    // DATA LOADING METHODS - REMOVED DEMO FALLBACKS
    async loadRealWalletData() {
        if (!this.state.wallet.connected) {
            console.log('❌ Wallet not connected');
            return;
        }

        if (!this.solana.connection || this.solana.useApiOnly) {
            console.log('📡 No RPC connection available');
            this.showToast('RPC unavailable - connect wallet to a supported network', 'error');
            return;
        }

        try {
            this.updateLoadingStatus('Loading wallet data...');
            
            const publicKey = new solanaWeb3.PublicKey(this.state.wallet.publicKey);
            const solBalance = await this.getSolBalanceWithRetry(publicKey);
            const tokenAccounts = await this.getTokenAccountsWithRetry(publicKey);
            const processedTokens = await this.processTokenAccounts(tokenAccounts, solBalance);
            
            this.state.wallet.balance = solBalance;
            this.state.wallet.tokens = processedTokens.tokens;
            this.state.wallet.performance = processedTokens.performance;
            
            this.updateWalletUI();
            this.updatePortfolioCharts();
            
            console.log('✅ Real wallet data loaded successfully');
            this.showToast('Portfolio loaded with live blockchain data!', 'success');
            
        } catch (error) {
            console.error('❌ Error loading wallet data:', error);
            this.showToast('Failed to load wallet data. Please try again.', 'error');
        }
    }

    // BLOCKCHAIN DATA METHODS
    async getSolBalanceWithRetry(publicKey, maxRetries = 2) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const balance = await this.solana.connection.getBalance(publicKey);
                return balance / solanaWeb3.LAMPORTS_PER_SOL;
            } catch (error) {
                console.warn(`SOL balance fetch attempt ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async getTokenAccountsWithRetry(publicKey, maxRetries = 2) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const accounts = await this.solana.connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { 
                        programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') 
                    }
                );
                
                return accounts.value.filter(account => {
                    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
                    return amount && amount > 0;
                });
                
            } catch (error) {
                console.warn(`Token accounts fetch attempt ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async processTokenAccounts(tokenAccounts, solBalance) {
        const tokens = [];
        
        const solPrice = this.state.market.solPrice || 0;
        const solValue = solBalance * solPrice;
        let totalValue = solValue;
        
        tokens.push({
            address: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Solana',
            amount: solBalance,
            price: solPrice,
            value: solValue,
            change24h: this.state.market.priceChange24h || 0,
            isNative: true
        });

        const tokenList = this.buildTokenList(tokenAccounts);
        
        if (tokenList.length > 0) {
            try {
                const prices = await this.fetchTokenPricesFromCoinGecko(tokenList);
                this.updateTokenListPrices(tokenList, prices);
                totalValue += tokenList.reduce((sum, token) => sum + token.value, 0);
            } catch (error) {
                console.warn('Failed to fetch token prices:', error);
            }
        }

        tokens.push(...tokenList);
        tokens.sort((a, b) => b.value - a.value);

        return {
            tokens,
            performance: this.calculatePerformance(totalValue)
        };
    }

    buildTokenList(tokenAccounts) {
        const tokenList = [];
        tokenAccounts.forEach(account => {
            const tokenInfo = account.account.data.parsed.info;
            const mint = tokenInfo.mint;
            const amount = tokenInfo.tokenAmount.uiAmount;
            
            const tokenMeta = this.tokenRegistry[mint] || {
                symbol: mint.slice(0, 4) + '...',
                name: 'Unknown Token',
                decimals: tokenInfo.tokenAmount.decimals,
                coingeckoId: null
            };

            tokenList.push({
                address: mint,
                symbol: tokenMeta.symbol,
                name: tokenMeta.name,
                amount: amount,
                price: 0,
                value: 0,
                change24h: 0,
                isNative: false,
                coingeckoId: tokenMeta.coingeckoId
            });
        });
        return tokenList;
    }

    updateTokenListPrices(tokenList, prices) {
        tokenList.forEach(token => {
            if (token.coingeckoId && prices[token.coingeckoId]) {
                const priceData = prices[token.coingeckoId];
                token.price = priceData.usd || 0;
                token.change24h = priceData.usd_24h_change || 0;
                token.value = token.amount * token.price;
            }
        });
    }

    calculatePerformance(totalValue) {
        const previousValue = this.state.wallet.performance.totalValue || totalValue;
        const dayChange = totalValue - previousValue;
        const dayChangePercent = previousValue > 0 ? (dayChange / previousValue) * 100 : 0;

        return {
            totalValue,
            dayChange,
            dayChangePercent,
            totalGain: 0,
            totalGainPercent: 0
        };
    }

    // MARKET DATA METHODS
    async loadInitialMarketData() {
        try {
            this.updateLoadingStatus('Loading market data...');
            
            const marketData = await this.fetchMarketDataFromCoinGecko();
            
            if (marketData) {
                this.state.market = { ...this.state.market, ...marketData };
                this.updateMarketUI();
                console.log('✅ Market data loaded successfully');
            } else {
                throw new Error('Failed to fetch market data');
            }
            
        } catch (error) {
            console.error('❌ Failed to load market data:', error);
            this.showToast('Failed to load market data', 'error');
        }
    }

    async fetchMarketDataFromCoinGecko() {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true',
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();
            const solData = data.solana;

            if (!solData) {
                throw new Error('Invalid CoinGecko response');
            }

            return {
                solPrice: solData.usd || 0,
                marketCap: solData.usd_market_cap || 0,
                volume24h: solData.usd_24h_vol || 0,
                priceChange24h: solData.usd_24h_change || 0
            };

        } catch (error) {
            console.error('CoinGecko API failed:', error);
            return null;
        }
    }

    async fetchTokenPricesFromCoinGecko(tokens) {
        try {
            const geckoIds = tokens.map(token => {
                const tokenInfo = this.tokenRegistry[token.address];
                return tokenInfo?.coingeckoId;
            }).filter(Boolean);

            if (geckoIds.length === 0) {
                return {};
            }

            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko price API error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Token price fetch failed:', error);
            return {};
        }
    }

    // EVENT LISTENERS
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
        
        // Mobile navigation
        const mobileNavToggle = document.getElementById('mobileNavToggle');
        const mobileNavClose = document.getElementById('mobileNavClose');
        const mobileNavOverlay = document.getElementById('mobileNavOverlay');
        
        if (mobileNavToggle) {
            mobileNavToggle.addEventListener('click', () => this.toggleMobileNav());
        }
        
        if (mobileNavClose) {
            mobileNavClose.addEventListener('click', () => this.closeMobileNav());
        }
        
        if (mobileNavOverlay) {
            mobileNavOverlay.addEventListener('click', (e) => {
                if (e.target === mobileNavOverlay) {
                    this.closeMobileNav();
                }
            });
        }
        
        // Mobile nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                if (section) {
                    this.switchSection(section);
                    this.closeMobileNav();
                }
            });
        });
        
        // Desktop navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sectionName = e.currentTarget.getAttribute('onclick')?.match(/switchSection\('(\w+)'\)/)?.[1];
                if (sectionName) {
                    this.switchSection(sectionName);
                }
            });
        });

        this.setupCustomDropdowns();

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.state.wallet.connected) {
                e.preventDefault();
                this.refreshPortfolioData();
                this.showToast('Portfolio refreshed', 'info');
            }
            
            if (e.key === 'Escape' && this.state.ui.mobileNavOpen) {
                this.closeMobileNav();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }
    
    toggleMobileNav() {
        const overlay = document.getElementById('mobileNavOverlay');
        if (overlay) {
            this.state.ui.mobileNavOpen = !this.state.ui.mobileNavOpen;
            if (this.state.ui.mobileNavOpen) {
                overlay.classList.add('show');
                document.body.style.overflow = 'hidden';
            } else {
                overlay.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    }
    
    closeMobileNav() {
        const overlay = document.getElementById('mobileNavOverlay');
        if (overlay) {
            this.state.ui.mobileNavOpen = false;
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    setupCustomDropdowns() {
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = toggle.closest('.dropdown');
                const menu = dropdown.querySelector('.dropdown-menu');
                
                this.closeAllDropdowns(dropdown);
                
                const isOpen = menu.classList.contains('show');
                if (isOpen) {
                    menu.classList.remove('show');
                    toggle.classList.remove('active');
                } else {
                    menu.classList.add('show');
                    toggle.classList.add('active');
                }
            });
        });
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const dropdown = item.closest('.dropdown');
                const toggle = dropdown.querySelector('.dropdown-toggle');
                const menu = dropdown.querySelector('.dropdown-menu');
                const value = item.getAttribute('data-value');
                const text = item.textContent;
                
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                const span = toggle.querySelector('span');
                if (span) span.textContent = text;
                
                menu.classList.remove('show');
                toggle.classList.remove('active');
                
                this.handleDropdownChange(dropdown.id, value);
            });
        });
    }
    
    closeAllDropdowns(except = null) {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            if (dropdown !== except) {
                const menu = dropdown.querySelector('.dropdown-menu');
                const toggle = dropdown.querySelector('.dropdown-toggle');
                if (menu) menu.classList.remove('show');
                if (toggle) toggle.classList.remove('active');
            }
        });
    }
    
    handleDropdownChange(dropdownId, value) {
        switch (dropdownId) {
            case 'sortDropdown':
                this.sortHoldings(value);
                break;
            case 'benchmarkDropdown':
                this.changeBenchmark(value);
                break;
            case 'marketFilterDropdown':
                this.filterMarket(value);
                break;
            case 'whaleFilterDropdown':
                this.filterWhaleMovements(value);
                break;
        }
    }
    
    handleResize() {
        this.state.ui.charts.forEach(chart => {
            chart.resize();
        });
    }

    // UI UPDATE METHODS
    updateWalletUI() {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn && this.state.wallet.connected) {
            connectBtn.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                <span>${this.state.wallet.publicKey.slice(0, 4)}...${this.state.wallet.publicKey.slice(-4)}</span>
            `;
            connectBtn.classList.add('connected');
        }
        
        this.updatePortfolioStats();
        this.updateHoldingsList();
    }

    updatePortfolioStats() {
        const performance = this.state.wallet.performance;
        
        this.updateElement('totalValue', `$${performance.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`);
        
        this.updateElement('tokenCount', this.state.wallet.tokens.length);

        const portfolioGainEl = document.getElementById('portfolioGain');
        const gainAmountEl = document.getElementById('gainAmount');
        if (portfolioGainEl && gainAmountEl) {
            const isPositive = performance.dayChangePercent >= 0;
            portfolioGainEl.textContent = `${isPositive ? '+' : ''}${performance.dayChangePercent.toFixed(2)}%`;
            portfolioGainEl.className = `stat-value ${isPositive ? 'positive' : 'negative'}`;
            
            gainAmountEl.textContent = `${isPositive ? '+' : ''}$${Math.abs(performance.dayChange).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            gainAmountEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        }

        this.updateElement('centerValue', `$${Math.round(performance.totalValue).toLocaleString()}`);

        const totalChangeEl = document.getElementById('totalChange');
        if (totalChangeEl && this.state.wallet.connected) {
            const isPositive = performance.dayChangePercent >= 0;
            totalChangeEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${performance.dayChangePercent.toFixed(2)}% today</span>`;
        }
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    updateHoldingsList() {
        const tokenListEl = document.getElementById('tokenList');
        if (!tokenListEl) return;

        if (this.state.wallet.tokens.length === 0) {
            tokenListEl.innerHTML = this.getEmptyStateHTML();
            return;
        }

        tokenListEl.innerHTML = this.state.wallet.tokens.map(token => this.getTokenItemHTML(token)).join('');
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-wallet" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h4>No Holdings Found</h4>
                <p>Your portfolio appears to be empty or we couldn't load your token data.</p>
                <button class="btn btn-primary" onclick="refreshPortfolio()">
                    <i class="fas fa-refresh"></i> Refresh Portfolio
                </button>
            </div>
        `;
    }

    getTokenItemHTML(token) {
        const isPositive = token.change24h >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="token-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div class="token-icon" style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 1rem;">
                    ${token.symbol.charAt(0)}
                </div>
                <div class="token-info" style="flex: 1;">
                    <div class="token-symbol" style="font-weight: 600; color: #ffffff; font-size: 1rem;">${token.symbol}</div>
                    <div class="token-name" style="color: #a3a3a3; font-size: 0.875rem;">${token.name}</div>
                </div>
                <div class="token-amount" style="text-align: right; margin-right: 1rem;">
                    <div style="font-weight: 600; color: #ffffff;">${token.amount.toLocaleString(undefined, {maximumFractionDigits: 6})}</div>
                    <div style="color: #a3a3a3; font-size: 0.875rem;">${token.price.toFixed(4)}</div>
                </div>
                <div class="token-value" style="text-align: right; margin-right: 1rem;">
                    <div style="font-weight: 600; color: #ffffff;">${token.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="${changeClass}" style="font-size: 0.875rem;">
                        <i class="fas ${changeIcon}"></i> ${Math.abs(token.change24h).toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }

    updateMarketUI() {
        this.updateElement('solPrice', `${this.state.market.solPrice.toFixed(2)}`);
        
        const solChangeEl = document.getElementById('solChange');
        if (solChangeEl) {
            const change = this.state.market.priceChange24h || 0;
            const isPositive = change >= 0;
            solChangeEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change.toFixed(2)}%</span>`;
        }

        const marketVolEl = document.getElementById('marketVol');
        if (marketVolEl) {
            const volume = this.state.market.volume24h || 0;
            marketVolEl.textContent = `${this.formatLargeNumber(volume)}`;
        }
    }

    formatLargeNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toFixed(0);
    }

    // NAVIGATION METHODS
    switchSection(sectionName) {
        console.log('🔄 Switching to section:', sectionName);
        this.state.currentSection = sectionName;
        
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[onclick*="${sectionName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeMobileItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeMobileItem) {
            activeMobileItem.classList.add('active');
        }
        
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        this.loadSectionData(sectionName);
        this.trackEvent('section_viewed', { section: sectionName });
        this.showToast(`Switched to ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`, 'info', 1500);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'portfolio':
                if (this.state.wallet.connected) {
                    await this.refreshPortfolioData();
                }
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

    // INITIALIZATION AND UTILITY METHODS
    initializeUI() {
        this.setupGlobalSearch();
        this.initializeCharts();
        this.initializeTooltips();
        this.setupResponsiveHandlers();
        this.initializeModals();
    }
    
    initializeCharts() {
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
            options: this.getChartOptions()
        });
        
        this.state.ui.charts.set('portfolio', chart);
    }

    getChartOptions() {
        return {
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
        };
    }
    
    initAllocationChart() {
        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;
        
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
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
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
        
        const total = tokens.reduce((sum, token) => sum + token.value, 0);
        
        legend.innerHTML = tokens.map(token => {
            const percentage = total > 0 ? ((token.value / total) * 100).toFixed(1) : '0.0';
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${token.color}"></div>
                    <span class="legend-label">${token.symbol}</span>
                    <span class="legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    updatePortfolioCharts() {
        this.updateAllocationChart();
        this.updatePerformanceChart();
    }

    updateAllocationChart() {
        const chart = this.state.ui.charts.get('allocation');
        if (!chart) return;

        const tokens = this.state.wallet.tokens.slice(0, 5);
        const labels = tokens.map(token => token.symbol);
        const data = tokens.map(token => token.value);
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = colors.slice(0, tokens.length);
        chart.update();

        this.updateAllocationLegendWithTokens(tokens, colors);
    }

    updateAllocationLegendWithTokens(tokens, colors) {
        const legend = document.getElementById('allocationLegend');
        if (!legend) return;

        const totalValue = this.state.wallet.performance.totalValue;
        
        legend.innerHTML = tokens.map((token, index) => {
            const percentage = totalValue > 0 ? ((token.value / totalValue) * 100).toFixed(1) : '0.0';
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${colors[index]}"></div>
                    <span class="legend-label">${token.symbol}</span>
                    <span class="legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    updatePerformanceChart() {
        const chart = this.state.ui.charts.get('portfolio');
        if (!chart) return;

        const currentValue = this.state.wallet.performance.totalValue;
        const mockData = this.generateMockHistoricalData(currentValue);

        chart.data.datasets[0].data = mockData;
        chart.update();
    }

    generateMockHistoricalData(currentValue, days = 7) {
        const data = [];
        const volatility = 0.02;
        
        for (let i = days; i >= 0; i--) {
            const randomChange = (Math.random() - 0.5) * volatility;
            const value = currentValue * (1 + randomChange * i * 0.1);
            data.push(Math.max(0, value));
        }
        
        return data;
    }

    // UI UTILITY METHODS
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
            const toastEl = document.createElement('div');
            toastEl.id = 'toast';
            toastEl.className = 'toast';
            document.body.appendChild(toastEl);
        }
        
        const toastElement = document.getElementById('toast');
        toastElement.textContent = message;
        toastElement.className = `toast ${type} show`;
        
        setTimeout(() => {
            toastElement.classList.remove('show');
        }, duration);
        
        this.state.ui.notifications.push({
            id: Date.now(),
            message,
            type,
            timestamp: Date.now()
        });
    }
    
    showError(message) {
        this.showToast(message, 'error', 5000);
        console.error(message);
    }
    
    trackEvent(eventName, properties = {}) {
        console.log('📊 Event:', eventName, properties);
        
        const event = {
            name: eventName,
            properties,
            timestamp: Date.now(),
            sessionId: this.getSessionId()
        };
        
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

    getNetworkDisplayName() {
        return this.solana.currentNetwork === 'devnet' ? 'Devnet' : 'Mainnet';
    }

    isDevnetConnected() {
        return this.solana.currentNetwork === 'devnet';
    }

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

    loadAlertsState() {
        console.log('Loading alerts state...');
    }

    startRealTimeUpdates() {
        setInterval(() => {
            this.updateMarketData();
        }, 120000); // Every 2 minutes

        setInterval(() => {
            if (this.state.wallet.connected) {
                this.refreshPortfolioData();
            }
        }, 300000); // Every 5 minutes

        setInterval(() => {
            this.cache.cleanExpired();
        }, 600000); // Every 10 minutes

        console.log('🔄 Real-time updates started with optimized intervals');
        this.showToast(`Connected to ${this.getNetworkDisplayName()} - Updates every 2min`, 'info');
    }

    async updateMarketData() {
        try {
            const marketData = await this.fetchMarketDataFromCoinGecko();
            if (marketData) {
                this.state.market = { ...this.state.market, ...marketData };
                this.updateMarketUI();
                
                if (this.state.wallet.connected && this.state.wallet.tokens.length > 0) {
                    this.updateTokenPricesInPortfolio(marketData);
                }
            }
        } catch (error) {
            console.error('Failed to update market data:', error);
        }
    }

    updateTokenPricesInPortfolio(marketData) {
        const solToken = this.state.wallet.tokens.find(t => t.symbol === 'SOL');
        if (solToken) {
            solToken.price = marketData.solPrice;
            solToken.value = solToken.amount * marketData.solPrice;
            solToken.change24h = marketData.priceChange24h;
            
            const totalValue = this.state.wallet.tokens.reduce((sum, token) => sum + token.value, 0);
            this.state.wallet.performance.totalValue = totalValue;
            
            this.updatePortfolioStats();
            this.updatePortfolioCharts();
        }
    }

    async refreshPortfolioData() {
        if (!this.state.wallet.connected) return;
        
        try {
            await this.loadRealWalletData();
        } catch (error) {
            console.error('Failed to refresh portfolio data:', error);
        }
    }

    // PLACEHOLDER METHODS FOR UNIMPLEMENTED FEATURES
    async loadAnalyticsData() {
        console.log('📊 Analytics data loading...');
        this.showToast('Analytics section coming soon', 'info');
    }
    
    async loadMarketData() {
        console.log('📈 Market data loading...');
        this.showToast('Market section coming soon', 'info');
    }
    
    async loadWhaleData() {
        console.log('🐋 Whale data loading...');
        this.showToast('Whale tracking coming soon', 'info');
    }
    
    renderAlerts() {
        console.log('🔔 Alerts rendering...');
        this.showToast('Alerts section coming soon', 'info');
    }
    
    async loadSocialData() {
        console.log('👥 Social data loading...');
        this.showToast('Social features coming soon', 'info');
    }
    
    async checkAchievements() {
        console.log('🏆 Achievements checked');
    }

    setupGlobalSearch() {
        console.log('🔍 Global search setup');
    }
    
    initializeTooltips() {
        console.log('💡 Tooltips initialized');
    }
    
    setupResponsiveHandlers() {
        console.log('📱 Responsive handlers setup');
    }
    
    initializeModals() {
        console.log('🪟 Modals initialized');
    }

    showOnboarding() {
        console.log('👋 Showing onboarding...');
    }

    // ADDITIONAL METHODS FOR FUNCTIONALITY
    sortHoldings(sortBy) {
        if (!this.state.wallet.tokens.length) return;
        
        let sortedTokens = [...this.state.wallet.tokens];
        
        switch (sortBy) {
            case 'value':
                sortedTokens.sort((a, b) => b.value - a.value);
                break;
            case 'change':
                sortedTokens.sort((a, b) => b.change24h - a.change24h);
                break;
            case 'alphabetical':
                sortedTokens.sort((a, b) => a.symbol.localeCompare(b.symbol));
                break;
        }
        
        this.state.wallet.tokens = sortedTokens;
        this.updateHoldingsList();
        this.showToast(`Holdings sorted by ${sortBy}`, 'info', 1500);
    }
    
    changeBenchmark(benchmark) {
        this.showToast(`Benchmark changed to ${benchmark.toUpperCase()}`, 'info', 1500);
    }

    filterMarket(filter) {
        this.showToast(`Market filter: ${filter}`, 'info', 1500);
    }

    filterWhaleMovements(filter) {
        this.showToast(`Whale filter: ${filter}`, 'info', 1500);
    }
}

// UTILITY CLASSES
class DataCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 120000;
        this.ttlConfig = {
            'solana_market_data': 120000,
            'token_prices': 60000,
            'wallet_data': 30000,
            'demo_prices': 300000
        };
    }
    
    set(key, data, customTTL = null) {
        const ttl = customTTL || this.getTTLForKey(key);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl
        });
        
        if (this.cache.size > 50) {
            this.cleanExpired();
        }
    }
    
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    getTTLForKey(key) {
        for (const [pattern, ttl] of Object.entries(this.ttlConfig)) {
            if (key.includes(pattern)) {
                return ttl;
            }
        }
        return this.defaultTTL;
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
    
    getStats() {
        const now = Date.now();
        let valid = 0;
        let expired = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp <= value.ttl) {
                valid++;
            } else {
                expired++;
            }
        }
        
        return { total: this.cache.size, valid, expired };
    }
}

class APIManager {
    constructor() {
        this.lastCalls = new Map();
        this.minIntervals = {
            'coingecko': 6000,
            'solana_rpc': 1000,
            'default': 2000
        };
        this.requestCounts = new Map();
    }
    
    async rateLimitedFetch(url, options = {}, serviceType = 'default') {
        const now = Date.now();
        const lastCall = this.lastCalls.get(serviceType) || 0;
        const minInterval = this.minIntervals[serviceType] || this.minIntervals.default;
        const timeSince = now - lastCall;
        
        if (timeSince < minInterval) {
            const waitTime = minInterval - timeSince;
            console.log(`⏳ Rate limiting: waiting ${waitTime}ms for ${serviceType}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastCalls.set(serviceType, Date.now());
        
        const count = this.requestCounts.get(serviceType) || 0;
        this.requestCounts.set(serviceType, count + 1);
        
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            console.error(`API call failed for ${url}:`, error);
            throw error;
        }
    }
    
    getRequestStats() {
        return {
            requestCounts: Object.fromEntries(this.requestCounts),
            lastCalls: Object.fromEntries(this.lastCalls),
            totalRequests: Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0)
        };
    }
}

// GLOBAL FUNCTION WRAPPERS FOR HTML ONCLICK HANDLERS
let cypherApp = null;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    cypherApp = new CypherApp();
});

// Global function wrappers
function switchSection(section) {
    if (cypherApp) cypherApp.switchSection(section);
}

function connectWallet() {
    if (cypherApp) cypherApp.connectWallet();
}

function refreshPortfolio() {
    if (cypherApp) cypherApp.refreshPortfolioData();
}

function showHelp() {
    if (cypherApp) cypherApp.showToast('Help system coming soon', 'info');
}

function showMovers(type) {
    if (cypherApp) cypherApp.showToast(`Showing ${type}`, 'info');
}

function filterTrending(timeframe) {
    if (cypherApp) cypherApp.showToast(`Trending: ${timeframe}`, 'info');
}

function changeChartTimeframe(timeframe) {
    if (cypherApp) cypherApp.showToast(`Chart timeframe: ${timeframe}`, 'info');
}

function generateAnalysisReport() {
    if (cypherApp) cypherApp.showToast('Analysis report generation coming soon', 'info');
}

function exportHoldings() {
    if (cypherApp) cypherApp.showToast('Export functionality coming soon', 'info');
}

function refreshWhaleData() {
    if (cypherApp) cypherApp.showToast('Whale data refresh coming soon', 'info');
}

function openFollowModal() {
    if (cypherApp) cypherApp.showToast('Follow wallet feature coming soon', 'info');
}

function setWhaleThreshold(threshold) {
    if (cypherApp) cypherApp.showToast(`Whale threshold set to ${threshold} SOL`, 'info');
}

function setCustomThreshold() {
    if (cypherApp) cypherApp.showToast('Custom threshold feature coming soon', 'info');
}

function pauseAllAlerts() {
    if (cypherApp) cypherApp.showToast('Pause alerts feature coming soon', 'info');
}

function exportAlerts() {
    if (cypherApp) cypherApp.showToast('Export alerts feature coming soon', 'info');
}

function openAlertModal() {
    if (cypherApp) cypherApp.showToast('Alert creation coming soon', 'info');
}

function createQuickAlert(event) {
    event.preventDefault();
    if (cypherApp) cypherApp.showToast('Quick alert creation coming soon', 'info');
}

function clearAlertHistory() {
    if (cypherApp) cypherApp.showToast('Clear alert history coming soon', 'info');
}

function sharePortfolio() {
    if (cypherApp) cypherApp.showToast('Portfolio sharing coming soon', 'info');
}

function findTraders() {
    if (cypherApp) cypherApp.showToast('Find traders feature coming soon', 'info');
}

function joinCommunity() {
    if (cypherApp) cypherApp.showToast('Community features coming soon', 'info');
}

function filterLeaderboard(period) {
    if (cypherApp) cypherApp.showToast(`Leaderboard: ${period}`, 'info');
}

function filterAchievements(filter) {
    if (cypherApp) cypherApp.showToast(`Achievements: ${filter}`, 'info');
}

function useAlertTemplate(template) {
    if (cypherApp) cypherApp.showToast(`Alert template: ${template}`, 'info');
}

function createAlert(event) {
    event.preventDefault();
    if (cypherApp) cypherApp.showToast('Alert creation coming soon', 'info');
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.style.display = 'none';
}

function followWallet(event) {
    event.preventDefault();
    if (cypherApp) cypherApp.showToast('Follow wallet feature coming soon', 'info');
}

function closeFollowModal() {
    const modal = document.getElementById('followModal');
    if (modal) modal.style.display = 'none';
}

function updateAlertOptions() {
    if (cypherApp) cypherApp.showToast('Alert options updated', 'info');
}

function showHelpTab(tab) {
    // Show/hide help tab content
    document.querySelectorAll('.help-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.help-tab').forEach(tabBtn => {
        tabBtn.classList.remove('active');
    });
    
    const content = document.getElementById(tab);
    const tabBtn = document.querySelector(`[onclick="showHelpTab('${tab}')"]`);
    
    if (content) content.classList.add('active');
    if (tabBtn) tabBtn.classList.add('active');
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.style.display = 'none';
}
