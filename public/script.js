class StockMarketApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.loadInitialData();
        this.bindNewEventListeners();
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

    // New Event Listeners for Fundamentals and News Features
    bindNewEventListeners() {
        // Company search
        document.getElementById('searchCompanyBtn').addEventListener('click', () => {
            this.searchCompany();
        });

        document.getElementById('companySearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchCompany();
            }
        });

        // Fundamentals tabs
        document.querySelectorAll('.company-fundamentals .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchFundamentalsTab(e.target.dataset.tab);
            });
        });

        // News tabs
        document.querySelectorAll('.news-sentiment .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchNewsTab(e.target.dataset.tab);
            });
        });

        // News category filter
        document.getElementById('newsCategory').addEventListener('change', () => {
            this.loadMarketNews();
        });

        // Refresh news button
        document.getElementById('refreshNewsBtn').addEventListener('click', () => {
            this.loadMarketNews();
        });

        // Load initial market news
        this.loadMarketNews();
        
        // Investment simulator event listeners
        this.bindInvestmentSimulatorEvents();
    }

    // Investment Simulator Event Listeners
    bindInvestmentSimulatorEvents() {
        // Simulator tabs
        document.querySelectorAll('.investment-simulator .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSimulatorTab(e.target.dataset.tab);
            });
        });

        // Future projection simulation
        document.getElementById('simulateFutureBtn').addEventListener('click', () => {
            this.runFutureProjection();
        });

        // Historical what-if simulation
        document.getElementById('simulateHistoricalBtn').addEventListener('click', () => {
            this.runHistoricalWhatIf();
        });

        // Portfolio simulation
        document.getElementById('simulatePortfolioBtn').addEventListener('click', () => {
            this.runPortfolioSimulation();
        });

        // Portfolio builder
        document.getElementById('addAllocationBtn').addEventListener('click', () => {
            this.addPortfolioAllocation();
        });

        // Portfolio allocation change listeners
        this.bindPortfolioAllocationListeners();
    }

    switchSimulatorTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.investment-simulator .tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.investment-simulator .tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async runFutureProjection() {
        const amount = parseFloat(document.getElementById('futureAmount').value);
        const symbol = document.getElementById('futureSymbol').value;
        const days = parseInt(document.getElementById('futureDays').value);
        const confidenceLevel = parseFloat(document.getElementById('confidenceLevel').value);

        if (!amount || !symbol || !days) {
            this.showError('Please fill in all required fields');
            return;
        }

        this.showLoading(true);
        try {
            const response = await fetch('/api/simulate-future-investment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, symbol, days, confidenceLevel })
            });

            const data = await response.json();
            this.renderFutureProjectionResults(data);
            document.getElementById('futureResults').style.display = 'block';
        } catch (error) {
            this.showError('Failed to run future projection simulation');
        } finally {
            this.showLoading(false);
        }
    }

    async runHistoricalWhatIf() {
        const amount = parseFloat(document.getElementById('historicalAmount').value);
        const symbol = document.getElementById('historicalSymbol').value;
        const daysAgo = parseInt(document.getElementById('daysAgo').value);

        if (!amount || !symbol || !daysAgo) {
            this.showError('Please fill in all required fields');
            return;
        }

        this.showLoading(true);
        try {
            const response = await fetch('/api/simulate-historical-whatif', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, symbol, daysAgo })
            });

            const data = await response.json();
            this.renderHistoricalWhatIfResults(data);
            document.getElementById('historicalResults').style.display = 'block';
        } catch (error) {
            this.showError('Failed to run historical what-if analysis');
        } finally {
            this.showLoading(false);
        }
    }

    async runPortfolioSimulation() {
        const totalAmount = parseFloat(document.getElementById('portfolioAmount').value);
        const days = parseInt(document.getElementById('portfolioDays').value);
        const portfolio = this.getPortfolioAllocations();

        if (!totalAmount || !days) {
            this.showError('Please fill in total amount and investment horizon');
            return;
        }

        const totalAllocation = Object.values(portfolio).reduce((sum, allocation) => sum + allocation, 0);
        if (Math.abs(totalAllocation - 100) > 0.01) {
            this.showError('Portfolio allocations must sum to 100%');
            return;
        }

        this.showLoading(true);
        try {
            const response = await fetch('/api/simulate-portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolio, totalAmount, days })
            });

            const data = await response.json();
            this.renderPortfolioSimulationResults(data);
            document.getElementById('portfolioResults').style.display = 'block';
        } catch (error) {
            this.showError('Failed to run portfolio simulation');
        } finally {
            this.showLoading(false);
        }
    }

    async searchCompany() {
        const symbol = document.getElementById('companySearchInput').value.trim().toUpperCase();
        if (!symbol) {
            this.showError('Please enter a stock symbol');
            return;
        }

        this.showLoading(true);
        try {
            await this.loadCompanyFundamentals(symbol);
            await this.loadCompanyNews(symbol);
            await this.loadSentimentAnalysis(symbol);
            
            // Show the fundamentals section
            document.getElementById('companyFundamentals').style.display = 'block';
            
            // Show company-specific news tabs
            document.getElementById('companyNewsTab').style.display = 'block';
            document.getElementById('sentimentTab').style.display = 'block';
            
            // Update tab labels with company symbol
            document.getElementById('companyNewsTab').textContent = `${symbol} News`;
            document.getElementById('sentimentTab').textContent = `${symbol} Sentiment`;
            
            // Scroll to fundamentals section
            document.getElementById('companyFundamentals').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            this.showError(`Failed to load data for ${symbol}. Please try again.`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadCompanyFundamentals(symbol) {
        try {
            const data = await this.apiCall('GET', `/fundamentals/${symbol}`);
            this.renderCompanyFundamentals(data);
        } catch (error) {
            console.error('Error loading company fundamentals:', error);
        }
    }

    async loadCompanyNews(symbol) {
        try {
            const data = await this.apiCall('GET', `/company-news/${symbol}`);
            this.renderCompanyNews(data);
        } catch (error) {
            console.error('Error loading company news:', error);
        }
    }

    async loadSentimentAnalysis(symbol) {
        try {
            const data = await this.apiCall('GET', `/sentiment-analysis/${symbol}`);
            this.renderSentimentAnalysis(data);
        } catch (error) {
            console.error('Error loading sentiment analysis:', error);
        }
    }

    async loadMarketNews() {
        try {
            const category = document.getElementById('newsCategory').value;
            const data = await this.apiCall('GET', `/market-news?category=${category}&limit=20`);
            this.renderMarketNews(data);
        } catch (error) {
            console.error('Error loading market news:', error);
        }
    }

    renderCompanyFundamentals(data) {
        // Render company info
        this.renderCompanyInfo(data.company, data.symbol);
        
        // Render overview tab (key metrics and peer comparison)
        this.renderKeyMetrics(data.keyRatios, data.financialStatements);
        this.renderPeerComparison(data.peerComparison);
        
        // Render financial statements
        this.renderFinancialStatements(data.financialStatements);
        
        // Render ratios
        this.renderFinancialRatios(data.keyRatios);
        
        // Render analyst data
        this.renderAnalystRatings(data.analystRatings);
        
        // Render governance data
        this.renderExecutiveCompensation(data.executiveComp);
        this.renderInsiderTrading(data.insiderTrading);
        
        // Render ESG data
        this.renderESGScores(data.esgScores);
    }

    renderCompanyInfo(company, symbol) {
        const container = document.getElementById('companyInfo');
        container.innerHTML = `
            <div class="company-header">
                <div class="company-title">
                    <h3>${company.name || symbol}</h3>
                    <span class="company-symbol">${symbol}</span>
                </div>
                <div class="company-details">
                    <span><i class="fas fa-industry"></i> ${company.sector || 'N/A'}</span>
                    <span><i class="fas fa-building"></i> ${company.industry || 'N/A'}</span>
                    <span><i class="fas fa-users"></i> ${company.employees ? company.employees.toLocaleString() : 'N/A'} employees</span>
                </div>
            </div>
        `;
    }

    renderKeyMetrics(ratios, financials) {
        const container = document.getElementById('keyMetrics');
        if (!ratios || !ratios.valuation) {
            container.innerHTML = '<p>Key metrics data not available</p>';
            return;
        }

        container.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-label">P/E Ratio</div>
                    <div class="metric-value">${ratios.valuation.priceToEarnings?.toFixed(2) || 'N/A'}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">P/B Ratio</div>
                    <div class="metric-value">${ratios.valuation.priceToBook?.toFixed(2) || 'N/A'}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">ROE</div>
                    <div class="metric-value">${ratios.profitability?.returnOnEquity?.toFixed(2) || 'N/A'}%</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Net Margin</div>
                    <div class="metric-value">${ratios.profitability?.netMargin?.toFixed(2) || 'N/A'}%</div>
                </div>
            </div>
        `;
    }

    renderPeerComparison(peerData) {
        const container = document.getElementById('peerComparison');
        if (!peerData || !peerData.comparison) {
            container.innerHTML = '<p>Peer comparison data not available</p>';
            return;
        }

        const comparison = peerData.comparison;
        container.innerHTML = `
            <div class="peer-metrics">
                <div class="peer-metric">
                    <div class="metric-name">Market Cap Rank</div>
                    <div class="metric-rank">#${comparison.marketCap?.rank || 'N/A'}</div>
                </div>
                <div class="peer-metric">
                    <div class="metric-name">P/E Rank</div>
                    <div class="metric-rank">#${comparison.peRatio?.rank || 'N/A'}</div>
                </div>
                <div class="peer-metric">
                    <div class="metric-name">Revenue Rank</div>
                    <div class="metric-rank">#${comparison.revenue?.rank || 'N/A'}</div>
                </div>
            </div>
            <div class="peer-list">
                <strong>Peers:</strong> ${peerData.peers?.join(', ') || 'N/A'}
            </div>
        `;
    }

    renderFinancialStatements(statements) {
        if (!statements) return;

        // Income Statement
        this.renderIncomeStatement(statements.incomeStatement);
        
        // Balance Sheet
        this.renderBalanceSheet(statements.balanceSheet);
        
        // Cash Flow
        this.renderCashFlow(statements.cashFlow);
    }

    renderIncomeStatement(incomeStatement) {
        const container = document.getElementById('incomeStatement');
        if (!incomeStatement || !incomeStatement.annual) {
            container.innerHTML = '<p>Income statement data not available</p>';
            return;
        }

        const latest = incomeStatement.annual[0];
        container.innerHTML = `
            <div class="financial-items">
                <div class="financial-item">
                    <span>Revenue</span>
                    <span>$${this.formatLargeNumber(latest.revenue)}</span>
                </div>
                <div class="financial-item">
                    <span>Gross Profit</span>
                    <span>$${this.formatLargeNumber(latest.grossProfit)}</span>
                </div>
                <div class="financial-item">
                    <span>Operating Income</span>
                    <span>$${this.formatLargeNumber(latest.operatingIncome)}</span>
                </div>
                <div class="financial-item">
                    <span>Net Income</span>
                    <span>$${this.formatLargeNumber(latest.netIncome)}</span>
                </div>
                <div class="financial-item">
                    <span>EPS</span>
                    <span>$${latest.eps?.toFixed(2) || 'N/A'}</span>
                </div>
            </div>
        `;
    }

    renderBalanceSheet(balanceSheet) {
        const container = document.getElementById('balanceSheet');
        if (!balanceSheet) {
            container.innerHTML = '<p>Balance sheet data not available</p>';
            return;
        }

        container.innerHTML = `
            <div class="financial-items">
                <div class="financial-item">
                    <span>Total Assets</span>
                    <span>$${this.formatLargeNumber(balanceSheet.totalAssets)}</span>
                </div>
                <div class="financial-item">
                    <span>Total Liabilities</span>
                    <span>$${this.formatLargeNumber(balanceSheet.totalLiabilities)}</span>
                </div>
                <div class="financial-item">
                    <span>Shareholders' Equity</span>
                    <span>$${this.formatLargeNumber(balanceSheet.shareholdersEquity)}</span>
                </div>
                <div class="financial-item">
                    <span>Cash</span>
                    <span>$${this.formatLargeNumber(balanceSheet.cash)}</span>
                </div>
                <div class="financial-item">
                    <span>Total Debt</span>
                    <span>$${this.formatLargeNumber(balanceSheet.totalDebt)}</span>
                </div>
            </div>
        `;
    }

    renderCashFlow(cashFlow) {
        const container = document.getElementById('cashFlow');
        if (!cashFlow) {
            container.innerHTML = '<p>Cash flow data not available</p>';
            return;
        }

        container.innerHTML = `
            <div class="financial-items">
                <div class="financial-item">
                    <span>Operating Cash Flow</span>
                    <span>$${this.formatLargeNumber(cashFlow.operatingCashFlow)}</span>
                </div>
                <div class="financial-item">
                    <span>Investing Cash Flow</span>
                    <span>$${this.formatLargeNumber(cashFlow.investingCashFlow)}</span>
                </div>
                <div class="financial-item">
                    <span>Financing Cash Flow</span>
                    <span>$${this.formatLargeNumber(cashFlow.financingCashFlow)}</span>
                </div>
                <div class="financial-item">
                    <span>Free Cash Flow</span>
                    <span>$${this.formatLargeNumber(cashFlow.freeCashFlow)}</span>
                </div>
                <div class="financial-item">
                    <span>Capital Expenditures</span>
                    <span>$${this.formatLargeNumber(cashFlow.capex)}</span>
                </div>
            </div>
        `;
    }

    renderFinancialRatios(ratios) {
        if (!ratios) return;

        this.renderRatioCategory('profitabilityRatios', ratios.profitability, '%');
        this.renderRatioCategory('liquidityRatios', ratios.liquidity, '');
        this.renderRatioCategory('leverageRatios', ratios.leverage, '');
        this.renderRatioCategory('valuationRatios', ratios.valuation, '');
    }

    renderRatioCategory(containerId, ratioData, suffix) {
        const container = document.getElementById(containerId);
        if (!ratioData) {
            container.innerHTML = '<p>Data not available</p>';
            return;
        }

        container.innerHTML = Object.entries(ratioData)
            .map(([key, value]) => `
                <div class="ratio-item">
                    <span>${this.formatRatioName(key)}</span>
                    <span>${typeof value === 'number' ? value.toFixed(2) + suffix : 'N/A'}</span>
                </div>
            `).join('');
    }

    renderAnalystRatings(ratings) {
        if (!ratings) return;

        // Render analyst ratings
        const ratingsContainer = document.getElementById('analystRatings');
        if (ratings.consensus) {
            ratingsContainer.innerHTML = `
                <div class="analyst-consensus">
                    <div class="consensus-rating">
                        <span class="rating-badge ${ratings.consensus.rating.toLowerCase()}">${ratings.consensus.rating}</span>
                        <span class="rating-score">${ratings.consensus.score}/5</span>
                    </div>
                    <div class="analyst-count">${ratings.consensus.totalAnalysts} Analysts</div>
                </div>
                <div class="rating-breakdown">
                    <div class="rating-bar">
                        <span>Strong Buy</span>
                        <div class="bar"><div class="fill" style="width: ${(ratings.ratings.strongBuy / ratings.consensus.totalAnalysts * 100)}%"></div></div>
                        <span>${ratings.ratings.strongBuy}</span>
                    </div>
                    <div class="rating-bar">
                        <span>Buy</span>
                        <div class="bar"><div class="fill" style="width: ${(ratings.ratings.buy / ratings.consensus.totalAnalysts * 100)}%"></div></div>
                        <span>${ratings.ratings.buy}</span>
                    </div>
                    <div class="rating-bar">
                        <span>Hold</span>
                        <div class="bar"><div class="fill" style="width: ${(ratings.ratings.hold / ratings.consensus.totalAnalysts * 100)}%"></div></div>
                        <span>${ratings.ratings.hold}</span>
                    </div>
                </div>
            `;
        }

        // Render price targets
        const targetsContainer = document.getElementById('priceTargets');
        if (ratings.priceTargets) {
            const targets = ratings.priceTargets;
            targetsContainer.innerHTML = `
                <div class="price-targets">
                    <div class="target-item">
                        <span>Average Target</span>
                        <span class="target-price">$${targets.average?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="target-range">
                        <span>Range: $${targets.low?.toFixed(2) || 'N/A'} - $${targets.high?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="upside">
                        <span class="${targets.upside > 0 ? 'positive' : 'negative'}">
                            Upside: ${targets.upside?.toFixed(1) || 'N/A'}%
                        </span>
                    </div>
                </div>
            `;
        }

        // Render recent changes
        const changesContainer = document.getElementById('recentChanges');
        if (ratings.recentChanges) {
            changesContainer.innerHTML = ratings.recentChanges.map(change => `
                <div class="analyst-change">
                    <div class="change-header">
                        <strong>${change.analyst}</strong>
                        <span class="change-date">${this.formatDate(change.date)}</span>
                    </div>
                    <div class="change-details">
                        <span class="action ${change.action.toLowerCase()}">${change.action}</span>
                        ${change.from ? `<span>${change.from} → ${change.to}</span>` : `<span>${change.rating}</span>`}
                        <span class="price-target">$${change.priceTarget?.toFixed(2) || 'N/A'}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    renderExecutiveCompensation(execComp) {
        const container = document.getElementById('executiveComp');
        if (!execComp || !execComp.ceo) {
            container.innerHTML = '<p>Executive compensation data not available</p>';
            return;
        }

        container.innerHTML = `
            <div class="exec-comp">
                <div class="ceo-comp">
                    <h4>${execComp.ceo.name} (${execComp.ceo.title})</h4>
                    <div class="comp-breakdown">
                        <div class="comp-item">
                            <span>Total Compensation</span>
                            <span class="comp-value">$${this.formatLargeNumber(execComp.ceo.totalCompensation)}</span>
                        </div>
                        <div class="comp-item">
                            <span>Base Salary</span>
                            <span>$${this.formatLargeNumber(execComp.ceo.salary)}</span>
                        </div>
                        <div class="comp-item">
                            <span>Stock Awards</span>
                            <span>$${this.formatLargeNumber(execComp.ceo.stockAwards)}</span>
                        </div>
                    </div>
                </div>
                ${execComp.payRatio ? `
                    <div class="pay-ratio">
                        <span>CEO to Median Worker Pay Ratio</span>
                        <span class="ratio-value">${execComp.payRatio.ceoToMedianWorker}:1</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderInsiderTrading(insiderData) {
        const container = document.getElementById('insiderTrading');
        if (!insiderData || !insiderData.recentTransactions) {
            container.innerHTML = '<p>Insider trading data not available</p>';
            return;
        }

        container.innerHTML = `
            <div class="insider-summary">
                <div class="summary-item">
                    <span>3-Month Net</span>
                    <span class="${insiderData.summary.last3Months.sentiment.toLowerCase()}">
                        ${this.formatLargeNumber(insiderData.summary.last3Months.netValue)}
                    </span>
                </div>
                <div class="summary-item">
                    <span>Sentiment</span>
                    <span class="${insiderData.summary.last3Months.sentiment.toLowerCase()}">
                        ${insiderData.summary.last3Months.sentiment}
                    </span>
                </div>
            </div>
            <div class="insider-transactions">
                ${insiderData.recentTransactions.slice(0, 5).map(transaction => `
                    <div class="transaction-item">
                        <div class="transaction-header">
                            <strong>${transaction.insider}</strong>
                            <span class="transaction-type ${transaction.transactionType.toLowerCase()}">${transaction.transactionType}</span>
                        </div>
                        <div class="transaction-details">
                            <span>${transaction.shares.toLocaleString()} shares @ $${transaction.pricePerShare}</span>
                            <span class="total-value">$${this.formatLargeNumber(transaction.totalValue)}</span>
                            <span class="transaction-date">${this.formatDate(transaction.date)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderESGScores(esgData) {
        if (!esgData) return;

        // ESG Overview
        const overviewContainer = document.getElementById('esgOverview');
        overviewContainer.innerHTML = `
            <div class="esg-score-card">
                <div class="overall-score">
                    <div class="score-circle">
                        <span class="score-number">${esgData.overallScore || 0}</span>
                        <span class="score-grade">${esgData.grade || 'N/A'}</span>
                    </div>
                </div>
                <div class="esg-details">
                    <div class="detail-item">
                        <span>Industry Rank</span>
                        <span>#${esgData.peerRank || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span>Risk Level</span>
                        <span class="risk-${(esgData.riskLevel || 'unknown').toLowerCase()}">${esgData.riskLevel || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span>vs Industry Avg</span>
                        <span>${esgData.industryAverage || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;

        // ESG Breakdown
        const breakdownContainer = document.getElementById('esgBreakdown');
        if (esgData.environmental && esgData.social && esgData.governance) {
            breakdownContainer.innerHTML = `
                <div class="esg-categories">
                    <div class="esg-category">
                        <h4><i class="fas fa-leaf"></i> Environmental</h4>
                        <div class="category-score">${esgData.environmental.score} (${esgData.environmental.grade})</div>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${esgData.environmental.score}%"></div>
                        </div>
                    </div>
                    <div class="esg-category">
                        <h4><i class="fas fa-users"></i> Social</h4>
                        <div class="category-score">${esgData.social.score} (${esgData.social.grade})</div>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${esgData.social.score}%"></div>
                        </div>
                    </div>
                    <div class="esg-category">
                        <h4><i class="fas fa-gavel"></i> Governance</h4>
                        <div class="category-score">${esgData.governance.score} (${esgData.governance.grade})</div>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${esgData.governance.score}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    renderMarketNews(newsData) {
        // Render news summary
        const summaryContainer = document.getElementById('newsSummary');
        if (newsData.summary) {
            summaryContainer.innerHTML = `
                <div class="news-stats">
                    <div class="stat-item">
                        <span class="stat-number">${newsData.summary.totalArticles}</span>
                        <span class="stat-label">Articles</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number positive">${newsData.summary.sentimentBreakdown.positive}</span>
                        <span class="stat-label">Positive</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number negative">${newsData.summary.sentimentBreakdown.negative}</span>
                        <span class="stat-label">Negative</span>
                    </div>
                </div>
                <div class="overall-sentiment">
                    <span class="sentiment-badge ${newsData.sentimentAnalysis.label}">
                        Overall: ${newsData.sentimentAnalysis.label}
                    </span>
                </div>
            `;
        }

        // Render news articles
        const newsContainer = document.getElementById('marketNewsList');
        if (newsData.articles && newsData.articles.length > 0) {
            newsContainer.innerHTML = newsData.articles.map(article => this.createNewsArticle(article)).join('');
        } else {
            newsContainer.innerHTML = '<p>No news articles available</p>';
        }
    }

    renderCompanyNews(newsData) {
        const headerContainer = document.getElementById('companyNewsHeader');
        headerContainer.innerHTML = `
            <div class="company-news-stats">
                <div class="news-impact">
                    <span>Impact Score</span>
                    <span class="impact-score">${(newsData.impactScore * 100).toFixed(0) || 0}%</span>
                </div>
                <div class="news-sentiment">
                    <span>Sentiment</span>
                    <span class="sentiment-badge ${newsData.sentimentAnalysis?.label || 'neutral'}">
                        ${newsData.sentimentAnalysis?.label || 'Neutral'}
                    </span>
                </div>
            </div>
        `;

        const newsContainer = document.getElementById('companyNewsList');
        if (newsData.articles && newsData.articles.length > 0) {
            newsContainer.innerHTML = newsData.articles.map(article => this.createNewsArticle(article)).join('');
        } else {
            newsContainer.innerHTML = '<p>No company news available</p>';
        }
    }

    renderSentimentAnalysis(sentimentData) {
        // Overview
        const overviewContainer = document.getElementById('sentimentOverview');
        if (sentimentData.overall) {
            overviewContainer.innerHTML = `
                <div class="sentiment-score-card">
                    <div class="overall-sentiment-score">
                        <div class="score-circle">
                            <span class="score-number">${(sentimentData.overall.score * 100).toFixed(0)}</span>
                            <span class="score-direction ${sentimentData.overall.direction}">${sentimentData.overall.direction}</span>
                        </div>
                    </div>
                    <div class="sentiment-details">
                        <div class="detail-item">
                            <span>Confidence</span>
                            <span>${(sentimentData.overall.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div class="detail-item">
                            <span>Change</span>
                            <span class="${sentimentData.overall.change.startsWith('+') ? 'positive' : 'negative'}">
                                ${sentimentData.overall.change}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Breakdown
        const breakdownContainer = document.getElementById('sentimentBreakdown');
        if (sentimentData.breakdown) {
            breakdownContainer.innerHTML = `
                <div class="sentiment-sources">
                    <div class="source-item">
                        <h4><i class="fas fa-newspaper"></i> News</h4>
                        <div class="source-score">${(sentimentData.breakdown.news.score * 100).toFixed(0)}</div>
                        <div class="source-details">${sentimentData.breakdown.news.articles} articles</div>
                    </div>
                    <div class="source-item">
                        <h4><i class="fas fa-comments"></i> Social</h4>
                        <div class="source-score">${(sentimentData.breakdown.social.score * 100).toFixed(0)}</div>
                        <div class="source-details">${sentimentData.breakdown.social.mentions} mentions</div>
                    </div>
                    <div class="source-item">
                        <h4><i class="fas fa-user-tie"></i> Analyst</h4>
                        <div class="source-score">${(sentimentData.breakdown.analyst.score * 100).toFixed(0)}</div>
                        <div class="source-details">${sentimentData.breakdown.analyst.upgrades} upgrades</div>
                    </div>
                </div>
            `;
        }

        // Trends
        const trendsContainer = document.getElementById('sentimentTrends');
        if (sentimentData.trends && sentimentData.trends.daily) {
            trendsContainer.innerHTML = `
                <div class="trend-chart">
                    <h4>7-Day Sentiment Trend</h4>
                    <div class="trend-bars">
                        ${sentimentData.trends.daily.map(point => `
                            <div class="trend-bar">
                                <div class="bar-fill" style="height: ${point.score * 100}%"></div>
                                <div class="bar-label">${point.period.split('-')[2]}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    createNewsArticle(article) {
        return `
            <div class="news-article">
                <div class="article-header">
                    <h4 class="article-title">${article.title}</h4>
                    <div class="article-meta">
                        <span class="article-source">${article.source}</span>
                        <span class="article-time">${article.publishedAgo || this.getTimeAgo(article.publishedAt)}</span>
                        ${article.sentiment ? `
                            <span class="sentiment-badge ${article.sentiment.label}">${article.sentiment.label}</span>
                        ` : ''}
                    </div>
                </div>
                <p class="article-description">${article.description}</p>
                ${article.keywords && article.keywords.length > 0 ? `
                    <div class="article-keywords">
                        ${article.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    switchFundamentalsTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.company-fundamentals .tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.company-fundamentals .tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    switchNewsTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.news-sentiment .tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.news-sentiment .tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    renderFutureProjectionResults(data) {
        const container = document.getElementById('futureResults');
        container.innerHTML = `
            <div class="results-header">
                <h3><i class="fas fa-chart-line"></i> Future Investment Projection Results</h3>
                <p>Investment: $${data.initialAmount.toFixed(2)} in ${data.symbol} for ${data.days} days</p>
            </div>
            
            <div class="investment-summary">
                <div class="summary-card">
                    <h4>Expected Value</h4>
                    <div class="value neutral">$${data.projectedValue.expected.toFixed(2)}</div>
                    <div class="change">${data.returns.expected > 0 ? '+' : ''}${data.returns.expected.toFixed(2)}%</div>
                </div>
                <div class="summary-card">
                    <h4>Best Case Scenario</h4>
                    <div class="value positive">$${data.projectedValue.best.toFixed(2)}</div>
                    <div class="change">+${data.returns.bestCase.toFixed(2)}%</div>
                </div>
                <div class="summary-card">
                    <h4>Worst Case Scenario</h4>
                    <div class="value negative">$${data.projectedValue.worst.toFixed(2)}</div>
                    <div class="change">${data.returns.worstCase.toFixed(2)}%</div>
                </div>
                <div class="summary-card">
                    <h4>Median Outcome</h4>
                    <div class="value neutral">$${data.projectedValue.median.toFixed(2)}</div>
                    <div class="change">${((data.projectedValue.median - data.initialAmount) / data.initialAmount * 100).toFixed(2)}%</div>
                </div>
            </div>

            <div class="scenarios-grid">
                <div class="scenario-card">
                    <h5>Bull Market</h5>
                    <div class="scenario-value positive">$${data.scenarios.bull.toFixed(2)}</div>
                </div>
                <div class="scenario-card">
                    <h5>Bear Market</h5>
                    <div class="scenario-value negative">$${data.scenarios.bear.toFixed(2)}</div>
                </div>
                <div class="scenario-card">
                    <h5>Neutral Market</h5>
                    <div class="scenario-value neutral">$${data.scenarios.neutral.toFixed(2)}</div>
                </div>
            </div>

            <div class="risk-metrics">
                <div class="risk-metric">
                    <div class="metric-label">Volatility</div>
                    <div class="metric-value">${data.riskMetrics.volatility.toFixed(1)}%</div>
                </div>
                <div class="risk-metric">
                    <div class="metric-label">Max Drawdown</div>
                    <div class="metric-value">${(data.riskMetrics.maxDrawdown * 100).toFixed(1)}%</div>
                </div>
                <div class="risk-metric">
                    <div class="metric-label">Sharpe Ratio</div>
                    <div class="metric-value">${data.riskMetrics.sharpeRatio.toFixed(2)}</div>
                </div>
            </div>

            <div class="warning-box">
                <i class="fas fa-exclamation-triangle"></i>
                These projections are estimates based on historical data and should not be considered as financial advice.
            </div>
        `;
    }

    renderHistoricalWhatIfResults(data) {
        const container = document.getElementById('historicalResults');
        const gainLoss = data.totalReturn >= 0 ? 'positive' : 'negative';
        
        container.innerHTML = `
            <div class="results-header">
                <h3><i class="fas fa-history"></i> Historical "What If" Analysis</h3>
                <p>If you invested $${data.initialAmount.toFixed(2)} in ${data.symbol} on ${data.investmentDate}</p>
            </div>
            
            <div class="investment-summary">
                <div class="summary-card">
                    <h4>Current Value</h4>
                    <div class="value ${gainLoss}">$${data.currentValue.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h4>Total Return</h4>
                    <div class="value ${gainLoss}">${data.totalReturn >= 0 ? '+' : ''}$${data.totalReturn.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h4>Percentage Return</h4>
                    <div class="value ${gainLoss}">${data.percentageReturn >= 0 ? '+' : ''}${data.percentageReturn.toFixed(2)}%</div>
                </div>
                <div class="summary-card">
                    <h4>Annualized Return</h4>
                    <div class="value ${gainLoss}">${data.annualizedReturn.toFixed(2)}%</div>
                </div>
            </div>

            <div class="historical-comparison">
                <h4>Market Comparison</h4>
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <div class="label">S&P 500 Return</div>
                        <div class="value">${data.comparison.spyReturn.toFixed(2)}%</div>
                    </div>
                    <div class="comparison-item">
                        <div class="label">Inflation Adjusted</div>
                        <div class="value">$${data.comparison.inflationAdjusted.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div class="scenarios-grid">
                <div class="scenario-card">
                    <h5>Bull Market Scenario</h5>
                    <div class="scenario-value positive">$${data.scenarios.bull.value.toFixed(2)}</div>
                </div>
                <div class="scenario-card">
                    <h5>Bear Market Scenario</h5>
                    <div class="scenario-value negative">$${data.scenarios.bear.value.toFixed(2)}</div>
                </div>
                <div class="scenario-card">
                    <h5>Market Crash Scenario</h5>
                    <div class="scenario-value negative">$${data.scenarios.crash.value.toFixed(2)}</div>
                </div>
            </div>

            <div class="warning-box">
                <i class="fas fa-info-circle"></i>
                This analysis is based on simulated historical performance and may not reflect actual market conditions.
            </div>
        `;
    }

    renderPortfolioSimulationResults(data) {
        const container = document.getElementById('portfolioResults');
        const expectedReturn = data.portfolioMetrics.expectedReturn;
        const returnClass = expectedReturn >= 0 ? 'positive' : 'negative';
        
        container.innerHTML = `
            <div class="results-header">
                <h3><i class="fas fa-pie-chart"></i> Portfolio Simulation Results</h3>
                <p>Investment: $${data.totalAmount.toFixed(2)} for ${data.days} days</p>
            </div>
            
            <div class="investment-summary">
                <div class="summary-card">
                    <h4>Expected Portfolio Value</h4>
                    <div class="value ${returnClass}">$${data.portfolioMetrics.expectedValue.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h4>Expected Return</h4>
                    <div class="value ${returnClass}">${expectedReturn >= 0 ? '+' : ''}${expectedReturn.toFixed(2)}%</div>
                </div>
                <div class="summary-card">
                    <h4>Portfolio Volatility</h4>
                    <div class="value neutral">${data.portfolioMetrics.volatility.toFixed(2)}%</div>
                </div>
                <div class="summary-card">
                    <h4>Sharpe Ratio</h4>
                    <div class="value neutral">${data.portfolioMetrics.sharpeRatio.toFixed(2)}</div>
                </div>
            </div>

            <div class="portfolio-breakdown">
                <h4>Portfolio Breakdown</h4>
                ${Object.entries(data.portfolio).map(([symbol, details]) => `
                    <div class="portfolio-item">
                        <div class="symbol">${symbol}</div>
                        <div class="allocation">${details.allocation}% ($${details.amount.toFixed(2)})</div>
                        <div class="projected-value">$${details.simulation.projectedValue.expected.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>

            <div class="risk-metrics">
                <div class="risk-metric">
                    <div class="metric-label">Value at Risk (95%)</div>
                    <div class="metric-value">$${Math.abs(data.riskAnalysis.valueAtRisk).toFixed(2)}</div>
                </div>
                <div class="risk-metric">
                    <div class="metric-label">Conditional VaR</div>
                    <div class="metric-value">$${Math.abs(data.riskAnalysis.conditionalVaR).toFixed(2)}</div>
                </div>
                <div class="risk-metric">
                    <div class="metric-label">Diversification Benefit</div>
                    <div class="metric-value">${(data.portfolioMetrics.diversificationBenefit * 100).toFixed(1)}%</div>
                </div>
            </div>

            <div class="warning-box">
                <i class="fas fa-shield-alt"></i>
                Diversification can help reduce risk, but it does not guarantee profits or protect against losses.
            </div>
        `;
    }

    addPortfolioAllocation() {
        const container = document.getElementById('portfolioAllocations');
        const allocationItem = document.createElement('div');
        allocationItem.className = 'allocation-item';
        allocationItem.innerHTML = `
            <select class="asset-select">
                <option value="AAPL">Apple (AAPL)</option>
                <option value="MSFT">Microsoft (MSFT)</option>
                <option value="GOOGL">Google (GOOGL)</option>
                <option value="AMZN">Amazon (AMZN)</option>
                <option value="TSLA">Tesla (TSLA)</option>
                <option value="META">Meta (META)</option>
                <option value="NVDA">NVIDIA (NVDA)</option>
                <option value="SPY">S&P 500 (SPY)</option>
                <option value="QQQ">NASDAQ (QQQ)</option>
                <option value="moderate">Moderate Portfolio</option>
                <option value="conservative">Conservative Portfolio</option>
            </select>
            <input type="number" class="allocation-percent" placeholder="0" min="0" max="100" step="0.1">
            <span>%</span>
            <button class="remove-allocation btn btn-secondary">Remove</button>
        `;
        
        container.appendChild(allocationItem);
        this.bindPortfolioAllocationListeners();
    }

    bindPortfolioAllocationListeners() {
        // Remove allocation listeners
        document.querySelectorAll('.remove-allocation').forEach(btn => {
            btn.removeEventListener('click', this.removeAllocation);
            btn.addEventListener('click', this.removeAllocation.bind(this));
        });

        // Allocation change listeners
        document.querySelectorAll('.allocation-percent').forEach(input => {
            input.removeEventListener('input', this.updateTotalAllocation);
            input.addEventListener('input', this.updateTotalAllocation.bind(this));
        });

        this.updateTotalAllocation();
    }

    removeAllocation(event) {
        event.target.closest('.allocation-item').remove();
        this.updateTotalAllocation();
    }

    updateTotalAllocation() {
        const allocations = document.querySelectorAll('.allocation-percent');
        let total = 0;
        allocations.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        
        const totalElement = document.getElementById('totalAllocation');
        totalElement.textContent = total.toFixed(1);
        
        // Color coding for total
        if (Math.abs(total - 100) < 0.1) {
            totalElement.style.color = '#10b981'; // Green
        } else if (total > 100) {
            totalElement.style.color = '#ef4444'; // Red
        } else {
            totalElement.style.color = '#f59e0b'; // Orange
        }
    }

    getPortfolioAllocations() {
        const portfolio = {};
        const allocationItems = document.querySelectorAll('.allocation-item');
        
        allocationItems.forEach(item => {
            const symbol = item.querySelector('.asset-select').value;
            const allocation = parseFloat(item.querySelector('.allocation-percent').value) || 0;
            if (allocation > 0) {
                portfolio[symbol] = allocation;
            }
        });
        
        return portfolio;
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            return 'Recently';
        }
    }

    formatLargeNumber(num) {
        if (num === null || num === undefined) return 'N/A';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    formatRatioName(camelCase) {
        return camelCase.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StockMarketApp();
});