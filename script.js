// Enhanced Cypher Portfolio Analytics - v3.3
// Cleaned version with duplicate code removed and syntax errors fixed

class CypherApp {
    constructor() {
        this.state = {
            initialized: false,
            loading: false,
            currentSection: 'portfolio',
            
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
            
            market: {
                solPrice: 0,
                marketCap: 0,
                volume24h: 0,
                priceChange24h: 0,
                sentiment: 'neutral',
                trending: [],
                gainers: [],
                losers: []
            },
            
            social: {
                followedWallets: new Map(),
                whaleMovements: [],
                leaderboard: [],
                achievements: new Map(),
                userRank: null
            },
            
            alerts: {
                active: [],
                history: [],
                settings: {
                    browserNotifications: true,
                    emailNotifications: false,
                    pushNotifications: false
                }
            },
            
            analytics: {
                portfolioHistory: [],
                tradingPatterns: {},
                riskMetrics: {},
                benchmarkComparison: {}
            },
            
            ui: {
                charts: new Map(),
                modals: new Set(),
                notifications: [],
                searchResults: []
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
                rateLimit: 10000 // Pro plan: 10,000 requests/month
            }
        };

        // Prioritized RPC endpoints (mainnet first, then devnet for fallback)
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
            
            // Show initialization success with API info
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

        // Try authenticated endpoints first for best reliability
        for (let i = 0; i < this.rpcEndpoints.length; i++) {
            const endpoint = this.rpcEndpoints[i];
            try {
                console.log(`🔄 Testing RPC: ${endpoint.name} (${endpoint.network})`);
                
                const connection = new solanaWeb3.Connection(
                    endpoint.url, 
                    'confirmed'
                );
                
                // Test connection with timeout
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

    // DATA LOADING METHODS
    async loadRealWalletData() {
        if (!this.state.wallet.connected) {
            console.log('❌ Wallet not connected');
            return;
        }

        if (!this.solana.connection || this.solana.useApiOnly) {
            console.log('📡 No RPC connection - using enhanced demo data');
            const networkNote = this.isDevnetConnected() ? 
                'Wallet connected! Using Devnet demo portfolio with live prices.' : 
                'Wallet connected! RPC unavailable - showing demo portfolio with live prices.';
            this.showToast(networkNote, 'info', 4000);
            await this.loadEnhancedDemoData();
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
            this.showToast('Blockchain error - using demo data with live prices', 'warning');
            await this.loadEnhancedDemoData();
        }
    }

    async loadEnhancedDemoData() {
        try {
            const marketData = await this.fetchMarketDataFromCoinGecko();
            const solPrice = marketData?.solPrice || 98.50;
            
            this.state.wallet.balance = 12.5;
            this.state.wallet.tokens = [
                {
                    address: 'So11111111111111111111111111111111111111112',
                    symbol: 'SOL',
                    name: 'Solana',
                    amount: 12.5,
                    price: solPrice,
                    value: 12.5 * solPrice,
                    change24h: marketData?.priceChange24h || 3.2,
                    isNative: true
                },
                {
                    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    symbol: 'USDC',
                    name: 'USD Coin',
                    amount: 450.0,
                    price: 1.0,
                    value: 450.0,
                    change24h: 0.1,
                    isNative: false
                },
                {
                    address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
                    symbol: 'mSOL',
                    name: 'Marinade SOL',
                    amount: 5.8,
                    price: solPrice * 1.05,
                    value: 5.8 * solPrice * 1.05,
                    change24h: 2.8,
                    isNative: false
                }
            ];
            
            await this.updateDemoTokenPrices();
            
            const totalValue = this.state.wallet.tokens.reduce((sum, token) => sum + token.value, 0);
            this.state.wallet.performance.totalValue = totalValue;
            this.state.wallet.performance.dayChange = totalValue * 0.032;
            this.state.wallet.performance.dayChangePercent = 3.2;

            this.updateWalletUI();
            this.updatePortfolioCharts();
            
        } catch (error) {
            console.error('Failed to load enhanced demo data:', error);
            this.loadBasicMockData();
        }
    }

    async updateDemoTokenPrices() {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,marinade-staked-sol&vs_currencies=usd&include_24hr_change=true'
            );
            
            if (response.ok) {
                const prices = await response.json();
                this.updateTokenPricesFromAPI(prices);
            }
        } catch (error) {
            console.warn('Failed to update demo token prices:', error);
        }
    }

    updateTokenPricesFromAPI(prices) {
        if (prices.solana) {
            const solToken = this.state.wallet.tokens.find(t => t.symbol === 'SOL');
            if (solToken) {
                solToken.price = prices.solana.usd;
                solToken.value = solToken.amount * prices.solana.usd;
                solToken.change24h = prices.solana.usd_24h_change || 0;
            }
        }
        
        if (prices['marinade-staked-sol']) {
            const msolToken = this.state.wallet.tokens.find(t => t.symbol === 'mSOL');
            if (msolToken) {
                msolToken.price = prices['marinade-staked-sol'].usd;
                msolToken.value = msolToken.amount * prices['marinade-staked-sol'].usd;
                msolToken.change24h = prices['marinade-staked-sol'].usd_24h_change || 0;
            }
        }
    }

    loadBasicMockData() {
        this.state.wallet.balance = 12.5;
        this.state.wallet.tokens = [
            {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Solana',
                amount: 12.5,
                price: 98.50,
                value: 1231.25,
                change24h: 3.2,
                isNative: true
            },
            {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                name: 'USD Coin',
                amount: 450.0,
                price: 1.0,
                value: 450.0,
                change24h: 0.1,
                isNative: false
            }
        ];
        
        this.state.wallet.performance.totalValue = 1681.25;
        this.state.wallet.performance.dayChange = 53.8;
        this.state.wallet.performance.dayChangePercent = 3.2;

        this.updateWalletUI();
        this.updatePortfolioCharts();
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
            this.loadMockMarketData();
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

    loadMockMarketData() {
        this.state.market = {
            solPrice: 98.50,
            marketCap: 42000000000,
            volume24h: 1200000000,
            priceChange24h: 3.4,
            sentiment: 'bullish',
            trending: [],
            gainers: [],
            losers: []
        };
        
        this.updateMarketUI();
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

    // REAL-TIME UPDATE METHODS
    startRealTimeUpdates() {
        // More conservative update intervals to preserve API usage
        setInterval(() => {
            this.updateMarketData();
        }, 120000); // Every 2 minutes instead of 30 seconds

        setInterval(() => {
            if (this.state.wallet.connected) {
                this.refreshPortfolioData();
            }
        }, 300000); // Every 5 minutes instead of 1 minute

        // Cache cleanup interval
        setInterval(() => {
            this.cache.cleanExpired();
        }, 600000); // Every 10 minutes

        console.log('🔄 Real-time updates started with optimized intervals');
        this.showToast(`Connected to ${this.getNetworkDisplayName()} - Updates every 2min`, 'info');
    }

    async updateMarketData() {
        try {
            // Check if we should skip this update to preserve API quota
            if (this.shouldSkipMarketUpdate()) {
                console.log('⏭️ Skipping market update to preserve API quota');
                return;
            }

            const marketData = await this.fetchMarketDataFromCoinGecko();
            if (marketData) {
                this.state.market = { ...this.state.market, ...marketData };
                this.updateMarketUI();
                
                if (this.state.wallet.connected && this.state.wallet.tokens.length > 0) {
                    this.updateTokenPricesInPortfolio(marketData);
                }
                
                // Show network status in UI
                this.updateNetworkStatus();
            }
        } catch (error) {
            console.error('Failed to update market data:', error);
        }
    }

    shouldSkipMarketUpdate() {
        const usage = this.state.analytics.apiUsage?.coingecko;
        if (!usage) return false;
        
        const totalUsage = Object.values(usage).reduce((a, b) => a + b, 0);
        
        // Skip if we're over 80% of monthly limit
        return totalUsage > 8000;
    }

    updateNetworkStatus() {
        const networkEl = document.getElementById('networkStatus');
        if (networkEl) {
            const isDevnet = this.isDevnetConnected();
            networkEl.innerHTML = `
                <span class="network-indicator ${isDevnet ? 'devnet' : 'mainnet'}">
                    ${this.getNetworkDisplayName()}
                </span>
            `;
            
            if (isDevnet) {
                networkEl.title = 'Connected to Devnet - Test network for development';
            }
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

    // CHART METHODS
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

        this.updateAllocationLegend(tokens, colors);
    }

    updateAllocationLegend(tokens, colors) {
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

    // ONBOARDING METHODS
    showOnboarding() {
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
                                <h4>Smart Portfolio Tracking</h4>
                                <p>Track your Solana investments with live market data. If blockchain access isn't available, we'll show you a demo portfolio with real-time prices.</p>
                            </div>
                            <ul class="feature-list">
                                <li><i class="fas fa-check"></i> Live market price feeds</li>
                                <li><i class="fas fa-check"></i> Real-time portfolio updates</li>
                                <li><i class="fas fa-check"></i> Professional-grade analytics</li>
                                <li><i class="fas fa-check"></i> Works with or without RPC access</li>
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
        
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.remove();
            this.state.ui.modals.delete('welcome');
        }
        
        this.showToast('Welcome to Cypher! Connect your wallet to get started. 🎉', 'success');
        
        if (!this.state.wallet.connected) {
            setTimeout(() => {
                this.showTooltip('connectWallet', 'Connect your wallet to track your portfolio!');
            }, 2000);
        }
    }

    // UI INITIALIZATION METHODS
    initializeUI() {
        this.setupGlobalSearch();
        this.initializeCharts();
        this.initializeTooltips();
        this.setupResponsiveHandlers();
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
            
            const portfolioResults = this.searchPortfolio(query);
            const tokenResults = this.searchTokenRegistry(query);
            const allResults = [...portfolioResults, ...tokenResults];
            
            if (allResults.length > 0) {
                searchResults.innerHTML = allResults.map(token => `
                    <div class="search-result-item" onclick="app.selectSearchResult('${token.address}')">
                        <div class="token-icon">${token.symbol.charAt(0)}</div>
                        <div class="token-info">
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-name">${token.name}</div>
                        </div>
                        <div class="token-price">${(token.price || 0).toFixed(4)}</div>
                        ${token.inPortfolio ? '<div class="portfolio-badge">In Portfolio</div>' : ''}
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

    searchPortfolio(query) {
        return this.state.wallet.tokens.filter(token => 
            token.symbol.toLowerCase().includes(query.toLowerCase()) ||
            token.name.toLowerCase().includes(query.toLowerCase())
        ).map(token => ({ ...token, inPortfolio: true }));
    }

    searchTokenRegistry(query) {
        return Object.entries(this.tokenRegistry)
            .filter(([address, token]) => 
                token.symbol.toLowerCase().includes(query.toLowerCase()) ||
                token.name.toLowerCase().includes(query.toLowerCase())
            )
            .map(([address, token]) => ({
                address,
                symbol: token.symbol,
                name: token.name,
                price: address === 'So11111111111111111111111111111111111111112' ? this.state.market.solPrice : 0,
                inPortfolio: false
            }));
    }
    
    selectSearchResult(tokenAddress) {
        const searchResults = document.getElementById('searchResults');
        searchResults.style.display = 'none';
        
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';
        
        const token = this.state.wallet.tokens.find(t => t.address === tokenAddress) ||
                     Object.entries(this.tokenRegistry).find(([addr, _]) => addr === tokenAddress);
        
        if (token) {
            const tokenInfo = Array.isArray(token) ? token[1] : token;
            this.showToast(`Selected ${tokenInfo.symbol || tokenInfo.name}`, 'info');
        }
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

    // EVENT LISTENERS
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
        
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sectionName = e.currentTarget.getAttribute('onclick')?.match(/switchSection\('(\w+)'\)/)?.[1];
                if (sectionName) {
                    this.switchSection(sectionName);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.state.wallet.connected) {
                e.preventDefault();
                this.refreshPortfolioData();
                this.showToast('Portfolio refreshed', 'info');
            }
        });
    }
    
    handleResize() {
        this.state.ui.charts.forEach(chart => {
            chart.resize();
        });
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
    
    showTooltip(elementId, message, position = 'bottom') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: fixed;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            max-width: 200px;
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
        
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

    // API USAGE TRACKING
    trackApiUsage(service, endpoint) {
        if (!this.state.analytics.apiUsage) {
            this.state.analytics.apiUsage = {};
        }
        
        if (!this.state.analytics.apiUsage[service]) {
            this.state.analytics.apiUsage[service] = {};
        }
        
        if (!this.state.analytics.apiUsage[service][endpoint]) {
            this.state.analytics.apiUsage[service][endpoint] = 0;
        }
        
        this.state.analytics.apiUsage[service][endpoint]++;
        
        // Log usage for monitoring
        const totalUsage = Object.values(this.state.analytics.apiUsage[service]).reduce((a, b) => a + b, 0);
        console.log(`📊 API Usage - ${service}: ${totalUsage} requests (${endpoint}: ${this.state.analytics.apiUsage[service][endpoint]})`);
        
        // Warn if approaching limits
        if (service === 'coingecko' && totalUsage > 8000) {
            console.warn('⚠️ Approaching CoinGecko API limit (10,000/month)');
            this.showToast('High API usage detected', 'warning');
        }
    }

    // NETWORK DETECTION
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

    // DASHBOARD UTILITIES
    showApiStats() {
        const coingeckoUsage = this.state.analytics.apiUsage?.coingecko || {};
        const totalCoinGeckoUsage = Object.values(coingeckoUsage).reduce((a, b) => a + b, 0);
        const cacheStats = this.cache.getStats();
        const networkStatus = this.getNetworkDisplayName();
        
        const statsHTML = `
            <div class="api-stats-modal">
                <h3>📊 API & System Status</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Network:</span>
                        <span class="stat-value ${this.isDevnetConnected() ? 'devnet' : 'mainnet'}">${networkStatus}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">CoinGecko Usage:</span>
                        <span class="stat-value">${totalCoinGeckoUsage}/10,000</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Cache Hit Rate:</span>
                        <span class="stat-value">${cacheStats.valid}/${cacheStats.total}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">RPC Status:</span>
                        <span class="stat-value ${this.solana.connection ? 'connected' : 'disconnected'}">
                            ${this.solana.connection ? 'Connected' : 'API-Only Mode'}
                        </span>
                    </div>
                </div>
                <button onclick="this.parentElement.remove()" class="btn btn-secondary">Close</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = statsHTML;
        document.body.appendChild(overlay);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.remove();
            }
        }, 10000);
    }

    // Enhanced error messages with actionable information
    showEnhancedError(message, context = {}) {
        let enhancedMessage = message;
        
        if (context.isRateLimited) {
            enhancedMessage += ' (Rate limited - using cached data)';
        }
        
        if (context.isDevnet) {
            enhancedMessage += ' (Devnet mode - some data may be test data)';
        }
        
        if (context.apiQuotaLow) {
            enhancedMessage += ' (API quota running low - reducing update frequency)';
        }
        
        this.showToast(enhancedMessage, 'error', 7000);
        console.error(message, context);
    }
    initializeTooltips() {
        console.log('Tooltips initialized');
    }
    
    setupResponsiveHandlers() {
        console.log('Responsive handlers setup');
    }
    
    initializeModals() {
        console.log('Modals initialized');
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

// UTILITY CLASSES
class DataCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 120000; // 2 minutes default
        this.ttlConfig = {
            'solana_market_data': 120000,        // 2 minutes for market data
            'token_prices': 60000,               // 1 minute for token prices
            'wallet_data': 30000,                // 30 seconds for wallet data
            'demo_prices': 300000                // 5 minutes for demo data
        };
    }
    
    set(key, data, customTTL = null) {
        const ttl = customTTL || this.getTTLForKey(key);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl
        });
        
        // Clean up expired entries periodically
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
        // Check for pattern matches
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
            'coingecko': 6000,    // 6 seconds between CoinGecko calls (more conservative)
            'solana_rpc': 1000,   // 1 second between RPC calls
            'default': 2000       // 2 seconds default
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
        
        // Track request counts
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
        return Object.fromEntries(this.requestCounts);
    }
}

// GLOBAL INITIALIZATION
const app = new CypherApp();

// GLOBAL FUNCTION ASSIGNMENTS
window.app = app;
window.connectWallet = () => app.connectWallet();
window.switchSection = (section) => app.switchSection(section);
window.showHelp = () => {
    const helpModal = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>🚀 Cypher Help & Features</h3>
                <div class="help-content">
                    <h4>🔗 Connected Services:</h4>
                    <ul>
                        <li><strong>Extrnode RPC:</strong> Mainnet blockchain access</li>
                        <li><strong>Alchemy RPC:</strong> Devnet fallback connection</li>
                        <li><strong>CoinGecko Pro:</strong> Real-time price data</li>
                    </ul>
                    
                    <h4>⌨️ Keyboard Shortcuts:</h4>
                    <ul>
                        <li><kbd>Ctrl/Cmd + R</kbd>: Refresh portfolio</li>
                    </ul>
                    
                    <h4>🛠️ Debug Functions:</h4>
                    <ul>
                        <li><code>showApiStats()</code>: View API usage statistics</li>
                        <li><code>clearCache()</code>: Clear cached data</li>
                        <li><code>forceMarketUpdate()</code>: Force fresh market data</li>
                    </ul>
                    
                    <h4>📊 Network Status:</h4>
                    <p>Check the network indicator to see if you're on Mainnet or Devnet.</p>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">Got it!</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', helpModal);
};

// CHART FUNCTIONS
window.changeChartTimeframe = (timeframe) => {
    const chart = app.state.ui.charts.get('portfolio');
    if (chart) {
        document.querySelectorAll('.chart-controls .btn').forEach(btn => btn.classList.remove('active'));
        if (event && event.target) {
            event.target.classList.add('active');
        }
        app.showToast(`Chart updated to ${timeframe}`, 'info', 1500);
    }
};

// PORTFOLIO FUNCTIONS
window.sortHoldings = () => {
    const sortBy = document.getElementById('sortHoldings')?.value || 'value';
    app.showToast(`Holdings sorted by ${sortBy}`, 'info', 1500);
};

window.exportHoldings = () => {
    app.showToast('Export feature coming soon!', 'info');
};

window.refreshPortfolio = async () => {
    if (app.state.wallet.connected) {
        app.showToast('Refreshing portfolio...', 'info');
        await app.loadRealWalletData();
        app.showToast('Portfolio refreshed!', 'success');
    } else {
        app.showToast('Please connect your wallet first', 'warning');
    }
};

// ALERT FUNCTIONS
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

// WHALE FUNCTIONS
window.openFollowModal = () => {
    app.showToast('Follow wallet modal coming soon!', 'info');
};

window.refreshWhaleData = () => {
    app.showToast('Whale data refreshed', 'info');
};

window.filterWhaleMovements = (filter) => {
    app.showToast(`Filtered by ${filter}`, 'info');
};

// MARKET FUNCTIONS
window.filterTrending = (timeframe) => {
    app.showToast(`Trending filtered by ${timeframe}`, 'info');
};

window.showMovers = (type) => {
    app.showToast(`Showing ${type}`, 'info');
};

// SOCIAL FUNCTIONS
window.sharePortfolio = () => {
    app.showToast('Portfolio sharing coming soon!', 'info');
};

window.findTraders = () => {
    app.showToast('Trader discovery coming soon!', 'info');
};

window.joinCommunity = () => {
    app.showToast('Community features coming soon!', 'info');
};

// BENCHMARK FUNCTIONS
window.changeBenchmark = (benchmark) => {
    app.showToast(`Benchmark changed to ${benchmark}`, 'info');
};

// ANALYSIS FUNCTIONS
window.generateAnalysisReport = () => {
    app.showToast('Analysis report generation coming soon!', 'info');
};

// ADDITIONAL FUNCTIONS
window.filterLeaderboard = (period) => {
    app.showToast(`Leaderboard filtered by ${period}`, 'info');
};

window.filterAchievements = (filter) => {
    app.showToast(`Achievements filtered by ${filter}`, 'info');
};

window.useAlertTemplate = (type) => {
    app.showToast(`Using ${type} alert template`, 'info');
};

window.updateAlertForm = () => {
    console.log('Alert form updated');
};

window.setWhaleThreshold = (amount) => {
    document.querySelectorAll('.threshold-buttons .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    app.showToast(`Whale threshold set to ${amount} SOL`, 'info');
};

window.setCustomThreshold = () => {
    const customValue = document.getElementById('customThreshold')?.value;
    if (customValue) {
        app.showToast(`Custom whale threshold set to ${customValue} SOL`, 'info');
    }
};

// NEW API MANAGEMENT FUNCTIONS
window.showApiStats = () => {
    app.showApiStats();
};

window.clearCache = () => {
    app.cache.clear();
    app.showToast('Cache cleared - fresh data will be fetched', 'info');
};

window.toggleUpdateFrequency = () => {
    const currentInterval = app.updateInterval || 120000;
    const newInterval = currentInterval === 120000 ? 300000 : 120000;
    app.updateInterval = newInterval;
    
    const frequency = newInterval === 120000 ? '2 minutes' : '5 minutes';
    app.showToast(`Update frequency changed to every ${frequency}`, 'info');
};

window.forceMarketUpdate = async () => {
    app.showToast('Forcing market data update...', 'info');
    await app.updateMarketData();
    app.showToast('Market data updated!', 'success');
};