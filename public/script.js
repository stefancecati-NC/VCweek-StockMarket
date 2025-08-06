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

// Options Trading Class
class OptionsTrading {
    constructor() {
        this.apiBaseUrl = '/api/options';
        this.currentSymbol = '';
        this.currentExpiration = '';
        this.optionsData = null;
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.loadExpirationCalendar();
        this.loadUnusualActivity();
    }

    bindEventListeners() {
        // Options navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Options chain controls
        document.getElementById('loadOptionsBtn').addEventListener('click', () => {
            this.loadOptionsChain();
        });

        document.getElementById('optionsSymbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadOptionsChain();
            }
        });

        document.getElementById('expirationDate').addEventListener('change', () => {
            if (this.currentSymbol) {
                this.loadOptionsChain();
            }
        });

        // Strategy builder
        document.getElementById('strategyType').addEventListener('change', (e) => {
            this.loadStrategyBuilder(e.target.value);
        });

        // IV Analysis
        document.getElementById('analyzeIVBtn').addEventListener('click', () => {
            this.analyzeImpliedVolatility();
        });

        // Calendar filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterCalendar(e.target.dataset.filter);
            });
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.options-tab').forEach(tab => tab.classList.remove('active'));

        // Add active class to selected tab and button
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadOptionsChain() {
        const symbol = document.getElementById('optionsSymbol').value.trim().toUpperCase();
        const expiration = document.getElementById('expirationDate').value;

        if (!symbol) {
            this.showToast('Please enter a symbol');
            return;
        }

        this.currentSymbol = symbol;
        this.currentExpiration = expiration;

        try {
            const response = await fetch(`${this.apiBaseUrl}/chain/${symbol}?expiration=${expiration}`);
            const data = await response.json();

            this.optionsData = data;
            this.displayOptionsChain(data);
        } catch (error) {
            console.error('Error loading options chain:', error);
            this.showToast('Error loading options chain');
        }
    }

    displayOptionsChain(data) {
        // Display stock info
        const stockInfo = document.getElementById('stockInfo');
        stockInfo.innerHTML = `
            <div>
                <h3>${data.symbol}</h3>
                <p>Stock Price: <strong>$${data.stockPrice.toFixed(2)}</strong></p>
            </div>
            <div>
                <p>Expiration: <strong>${new Date(data.expiration).toLocaleDateString()}</strong></p>
                <p>Updated: <strong>${new Date(data.timestamp).toLocaleTimeString()}</strong></p>
            </div>
        `;

        // Display options chain table
        const tbody = document.getElementById('optionsChainBody');
        tbody.innerHTML = '';

        const strikes = [...new Set([
            ...data.chain.calls.map(c => c.strike),
            ...data.chain.puts.map(p => p.strike)
        ])].sort((a, b) => a - b);

        strikes.forEach(strike => {
            const call = data.chain.calls.find(c => c.strike === strike);
            const put = data.chain.puts.find(p => p.strike === strike);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="call-data">${call ? call.bid.toFixed(2) : '-'}</td>
                <td class="call-data">${call ? call.ask.toFixed(2) : '-'}</td>
                <td class="call-data">${call ? call.last.toFixed(2) : '-'}</td>
                <td class="call-data">${call ? call.volume.toLocaleString() : '-'}</td>
                <td class="call-data">${call ? call.openInterest.toLocaleString() : '-'}</td>
                <td class="call-data">${call ? (call.impliedVolatility * 100).toFixed(1) + '%' : '-'}</td>
                <td class="call-data">${call ? call.delta.toFixed(3) : '-'}</td>
                <td class="call-data">${call ? call.gamma.toFixed(3) : '-'}</td>
                <td class="strike-cell">$${strike}</td>
                <td class="put-data">${put ? put.gamma.toFixed(3) : '-'}</td>
                <td class="put-data">${put ? put.delta.toFixed(3) : '-'}</td>
                <td class="put-data">${put ? (put.impliedVolatility * 100).toFixed(1) + '%' : '-'}</td>
                <td class="put-data">${put ? put.openInterest.toLocaleString() : '-'}</td>
                <td class="put-data">${put ? put.volume.toLocaleString() : '-'}</td>
                <td class="put-data">${put ? put.last.toFixed(2) : '-'}</td>
                <td class="put-data">${put ? put.ask.toFixed(2) : '-'}</td>
                <td class="put-data">${put ? put.bid.toFixed(2) : '-'}</td>
            `;

            // Highlight ITM options
            if (strike < data.stockPrice) {
                row.querySelector('.strike-cell').style.background = 'rgba(40, 167, 69, 0.1)';
                row.querySelectorAll('.call-data').forEach(cell => {
                    cell.style.background = 'rgba(40, 167, 69, 0.05)';
                    cell.style.fontWeight = '600';
                });
            } else if (strike > data.stockPrice) {
                row.querySelector('.strike-cell').style.background = 'rgba(220, 53, 69, 0.1)';
                row.querySelectorAll('.put-data').forEach(cell => {
                    cell.style.background = 'rgba(220, 53, 69, 0.05)';
                    cell.style.fontWeight = '600';
                });
            } else {
                row.querySelector('.strike-cell').style.background = 'rgba(255, 193, 7, 0.2)';
                row.querySelector('.strike-cell').style.fontWeight = '700';
            }

            tbody.appendChild(row);
        });
    }

    async loadExpirationCalendar() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/expirations`);
            const data = await response.json();

            // Populate expiration dropdown
            const select = document.getElementById('expirationDate');
            select.innerHTML = '<option value="">Select expiration...</option>';
            data.dates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = new Date(date).toLocaleDateString();
                select.appendChild(option);
            });

            // Display calendar
            this.displayExpirationCalendar(data);
        } catch (error) {
            console.error('Error loading expiration calendar:', error);
        }
    }

    displayExpirationCalendar(data) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';

        data.dates.slice(0, 12).forEach(date => {
            const dateObj = new Date(date);
            const item = document.createElement('div');
            item.className = 'calendar-item';
            
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const day = dateObj.getDate();

            // Determine if it's monthly or weekly
            const isMonthly = data.monthlyExpirations.includes(date);
            const isQuarterly = data.quarterlyExpirations.includes(date);

            item.innerHTML = `
                <div class="calendar-date">${month} ${day}</div>
                <div class="calendar-day">${dayOfWeek}</div>
                <div class="calendar-type">${isQuarterly ? 'Quarterly' : isMonthly ? 'Monthly' : 'Weekly'}</div>
            `;

            item.addEventListener('click', () => {
                document.getElementById('expirationDate').value = date;
                if (this.currentSymbol) {
                    this.loadOptionsChain();
                }
                this.switchTab('chain');
            });

            grid.appendChild(item);
        });
    }

    filterCalendar(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // This would filter the calendar display based on the filter type
        // For now, we'll just reload the calendar
        this.loadExpirationCalendar();
    }

    async loadUnusualActivity() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/unusual-activity`);
            const data = await response.json();

            this.displayUnusualActivity(data);
        } catch (error) {
            console.error('Error loading unusual activity:', error);
        }
    }

    displayUnusualActivity(data) {
        // High Volume
        const highVolumeList = document.getElementById('highVolumeList');
        highVolumeList.innerHTML = '';
        data.highVolume.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <div class="activity-header">
                    <span class="activity-symbol">${item.symbol}</span>
                    <span class="activity-type ${item.type}-type">${item.type}</span>
                </div>
                <div class="activity-details">
                    <div class="activity-detail">
                        <div class="label">Strike</div>
                        <div class="value">$${item.strike}</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">Volume</div>
                        <div class="value">${item.volume.toLocaleString()}</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">Ratio</div>
                        <div class="value">${item.ratio.toFixed(1)}x</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">Price</div>
                        <div class="value">$${item.price.toFixed(2)}</div>
                    </div>
                </div>
            `;
            highVolumeList.appendChild(div);
        });

        // High IV
        const highIVList = document.getElementById('highIVList');
        highIVList.innerHTML = '';
        data.highIV.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <div class="activity-header">
                    <span class="activity-symbol">${item.symbol}</span>
                    <span class="activity-type ${item.type}-type">${item.type}</span>
                </div>
                <div class="activity-details">
                    <div class="activity-detail">
                        <div class="label">Strike</div>
                        <div class="value">$${item.strike}</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">IV</div>
                        <div class="value">${(item.impliedVolatility * 100).toFixed(1)}%</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">IV Rank</div>
                        <div class="value">${item.ivRank}</div>
                    </div>
                </div>
            `;
            highIVList.appendChild(div);
        });

        // Large Orders
        const largeOrdersList = document.getElementById('largeOrdersList');
        largeOrdersList.innerHTML = '';
        data.largeOrders.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <div class="activity-header">
                    <span class="activity-symbol">${item.symbol}</span>
                    <span class="activity-type ${item.type}-type">${item.type}</span>
                </div>
                <div class="activity-details">
                    <div class="activity-detail">
                        <div class="label">Strike</div>
                        <div class="value">$${item.strike}</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">Size</div>
                        <div class="value">${item.orderSize.toLocaleString()}</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">Direction</div>
                        <div class="value">${item.direction}</div>
                    </div>
                    <div class="activity-detail">
                        <div class="label">Price</div>
                        <div class="value">$${item.price.toFixed(2)}</div>
                    </div>
                </div>
            `;
            largeOrdersList.appendChild(div);
        });
    }

    loadStrategyBuilder(strategy) {
        // This would load the strategy builder interface
        // For now, we'll show a simple message
        const strategyLegs = document.getElementById('strategyLegs');
        strategyLegs.innerHTML = `
            <p>Strategy Builder for <strong>${strategy.replace('_', ' ')}</strong> will be implemented here.</p>
            <p>This would include:</p>
            <ul>
                <li>Leg configuration (buy/sell, strike prices, quantities)</li>
                <li>Real-time P&L calculation</li>
                <li>Risk metrics (max profit, max loss, breakevens)</li>
                <li>Interactive P&L diagram</li>
            </ul>
        `;

        // Update metrics with example data
        document.getElementById('maxProfit').textContent = '$1,250';
        document.getElementById('maxLoss').textContent = '$750';
        document.getElementById('breakeven').textContent = '$152.50';
    }

    analyzeImpliedVolatility() {
        const symbol = document.getElementById('ivSymbol').value.trim().toUpperCase();
        
        if (!symbol) {
            this.showToast('Please enter a symbol');
            return;
        }

        // Update IV metrics with example data
        document.getElementById('currentIV').textContent = '28.5%';
        document.getElementById('ivRank').textContent = '75';
        document.getElementById('ivPercentile').textContent = '82%';

        this.showToast(`IV analysis loaded for ${symbol}`);
    }

    showToast(message) {
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
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StockMarketApp();
    new OptionsTrading();
});