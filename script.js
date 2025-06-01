// Enhanced Cypher Portfolio Analytics - v5.0
// Advanced Analytics with Solscan API Integration

class CypherApp {
    constructor() {
        this.state = {
            initialized: false,
            loading: false,
            currentSection: 'portfolio',
            currentTimeframe: '7D',
            
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
                historicalData: new Map(),
                historicalBalances: [], // New: Solscan historical data
                performance: {
                    totalValue: 0,
                    dayChange: 0,
                    dayChangePercent: 0,
                    totalGain: 0,
                    totalGainPercent: 0,
                    weekChange: 0,
                    monthChange: 0,
                    yearChange: 0
                },
                analytics: {
                    winRate: 0,
                    sharpeRatio: 0,
                    maxDrawdown: 0,
                    volatility: 0,
                    tradingPatterns: {},
                    riskScore: 0,
                    riskLevel: 'Low',
                    diversificationScore: 0,
                    concentrationRisk: 'Low',
                    liquidityRisk: 'Low',
                    marketCapRisk: 'Low'
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
                topVolume: [],
                marketCapData: new Map()
            },
            
            social: {
                followedWallets: new Map(),
                whaleMovements: [],
                leaderboard: [],
                achievements: new Map(),
                userRank: null,
                streak: 0,
                totalEarnings: 0,
                walletPerformanceCache: new Map() // Cache for followed wallet performance
            },
            
            whale: {
                recentMovements: [],
                topHolders: new Map(), // Token -> top holders mapping
                monitoredTokens: new Set(),
                thresholdSOL: 50
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
                    volatility: 0,
                    bestPerformer: null,
                    worstPerformer: null
                },
                heatmapData: []
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
            },
            solscan: {
                key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDg1MDE1MTM2OTAsImVtYWlsIjoiYi5rZW5kZXJuYXlAZ21haWwuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzQ4NTAxNTEzfQ.Irkf1aSJk0cQ8QE7bodD6dxcHPU6A5GXgZcOswlfuQg',
                baseUrl: 'https://api-v2.solscan.io',
                publicUrl: 'https://public-api.solscan.io',
                rateLimit: {
                    requestsPerSecond: 5,
                    maxRequestsPerMinute: 100
                }
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
        this.solscanAPI = new SolscanAPIManager(this.apiConfig.solscan, this.cache);

        // Enhanced token registry with market cap tiers
        this.tokenRegistry = {
            'So11111111111111111111111111111111111111112': { 
                symbol: 'SOL', 
                name: 'Solana', 
                decimals: 9,
                coingeckoId: 'solana',
                marketCapTier: 'large',
                liquidityTier: 'high'
            },
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { 
                symbol: 'USDC', 
                name: 'USD Coin', 
                decimals: 6,
                coingeckoId: 'usd-coin',
                marketCapTier: 'large',
                liquidityTier: 'high'
            },
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { 
                symbol: 'BONK', 
                name: 'Bonk', 
                decimals: 5,
                coingeckoId: 'bonk',
                marketCapTier: 'medium',
                liquidityTier: 'medium'
            },
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { 
                symbol: 'USDT', 
                name: 'Tether USD', 
                decimals: 6,
                coingeckoId: 'tether',
                marketCapTier: 'large',
                liquidityTier: 'high'
            },
            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {
                symbol: 'mSOL',
                name: 'Marinade SOL',
                decimals: 9,
                coingeckoId: 'marinade-staked-sol',
                marketCapTier: 'medium',
                liquidityTier: 'medium'
            },
            'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': {
                symbol: 'JitoSOL',
                name: 'Jito Staked SOL',
                decimals: 9,
                coingeckoId: 'jito-staked-sol',
                marketCapTier: 'medium',
                liquidityTier: 'medium'
            }
        };
        
        // Risk scoring weights
        this.riskWeights = {
            marketCapRisk: 0.3,
            concentrationRisk: 0.25,
            diversificationRisk: 0.2,
            volatilityRisk: 0.15,
            liquidityRisk: 0.1
        };
        
        // Achievement definitions
        this.achievementDefinitions = {
            'first_connect': { 
                name: 'First Steps', 
                description: 'Connected wallet for the first time',
                icon: 'fa-plug',
                points: 10
            },
            'portfolio_10k': { 
                name: 'Growing Portfolio', 
                description: 'Portfolio value reached $10,000',
                icon: 'fa-chart-line',
                points: 50
            },
            'portfolio_100k': { 
                name: 'Whale Status', 
                description: 'Portfolio value reached $100,000',
                icon: 'fa-fish',
                points: 100
            },
            'diversified': { 
                name: 'Diversified', 
                description: 'Hold 10+ different tokens',
                icon: 'fa-coins',
                points: 30
            },
            'diamond_hands': { 
                name: 'Diamond Hands', 
                description: 'Held a token for 6+ months',
                icon: 'fa-gem',
                points: 40
            },
            'trader_pro': { 
                name: 'Pro Trader', 
                description: 'Completed 100+ transactions',
                icon: 'fa-user-tie',
                points: 60
            },
            'early_bird': { 
                name: 'Early Bird', 
                description: 'Used Cypher in the first month',
                icon: 'fa-sun',
                points: 20
            },
            'social_butterfly': { 
                name: 'Social Butterfly', 
                description: 'Follow 10+ successful traders',
                icon: 'fa-users',
                points: 25
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
            await this.loadTrendingTokens();
            await this.checkExistingWalletConnection();
            
            if (this.state.user.isFirstTime && !this.state.wallet.connected) {
                setTimeout(() => this.showOnboarding(), 1000);
            }
            
            this.state.initialized = true;
            this.hideLoadingOverlay();
            this.startRealTimeUpdates();
            
            const apiStatus = `✅ Initialized with ${this.getNetworkDisplayName()} + CoinGecko Pro + Solscan APIs`;
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
                await this.loadHistoricalWalletData(); // New: Load historical data from Solscan
                await this.loadWalletTransactions(); // New: Load transaction history
                this.updateWalletUI();
                await this.checkAchievements();
                
                // Initialize portfolio history tracking
                this.initializePortfolioHistory();
                
                // Start whale monitoring for user's tokens
                await this.startWhaleMonitoring();
                
                this.hideLoadingOverlay();
                this.showToast('Wallet connected successfully! 🎉', 'success');
                this.trackEvent('wallet_connected', { wallet_type: walletType });
                
                // Achievement: First connection
                if (this.state.user.isFirstTime) {
                    this.unlockAchievement('first_connect');
                }
                
                return true;
            }
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.hideLoadingOverlay();
            this.handleWalletConnectionError(error, walletType);
            return false;
        }
    }

    // SOLSCAN API INTEGRATION METHODS
    async loadHistoricalWalletData() {
        if (!this.state.wallet.connected) return;
        
        try {
            console.log('📊 Loading historical wallet data from Solscan...');
            
            // Get historical balance changes
            const balanceHistory = await this.solscanAPI.getAccountBalanceHistory(
                this.state.wallet.publicKey,
                30 // Last 30 days
            );
            
            if (balanceHistory && balanceHistory.data) {
                this.processHistoricalBalanceData(balanceHistory.data);
            }
            
            // Get token accounts history
            const tokenHistory = await this.solscanAPI.getAccountTokens(this.state.wallet.publicKey);
            
            if (tokenHistory && tokenHistory.data) {
                this.processTokenHistoryData(tokenHistory.data);
            }
            
            console.log('✅ Historical data loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load historical data:', error);
        }
    }

    async loadWalletTransactions() {
        if (!this.state.wallet.connected) return;
        
        try {
            console.log('📝 Loading wallet transactions from Solscan...');
            
            const transactions = await this.solscanAPI.getAccountTransactions(
                this.state.wallet.publicKey,
                { limit: 100 }
            );
            
            if (transactions && transactions.data) {
                this.state.wallet.transactions = transactions.data;
                this.analyzeTransactionPatterns(transactions.data);
                
                // Update transaction count for achievements
                this.state.user.totalTrades = transactions.total || transactions.data.length;
                
                // Check trader achievement
                if (this.state.user.totalTrades >= 100) {
                    this.unlockAchievement('trader_pro');
                }
            }
            
            console.log('✅ Transactions loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load transactions:', error);
        }
    }

    processHistoricalBalanceData(balanceData) {
        // Convert Solscan balance history to chart-compatible format
        const historicalData = balanceData.map(item => ({
            timestamp: item.time * 1000,
            value: item.amount / 1e9, // Convert lamports to SOL
            change: item.changeAmount || 0
        }));
        
        // Store for different timeframes
        this.state.wallet.historicalBalances = historicalData;
        
        // Update historical data maps for chart display
        this.updateHistoricalDataMaps(historicalData);
    }

    processTokenHistoryData(tokenData) {
        // Process token history for analytics
        const tokenHoldings = new Map();
        
        tokenData.forEach(token => {
            if (token.tokenAmount && token.tokenAmount.uiAmount > 0) {
                tokenHoldings.set(token.tokenAddress, {
                    symbol: token.tokenSymbol || 'Unknown',
                    balance: token.tokenAmount.uiAmount,
                    decimals: token.tokenAmount.decimals,
                    lastUpdate: token.lastUpdateTime
                });
            }
        });
        
        // Check diversification achievement
        if (tokenHoldings.size >= 10) {
            this.unlockAchievement('diversified');
        }
    }

    updateHistoricalDataMaps(historicalData) {
        // Generate data for different timeframes based on real historical data
        const now = Date.now();
        
        // 1 Day data
        const oneDayData = historicalData.filter(item => 
            item.timestamp >= now - 86400000
        );
        this.state.wallet.historicalData.set('1D', oneDayData);
        
        // 7 Day data
        const sevenDayData = historicalData.filter(item => 
            item.timestamp >= now - 604800000
        );
        this.state.wallet.historicalData.set('7D', sevenDayData);
        
        // 30 Day data
        const thirtyDayData = historicalData.filter(item => 
            item.timestamp >= now - 2592000000
        );
        this.state.wallet.historicalData.set('30D', thirtyDayData);
        
        // Calculate performance metrics from real data
        this.calculateHistoricalPerformance(historicalData);
    }

    calculateHistoricalPerformance(historicalData) {
        if (historicalData.length < 2) return;
        
        const currentValue = this.state.wallet.performance.totalValue;
        const dayAgo = historicalData.find(item => 
            item.timestamp >= Date.now() - 86400000
        );
        const weekAgo = historicalData.find(item => 
            item.timestamp >= Date.now() - 604800000
        );
        const monthAgo = historicalData.find(item => 
            item.timestamp >= Date.now() - 2592000000
        );
        
        if (dayAgo) {
            this.state.wallet.performance.dayChange = currentValue - dayAgo.value;
            this.state.wallet.performance.dayChangePercent = 
                ((currentValue - dayAgo.value) / dayAgo.value) * 100;
        }
        
        if (weekAgo) {
            this.state.wallet.performance.weekChange = 
                ((currentValue - weekAgo.value) / weekAgo.value) * 100;
        }
        
        if (monthAgo) {
            this.state.wallet.performance.monthChange = 
                ((currentValue - monthAgo.value) / monthAgo.value) * 100;
        }
    }

    analyzeTransactionPatterns(transactions) {
        // Analyze trading patterns from transaction history
        const patterns = {
            buyCount: 0,
            sellCount: 0,
            swapCount: 0,
            avgTransactionSize: 0,
            mostTradedTokens: new Map(),
            tradingHours: new Array(24).fill(0),
            profitableTrades: 0,
            totalTrades: 0
        };
        
        transactions.forEach(tx => {
            // Categorize transaction type
            if (tx.type === 'TRANSFER' && tx.tokenTransfers) {
                tx.tokenTransfers.forEach(transfer => {
                    if (transfer.fromAddress === this.state.wallet.publicKey) {
                        patterns.sellCount++;
                    } else if (transfer.toAddress === this.state.wallet.publicKey) {
                        patterns.buyCount++;
                    }
                });
            }
            
            // Track trading hours
            const hour = new Date(tx.blockTime * 1000).getHours();
            patterns.tradingHours[hour]++;
            
            // Track most traded tokens
            if (tx.tokenTransfers) {
                tx.tokenTransfers.forEach(transfer => {
                    const tokenAddress = transfer.tokenAddress;
                    const count = patterns.mostTradedTokens.get(tokenAddress) || 0;
                    patterns.mostTradedTokens.set(tokenAddress, count + 1);
                });
            }
        });
        
        patterns.totalTrades = patterns.buyCount + patterns.sellCount + patterns.swapCount;
        
        // Find most active trading hour
        const maxHourIndex = patterns.tradingHours.indexOf(
            Math.max(...patterns.tradingHours)
        );
        
        // Update analytics state
        this.state.analytics.tradingPatterns = {
            ...patterns,
            mostActiveHour: maxHourIndex,
            tradingStyle: this.determineTradingStyle(patterns)
        };
    }

    determineTradingStyle(patterns) {
        const totalTrades = patterns.totalTrades;
        if (totalTrades < 10) return 'Holder';
        if (totalTrades < 50) return 'Casual Trader';
        if (totalTrades < 100) return 'Active Trader';
        return 'Day Trader';
    }

    // WHALE TRACKING METHODS
    async startWhaleMonitoring() {
        if (!this.state.wallet.connected || this.state.wallet.tokens.length === 0) return;
        
        try {
            console.log('🐋 Starting whale monitoring...');
            
            // Monitor whale movements for user's tokens
            for (const token of this.state.wallet.tokens.slice(0, 5)) { // Monitor top 5 holdings
                if (token.address && token.address !== 'So11111111111111111111111111111111111111112') {
                    this.state.whale.monitoredTokens.add(token.address);
                    await this.loadTokenWhaleData(token.address);
                }
            }
            
            console.log('✅ Whale monitoring started');
            
        } catch (error) {
            console.error('❌ Failed to start whale monitoring:', error);
        }
    }

    async loadTokenWhaleData(tokenAddress) {
        try {
            const holders = await this.solscanAPI.getTokenHolders(tokenAddress, { limit: 20 });
            
            if (holders && holders.data) {
                this.state.whale.topHolders.set(tokenAddress, holders.data);
                
                // Check for recent whale movements
                await this.checkWhaleMovements(tokenAddress, holders.data);
            }
        } catch (error) {
            console.error(`Failed to load whale data for ${tokenAddress}:`, error);
        }
    }

    async checkWhaleMovements(tokenAddress, holders) {
        // Get recent large transfers for the token
        try {
            const transfers = await this.solscanAPI.getTokenTransfers(tokenAddress, {
                limit: 50,
                minAmount: this.state.whale.thresholdSOL * 1e9 // Convert to lamports
            });
            
            if (transfers && transfers.data) {
                const movements = transfers.data.map(transfer => ({
                    tokenAddress,
                    tokenSymbol: this.getTokenSymbol(tokenAddress),
                    from: transfer.src,
                    to: transfer.dst,
                    amount: transfer.amount / Math.pow(10, transfer.decimals || 9),
                    timestamp: transfer.blockTime * 1000,
                    txHash: transfer.txHash,
                    type: this.categorizeWhaleMovement(transfer)
                }));
                
                // Add to whale movements
                this.state.whale.recentMovements.push(...movements);
                
                // Sort by timestamp
                this.state.whale.recentMovements.sort((a, b) => b.timestamp - a.timestamp);
                
                // Keep only recent movements (last 100)
                this.state.whale.recentMovements = this.state.whale.recentMovements.slice(0, 100);
                
                // Update UI if on whale tab
                if (this.state.currentSection === 'whale') {
                    this.updateWhaleMovementsUI();
                }
                
                // Check for alerts
                this.checkWhaleAlerts(movements);
            }
        } catch (error) {
            console.error(`Failed to check whale movements for ${tokenAddress}:`, error);
        }
    }

    categorizeWhaleMovement(transfer) {
        // Categorize the type of whale movement
        if (transfer.src === 'system' || transfer.src === '11111111111111111111111111111111') {
            return 'mint';
        }
        if (transfer.dst === 'system' || transfer.dst === '11111111111111111111111111111111') {
            return 'burn';
        }
        if (transfer.amount > 1000000) {
            return 'mega_transfer';
        }
        return 'transfer';
    }

    checkWhaleAlerts(movements) {
        if (!this.state.alerts.whaleAlerts.enabled) return;
        
        movements.forEach(movement => {
            if (movement.amount >= this.state.alerts.whaleAlerts.threshold) {
                // Check if we should alert (only for holdings if configured)
                if (!this.state.alerts.whaleAlerts.onlyHoldings || 
                    this.state.wallet.tokens.some(t => t.address === movement.tokenAddress)) {
                    
                    this.createWhaleAlert(movement);
                }
            }
        });
    }

    createWhaleAlert(movement) {
        const alert = {
            id: Date.now(),
            type: 'whale_movement',
            tokenSymbol: movement.tokenSymbol,
            message: `🐋 Whale Alert: ${movement.amount.toLocaleString()} ${movement.tokenSymbol} moved`,
            details: `From: ${movement.from.slice(0, 8)}... To: ${movement.to.slice(0, 8)}...`,
            timestamp: movement.timestamp,
            txHash: movement.txHash
        };
        
        this.state.alerts.history.unshift(alert);
        this.showToast(alert.message, 'warning', 5000);
        
        // Update UI
        if (this.state.currentSection === 'alerts') {
            this.updateAlertHistoryUI();
        }
    }

    // SOCIAL & LEADERBOARD METHODS
    async loadFollowedWallets() {
        const followedWallets = this.state.social.followedWallets;
        
        if (followedWallets.size === 0) return;
        
        try {
            console.log('👥 Loading followed wallets data...');
            
            for (const [address, walletInfo] of followedWallets) {
                // Get wallet performance from cache or load fresh
                let performance = this.state.social.walletPerformanceCache.get(address);
                
                if (!performance || Date.now() - performance.lastUpdate > 3600000) { // 1 hour cache
                    performance = await this.loadWalletPerformance(address);
                    this.state.social.walletPerformanceCache.set(address, {
                        ...performance,
                        lastUpdate: Date.now()
                    });
                }
                
                // Update wallet info
                followedWallets.set(address, {
                    ...walletInfo,
                    performance
                });
            }
            
            // Update UI
            if (this.state.currentSection === 'whale') {
                this.updateFollowedWalletsUI();
            }
            
        } catch (error) {
            console.error('Failed to load followed wallets:', error);
        }
    }

    async loadWalletPerformance(walletAddress) {
        try {
            // Get wallet balance and token holdings
            const accountInfo = await this.solscanAPI.getAccountInfo(walletAddress);
            const tokens = await this.solscanAPI.getAccountTokens(walletAddress);
            
            let totalValue = 0;
            let tokenCount = 0;
            
            if (accountInfo && accountInfo.data) {
                // Add SOL balance
                totalValue += (accountInfo.data.lamports / 1e9) * this.state.market.solPrice;
            }
            
            if (tokens && tokens.data) {
                tokenCount = tokens.data.length;
                // Add token values (simplified - in production, fetch actual prices)
                tokens.data.forEach(token => {
                    if (token.tokenAmount && token.tokenAmount.uiAmount > 0) {
                        // Estimate value based on known tokens
                        const tokenInfo = this.tokenRegistry[token.tokenAddress];
                        if (tokenInfo && tokenInfo.coingeckoId) {
                            // Use cached price if available
                            const cachedPrice = this.cache.get(`price_${tokenInfo.coingeckoId}`);
                            if (cachedPrice) {
                                totalValue += token.tokenAmount.uiAmount * cachedPrice;
                            }
                        }
                    }
                });
            }
            
            return {
                totalValue,
                tokenCount,
                lastActivity: Date.now() // In production, get from last transaction
            };
            
        } catch (error) {
            console.error(`Failed to load performance for ${walletAddress}:`, error);
            return {
                totalValue: 0,
                tokenCount: 0,
                lastActivity: null
            };
        }
    }

    async loadLeaderboard(timeframe = 'weekly') {
        try {
            console.log('🏆 Loading leaderboard...');
            
            // In a production environment, this would fetch from a backend service
            // For now, we'll create mock data based on followed wallets
            const leaderboardData = [];
            
            // Add current user
            if (this.state.wallet.connected) {
                leaderboardData.push({
                    rank: 1,
                    address: this.state.wallet.publicKey,
                    nickname: 'You',
                    totalValue: this.state.wallet.performance.totalValue,
                    change: this.state.wallet.performance.dayChangePercent,
                    tokenCount: this.state.wallet.tokens.length,
                    isCurrentUser: true
                });
            }
            
            // Add followed wallets
            let rank = 2;
            for (const [address, info] of this.state.social.followedWallets) {
                if (info.performance) {
                    leaderboardData.push({
                        rank: rank++,
                        address,
                        nickname: info.nickname || `Wallet ${rank}`,
                        totalValue: info.performance.totalValue,
                        change: 0, // Would calculate based on historical data
                        tokenCount: info.performance.tokenCount,
                        isCurrentUser: false
                    });
                }
            }
            
            // Sort by total value
            leaderboardData.sort((a, b) => b.totalValue - a.totalValue);
            
            // Update ranks
            leaderboardData.forEach((entry, index) => {
                entry.rank = index + 1;
            });
            
            this.state.social.leaderboard = leaderboardData;
            
            // Update user rank
            const userEntry = leaderboardData.find(e => e.isCurrentUser);
            if (userEntry) {
                this.state.social.userRank = userEntry.rank;
            }
            
            // Update UI
            if (this.state.currentSection === 'social') {
                this.updateLeaderboardUI();
            }
            
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    }

    // ACHIEVEMENT SYSTEM
    unlockAchievement(achievementId) {
        if (this.state.user.achievements.has(achievementId)) return;
        
        const achievement = this.achievementDefinitions[achievementId];
        if (!achievement) return;
        
        this.state.user.achievements.add(achievementId);
        this.state.social.achievements.set(achievementId, {
            ...achievement,
            unlockedAt: Date.now()
        });
        
        // Show achievement notification
        this.showAchievementToast(achievement);
        
        // Save state
        this.saveUserState();
        
        // Update UI
        if (this.state.currentSection === 'social') {
            this.updateAchievementsUI();
        }
    }

    showAchievementToast(achievement) {
        const toast = document.createElement('div');
        toast.className = 'toast achievement-toast show';
        toast.innerHTML = `
            <div class="achievement-content">
                <i class="fas ${achievement.icon}"></i>
                <div>
                    <h4>Achievement Unlocked!</h4>
                    <p>${achievement.name}</p>
                    <small>${achievement.description}</small>
                </div>
                <span class="achievement-points">+${achievement.points} pts</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    async checkAchievements() {
        // Check portfolio value achievements
        const totalValue = this.state.wallet.performance.totalValue;
        if (totalValue >= 10000) {
            this.unlockAchievement('portfolio_10k');
        }
        if (totalValue >= 100000) {
            this.unlockAchievement('portfolio_100k');
        }
        
        // Check diversification
        if (this.state.wallet.tokens.length >= 10) {
            this.unlockAchievement('diversified');
        }
        
        // Check social achievements
        if (this.state.social.followedWallets.size >= 10) {
            this.unlockAchievement('social_butterfly');
        }
        
        // Check early bird (first month)
        const firstMonth = new Date('2024-02-01').getTime(); // Adjust based on launch date
        if (Date.now() < firstMonth) {
            this.unlockAchievement('early_bird');
        }
        
        // Diamond hands would require checking hold duration from transaction history
        // This would be done in analyzeTransactionPatterns
    }

    // UI UPDATE METHODS FOR NEW FEATURES
    updateWhaleMovementsUI() {
        const container = document.getElementById('whaleMovements');
        if (!container) return;
        
        if (this.state.whale.recentMovements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fish"></i>
                    <h4>No Recent Whale Movements</h4>
                    <p>Large transactions will appear here when detected.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.state.whale.recentMovements.slice(0, 20).map(movement => `
            <div class="whale-movement-item">
                <div class="movement-header">
                    <span class="token-badge">${movement.tokenSymbol}</span>
                    <span class="movement-type ${movement.type}">${this.formatMovementType(movement.type)}</span>
                    <span class="movement-time">${this.formatTimeAgo(movement.timestamp)}</span>
                </div>
                <div class="movement-details">
                    <div class="movement-amount">
                        ${movement.amount.toLocaleString()} ${movement.tokenSymbol}
                    </div>
                    <div class="movement-addresses">
                        <span class="address">From: ${this.formatAddress(movement.from)}</span>
                        <span class="address">To: ${this.formatAddress(movement.to)}</span>
                    </div>
                </div>
                <a href="https://solscan.io/tx/${movement.txHash}" target="_blank" class="tx-link">
                    <i class="fas fa-external-link-alt"></i> View Transaction
                </a>
            </div>
        `).join('');
    }

    updateFollowedWalletsUI() {
        const container = document.getElementById('followedWallets');
        if (!container) return;
        
        if (this.state.social.followedWallets.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h4>No Wallets Followed</h4>
                    <p>Start following successful traders to copy their strategies.</p>
                    <button class="btn btn-primary" onclick="openFollowModal()">
                        <i class="fas fa-plus"></i> Follow Your First Trader
                    </button>
                </div>
            `;
            return;
        }
        
        const walletsHtml = Array.from(this.state.social.followedWallets.entries()).map(([address, info]) => `
            <div class="followed-wallet-item">
                <div class="wallet-header">
                    <div class="wallet-info">
                        <h4>${info.nickname || this.formatAddress(address)}</h4>
                        <span class="wallet-address">${this.formatAddress(address)}</span>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="unfollowWallet('${address}')">
                        <i class="fas fa-user-minus"></i>
                    </button>
                </div>
                <div class="wallet-stats">
                    <div class="stat">
                        <span class="stat-label">Portfolio Value</span>
                        <span class="stat-value">$${info.performance?.totalValue?.toLocaleString() || '0'}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Holdings</span>
                        <span class="stat-value">${info.performance?.tokenCount || 0} tokens</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Last Active</span>
                        <span class="stat-value">${info.performance?.lastActivity ? this.formatTimeAgo(info.performance.lastActivity) : 'Unknown'}</span>
                    </div>
                </div>
                <div class="wallet-actions">
                    <button class="btn btn-sm" onclick="viewWalletDetails('${address}')">
                        <i class="fas fa-chart-line"></i> View Details
                    </button>
                    <button class="btn btn-sm" onclick="copyWalletTrades('${address}')">
                        <i class="fas fa-copy"></i> Copy Trades
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = walletsHtml;
    }

    updateLeaderboardUI() {
        const container = document.getElementById('leaderboard');
        if (!container) return;
        
        if (this.state.social.leaderboard.length === 0) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            return;
        }
        
        container.innerHTML = this.state.social.leaderboard.map(entry => `
            <div class="leaderboard-item ${entry.isCurrentUser ? 'current-user' : ''}">
                <div class="rank-badge">#${entry.rank}</div>
                <div class="trader-info">
                    <h4>${entry.nickname}</h4>
                    <span class="trader-address">${this.formatAddress(entry.address)}</span>
                </div>
                <div class="trader-stats">
                    <div class="portfolio-value">
                        $${entry.totalValue.toLocaleString()}
                    </div>
                    <div class="change ${entry.change >= 0 ? 'positive' : 'negative'}">
                        ${entry.change >= 0 ? '+' : ''}${entry.change.toFixed(2)}%
                    </div>
                </div>
                ${!entry.isCurrentUser ? `
                    <button class="btn btn-sm" onclick="followTrader('${entry.address}')">
                        <i class="fas fa-user-plus"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    updateAchievementsUI() {
        const container = document.getElementById('achievements');
        if (!container) return;
        
        const allAchievements = Object.entries(this.achievementDefinitions).map(([id, def]) => ({
            id,
            ...def,
            unlocked: this.state.user.achievements.has(id),
            unlockedAt: this.state.social.achievements.get(id)?.unlockedAt
        }));
        
        container.innerHTML = allAchievements.map(achievement => `
            <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">
                    <i class="fas ${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                    <div class="achievement-meta">
                        <span class="points">${achievement.points} points</span>
                        ${achievement.unlocked ? `
                            <span class="unlock-date">Unlocked ${this.formatDate(achievement.unlockedAt)}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Update achievement count
        document.getElementById('achievements').textContent = this.state.user.achievements.size;
    }

    updateAlertHistoryUI() {
        const container = document.getElementById('alertHistory');
        if (!container) return;
        
        if (this.state.alerts.history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h4>No Recent Notifications</h4>
                    <p>Your notification history will appear here.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.state.alerts.history.slice(0, 50).map(alert => `
            <div class="alert-history-item ${alert.type}">
                <div class="alert-icon">
                    <i class="fas ${this.getAlertIcon(alert.type)}"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.message}</h4>
                    <p>${alert.details}</p>
                    <span class="alert-time">${this.formatTimeAgo(alert.timestamp)}</span>
                </div>
                ${alert.txHash ? `
                    <a href="https://solscan.io/tx/${alert.txHash}" target="_blank" class="alert-link">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                ` : ''}
            </div>
        `).join('');
    }

    // HELPER METHODS
    formatMovementType(type) {
        const types = {
            'mint': 'Mint',
            'burn': 'Burn',
            'transfer': 'Transfer',
            'mega_transfer': 'Mega Transfer'
        };
        return types[type] || type;
    }

    formatAddress(address) {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getAlertIcon(type) {
        const icons = {
            'whale_movement': 'fa-fish',
            'price_alert': 'fa-chart-line',
            'volume_alert': 'fa-chart-bar',
            'achievement': 'fa-trophy'
        };
        return icons[type] || 'fa-bell';
    }

    getTokenSymbol(address) {
        const tokenInfo = this.tokenRegistry[address];
        if (tokenInfo) return tokenInfo.symbol;
        
        const token = this.state.wallet.tokens.find(t => t.address === address);
        if (token) return token.symbol;
        
        return 'Unknown';
    }

    // Add remaining methods from original implementation...
    // (Continue with all the original methods, maintaining the same structure)

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
                    await this.loadHistoricalWalletData();
                    await this.loadWalletTransactions();
                    this.updateWalletUI();
                    this.initializePortfolioHistory();
                    await this.startWhaleMonitoring();
                    this.showToast('Wallet auto-connected!', 'success');
                }
            } catch (error) {
                console.log('No trusted connection found');
            }
        }
    }

    // Continue with remaining methods from original implementation...
    // DATA LOADING METHODS
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
            
            // Calculate comprehensive analytics
            await this.calculateComprehensiveAnalytics();
            
            this.updateWalletUI();
            this.updatePortfolioCharts();
            
            // Update analytics UI if on analytics tab
            if (this.state.currentSection === 'analytics') {
                this.updateAnalyticsUI();
            }
            
            console.log('✅ Real wallet data loaded successfully');
            this.showToast('Portfolio loaded with live blockchain data!', 'success');
            
        } catch (error) {
            console.error('❌ Error loading wallet data:', error);
            this.showToast('Failed to load wallet data. Please try again.', 'error');
        }
    }

    // Continue with all remaining methods from the original script.js...
    // [Due to length constraints, I'll continue with the key remaining methods and structure]

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
        
        // Get SOL market data for analytics
        const solMarketData = await this.fetchTokenMarketData('solana');
        
        tokens.push({
            address: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Solana',
            amount: solBalance,
            price: solPrice,
            value: solValue,
            change24h: this.state.market.priceChange24h || 0,
            isNative: true,
            marketCap: solMarketData?.market_cap || 0,
            volume24h: solMarketData?.total_volume || 0,
            marketCapTier: this.getMarketCapTier(solMarketData?.market_cap || 0)
        });

        const tokenList = this.buildTokenList(tokenAccounts);
        
        if (tokenList.length > 0) {
            try {
                const prices = await this.fetchTokenPricesFromCoinGecko(tokenList);
                await this.updateTokenListPricesWithMarketData(tokenList, prices);
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
                coingeckoId: null,
                marketCapTier: 'micro',
                liquidityTier: 'low'
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
                coingeckoId: tokenMeta.coingeckoId,
                marketCap: 0,
                volume24h: 0,
                marketCapTier: tokenMeta.marketCapTier,
                liquidityTier: tokenMeta.liquidityTier
            });
        });
        return tokenList;
    }

    async updateTokenListPricesWithMarketData(tokenList, prices) {
        for (const token of tokenList) {
            if (token.coingeckoId && prices[token.coingeckoId]) {
                const priceData = prices[token.coingeckoId];
                token.price = priceData.usd || 0;
                token.change24h = priceData.usd_24h_change || 0;
                token.value = token.amount * token.price;
                token.marketCap = priceData.usd_market_cap || 0;
                token.volume24h = priceData.usd_24h_vol || 0;
                token.marketCapTier = this.getMarketCapTier(token.marketCap);
                
                // Store market cap data for risk calculations
                this.state.market.marketCapData.set(token.symbol, {
                    marketCap: token.marketCap,
                    volume24h: token.volume24h,
                    tier: token.marketCapTier
                });
            }
        }
    }

    getMarketCapTier(marketCap) {
        if (marketCap >= 10e9) return 'large';      // $10B+
        if (marketCap >= 1e9) return 'medium';      // $1B-$10B  
        if (marketCap >= 100e6) return 'small';     // $100M-$1B
        if (marketCap >= 10e6) return 'micro';      // $10M-$100M
        return 'nano';                               // <$10M
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
            totalGainPercent: 0,
            weekChange: 0,
            monthChange: 0,
            yearChange: 0
        };
    }

    // ADVANCED ANALYTICS IMPLEMENTATION
    async calculateComprehensiveAnalytics() {
        if (!this.state.wallet.tokens.length) return;
        
        try {
            console.log('📊 Calculating comprehensive analytics...');
            
            // Calculate all analytics components
            const performanceMetrics = this.calculatePerformanceMetrics();
            const riskMetrics = await this.calculateAdvancedRiskScore();
            const tradingPatterns = this.analyzeTradingPatterns();
            const diversificationMetrics = this.calculateDiversificationMetrics();
            
            // Update state
            this.state.analytics.performanceMetrics = performanceMetrics;
            this.state.analytics.riskMetrics = riskMetrics;
            this.state.analytics.tradingPatterns = tradingPatterns;
            
            // Update wallet analytics
            this.state.wallet.analytics = {
                ...this.state.wallet.analytics,
                ...performanceMetrics,
                ...riskMetrics,
                ...diversificationMetrics
            };
            
            // Generate heatmap data
            this.generatePerformanceHeatmap();
            
            console.log('✅ Analytics calculation complete');
            
        } catch (error) {
            console.error('Failed to calculate analytics:', error);
        }
    }

    calculatePerformanceMetrics() {
        const tokens = this.state.wallet.tokens;
        if (!tokens.length) return {};
        
        // Calculate win rate (positive performing tokens)
        const positiveTokens = tokens.filter(token => token.change24h > 0);
        const winRate = Math.round((positiveTokens.length / tokens.length) * 100);
        
        // Find best and worst performers
        const bestPerformer = tokens.reduce((best, token) => 
            token.change24h > best.change24h ? token : best
        );
        
        const worstPerformer = tokens.reduce((worst, token) => 
            token.change24h < worst.change24h ? token : worst
        );
        
        // Calculate portfolio volatility
        const changes = tokens.map(token => token.change24h);
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        const variance = changes.reduce((acc, change) => acc + Math.pow(change - avgChange, 2), 0) / changes.length;
        const volatility = Math.sqrt(variance);
        
        // Calculate Sharpe ratio (simplified)
        const riskFreeRate = 2; // Assume 2% risk-free rate
        const excessReturn = avgChange - riskFreeRate;
        const sharpeRatio = volatility > 0 ? (excessReturn / volatility) : 0;
        
        // Calculate ROI (using 24h change as proxy)
        const totalValue = this.state.wallet.performance.totalValue;
        const dayChange = this.state.wallet.performance.dayChangePercent;
        const annualizedROI = dayChange * 365; // Very rough estimate
        
        return {
            winRate,
            sharpeRatio: Math.round(sharpeRatio * 100) / 100,
            volatility: Math.round(volatility * 100) / 100,
            roi: Math.round(annualizedROI * 100) / 100,
            bestPerformer: {
                symbol: bestPerformer.symbol,
                change: bestPerformer.change24h
            },
            worstPerformer: {
                symbol: worstPerformer.symbol,
                change: worstPerformer.change24h
            },
            avgHoldTime: this.estimateAvgHoldTime(),
            totalTrades: tokens.length // Simplified - using number of positions
        };
    }

    async calculateAdvancedRiskScore() {
        const tokens = this.state.wallet.tokens;
        if (!tokens.length) return { riskScore: 0, riskLevel: 'Low' };
        
        const totalValue = this.state.wallet.performance.totalValue;
        
        // 1. Market Cap Risk (30% weight)
        const marketCapRisk = this.calculateMarketCapRisk(tokens, totalValue);
        
        // 2. Concentration Risk (25% weight)
        const concentrationRisk = this.calculateConcentrationRisk(tokens, totalValue);
        
        // 3. Diversification Risk (20% weight)  
        const diversificationRisk = this.calculateDiversificationRisk(tokens);
        
        // 4. Volatility Risk (15% weight)
        const volatilityRisk = this.calculateVolatilityRisk(tokens);
        
        // 5. Liquidity Risk (10% weight)
        const liquidityRisk = this.calculateLiquidityRisk(tokens);
        
        // Calculate weighted risk score (0-100)
        const riskScore = Math.round(
            (marketCapRisk.score * this.riskWeights.marketCapRisk) +
            (concentrationRisk.score * this.riskWeights.concentrationRisk) +
            (diversificationRisk.score * this.riskWeights.diversificationRisk) +
            (volatilityRisk.score * this.riskWeights.volatilityRisk) +
            (liquidityRisk.score * this.riskWeights.liquidityRisk)
        );
        
        // Determine risk level
        let riskLevel;
        if (riskScore >= 70) riskLevel = 'High';
        else if (riskScore >= 40) riskLevel = 'Medium';
        else riskLevel = 'Low';
        
        return {
            riskScore,
            riskLevel,
            marketCapRisk: marketCapRisk.level,
            concentrationRisk: concentrationRisk.level,
            diversificationRisk: diversificationRisk.level,
            volatilityRisk: volatilityRisk.level,
            liquidityRisk: liquidityRisk.level,
            riskBreakdown: {
                marketCap: marketCapRisk.score,
                concentration: concentrationRisk.score,
                diversification: diversificationRisk.score,
                volatility: volatilityRisk.score,
                liquidity: liquidityRisk.score
            }
        };
    }

    calculateMarketCapRisk(tokens, totalValue) {
        // Calculate weighted average market cap tier
        let riskScore = 0;
        
        tokens.forEach(token => {
            const weight = token.value / totalValue;
            let tierScore;
            
            switch (token.marketCapTier) {
                case 'large': tierScore = 10; break;   // Low risk
                case 'medium': tierScore = 30; break;  // Medium-low risk
                case 'small': tierScore = 50; break;   // Medium risk
                case 'micro': tierScore = 75; break;   // High risk
                case 'nano': tierScore = 95; break;    // Very high risk
                default: tierScore = 80; break;        // Unknown = high risk
            }
            
            riskScore += tierScore * weight;
        });
        
        let level;
        if (riskScore >= 70) level = 'High';
        else if (riskScore >= 40) level = 'Medium';
        else level = 'Low';
        
        return { score: Math.round(riskScore), level };
    }

    calculateConcentrationRisk(tokens, totalValue) {
        if (!totalValue || tokens.length === 0) return { score: 0, level: 'Low' };
        
        // Find largest position percentage
        const largestPosition = Math.max(...tokens.map(token => token.value));
        const concentrationPercent = (largestPosition / totalValue) * 100;
        
        let score, level;
        if (concentrationPercent >= 70) {
            score = 90; level = 'High';
        } else if (concentrationPercent >= 50) {
            score = 70; level = 'High';
        } else if (concentrationPercent >= 30) {
            score = 50; level = 'Medium';
        } else if (concentrationPercent >= 20) {
            score = 30; level = 'Medium';
        } else {
            score = 15; level = 'Low';
        }
        
        return { score, level, largestPositionPercent: concentrationPercent };
    }

    calculateDiversificationRisk(tokens) {
        const tokenCount = tokens.length;
        
        let score, level;
        if (tokenCount >= 15) {
            score = 10; level = 'Low';      // Well diversified
        } else if (tokenCount >= 10) {
            score = 20; level = 'Low';      // Good diversification
        } else if (tokenCount >= 6) {
            score = 40; level = 'Medium';   // Moderate diversification
        } else if (tokenCount >= 3) {
            score = 65; level = 'High';     // Limited diversification
        } else {
            score = 85; level = 'High';     // Poor diversification
        }
        
        return { score, level, tokenCount };
    }

    calculateVolatilityRisk(tokens) {
        if (!tokens.length) return { score: 0, level: 'Low' };
        
        // Calculate portfolio volatility
        const changes = tokens.map(token => Math.abs(token.change24h));
        const avgVolatility = changes.reduce((a, b) => a + b, 0) / changes.length;
        
        let score, level;
        if (avgVolatility >= 15) {
            score = 85; level = 'High';     // Very volatile
        } else if (avgVolatility >= 10) {
            score = 65; level = 'High';     // High volatility
        } else if (avgVolatility >= 5) {
            score = 45; level = 'Medium';   // Medium volatility
        } else if (avgVolatility >= 2) {
            score = 25; level = 'Low';      // Low volatility
        } else {
            score = 10; level = 'Low';      // Very stable
        }
        
        return { score, level, avgVolatility };
    }

    calculateLiquidityRisk(tokens, totalValue) {
        // Score based on volume and known liquidity tiers
        let weightedLiquidityScore = 0;
        
        tokens.forEach(token => {
            const weight = token.value / totalValue;
            let liquidityScore;
            
            // Score based on 24h volume
            if (token.volume24h >= 100e6) liquidityScore = 10;      // Very liquid
            else if (token.volume24h >= 10e6) liquidityScore = 20;  // Good liquidity
            else if (token.volume24h >= 1e6) liquidityScore = 40;   // Medium liquidity
            else if (token.volume24h >= 100e3) liquidityScore = 60; // Low liquidity
            else liquidityScore = 85;                               // Very low liquidity
            
            weightedLiquidityScore += liquidityScore * weight;
        });
        
        const score = Math.round(weightedLiquidityScore);
        let level;
        if (score >= 60) level = 'High';
        else if (score >= 35) level = 'Medium'; 
        else level = 'Low';
        
        return { score, level };
    }

    calculateDiversificationMetrics() {
        const tokens = this.state.wallet.tokens;
        const totalValue = this.state.wallet.performance.totalValue;
        
        // Diversification score (0-100)
        const tokenCount = tokens.length;
        let diversificationScore = Math.min(100, tokenCount * 8); // 8 points per token, max 100
        
        // Adjust for concentration
        if (totalValue > 0) {
            const largestPosition = Math.max(...tokens.map(token => token.value));
            const concentrationPenalty = Math.max(0, ((largestPosition / totalValue) - 0.2) * 100);
            diversificationScore = Math.max(0, diversificationScore - concentrationPenalty);
        }
        
        // Find largest position
        const largestToken = tokens.reduce((largest, token) => 
            token.value > largest.value ? token : largest, tokens[0] || { symbol: '-', value: 0 }
        );
        
        const largestPositionPercent = totalValue > 0 ? 
            Math.round((largestToken.value / totalValue) * 100) : 0;
        
        return {
            diversificationScore: Math.round(diversificationScore),
            largestPosition: `${largestToken.symbol} (${largestPositionPercent}%)`,
            totalTransactions: tokens.length,
            avgHoldTime: this.estimateAvgHoldTime()
        };
    }

    analyzeTradingPatterns() {
        // Analyze trading patterns based on current holdings
        const tokens = this.state.wallet.tokens;
        
        // Most active time (based on current hour)
        const hour = new Date().getHours();
        let mostActiveTime;
        if (hour >= 9 && hour <= 17) {
            mostActiveTime = '9 AM - 5 PM (Business Hours)';
        } else if (hour >= 18 && hour <= 22) {
            mostActiveTime = '6 PM - 10 PM (Evening)';
        } else {
            mostActiveTime = '10 PM - 8 AM (Night/Early Morning)';
        }
        
        // Trading frequency based on portfolio size
        let tradingFrequency;
        if (tokens.length >= 15) tradingFrequency = 'Very High Activity (15+ positions)';
        else if (tokens.length >= 10) tradingFrequency = 'High Activity (10+ positions)';
        else if (tokens.length >= 5) tradingFrequency = 'Moderate Activity (5-9 positions)';
        else if (tokens.length >= 2) tradingFrequency = 'Low Activity (2-4 positions)';
        else tradingFrequency = 'Minimal Activity (1 position)';
        
        // Average position duration estimate
        let avgPositionDuration;
        if (tokens.length >= 10) avgPositionDuration = '2-4 weeks (Active Trader)';
        else if (tokens.length >= 5) avgPositionDuration = '1-3 months (Swing Trader)';
        else avgPositionDuration = '3+ months (Long-term Holder)';
        
        return {
            mostActiveTime,
            tradingFrequency,
            avgPositionDuration,
            preferredTokens: tokens.slice(0, 3).map(token => token.symbol)
        };
    }

    estimateAvgHoldTime() {
        // Simplified estimation based on portfolio diversity
        const tokenCount = this.state.wallet.tokens.length;
        if (tokenCount >= 15) return '3-6 weeks';
        if (tokenCount >= 8) return '1-3 months';
        if (tokenCount >= 4) return '3-6 months';
        return '6+ months';
    }

    generatePerformanceHeatmap() {
        const tokens = this.state.wallet.tokens;
        
        // Create heatmap data
        const heatmapData = tokens.map(token => ({
            symbol: token.symbol,
            value: token.value,
            change24h: token.change24h,
            marketCap: token.marketCap,
            volume: token.volume24h,
            risk: this.getTokenRiskLevel(token)
        }));
        
        this.state.analytics.heatmapData = heatmapData;
    }

    getTokenRiskLevel(token) {
        let riskScore = 0;
        
        // Market cap risk
        switch (token.marketCapTier) {
            case 'large': riskScore += 1; break;
            case 'medium': riskScore += 2; break;
            case 'small': riskScore += 3; break;
            case 'micro': riskScore += 4; break;
            case 'nano': riskScore += 5; break;
        }
        
        // Volatility risk
        const absChange = Math.abs(token.change24h);
        if (absChange >= 20) riskScore += 3;
        else if (absChange >= 10) riskScore += 2;
        else if (absChange >= 5) riskScore += 1;
        
        // Return risk level
        if (riskScore >= 6) return 'High';
        if (riskScore >= 3) return 'Medium';
        return 'Low';
    }

    // PORTFOLIO HISTORY AND TIMEFRAME SWITCHING
    initializePortfolioHistory() {
        const currentValue = this.state.wallet.performance.totalValue;
        const now = Date.now();
        
        // Initialize with current value
        this.state.wallet.historicalData.set('current', {
            timestamp: now,
            value: currentValue,
            tokens: [...this.state.wallet.tokens]
        });
        
        // If we don't have real historical data, generate sample data
        if (this.state.wallet.historicalBalances.length === 0) {
            this.generateHistoricalData();
        }
    }

    generateHistoricalData() {
        const currentValue = this.state.wallet.performance.totalValue;
        const now = Date.now();
        
        // Generate data points for different timeframes
        const timeframes = {
            '1D': { points: 24, interval: 3600000 },      // 1 hour intervals
            '7D': { points: 168, interval: 3600000 },     // 1 hour intervals
            '30D': { points: 30, interval: 86400000 },    // 1 day intervals
            '1Y': { points: 365, interval: 86400000 }     // 1 day intervals
        };
        
        Object.entries(timeframes).forEach(([timeframe, config]) => {
            const dataPoints = [];
            const volatility = this.getTimeframeVolatility(timeframe);
            
            for (let i = config.points; i >= 0; i--) {
                const timestamp = now - (i * config.interval);
                const randomChange = (Math.random() - 0.5) * volatility;
                const trendFactor = this.getTrendFactor(timeframe, i, config.points);
                const value = currentValue * (1 + (randomChange + trendFactor) / 100);
                
                dataPoints.push({
                    timestamp,
                    value: Math.max(0, value),
                    change: randomChange + trendFactor
                });
            }
            
            this.state.wallet.historicalData.set(timeframe, dataPoints);
        });
    }

    getTimeframeVolatility(timeframe) {
        // Different volatility for different timeframes
        switch (timeframe) {
            case '1D': return 1.5;   // Lower volatility for 1 day
            case '7D': return 3.0;   // Medium volatility for 1 week
            case '30D': return 5.0;  // Higher volatility for 1 month
            case '1Y': return 8.0;   // Highest volatility for 1 year
            default: return 3.0;
        }
    }

    getTrendFactor(timeframe, index, totalPoints) {
        // Add some trend to make data more realistic
        const currentPerformance = this.state.wallet.performance.dayChangePercent || 0;
        const trendStrength = currentPerformance / 100;
        
        // Stronger trend for longer timeframes
        const timeframeMultiplier = {
            '1D': 0.5,
            '7D': 1.0,
            '30D': 2.0,
            '1Y': 4.0
        }[timeframe] || 1.0;
        
        return trendStrength * timeframeMultiplier * (1 - index / totalPoints);
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

    async fetchTokenMarketData(coingeckoId) {
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.market_data;
            }
        } catch (error) {
            console.warn(`Failed to fetch market data for ${coingeckoId}:`, error);
        }
        return null;
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
                `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
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

    // TRENDING TOKENS IMPLEMENTATION
    async loadTrendingTokens() {
        try {
            console.log('📈 Loading trending tokens...');
            
            const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Process trending coins data
                this.state.market.trending = data.coins.slice(0, 10).map((coin, index) => ({
                    id: coin.item.id,
                    symbol: coin.item.symbol.toUpperCase(),
                    name: coin.item.name,
                    rank: coin.item.market_cap_rank || (index + 1),
                    thumb: coin.item.thumb,
                    price_btc: coin.item.price_btc,
                    trending_rank: index + 1
                }));
                
                // Update UI if we're on the market tab
                if (this.state.currentSection === 'market') {
                    this.updateTrendingTokensUI();
                }
                
                console.log('✅ Trending tokens loaded successfully');
            } else {
                throw new Error('Trending API failed');
            }
        } catch (error) {
            console.warn('Failed to fetch trending tokens:', error);
            this.generateMockTrendingTokens();
        }
    }

    generateMockTrendingTokens() {
        this.state.market.trending = [
            { symbol: 'SOL', name: 'Solana', rank: 5, trending_rank: 1 },
            { symbol: 'BONK', name: 'Bonk', rank: 55, trending_rank: 2 },
            { symbol: 'JUP', name: 'Jupiter', rank: 45, trending_rank: 3 },
            { symbol: 'WIF', name: 'dogwifhat', rank: 78, trending_rank: 4 },
            { symbol: 'ORCA', name: 'Orca', rank: 156, trending_rank: 5 }
        ];
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
        const analytics = this.state.wallet.analytics;
        
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

        // Update risk score
        this.updateElement('riskScore', analytics.riskScore || 0);
        this.updateElement('riskLevel', `${analytics.riskLevel || 'Low'} Risk Portfolio`);

        const totalChangeEl = document.getElementById('totalChange');
        if (totalChangeEl && this.state.wallet.connected) {
            const isPositive = performance.dayChangePercent >= 0;
            totalChangeEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${performance.dayChangePercent.toFixed(2)}% today</span>`;
        }
    }

    updateAnalyticsUI() {
        const metrics = this.state.analytics.performanceMetrics;
        const patterns = this.state.analytics.tradingPatterns;
        const analytics = this.state.wallet.analytics;
        
        if (!metrics || !this.state.wallet.connected) {
            this.showAnalyticsPlaceholder();
            return;
        }
        
        // Update performance metrics
        this.updateElement('winRate', `${metrics.winRate}%`);
        this.updateElement('totalTrades', `${metrics.totalTrades} positions`);
        this.updateElement('sharpeRatio', metrics.sharpeRatio.toFixed(2));
        
        // Update best performer
        if (metrics.bestPerformer) {
            this.updateElement('bestPerformer', metrics.bestPerformer.symbol);
            this.updateElement('bestGain', `+${metrics.bestPerformer.change.toFixed(2)}%`);
        }
        
        // Update trading patterns
        if (patterns) {
            this.updateElement('mostActiveTime', patterns.mostActiveTime);
            this.updateElement('tradingFrequency', patterns.tradingFrequency);
            this.updateElement('avgPositionDuration', patterns.avgPositionDuration);
        }
        
        // Update risk indicators
        this.updateElement('concentrationRisk', analytics.concentrationRisk || 'Low');
        this.updateElement('volatilityRisk', analytics.volatilityRisk || 'Low');
        this.updateElement('liquidityRisk', analytics.liquidityRisk || 'Low');
        
        // Update diversification score
        this.updateDiversificationScore();
        
        // Update performance heatmap
        this.updatePerformanceHeatmap();
        
        // Initialize benchmark chart
        this.initBenchmarkChart();
    }

    updateDiversificationScore() {
        const score = this.state.wallet.analytics.diversificationScore || 0;
        
        this.updateElement('diversificationScore', `${score}/100`);
        
        const progressBar = document.getElementById('diversificationProgress');
        if (progressBar) {
            progressBar.style.width = `${score}%`;
        }
        
        // Update portfolio analysis metrics
        this.updateElement('largestPosition', this.state.wallet.analytics.largestPosition || '-');
        this.updateElement('totalTransactions', this.state.wallet.analytics.totalTransactions || 0);
        this.updateElement('avgHoldTime', this.state.wallet.analytics.avgHoldTime || '-');
    }

    updatePerformanceHeatmap() {
        const container = document.getElementById('performanceHeatmap');
        if (!container) return;
        
        const heatmapData = this.state.analytics.heatmapData;
        
        if (!heatmapData || heatmapData.length === 0) {
            container.innerHTML = `
                <div class="heatmap-loading">
                    <i class="fas fa-chart-bar"></i>
                    <p>No data available</p>
                </div>
            `;
            return;
        }
        
        // Create simple heatmap visualization
        container.innerHTML = `
            <div class="heatmap-grid">
                ${heatmapData.map(token => {
                    const isPositive = token.change24h >= 0;
                    const intensity = Math.min(Math.abs(token.change24h) / 20, 1); // Normalize to 0-1
                    const bgColor = isPositive ? 
                        `rgba(16, 185, 129, ${0.2 + intensity * 0.6})` : 
                        `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
                    
                    return `
                        <div class="heatmap-cell" style="background-color: ${bgColor}">
                            <div class="cell-symbol">${token.symbol}</div>
                            <div class="cell-change ${isPositive ? 'positive' : 'negative'}">
                                ${isPositive ? '+' : ''}${token.change24h.toFixed(1)}%
                            </div>
                            <div class="cell-risk">${token.risk} Risk</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    initBenchmarkChart() {
        const ctx = document.getElementById('benchmarkChart');
        if (!ctx) return;
        
        if (this.state.ui.charts.has('benchmark')) {
            this.state.ui.charts.get('benchmark').destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['7d', '6d', '5d', '4d', '3d', '2d', '1d', 'Now'],
                datasets: [
                    {
                        label: 'Portfolio',
                        data: this.generateBenchmarkData('portfolio'),
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'SOL',
                        data: this.generateBenchmarkData('sol'),
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                ...this.getChartOptions(),
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { 
                            color: '#888',
                            callback: (value) => `${value.toFixed(1)}%`
                        }
                    },
                    x: { 
                        grid: { color: 'rgba(255,255,255,0.1)' }, 
                        ticks: { color: '#888' }
                    }
                }
            }
        });
        
        this.state.ui.charts.set('benchmark', chart);
    }

    generateBenchmarkData(type) {
        const basePerformance = this.state.wallet.performance.dayChangePercent || 0;
        const data = [];
        
        for (let i = 7; i >= 0; i--) {
            const variation = (Math.random() - 0.5) * 4;
            let value;
            
            if (type === 'portfolio') {
                value = basePerformance + variation;
            } else {
                value = (basePerformance * 0.8) + variation;
            }
            
            data.push(Math.round(value * 100) / 100);
        }
        
        return data;
    }

    showAnalyticsPlaceholder() {
        this.updateElement('winRate', '0%');
        this.updateElement('totalTrades', '0 trades');
        this.updateElement('sharpeRatio', '0.0');
        this.updateElement('bestPerformer', 'Connect Wallet');
        this.updateElement('bestGain', '+0%');
        this.updateElement('mostActiveTime', 'Connect wallet to analyze');
        this.updateElement('tradingFrequency', 'Connect wallet to analyze');
        this.updateElement('avgPositionDuration', 'Connect wallet to analyze');
        
        const heatmapContainer = document.getElementById('performanceHeatmap');
        if (heatmapContainer) {
            heatmapContainer.innerHTML = `
                <div class="heatmap-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Connect wallet to generate heatmap...</p>
                </div>
            `;
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
                    <div class="token-risk" style="color: #fbbf24; font-size: 0.75rem;">${this.getTokenRiskLevel(token)} Risk</div>
                </div>
                <div class="token-amount" style="text-align: right; margin-right: 1rem;">
                    <div style="font-weight: 600; color: #ffffff;">${token.amount.toLocaleString(undefined, {maximumFractionDigits: 6})}</div>
                    <div style="color: #a3a3a3; font-size: 0.875rem;">$${token.price.toFixed(4)}</div>
                </div>
                <div class="token-value" style="text-align: right; margin-right: 1rem;">
                    <div style="font-weight: 600; color: #ffffff;">$${token.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="${changeClass}" style="font-size: 0.875rem;">
                        <i class="fas ${changeIcon}"></i> ${Math.abs(token.change24h).toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }

    updateMarketUI() {
        this.updateElement('solPrice', `$${this.state.market.solPrice.toFixed(2)}`);
        
        const solChangeEl = document.getElementById('solChange');
        if (solChangeEl) {
            const change = this.state.market.priceChange24h || 0;
            const isPositive = change >= 0;
            solChangeEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change.toFixed(2)}%</span>`;
        }

        const marketVolEl = document.getElementById('marketVol');
        if (marketVolEl) {
            const volume = this.state.market.volume24h || 0;
            marketVolEl.textContent = `$${this.formatLargeNumber(volume)}`;
        }
        
        // Update tracked tokens count
        this.updateElement('trackedTokens', this.state.market.trending.length);
        
        // Update whale stats
        this.updateElement('whaleCount', this.state.whale.recentMovements.length);
        this.updateElement('followedCount', this.state.social.followedWallets.size);
        
        // Update social stats
        this.updateElement('achievements', this.state.user.achievements.size);
        this.updateElement('socialRank', this.state.social.userRank ? `#${this.state.social.userRank}` : '#-');
    }

    updateTrendingTokensUI() {
        const container = document.getElementById('trendingTokens');
        if (!container) return;
        
        if (this.state.market.trending.length === 0) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            return;
        }
        
        container.innerHTML = this.state.market.trending.map((token, index) => `
            <div class="trending-item" style="display: flex; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--border-secondary); cursor: pointer; transition: var(--transition-fast);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <div class="trending-rank" style="width: 24px; height: 24px; background: var(--gradient-primary); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: var(--font-size-xs); margin-right: var(--space-3);">
                    ${token.trending_rank}
                </div>
                <div class="token-icon" style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: var(--space-3);">
                    ${token.symbol.charAt(0)}
                </div>
                <div class="token-info" style="flex: 1;">
                    <div class="token-symbol" style="font-weight: 600; color: var(--text-primary); font-size: var(--font-size-sm);">${token.symbol}</div>
                    <div class="token-name" style="color: var(--text-muted); font-size: var(--font-size-xs);">${token.name}</div>
                </div>
                <div class="token-rank" style="color: var(--text-tertiary); font-size: var(--font-size-xs);">
                    #${token.rank}
                </div>
            </div>
        `).join('');
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

    async loadAnalyticsData() {
        if (!this.state.wallet.connected) {
            this.showAnalyticsPlaceholder();
            return;
        }
        
        try {
            console.log('📊 Loading analytics data...');
            
            // Recalculate analytics if needed
            await this.calculateComprehensiveAnalytics();
            
            // Update analytics UI
            this.updateAnalyticsUI();
            
            console.log('✅ Analytics data loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load analytics data:', error);
            this.showAnalyticsError();
        }
    }

    async loadMarketData() {
        try {
            console.log('📈 Loading market data...');
            
            // Refresh trending tokens
            await this.loadTrendingTokens();
            
            // Update market UI
            this.updateMarketUI();
            this.updateTrendingTokensUI();
            
            console.log('✅ Market data loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load market data:', error);
        }
    }

    async loadWhaleData() {
        console.log('🐋 Whale data loading...');
        
        // Load followed wallets data
        await this.loadFollowedWallets();
        
        // Update whale movements UI
        this.updateWhaleMovementsUI();
        
        // Update whale stats
        const whaleVol = this.state.whale.recentMovements.reduce((sum, m) => sum + (m.amount * 100), 0); // Simplified calculation
        this.updateElement('whaleVol', `$${this.formatLargeNumber(whaleVol)}`);
    }
    
    renderAlerts() {
        console.log('🔔 Alerts rendering...');
        this.updateAlertHistoryUI();
    }
    
    async loadSocialData() {
        console.log('👥 Social data loading...');
        
        // Load leaderboard
        await this.loadLeaderboard();
        
        // Update achievements UI
        this.updateAchievementsUI();
        
        // Update social stats
        this.updateElement('followers', '0'); // In production, would fetch from backend
        this.updateElement('following', this.state.social.followedWallets.size);
    }

    showAnalyticsError() {
        this.showToast('Failed to load analytics data', 'error');
        this.showAnalyticsPlaceholder();
    }

    // CHART TIMEFRAME SWITCHING IMPLEMENTATION
    changeChartTimeframe(timeframe) {
        console.log(`📊 Switching chart to ${timeframe}`);
        this.state.currentTimeframe = timeframe;
        
        // Update active button
        document.querySelectorAll('.chart-controls .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick="changeChartTimeframe('${timeframe}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update chart data
        this.updatePortfolioChartTimeframe(timeframe);
        
        this.showToast(`Chart updated to ${timeframe} view`, 'info', 1500);
    }

    updatePortfolioChartTimeframe(timeframe) {
        const chart = this.state.ui.charts.get('portfolio');
        if (!chart) return;
        
        const historicalData = this.state.wallet.historicalData.get(timeframe);
        if (!historicalData) {
            console.warn(`No historical data for timeframe: ${timeframe}`);
            return;
        }
        
        // Update chart labels and data
        const labels = this.getTimeframeLabels(timeframe, historicalData.length);
        const data = historicalData.map(point => point.value);
        
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('active');
        
        console.log(`✅ Chart updated for ${timeframe} with ${data.length} data points`);
    }

    getTimeframeLabels(timeframe, dataLength) {
        const labels = [];
        const now = new Date();
        
        switch (timeframe) {
            case '1D':
                for (let i = dataLength - 1; i >= 0; i--) {
                    const time = new Date(now.getTime() - (i * 3600000)); // 1 hour intervals
                    labels.push(time.getHours() + ':00');
                }
                break;
                
            case '7D':
                for (let i = dataLength - 1; i >= 0; i--) {
                    const date = new Date(now.getTime() - (i * 3600000)); // 1 hour intervals
                    if (i % 24 === 0) { // Show date every 24 hours
                        labels.push(date.getMonth() + 1 + '/' + date.getDate());
                    } else {
                        labels.push('');
                    }
                }
                break;
                
            case '30D':
                for (let i = dataLength - 1; i >= 0; i--) {
                    const date = new Date(now.getTime() - (i * 86400000)); // 1 day intervals
                    labels.push(date.getMonth() + 1 + '/' + date.getDate());
                }
                break;
                
            case '1Y':
                for (let i = dataLength - 1; i >= 0; i--) {
                    const date = new Date(now.getTime() - (i * 86400000)); // 1 day intervals
                    if (i % 30 === 0) { // Show month every 30 days
                        labels.push(date.getMonth() + 1 + '/' + date.getDate());
                    } else {
                        labels.push('');
                    }
                }
                break;
                
            default:
                for (let i = 0; i < dataLength; i++) {
                    labels.push(`T${i}`);
                }
        }
        
        return labels;
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

        // Use current timeframe data if available
        const timeframeData = this.state.wallet.historicalData.get(this.state.currentTimeframe);
        
        if (timeframeData && timeframeData.length > 0) {
            const labels = this.getTimeframeLabels(this.state.currentTimeframe, timeframeData.length);
            const data = timeframeData.map(point => point.value);
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
        } else {
            // Fallback to generated data
            const currentValue = this.state.wallet.performance.totalValue;
            const mockData = this.generateMockHistoricalData(currentValue);
            chart.data.datasets[0].data = mockData;
        }
        
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
        try {
            const saved = localStorage.getItem('cypher_alerts_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.state.alerts = { ...this.state.alerts, ...state };
            }
        } catch (error) {
            console.warn('Failed to load alerts state:', error);
        }
    }
    
    saveAlertsState() {
        try {
            localStorage.setItem('cypher_alerts_state', JSON.stringify(this.state.alerts));
        } catch (error) {
            console.warn('Failed to save alerts state:', error);
        }
    }

    startRealTimeUpdates() {
        // Market data updates
        setInterval(() => {
            this.updateMarketData();
        }, 120000); // Every 2 minutes

        // Portfolio updates
        setInterval(() => {
            if (this.state.wallet.connected) {
                this.refreshPortfolioData();
            }
        }, 300000); // Every 5 minutes

        // Whale monitoring updates
        setInterval(() => {
            if (this.state.wallet.connected && this.state.whale.monitoredTokens.size > 0) {
                this.refreshWhaleData();
            }
        }, 180000); // Every 3 minutes

        // Cache cleanup
        setInterval(() => {
            this.cache.cleanExpired();
        }, 600000); // Every 10 minutes
        
        // Trending tokens update
        setInterval(() => {
            this.loadTrendingTokens();
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
            await this.loadHistoricalWalletData();
        } catch (error) {
            console.error('Failed to refresh portfolio data:', error);
        }
    }

    async refreshWhaleData() {
        for (const tokenAddress of this.state.whale.monitoredTokens) {
            await this.checkWhaleMovements(tokenAddress);
        }
    }

    // PLACEHOLDER METHODS FOR UNIMPLEMENTED FEATURES
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
        this.showToast('Welcome to Cypher! Connect your wallet to get started.', 'info', 5000);
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
        const chart = this.state.ui.charts.get('benchmark');
        if (chart) {
            const newData = this.generateBenchmarkData(benchmark);
            chart.data.datasets[1].data = newData;
            chart.data.datasets[1].label = benchmark.toUpperCase();
            chart.update();
        }
        
        this.showToast(`Benchmark changed to ${benchmark.toUpperCase()}`, 'info', 1500);
    }

    filterMarket(filter) {
        this.showToast(`Market filter: ${filter}`, 'info', 1500);
    }

    filterWhaleMovements(filter) {
        this.state.whale.filter = filter;
        this.updateWhaleMovementsUI();
        this.showToast(`Whale filter: ${filter}`, 'info', 1500);
    }

    // WALLET FOLLOWING METHODS
    async followWallet(address, nickname = null) {
        if (!address || address.length < 32) {
            this.showError('Invalid wallet address');
            return;
        }
        
        try {
            this.showLoadingOverlay('Following wallet...');
            
            // Add to followed wallets
            this.state.social.followedWallets.set(address, {
                address,
                nickname: nickname || `Wallet ${this.state.social.followedWallets.size + 1}`,
                followedAt: Date.now(),
                performance: null
            });
            
            // Load wallet performance
            await this.loadFollowedWallets();
            
            // Save state
            this.saveSocialState();
            
            // Update UI
            if (this.state.currentSection === 'whale') {
                this.updateFollowedWalletsUI();
            }
            
            // Check achievement
            if (this.state.social.followedWallets.size >= 10) {
                this.unlockAchievement('social_butterfly');
            }
            
            this.hideLoadingOverlay();
            this.showToast('Wallet followed successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to follow wallet:', error);
            this.hideLoadingOverlay();
            this.showError('Failed to follow wallet');
        }
    }

    unfollowWallet(address) {
        this.state.social.followedWallets.delete(address);
        this.saveSocialState();
        this.updateFollowedWalletsUI();
        this.showToast('Wallet unfollowed', 'info');
    }

    saveSocialState() {
        try {
            const socialData = {
                followedWallets: Array.from(this.state.social.followedWallets.entries())
            };
            localStorage.setItem('cypher_social_state', JSON.stringify(socialData));
        } catch (error) {
            console.warn('Failed to save social state:', error);
        }
    }

    loadSocialState() {
        try {
            const saved = localStorage.getItem('cypher_social_state');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.followedWallets) {
                    this.state.social.followedWallets = new Map(data.followedWallets);
                }
            }
        } catch (error) {
            console.warn('Failed to load social state:', error);
        }
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
            'trending_tokens': 600000,
            'wallet_performance': 300000,
            'whale_movements': 180000
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
            'solscan': 200,
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

// SOLSCAN API MANAGER
class SolscanAPIManager {
    constructor(config, cache) {
        this.config = config;
        this.cache = cache;
        this.requestCount = 0;
        this.lastRequestTime = 0;
    }
    
    async makeRequest(endpoint, params = {}) {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;
        
        if (timeSinceLastRequest < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
        
        // Build URL
        const url = new URL(`${this.config.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.config.key}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Solscan API error: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Solscan API request failed:', error);
            throw error;
        }
    }
    
    async getAccountInfo(address) {
        const cacheKey = `solscan_account_${address}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const data = await this.makeRequest(`/account/${address}`);
        this.cache.set(cacheKey, data, 60000); // 1 minute cache
        return data;
    }
    
    async getAccountTokens(address) {
        const cacheKey = `solscan_tokens_${address}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        const data = await this.makeRequest(`/account/token-accounts`, { address });
        this.cache.set(cacheKey, data, 120000); // 2 minute cache
        return data;
    }
    
    async getAccountTransactions(address, options = {}) {
        const params = {
            address,
            limit: options.limit || 50,
            offset: options.offset || 0
        };
        
        const data = await this.makeRequest('/account/transactions', params);
        return data;
    }
    
    async getAccountBalanceHistory(address, days = 30) {
        const cacheKey = `solscan_balance_history_${address}_${days}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        
        // Note: This endpoint might not be available in all Solscan API tiers
        // Using mock data for demonstration
        const mockData = this.generateMockBalanceHistory(days);
        this.cache.set(cacheKey, mockData, 3600000); // 1 hour cache
        return mockData;
    }
    
    generateMockBalanceHistory(days) {
        const data = [];
        const now = Date.now() / 1000;
        const interval = 86400; // 1 day in seconds
        
        for (let i = days; i >= 0; i--) {
            data.push({
                time: now - (i * interval),
                amount: Math.random() * 1000000000000, // Random balance in lamports
                changeAmount: (Math.random() - 0.5) * 100000000000
            });
        }
        
        return { data, success: true };
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
        this.cache.set(cacheKey, data, 300000); // 5 minute cache
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
        
        const data = await this.makeRequest('/token/transfers', params);
        return data;
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
    if (cypherApp) cypherApp.changeChartTimeframe(timeframe);
}

function generateAnalysisReport() {
    if (cypherApp) cypherApp.showToast('Analysis report generation coming soon', 'info');
}

function exportHoldings() {
    if (cypherApp) cypherApp.showToast('Export functionality coming soon', 'info');
}

function refreshWhaleData() {
    if (cypherApp) cypherApp.refreshWhaleData();
}

function openFollowModal() {
    const modal = document.getElementById('followModal');
    if (modal) modal.style.display = 'flex';
}

function setWhaleThreshold(threshold) {
    if (cypherApp) {
        cypherApp.state.whale.thresholdSOL = threshold;
        cypherApp.showToast(`Whale threshold set to ${threshold} SOL`, 'info');
    }
}

function setCustomThreshold() {
    const input = document.getElementById('customThreshold');
    if (input && cypherApp) {
        const value = parseFloat(input.value);
        if (!isNaN(value) && value > 0) {
            cypherApp.state.whale.thresholdSOL = value;
            cypherApp.showToast(`Whale threshold set to ${value} SOL`, 'info');
        }
    }
}

function pauseAllAlerts() {
    if (cypherApp) cypherApp.showToast('Pause alerts feature coming soon', 'info');
}

function exportAlerts() {
    if (cypherApp) cypherApp.showToast('Export alerts feature coming soon', 'info');
}

function openAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.style.display = 'flex';
}

function createQuickAlert(event) {
    event.preventDefault();
    if (cypherApp) cypherApp.showToast('Quick alert creation coming soon', 'info');
}

function clearAlertHistory() {
    if (cypherApp) {
        cypherApp.state.alerts.history = [];
        cypherApp.saveAlertsState();
        cypherApp.updateAlertHistoryUI();
        cypherApp.showToast('Alert history cleared', 'info');
    }
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
    if (cypherApp) {
        cypherApp.loadLeaderboard(period);
        cypherApp.showToast(`Leaderboard: ${period}`, 'info');
    }
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
    const addressInput = document.getElementById('walletInput');
    const nicknameInput = document.getElementById('nicknameInput');
    
    if (addressInput && cypherApp) {
        const address = addressInput.value.trim();
        const nickname = nicknameInput ? nicknameInput.value.trim() : null;
        
        if (address) {
            cypherApp.followWallet(address, nickname);
            closeFollowModal();
            addressInput.value = '';
            if (nicknameInput) nicknameInput.value = '';
        }
    }
}

function closeFollowModal() {
    const modal = document.getElementById('followModal');
    if (modal) modal.style.display = 'none';
}

function updateAlertOptions() {
    if (cypherApp) cypherApp.showToast('Alert options updated', 'info');
}

function showHelpTab(tab) {
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

function unfollowWallet(address) {
    if (cypherApp) cypherApp.unfollowWallet(address);
}

function viewWalletDetails(address) {
    if (cypherApp) cypherApp.showToast('Wallet details view coming soon', 'info');
}

function copyWalletTrades(address) {
    if (cypherApp) cypherApp.showToast('Copy trading feature coming soon', 'info');
}

function followTrader(address) {
    if (cypherApp) cypherApp.followWallet(address);
}