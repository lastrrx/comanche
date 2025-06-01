// Whale Tracking Module
// Monitors large transactions and whale wallet activities

import { CONFIG } from '../config.js';

export class WhaleTracker {
    constructor(app) {
        this.app = app;
        this.state = {
            recentMovements: [],
            topHolders: new Map(),
            monitoredTokens: new Set(),
            thresholdSOL: 50,
            filter: 'all',
            settings: {
                whaleNotifications: true,
                followedTraderNotifications: true
            }
        };
    }
    
    async loadData() {
        console.log('🐋 Loading whale data...');
        
        // Start monitoring user's tokens
        if (this.app.wallet.isConnected()) {
            await this.startMonitoring();
        }
        
        // Update UI
        this.updateMovementsUI();
        this.updateStats();
    }
    
    async startMonitoring() {
        const tokens = this.app.wallet.getTokens();
        if (!tokens.length) return;
        
        try {
            console.log('🐋 Starting whale monitoring...');
            
            // Monitor top 5 holdings
            for (const token of tokens.slice(0, 5)) {
                if (token.address && token.address !== 'So11111111111111111111111111111111111111112') {
                    this.state.monitoredTokens.add(token.address);
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
            const holders = await this.app.solscanAPI.getTokenHolders(tokenAddress, { limit: 20 });
            
            if (holders?.data) {
                this.state.topHolders.set(tokenAddress, holders.data);
                await this.checkWhaleMovements(tokenAddress, holders.data);
            }
        } catch (error) {
            console.error(`Failed to load whale data for ${tokenAddress}:`, error);
        }
    }
    
    async checkWhaleMovements(tokenAddress, holders) {
        try {
            const transfers = await this.app.solscanAPI.getTokenTransfers(tokenAddress, {
                limit: 50,
                minAmount: this.state.thresholdSOL * 1e9
            });
            
            if (transfers?.data) {
                const movements = transfers.data.map(transfer => ({
                    tokenAddress,
                    tokenSymbol: this.getTokenSymbol(tokenAddress),
                    from: transfer.src,
                    to: transfer.dst,
                    amount: transfer.amount / Math.pow(10, transfer.decimals || 9),
                    timestamp: transfer.blockTime * 1000,
                    txHash: transfer.txHash,
                    type: this.categorizeMovement(transfer)
                }));
                
                // Add to recent movements
                this.state.recentMovements.push(...movements);
                
                // Sort and limit
                this.state.recentMovements.sort((a, b) => b.timestamp - a.timestamp);
                this.state.recentMovements = this.state.recentMovements.slice(0, 100);
                
                // Check for alerts
                if (this.state.settings.whaleNotifications) {
                    this.checkWhaleAlerts(movements);
                }
            }
        } catch (error) {
            console.error(`Failed to check whale movements for ${tokenAddress}:`, error);
        }
    }
    
    categorizeMovement(transfer) {
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
        movements.forEach(movement => {
            if (movement.amount >= this.state.thresholdSOL) {
                const alert = {
                    id: Date.now(),
                    type: 'whale_movement',
                    tokenSymbol: movement.tokenSymbol,
                    message: `🐋 Whale Alert: ${movement.amount.toLocaleString()} ${movement.tokenSymbol} moved`,
                    details: `From: ${this.app.ui.formatAddress(movement.from)} To: ${this.app.ui.formatAddress(movement.to)}`,
                    timestamp: movement.timestamp,
                    txHash: movement.txHash
                };
                
                this.app.alerts?.addToHistory(alert);
                this.app.ui.showToast(alert.message, 'warning', 5000);
            }
        });
    }
    
    async refresh() {
        for (const tokenAddress of this.state.monitoredTokens) {
            await this.checkWhaleMovements(tokenAddress);
        }
        this.updateMovementsUI();
    }
    
    setThreshold(threshold) {
        this.state.thresholdSOL = threshold;
        this.updateThresholdUI();
        this.app.ui.showToast(`Whale threshold set to ${threshold} SOL`, 'info');
    }
    
    setCustomThreshold() {
        const input = document.getElementById('customThreshold');
        if (input) {
            const value = parseFloat(input.value);
            if (!isNaN(value) && value > 0) {
                this.setThreshold(value);
                input.value = '';
            }
        }
    }
    
    filterMovements(filter) {
        this.state.filter = filter;
        this.updateMovementsUI();
        this.app.ui.showToast(`Whale filter: ${filter}`, 'info', 1500);
    }
    
    updateMovementsUI() {
        const container = document.getElementById('whaleMovements');
        if (!container) return;
        
        let movements = this.state.recentMovements;
        
        // Apply filter
        if (this.state.filter === 'holdings') {
            const userTokens = new Set(this.app.wallet.getTokens().map(t => t.address));
            movements = movements.filter(m => userTokens.has(m.tokenAddress));
        } else if (this.state.filter === 'trending') {
            // Filter by trending tokens if available
            movements = movements.slice(0, 10);
        }
        
        if (movements.length === 0) {
            container.innerHTML = this.app.ui.getEmptyStateHTML('whale');
            return;
        }
        
        container.innerHTML = movements.slice(0, 20).map(movement => `
            <div class="whale-movement-item">
                <div class="movement-header">
                    <span class="token-badge">${movement.tokenSymbol}</span>
                    <span class="movement-type ${movement.type}">${this.formatMovementType(movement.type)}</span>
                    <span class="movement-time">${this.app.ui.formatTimeAgo(movement.timestamp)}</span>
                </div>
                <div class="movement-details">
                    <div class="movement-amount">
                        ${movement.amount.toLocaleString()} ${movement.tokenSymbol}
                    </div>
                    <div class="movement-addresses">
                        <span class="address">From: ${this.app.ui.formatAddress(movement.from)}</span>
                        <span class="address">To: ${this.app.ui.formatAddress(movement.to)}</span>
                    </div>
                </div>
                <a href="https://solscan.io/tx/${movement.txHash}" target="_blank" class="tx-link">
                    <i class="fas fa-external-link-alt"></i> View Transaction
                </a>
            </div>
        `).join('');
    }
    
    updateStats() {
        // Update whale statistics
        this.app.ui.updateElement('whaleCount', this.state.recentMovements.length);
        
        const whaleVol = this.state.recentMovements.reduce((sum, m) => 
            sum + (m.amount * 100), 0 // Simplified calculation
        );
        this.app.ui.updateElement('whaleVol', `$${this.app.ui.formatLargeNumber(whaleVol)}`);
    }
    
    updateThresholdUI() {
        // Update active threshold button
        document.querySelectorAll('.threshold-buttons .btn').forEach(btn => {
            btn.classList.remove('active');
            const btnThreshold = parseInt(btn.textContent);
            if (btnThreshold === this.state.thresholdSOL) {
                btn.classList.add('active');
            }
        });
    }
    
    formatMovementType(type) {
        const types = {
            'mint': 'Mint',
            'burn': 'Burn',
            'transfer': 'Transfer',
            'mega_transfer': 'Mega Transfer'
        };
        return types[type] || type;
    }
    
    getTokenSymbol(address) {
        const tokenInfo = CONFIG.tokenRegistry[address];
        if (tokenInfo) return tokenInfo.symbol;
        
        const token = this.app.wallet.getTokens().find(t => t.address === address);
        if (token) return token.symbol;
        
        return 'Unknown';
    }
    
    updateSettings() {
        // Update notification settings
        const whaleNotifications = document.getElementById('whaleNotifications');
        const traderNotifications = document.getElementById('followedTraderNotifications');
        
        if (whaleNotifications) {
            this.state.settings.whaleNotifications = whaleNotifications.checked;
        }
        
        if (traderNotifications) {
            this.state.settings.followedTraderNotifications = traderNotifications.checked;
        }
        
        this.saveSettings();
    }
    
    saveSettings() {
        try {
            localStorage.setItem('cypher_whale_settings', JSON.stringify(this.state.settings));
        } catch (error) {
            console.warn('Failed to save whale settings:', error);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('cypher_whale_settings');
            if (saved) {
                this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load whale settings:', error);
        }
    }
}