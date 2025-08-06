const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const stockService = require('./services/stockService');
const aiService = require('./services/aiService');
const optionsService = require('./services/optionsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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

// Options Trading API Endpoints
app.get('/api/options/chain/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { expiration } = req.query;
        const chain = await optionsService.getOptionsChain(symbol.toUpperCase(), expiration);
        res.json(chain);
    } catch (error) {
        console.error('Error fetching options chain:', error);
        res.status(500).json({ error: 'Failed to fetch options chain' });
    }
});

app.get('/api/options/expirations', async (req, res) => {
    try {
        const calendar = optionsService.getExpirationCalendar();
        res.json(calendar);
    } catch (error) {
        console.error('Error fetching expiration calendar:', error);
        res.status(500).json({ error: 'Failed to fetch expiration calendar' });
    }
});

app.post('/api/options/strategy', async (req, res) => {
    try {
        const { strategy, legs, stockPrice } = req.body;
        const result = optionsService.calculateStrategy(strategy, legs, stockPrice);
        res.json(result);
    } catch (error) {
        console.error('Error calculating strategy:', error);
        res.status(500).json({ error: 'Failed to calculate strategy' });
    }
});

app.get('/api/options/unusual-activity', async (req, res) => {
    try {
        const activity = await optionsService.getUnusualActivity();
        res.json(activity);
    } catch (error) {
        console.error('Error fetching unusual activity:', error);
        res.status(500).json({ error: 'Failed to fetch unusual activity' });
    }
});

app.get('/api/options/greeks/:symbol/:strike/:expiration/:type', async (req, res) => {
    try {
        const { symbol, strike, expiration, type } = req.params;
        const stockPrice = await optionsService.getStockPrice(symbol.toUpperCase());
        const timeToExpiry = optionsService.calculateTimeToExpiry(expiration);
        const greeks = optionsService.calculateGreeks(
            stockPrice, 
            parseFloat(strike), 
            timeToExpiry, 
            0.05, // risk-free rate
            0.25, // implied volatility (placeholder)
            type
        );
        res.json(greeks);
    } catch (error) {
        console.error('Error calculating Greeks:', error);
        res.status(500).json({ error: 'Failed to calculate Greeks' });
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