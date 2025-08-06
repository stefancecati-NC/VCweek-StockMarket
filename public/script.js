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
        // Initialize charts after all other data is loaded and DOM is ready
        setTimeout(() => {
            this.initializeCharts();
        }, 2000);
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
                this.loadEarningsCalendar(),
                this.loadStrategyTemplates()
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
        
        // Options trading event listeners
        this.bindOptionsEventListeners();
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

    // Chart functionality
    initializeCharts() {
        console.log('Initializing charts...');
        
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        // Check if chart elements exist
        const requiredElements = ['spyChart', 'qqqChart', 'diaChart'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('Missing chart elements:', missingElements);
            console.log('Retrying chart initialization in 1 second...');
            setTimeout(() => this.initializeCharts(), 1000);
            return;
        }
        
        // Check if charts section exists
        const chartsSection = document.querySelector('.charts-section');
        if (!chartsSection) {
            console.error('Charts section not found');
            return;
        }
        
        console.log('All chart elements found, proceeding with initialization');
        this.charts = {};
        this.currentTimeframe = '1D';
        this.bindChartEventListeners();
        this.loadChartsData();
    }

    bindChartEventListeners() {
        // Timeframe button listeners
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active button
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update timeframe and reload charts
                this.currentTimeframe = e.target.dataset.timeframe;
                this.loadChartsData();
            });
        });
    }

    async loadChartsData() {
        const symbols = ['SPY', 'QQQ', 'DIA'];
        
        console.log('Loading charts data for symbols:', symbols);
        
        // Generate mock data for each symbol and create charts
        for (const symbol of symbols) {
            console.log(`Processing chart for ${symbol}`);
            
            const chartElementId = `${symbol.toLowerCase()}Chart`;
            const chartElement = document.getElementById(chartElementId);
            
            if (!chartElement) {
                console.error(`Chart element ${chartElementId} not found`);
                continue;
            }

            const chartContainer = chartElement.parentNode;
            if (!chartContainer) {
                console.error(`Chart container for ${chartElementId} not found`);
                continue;
            }

            // Show loading state
            chartContainer.innerHTML = `
                <div class="chart-title">${this.getChartTitle(symbol)}</div>
                <div class="chart-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    Loading chart data...
                </div>
            `;

            // Wait a moment for DOM update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Recreate the canvas element
            chartContainer.innerHTML = `
                <div class="chart-title">${this.getChartTitle(symbol)}</div>
                <canvas id="${chartElementId}" width="400" height="200"></canvas>
            `;

            // Wait for canvas to be ready
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const chartData = this.generateMockChartData(symbol, this.currentTimeframe);
            this.createChart(symbol, chartData);
        }
    }

    generateMockChartData(symbol, timeframe) {
        const points = this.getDataPointsForTimeframe(timeframe);
        const basePrice = this.getBasePriceForSymbol(symbol);
        const data = [];
        const labels = [];
        
        let currentPrice = basePrice;
        const startDate = new Date();
        
        // Generate historical data points
        for (let i = points - 1; i >= 0; i--) {
            const date = new Date(startDate);
            
            switch (timeframe) {
                case '1D':
                    date.setHours(date.getHours() - i);
                    labels.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                    break;
                case '1W':
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
                    break;
                case '1M':
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                    break;
                case '1Y':
                    date.setMonth(date.getMonth() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
                    break;
            }
            
            // Generate realistic price movement with trend
            const volatility = this.getVolatilityForSymbol(symbol);
            const trendFactor = this.getTrendForSymbol(symbol, timeframe);
            const randomChange = (Math.random() - 0.5) * volatility;
            const trendChange = trendFactor * 0.001; // Small trend component
            const totalChange = randomChange + trendChange;
            currentPrice *= (1 + totalChange);
            data.push(parseFloat(currentPrice.toFixed(2)));
        }
        
        return { labels, data };
    }

    getDataPointsForTimeframe(timeframe) {
        switch (timeframe) {
            case '1D': return 24; // 24 hours
            case '1W': return 7;  // 7 days
            case '1M': return 30; // 30 days
            case '1Y': return 12; // 12 months
            default: return 24;
        }
    }

    getBasePriceForSymbol(symbol) {
        const basePrices = {
            'SPY': 450.25, // Updated S&P 500 ETF price
            'QQQ': 385.30, // Updated NASDAQ ETF price  
            'DIA': 355.80  // Updated Dow Jones ETF price
        };
        return basePrices[symbol] || 400;
    }

    getVolatilityForSymbol(symbol) {
        const volatilities = {
            'SPY': 0.015, // 1.5% daily volatility
            'QQQ': 0.025, // 2.5% daily volatility
            'DIA': 0.012  // 1.2% daily volatility
        };
        return volatilities[symbol] || 0.02;
    }

    getTrendForSymbol(symbol, timeframe) {
        // Simulate realistic market trends based on symbol and timeframe
        const trends = {
            'SPY': { '1D': 0.2, '1W': 0.8, '1M': 1.2, '1Y': 2.5 }, // Generally upward trending
            'QQQ': { '1D': 0.1, '1W': 1.0, '1M': 1.5, '1Y': 3.2 }, // Tech growth trend
            'DIA': { '1D': 0.3, '1W': 0.6, '1M': 0.9, '1Y': 1.8 }  // Conservative growth
        };
        return trends[symbol] && trends[symbol][timeframe] || 1.0;
    }

    getChartTitle(symbol) {
        const titles = {
            'SPY': 'S&P 500 (SPY)',
            'QQQ': 'NASDAQ (QQQ)',
            'DIA': 'Dow Jones (DIA)'
        };
        return titles[symbol] || symbol;
    }

    createChart(symbol, chartData) {
        const chartId = `${symbol.toLowerCase()}Chart`;
        const chartElement = document.getElementById(chartId);
        
        if (!chartElement) {
            console.warn(`Chart element ${chartId} not found`);
            return;
        }
        
        console.log(`Creating chart for ${symbol}`);
        
        const chartContext = chartElement.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts[symbol]) {
            this.charts[symbol].destroy();
        }
        
        // Determine if price trend is up or down
        const isPositive = chartData.data[chartData.data.length - 1] > chartData.data[0];
        const color = isPositive ? '#059669' : '#dc2626';
        
        try {
            this.charts[symbol] = new Chart(chartContext, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: symbol,
                    data: chartData.data,
                    borderColor: color,
                    backgroundColor: `${color}20`,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: color,
                    pointBorderColor: color,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#333',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `$${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(102, 126, 234, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 11
                            },
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(102, 126, 234, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
        } catch (error) {
            console.error(`Error creating chart for ${symbol}:`, error);
            // Show error message in chart container
            chartElement.parentNode.innerHTML = `
                <div class="chart-title">${this.getChartTitle(symbol)}</div>
                <div class="chart-loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading chart
                </div>
            `;
        }
    }

    async loadStrategyTemplates() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/options-strategies`);
            const strategies = await response.json();
            this.renderStrategyTemplates(strategies);
            // Load default expiration dates for strategy builder
            this.loadDefaultStrategyExpirations();
        } catch (error) {
            console.error('Error loading strategy templates:', error);
        }
    }

    loadDefaultStrategyExpirations() {
        // Generate some default expiration dates
        const select = document.getElementById('strategyExpiration');
        select.innerHTML = '<option value="">Select expiration date...</option>';
        
        const today = new Date();
        const expirations = [];
        
        // Add weekly expirations for next 4 weeks
        for (let i = 1; i <= 4; i++) {
            const friday = new Date(today);
            friday.setDate(today.getDate() + (5 - today.getDay() + 7 * (i - 1)));
            if (friday > today) {
                const days = Math.ceil((friday - today) / (1000 * 60 * 60 * 24));
                expirations.push({
                    date: friday.toISOString().split('T')[0],
                    days: days
                });
            }
        }
        
        // Add monthly expirations for next 3 months
        for (let i = 1; i <= 3; i++) {
            const monthly = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const thirdFriday = new Date(monthly);
            thirdFriday.setDate(1);
            while (thirdFriday.getDay() !== 5) {
                thirdFriday.setDate(thirdFriday.getDate() + 1);
            }
            thirdFriday.setDate(thirdFriday.getDate() + 14);
            
            const days = Math.ceil((thirdFriday - today) / (1000 * 60 * 60 * 24));
            expirations.push({
                date: thirdFriday.toISOString().split('T')[0],
                days: days
            });
        }
        
        // Sort by date and add to select
        expirations.sort((a, b) => new Date(a.date) - new Date(b.date));
        expirations.forEach(exp => {
            const option = document.createElement('option');
            option.value = exp.date;
            option.textContent = `${exp.date} (${exp.days} days)`;
            select.appendChild(option);
        });
    }

    renderStrategyTemplates(strategies) {
        const container = document.getElementById('strategyTemplates');
        container.innerHTML = Object.entries(strategies).map(([key, strategy]) => `
            <div class="strategy-template" data-strategy="${key}">
                <div class="template-name">${strategy.name}</div>
                <div class="template-description">${strategy.description}</div>
                <div class="template-metrics">
                    <div class="template-metric">
                        <span class="metric-label">Max Profit:</span>
                        <span class="metric-value">${strategy.maxProfit}</span>
                    </div>
                    <div class="template-metric">
                        <span class="metric-label">Max Loss:</span>
                        <span class="metric-value">${strategy.maxLoss}</span>
                    </div>
                    <div class="template-metric">
                        <span class="metric-label">Outlook:</span>
                        <span class="metric-value">${strategy.outlook}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind click events to templates
        container.querySelectorAll('.strategy-template').forEach(template => {
            template.addEventListener('click', () => {
                this.selectStrategyTemplate(template.dataset.strategy, strategies[template.dataset.strategy]);
            });
        });

        // Add a default strategy leg for users to start with
        if (document.getElementById('strategyLegs').children.length === 0) {
            this.addStrategyLeg();
        }
    }

    selectStrategyTemplate(strategyKey, strategy) {
        // Remove previous selection
        document.querySelectorAll('.strategy-template').forEach(t => t.classList.remove('selected'));
        
        // Select current template
        document.querySelector(`[data-strategy="${strategyKey}"]`).classList.add('selected');
        
        // Clear existing legs
        document.getElementById('strategyLegs').innerHTML = '';
        
        // Add legs based on template
        strategy.legs.forEach(leg => {
            this.addStrategyLeg();
            const legElement = document.querySelector('.strategy-leg:last-child');
            if (leg.type !== 'stock') {
                legElement.querySelector('.leg-type').value = leg.type;
            }
            legElement.querySelector('.leg-action').value = leg.action;
            legElement.querySelector('.leg-quantity').value = leg.quantity;
        });
    }

    // Options Trading Functionality
    bindOptionsEventListeners() {
        // Options tabs
        document.querySelectorAll('.options-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchOptionsTab(btn.dataset.tab);
            });
        });

        // Options chain
        document.getElementById('loadOptionsChainBtn').addEventListener('click', () => {
            this.loadOptionsChain();
        });

        document.getElementById('optionsSymbol').addEventListener('input', (e) => {
            if (e.target.value.length >= 1) {
                this.loadExpirationDates(e.target.value);
            }
        });

        // Strategy builder
        document.getElementById('strategySymbol').addEventListener('input', (e) => {
            if (e.target.value.length >= 1) {
                this.loadStrategyExpirationDates(e.target.value);
            }
        });

        document.getElementById('addLegBtn').addEventListener('click', () => {
            this.addStrategyLeg();
        });

        document.getElementById('analyzeStrategyBtn').addEventListener('click', () => {
            this.analyzeStrategy();
        });

        // Unusual activity
        document.getElementById('scanActivityBtn').addEventListener('click', () => {
            this.scanUnusualActivity();
        });

        // Expiration calendar
        document.getElementById('loadCalendarBtn').addEventListener('click', () => {
            this.loadExpirationCalendar();
        });

        // Options chain filters
        document.getElementById('showITMOnly').addEventListener('change', () => {
            this.filterOptionsChain();
        });

        document.getElementById('showHighVolume').addEventListener('change', () => {
            this.filterOptionsChain();
        });

        document.getElementById('greekHighlight').addEventListener('change', () => {
            this.highlightGreeks();
        });
    }

    switchOptionsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.options-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.options-trading .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadOptionsChain() {
        const symbol = document.getElementById('optionsSymbol').value.trim().toUpperCase();
        const expiration = document.getElementById('optionsExpiration').value;

        if (!symbol) {
            this.showError('Please enter a symbol');
            return;
        }

        this.showLoading(true);
        try {
            const response = await fetch(`${this.apiBaseUrl}/options-chain/${symbol}?expiration=${expiration}`);
            const data = await response.json();
            
            this.renderOptionsChain(data);
            document.getElementById('optionsChainContainer').style.display = 'block';
        } catch (error) {
            console.error('Error loading options chain:', error);
            this.showError('Failed to load options chain');
        } finally {
            this.showLoading(false);
        }
    }

    async loadExpirationDates(symbol) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/options-chain/${symbol}`);
            const data = await response.json();
            
            const select = document.getElementById('optionsExpiration');
            select.innerHTML = '';
            
            data.expirations.forEach(exp => {
                const option = document.createElement('option');
                option.value = exp.date;
                option.textContent = `${exp.date} (${exp.daysToExpiry} days)`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading expiration dates:', error);
        }
    }

    async loadStrategyExpirationDates(symbol) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/options-chain/${symbol}`);
            const data = await response.json();
            
            const select = document.getElementById('strategyExpiration');
            select.innerHTML = '<option value="">Select expiration date...</option>';
            
            data.expirations.forEach(exp => {
                const option = document.createElement('option');
                option.value = exp.date;
                option.textContent = `${exp.date} (${exp.daysToExpiry} days)`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading strategy expiration dates:', error);
        }
    }

    renderOptionsChain(data) {
        // Update header
        document.getElementById('chainTitle').textContent = `${data.symbol} Options Chain`;
        document.getElementById('chainStockInfo').innerHTML = `
            <div class="stock-price">$${data.stockPrice.toFixed(2)}</div>
            <div class="timestamp">Updated: ${new Date(data.timestamp).toLocaleTimeString()}</div>
        `;

        // Render options table
        const tbody = document.getElementById('optionsChainBody');
        tbody.innerHTML = '';

        if (data.expirations.length > 0) {
            const expiration = data.expirations[0];
            const maxStrikes = Math.min(expiration.calls.length, expiration.puts.length);

            for (let i = 0; i < maxStrikes; i++) {
                const call = expiration.calls[i];
                const put = expiration.puts[i];
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="${call.inTheMoney ? 'itm-call' : ''}">${call.bid.toFixed(2)}</td>
                    <td class="${call.inTheMoney ? 'itm-call' : ''}">${call.ask.toFixed(2)}</td>
                    <td class="${call.inTheMoney ? 'itm-call' : ''}">${call.last.toFixed(2)}</td>
                    <td class="${call.volume > 1000 ? 'high-volume' : ''}">${call.volume.toLocaleString()}</td>
                    <td>${call.openInterest.toLocaleString()}</td>
                    <td>${(call.impliedVolatility * 100).toFixed(1)}%</td>
                    <td>${call.delta.toFixed(3)}</td>
                    <td>${call.gamma.toFixed(4)}</td>
                    <td class="strike-column">${call.strike.toFixed(0)}</td>
                    <td>${put.gamma.toFixed(4)}</td>
                    <td>${put.delta.toFixed(3)}</td>
                    <td>${(put.impliedVolatility * 100).toFixed(1)}%</td>
                    <td>${put.openInterest.toLocaleString()}</td>
                    <td class="${put.volume > 1000 ? 'high-volume' : ''}">${put.volume.toLocaleString()}</td>
                    <td class="${put.inTheMoney ? 'itm-put' : ''}">${put.last.toFixed(2)}</td>
                    <td class="${put.inTheMoney ? 'itm-put' : ''}">${put.ask.toFixed(2)}</td>
                    <td class="${put.inTheMoney ? 'itm-put' : ''}">${put.bid.toFixed(2)}</td>
                `;
                tbody.appendChild(row);
            }
        }

        // Render IV analysis
        this.renderIVAnalysis(data);
    }

    renderIVAnalysis(data) {
        const container = document.getElementById('ivMetrics');
        if (data.expirations.length > 0) {
            const expiration = data.expirations[0];
            const callIVs = expiration.calls.map(c => c.impliedVolatility);
            const putIVs = expiration.puts.map(p => p.impliedVolatility);
            
            const avgCallIV = callIVs.reduce((a, b) => a + b, 0) / callIVs.length;
            const avgPutIV = putIVs.reduce((a, b) => a + b, 0) / putIVs.length;
            const overallIV = (avgCallIV + avgPutIV) / 2;
            
            container.innerHTML = `
                <div class="iv-metric">
                    <div class="iv-metric-label">Average Call IV</div>
                    <div class="iv-metric-value">${(avgCallIV * 100).toFixed(1)}%</div>
                </div>
                <div class="iv-metric">
                    <div class="iv-metric-label">Average Put IV</div>
                    <div class="iv-metric-value">${(avgPutIV * 100).toFixed(1)}%</div>
                </div>
                <div class="iv-metric">
                    <div class="iv-metric-label">Overall IV</div>
                    <div class="iv-metric-value">${(overallIV * 100).toFixed(1)}%</div>
                </div>
                <div class="iv-metric">
                    <div class="iv-metric-label">IV Rank</div>
                    <div class="iv-metric-value">${Math.floor(Math.random() * 100)}%</div>
                </div>
            `;
        }
    }

    filterOptionsChain() {
        const showITMOnly = document.getElementById('showITMOnly').checked;
        const showHighVolume = document.getElementById('showHighVolume').checked;
        
        const rows = document.querySelectorAll('#optionsChainBody tr');
        rows.forEach(row => {
            let show = true;
            
            if (showITMOnly) {
                const hasITM = row.querySelector('.itm-call, .itm-put');
                if (!hasITM) show = false;
            }
            
            if (showHighVolume) {
                const hasHighVolume = row.querySelector('.high-volume');
                if (!hasHighVolume) show = false;
            }
            
            row.style.display = show ? '' : 'none';
        });
    }

    highlightGreeks() {
        const greek = document.getElementById('greekHighlight').value;
        
        // Remove previous highlights
        document.querySelectorAll('#optionsChainBody td').forEach(td => {
            td.classList.remove('greek-highlight-delta', 'greek-highlight-gamma', 'greek-highlight-theta', 'greek-highlight-vega');
        });
        
        if (greek) {
            const greekColumns = {
                'delta': [6, 9], // Call delta, Put delta columns
                'gamma': [7, 8], // Call gamma, Put gamma columns
                'theta': [], // Would need theta columns
                'vega': []  // Would need vega columns
            };
            
            if (greekColumns[greek]) {
                greekColumns[greek].forEach(colIndex => {
                    document.querySelectorAll(`#optionsChainBody tr td:nth-child(${colIndex + 1})`).forEach(td => {
                        td.classList.add(`greek-highlight-${greek}`);
                    });
                });
            }
        }
    }

    addStrategyLeg() {
        const container = document.getElementById('strategyLegs');
        const legIndex = container.children.length;
        
        const leg = document.createElement('div');
        leg.className = 'strategy-leg';
        leg.innerHTML = `
            <div class="leg-controls">
                <select class="leg-type">
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                    <option value="stock">Stock</option>
                </select>
                <select class="leg-action">
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                </select>
                <input type="number" class="leg-quantity" placeholder="Quantity" value="1" min="1">
                <input type="number" class="leg-strike" placeholder="Strike" step="0.01">
                <input type="number" class="leg-premium" placeholder="Premium" step="0.01">
                <button class="remove-leg">Remove</button>
            </div>
        `;
        
        container.appendChild(leg);
        
        // Bind remove button
        leg.querySelector('.remove-leg').addEventListener('click', () => {
            leg.remove();
        });
    }

    async analyzeStrategy() {
        const symbol = document.getElementById('strategySymbol').value.trim().toUpperCase();
        const expiration = document.getElementById('strategyExpiration').value;
        
        if (!symbol || !expiration) {
            this.showError('Please enter symbol and expiration date');
            return;
        }
        
        const legs = this.collectStrategyLegs();
        if (legs.length === 0) {
            this.showError('Please add at least one strategy leg');
            return;
        }
        
        this.showLoading(true);
        try {
            // Get current stock price
            const stockResponse = await fetch(`${this.apiBaseUrl}/company-data/${symbol}`);
            const stockData = await stockResponse.json();
            const stockPrice = stockData.price || 150; // Default price
            
            const response = await fetch(`${this.apiBaseUrl}/analyze-options-strategy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    legs: legs,
                    stockPrice: stockPrice,
                    expirationDate: expiration
                })
            });
            
            const analysis = await response.json();
            this.renderStrategyAnalysis(analysis, stockPrice);
            document.getElementById('strategyAnalysis').style.display = 'block';
        } catch (error) {
            console.error('Error analyzing strategy:', error);
            this.showError('Failed to analyze strategy');
        } finally {
            this.showLoading(false);
        }
    }

    collectStrategyLegs() {
        const legs = [];
        document.querySelectorAll('.strategy-leg').forEach(legElement => {
            const type = legElement.querySelector('.leg-type').value;
            const action = legElement.querySelector('.leg-action').value;
            const quantity = parseInt(legElement.querySelector('.leg-quantity').value) || 1;
            const strike = parseFloat(legElement.querySelector('.leg-strike').value);
            const premium = parseFloat(legElement.querySelector('.leg-premium').value);
            
            if (type === 'stock' || (strike && premium)) {
                legs.push({
                    type: type,
                    action: action,
                    quantity: quantity,
                    strike: strike,
                    premium: premium,
                    optionType: type === 'stock' ? null : type
                });
            }
        });
        return legs;
    }

    renderStrategyAnalysis(analysis, stockPrice) {
        // Render metrics
        document.getElementById('analysisMetrics').innerHTML = `
            <div class="analysis-metric">
                <div class="metric-title">Max Profit</div>
                <div class="metric-number">${analysis.maxProfit}</div>
            </div>
            <div class="analysis-metric">
                <div class="metric-title">Max Loss</div>
                <div class="metric-number">${analysis.maxLoss}</div>
            </div>
            <div class="analysis-metric">
                <div class="metric-title">Profit Probability</div>
                <div class="metric-number">${analysis.profitProbability.toFixed(1)}%</div>
            </div>
            <div class="analysis-metric">
                <div class="metric-title">Break-even</div>
                <div class="metric-number">${analysis.breakevens.length > 0 ? '$' + analysis.breakevens[0].toFixed(2) : 'N/A'}</div>
            </div>
        `;
        
        // Render Greeks
        if (analysis.legs.length > 0) {
            const totalGreeks = this.calculateTotalGreeks(analysis.legs);
            document.getElementById('greeksAnalysis').innerHTML = `
                <div class="greek-item">
                    <div class="greek-name">Delta</div>
                    <div class="greek-value">${totalGreeks.delta.toFixed(3)}</div>
                </div>
                <div class="greek-item">
                    <div class="greek-name">Gamma</div>
                    <div class="greek-value">${totalGreeks.gamma.toFixed(4)}</div>
                </div>
                <div class="greek-item">
                    <div class="greek-name">Theta</div>
                    <div class="greek-value">${totalGreeks.theta.toFixed(2)}</div>
                </div>
                <div class="greek-item">
                    <div class="greek-name">Vega</div>
                    <div class="greek-value">${totalGreeks.vega.toFixed(2)}</div>
                </div>
            `;
        }
        
        // Create P&L diagram
        this.createPnLDiagram(analysis.legs, stockPrice);
    }

    calculateTotalGreeks(legs) {
        let totalDelta = 0, totalGamma = 0, totalTheta = 0, totalVega = 0;
        
        legs.forEach(leg => {
            if (leg.greeks) {
                const multiplier = leg.action === 'buy' ? 1 : -1;
                totalDelta += leg.greeks.delta * leg.quantity * multiplier;
                totalGamma += leg.greeks.gamma * leg.quantity * multiplier;
                totalTheta += leg.greeks.theta * leg.quantity * multiplier;
                totalVega += leg.greeks.vega * leg.quantity * multiplier;
            }
        });
        
        return { delta: totalDelta, gamma: totalGamma, theta: totalTheta, vega: totalVega };
    }

    createPnLDiagram(legs, currentStockPrice) {
        const canvas = document.getElementById('pnlChart');
        const ctx = canvas.getContext('2d');
        
        // Generate stock price range
        const priceRange = currentStockPrice * 0.5; // ±50% of current price
        const stockPrices = [];
        const pnlValues = [];
        
        for (let i = 0; i <= 100; i++) {
            const price = currentStockPrice - priceRange + (i / 100) * 2 * priceRange;
            stockPrices.push(price);
            
            let totalPnL = 0;
            legs.forEach(leg => {
                if (leg.type === 'stock') {
                    const stockPnL = leg.action === 'buy' 
                        ? (price - currentStockPrice) * leg.quantity
                        : (currentStockPrice - price) * leg.quantity;
                    totalPnL += stockPnL;
                } else {
                    const intrinsicValue = leg.type === 'call' 
                        ? Math.max(0, price - leg.strike)
                        : Math.max(0, leg.strike - price);
                    
                    const optionPnL = leg.action === 'buy'
                        ? (intrinsicValue - leg.premium) * leg.quantity * 100
                        : (leg.premium - intrinsicValue) * leg.quantity * 100;
                    
                    totalPnL += optionPnL;
                }
            });
            
            pnlValues.push(totalPnL);
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw axes
        const margin = 40;
        const width = canvas.width - 2 * margin;
        const height = canvas.height - 2 * margin;
        
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, margin + height);
        ctx.lineTo(margin + width, margin + height);
        ctx.strokeStyle = '#374151';
        ctx.stroke();
        
        // Draw P&L line
        ctx.beginPath();
        const minPnL = Math.min(...pnlValues);
        const maxPnL = Math.max(...pnlValues);
        const pnlRange = maxPnL - minPnL || 1;
        
        pnlValues.forEach((pnl, i) => {
            const x = margin + (i / (pnlValues.length - 1)) * width;
            const y = margin + height - ((pnl - minPnL) / pnlRange) * height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw zero line
        const zeroY = margin + height - ((-minPnL) / pnlRange) * height;
        ctx.beginPath();
        ctx.moveTo(margin, zeroY);
        ctx.lineTo(margin + width, zeroY);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw current price line
        const currentPriceX = margin + width / 2;
        ctx.beginPath();
        ctx.moveTo(currentPriceX, margin);
        ctx.lineTo(currentPriceX, margin + height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    async scanUnusualActivity() {
        const symbol = document.getElementById('activitySymbol').value.trim().toUpperCase();
        const type = document.getElementById('activityType').value;
        const volumeThreshold = document.getElementById('volumeThreshold').value;
        
        this.showLoading(true);
        try {
            const params = new URLSearchParams();
            if (symbol) params.append('symbol', symbol);
            if (type !== 'all') params.append('type', type);
            params.append('volumeThreshold', volumeThreshold);
            
            const response = await fetch(`${this.apiBaseUrl}/unusual-options-activity?${params}`);
            const data = await response.json();
            
            this.renderUnusualActivity(data);
        } catch (error) {
            console.error('Error scanning unusual activity:', error);
            this.showError('Failed to scan unusual activity');
        } finally {
            this.showLoading(false);
        }
    }

    renderUnusualActivity(data) {
        const container = document.getElementById('activityResults');
        
        if (data.activities.length === 0) {
            container.innerHTML = '<p>No unusual activity found</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="activity-list">
                ${data.activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-header">
                            <div class="activity-symbol">${activity.symbol}</div>
                            <div class="activity-type ${activity.optionType}">${activity.optionType.toUpperCase()}</div>
                        </div>
                        <div class="activity-details">
                            <div class="activity-detail">
                                <div class="detail-label">Strike</div>
                                <div class="detail-value">$${activity.strike}</div>
                            </div>
                            <div class="activity-detail">
                                <div class="detail-label">Expiration</div>
                                <div class="detail-value">${activity.expiration}</div>
                            </div>
                            <div class="activity-detail">
                                <div class="detail-label">Volume</div>
                                <div class="detail-value">${activity.volume.toLocaleString()}</div>
                            </div>
                            <div class="activity-detail">
                                <div class="detail-label">Volume Ratio</div>
                                <div class="detail-value volume-ratio">${activity.volumeRatio}x</div>
                            </div>
                            <div class="activity-detail">
                                <div class="detail-label">Price</div>
                                <div class="detail-value">$${activity.price}</div>
                            </div>
                            <div class="activity-detail">
                                <div class="detail-label">IV</div>
                                <div class="detail-value">${(activity.impliedVolatility * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadExpirationCalendar() {
        const symbol = document.getElementById('calendarSymbol').value.trim().toUpperCase();
        
        this.showLoading(true);
        try {
            const params = symbol ? `?symbol=${symbol}` : '';
            const response = await fetch(`${this.apiBaseUrl}/options-expiration-calendar${params}`);
            const data = await response.json();
            
            this.renderExpirationCalendar(data);
        } catch (error) {
            console.error('Error loading expiration calendar:', error);
            this.showError('Failed to load expiration calendar');
        } finally {
            this.showLoading(false);
        }
    }

    renderExpirationCalendar(data) {
        const container = document.getElementById('calendarGrid');
        
        container.innerHTML = data.expirations.map(exp => `
            <div class="expiration-card">
                <div class="expiration-header">
                    <div class="expiration-date">${exp.date}</div>
                    <div class="days-to-expiry">${exp.daysToExpiry} days</div>
                </div>
                <div class="expiration-type">
                    ${exp.isWeekly ? '<span class="type-badge type-weekly">Weekly</span>' : ''}
                    ${exp.isMonthly ? '<span class="type-badge type-monthly">Monthly</span>' : ''}
                    ${exp.isQuarterly ? '<span class="type-badge type-quarterly">Quarterly</span>' : ''}
                </div>
                <div class="expiration-metrics">
                    <div class="metric">
                        <div class="metric-title">Volume</div>
                        <div class="metric-value">${exp.totalVolume.toLocaleString()}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-title">Open Interest</div>
                        <div class="metric-value">${exp.totalOpenInterest.toLocaleString()}</div>
                    </div>
                </div>
                ${exp.events.length > 0 ? `
                    <div class="expiration-events">
                        ${exp.events.map(event => `<span class="event-type">${event}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Render upcoming events
        this.renderUpcomingEvents(data.expirations);
    }

    renderUpcomingEvents(expirations) {
        const container = document.getElementById('expirationEvents');
        const eventsWithDates = [];
        
        expirations.forEach(exp => {
            exp.events.forEach(event => {
                eventsWithDates.push({
                    date: exp.date,
                    daysToExpiry: exp.daysToExpiry,
                    event: event
                });
            });
        });
        
        eventsWithDates.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
        
        container.innerHTML = `
            <div class="event-list">
                ${eventsWithDates.slice(0, 10).map(item => `
                    <div class="event-item">
                        <div class="event-date">${item.date} (${item.daysToExpiry} days)</div>
                        <div class="event-details">
                            <span class="event-type">${item.event}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StockMarketApp();
});