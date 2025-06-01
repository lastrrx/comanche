// Wallet Management Module
// Handles wallet connections, token balances, and transaction history

import { CONFIG } from '../config.js';

export class WalletManager {
    constructor(app) {
        this.app = app;
        this.connection = null;
        this.state = {
            connected: false,
            publicKey: null,
            balance: 0,
            tokens: [],
            transactions: [],
            historicalBalances: [],
            performance: {
                totalValue: 0,
                dayChange: 0,
                dayChangePercent: 0,
                weekChange: 0,
                monthChange: 0
            }
        };
    }
    
    async initSolanaConnection() {
        if (typeof solanaWeb3 === 'undefined') {
            console.error('❌ Solana Web3.js not loaded');
            return;
        }
        
        for (const endpoint of CONFIG.apis.solana.endpoints) {
            try {
                const connection = new solanaWeb3.Connection(endpoint.url, 'confirmed');
                const testPromise = connection.getLatestBlockhash();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                );
                
                await Promise.race([testPromise, timeoutPromise]);
                
                this.connection = connection;
                console.log(`✅ Connected to: ${endpoint.name}`);
                return;
            } catch (error) {
                console.warn(`❌ RPC ${endpoint.name} failed: ${error.message}`);
            }
        }
        
        console.warn('❌ All RPC endpoints failed');
        this.connection = null;
    }
    
    async connect(walletType = 'auto') {
        try {
            console.log('🔗 Attempting wallet connection...');
            this.app.ui.showLoadingOverlay('Connecting wallet...');
            
            const walletAdapter = this.getWalletAdapter(walletType);
            
            if (!walletAdapter) {
                this.app.ui.hideLoadingOverlay();
                this.showWalletInstallHelp(walletType);
                return false;
            }
            
            const response = await walletAdapter.connect({ onlyIfTrusted: false });
            
            if (response.publicKey) {
                this.state.connected = true;
                this.state.publicKey = response.publicKey.toString();
                
                await this.loadWalletData();
                await this.loadHistoricalData();
                
                this.app.ui.hideLoadingOverlay();
                this.app.ui.showToast('Wallet connected successfully! 🎉', 'success');
                
                // Check achievements
                if (this.app.social) {
                    this.app.social.checkAchievement('first_connect');
                }
                
                return true;
            }
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.app.ui.hideLoadingOverlay();
            this.handleConnectionError(error, walletType);
            return false;
        }
    }
    
    async checkExistingConnection() {
        if (window.phantom?.solana?.isConnected) {
            try {
                const response = await window.phantom.solana.connect({ onlyIfTrusted: true });
                if (response.publicKey) {
                    this.state.connected = true;
                    this.state.publicKey = response.publicKey.toString();
                    await this.loadWalletData();
                    this.app.ui.showToast('Wallet auto-connected!', 'success');
                }
            } catch (error) {
                console.log('No trusted connection found');
            }
        }
    }
    
    async loadWalletData() {
        if (!this.state.connected || !this.connection) return;
        
        try {
            this.app.ui.updateLoadingStatus('Loading wallet data...');
            
            const publicKey = new solanaWeb3.PublicKey(this.state.publicKey);
            const solBalance = await this.getSolBalance(publicKey);
            const tokenAccounts = await this.getTokenAccounts(publicKey);
            const processedTokens = await this.processTokenAccounts(tokenAccounts, solBalance);
            
            this.state.balance = solBalance;
            this.state.tokens = processedTokens.tokens;
            this.state.performance = processedTokens.performance;
            
            this.app.ui.updateWalletUI(this.state);
            
            console.log('✅ Wallet data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading wallet data:', error);
            this.app.ui.showError('Failed to load wallet data');
        }
    }
    
    async loadHistoricalData() {
        if (!this.state.connected) return;
        
        try {
            console.log('📊 Loading historical wallet data...');
            
            // Get transaction history
            const transactions = await this.app.solscanAPI.getAccountTransactions(
                this.state.publicKey,
                { limit: 100 }
            );
            
            if (transactions?.data) {
                this.state.transactions = transactions.data;
                
                // Update transaction count for achievements
                if (this.app.social) {
                    this.app.social.updateTotalTrades(transactions.data.length);
                }
            }
            
            console.log('✅ Historical data loaded');
        } catch (error) {
            console.error('❌ Failed to load historical data:', error);
        }
    }
    
    async getSolBalance(publicKey) {
        const balance = await this.connection.getBalance(publicKey);
        return balance / solanaWeb3.LAMPORTS_PER_SOL;
    }
    
    async getTokenAccounts(publicKey) {
        const accounts = await this.connection.getParsedTokenAccountsByOwner(
            publicKey,
            { programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );
        
        return accounts.value.filter(account => {
            const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
            return amount && amount > 0;
        });
    }
    
    async processTokenAccounts(tokenAccounts, solBalance) {
        const tokens = [];
        const solPrice = this.app.market?.getSolPrice() || 0;
        const solValue = solBalance * solPrice;
        let totalValue = solValue;
        
        // Add SOL to tokens
        tokens.push({
            address: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            name: 'Solana',
            amount: solBalance,
            price: solPrice,
            value: solValue,
            change24h: this.app.market?.getSolPriceChange() || 0,
            isNative: true
        });
        
        // Process SPL tokens
        for (const account of tokenAccounts) {
            const tokenInfo = account.account.data.parsed.info;
            const mint = tokenInfo.mint;
            const amount = tokenInfo.tokenAmount.uiAmount;
            
            const tokenMeta = CONFIG.tokenRegistry[mint] || {
                symbol: mint.slice(0, 4) + '...',
                name: 'Unknown Token',
                decimals: tokenInfo.tokenAmount.decimals
            };
            
            const token = {
                address: mint,
                symbol: tokenMeta.symbol,
                name: tokenMeta.name,
                amount: amount,
                price: 0,
                value: 0,
                change24h: 0,
                isNative: false,
                coingeckoId: tokenMeta.coingeckoId
            };
            
            tokens.push(token);
        }
        
        // Fetch prices for tokens with coingecko IDs
        const coingeckoIds = tokens
            .filter(t => t.coingeckoId)
            .map(t => t.coingeckoId);
        
        if (coingeckoIds.length > 0 && this.app.market) {
            const prices = await this.app.market.fetchTokenPrices(coingeckoIds);
            
            for (const token of tokens) {
                if (token.coingeckoId && prices[token.coingeckoId]) {
                    const priceData = prices[token.coingeckoId];
                    token.price = priceData.usd || 0;
                    token.value = token.amount * token.price;
                    token.change24h = priceData.usd_24h_change || 0;
                    totalValue += token.value;
                }
            }
        }
        
        // Sort by value
        tokens.sort((a, b) => b.value - a.value);
        
        // Calculate performance
        const performance = this.calculatePerformance(totalValue);
        
        return { tokens, performance };
    }
    
    calculatePerformance(totalValue) {
        const previousValue = this.state.performance.totalValue || totalValue;
        const dayChange = totalValue - previousValue;
        const dayChangePercent = previousValue > 0 ? (dayChange / previousValue) * 100 : 0;
        
        return {
            totalValue,
            dayChange,
            dayChangePercent,
            weekChange: 0, // Would calculate from historical data
            monthChange: 0 // Would calculate from historical data
        };
    }
    
    getWalletAdapter(walletType) {
        const adapters = {
            phantom: () => window.phantom?.solana || window.solana,
            solflare: () => window.solflare,
            backpack: () => window.backpack
        };
        
        if (walletType === 'auto') {
            return adapters.phantom() || adapters.solflare() || adapters.backpack();
        }
        
        return adapters[walletType]?.();
    }
    
    handleConnectionError(error, walletType) {
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            this.app.ui.showToast('Connection cancelled by user', 'warning');
        } else if (error.code === -32002) {
            this.app.ui.showToast('Connection request pending. Please check your wallet.', 'info');
        } else {
            this.app.ui.showToast(`Connection failed: ${error.message}`, 'error');
        }
    }
    
    showWalletInstallHelp(walletType) {
        const urls = {
            phantom: 'https://phantom.app/',
            solflare: 'https://solflare.com/',
            backpack: 'https://backpack.app/'
        };
        
        const url = urls[walletType];
        if (url && confirm(`${walletType} wallet not found. Would you like to install it?`)) {
            window.open(url, '_blank');
        }
    }
    
    sortTokens(sortBy) {
        switch (sortBy) {
            case 'value':
                this.state.tokens.sort((a, b) => b.value - a.value);
                break;
            case 'change':
                this.state.tokens.sort((a, b) => b.change24h - a.change24h);
                break;
            case 'alphabetical':
                this.state.tokens.sort((a, b) => a.symbol.localeCompare(b.symbol));
                break;
        }
    }
    
    getExportData() {
        return {
            publicKey: this.state.publicKey,
            totalValue: this.state.performance.totalValue,
            tokens: this.state.tokens.map(t => ({
                symbol: t.symbol,
                name: t.name,
                amount: t.amount,
                value: t.value,
                price: t.price,
                change24h: t.change24h
            }))
        };
    }
    
    isConnected() {
        return this.state.connected;
    }
    
    getPublicKey() {
        return this.state.publicKey;
    }
    
    getTokens() {
        return this.state.tokens;
    }
    
    getPerformance() {
        return this.state.performance;
    }
}
