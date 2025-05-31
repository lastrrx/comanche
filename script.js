// Application State - Basic initialization only
const app = {
    wallet: { connected: false, publicKey: null, balance: 0, tokens: [] },
    marketData: new Map(),
    alerts: [],
    whaleThreshold: 20,
    chart: null,
    followedWallets: new Map(),
    achievements: new Map(),
    socialData: { leaderboard: [], trending: [], userRank: 0 },
    whaleMovements: [],
    connection: null,
    initialized: false,
    walletStats: {
        totalTrades: 0,
        totalVolume: 0,
        winRate: 0,
        portfolioValue: 0,
        tokenCount: 0,
        tradingDays: 0,
        whalesSpotted: 0,
        following: 0,
        followers: 0,
        alertsCreated: 0,
        alertsTriggered: 0,
        totalProfit: 0,
        diamondHands: false,
        paperHands: false,
        moonShots: 0,
        rugPulls: 0,
        earlyBuys: 0,
        trendSets: 0,
        nightTrades: 0,
        speedTrades: 0,
        avgHoldTime: 0,
        swingTrades: 0,
        dayTrades: 0,
        contrarian: 0,
        maxWinStreak: 0,
        comebacks: 0,
        riskTaker: false,
        balanced: false,
        yieldFarming: 0,
        nftTrades: 0,
        memeCoins: 0,
        defiProtocols: 0
    }
};

// App Initialization Function
function initializeApp() {
    try {
        // Load data from localStorage safely
        app.alerts = JSON.parse(localStorage.getItem('cypher_alerts') || '[]');
        app.whaleThreshold = parseFloat(localStorage.getItem('cypher_whale_threshold') || '20');
        app.followedWallets = new Map(JSON.parse(localStorage.getItem('cypher_followed_wallets') || '[]'));
        app.achievements = new Map(JSON.parse(localStorage.getItem('cypher_achievements') || '[]'));
        
        // Update stats from loaded data
        app.walletStats.following = app.followedWallets.size;
        app.walletStats.alertsCreated = app.alerts.length;
        
        // Mark as initialized
        app.initialized = true;
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error during app initialization:', error);
        // Use defaults if localStorage is corrupted
        app.alerts = [];
        app.whaleThreshold = 20;
        app.followedWallets = new Map();
        app.achievements = new Map();
        app.initialized = true;
    }
}

// Initialize Solana connection (using public RPC)
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// Free API endpoints (no keys required)
const API_ENDPOINTS = {
    COINGECKO: 'https://api.coingecko.com/api/v3',
    DEXSCREENER: 'https://api.dexscreener.com/latest/dex',
    JUPITER: 'https://price.jup.ag/v4',
    BIRDEYE: 'https://public-api.birdeye.so/public' // Free tier available
};

// API Helper with multiple fallbacks and no exposed keys
async function apiCall(endpoint, params = {}, apiType = 'coingecko') {
    try {
        let url;
        
        switch (apiType) {
            case 'coingecko':
                url = new URL(`${API_ENDPOINTS.COINGECKO}${endpoint}`);
                break;
            case 'dexscreener':
                url = new URL(`${API_ENDPOINTS.DEXSCREENER}${endpoint}`);
                break;
            case 'jupiter':
                url = new URL(`${API_ENDPOINTS.JUPITER}${endpoint}`);
                break;
            case 'birdeye':
                url = new URL(`${API_ENDPOINTS.BIRDEYE}${endpoint}`);
                break;
            default:
                throw new Error('Unknown API type');
        }
        
        Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v));
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error (${apiType}${endpoint}):`, error);
        
        // Return mock data as fallback to prevent app from breaking
        return getMockData(endpoint);
    }
}

// Mock data fallback when APIs fail
function getMockData(endpoint) {
    const mockTokens = [
        { symbol: 'SOL', name: 'Solana', price: 98.50, price_change_24h: 5.2 },
        { symbol: 'RAY', name: 'Raydium', price: 2.45, price_change_24h: -1.8 },
        { symbol: 'SRM', name: 'Serum', price: 0.85, price_change_24h: 12.4 },
        { symbol: 'ORCA', name: 'Orca', price: 1.25, price_change_24h: 8.1 },
        { symbol: 'MNGO', name: 'Mango', price: 0.045, price_change_24h: -3.2 }
    ];

    if (endpoint.includes('trending') || endpoint.includes('tokens')) {
        return { data: mockTokens };
    }
    
    if (endpoint.includes('price')) {
        return { data: { price: 98.50, price_change_24h: 5.2 } };
    }
    
    return null;
}

// Initialize Solana connection
function initSolanaConnection() {
    try {
        app.connection = new solanaWeb3.Connection(RPC_ENDPOINT, 'confirmed');
        console.log('Solana RPC connection initialized');
        
        // Test the connection
        app.connection.getVersion().then(version => {
            console.log('Solana RPC version:', version);
        }).catch(error => {
            console.warn('Solana RPC test failed:', error);
            showToast('Using offline mode - limited functionality');
        });
        
    } catch (error) {
        console.error('Failed to connect to Solana RPC:', error);
        showToast('Using offline mode - limited functionality');
    }
}

// Achievement Definitions (50 achievements)
const ACHIEVEMENTS = {
    // Trading Volume
    'first_trade': { name: 'First Steps', desc: 'Complete your first trade', icon: '🎯', check: (stats) => stats.totalTrades >= 1 },
    'volume_1k': { name: 'Getting Started', desc: 'Trade $1,000 volume', icon: '💰', check: (stats) => stats.totalVolume >= 1000 },
    'volume_10k': { name: 'Active Trader', desc: 'Trade $10,000 volume', icon: '📈', check: (stats) => stats.totalVolume >= 10000 },
    'volume_100k': { name: 'Power Trader', desc: 'Trade $100,000 volume', icon: '⚡', check: (stats) => stats.totalVolume >= 100000 },
    'volume_1m': { name: 'Whale Territory', desc: 'Trade $1M volume', icon: '🐋', check: (stats) => stats.totalVolume >= 1000000 },
    
    // Trade Count
    'trades_10': { name: 'Frequent Trader', desc: 'Complete 10 trades', icon: '🔄', check: (stats) => stats.totalTrades >= 10 },
    'trades_100': { name: 'Seasoned Trader', desc: 'Complete 100 trades', icon: '🎪', check: (stats) => stats.totalTrades >= 100 },
    'trades_1000': { name: 'Trade Master', desc: 'Complete 1,000 trades', icon: '👑', check: (stats) => stats.totalTrades >= 1000 },
    
    // Win Rate
    'win_rate_60': { name: 'Lucky Streak', desc: '60%+ win rate (min 10 trades)', icon: '🍀', check: (stats) => stats.winRate >= 60 && stats.totalTrades >= 10 },
    'win_rate_75': { name: 'Sharp Trader', desc: '75%+ win rate (min 20 trades)', icon: '🎯', check: (stats) => stats.winRate >= 75 && stats.totalTrades >= 20 },
    'win_rate_90': { name: 'Trading Genius', desc: '90%+ win rate (min 50 trades)', icon: '🧠', check: (stats) => stats.winRate >= 90 && stats.totalTrades >= 50 },
    
    // Portfolio Value
    'portfolio_1k': { name: 'Building Wealth', desc: 'Portfolio worth $1,000', icon: '💎', check: (stats) => stats.portfolioValue >= 1000 },
    'portfolio_10k': { name: 'Growing Portfolio', desc: 'Portfolio worth $10,000', icon: '📊', check: (stats) => stats.portfolioValue >= 10000 },
    'portfolio_100k': { name: 'Six Figure Portfolio', desc: 'Portfolio worth $100,000', icon: '💸', check: (stats) => stats.portfolioValue >= 100000 },
    'portfolio_1m': { name: 'Millionaire Club', desc: 'Portfolio worth $1M', icon: '🏆', check: (stats) => stats.portfolioValue >= 1000000 },
    
    // Token Diversity
    'tokens_5': { name: 'Diversifying', desc: 'Hold 5 different tokens', icon: '🌈', check: (stats) => stats.tokenCount >= 5 },
    'tokens_10': { name: 'Token Collector', desc: 'Hold 10 different tokens', icon: '🎨', check: (stats) => stats.tokenCount >= 10 },
    'tokens_25': { name: 'Portfolio Diversity', desc: 'Hold 25 different tokens', icon: '🎯', check: (stats) => stats.tokenCount >= 25 },
    
    // Time-based
    'week_warrior': { name: 'Week Warrior', desc: 'Trade for 7 consecutive days', icon: '📅', check: (stats) => stats.tradingDays >= 7 },
    'month_veteran': { name: 'Month Veteran', desc: 'Trade for 30 days', icon: '📆', check: (stats) => stats.tradingDays >= 30 },
    'year_legend': { name: 'Year Legend', desc: 'Trade for 365 days', icon: '🗓️', check: (stats) => stats.tradingDays >= 365 },
    
    // Whale Tracking
    'whale_spotter': { name: 'Whale Spotter', desc: 'Spot your first whale transaction', icon: '👀', check: (stats) => stats.whalesSpotted >= 1 },
    'whale_hunter': { name: 'Whale Hunter', desc: 'Track 10 whale transactions', icon: '🔍', check: (stats) => stats.whalesSpotted >= 10 },
    'whale_master': { name: 'Whale Master', desc: 'Track 100 whale transactions', icon: '🌊', check: (stats) => stats.whalesSpotted >= 100 },
    
    // Social Features
    'first_follow': { name: 'Social Butterfly', desc: 'Follow your first wallet', icon: '👥', check: (stats) => stats.following >= 1 },
    'popular_trader': { name: 'Popular Trader', desc: 'Get 10 followers', icon: '⭐', check: (stats) => stats.followers >= 10 },
    'influencer': { name: 'Crypto Influencer', desc: 'Get 100 followers', icon: '🌟', check: (stats) => stats.followers >= 100 },
    
    // Alerts
    'alert_master': { name: 'Alert Master', desc: 'Create 10 price alerts', icon: '🔔', check: (stats) => stats.alertsCreated >= 10 },
    'crystal_ball': { name: 'Crystal Ball', desc: 'Have 5 alerts triggered', icon: '🔮', check: (stats) => stats.alertsTriggered >= 5 },
    
    // Profit Achievements
    'first_profit': { name: 'First Profit', desc: 'Make your first profitable trade', icon: '💚', check: (stats) => stats.totalProfit > 0 },
    'profit_1k': { name: 'Profit Maker', desc: 'Make $1,000 profit', icon: '💵', check: (stats) => stats.totalProfit >= 1000 },
    'profit_10k': { name: 'Profit King', desc: 'Make $10,000 profit', icon: '👑', check: (stats) => stats.totalProfit >= 10000 },
    
    // Special Achievements (21 more achievements)
    'diamond_hands': { name: 'Diamond Hands', desc: 'Hold a token for 30+ days with 50%+ gains', icon: '💎', check: (stats) => stats.diamondHands },
    'paper_hands': { name: 'Paper Hands', desc: 'Sell a token within 1 hour of buying', icon: '📄', check: (stats) => stats.paperHands },
    'moon_shot': { name: 'Moon Shot', desc: 'Buy a token that gains 1000%+', icon: '🚀', check: (stats) => stats.moonShots >= 1 },
    'rug_survivor': { name: 'Rug Survivor', desc: 'Survive 3 rug pulls', icon: '🛡️', check: (stats) => stats.rugPulls >= 3 },
    'early_bird': { name: 'Early Bird', desc: 'Buy a token within first hour of launch', icon: '🐦', check: (stats) => stats.earlyBuys >= 1 },
    'trend_setter': { name: 'Trend Setter', desc: 'Be among first 100 holders of a successful token', icon: '🔥', check: (stats) => stats.trendSets >= 1 },
    'night_owl': { name: 'Night Owl', desc: 'Make 10 trades between midnight-6AM', icon: '🦉', check: (stats) => stats.nightTrades >= 10 },
    'speed_demon': { name: 'Speed Demon', desc: 'Complete 10 trades in 1 hour', icon: '⚡', check: (stats) => stats.speedTrades >= 10 },
    'patient_trader': { name: 'Patient Trader', desc: 'Hold average position for 30+ days', icon: '⏳', check: (stats) => stats.avgHoldTime >= 30 },
    'swing_trader': { name: 'Swing Trader', desc: 'Complete 5 profitable swings (5-20 day holds)', icon: '🎢', check: (stats) => stats.swingTrades >= 5 },
    'day_trader': { name: 'Day Trader', desc: 'Complete 20 same-day trades', icon: '📱', check: (stats) => stats.dayTrades >= 20 },
    'contrarian': { name: 'Contrarian', desc: 'Buy during 5 major market dips', icon: '📉', check: (stats) => stats.contrarian >= 5 },
    'lucky_seven': { name: 'Lucky Seven', desc: 'Win 7 trades in a row', icon: '🎰', check: (stats) => stats.maxWinStreak >= 7 },
    'comeback_kid': { name: 'Comeback Kid', desc: 'Recover from 50%+ portfolio loss', icon: '💪', check: (stats) => stats.comebacks >= 1 },
    'risk_taker': { name: 'Risk Taker', desc: 'Put 50%+ portfolio in single token', icon: '🎲', check: (stats) => stats.riskTaker },
    'balanced_trader': { name: 'Balanced Trader', desc: 'Maintain <20% allocation per token (10+ tokens)', icon: '⚖️', check: (stats) => stats.balanced },
    'yield_farmer': { name: 'Yield Farmer', desc: 'Hold LP tokens for 30+ days', icon: '🚜', check: (stats) => stats.yieldFarming >= 30 },
    'nft_enthusiast': { name: 'NFT Enthusiast', desc: 'Trade 5 different NFT collections', icon: '🖼️', check: (stats) => stats.nftTrades >= 5 },
    'meme_lord': { name: 'Meme Lord', desc: 'Trade 10 meme coins', icon: '😎', check: (stats) => stats.memeCoins >= 10 },
    'defi_native': { name: 'DeFi Native', desc: 'Use 5 different DeFi protocols', icon: '🏗️', check: (stats) => stats.defiProtocols >= 5 }
};

// Wallet Functions
async function connectWallet() {
    try {
        console.log('Attempting to connect wallet...');
        
        // Wait for Phantom to be available
        const getPhantom = () => {
            if (window.phantom?.solana?.isPhantom) {
                return window.phantom.solana;
            }
            if (window.solana?.isPhantom) {
                return window.solana;
            }
            return null;
        };
        
        let phantom = getPhantom();
        
        // If Phantom not found, wait a bit and try again
        if (!phantom) {
            showToast('Looking for Phantom wallet...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            phantom = getPhantom();
        }
        
        if (!phantom) {
            showToast('Phantom wallet not found. Please install Phantom wallet extension.');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        console.log('Phantom wallet detected:', phantom);
        
        // Check if already connected
        if (phantom.isConnected && phantom.publicKey) {
            console.log('Wallet already connected');
            app.wallet.connected = true;
            app.wallet.publicKey = phantom.publicKey.toString();
            await loadWalletData();
            updateUI();
            showToast('Wallet already connected!');
            return;
        }
        
        // Request connection
        showToast('Please approve connection in Phantom wallet...');
        console.log('Requesting connection...');
        
        const response = await phantom.connect({ onlyIfTrusted: false });
        console.log('Connection response:', response);
        
        if (response.publicKey) {
            app.wallet.connected = true;
            app.wallet.publicKey = response.publicKey.toString();
            
            console.log('Wallet connected:', app.wallet.publicKey);
            
            await loadWalletData();
            updateUI();
            showToast('Wallet connected successfully!');
            
            // Check achievements after connecting
            await checkAchievements();
        } else {
            throw new Error('No public key received from wallet');
        }
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            showToast('Connection cancelled by user');
        } else if (error.code === -32002) {
            showToast('Connection request pending. Please check Phantom wallet.');
        } else {
            showToast('Connection failed: ' + (error.message || 'Unknown error'));
        }
    }
}

// Check for wallet on page load
async function checkWalletConnection() {
    try {
        const getPhantom = () => {
            if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
            if (window.solana?.isPhantom) return window.solana;
            return null;
        };
        
        const phantom = getPhantom();
        if (phantom && phantom.isConnected && phantom.publicKey) {
            console.log('Auto-connecting to previously connected wallet');
            app.wallet.connected = true;
            app.wallet.publicKey = phantom.publicKey.toString();
            await loadWalletData();
            updateUI();
            showToast('Wallet auto-connected');
        }
    } catch (error) {
        console.error('Auto-connect error:', error);
    }
}

async function loadWalletData() {
    if (!app.wallet.connected || !app.connection) {
        console.log('Wallet not connected or no RPC connection');
        return;
    }
    
    try {
        console.log('Loading wallet data for:', app.wallet.publicKey);
        const publicKey = new solanaWeb3.PublicKey(app.wallet.publicKey);
        
        // Get SOL balance
        console.log('Fetching SOL balance...');
        const balance = await app.connection.getBalance(publicKey);
        app.wallet.balance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        console.log('SOL balance:', app.wallet.balance);
        
        // Get token accounts
        console.log('Fetching token accounts...');
        const tokenAccounts = await app.connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });
        
        console.log('Found token accounts:', tokenAccounts.value.length);
        
        app.wallet.tokens = [];
        let totalValue = 0;
        
        // Add SOL as first token
        const solPrice = await getSolPrice();
        const solValue = app.wallet.balance * solPrice;
        
        app.wallet.tokens.push({
            address: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Solana',
            amount: app.wallet.balance,
            price: solPrice,
            value: solValue,
            change: 0,
            logo: null
        });
        
        totalValue += solValue;
        console.log('SOL value:', solValue);
        
        // Process other tokens (simplified for now)
        let tokenCount = 0;
        for (const tokenAccount of tokenAccounts.value.slice(0, 10)) { // Limit to 10 for performance
            try {
                const accountData = tokenAccount.account.data.parsed.info;
                const amount = parseFloat(accountData.tokenAmount.uiAmount);
                
                if (amount > 0) {
                    tokenCount++;
                    // For demo purposes, use mock prices since we don't have token metadata API
                    const mockPrice = Math.random() * 10;
                    const value = amount * mockPrice;
                    
                    app.wallet.tokens.push({
                        address: accountData.mint,
                        symbol: `TOKEN${tokenCount}`,
                        name: `Token ${tokenCount}`,
                        amount: amount,
                        price: mockPrice,
                        value: value,
                        change: (Math.random() - 0.5) * 20,
                        logo: null
                    });
                    
                    totalValue += value;
                }
            } catch (tokenError) {
                console.warn('Error processing token account:', tokenError);
            }
        }
        
        // Update wallet stats
        app.walletStats.portfolioValue = totalValue;
        app.walletStats.tokenCount = app.wallet.tokens.length;
        
        document.getElementById('trackedTokens').textContent = app.wallet.tokens.length;
        
        console.log('Wallet data loaded successfully. Total value:', totalValue);
        
    } catch (error) {
        console.error('Error loading wallet data:', error);
        showToast('Failed to load wallet data: ' + error.message);
        
        // Use mock data as fallback
        console.log('Using mock wallet data as fallback');
        const solPrice = await getSolPrice();
        app.wallet.tokens = [
            { 
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL', 
                name: 'Solana', 
                amount: 10.5, 
                price: solPrice, 
                value: 10.5 * solPrice, 
                change: 5.2 
            },
            { 
                address: 'mock',
                symbol: 'MOCK', 
                name: 'Mock Token', 
                amount: 100, 
                price: 2.45, 
                value: 245, 
                change: -1.8 
            }
        ];
        
        app.walletStats.portfolioValue = 10.5 * solPrice + 245;
        app.walletStats.tokenCount = 2;
    }
}

async function getSolPrice() {
    try {
        console.log('Fetching SOL price from CoinGecko...');
        // Try CoinGecko first
        const data = await apiCall('/simple/price', {
            ids: 'solana',
            vs_currencies: 'usd',
            include_24hr_change: 'true'
        }, 'coingecko');
        
        if (data?.solana?.usd) {
            console.log('SOL price from CoinGecko:', data.solana.usd);
            return data.solana.usd;
        }
        
        console.log('CoinGecko failed, using fallback price');
        // Fallback to mock price
        return 98.50;
    } catch (error) {
        console.error('Error getting SOL price:', error);
        return 98.50;
    }
}

// Market Data Functions
async function loadMarketData() {
    try {
        // Get SOL price
        const solPrice = await getSolPrice();
        document.getElementById('solPrice').textContent = `$${solPrice.toFixed(2)}`;
        document.getElementById('marketVol').textContent = `$${(Math.random() * 1000000000).toLocaleString()}`;
        
        // Load trending tokens (using mock data due to API limitations)
        const trendingTokens = [
            { symbol: 'SOL', name: 'Solana', price: solPrice, price_change_24h: 5.2 },
            { symbol: 'RAY', name: 'Raydium', price: 2.45, price_change_24h: -1.8 },
            { symbol: 'SRM', name: 'Serum', price: 0.85, price_change_24h: 12.4 },
            { symbol: 'ORCA', name: 'Orca', price: 1.25, price_change_24h: 8.1 },
            { symbol: 'MNGO', name: 'Mango', price: 0.045, price_change_24h: -3.2 },
            { symbol: 'STEP', name: 'Step', price: 0.35, price_change_24h: 15.7 },
            { symbol: 'COPE', name: 'Cope', price: 0.12, price_change_24h: -8.9 },
            { symbol: 'FIDA', name: 'Bonfida', price: 0.75, price_change_24h: 22.1 },
            { symbol: 'MAPS', name: 'Maps', price: 0.95, price_change_24h: -5.4 },
            { symbol: 'MEDIA', name: 'Media', price: 1.85, price_change_24h: 18.3 }
        ];
        
        renderTokenList('trendingTokens', trendingTokens.slice(0, 5));
        renderTokenList('marketMovers', trendingTokens.slice(5, 10));
        
    } catch (error) {
        console.error('Error loading market data:', error);
        document.getElementById('trendingTokens').innerHTML = '<div class="error-state">Failed to load trending tokens</div>';
        document.getElementById('marketMovers').innerHTML = '<div class="error-state">Failed to load market movers</div>';
    }
}

// Followed Wallets System
function renderFollowedWallets() {
    if (!app.initialized) return;
    
    const container = document.getElementById('followedWallets');
    
    if (app.followedWallets.size === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No wallets followed</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    app.followedWallets.forEach((data, address) => {
        const performance = data.performance || 0;
        const badgeClass = performance > 0 ? 'badge-green' : 'badge-red';
        
        html += `
            <div class="wallet-item">
                <div>
                    <h5>${data.nickname || `${address.slice(0, 6)}...${address.slice(-4)}`}</h5>
                    <small style="color: #888;">${getTimeAgo(data.followed_since)}</small>
                    <span class="performance-badge ${badgeClass}">
                        ${performance > 0 ? '+' : ''}${performance.toFixed(1)}%
                    </span>
                </div>
                <button class="btn btn-danger" style="padding: 0.5rem;" onclick="unfollowWallet('${address}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('followedCount').textContent = app.followedWallets.size;
}

async function trackFollowedWallet(address) {
    if (!app.initialized) return;
    
    try {
        if (!app.connection) return;
        
        const publicKey = new solanaWeb3.PublicKey(address);
        const balance = await app.connection.getBalance(publicKey);
        const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        const solPrice = await getSolPrice();
        const totalValue = solBalance * solPrice;
        
        // Update wallet performance (simplified calculation)
        const walletInfo = app.followedWallets.get(address);
        if (walletInfo) {
            const prevValue = walletInfo.lastValue || totalValue;
            const performance = ((totalValue - prevValue) / prevValue) * 100;
            
            app.followedWallets.set(address, {
                ...walletInfo,
                performance: isNaN(performance) ? (Math.random() - 0.5) * 20 : performance,
                lastValue: totalValue,
                lastUpdate: Date.now()
            });
            
            saveToStorage();
        }
    } catch (error) {
        console.error(`Error tracking wallet ${address}:`, error);
        
        // Use mock performance as fallback
        const walletInfo = app.followedWallets.get(address);
        if (walletInfo) {
            app.followedWallets.set(address, {
                ...walletInfo,
                performance: (Math.random() - 0.5) * 20,
                lastUpdate: Date.now()
            });
        }
    }
}

// Achievement System
async function checkAchievements() {
    if (!app.initialized || !app.wallet.connected) return 0;
    
    // Analyze wallet stats
    await analyzeWalletStats();
    
    let newAchievements = 0;
    
    Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
        const isUnlocked = achievement.check(app.walletStats);
        const wasUnlocked = app.achievements.has(id);
        
        if (isUnlocked && !wasUnlocked) {
            app.achievements.set(id, {
                unlocked: true,
                unlocked_at: Date.now()
            });
            newAchievements++;
        }
    });
    
    renderAchievements();
    saveToStorage();
    
    return newAchievements;
}

async function analyzeWalletStats() {
    if (!app.initialized || !app.wallet.connected) return;
    
    try {
        // Basic stats from current wallet state
        app.walletStats.portfolioValue = app.wallet.tokens.reduce((sum, token) => sum + token.value, 0);
        app.walletStats.tokenCount = app.wallet.tokens.length;
        
        // Mock trading data for demo
        app.walletStats.totalTrades = Math.floor(Math.random() * 100) + app.walletStats.tokenCount;
        app.walletStats.tradingDays = Math.floor(Math.random() * 365);
        app.walletStats.totalVolume = app.walletStats.portfolioValue * (1 + Math.random() * 10);
        app.walletStats.winRate = 50 + (Math.random() * 40);
        
        // Social stats
        app.walletStats.following = app.followedWallets.size;
        app.walletStats.alertsCreated = app.alerts.length;
        
        // Whale tracking
        app.walletStats.whalesSpotted = app.whaleMovements.length;
        
    } catch (error) {
        console.error('Error analyzing wallet stats:', error);
    }
}

function renderAchievements() {
    if (!app.initialized) return;
    
    const container = document.getElementById('achievementsList');
    const unlockedCount = app.achievements.size;
    const totalCount = Object.keys(ACHIEVEMENTS).length;
    
    document.getElementById('achievementProgress').textContent = `${unlockedCount}/${totalCount}`;
    
    let html = '';
    Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
        const isUnlocked = app.achievements.has(id);
        const unlockedData = app.achievements.get(id);
        
        html += `
            <div class="token-item ${isUnlocked ? 'achievement-unlocked' : 'achievement-locked'}">
                <div class="token-info">
                    <div class="token-icon">${achievement.icon}</div>
                    <div>
                        <h4>${achievement.name}</h4>
                        <span>${achievement.desc}</span>
                        ${isUnlocked && unlockedData ? `<br><small style="color: #4ecdc4;">Unlocked ${getTimeAgo(unlockedData.unlocked_at)}</small>` : ''}
                    </div>
                </div>
                <div class="token-stats">
                    <div class="token-price">${isUnlocked ? '✅' : '🔒'}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Social Data
async function loadSocialData() {
    if (!app.initialized) return;
    
    try {
        // Generate mock leaderboard data
        const leaderboard = [];
        for (let i = 0; i < 10; i++) {
            leaderboard.push({
                address: `${Math.random().toString(36).substr(2, 8)}...${Math.random().toString(36).substr(2, 4)}`,
                performance: (Math.random() - 0.3) * 200,
                volume: Math.random() * 1000000,
                rank: i + 1
            });
        }
        
        app.socialData.leaderboard = leaderboard.sort((a, b) => b.performance - a.performance);
        
        renderSocialLeaderboard();
    } catch (error) {
        console.error('Error loading social data:', error);
    }
}

function renderSocialLeaderboard() {
    if (!app.initialized) return;
    
    const topPerformers = document.getElementById('topPerformers');
    const trendingTraders = document.getElementById('trendingTraders');
    
    if (!app.socialData.leaderboard.length) {
        topPerformers.innerHTML = '<div class="empty-state">No performance data available</div>';
        trendingTraders.innerHTML = '<div class="empty-state">No trending traders</div>';
        return;
    }
    
    // Top Performers
    let topHtml = '';
    app.socialData.leaderboard.slice(0, 5).forEach((trader, index) => {
        const badgeClass = trader.performance > 0 ? 'badge-green' : 'badge-red';
        topHtml += `
            <div class="token-item top-performer">
                <div class="token-info">
                    <div class="token-icon">#${index + 1}</div>
                    <div>
                        <h4>${trader.address}</h4>
                        <span>$${trader.volume.toLocaleString()} volume</span>
                    </div>
                </div>
                <div class="token-stats">
                    <div class="performance-badge ${badgeClass}">
                        ${trader.performance > 0 ? '+' : ''}${trader.performance.toFixed(1)}%
                    </div>
                </div>
            </div>
        `;
    });
    
    topPerformers.innerHTML = topHtml;
    
    // Trending Traders (volume leaders)
    const volumeLeaders = [...app.socialData.leaderboard]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);
    
    let trendingHtml = '';
    volumeLeaders.forEach((trader, index) => {
        trendingHtml += `
            <div class="token-item trending-trader">
                <div class="token-info">
                    <div class="token-icon">🔥</div>
                    <div>
                        <h4>${trader.address}</h4>
                        <span>Volume leader</span>
                    </div>
                </div>
                <div class="token-stats">
                    <div class="token-price">$${trader.volume.toLocaleString()}</div>
                </div>
            </div>
        `;
    });
    
    trendingTraders.innerHTML = trendingHtml;
}

// Whale Tracking
async function loadWhaleData() {
    if (!app.initialized) return;
    
    try {
        // Generate mock whale data
        const whaleData = [];
        const tokens = ['SOL', 'RAY', 'SRM', 'ORCA', 'MNGO'];
        
        for (let i = 0; i < 10; i++) {
            const token = tokens[Math.floor(Math.random() * tokens.length)];
            const amount = Math.random() * 10000 + app.whaleThreshold;
            const price = Math.random() * 100 + 1;
            const value = amount * price;
            
            whaleData.push({
                token: token,
                amount: amount,
                value: value,
                type: Math.random() > 0.5 ? 'buy' : 'sell',
                time: Date.now() / 1000 - Math.random() * 86400,
                from: `${Math.random().toString(36).substr(2, 8)}...`,
                to: `${Math.random().toString(36).substr(2, 8)}...`
            });
        }
        
        app.whaleMovements = whaleData;
        app.walletStats.whalesSpotted = whaleData.length;
        renderWhaleMovements(whaleData);
    } catch (error) {
        console.error('Error loading whale data:', error);
        document.getElementById('whaleMovements').innerHTML = '<div class="error-state">Failed to load whale movements</div>';
    }
}

// UI Rendering Functions
function renderTokenList(containerId, tokens) {
    const container = document.getElementById(containerId);
    if (!tokens?.length) {
        container.innerHTML = '<div class="empty-state">No tokens available</div>';
        return;
    }
    
    container.innerHTML = tokens.map(token => `
        <div class="token-item" onclick="createQuickAlert('${token.symbol}', ${token.price || 0})">
            <div class="token-info">
                <div class="token-icon">${token.logo ? `<img src="${token.logo}" alt="${token.symbol}">` : token.symbol?.charAt(0) || 'T'}</div>
                <div>
                    <h4>${token.symbol || 'Unknown'}</h4>
                    <span>${token.name || 'Unknown Token'}</span>
                </div>
            </div>
            <div class="token-stats">
                <div class="token-price">$${(token.price || 0).toFixed(4)}</div>
                <div class="stat-change ${(token.price_change_24h || 0) >= 0 ? 'positive' : 'negative'}">
                    ${(token.price_change_24h || 0) >= 0 ? '+' : ''}${(token.price_change_24h || 0).toFixed(1)}%
                </div>
            </div>
        </div>
    `).join('');
}

function renderWhaleMovements(movements) {
    const container = document.getElementById('whaleMovements');
    if (!movements?.length) {
        container.innerHTML = '<div class="empty-state">No whale movements detected</div>';
        return;
    }
    
    container.innerHTML = movements.slice(0, 10).map(move => `
        <div class="token-item">
            <div class="token-info">
                <div class="token-icon">${move.type === 'buy' ? '🟢' : '🔴'}</div>
                <div>
                    <h4>${move.token} ${move.type}</h4>
                    <span>${move.amount.toFixed(2)} tokens</span>
                </div>
            </div>
            <div class="token-stats">
                <div class="token-price">$${move.value.toLocaleString()}</div>
                <div>${getTimeAgo(move.time * 1000)}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('whaleCount').textContent = movements.length;
    document.getElementById('whaleVol').textContent = `$${movements.reduce((sum, m) => sum + m.value, 0).toLocaleString()}`;
}

function updatePortfolioChart() {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;
    
    if (app.chart) app.chart.destroy();
    
    const data = Array.from({length: 24}, (_, i) => {
        const baseValue = app.wallet.tokens.reduce((sum, token) => sum + token.value, 0) || 1000;
        return baseValue * (1 + (Math.random() - 0.5) * 0.1);
    });
    
    const labels = Array.from({length: 24}, (_, i) => {
        const time = new Date();
        time.setHours(time.getHours() - (23 - i));
        return time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    });
    
    app.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Portfolio Value',
                data,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } },
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } }
            }
        }
    });
}

function updateUI() {
    // Update wallet button
    const connectBtn = document.getElementById('connectWallet');
    if (app.wallet.connected) {
        connectBtn.innerHTML = `<i class="fas fa-wallet"></i> ${app.wallet.publicKey.slice(0, 4)}...${app.wallet.publicKey.slice(-4)}`;
    }
    
    // Update portfolio stats
    if (app.wallet.tokens.length > 0) {
        const totalValue = app.wallet.tokens.reduce((sum, token) => sum + token.value, 0);
        const totalChange = app.wallet.tokens.reduce((sum, token) => sum + (token.value * token.change / 100), 0);
        const changePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
        
        document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString()}`;
        document.getElementById('tokenCount').textContent = app.wallet.tokens.length;
        document.getElementById('totalChange').innerHTML = `
            <span class="${changePercent >= 0 ? 'positive' : 'negative'}">
                ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
            </span>
        `;
        
        // Render token holdings
        document.getElementById('tokenList').innerHTML = app.wallet.tokens.map(token => `
            <div class="token-item" onclick="createQuickAlert('${token.symbol}', ${token.price})">
                <div class="token-info">
                    <div class="token-icon">${token.logo ? `<img src="${token.logo}" alt="${token.symbol}">` : token.symbol.charAt(0)}</div>
                    <div>
                        <h4>${token.symbol}</h4>
                        <span>${token.amount.toFixed(4)} ${token.symbol}</span>
                    </div>
                </div>
                <div class="token-stats">
                    <div class="token-price">$${token.value.toFixed(2)}</div>
                    <div class="stat-change ${token.change >= 0 ? 'positive' : 'negative'}">
                        ${token.change >= 0 ? '+' : ''}${token.change.toFixed(1)}%
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    updatePortfolioChart();
}

// Alert Functions
function openAlertModal() {
    document.getElementById('alertModal').classList.add('show');
}

function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('show');
    document.getElementById('alertForm').reset();
}

function createAlert(event) {
    event.preventDefault();
    const token = document.getElementById('tokenInput').value.trim();
    const price = parseFloat(document.getElementById('priceInput').value);
    
    if (!token || !price || price <= 0) {
        showToast('Please enter valid token and price');
        return;
    }
    
    const alert = {
        id: Date.now(),
        token,
        price,
        created: Date.now(),
        status: 'active'
    };
    
    app.alerts.push(alert);
    app.walletStats.alertsCreated++;
    
    renderAlerts();
    closeAlertModal();
    saveToStorage();
    showToast(`Alert created for ${token} at $${price}`);
}

function createQuickAlert(symbol, currentPrice) {
    document.getElementById('tokenInput').value = symbol;
    document.getElementById('priceInput').value = (currentPrice * 1.1).toFixed(6);
    openAlertModal();
}

function renderAlerts() {
    if (!app.initialized) return;
    
    const container = document.getElementById('alertsList');
    if (!app.alerts.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No alerts set. Create your first alert!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = app.alerts.map(alert => `
        <div class="token-item">
            <div class="token-info">
                <div class="token-icon">🎯</div>
                <div>
                    <h4>${alert.token} Alert</h4>
                    <span>Target: $${alert.price}</span>
                </div>
            </div>
            <div class="token-stats">
                <div class="token-price">${alert.status}</div>
                <button onclick="deleteAlert(${alert.id})" class="btn btn-danger" style="padding: 0.5rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function deleteAlert(id) {
    app.alerts = app.alerts.filter(alert => alert.id !== id);
    renderAlerts();
    saveToStorage();
    showToast('Alert deleted');
}

// Follow Wallet Functions
function openFollowModal() {
    document.getElementById('followModal').classList.add('show');
}

function closeFollowModal() {
    document.getElementById('followModal').classList.remove('show');
    document.getElementById('followForm').reset();
}

function followWallet(event) {
    event.preventDefault();
    const address = document.getElementById('walletInput').value.trim();
    const nickname = document.getElementById('nicknameInput').value.trim();
    
    if (!address || address.length !== 44) {
        showToast('Please enter a valid Solana wallet address');
        return;
    }
    
    if (app.followedWallets.has(address)) {
        showToast('Wallet already being followed');
        return;
    }
    
    app.followedWallets.set(address, {
        nickname: nickname || null,
        followed_since: Date.now(),
        performance: 0,
        lastValue: 0,
        lastUpdate: Date.now()
    });
    
    app.walletStats.following = app.followedWallets.size;
    
    renderFollowedWallets();
    closeFollowModal();
    saveToStorage();
    showToast(`Following wallet ${nickname || address.slice(0, 8)}...`);
    
    // Start tracking immediately
    trackFollowedWallet(address);
}

function unfollowWallet(address) {
    app.followedWallets.delete(address);
    app.walletStats.following = app.followedWallets.size;
    renderFollowedWallets();
    saveToStorage();
    showToast('Wallet unfollowed');
}

// Utility Functions
function switchSection(section) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[onclick="switchSection('${section}')"]`).classList.add('active');
    
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    if (section === 'market') loadMarketData();
    if (section === 'whale') {
        loadWhaleData();
        renderFollowedWallets();
    }
    if (section === 'social') {
        loadSocialData();
        if (app.wallet.connected) {
            checkAchievements();
        } else {
            renderAchievements();
        }
    }
    if (section === 'alerts') {
        renderAlerts();
    }
}

function setWhaleThreshold(threshold) {
    app.whaleThreshold = threshold;
    document.querySelectorAll('[onclick^="setWhaleThreshold"]').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadWhaleData();
    saveToStorage();
    showToast(`Whale threshold set to ${threshold} SOL`);
}

function setCustomThreshold() {
    const value = parseFloat(document.getElementById('customThreshold').value);
    if (value && value > 0) {
        setWhaleThreshold(value);
        document.getElementById('customThreshold').value = '';
    }
}

async function refreshPortfolio() {
    if (!app.wallet.connected) {
        showToast('Please connect your wallet first');
        return;
    }
    
    showToast('Refreshing...');
    await loadWalletData();
    updateUI();
    
    // Check for new achievements
    const newAchievements = await checkAchievements();
    if (newAchievements > 0) {
        showToast(`🎉 ${newAchievements} new achievement${newAchievements > 1 ? 's' : ''} unlocked!`);
    } else {
        showToast('Portfolio refreshed!');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
}

// Storage Functions
function saveToStorage() {
    if (!app.initialized) return;
    
    try {
        localStorage.setItem('cypher_alerts', JSON.stringify(app.alerts));
        localStorage.setItem('cypher_whale_threshold', app.whaleThreshold.toString());
        localStorage.setItem('cypher_followed_wallets', JSON.stringify([...app.followedWallets]));
        localStorage.setItem('cypher_achievements', JSON.stringify([...app.achievements]));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

// Global function assignments for onclick handlers
window.openFollowModal = openFollowModal;
window.closeFollowModal = closeFollowModal;
window.followWallet = followWallet;
window.unfollowWallet = unfollowWallet;
window.openAlertModal = openAlertModal;
window.closeAlertModal = closeAlertModal;
window.createAlert = createAlert;
window.deleteAlert = deleteAlert;
window.createQuickAlert = createQuickAlert;
window.switchSection = switchSection;
window.setWhaleThreshold = setWhaleThreshold;
window.setCustomThreshold = setCustomThreshold;
window.refreshPortfolio = refreshPortfolio;
window.connectWallet = connectWallet;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app first - CRITICAL!
    initializeApp();
    
    // Initialize Solana connection
    initSolanaConnection();
    
    // Set up wallet connection button
    const connectButton = document.getElementById('connectWallet');
    if (connectButton) {
        connectButton.addEventListener('click', connectWallet);
        console.log('Connect wallet button event listener added');
    } else {
        console.error('Connect wallet button not found');
    }
    
    // Check for existing wallet connection
    setTimeout(checkWalletConnection, 500);
    
    // Only load UI components after app is initialized
    setTimeout(() => {
        loadMarketData();
        updatePortfolioChart();
        renderAchievements();
        renderFollowedWallets();
        renderAlerts();
    }, 100); // Small delay to ensure initialization is complete
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
        if (!app.initialized) return; // Safety check
        
        await loadMarketData();
        
        if (app.wallet.connected) {
            await loadWalletData();
            updateUI();
            await checkAchievements();
            await loadWhaleData();
        }
        
        // Update followed wallets data
        if (app.followedWallets.size > 0) {
            for (const [address] of app.followedWallets) {
                await trackFollowedWallet(address);
            }
            renderFollowedWallets();
        }
    }, 30000);
});