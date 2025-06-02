// Whale Tracking Module
// Updated to use backend API for secure whale monitoring

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
                followedTraderNotifications: true,
                autoRefresh: true,
                refreshInterval: CONFIG.updateIntervals.whaleTracking
            },
            lastUpdate: null,
            isLoading: false,
            error: null
        };
        
        this.loadSettings();
    }
    
    async loadData() {
        if (!CONFIG.features.useBackendProxy || !this.app.state.backendHealthy) {
            this.showOfflineMessage();
            return;
        }
        
        console.log('🐋 Loading whale data...');
        this.state.isLoading = true;
        this.state.error = null;
        
        // Start monitoring user's tokens
        if (this.app.wallet.isConnected()) {
            await this.startMonitoring();
        } else {
            await this.loadGeneralWhaleData();
        }
        
        // Update UI
        this.updateMovementsUI();
        this.updateStats();
        
        this.state.isLoading = false;
    }
    
    async startMonitoring() {
        const tokens = this.app.wallet.getTokens();
        if (!tokens.length) {
            await this.loadGeneralWhaleData();
            return;
        }
        
        try {
            console.log('🐋 Starting whale monitoring for user tokens...');
            
            // Monitor top 5 holdings
            const topTokens = tokens.slice(0, 5);
            const promises = [];
            
            for (const token of topTokens) {
                if (token.address && token.address !== 'So11111111111111111111111111111111111111112') {
                    this.state.monitoredTokens.add(token.address);
                    promises.push(this.loadTokenWhaleData(token.address));
                }
            }
            
            // Also load general whale movements
            promises.push(this.loadGeneralWhaleData());
            
            await Promise.all(promises);
            
            console.log('✅ Whale monitoring started');
        } catch (error) {
            console.error('❌ Failed to start whale monitoring:', error);
            this.handleError(error);
        }
    }
    
    async loadGeneralWhaleData() {
        try {
            const movements = await this.app.backendAPI.getWhaleMovements({
                limit: 50,
                minAmount: this.state.thresholdSOL * 1e9
            });
            
            if (movements?.data) {
                this.processWhaleMovements(movements.data);
            }
        } catch (error) {
            console.error('Failed to load general whale movements:', error);
            this.handleError(error);
        }
    }
    
    async loadTokenWhaleData(tokenAddress) {
        try {
            // Load token holders
            const holders = await this.app.backendAPI.getTokenHolders(tokenAddress, { limit: 20 });
            
            if (holders?.data) {
                this.state.topHolders.set(tokenAddress, holders.data);
            }
            
            // Load token-specific whale movements
            const movements = await this.app.backendAPI.getWhaleMovements({
                tokenAddress,
                limit: 20,
                minAmount: this.state.thresholdSOL * 1e9
            });
            
            if (movements?.data) {
                this.processWhaleMovements(movements.data, tokenAddress);
            }
        } catch (error) {
            console.error(`Failed to load whale data for ${tokenAddress}:`, error);
        }
    }
    
    processWhaleMovements(movements, tokenAddress = null) {
        const processedMovements = movements.map(movement => ({
            id: movement.txHash || `${movement.blockTime}-${movement.src}`,
            tokenAddress: movement.tokenAddress || tokenAddress,
            tokenSymbol: movement.tokenSymbol || this.getTokenSymbol(movement.tokenAddress || tokenAddress),
            from: movement.src,
            to: movement.dst,
            amount: movement.amount / Math.pow(10, movement.decimals || 9),
            value: movement.value || 0,
            timestamp: movement.blockTime * 1000,
            txHash: movement.txHash,
            type: this.categorizeMovement(movement),
            impact: this.calculateImpact(movement)
        }));
        
        // Merge with existing movements
        const existingIds = new Set(this.state.recentMovements.map(m => m.id));
        const newMovements = processedMovements.filter(m => !existingIds.has(m.id));
        
        this.state.recentMovements = [...newMovements, ...this.state.recentMovements];
        
        // Sort and limit
        this.state.recentMovements.sort((a, b) => b.timestamp - a.timestamp);
        this.state.recentMovements = this.state.recentMovements.slice(0, 200);
        
        this.state.lastUpdate = Date.now();
        
        // Check for alerts
        if (this.state.settings.whaleNotifications && newMovements.length > 0) {
            this.checkWhaleAlerts(newMovements);
        }
    }
    
    categorizeMovement(transfer) {
        if (transfer.src === 'system' || transfer.src === '11111111111111111111111111111111') {
            return 'mint';
        }
        if (transfer.dst === 'system' || transfer.dst === '11111111111111111111111111111111') {
            return 'burn';
        }
        if (transfer.value > 10000000) { // $10M+
            return 'mega_transfer';
        }
        if (transfer.value > 1000000) { // $1M+
            return 'large_transfer';
        }
        return 'transfer';
    }
    
    calculateImpact(movement) {
        // Calculate potential market impact
        const value = movement.value || (movement.amount * 100); // Rough estimate
        
        if (value > 10000000) return 'extreme';
        if (value > 1000000) return 'high';
        if (value > 100000) return 'medium';
        return 'low';
    }
    
    checkWhaleAlerts(movements) {
        const significantMovements = movements.filter(m => 
            m.amount >= this.state.thresholdSOL || m.impact === 'high' || m.impact === 'extreme'
        );
        
        significantMovements.forEach(movement => {
            const alert = {
                id: Date.now(),
                type: 'whale_movement',
                tokenSymbol: movement.tokenSymbol,
                message: `🐋 Whale Alert: ${this.app.ui.formatLargeNumber(movement.amount)} ${movement.tokenSymbol} moved`,
                details: `From: ${this.app.ui.formatAddress(movement.from)} To: ${this.app.ui.formatAddress(movement.to)}`,
                timestamp: movement.timestamp,
                txHash: movement.txHash,
                impact: movement.impact
            };
            
            // Add to alert history
            if (this.app.alerts) {
                this.app.alerts.addToHistory(alert);
            }
            
            // Show notification
            const toastType = movement.impact === 'extreme' ? 'error' : 
                            movement.impact === 'high' ? 'warning' : 'info';
            this.app.ui.showToast(alert.message, toastType, 5000);
            
            // Play sound for high impact movements
            if (movement.impact === 'extreme' || movement.impact === 'high') {
                this.playAlertSound();
            }
        });
    }
    
    async refresh() {
        if (!CONFIG.features.useBackendProxy || !this.app.state.backendHealthy) {
            this.app.ui.showToast('Whale tracking unavailable offline', 'warning');
            return;
        }
        
        this.app.ui.showToast('Refreshing whale data...', 'info', 1000);
        
        // Clear old data to show fresh results
        this.state.recentMovements = [];
        
        if (this.state.monitoredTokens.size > 0) {
            for (const tokenAddress of this.state.monitoredTokens) {
                await this.loadTokenWhaleData(tokenAddress);
            }
        } else {
            await this.loadGeneralWhaleData();
        }
        
        this.updateMovementsUI();
        this.updateStats();
        
        this.app.ui.showToast('Whale data refreshed', 'success', 2000);
    }
    
    setThreshold(threshold) {
        this.state.thresholdSOL = threshold;
        this.updateThresholdUI();
        this.saveSettings();
        
        // Reload data with new threshold
        this.refresh();
        
        this.app.ui.showToast(`Whale threshold set to ${threshold} SOL`, 'info');
    }
    
    setCustomThreshold() {
        const input = document.getElementById('customThreshold');
        if (input) {
            const value = parseFloat(input.value);
            if (!isNaN(value) && value > 0) {
                this.setThreshold(value);
                input.value = '';
            } else {
                this.app.ui.showError('Please enter a valid threshold amount');
            }
        }
    }
    
    filterMovements(filter) {
        this.state.filter = filter;
        this.updateMovementsUI();
        this.app.ui.showToast(`Filter: ${filter}`, 'info', 1500);
    }
    
    updateMovementsUI() {
        const container = document.getElementById('whaleMovements');
        if (!container) return;
        
        if (this.state.isLoading) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            return;
        }
        
        let movements = this.state.recentMovements;
        
        // Apply filter
        if (this.state.filter === 'holdings') {
            const userTokens = new Set(this.app.wallet.getTokens().map(t => t.address));
            movements = movements.filter(m => userTokens.has(m.tokenAddress));
        } else if (this.state.filter === 'trending') {
            // Filter by high impact movements
            movements = movements.filter(m => m.impact === 'high' || m.impact === 'extreme');
        }
        
        if (movements.length === 0) {
            container.innerHTML = this.app.ui.getEmptyStateHTML('whale');
            return;
        }
        
        container.innerHTML = movements.slice(0, 20).map(movement => `
            <div class="whale-movement-item ${movement.impact}">
                <div class="movement-header">
                    <span class="token-badge">${movement.tokenSymbol}</span>
                    <span class="movement-type ${movement.type}">${this.formatMovementType(movement.type)}</span>
                    ${movement.impact === 'extreme' || movement.impact === 'high' ? 
                        `<span class="impact-badge ${movement.impact}">${movement.impact.toUpperCase()}</span>` : 
                        ''
                    }
                    <span class="movement-time">${this.app.ui.formatTimeAgo(movement.timestamp)}</span>
                </div>
                <div class="movement-details">
                    <div class="movement-amount">
                        <span class="amount">${this.app.ui.formatLargeNumber(movement.amount)} ${movement.tokenSymbol}</span>
                        ${movement.value ? `<span class="value">($${this.app.ui.formatLargeNumber(movement.value)})</span>` : ''}
                    </div>
                    <div class="movement-addresses">
                        <span class="address">From: ${this.app.ui.formatAddress(movement.from)}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="address">To: ${this.app.ui.formatAddress(movement.to)}</span>
                    </div>
                </div>
                <a href="https://solscan.io/tx/${movement.txHash}" target="_blank" class="tx-link">
                    <i class="fas fa-external-link-alt"></i> View Transaction
                </a>
            </div>
        `).join('');
        
        // Add refresh indicator
        if (this.state.lastUpdate) {
            const refreshInfo = document.createElement('div');
            refreshInfo.className = 'refresh-info';
            refreshInfo.innerHTML = `Last updated: ${this.app.ui.formatTimeAgo(this.state.lastUpdate)}`;
            container.appendChild(refreshInfo);
        }
    }
    
    updateStats() {
        // Update whale statistics
        const last24h = Date.now() - 86400000;
        const recentMovements = this.state.recentMovements.filter(m => m.timestamp > last24h);
        
        this.app.ui.updateElement('whaleCount', recentMovements.length);
        
        const whaleVol = recentMovements.reduce((sum, m) => 
            sum + (m.value || m.amount * 100), 0
        );
        this.app.ui.updateElement('whaleVol', `$${this.app.ui.formatLargeNumber(whaleVol)}`);
        
        // Calculate volume change
        const volChange = this.calculateVolumeChange();
        const volChangeEl = document.getElementById('whaleVolChange');
        if (volChangeEl) {
            const isPositive = volChange >= 0;
            volChangeEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${volChange.toFixed(1)}%</span>`;
        }
    }
    
    calculateVolumeChange() {
        // In production, would compare with previous period
        // For now, return mock data
        return Math.random() * 40 - 20; // -20% to +20%
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
            'large_transfer': 'Large Transfer',
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
    
    // WebSocket handlers
    handleWhaleAlert(data) {
        console.log('🐋 Real-time whale alert:', data);
        
        // Process the real-time movement
        this.processWhaleMovements([data]);
        this.updateMovementsUI();
        this.updateStats();
    }
    
    // Settings management
    updateSettings() {
        const whaleNotifications = document.getElementById('whaleNotifications');
        const traderNotifications = document.getElementById('followedTraderNotifications');
        
        if (whaleNotifications) {
            this.state.settings.whaleNotifications = whaleNotifications.checked;
        }
        
        if (traderNotifications) {
            this.state.settings.followedTraderNotifications = traderNotifications.checked;
        }
        
        this.saveSettings();
        this.app.ui.showToast('Settings updated', 'success');
    }
    
    saveSettings() {
        try {
            const settings = {
                ...this.state.settings,
                thresholdSOL: this.state.thresholdSOL,
                filter: this.state.filter
            };
            localStorage.setItem('cypher_whale_settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save whale settings:', error);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('cypher_whale_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.state.settings = { ...this.state.settings, ...settings };
                if (settings.thresholdSOL) {
                    this.state.thresholdSOL = settings.thresholdSOL;
                }
                if (settings.filter) {
                    this.state.filter = settings.filter;
                }
            }
        } catch (error) {
            console.warn('Failed to load whale settings:', error);
        }
    }
    
    // Helper methods
    showOfflineMessage() {
        const container = document.getElementById('whaleMovements');
        if (container) {
            container.innerHTML = `
                <div class="offline-message">
                    <i class="fas fa-wifi"></i>
                    <h4>Whale Tracking Unavailable</h4>
                    <p>This feature requires an internet connection.</p>
                    <button class="btn btn-primary" onclick="cypherApp.whale.refresh()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
    
    handleError(error) {
        this.state.error = error.message;
        console.error('Whale tracking error:', error);
        
        const container = document.getElementById('whaleMovements');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Failed to Load Whale Data</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="cypherApp.whale.refresh()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
    
    playAlertSound() {
        // In production, would play a notification sound
        console.log('🔊 Whale alert sound');
    }
}