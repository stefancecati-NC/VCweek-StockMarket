class StockMarketApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.loadInitialData();
    }

    bindEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshAllData();
        });

        // Earnings filter
        document.getElementById('daysFilter').addEventListener('change', (e) => {
            this.loadEarningsCalendar(e.target.value);
        });

        // Error modal close
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideErrorModal();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.hideErrorModal();
            this.loadInitialData();
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('errorModal');
            if (e.target === modal) {
                this.hideErrorModal();
            }
        });
    }

    async loadInitialData() {
        this.showLoading(true);
        try {
            await Promise.all([
                this.loadDailySummary(),
                this.loadMarketData(),
                this.loadEarningsCalendar()
            ]);
            this.updateLastUpdatedTime();
        } catch (error) {
            this.showError('Failed to load initial data. Please check your connection and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshAllData() {
        if (this.isLoading) return;
        
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        
        // Add spinning animation
        icon.classList.add('fa-spin');
        refreshBtn.disabled = true;
        
        try {
            // Refresh summary first
            await this.apiCall('POST', '/refresh-summary');
            
            // Then load all other data
            await Promise.all([
                this.loadDailySummary(),
                this.loadMarketData(),
                this.loadEarningsCalendar()
            ]);
            
            this.updateLastUpdatedTime();
            this.showToast('Data refreshed successfully!');
        } catch (error) {
            this.showError('Failed to refresh data. Please try again.');
        } finally {
            icon.classList.remove('fa-spin');
            refreshBtn.disabled = false;
        }
    }

    async loadDailySummary() {
        try {
            const data = await this.apiCall('GET', '/daily-summary');
            this.renderDailySummary(data);
        } catch (error) {
            console.error('Error loading daily summary:', error);
            this.renderErrorSummary();
        }
    }

    async loadMarketData() {
        try {
            const data = await this.apiCall('GET', '/market-data');
            this.renderMarketIndices(data.indices);
            this.renderTopMovers(data.topMovers);
            this.renderMajorStocks(data.majorStocks);
        } catch (error) {
            console.error('Error loading market data:', error);
        }
    }

    async loadEarningsCalendar(days = 7) {
        try {
            const data = await this.apiCall('GET', `/earnings-calendar?days=${days}`);
            this.renderEarningsCalendar(data);
        } catch (error) {
            console.error('Error loading earnings calendar:', error);
        }
    }

    async apiCall(method, endpoint, body = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    renderDailySummary(data) {
        if (!data || !data.summary) {
            this.renderErrorSummary();
            return;
        }

        // Update sentiment badge
        const sentimentBadge = document.getElementById('sentimentBadge');
        sentimentBadge.textContent = data.summary.sentiment || 'Neutral';
        sentimentBadge.className = `sentiment-badge ${data.summary.sentiment || 'neutral'}`;

        // Update summary content
        const summaryContent = document.getElementById('summaryContent');
        summaryContent.innerHTML = `<p>${data.summary.summary}</p>`;

        // Update key points
        const keyPointsContainer = document.getElementById('keyPoints');
        if (data.summary.keyPoints && data.summary.keyPoints.length > 0) {
            keyPointsContainer.innerHTML = data.summary.keyPoints
                .map(point => `<div class="key-point">${point}</div>`)
                .join('');
        } else {
            keyPointsContainer.innerHTML = '';
        }
    }

    renderErrorSummary() {
        const summaryContent = document.getElementById('summaryContent');
        summaryContent.innerHTML = '<p>Unable to load AI summary at this time. Please try refreshing the page.</p>';
        
        const keyPointsContainer = document.getElementById('keyPoints');
        keyPointsContainer.innerHTML = '';
        
        const sentimentBadge = document.getElementById('sentimentBadge');
        sentimentBadge.textContent = 'Unknown';
        sentimentBadge.className = 'sentiment-badge neutral';
    }

    renderMarketIndices(indices) {
        const container = document.getElementById('indicesGrid');
        if (!indices || Object.keys(indices).length === 0) {
            container.innerHTML = '<p>Market indices data unavailable</p>';
            return;
        }

        container.innerHTML = Object.entries(indices)
            .map(([symbol, data]) => this.createIndexCard(symbol, data))
            .join('');
    }

    createIndexCard(symbol, data) {
        const changeClass = data.change >= 0 ? 'positive' : 'negative';
        const changeSign = data.change >= 0 ? '+' : '';
        
        return `
            <div class="index-card">
                <div class="index-symbol">${symbol}</div>
                <div class="index-price">$${data.price.toFixed(2)}</div>
                <div class="index-change ${changeClass}">
                    ${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)
                </div>
            </div>
        `;
    }

    renderTopMovers(topMovers) {
        if (!topMovers) return;

        this.renderStocksList('topGainers', topMovers.gainers || []);
        this.renderStocksList('topLosers', topMovers.losers || []);
    }

    renderStocksList(containerId, stocks) {
        const container = document.getElementById(containerId);
        if (!stocks || stocks.length === 0) {
            container.innerHTML = '<p>No data available</p>';
            return;
        }

        container.innerHTML = stocks
            .slice(0, 5) // Show top 5
            .map(stock => this.createStockItem(stock))
            .join('');
    }

    createStockItem(stock) {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSign = stock.change >= 0 ? '+' : '';
        
        return `
            <div class="stock-item">
                <div class="stock-info">
                    <h4>${stock.symbol}</h4>
                    <div class="stock-price">$${stock.price.toFixed(2)}</div>
                </div>
                <div class="stock-change">
                    <div class="change-amount ${changeClass}">
                        ${changeSign}${stock.change.toFixed(2)}
                    </div>
                    <div class="change-percent ${changeClass}">
                        ${changeSign}${stock.changePercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }

    renderMajorStocks(majorStocks) {
        const container = document.getElementById('majorStocksGrid');
        if (!majorStocks || Object.keys(majorStocks).length === 0) {
            container.innerHTML = '<p>Major stocks data unavailable</p>';
            return;
        }

        container.innerHTML = Object.entries(majorStocks)
            .map(([symbol, data]) => this.createMajorStockCard(symbol, data))
            .join('');
    }

    createMajorStockCard(symbol, data) {
        const changeClass = data.change >= 0 ? 'positive' : 'negative';
        const changeSign = data.change >= 0 ? '+' : '';
        
        return `
            <div class="major-stock-card">
                <div class="stock-symbol">${symbol}</div>
                <div class="stock-price-large">$${data.price.toFixed(2)}</div>
                <div class="index-change ${changeClass}">
                    ${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)
                </div>
            </div>
        `;
    }

    renderEarningsCalendar(earnings) {
        const container = document.getElementById('earningsList');
        if (!earnings || earnings.length === 0) {
            container.innerHTML = '<p>No upcoming earnings data available</p>';
            return;
        }

        container.innerHTML = earnings
            .map(earning => this.createEarningsItem(earning))
            .join('');
    }

    createEarningsItem(earning) {
        return `
            <div class="earnings-item">
                <div class="earnings-company">
                    <h4>${earning.company}</h4>
                    <div class="earnings-symbol">${earning.symbol}</div>
                </div>
                <div class="earnings-details">
                    <div class="earnings-date">
                        <strong>${this.formatDate(earning.date)}</strong>
                        <small>${this.getDayOfWeek(earning.date)}</small>
                    </div>
                    <div class="earnings-eps">
                        <strong>$${earning.estimatedEPS.toFixed(2)}</strong>
                        <small>Est. EPS</small>
                    </div>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    getDayOfWeek(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    updateLastUpdatedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
    }

    showLoading(show) {
        this.isLoading = show;
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').style.display = 'block';
    }

    hideErrorModal() {
        document.getElementById('errorModal').style.display = 'none';
    }

    showToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 3000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        // Add slide in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StockMarketApp();
});