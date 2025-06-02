# 🚀 Cypher Portfolio Analytics Platform

![Cypher Banner](https://img.shields.io/badge/Cypher-Portfolio%20Analytics-ff6b6b?style=for-the-badge)
![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

## 🌟 Overview

Cypher is an advanced Solana blockchain portfolio analytics platform that provides institutional-grade analytics with a consumer-friendly interface. Track your tokens, monitor whale movements, set smart alerts, and compete on leaderboards - all with real-time data and beautiful visualizations.

### ✨ Key Features

- 📊 **Portfolio Analytics** - Real-time tracking with advanced risk metrics
- 🐋 **Whale Monitoring** - Track large transactions and follow successful traders  
- 🔔 **Smart Alerts** - Price, volume, and whale movement notifications
- 📈 **Market Intelligence** - Trending tokens and market sentiment analysis
- 🏆 **Social Trading** - Achievements, leaderboards, and copy trading
- 🔐 **Secure Architecture** - Backend API proxy with authentication

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend"
        A[React/Vanilla JS App] --> B[Chart.js]
        A --> C[Solana Web3.js]
    end
    
    subgraph "Backend Services"
        D[Express API Server] --> E[PostgreSQL + TimescaleDB]
        D --> F[Redis Cache]
        D --> G[WebSocket Server]
    end
    
    subgraph "External APIs"
        H[Solana RPC]
        I[CoinGecko]
        J[Solscan]
    end
    
    A --> D
    A --> G
    D --> H
    D --> I
    D --> J
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Docker & Docker Compose (recommended)
- Solana wallet (Phantom, Solflare, or Backpack)

### 🐳 Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/cypher-portfolio.git
cd cypher-portfolio

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the application:
- Frontend: http://localhost:3000
- API: http://localhost:8080
- WebSocket: ws://localhost:8081

### 💻 Manual Setup

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup PostgreSQL database
createdb cypher_db
psql -d cypher_db -f schema.sql

# Start Redis
redis-server

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npm run migrate

# Start backend server
npm run dev
```

#### Frontend Setup

```bash
cd frontend

# No build step required for vanilla JS
# Serve files with any static server
npx http-server -p 3000 -c-1

# Or use Python
python -m http.server 3000

# Or use Node.js
npx serve -s . -p 3000
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
NODE_ENV=development
PORT=8080

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cypher_db

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# APIs (Required)
SOLSCAN_API_KEY=your-solscan-key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Frontend
ALLOWED_ORIGINS=http://localhost:3000
```

### API Keys Required

1. **Solscan API**: Register at [docs.solscan.io](https://docs.solscan.io/)
2. **Solana RPC** (Optional): Get a private RPC from:
   - [Alchemy](https://www.alchemy.com/)
   - [QuickNode](https://www.quicknode.com/)
   - [Helius](https://helius.dev/)

## 📱 Features Guide

### Portfolio Management
- Connect multiple wallets
- Real-time balance tracking
- Historical performance charts
- Risk analysis and scoring

### Whale Tracking
- Monitor large transactions
- Follow successful traders
- Custom threshold settings
- Real-time alerts

### Smart Alerts
- Price target alerts
- Volume spike detection
- Whale movement notifications
- Multi-condition alerts

### Social Features
- Achievement system
- Community leaderboard
- Wallet following
- Performance sharing

## 🛠️ Development

### Project Structure

```
cypher/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── config.js
│   └── modules/
│       ├── wallet.js
│       ├── market.js
│       ├── analytics.js
│       ├── whale.js
│       ├── alerts.js
│       └── ...
├── backend/
│   ├── backend-server.js
│   ├── schema.sql
│   └── package.json
├── docker-compose.yml
└── README.md
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Style

- ESLint configuration included
- Prettier for formatting
- Follow existing patterns

## 🚀 Production Deployment

### Using Docker

```bash
# Build and start production containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale backend servers
docker-compose up -d --scale backend=3
```

### Manual Deployment

1. **Backend**: Deploy to any Node.js hosting (Heroku, AWS, DigitalOcean)
2. **Database**: Use managed PostgreSQL (AWS RDS, DigitalOcean Managed DB)
3. **Redis**: Use managed Redis (Redis Cloud, AWS ElastiCache)
4. **Frontend**: Deploy to CDN (Vercel, Netlify, Cloudflare Pages)

### Environment-Specific Configs

```bash
# Production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/cypher_db
REDIS_URL=redis://:password@redis-host:6379

# Staging
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-host:5432/cypher_db
```

## 📊 Monitoring & Analytics

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

### Metrics
- Response times
- Error rates
- Active users
- API usage

### Logging
- Structured JSON logs
- Error tracking with Sentry
- Performance monitoring

## 🔒 Security

### Best Practices
- JWT authentication
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

### API Security
- All sensitive endpoints require authentication
- API keys stored securely in backend
- Request signing for critical operations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- Write tests for new features
- Update documentation
- Follow ESLint rules
- Ensure CI passes

## 📝 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure_password"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com", 
  "password": "secure_password"
}
```

### Portfolio Endpoints

```bash
# Get portfolio summary
GET /api/portfolio/summary
Authorization: Bearer <token>

# Get token holdings
GET /api/portfolio/tokens
Authorization: Bearer <token>
```

### Market Data

```bash
# Get market data (public)
GET /api/market/data

# Get trending tokens
GET /api/market/trending
```

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Failed**
- Ensure wallet extension is installed
- Check browser console for errors
- Try refreshing the page

**API Connection Error**
- Verify backend is running
- Check CORS configuration
- Ensure API keys are valid

**Database Connection Failed**
- Check PostgreSQL is running
- Verify connection string
- Ensure database exists

## 📚 Resources

- [Solana Documentation](https://docs.solana.com/)
- [Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [CoinGecko API](https://www.coingecko.com/en/api)
- [Solscan API](https://docs.solscan.io/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Solana Foundation
- Open source contributors
- Beta testers and early users

---

<p align="center">
  Made with ❤️ by the Cypher Team
</p>

<p align="center">
  <a href="https://twitter.com/cypherfinance">Twitter</a> •
  <a href="https://discord.gg/cypherfinance">Discord</a> •
  <a href="https://docs.cypher.finance">Documentation</a>
</p>