// Cypher Portfolio Analytics - Configuration
// Centralized configuration for API keys, endpoints, and settings

export const CONFIG = {
    apis: {
        solana: {
            endpoints: [
                {
                    url: 'https://solana-mainnet.rpc.extrnode.com/e0c37480-5843-44e5-bf0e-d0bb97addc76',
                    network: 'mainnet',
                    name: 'Extrnode'
                },
                {
                    url: 'https://api.mainnet-beta.solana.com',
                    network: 'mainnet',
                    name: 'Solana Labs'
                }
            ]
        },
        coingecko: {
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
    },
    
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
        }
    },
    
    updateIntervals: {
        marketData: 120000,      // 2 minutes
        portfolio: 300000,       // 5 minutes
        whaleTracking: 180000,   // 3 minutes
        trending: 600000,        // 10 minutes
        cacheCleanup: 600000     // 10 minutes
    },
    
    cache: {
        ttl: {
            default: 120000,
            marketData: 120000,
            tokenPrices: 60000,
            walletData: 30000,
            trendingTokens: 600000,
            walletPerformance: 300000,
            whaleMovements: 180000
        }
    },
    
    ui: {
        chartHeight: 400,
        maxTokensDisplay: 20,
        toastDuration: 3000,
        animationDuration: 300
    }
};