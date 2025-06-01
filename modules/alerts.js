// Alerts Management Module
// Handles price alerts, volume alerts, and notification system

import { CONFIG } from '../config.js';

export class AlertsManager {
    constructor(app) {
        this.app = app;
        this.state = {
            active: [],
            history: [],
            settings: {
                browserNotifications: true,
                emailNotifications: false,
                pushNotifications: false
            },
            alertTypes: {
                price_above: 'Price Above',
                price_below: 'Price Below',
                change_percent: '% Change',
                volume_spike: 'Volume Spike',
                whale_movement: 'Whale Movement'
            },
            currentTemplate: 'price'
        };
        
        this.checkInterval = null;
    }
    
    render() {
        console.log('🔔 Rendering alerts...');
        this.loadState();
        this.updateUI();
        this.startMonitoring();
    }
    
    create(event) {
        event.preventDefault();
        
        const tokenInput = document.getElementById('tokenInput');
        const priceInput = document.getElementById('priceInput');
        const alertType = document.getElementById('alertTypeSelect');
        
        if (!tokenInput || !priceInput || !alertType) return;
        
        const alert = {
            id: Date.now(),
            token: tokenInput.value.toUpperCase(),
            type: alertType.value,
            targetValue: parseFloat(priceInput.value),
            createdAt: Date.now(),
            triggered: false,
            active: true
        };
        
        this.state.active.push(alert);
        this.saveState();
        this.updateActiveAlertsUI();
        
        this.app.ui.showToast('Alert created successfully!', 'success');
        
        // Clear form
        tokenInput.value = '';
        priceInput.value = '';
        
        this.closeModal();
    }
    
    createQuick(event) {
        event.preventDefault();
        
        const tokenInput = document.getElementById('alertToken');
        const valueInput = document.getElementById('alertValue');
        const typeDropdown = document.getElementById('alertTypeDropdown');
        const timeframeDropdown = document.getElementById('alertTimeframeDropdown');
        
        if (!tokenInput || !valueInput) return;
        
        // Get selected type from dropdown
        const selectedType = typeDropdown?.querySelector('.dropdown-item.selected')?.getAttribute('data-value') || 'price_above';
        const selectedTimeframe = timeframeDropdown?.querySelector('.dropdown-item.selected')?.getAttribute('data-value') || 'instant';
        
        const alert = {
            id: Date.now(),
            token: tokenInput.value.toUpperCase(),
            type: selectedType,
            targetValue: parseFloat(valueInput.value),
            timeframe: selectedTimeframe,
            createdAt: Date.now(),
            triggered: false,
            active: true
        };
        
        this.state.active.push(alert);
        this.saveState();
        this.updateActiveAlertsUI();
        this.updateStats();
        
        this.app.ui.showToast('Quick alert created!', 'success');
        
        // Clear form
        tokenInput.value = '';
        valueInput.value = '';
    }
    
    deleteAlert(alertId) {
        this.state.active = this.state.active.filter(alert => alert.id !== alertId);
        this.saveState();
        this.updateActiveAlertsUI();
        this.updateStats();
        this.app.ui.showToast('Alert deleted', 'info');
    }
    
    toggleAlert(alertId) {
        const alert = this.state.active.find(a => a.id === alertId);
        if (alert) {
            alert.active = !alert.active;
            this.saveState();
            this.updateActiveAlertsUI();
            this.app.ui.showToast(`Alert ${alert.active ? 'enabled' : 'paused'}`, 'info');
        }
    }
    
    pauseAll() {
        this.state.active.forEach(alert => alert.active = false);
        this.saveState();
        this.updateActiveAlertsUI();
        this.app.ui.showToast('All alerts paused', 'info');
    }
    
    export() {
        const exportData = {
            alerts: this.state.active,
            history: this.state.history,
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `cypher-alerts-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.app.ui.showToast('Alerts exported successfully', 'success');
    }
    
    clearHistory() {
        this.state.history = [];
        this.saveState();
        this.updateHistoryUI();
        this.app.ui.showToast('Alert history cleared', 'info');
    }
    
    useTemplate(template) {
        this.state.currentTemplate = template;
        this.updateAlertForm(template);
        this.app.ui.showToast(`Using ${template} alert template`, 'info');
    }
    
    updateAlertForm(template) {
        const alertTypeSelect = document.getElementById('alertTypeSelect');
        const alertOptions = document.getElementById('alertOptions');
        
        if (!alertTypeSelect || !alertOptions) return;
        
        switch (template) {
            case 'price':
                alertTypeSelect.value = 'price';
                alertOptions.innerHTML = `
                    <label>Target Price</label>
                    <input type="number" id="priceInput" class="form-input" placeholder="Target price" step="0.000001" required>
                `;
                break;
                
            case 'volume':
                alertTypeSelect.value = 'volume';
                alertOptions.innerHTML = `
                    <label>Volume Threshold</label>
                    <input type="number" id="priceInput" class="form-input" placeholder="Volume threshold" step="1000" required>
                `;
                break;
                
            case 'whale':
                alertTypeSelect.value = 'whale';
                alertOptions.innerHTML = `
                    <label>Transaction Size (SOL)</label>
                    <input type="number" id="priceInput" class="form-input" placeholder="Min transaction size" step="10" required>
                `;
                break;
        }
    }
    
    updateOptions() {
        // Update alert options based on type selection
        const alertTypeSelect = document.getElementById('alertTypeSelect');
        if (alertTypeSelect) {
            this.updateAlertForm(alertTypeSelect.value);
        }
    }
    
    // Alert Monitoring
    startMonitoring() {
        // Check alerts every 30 seconds
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        this.checkInterval = setInterval(() => {
            this.checkAlerts();
        }, 30000);
    }
    
    async checkAlerts() {
        const activeAlerts = this.state.active.filter(alert => alert.active && !alert.triggered);
        
        for (const alert of activeAlerts) {
            try {
                const triggered = await this.checkAlertCondition(alert);
                if (triggered) {
                    this.triggerAlert(alert);
                }
            } catch (error) {
                console.error(`Failed to check alert ${alert.id}:`, error);
            }
        }
    }
    
    async checkAlertCondition(alert) {
        // Get current price for the token
        const marketData = this.app.market?.getMarketData();
        
        switch (alert.type) {
            case 'price_above':
                // For demo, check SOL price
                if (alert.token === 'SOL' && marketData?.solPrice) {
                    return marketData.solPrice >= alert.targetValue;
                }
                break;
                
            case 'price_below':
                if (alert.token === 'SOL' && marketData?.solPrice) {
                    return marketData.solPrice <= alert.targetValue;
                }
                break;
                
            case 'change_percent':
                if (alert.token === 'SOL' && marketData?.priceChange24h) {
                    return Math.abs(marketData.priceChange24h) >= alert.targetValue;
                }
                break;
                
            case 'volume_spike':
                // Would check volume data
                return false;
                
            case 'whale_movement':
                // Handled by whale tracker
                return false;
        }
        
        return false;
    }
    
    triggerAlert(alert) {
        alert.triggered = true;
        alert.triggeredAt = Date.now();
        
        // Add to history
        this.addToHistory({
            ...alert,
            type: 'price_alert',
            message: `${alert.token} ${this.state.alertTypes[alert.type]} ${alert.targetValue}`,
            details: `Alert condition met`,
            timestamp: Date.now()
        });
        
        // Show notification
        this.showNotification(alert);
        
        // Update UI
        this.updateActiveAlertsUI();
        this.updateHistoryUI();
        
        this.saveState();
    }
    
    showNotification(alert) {
        const message = `${alert.token} ${this.state.alertTypes[alert.type]} ${alert.targetValue}`;
        
        // Show toast
        this.app.ui.showToast(`🔔 Alert: ${message}`, 'warning', 5000);
        
        // Browser notification if enabled
        if (this.state.settings.browserNotifications && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('Cypher Alert', {
                    body: message,
                    icon: '/favicon.ico'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
        }
    }
    
    addToHistory(alert) {
        this.state.history.unshift(alert);
        this.state.history = this.state.history.slice(0, 100); // Keep last 100
        this.updateHistoryUI();
    }
    
    // UI Updates
    updateUI() {
        this.updateActiveAlertsUI();
        this.updateHistoryUI();
        this.updateStats();
    }
    
    updateStats() {
        const activeCount = this.state.active.filter(a => a.active).length;
        const triggeredToday = this.state.history.filter(a => 
            a.timestamp > Date.now() - 86400000
        ).length;
        
        const priceAlerts = this.state.active.filter(a => 
            a.type === 'price_above' || a.type === 'price_below'
        ).length;
        
        const volumeAlerts = this.state.active.filter(a => 
            a.type === 'volume_spike'
        ).length;
        
        this.app.ui.updateElement('activeAlerts', activeCount);
        this.app.ui.updateElement('triggeredToday', `${triggeredToday} triggered today`);
        this.app.ui.updateElement('priceAlerts', priceAlerts);
        this.app.ui.updateElement('volumeAlerts', volumeAlerts);
    }
    
    updateActiveAlertsUI() {
        const container = document.getElementById('alertsList');
        if (!container) return;
        
        if (this.state.active.length === 0) {
            container.innerHTML = this.app.ui.getEmptyStateHTML('alerts');
            return;
        }
        
        container.innerHTML = this.state.active.map(alert => `
            <div class="alert-item ${alert.active ? 'active' : 'paused'} ${alert.triggered ? 'triggered' : ''}">
                <div class="alert-header">
                    <div class="alert-token">${alert.token}</div>
                    <div class="alert-type">${this.state.alertTypes[alert.type]}</div>
                    <div class="alert-actions">
                        <button class="btn btn-sm" onclick="cypherApp.alerts.toggleAlert(${alert.id})" title="${alert.active ? 'Pause' : 'Resume'}">
                            <i class="fas fa-${alert.active ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-sm" onclick="cypherApp.alerts.deleteAlert(${alert.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="alert-details">
                    <div class="alert-value">Target: ${alert.targetValue}</div>
                    <div class="alert-status">${alert.triggered ? 'Triggered' : (alert.active ? 'Active' : 'Paused')}</div>
                    <div class="alert-created">${this.app.ui.formatTimeAgo(alert.createdAt)}</div>
                </div>
            </div>
        `).join('');
    }
    
    updateHistoryUI() {
        const container = document.getElementById('alertHistory');
        if (!container) return;
        
        if (this.state.history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h4>No Recent Notifications</h4>
                    <p>Your notification history will appear here once you start receiving alerts.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.state.history.slice(0, 50).map(alert => `
            <div class="alert-history-item ${alert.type}">
                <div class="alert-icon">
                    <i class="fas ${this.getAlertIcon(alert.type)}"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.message}</h4>
                    <p>${alert.details}</p>
                    <span class="alert-time">${this.app.ui.formatTimeAgo(alert.timestamp)}</span>
                </div>
                ${alert.txHash ? `
                    <a href="https://solscan.io/tx/${alert.txHash}" target="_blank" class="alert-link">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                ` : ''}
            </div>
        `).join('');
    }
    
    getAlertIcon(type) {
        const icons = {
            'whale_movement': 'fa-fish',
            'price_alert': 'fa-chart-line',
            'volume_alert': 'fa-chart-bar',
            'achievement': 'fa-trophy'
        };
        return icons[type] || 'fa-bell';
    }
    
    // Modal Management
    openModal() {
        const modal = document.getElementById('alertModal');
        if (modal) modal.style.display = 'flex';
    }
    
    closeModal() {
        const modal = document.getElementById('alertModal');
        if (modal) modal.style.display = 'none';
    }
    
    // State Management
    saveState() {
        try {
            const state = {
                active: this.state.active,
                history: this.state.history.slice(0, 50), // Save last 50
                settings: this.state.settings
            };
            localStorage.setItem('cypher_alerts_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save alerts state:', error);
        }
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem('cypher_alerts_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.state = { ...this.state, ...state };
            }
        } catch (error) {
            console.warn('Failed to load alerts state:', error);
        }
    }
    
    // Notification Settings
    updateNotificationSettings() {
        const browserNotif = document.getElementById('browserNotifications');
        const emailNotif = document.getElementById('emailNotifications');
        
        if (browserNotif) {
            this.state.settings.browserNotifications = browserNotif.checked;
        }
        
        if (emailNotif) {
            this.state.settings.emailNotifications = emailNotif.checked;
        }
        
        this.saveState();
        
        // Request browser notification permission if enabled
        if (this.state.settings.browserNotifications && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }
}