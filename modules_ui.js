// UI Management Module
// Handles all UI updates, animations, and user interactions

import { CONFIG } from '../config.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        this.state = {
            loading: false,
            mobileNavOpen: false,
            notifications: [],
            preferences: {
                theme: 'dark',
                animations: true,
                compactView: false
            }
        };
    }
    
    initialize() {
        this.setupDropdowns();
        this.setupTooltips();
        this.setupResponsiveHandlers();
    }
    
    // Loading States
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const status = document.getElementById('loadingStatus');
        
        if (overlay && status) {
            status.textContent = message;
            overlay.style.display = 'flex';
        }
        this.state.loading = true;
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.state.loading = false;
    }
    
    updateLoadingStatus(message) {
        const status = document.getElementById('loadingStatus');
        if (status) {
            status.textContent = message;
        }
    }
    
    // Toast Notifications
    showToast(message, type = 'info', duration = CONFIG.ui.toastDuration) {
        const toast = document.getElementById('toast') || this.createToastElement();
        
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
        
        this.state.notifications.push({
            id: Date.now(),
            message,
            type,
            timestamp: Date.now()
        });
    }
    
    createToastElement() {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
        return toast;
    }
    
    showError(message) {
        this.showToast(message, 'error', 5000);
        console.error(message);
    }
    
    // Navigation
    updateNavigation(section) {
        // Desktop navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[onclick*="${section}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Mobile navigation
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeMobileItem = document.querySelector(`[data-section="${section}"]`);
        if (activeMobileItem) {
            activeMobileItem.classList.add('active');
        }
        
        // Show/hide sections
        document.querySelectorAll('.section').forEach(s => {
            s.classList.remove('active');
        });
        
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }
    
    setupMobileNav() {
        const toggle = document.getElementById('mobileNavToggle');
        const close = document.getElementById('mobileNavClose');
        const overlay = document.getElementById('mobileNavOverlay');
        
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleMobileNav());
        }
        
        if (close) {
            close.addEventListener('click', () => this.closeMobileNav());
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeMobileNav();
            });
        }
        
        // Mobile nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                if (section) {
                    this.app.switchSection(section);
                    this.closeMobileNav();
                }
            });
        });
    }
    
    toggleMobileNav() {
        const overlay = document.getElementById('mobileNavOverlay');
        if (overlay) {
            this.state.mobileNavOpen = !this.state.mobileNavOpen;
            if (this.state.mobileNavOpen) {
                overlay.classList.add('show');
                document.body.style.overflow = 'hidden';
            } else {
                overlay.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    }
    
    closeMobileNav() {
        const overlay = document.getElementById('mobileNavOverlay');
        if (overlay) {
            this.state.mobileNavOpen = false;
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    // Wallet UI Updates
    updateWalletUI(walletState) {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn && walletState.connected) {
            connectBtn.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                <span>${walletState.publicKey.slice(0, 4)}...${walletState.publicKey.slice(-4)}</span>
            `;
            connectBtn.classList.add('connected');
        }
        
        this.updatePortfolioStats(walletState);
        this.updateHoldingsList(walletState.tokens);
    }
    
    updatePortfolioStats(walletState) {
        const { performance } = walletState;
        
        this.updateElement('totalValue', `$${performance.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`);
        
        this.updateElement('tokenCount', walletState.tokens.length);
        
        const portfolioGainEl = document.getElementById('portfolioGain');
        const gainAmountEl = document.getElementById('gainAmount');
        if (portfolioGainEl && gainAmountEl) {
            const isPositive = performance.dayChangePercent >= 0;
            portfolioGainEl.textContent = `${isPositive ? '+' : ''}${performance.dayChangePercent.toFixed(2)}%`;
            portfolioGainEl.className = `stat-value ${isPositive ? 'positive' : 'negative'}`;
            
            gainAmountEl.textContent = `${isPositive ? '+' : ''}$${Math.abs(performance.dayChange).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            gainAmountEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        }
        
        this.updateElement('centerValue', `$${Math.round(performance.totalValue).toLocaleString()}`);
    }
    
    updateHoldingsList(tokens = []) {
        const tokenListEl = document.getElementById('tokenList');
        if (!tokenListEl) return;
        
        if (tokens.length === 0) {
            tokenListEl.innerHTML = this.getEmptyStateHTML('holdings');
            return;
        }
        
        tokenListEl.innerHTML = tokens.slice(0, CONFIG.ui.maxTokensDisplay).map(token => 
            this.getTokenItemHTML(token)
        ).join('');
    }
    
    getTokenItemHTML(token) {
        const isPositive = token.change24h >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="token-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div class="token-icon" style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 1rem;">
                    ${token.symbol.charAt(0)}
                </div>
                <div class="token-info" style="flex: 1;">
                    <div class="token-symbol" style="font-weight: 600; color: #ffffff; font-size: 1rem;">${token.symbol}</div>
                    <div class="token-name" style="color: #a3a3a3; font-size: 0.875rem;">${token.name}</div>
                </div>
                <div class="token-amount" style="text-align: right; margin-right: 1rem;">
                    <div style="font-weight: 600; color: #ffffff;">${token.amount.toLocaleString(undefined, {maximumFractionDigits: 6})}</div>
                    <div style="color: #a3a3a3; font-size: 0.875rem;">$${token.price.toFixed(4)}</div>
                </div>
                <div class="token-value" style="text-align: right;">
                    <div style="font-weight: 600; color: #ffffff;">$${token.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="${changeClass}" style="font-size: 0.875rem;">
                        <i class="fas ${changeIcon}"></i> ${Math.abs(token.change24h).toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }
    
    getEmptyStateHTML(type) {
        const emptyStates = {
            holdings: {
                icon: 'fa-wallet',
                title: 'No Holdings Found',
                description: 'Connect your wallet to view your token holdings and start tracking your portfolio performance.',
                action: '<button class="btn btn-primary" onclick="connectWallet()"><i class="fas fa-plug"></i> Connect Wallet</button>'
            },
            whale: {
                icon: 'fa-fish',
                title: 'No Recent Whale Movements',
                description: 'Large transactions will appear here when detected.',
                action: ''
            },
            alerts: {
                icon: 'fa-bell',
                title: 'No Active Alerts',
                description: 'Create your first alert to get notified of important market movements.',
                action: '<button class="btn btn-primary" onclick="openAlertModal()"><i class="fas fa-plus"></i> Create Alert</button>'
            }
        };
        
        const state = emptyStates[type] || emptyStates.holdings;
        
        return `
            <div class="empty-state">
                <i class="fas ${state.icon}" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h4>${state.title}</h4>
                <p>${state.description}</p>
                ${state.action}
            </div>
        `;
    }
    
    // Dropdown Management
    setupDropdowns() {
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(toggle);
            });
        });
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectDropdownItem(item);
            });
        });
        
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    }
    
    toggleDropdown(toggle) {
        const dropdown = toggle.closest('.dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        this.closeAllDropdowns(dropdown);
        
        const isOpen = menu.classList.contains('show');
        if (isOpen) {
            menu.classList.remove('show');
            toggle.classList.remove('active');
        } else {
            menu.classList.add('show');
            toggle.classList.add('active');
        }
    }
    
    selectDropdownItem(item) {
        const dropdown = item.closest('.dropdown');
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        const value = item.getAttribute('data-value');
        const text = item.textContent;
        
        menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        
        const span = toggle.querySelector('span');
        if (span) span.textContent = text;
        
        menu.classList.remove('show');
        toggle.classList.remove('active');
        
        this.handleDropdownChange(dropdown.id, value);
    }
    
    closeAllDropdowns(except = null) {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            if (dropdown !== except) {
                const menu = dropdown.querySelector('.dropdown-menu');
                const toggle = dropdown.querySelector('.dropdown-toggle');
                if (menu) menu.classList.remove('show');
                if (toggle) toggle.classList.remove('active');
            }
        });
    }
    
    handleDropdownChange(dropdownId, value) {
        // Emit events or call appropriate handlers
        switch (dropdownId) {
            case 'sortDropdown':
                this.app.sortHoldings(value);
                break;
            case 'benchmarkDropdown':
                this.app.charts?.changeBenchmark(value);
                break;
            case 'marketFilterDropdown':
                this.app.market?.filterTokens(value);
                break;
            case 'whaleFilterDropdown':
                this.app.whale?.filterMovements(value);
                break;
        }
    }
    
    // Utility Methods
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else {
                element.innerHTML = content;
            }
        }
    }
    
    formatLargeNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toFixed(0);
    }
    
    formatAddress(address) {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }
    
    setupTooltips() {
        // Implement tooltip functionality if needed
    }
    
    setupResponsiveHandlers() {
        window.addEventListener('resize', () => {
            if (this.app.charts) {
                this.app.charts.handleResize();
            }
        });
    }
    
    // Help Modal Methods
    showHelp() {
        const modal = document.getElementById('helpModal');
        if (modal) modal.style.display = 'flex';
    }
    
    showHelpTab(tab) {
        document.querySelectorAll('.help-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.help-tab').forEach(tabBtn => {
            tabBtn.classList.remove('active');
        });
        
        const content = document.getElementById(tab);
        const tabBtn = document.querySelector(`[onclick="showHelpTab('${tab}')"]`);
        
        if (content) content.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    }
    
    closeHelpModal() {
        const modal = document.getElementById('helpModal');
        if (modal) modal.style.display = 'none';
    }
    
    getPreferences() {
        return this.state.preferences;
    }
    
    loadPreferences(preferences) {
        this.state.preferences = { ...this.state.preferences, ...preferences };
    }
}