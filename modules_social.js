// Social Features Module
// Handles achievements, leaderboard, wallet following, and social trading

import { CONFIG } from '../config.js';

export class SocialManager {
    constructor(app) {
        this.app = app;
        this.state = {
            achievements: new Set(),
            followedWallets: new Map(),
            leaderboard: [],
            userRank: null,
            totalTrades: 0,
            walletPerformanceCache: new Map(),
            currentFilter: {
                leaderboard: 'weekly',
                achievements: 'all'
            }
        };
    }
    
    async loadData() {
        console.log('👥 Loading social data...');
        
        this.loadSavedState();
        await this.loadLeaderboard();
        await this.loadFollowedWallets();
        this.updateUI();
    }
    
    // Achievement System
    checkAchievement(achievementId) {
        if (this.state.achievements.has(achievementId)) return;
        
        const achievement = CONFIG.achievements[achievementId];
        if (!achievement) return;
        
        this.unlockAchievement(achievementId, achievement);
    }
    
    unlockAchievement(achievementId, achievement) {
        this.state.achievements.add(achievementId);
        
        // Show achievement notification
        this.showAchievementToast(achievement);
        
        // Save state
        this.saveState();
        
        // Update UI
        this.updateAchievementsUI();
        this.app.ui.updateElement('achievements', this.state.achievements.size);
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
    
    async checkAllAchievements() {
        const wallet = this.app.wallet;
        if (!wallet.isConnected()) return;
        
        const performance = wallet.getPerformance();
        const tokens = wallet.getTokens();
        
        // Portfolio value achievements
        if (performance.totalValue >= 10000) {
            this.checkAchievement('portfolio_10k');
        }
        if (performance.totalValue >= 100000) {
            this.checkAchievement('portfolio_100k');
        }
        
        // Diversification
        if (tokens.length >= 10) {
            this.checkAchievement('diversified');
        }
        
        // Trading activity
        if (this.state.totalTrades >= 100) {
            this.checkAchievement('trader_pro');
        }
    }
    
    updateTotalTrades(count) {
        this.state.totalTrades = count;
        if (count >= 100) {
            this.checkAchievement('trader_pro');
        }
    }
    
    // Wallet Following System
    async followWallet(event, addressOverride = null) {
        if (event) event.preventDefault();
        
        const addressInput = document.getElementById('walletInput');
        const nicknameInput = document.getElementById('nicknameInput');
        
        const address = addressOverride || (addressInput ? addressInput.value.trim() : '');
        const nickname = nicknameInput ? nicknameInput.value.trim() : null;
        
        if (!address || address.length < 32) {
            this.app.ui.showError('Invalid wallet address');
            return;
        }
        
        try {
            this.app.ui.showLoadingOverlay('Following wallet...');
            
            this.state.followedWallets.set(address, {
                address,
                nickname: nickname || `Wallet ${this.state.followedWallets.size + 1}`,
                followedAt: Date.now(),
                performance: null
            });
            
            await this.loadWalletPerformance(address);
            
            this.saveState();
            this.updateFollowedWalletsUI();
            
            // Check social achievement
            if (this.state.followedWallets.size >= 10) {
                this.checkAchievement('social_butterfly');
            }
            
            this.app.ui.hideLoadingOverlay();
            this.app.ui.showToast('Wallet followed successfully!', 'success');
            
            // Clear form
            if (addressInput) addressInput.value = '';
            if (nicknameInput) nicknameInput.value = '';
            
            this.closeFollowModal();
            
        } catch (error) {
            console.error('Failed to follow wallet:', error);
            this.app.ui.hideLoadingOverlay();
            this.app.ui.showError('Failed to follow wallet');
        }
    }
    
    unfollowWallet(address) {
        this.state.followedWallets.delete(address);
        this.saveState();
        this.updateFollowedWalletsUI();
        this.app.ui.showToast('Wallet unfollowed', 'info');
    }
    
    async loadFollowedWallets() {
        if (this.state.followedWallets.size === 0) return;
        
        try {
            console.log('👥 Loading followed wallets data...');
            
            for (const [address, walletInfo] of this.state.followedWallets) {
                await this.loadWalletPerformance(address);
            }
            
            this.updateFollowedWalletsUI();
            
        } catch (error) {
            console.error('Failed to load followed wallets:', error);
        }
    }
    
    async loadWalletPerformance(address) {
        try {
            let performance = this.state.walletPerformanceCache.get(address);
            
            if (!performance || Date.now() - performance.lastUpdate > 3600000) { // 1 hour cache
                const accountInfo = await this.app.solscanAPI.getAccountInfo(address);
                const tokens = await this.app.solscanAPI.getAccountTokens(address);
                
                let totalValue = 0;
                let tokenCount = 0;
                
                if (accountInfo?.data) {
                    totalValue += (accountInfo.data.lamports / 1e9) * (this.app.market?.getSolPrice() || 0);
                }
                
                if (tokens?.data) {
                    tokenCount = tokens.data.length;
                }
                
                performance = {
                    totalValue,
                    tokenCount,
                    lastActivity: Date.now(),
                    lastUpdate: Date.now()
                };
                
                this.state.walletPerformanceCache.set(address, performance);
            }
            
            // Update wallet info
            const walletInfo = this.state.followedWallets.get(address);
            if (walletInfo) {
                walletInfo.performance = performance;
            }
            
        } catch (error) {
            console.error(`Failed to load performance for ${address}:`, error);
        }
    }
    
    // Leaderboard
    async loadLeaderboard(timeframe = 'weekly') {
        try {
            console.log('🏆 Loading leaderboard...');
            
            const leaderboardData = [];
            
            // Add current user
            if (this.app.wallet.isConnected()) {
                leaderboardData.push({
                    rank: 1,
                    address: this.app.wallet.getPublicKey(),
                    nickname: 'You',
                    totalValue: this.app.wallet.getPerformance().totalValue,
                    change: this.app.wallet.getPerformance().dayChangePercent,
                    tokenCount: this.app.wallet.getTokens().length,
                    isCurrentUser: true
                });
            }
            
            // Add followed wallets
            let rank = 2;
            for (const [address, info] of this.state.followedWallets) {
                if (info.performance) {
                    leaderboardData.push({
                        rank: rank++,
                        address,
                        nickname: info.nickname || `Wallet ${rank}`,
                        totalValue: info.performance.totalValue,
                        change: 0, // Would calculate from historical data
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
            
            this.state.leaderboard = leaderboardData;
            
            // Update user rank
            const userEntry = leaderboardData.find(e => e.isCurrentUser);
            if (userEntry) {
                this.state.userRank = userEntry.rank;
                this.app.ui.updateElement('socialRank', `#${userEntry.rank}`);
            }
            
            this.updateLeaderboardUI();
            
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    }
    
    filterLeaderboard(period) {
        this.state.currentFilter.leaderboard = period;
        this.loadLeaderboard(period);
        this.app.ui.showToast(`Leaderboard: ${period}`, 'info');
    }
    
    filterAchievements(filter) {
        this.state.currentFilter.achievements = filter;
        this.updateAchievementsUI();
        this.app.ui.showToast(`Achievements: ${filter}`, 'info');
    }
    
    // UI Updates
    updateUI() {
        this.updateFollowedWalletsUI();
        this.updateLeaderboardUI();
        this.updateAchievementsUI();
        this.updateStats();
    }
    
    updateStats() {
        this.app.ui.updateElement('followers', '0'); // In production, from backend
        this.app.ui.updateElement('following', this.state.followedWallets.size);
        this.app.ui.updateElement('achievements', this.state.achievements.size);
        this.app.ui.updateElement('copyTrades', '0'); // Feature not implemented
    }
    
    updateFollowedWalletsUI() {
        const container = document.getElementById('followedWallets');
        if (!container) return;
        
        if (this.state.followedWallets.size === 0) {
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
        
        const walletsHtml = Array.from(this.state.followedWallets.entries()).map(([address, info]) => `
            <div class="followed-wallet-item">
                <div class="wallet-header">
                    <div class="wallet-info">
                        <h4>${info.nickname || this.app.ui.formatAddress(address)}</h4>
                        <span class="wallet-address">${this.app.ui.formatAddress(address)}</span>
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
                        <span class="stat-value">${info.performance?.lastActivity ? this.app.ui.formatTimeAgo(info.performance.lastActivity) : 'Unknown'}</span>
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
        
        // Update followed count
        this.app.ui.updateElement('followedCount', this.state.followedWallets.size);
    }
    
    updateLeaderboardUI() {
        const container = document.getElementById('leaderboard');
        if (!container) return;
        
        if (this.state.leaderboard.length === 0) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            return;
        }
        
        container.innerHTML = this.state.leaderboard.map(entry => `
            <div class="leaderboard-item ${entry.isCurrentUser ? 'current-user' : ''}">
                <div class="rank-badge">#${entry.rank}</div>
                <div class="trader-info">
                    <h4>${entry.nickname}</h4>
                    <span class="trader-address">${this.app.ui.formatAddress(entry.address)}</span>
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
        
        const filter = this.state.currentFilter.achievements;
        
        let achievements = Object.entries(CONFIG.achievements).map(([id, def]) => ({
            id,
            ...def,
            unlocked: this.state.achievements.has(id)
        }));
        
        // Apply filter
        if (filter === 'unlocked') {
            achievements = achievements.filter(a => a.unlocked);
        } else if (filter === 'locked') {
            achievements = achievements.filter(a => !a.unlocked);
        }
        
        container.innerHTML = achievements.map(achievement => `
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
                            <span class="unlock-date">Unlocked</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Modal Management
    openFollowModal() {
        const modal = document.getElementById('followModal');
        if (modal) modal.style.display = 'flex';
    }
    
    closeFollowModal() {
        const modal = document.getElementById('followModal');
        if (modal) modal.style.display = 'none';
    }
    
    // Placeholder Methods
    sharePortfolio() {
        this.app.ui.showToast('Portfolio sharing coming soon', 'info');
    }
    
    findTraders() {
        this.app.ui.showToast('Find traders feature coming soon', 'info');
    }
    
    joinCommunity() {
        this.app.ui.showToast('Community features coming soon', 'info');
    }
    
    viewWalletDetails(address) {
        this.app.ui.showToast('Wallet details view coming soon', 'info');
    }
    
    copyWalletTrades(address) {
        this.app.ui.showToast('Copy trading feature coming soon', 'info');
    }
    
    // State Management
    saveState() {
        try {
            const state = {
                achievements: Array.from(this.state.achievements),
                followedWallets: Array.from(this.state.followedWallets.entries()),
                totalTrades: this.state.totalTrades
            };
            localStorage.setItem('cypher_social_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save social state:', error);
        }
    }
    
    loadSavedState() {
        try {
            const saved = localStorage.getItem('cypher_social_state');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.achievements) {
                    this.state.achievements = new Set(data.achievements);
                }
                if (data.followedWallets) {
                    this.state.followedWallets = new Map(data.followedWallets);
                }
                if (data.totalTrades) {
                    this.state.totalTrades = data.totalTrades;
                }
            }
        } catch (error) {
            console.warn('Failed to load social state:', error);
        }
    }
    
    getAchievements() {
        return Array.from(this.state.achievements);
    }
    
    loadAchievements(achievements) {
        this.state.achievements = new Set(achievements);
    }
}