// Chart Management Module
// Handles all chart initialization, updates, and interactions

import { CONFIG } from '../config.js';

export class ChartManager {
    constructor(app) {
        this.app = app;
        this.charts = new Map();
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#ff6b6b',
                    borderWidth: 1
                }
            },
            scales: {
                x: { 
                    grid: { color: 'rgba(255,255,255,0.1)' }, 
                    ticks: { color: '#888' }
                },
                y: { 
                    grid: { color: 'rgba(255,255,255,0.1)' }, 
                    ticks: { color: '#888' }
                }
            }
        };
    }
    
    initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.initAllCharts(), 100);
            });
        } else {
            setTimeout(() => this.initAllCharts(), 100);
        }
    }
    
    initAllCharts() {
        this.initPortfolioChart();
        this.initAllocationChart();
        this.initBenchmarkChart();
        this.initMarketOverviewChart();
    }
    
    initPortfolioChart() {
        const ctx = document.getElementById('portfolioChart');
        if (!ctx) return;
        
        this.destroyChart('portfolio');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels('7D'),
                datasets: [{
                    label: 'Portfolio Value',
                    data: this.generateInitialData(7),
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }]
            },
            options: {
                ...this.chartOptions,
                scales: {
                    ...this.chartOptions.scales,
                    y: {
                        ...this.chartOptions.scales.y,
                        ticks: {
                            ...this.chartOptions.scales.y.ticks,
                            callback: (value) => `$${value.toLocaleString()}`
                        }
                    }
                }
            }
        });
        
        this.charts.set('portfolio', chart);
    }
    
    initAllocationChart() {
        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;
        
        this.destroyChart('allocation');
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Connect Wallet'],
                datasets: [{
                    data: [100],
                    backgroundColor: ['#667eea'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${percentage}%`;
                            }
                        }
                    }
                }
            }
        });
        
        this.charts.set('allocation', chart);
    }
    
    initBenchmarkChart() {
        const ctx = document.getElementById('benchmarkChart');
        if (!ctx) return;
        
        this.destroyChart('benchmark');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels('7D'),
                datasets: [
                    {
                        label: 'Portfolio',
                        data: this.generateBenchmarkData('portfolio'),
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'SOL',
                        data: this.generateBenchmarkData('sol'),
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                ...this.chartOptions,
                plugins: {
                    ...this.chartOptions.plugins,
                    legend: { display: true }
                },
                scales: {
                    ...this.chartOptions.scales,
                    y: {
                        ...this.chartOptions.scales.y,
                        ticks: {
                            ...this.chartOptions.scales.y.ticks,
                            callback: (value) => `${value.toFixed(1)}%`
                        }
                    }
                }
            }
        });
        
        this.charts.set('benchmark', chart);
    }
    
    initMarketOverviewChart() {
        const ctx = document.getElementById('marketOverviewChart');
        if (!ctx) return;
        
        this.destroyChart('marketOverview');
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['SOL', 'BTC', 'ETH', 'USDC', 'USDT'],
                datasets: [{
                    label: '24h Change %',
                    data: [2.5, -1.2, 3.1, 0, 0.1],
                    backgroundColor: [
                        'rgba(255, 107, 107, 0.8)',
                        'rgba(78, 205, 196, 0.8)',
                        'rgba(69, 183, 209, 0.8)',
                        'rgba(150, 206, 180, 0.8)',
                        'rgba(254, 202, 87, 0.8)'
                    ]
                }]
            },
            options: {
                ...this.chartOptions,
                scales: {
                    ...this.chartOptions.scales,
                    y: {
                        ...this.chartOptions.scales.y,
                        ticks: {
                            ...this.chartOptions.scales.y.ticks,
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });
        
        this.charts.set('marketOverview', chart);
    }
    
    updateAll() {
        this.updatePortfolioChart();
        this.updateAllocationChart();
    }
    
    updatePortfolioChart() {
        const chart = this.charts.get('portfolio');
        if (!chart) return;
        
        const tokens = this.app.wallet.getTokens();
        const performance = this.app.wallet.getPerformance();
        
        if (tokens.length > 0) {
            // Update with real data
            const currentValue = performance.totalValue;
            const data = this.generateHistoricalData(currentValue, this.app.state.currentTimeframe);
            
            chart.data.labels = this.generateTimeLabels(this.app.state.currentTimeframe);
            chart.data.datasets[0].data = data;
            chart.update();
        }
    }
    
    updateAllocationChart() {
        const chart = this.charts.get('allocation');
        if (!chart) return;
        
        const tokens = this.app.wallet.getTokens();
        
        if (tokens.length > 0) {
            const topTokens = tokens.slice(0, 5);
            const labels = topTokens.map(token => token.symbol);
            const data = topTokens.map(token => token.value);
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.data.datasets[0].backgroundColor = colors.slice(0, topTokens.length);
            chart.update();
            
            this.updateAllocationLegend(topTokens, colors);
        }
    }
    
    updateAllocationLegend(tokens, colors) {
        const legend = document.getElementById('allocationLegend');
        if (!legend) return;
        
        const totalValue = this.app.wallet.getPerformance().totalValue;
        
        legend.innerHTML = tokens.map((token, index) => {
            const percentage = totalValue > 0 ? ((token.value / totalValue) * 100).toFixed(1) : '0.0';
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${colors[index]}"></div>
                    <span class="legend-label">${token.symbol}</span>
                    <span class="legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }
    
    updateTimeframe(timeframe) {
        // Update portfolio chart with new timeframe
        const chart = this.charts.get('portfolio');
        if (!chart) return;
        
        const labels = this.generateTimeLabels(timeframe);
        const data = this.generateHistoricalData(
            this.app.wallet.getPerformance().totalValue,
            timeframe
        );
        
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('active');
        
        // Update active button
        document.querySelectorAll('.chart-controls .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick="changeChartTimeframe('${timeframe}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    changeBenchmark(benchmark) {
        const chart = this.charts.get('benchmark');
        if (chart) {
            const newData = this.generateBenchmarkData(benchmark);
            chart.data.datasets[1].data = newData;
            chart.data.datasets[1].label = benchmark.toUpperCase();
            chart.update();
        }
    }
    
    // Helper methods
    destroyChart(name) {
        if (this.charts.has(name)) {
            this.charts.get(name).destroy();
            this.charts.delete(name);
        }
    }
    
    generateTimeLabels(timeframe) {
        const labels = [];
        const now = new Date();
        
        switch (timeframe) {
            case '1D':
                for (let i = 23; i >= 0; i--) {
                    labels.push(`${(24 - i) % 24}:00`);
                }
                break;
            case '7D':
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now.getTime() - (i * 86400000));
                    labels.push(days[date.getDay()]);
                }
                break;
            case '30D':
                for (let i = 29; i >= 0; i--) {
                    const date = new Date(now.getTime() - (i * 86400000));
                    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
                }
                break;
            case '1Y':
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(now.getTime() - (i * 30 * 86400000));
                    labels.push(`${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`);
                }
                break;
            default:
                return ['1', '2', '3', '4', '5', '6', '7'];
        }
        
        return labels;
    }
    
    generateHistoricalData(currentValue, timeframe) {
        const points = {
            '1D': 24,
            '7D': 7,
            '30D': 30,
            '1Y': 12
        }[timeframe] || 7;
        
        const data = [];
        const volatility = 0.02;
        
        for (let i = points - 1; i >= 0; i--) {
            const randomChange = (Math.random() - 0.5) * volatility;
            const value = currentValue * (1 + randomChange * i * 0.1);
            data.push(Math.max(0, value));
        }
        data.push(currentValue);
        
        return data;
    }
    
    generateInitialData(points) {
        return Array(points).fill(0).map(() => Math.random() * 2000 + 1000);
    }
    
    generateBenchmarkData(type) {
        const data = [];
        for (let i = 0; i < 8; i++) {
            const variation = (Math.random() - 0.5) * 4;
            data.push(type === 'portfolio' ? variation : variation * 0.8);
        }
        return data;
    }
    
    handleResize() {
        this.charts.forEach(chart => {
            chart.resize();
        });
    }
}
