const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const stockService = require('./services/stockService');
const aiService = require('./services/aiService');
const fundamentalsService = require('./services/fundamentalsService');
const newsService = require('./services/newsService');
const investmentSimulator = require('./services/investmentSimulator');
const OptionsService = require('./services/optionsService');
const portfolioService = require('./services/portfolioService');

const optionsService = new OptionsService();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Configure CORS for production
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'https://stefancecati-NC.github.io',
            'https://stefancecati-nc.github.io'
        ];
        
        // Check if origin contains github.io (for any case variations)
        if (origin.includes('github.io') || allowedOrigins.includes(origin)) {
            console.log('CORS: Allowing origin:', origin);
            return callback(null, true);
        }
        
        console.log('CORS: Blocking origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Store for daily summaries and market data
let dailySummary = null;
let marketData = null;
let earningsCalendar = null;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/daily-summary', async (req, res) => {
    try {
        if (!dailySummary) {
            await generateDailySummary();
        }
        res.json(dailySummary);
    } catch (error) {
        console.error('Error fetching daily summary:', error);
        res.status(500).json({ error: 'Failed to fetch daily summary' });
    }
});

app.get('/api/market-data', async (req, res) => {
    try {
        const data = await stockService.getMarketOverview();
        marketData = data;
        res.json(data);
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

app.get('/api/earnings-calendar', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const data = await stockService.getEarningsCalendar(days);
        earningsCalendar = data;
        res.json(data);
    } catch (error) {
        console.error('Error fetching earnings calendar:', error);
        res.status(500).json({ error: 'Failed to fetch earnings calendar' });
    }
});

app.get('/api/company-data/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await stockService.getCompanyData(symbol);
        res.json(data);
    } catch (error) {
        console.error('Error fetching company data:', error);
        res.status(500).json({ error: 'Failed to fetch company data' });
    }
});

app.post('/api/refresh-summary', async (req, res) => {
    try {
        await generateDailySummary();
        res.json({ message: 'Summary refreshed successfully', summary: dailySummary });
    } catch (error) {
        console.error('Error refreshing summary:', error);
        res.status(500).json({ error: 'Failed to refresh summary' });
    }
});

// Company Fundamentals API Endpoints
app.get('/api/fundamentals/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getCompanyFundamentals(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching company fundamentals:', error);
        res.status(500).json({ error: 'Failed to fetch company fundamentals' });
    }
});

app.get('/api/financial-statements/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getFinancialStatements(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching financial statements:', error);
        res.status(500).json({ error: 'Failed to fetch financial statements' });
    }
});

app.get('/api/financial-ratios/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getKeyFinancialRatios(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching financial ratios:', error);
        res.status(500).json({ error: 'Failed to fetch financial ratios' });
    }
});

app.get('/api/analyst-ratings/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getAnalystRatings(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching analyst ratings:', error);
        res.status(500).json({ error: 'Failed to fetch analyst ratings' });
    }
});

app.get('/api/executive-compensation/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getExecutiveCompensation(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching executive compensation:', error);
        res.status(500).json({ error: 'Failed to fetch executive compensation' });
    }
});

app.get('/api/insider-trading/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getInsiderTrading(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching insider trading data:', error);
        res.status(500).json({ error: 'Failed to fetch insider trading data' });
    }
});

app.get('/api/esg-scores/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getESGScores(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching ESG scores:', error);
        res.status(500).json({ error: 'Failed to fetch ESG scores' });
    }
});

app.get('/api/peer-comparison/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await fundamentalsService.getPeerComparison(symbol.toUpperCase());
        res.json(data);
    } catch (error) {
        console.error('Error fetching peer comparison:', error);
        res.status(500).json({ error: 'Failed to fetch peer comparison' });
    }
});

// News & Sentiment Analysis API Endpoints
app.get('/api/market-news', async (req, res) => {
    try {
        const { limit = 20, category = 'general' } = req.query;
        const data = await newsService.getMarketNews(parseInt(limit), category);
        res.json(data);
    } catch (error) {
        console.error('Error fetching market news:', error);
        res.status(500).json({ error: 'Failed to fetch market news' });
    }
});

app.get('/api/company-news/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 10 } = req.query;
        const data = await newsService.getCompanyNews(symbol.toUpperCase(), parseInt(limit));
        res.json(data);
    } catch (error) {
        console.error('Error fetching company news:', error);
        res.status(500).json({ error: 'Failed to fetch company news' });
    }
});

app.get('/api/sentiment-analysis/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '7d' } = req.query;
        const data = await newsService.getSentimentAnalysis(symbol.toUpperCase(), timeframe);
        res.json(data);
    } catch (error) {
        console.error('Error fetching sentiment analysis:', error);
        res.status(500).json({ error: 'Failed to fetch sentiment analysis' });
    }
});

// Options Trading API Endpoints
app.get('/api/options-chain/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { expiration } = req.query;
        const data = await optionsService.getOptionsChain(symbol.toUpperCase(), expiration);
        res.json(data);
    } catch (error) {
        console.error('Error fetching options chain:', error);
        res.status(500).json({ error: 'Failed to fetch options chain' });
    }
});

app.get('/api/unusual-options-activity', async (req, res) => {
    try {
        const filters = {
            symbol: req.query.symbol,
            optionType: req.query.type,
            volumeThreshold: req.query.volumeThreshold
        };
        const data = await optionsService.getUnusualActivity(filters);
        res.json(data);
    } catch (error) {
        console.error('Error fetching unusual options activity:', error);
        res.status(500).json({ error: 'Failed to fetch unusual options activity' });
    }
});

app.get('/api/options-expiration-calendar', async (req, res) => {
    try {
        const { symbol } = req.query;
        const data = await optionsService.getExpirationCalendar(symbol);
        res.json(data);
    } catch (error) {
        console.error('Error fetching expiration calendar:', error);
        res.status(500).json({ error: 'Failed to fetch expiration calendar' });
    }
});

app.post('/api/analyze-options-strategy', async (req, res) => {
    try {
        const { legs, stockPrice, expirationDate } = req.body;
        
        if (!legs || !stockPrice || !expirationDate) {
            return res.status(400).json({ error: 'Missing required parameters: legs, stockPrice, expirationDate' });
        }
        
        const data = optionsService.analyzeStrategy(legs, parseFloat(stockPrice), expirationDate);
        res.json(data);
    } catch (error) {
        console.error('Error analyzing options strategy:', error);
        res.status(500).json({ error: 'Failed to analyze options strategy' });
    }
});

app.get('/api/options-strategies', (req, res) => {
    try {
        const strategies = optionsService.getStrategies();
        res.json(strategies);
    } catch (error) {
        console.error('Error fetching options strategies:', error);
        res.status(500).json({ error: 'Failed to fetch options strategies' });
    }
});

app.post('/api/calculate-option-greeks', async (req, res) => {
    try {
        const { stockPrice, strike, timeToExpiry, interestRate, volatility, optionType } = req.body;
        
        if (!stockPrice || !strike || !timeToExpiry || !volatility || !optionType) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const greeks = optionsService.calculateGreeks(
            parseFloat(stockPrice),
            parseFloat(strike),
            parseFloat(timeToExpiry),
            parseFloat(interestRate) || 0.05,
            parseFloat(volatility),
            optionType
        );
        
        res.json(greeks);
    } catch (error) {
        console.error('Error calculating option Greeks:', error);
        res.status(500).json({ error: 'Failed to calculate option Greeks' });
    }
});

app.post('/api/calculate-strategy-pnl', async (req, res) => {
    try {
        const { strategy, stockPrices, currentStockPrice } = req.body;
        
        if (!strategy || !stockPrices || !currentStockPrice) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const pnlData = optionsService.calculateStrategyPnL(
            strategy,
            stockPrices,
            parseFloat(currentStockPrice)
        );
        
        res.json(pnlData);
    } catch (error) {
        console.error('Error calculating strategy P&L:', error);
        res.status(500).json({ error: 'Failed to calculate strategy P&L' });
    }
});

// Investment Simulation API Endpoints
app.post('/api/simulate-future-investment', async (req, res) => {
    try {
        const { amount, symbol, days, confidenceLevel = 0.68 } = req.body;
        
        if (!amount || !symbol || !days) {
            return res.status(400).json({ error: 'Missing required parameters: amount, symbol, days' });
        }
        
        const data = investmentSimulator.simulateFutureInvestment(
            parseFloat(amount), 
            symbol.toUpperCase(), 
            parseInt(days), 
            parseFloat(confidenceLevel)
        );
        res.json(data);
    } catch (error) {
        console.error('Error simulating future investment:', error);
        res.status(500).json({ error: 'Failed to simulate future investment' });
    }
});

app.post('/api/simulate-historical-whatif', async (req, res) => {
    try {
        const { amount, symbol, daysAgo } = req.body;
        
        if (!amount || !symbol || !daysAgo) {
            return res.status(400).json({ error: 'Missing required parameters: amount, symbol, daysAgo' });
        }
        
        const data = await investmentSimulator.calculateHistoricalWhatIf(
            parseFloat(amount), 
            symbol.toUpperCase(), 
            parseInt(daysAgo)
        );
        res.json(data);
    } catch (error) {
        console.error('Error calculating historical what-if:', error);
        res.status(500).json({ error: 'Failed to calculate historical what-if' });
    }
});

app.post('/api/simulate-portfolio', async (req, res) => {
    try {
        const { portfolio, totalAmount, days } = req.body;
        
        if (!portfolio || !totalAmount || !days) {
            return res.status(400).json({ error: 'Missing required parameters: portfolio, totalAmount, days' });
        }
        
        // Validate portfolio allocations sum to 100
        const totalAllocation = Object.values(portfolio).reduce((sum, allocation) => sum + allocation, 0);
        if (Math.abs(totalAllocation - 100) > 0.01) {
            return res.status(400).json({ error: 'Portfolio allocations must sum to 100%' });
        }
        
        const data = investmentSimulator.simulatePortfolioInvestment(
            portfolio, 
            parseFloat(totalAmount), 
            parseInt(days)
        );
        res.json(data);
    } catch (error) {
        console.error('Error simulating portfolio investment:', error);
        res.status(500).json({ error: 'Failed to simulate portfolio investment' });
    }
});

app.get('/api/investment-profiles', (req, res) => {
    try {
        const profiles = {
            stocks: Object.keys(investmentSimulator.stockProfiles),
            portfolioTypes: Object.keys(investmentSimulator.volatilityProfiles),
            marketData: investmentSimulator.getMockMarketData()
        };
        res.json(profiles);
    } catch (error) {
        console.error('Error fetching investment profiles:', error);
        res.status(500).json({ error: 'Failed to fetch investment profiles' });
    }
});

// Portfolio Management API Routes
app.get('/api/portfolio', async (req, res) => {
    try {
        const portfolioId = req.query.portfolioId;
        const summary = await portfolioService.getPortfolioSummary(portfolioId);
        res.json(summary);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

app.get('/api/portfolio/performance', async (req, res) => {
    try {
        const portfolioId = req.query.portfolioId;
        const performance = await portfolioService.calculatePortfolioPerformance(portfolioId);
        res.json(performance);
    } catch (error) {
        console.error('Error calculating portfolio performance:', error);
        res.status(500).json({ error: 'Failed to calculate portfolio performance' });
    }
});

app.get('/api/portfolio/allocation', async (req, res) => {
    try {
        const portfolioId = req.query.portfolioId;
        const allocation = await portfolioService.calculateAssetAllocation(portfolioId);
        res.json(allocation);
    } catch (error) {
        console.error('Error calculating asset allocation:', error);
        res.status(500).json({ error: 'Failed to calculate asset allocation' });
    }
});

app.post('/api/portfolio/position', async (req, res) => {
    try {
        const { position, portfolioId } = req.body;
        const updatedPortfolio = portfolioService.addPosition(position, portfolioId);
        res.json(updatedPortfolio);
    } catch (error) {
        console.error('Error adding position:', error);
        res.status(400).json({ error: error.message || 'Failed to add position' });
    }
});

app.put('/api/portfolio/position/:positionId', async (req, res) => {
    try {
        const { positionId } = req.params;
        const { updates, portfolioId } = req.body;
        const updatedPortfolio = portfolioService.updatePosition(positionId, updates, portfolioId);
        res.json(updatedPortfolio);
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(400).json({ error: error.message || 'Failed to update position' });
    }
});

app.delete('/api/portfolio/position/:positionId', async (req, res) => {
    try {
        const { positionId } = req.params;
        const { portfolioId } = req.body;
        const updatedPortfolio = portfolioService.removePosition(positionId, portfolioId);
        res.json(updatedPortfolio);
    } catch (error) {
        console.error('Error removing position:', error);
        res.status(400).json({ error: error.message || 'Failed to remove position' });
    }
});

app.get('/api/portfolios', async (req, res) => {
    try {
        const portfolios = portfolioService.getAllPortfolios();
        res.json(portfolios);
    } catch (error) {
        console.error('Error fetching portfolios:', error);
        res.status(500).json({ error: 'Failed to fetch portfolios' });
    }
});

app.post('/api/portfolio', async (req, res) => {
    try {
        const { name } = req.body;
        const portfolio = portfolioService.createPortfolio(name);
        res.json(portfolio);
    } catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(400).json({ error: error.message || 'Failed to create portfolio' });
    }
});

async function generateDailySummary() {
    try {
        console.log('Generating daily summary...');
        
        // Fetch latest market data
        const marketOverview = await stockService.getMarketOverview();
        const earnings = await stockService.getEarningsCalendar(7);
        
        // Generate AI summary
        const summary = await aiService.generateDailySummary(marketOverview, earnings);
        
        dailySummary = {
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            summary: summary,
            marketData: marketOverview,
            upcomingEarnings: earnings
        };
        
        console.log('Daily summary generated successfully');
    } catch (error) {
        console.error('Error generating daily summary:', error);
        throw error;
    }
}

// Schedule daily summary generation at 8 AM EST
cron.schedule('0 8 * * *', () => {
    console.log('Running scheduled daily summary generation...');
    generateDailySummary();
}, {
    timezone: "America/New_York"
});

// Generate initial summary on startup
generateDailySummary().catch(console.error);

app.listen(PORT, () => {
    console.log(`Stock Market Summary App running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the application`);
});