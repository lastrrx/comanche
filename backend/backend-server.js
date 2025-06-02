// Cypher Backend Server
// Secure API proxy and authentication server

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const Redis = require('ioredis');
const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Database connections
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

// External API configurations
const APIS = {
    SOLSCAN_KEY: process.env.SOLSCAN_API_KEY,
    SOLSCAN_BASE: 'https://api-v2.solscan.io',
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    SOLANA_RPC: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
};

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Optional auth middleware (for features that work with or without auth)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
        });
    }
    next();
};

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: {
            database: db ? 'connected' : 'disconnected',
            redis: redis.status === 'ready' ? 'connected' : 'disconnected'
        }
    });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, walletAddress } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.query(
            'INSERT INTO users (email, password_hash, wallet_address) VALUES ($1, $2, $3) RETURNING id, email',
            [email, hashedPassword, walletAddress]
        );
        
        const user = result.rows[0];
        
        // Generate tokens
        const authToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        
        res.json({
            authToken,
            refreshToken,
            expiresIn: 3600,
            user: { id: user.id, email: user.email }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get user
        const result = await db.query(
            'SELECT id, email, password_hash FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate tokens
        const authToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        
        res.json({
            authToken,
            refreshToken,
            expiresIn: 3600,
            user: { id: user.id, email: user.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }
        
        jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
            if (err) return res.status(403).json({ error: 'Invalid refresh token' });
            
            // Get user
            const result = await db.query(
                'SELECT id, email FROM users WHERE id = $1',
                [decoded.id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = result.rows[0];
            
            // Generate new tokens
            const authToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
            const newRefreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
            
            res.json({
                authToken,
                refreshToken: newRefreshToken,
                expiresIn: 3600
            });
        });
        
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user,
        expiresIn: req.user.exp - Math.floor(Date.now() / 1000)
    });
});

// Market data endpoints (public)
app.get('/api/market/data', optionalAuth, async (req, res) => {
    try {
        // Check cache first
        const cached = await redis.get('market:data:sol');
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        // Fetch from CoinGecko
        const response = await axios.get(
            `${APIS.COINGECKO_BASE}/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
        );
        
        const data = {
            solPrice: response.data.solana?.usd || 0,
            marketCap: response.data.solana?.usd_market_cap || 0,
            volume24h: response.data.solana?.usd_24h_vol || 0,
            priceChange24h: response.data.solana?.usd_24h_change || 0
        };
        
        // Cache for 2 minutes
        await redis.setex('market:data:sol', 120, JSON.stringify(data));
        
        res.json(data);
        
    } catch (error) {
        console.error('Market data error:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

app.get('/api/market/trending', optionalAuth, async (req, res) => {
    try {
        // Check cache
        const cached = await redis.get('market:trending');
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        // Fetch from CoinGecko
        const response = await axios.get(`${APIS.COINGECKO_BASE}/search/trending`);
        
        const trending = response.data.coins.slice(0, 10).map((coin, index) => ({
            id: coin.item.id,
            symbol: coin.item.symbol.toUpperCase(),
            name: coin.item.name,
            rank: coin.item.market_cap_rank || (index + 1),
            thumb: coin.item.thumb,
            trending_rank: index + 1
        }));
        
        // Cache for 10 minutes
        await redis.setex('market:trending', 600, JSON.stringify(trending));
        
        res.json(trending);
        
    } catch (error) {
        console.error('Trending tokens error:', error);
        res.status(500).json({ error: 'Failed to fetch trending tokens' });
    }
});

app.post('/api/market/prices', optionalAuth, async (req, res) => {
    try {
        const { tokenIds } = req.body;
        
        if (!tokenIds || !Array.isArray(tokenIds)) {
            return res.status(400).json({ error: 'Token IDs array required' });
        }
        
        // Check cache for each token
        const prices = {};
        const uncachedTokens = [];
        
        for (const tokenId of tokenIds) {
            const cached = await redis.get(`price:${tokenId}`);
            if (cached) {
                prices[tokenId] = JSON.parse(cached);
            } else {
                uncachedTokens.push(tokenId);
            }
        }
        
        // Fetch uncached tokens
        if (uncachedTokens.length > 0) {
            const response = await axios.get(
                `${APIS.COINGECKO_BASE}/simple/price?ids=${uncachedTokens.join(',')}&vs_currencies=usd&include_24hr_change=true`
            );
            
            // Cache results
            for (const [tokenId, data] of Object.entries(response.data)) {
                prices[tokenId] = data;
                await redis.setex(`price:${tokenId}`, 60, JSON.stringify(data));
            }
        }
        
        res.json(prices);
        
    } catch (error) {
        console.error('Token prices error:', error);
        res.status(500).json({ error: 'Failed to fetch token prices' });
    }
});

// Solana data endpoints (protected)
app.get('/api/solana/account/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        
        // Check cache
        const cached = await redis.get(`account:${address}`);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        // Fetch from Solscan
        const response = await axios.get(
            `${APIS.SOLSCAN_BASE}/account/${address}`,
            {
                headers: {
                    'Authorization': `Bearer ${APIS.SOLSCAN_KEY}`
                }
            }
        );
        
        // Cache for 5 minutes
        await redis.setex(`account:${address}`, 300, JSON.stringify(response.data));
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Account info error:', error);
        res.status(500).json({ error: 'Failed to fetch account info' });
    }
});

app.get('/api/solana/holders/:tokenAddress', authenticateToken, async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        
        // Fetch from Solscan
        const response = await axios.get(
            `${APIS.SOLSCAN_BASE}/token/holders`,
            {
                headers: {
                    'Authorization': `Bearer ${APIS.SOLSCAN_KEY}`
                },
                params: { tokenAddress, limit, offset }
            }
        );
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Token holders error:', error);
        res.status(500).json({ error: 'Failed to fetch token holders' });
    }
});

// Whale movements endpoint
app.get('/api/whale/movements', optionalAuth, async (req, res) => {
    try {
        const { tokenAddress, limit = 50, minAmount = 1000000 } = req.query;
        
        // For demo, return mock data
        // In production, would fetch from Solscan or other whale tracking service
        const movements = [
            {
                tokenAddress: tokenAddress || 'So11111111111111111111111111111111111111112',
                tokenSymbol: 'SOL',
                src: '7VJsBtJzgTftYzEeooSDYyjKXvYRWJHdwvbwfBvTg9K',
                dst: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
                amount: 125000000000000, // 125k SOL
                decimals: 9,
                value: 12500000, // $12.5M
                blockTime: Math.floor(Date.now() / 1000) - 300,
                txHash: '4qPLH1kJqGW9cfJxKNfYmfW5XBHfTZPDzZajRPcQhWxkQPxsXoLWh3X9QvGvjdPCH9HneFfWF6F5gKvJYZLKZNU'
            }
        ];
        
        res.json({ data: movements });
        
    } catch (error) {
        console.error('Whale movements error:', error);
        res.status(500).json({ error: 'Failed to fetch whale movements' });
    }
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'auth':
                    // Verify JWT token
                    jwt.verify(data.token, JWT_SECRET, (err, user) => {
                        if (!err) {
                            ws.userId = user.id;
                            ws.send(JSON.stringify({ type: 'auth_success' }));
                        } else {
                            ws.send(JSON.stringify({ type: 'auth_error' }));
                        }
                    });
                    break;
                    
                case 'subscribe':
                    // Subscribe to channel
                    ws.channels = ws.channels || new Set();
                    ws.channels.add(data.channel);
                    break;
                    
                case 'unsubscribe':
                    // Unsubscribe from channel
                    if (ws.channels) {
                        ws.channels.delete(data.channel);
                    }
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Broadcast function for real-time updates
function broadcast(channel, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.channels?.has(channel)) {
            client.send(JSON.stringify({ type: channel, data }));
        }
    });
}

// Example: Simulate price updates every 30 seconds
setInterval(() => {
    const priceUpdate = {
        symbol: 'SOL',
        price: 100 + (Math.random() - 0.5) * 10,
        change24h: (Math.random() - 0.5) * 10
    };
    broadcast('price_update', priceUpdate);
}, 30000);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Cypher backend server running on port ${PORT}`);
    console.log(`📡 WebSocket server running on port 8081`);
});