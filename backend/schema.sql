-- Cypher Portfolio Analytics Database Schema
-- PostgreSQL Schema with TimescaleDB for time-series data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(44),
    username VARCHAR(50) UNIQUE,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    notifications JSONB DEFAULT '{"email": true, "browser": true, "whale": true}',
    display_currency VARCHAR(3) DEFAULT 'USD',
    privacy_settings JSONB DEFAULT '{"public_portfolio": false, "show_in_leaderboard": true}',
    ui_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Authentication sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Portfolios (users can have multiple portfolios)
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    wallet_addresses TEXT[] NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolios_user ON portfolios(user_id);

-- Portfolio snapshots (time-series data)
CREATE TABLE portfolio_snapshots (
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_value DECIMAL(20, 2) NOT NULL,
    token_count INTEGER NOT NULL,
    holdings JSONB NOT NULL,
    performance_24h DECIMAL(10, 2),
    performance_7d DECIMAL(10, 2),
    performance_30d DECIMAL(10, 2),
    PRIMARY KEY (portfolio_id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('portfolio_snapshots', 'timestamp');

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    token_address VARCHAR(44),
    conditions JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_active ON alerts(active);
CREATE INDEX idx_alerts_token ON alerts(token_address);

-- Alert history
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    trigger_value JSONB,
    notification_sent BOOLEAN DEFAULT false,
    tx_hash VARCHAR(88)
);

CREATE INDEX idx_alert_history_alert ON alert_history(alert_id);
CREATE INDEX idx_alert_history_time ON alert_history(triggered_at);

-- Followed wallets
CREATE TABLE followed_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(44) NOT NULL,
    nickname VARCHAR(100),
    notes TEXT,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, wallet_address)
);

CREATE INDEX idx_followed_user ON followed_wallets(user_id);
CREATE INDEX idx_followed_wallet ON followed_wallets(wallet_address);

-- User achievements
CREATE TABLE user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    points INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);

-- Trading activity (for analytics)
CREATE TABLE trading_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    tx_hash VARCHAR(88) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'buy', 'sell', 'swap'
    token_from VARCHAR(44),
    token_to VARCHAR(44),
    amount_from DECIMAL(20, 8),
    amount_to DECIMAL(20, 8),
    value_usd DECIMAL(20, 2),
    fee_sol DECIMAL(10, 8),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trading_user ON trading_activity(user_id);
CREATE INDEX idx_trading_portfolio ON trading_activity(portfolio_id);
CREATE INDEX idx_trading_time ON trading_activity(timestamp);

-- Whale movements cache
CREATE TABLE whale_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(44) NOT NULL,
    token_symbol VARCHAR(20),
    from_address VARCHAR(44) NOT NULL,
    to_address VARCHAR(44) NOT NULL,
    amount DECIMAL(30, 8) NOT NULL,
    value_usd DECIMAL(20, 2),
    tx_hash VARCHAR(88) UNIQUE NOT NULL,
    block_time TIMESTAMP WITH TIME ZONE NOT NULL,
    impact_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whale_token ON whale_movements(token_address);
CREATE INDEX idx_whale_time ON whale_movements(block_time);
CREATE INDEX idx_whale_value ON whale_movements(value_usd);

-- Market data cache
CREATE TABLE market_data (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price_usd DECIMAL(20, 8) NOT NULL,
    market_cap DECIMAL(20, 2),
    volume_24h DECIMAL(20, 2),
    change_24h DECIMAL(10, 2),
    PRIMARY KEY (symbol, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('market_data', 'timestamp');

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_time ON api_usage(timestamp);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics
CREATE VIEW portfolio_performance AS
SELECT 
    p.id as portfolio_id,
    p.user_id,
    p.name as portfolio_name,
    ps.timestamp,
    ps.total_value,
    ps.performance_24h,
    ps.performance_7d,
    ps.performance_30d,
    LAG(ps.total_value) OVER (PARTITION BY p.id ORDER BY ps.timestamp) as previous_value
FROM portfolios p
JOIN portfolio_snapshots ps ON p.id = ps.portfolio_id;

CREATE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT p.id) as portfolio_count,
    COUNT(DISTINCT fw.wallet_address) as followed_wallets_count,
    COUNT(DISTINCT a.id) as active_alerts_count,
    SUM(ua.points) as total_achievement_points,
    MAX(ps.total_value) as max_portfolio_value
FROM users u
LEFT JOIN portfolios p ON u.id = p.user_id
LEFT JOIN followed_wallets fw ON u.id = fw.user_id
LEFT JOIN alerts a ON u.id = a.user_id AND a.active = true
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN portfolio_snapshots ps ON p.id = ps.portfolio_id
GROUP BY u.id, u.email;

-- Indexes for performance
CREATE INDEX idx_portfolio_snapshots_value ON portfolio_snapshots(total_value);
CREATE INDEX idx_whale_movements_impact ON whale_movements(impact_level);
CREATE INDEX idx_market_data_symbol ON market_data(symbol);

-- Initial data
INSERT INTO users (email, password_hash, wallet_address) VALUES 
('demo@cypher.finance', '$2b$10$demopasswordhash', 'DemoWalletAddress123456789');

-- Permissions (for production, create separate roles)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO cypher_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cypher_app;