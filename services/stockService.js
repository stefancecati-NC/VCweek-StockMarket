const axios = require('axios');

class StockService {
    constructor() {
        // Using free APIs for stock data
        this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
        this.finnhubKey = process.env.FINNHUB_API_KEY;
        
        // Major companies to track
        this.majorCompanies = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
            'AMD', 'CRM', 'ORCL', 'ADBE', 'INTC', 'CSCO', 'IBM'
        ];
    }

    async getMarketOverview() {
        try {
            const marketData = {
                indices: await this.getMarketIndices(),
                topMovers: await this.getTopMovers(),
                majorStocks: await this.getMajorStocksData(),
                timestamp: new Date().toISOString()
            };
            
            return marketData;
        } catch (error) {
            console.error('Error fetching market overview:', error);
            // Return mock data if APIs fail
            return this.getMockMarketData();
        }
    }

    async getMarketIndices() {
        try {
            // For demo purposes, we'll use mock data
            // In production, you'd integrate with real APIs
            return {
                SPY: { price: 445.20, change: 2.15, changePercent: 0.48 },
                QQQ: { price: 378.45, change: -1.25, changePercent: -0.33 },
                DIA: { price: 348.90, change: 0.85, changePercent: 0.24 }
            };
        } catch (error) {
            console.error('Error fetching market indices:', error);
            return {};
        }
    }

    async getTopMovers() {
        try {
            // Mock data for top movers
            return {
                gainers: [
                    { symbol: 'NVDA', price: 485.20, change: 18.45, changePercent: 3.95 },
                    { symbol: 'AMD', price: 142.30, change: 6.78, changePercent: 5.01 },
                    { symbol: 'TSLA', price: 248.50, change: 12.20, changePercent: 5.16 }
                ],
                losers: [
                    { symbol: 'META', price: 485.20, change: -8.45, changePercent: -1.71 },
                    { symbol: 'NFLX', price: 465.80, change: -12.30, changePercent: -2.57 },
                    { symbol: 'INTC', price: 23.45, change: -0.95, changePercent: -3.89 }
                ]
            };
        } catch (error) {
            console.error('Error fetching top movers:', error);
            return { gainers: [], losers: [] };
        }
    }

    async getMajorStocksData() {
        try {
            const stocksData = {};
            
            // Mock data for major stocks
            const mockPrices = {
                'AAPL': { price: 185.20, change: 2.15, changePercent: 1.17 },
                'MSFT': { price: 378.45, change: -1.25, changePercent: -0.33 },
                'GOOGL': { price: 142.30, change: 3.78, changePercent: 2.73 },
                'AMZN': { price: 152.50, change: 1.20, changePercent: 0.79 },
                'TSLA': { price: 248.50, change: 12.20, changePercent: 5.16 },
                'META': { price: 485.20, change: -8.45, changePercent: -1.71 },
                'NVDA': { price: 485.20, change: 18.45, changePercent: 3.95 },
                'NFLX': { price: 465.80, change: -12.30, changePercent: -2.57 }
            };

            for (const symbol of this.majorCompanies) {
                if (mockPrices[symbol]) {
                    stocksData[symbol] = mockPrices[symbol];
                }
            }
            
            return stocksData;
        } catch (error) {
            console.error('Error fetching major stocks data:', error);
            return {};
        }
    }

    async getEarningsCalendar(days = 7) {
        try {
            // Mock earnings calendar data
            const today = new Date();
            const earnings = [];
            
            const mockEarnings = [
                { symbol: 'AAPL', company: 'Apple Inc.', date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), estimatedEPS: 2.18 },
                { symbol: 'MSFT', company: 'Microsoft Corporation', date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), estimatedEPS: 2.85 },
                { symbol: 'GOOGL', company: 'Alphabet Inc.', date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), estimatedEPS: 1.45 },
                { symbol: 'AMZN', company: 'Amazon.com Inc.', date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000), estimatedEPS: 0.78 },
                { symbol: 'TSLA', company: 'Tesla Inc.', date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), estimatedEPS: 0.85 },
                { symbol: 'META', company: 'Meta Platforms Inc.', date: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000), estimatedEPS: 3.21 }
            ];

            return mockEarnings.map(earning => ({
                ...earning,
                date: earning.date.toISOString().split('T')[0],
                dateFormatted: earning.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            }));
        } catch (error) {
            console.error('Error fetching earnings calendar:', error);
            return [];
        }
    }

    async getCompanyData(symbol) {
        try {
            // Mock company data
            const companyInfo = {
                'AAPL': { name: 'Apple Inc.', sector: 'Technology', marketCap: '2.8T' },
                'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', marketCap: '2.7T' },
                'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', marketCap: '1.8T' },
                'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', marketCap: '1.5T' },
                'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Discretionary', marketCap: '0.8T' },
                'META': { name: 'Meta Platforms Inc.', sector: 'Technology', marketCap: '1.2T' }
            };

            return companyInfo[symbol] || { name: symbol, sector: 'Unknown', marketCap: 'N/A' };
        } catch (error) {
            console.error('Error fetching company data:', error);
            return { name: symbol, sector: 'Unknown', marketCap: 'N/A' };
        }
    }

    getMockMarketData() {
        return {
            indices: {
                SPY: { price: 445.20, change: 2.15, changePercent: 0.48 },
                QQQ: { price: 378.45, change: -1.25, changePercent: -0.33 },
                DIA: { price: 348.90, change: 0.85, changePercent: 0.24 }
            },
            topMovers: {
                gainers: [
                    { symbol: 'NVDA', price: 485.20, change: 18.45, changePercent: 3.95 },
                    { symbol: 'AMD', price: 142.30, change: 6.78, changePercent: 5.01 }
                ],
                losers: [
                    { symbol: 'META', price: 485.20, change: -8.45, changePercent: -1.71 },
                    { symbol: 'NFLX', price: 465.80, change: -12.30, changePercent: -2.57 }
                ]
            },
            majorStocks: {
                'AAPL': { price: 185.20, change: 2.15, changePercent: 1.17 },
                'MSFT': { price: 378.45, change: -1.25, changePercent: -0.33 },
                'GOOGL': { price: 142.30, change: 3.78, changePercent: 2.73 }
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new StockService();