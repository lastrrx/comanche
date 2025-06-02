// Cypher Portfolio Analytics - Configuration
// Secure configuration with backend API proxy support

export const CONFIG = {
    // Backend API endpoint (to be set up)
    api: {
        baseUrl: process.env.CYPHER_API_URL || 'http://localhost:8080/api',
        timeout: 30000,
        retryAttempts: 3
    },
    
    // Public configurations only - no sensitive keys
    apis: {
        solana: {
            endpoints: [
                {
                    // Public endpoints only
                    url: 'https://api.mainnet-beta.solana.com',
                    network: 'mainnet',
                    name: 'Solana Labs Public'
                },
                {
                    url: 'https://solana-api.projectserum.com',
                    network: 'mainnet', 
                    name: 'Project Serum'
                }
            ]
        },
        // External API configurations moved to backend
        backend: {
            endpoints: {
                marketData: '/market/data',
                trending: '/market/trending',
                tokenPrices: '/market/prices',
                whaleMovements: '/whale/movements',
                accountInfo: '/solana/account',
                tokenHolders: '/solana/holders'
            }
        }
    },
    
    // Feature flags for gradual backend migration
    features: {
        useBackendProxy: true,
        requireAuth: false, // Will be enabled after auth implementation
        enableWebSocket: false,
        enableCopyTrading: false,
        enableExport: true,
        enableAdvancedAnalytics: true
    },
    
    // Client-side token registry remains unchanged
    tokenRegistry: {
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
        }
    },
    
    riskWeights: {
        marketCapRisk: 0.3,
        concentrationRisk: 0.25,
        diversificationRisk: 0.2,
        volatilityRisk: 0.15,
        liquidityRisk: 0.1
    },
    
    achievements: {
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
        'early_adopter': {
            name: 'Early Adopter',
            description: 'Among the first 1000 users',
            icon: 'fa-rocket',
            points: 100
        },
        'social_butterfly': {
            name: 'Social Butterfly',
            description: 'Follow 10+ successful traders',
            icon: 'fa-users',
            points: 40
        }
    },
    
    updateIntervals: {
        marketData: 120000,      // 2 minutes
        portfolio: 300000,       // 5 minutes
        whaleTracking: 180000,   // 3 minutes
        trending: 600000,        // 10 minutes
        cacheCleanup: 600000,    // 10 minutes
        healthCheck: 60000       // 1 minute for backend health
    },
    
    cache: {
        ttl: {
            default: 120000,
            marketData: 120000,
            tokenPrices: 60000,
            walletData: 30000,
            trendingTokens: 600000,
            walletPerformance: 300000,
            whaleMovements: 180000,
            accountInfo: 300000
        },
        maxSize: 100, // Maximum cache entries
        strategy: 'LRU' // Least Recently Used
    },
    
    ui: {
        chartHeight: 400,
        maxTokensDisplay: 20,
        toastDuration: 3000,
        animationDuration: 300,
        debounceDelay: 300,
        throttleDelay: 1000
    },
    
    // Security configurations
    security: {
        maxRequestsPerMinute: 60,
        sessionTimeout: 3600000, // 1 hour
        requireHttps: true,
        csrfProtection: true,
        allowedOrigins: [
            'http://localhost:3000',
            'https://cypher.finance'
        ]
    },
    
    // Error tracking
    errorTracking: {
        enabled: true,
        sampleRate: 0.1, // 10% of errors
        ignoredErrors: [
            'Network request failed',
            'User rejected request'
        ]
    }
};