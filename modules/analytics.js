// Analytics Engine Module
// Handles portfolio analytics, risk calculations, and performance metrics

import { CONFIG } from '../config.js';

export class AnalyticsEngine {
    constructor(app) {
        this.app = app;
        this.state = {
            performanceMetrics: {},
            riskMetrics: {},
            tradingPatterns: {},
            diversificationMetrics: {},
            heatmapData: []
        };
    }
    
    async loadData() {
        if (!this.app.wallet.isConnected()) {
            this.showPlaceholder();
            return;
        }
        
        try {
            console.log('📊 Loading analytics data...');
            await this.calculate();
            this.updateUI();
            console.log('✅ Analytics data loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load analytics data:', error);
            this.showError();
        }
    }
    
    async calculate() {
        const tokens = this.app.wallet.getTokens();
        const performance = this.app.wallet.getPerformance();
        
        if (!tokens.length) return;
        
        this.state.performanceMetrics = this.calculatePerformanceMetrics(tokens);
        this.state.riskMetrics = this.calculateRiskScore(tokens, performance.totalValue);
        this.state.tradingPatterns = this.analyzeTradingPatterns(tokens);
        this.state.diversificationMetrics = this.calculateDiversification(tokens, performance.totalValue);
        this.state.heatmapData = this.generateHeatmapData(tokens);
    }
    
    calculatePerformanceMetrics(tokens) {
        // Win rate
        const positiveTokens = tokens.filter(token => token.change24h > 0);
        const winRate = Math.round((positiveTokens.length / tokens.length) * 100);
        
        // Best and worst performers
        const bestPerformer = tokens.reduce((best, token) => 
            token.change24h > best.change24h ? token : best
        );
        const worstPerformer = tokens.reduce((worst, token) => 
            token.change24h < worst.change24h ? token : worst
        );
        
        // Volatility
        const changes = tokens.map(token => token.change24h);
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        const variance = changes.reduce((acc, change) => 
            acc + Math.pow(change - avgChange, 2), 0
        ) / changes.length;
        const volatility = Math.sqrt(variance);
        
        // Sharpe ratio (simplified)
        const riskFreeRate = 2; // 2% assumption
        const excessReturn = avgChange - riskFreeRate;
        const sharpeRatio = volatility > 0 ? (excessReturn / volatility) : 0;
        
        return {
            winRate,
            sharpeRatio: Math.round(sharpeRatio * 100) / 100,
            volatility: Math.round(volatility * 100) / 100,
            bestPerformer: {
                symbol: bestPerformer.symbol,
                change: bestPerformer.change24h
            },
            worstPerformer: {
                symbol: worstPerformer.symbol,
                change: worstPerformer.change24h
            },
            totalTrades: tokens.length
        };
    }
    
    calculateRiskScore(tokens, totalValue) {
        const weights = CONFIG.riskWeights;
        
        // Calculate individual risk components
        const marketCapRisk = this.calculateMarketCapRisk(tokens, totalValue);
        const concentrationRisk = this.calculateConcentrationRisk(tokens, totalValue);
        const diversificationRisk = this.calculateDiversificationRisk(tokens);
        const volatilityRisk = this.calculateVolatilityRisk(tokens);
        const liquidityRisk = this.calculateLiquidityRisk(tokens, totalValue);
        
        // Weighted risk score
        const riskScore = Math.round(
            (marketCapRisk.score * weights.marketCapRisk) +
            (concentrationRisk.score * weights.concentrationRisk) +
            (diversificationRisk.score * weights.diversificationRisk) +
            (volatilityRisk.score * weights.volatilityRisk) +
            (liquidityRisk.score * weights.liquidityRisk)
        );
        
        // Risk level
        let riskLevel;
        if (riskScore >= 70) riskLevel = 'High';
        else if (riskScore >= 40) riskLevel = 'Medium';
        else riskLevel = 'Low';
        
        return {
            riskScore,
            riskLevel,
            marketCapRisk: marketCapRisk.level,
            concentrationRisk: concentrationRisk.level,
            volatilityRisk: volatilityRisk.level,
            liquidityRisk: liquidityRisk.level
        };
    }
    
    calculateMarketCapRisk(tokens, totalValue) {
        let riskScore = 0;
        
        tokens.forEach(token => {
            const weight = token.value / totalValue;
            const tokenMeta = CONFIG.tokenRegistry[token.address];
            let tierScore;
            
            switch (tokenMeta?.marketCapTier || 'nano') {
                case 'large': tierScore = 10; break;
                case 'medium': tierScore = 30; break;
                case 'small': tierScore = 50; break;
                case 'micro': tierScore = 75; break;
                case 'nano': tierScore = 95; break;
                default: tierScore = 80; break;
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
            score = 10; level = 'Low';
        } else if (tokenCount >= 10) {
            score = 20; level = 'Low';
        } else if (tokenCount >= 6) {
            score = 40; level = 'Medium';
        } else if (tokenCount >= 3) {
            score = 65; level = 'High';
        } else {
            score = 85; level = 'High';
        }
        
        return { score, level, tokenCount };
    }
    
    calculateVolatilityRisk(tokens) {
        if (!tokens.length) return { score: 0, level: 'Low' };
        
        const changes = tokens.map(token => Math.abs(token.change24h));
        const avgVolatility = changes.reduce((a, b) => a + b, 0) / changes.length;
        
        let score, level;
        if (avgVolatility >= 15) {
            score = 85; level = 'High';
        } else if (avgVolatility >= 10) {
            score = 65; level = 'High';
        } else if (avgVolatility >= 5) {
            score = 45; level = 'Medium';
        } else if (avgVolatility >= 2) {
            score = 25; level = 'Low';
        } else {
            score = 10; level = 'Low';
        }
        
        return { score, level, avgVolatility };
    }
    
    calculateLiquidityRisk(tokens, totalValue) {
        // Simplified liquidity risk based on token types
        let weightedLiquidityScore = 0;
        
        tokens.forEach(token => {
            const weight = token.value / totalValue;
            const tokenMeta = CONFIG.tokenRegistry[token.address];
            let liquidityScore;
            
            switch (tokenMeta?.liquidityTier || 'low') {
                case 'high': liquidityScore = 10; break;
                case 'medium': liquidityScore = 40; break;
                case 'low': liquidityScore = 85; break;
                default: liquidityScore = 85; break;
            }
            
            weightedLiquidityScore += liquidityScore * weight;
        });
        
        const score = Math.round(weightedLiquidityScore);
        let level;
        if (score >= 60) level = 'High';
        else if (score >= 35) level = 'Medium';
        else level = 'Low';
        
        return { score, level };
    }
    
    calculateDiversification(tokens, totalValue) {
        const tokenCount = tokens.length;
        let diversificationScore = Math.min(100, tokenCount * 8);
        
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
            totalTransactions: tokenCount,
            avgHoldTime: '3-6 months' // Simplified
        };
    }
    
    analyzeTradingPatterns(tokens) {
        // Simplified pattern analysis
        const hour = new Date().getHours();
        let mostActiveTime;
        if (hour >= 9 && hour <= 17) {
            mostActiveTime = '9 AM - 5 PM (Business Hours)';
        } else if (hour >= 18 && hour <= 22) {
            mostActiveTime = '6 PM - 10 PM (Evening)';
        } else {
            mostActiveTime = '10 PM - 8 AM (Night/Early Morning)';
        }
        
        let tradingFrequency;
        if (tokens.length >= 15) tradingFrequency = 'Very High Activity';
        else if (tokens.length >= 10) tradingFrequency = 'High Activity';
        else if (tokens.length >= 5) tradingFrequency = 'Moderate Activity';
        else tradingFrequency = 'Low Activity';
        
        return {
            mostActiveTime,
            tradingFrequency,
            avgPositionDuration: tokens.length >= 10 ? '2-4 weeks' : '3+ months'
        };
    }
    
    generateHeatmapData(tokens) {
        return tokens.slice(0, 15).map(token => {
            const tokenMeta = CONFIG.tokenRegistry[token.address];
            return {
                symbol: token.symbol,
                value: token.value,
                change24h: token.change24h,
                risk: this.getTokenRiskLevel(token, tokenMeta)
            };
        });
    }
    
    getTokenRiskLevel(token, tokenMeta) {
        let riskScore = 0;
        
        // Market cap risk
        switch (tokenMeta?.marketCapTier || 'nano') {
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
        
        if (riskScore >= 6) return 'High';
        if (riskScore >= 3) return 'Medium';
        return 'Low';
    }
    
    updateUI() {
        const metrics = this.state.performanceMetrics;
        const risk = this.state.riskMetrics;
        const patterns = this.state.tradingPatterns;
        const diversification = this.state.diversificationMetrics;
        
        // Update performance metrics
        this.app.ui.updateElement('winRate', `${metrics.winRate}%`);
        this.app.ui.updateElement('totalTrades', `${metrics.totalTrades} positions`);
        this.app.ui.updateElement('sharpeRatio', metrics.sharpeRatio.toFixed(2));
        
        if (metrics.bestPerformer) {
            this.app.ui.updateElement('bestPerformer', metrics.bestPerformer.symbol);
            this.app.ui.updateElement('bestGain', `+${metrics.bestPerformer.change.toFixed(2)}%`);
        }
        
        // Update risk indicators
        this.app.ui.updateElement('riskScore', risk.riskScore);
        this.app.ui.updateElement('riskLevel', `${risk.riskLevel} Risk Portfolio`);
        this.app.ui.updateElement('concentrationRisk', risk.concentrationRisk);
        this.app.ui.updateElement('volatilityRisk', risk.volatilityRisk);
        this.app.ui.updateElement('liquidityRisk', risk.liquidityRisk);
        
        // Update trading patterns
        this.app.ui.updateElement('mostActiveTime', patterns.mostActiveTime);
        this.app.ui.updateElement('tradingFrequency', patterns.tradingFrequency);
        this.app.ui.updateElement('avgPositionDuration', patterns.avgPositionDuration);
        
        // Update diversification
        this.app.ui.updateElement('diversificationScore', `${diversification.diversificationScore}/100`);
        this.app.ui.updateElement('largestPosition', diversification.largestPosition);
        this.app.ui.updateElement('totalTransactions', diversification.totalTransactions);
        this.app.ui.updateElement('avgHoldTime', diversification.avgHoldTime);
        
        // Update progress bar
        const progressBar = document.getElementById('diversificationProgress');
        if (progressBar) {
            progressBar.style.width = `${diversification.diversificationScore}%`;
        }
        
        // Update heatmap
        this.updateHeatmap();
    }
    
    updateHeatmap() {
        const container = document.getElementById('performanceHeatmap');
        if (!container) return;
        
        const heatmapData = this.state.heatmapData;
        
        if (!heatmapData || heatmapData.length === 0) {
            container.innerHTML = '<div class="heatmap-loading"><i class="fas fa-chart-bar"></i><p>No data available</p></div>';
            return;
        }
        
        container.innerHTML = `
            <div class="heatmap-grid">
                ${heatmapData.map(token => {
                    const isPositive = token.change24h >= 0;
                    const intensity = Math.min(Math.abs(token.change24h) / 20, 1);
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
    
    showPlaceholder() {
        this.app.ui.updateElement('winRate', '0%');
        this.app.ui.updateElement('totalTrades', '0 trades');
        this.app.ui.updateElement('sharpeRatio', '0.0');
        this.app.ui.updateElement('bestPerformer', 'Connect Wallet');
        this.app.ui.updateElement('bestGain', '+0%');
        this.app.ui.updateElement('mostActiveTime', 'Connect wallet to analyze');
        this.app.ui.updateElement('tradingFrequency', 'Connect wallet to analyze');
        this.app.ui.updateElement('avgPositionDuration', 'Connect wallet to analyze');
        
        const heatmapContainer = document.getElementById('performanceHeatmap');
        if (heatmapContainer) {
            heatmapContainer.innerHTML = '<div class="heatmap-loading"><i class="fas fa-spinner fa-spin"></i><p>Connect wallet to generate heatmap...</p></div>';
        }
    }
    
    showError() {
        this.app.ui.showToast('Failed to load analytics data', 'error');
        this.showPlaceholder();
    }
    
    generateReport() {
        // Generate a comprehensive analytics report
        this.app.ui.showToast('Analytics report generation coming soon', 'info');
        
        // In production, this would:
        // 1. Compile all analytics data
        // 2. Generate PDF/CSV report
        // 3. Include charts and insights
        // 4. Download to user's device
    }
}