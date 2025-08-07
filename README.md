# Daily Stock Market Summary & Portfolio Management Application

A comprehensive web application that provides AI-powered daily stock market summaries, real-time market data, earnings reports, and **advanced portfolio management** capabilities. Built with Node.js, Express, and vanilla JavaScript with a beautiful, responsive UI.

## ✨ Features

### 🤖 **Market Intelligence**
- **AI-Generated Daily Summaries** - Uses ChatGPT to provide intelligent market analysis and insights
- **Real-time Market Data** - Displays major market indices and stock prices
- **Top Movers** - Shows biggest gainers and losers of the day
- **Earnings Calendar** - Upcoming earnings reports for major companies

### 📊 **Portfolio Management** *(NEW)*
- **Comprehensive Portfolio Tracking** - Add, remove, and manage investment positions
- **Real-time P&L Calculations** - Live profit/loss tracking with current market prices
- **Asset Allocation Charts** - Beautiful pie charts showing portfolio distribution by sector and asset type
- **Multi-Asset Support** - Stocks, ETFs, and **Cryptocurrencies** (BTC, ETH, ADA, SOL, etc.)
- **Performance Analytics** - Total value, cost basis, gains/losses with percentage changes
- **Responsive Portfolio UI** - Mobile-optimized tables and charts

### 🎯 **General Features**
- **Major Companies Tracking** - Focus on the most valuable companies
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Automated Updates** - Daily summary generation at 8 AM EST
- **Manual Refresh** - Refresh data on demand

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js for portfolio allocation visualization
- **AI Integration**: OpenAI GPT-3.5 Turbo
- **Scheduling**: Node-cron
- **Styling**: Modern CSS with gradients, glassmorphism effects, and responsive grid layouts

## 📋 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (optional, works with mock data without it)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VCweek-StockMarket
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔌 API Endpoints

### Market Data Endpoints
- **GET** `/api/daily-summary` - AI-generated daily market summary
- **GET** `/api/market-data` - Current market overview with indices and top movers
- **GET** `/api/earnings-calendar?days=7` - Upcoming earnings reports
- **GET** `/api/company-data/:symbol` - Detailed company information
- **POST** `/api/refresh-summary` - Manually trigger summary generation

### Portfolio Management Endpoints *(NEW)*
- **GET** `/api/portfolio` - Get complete portfolio summary with performance and allocation
- **GET** `/api/portfolio/performance` - Detailed portfolio performance metrics
- **GET** `/api/portfolio/allocation` - Asset allocation breakdown by sector and type
- **POST** `/api/portfolio/position` - Add new position to portfolio
- **PUT** `/api/portfolio/position/:id` - Update existing position
- **DELETE** `/api/portfolio/position/:id` - Remove position from portfolio
- **GET** `/api/portfolios` - Get all portfolios
- **POST** `/api/portfolio` - Create new portfolio

## 💼 Portfolio Management Features

### 📊 **Comprehensive Position Tracking**
- **Add Positions**: Enter symbol, quantity, purchase price, and date
- **Asset Types**: Support for Stocks, ETFs, and Cryptocurrencies
- **Real-time Updates**: Live price updates and P&L calculations
- **Position Management**: Edit quantities or remove positions entirely

### 📈 **Performance Analytics**
- **Total Portfolio Value**: Current market value of all positions
- **Cost Basis**: Total amount invested
- **Profit & Loss**: Both absolute dollar amounts and percentage gains/losses
- **Individual Position P&L**: Track performance of each holding
- **Weight Distribution**: See what percentage each position represents

### 🎯 **Asset Allocation Visualization**
- **Sector Allocation Chart**: Pie chart showing distribution across sectors (Technology, Healthcare, etc.)
- **Asset Type Chart**: Breakdown by Stocks, ETFs, and Cryptocurrencies
- **Interactive Charts**: Hover tooltips with detailed percentages
- **Responsive Design**: Charts adapt to screen size

### 🪙 **Cryptocurrency Support**
Supported cryptocurrencies include:
- **Major Coins**: BTC, ETH, ADA, SOL, XRP, DOT, DOGE
- **DeFi Tokens**: UNI, LINK, AVAX, MATIC
- **Other Popular**: LTC, BCH, ATOM, ALGO, VET, FIL, THETA, EOS, TRX

### 📱 **Mobile-Optimized UI**
- **Responsive Tables**: Columns hide/show based on screen size
- **Touch-Friendly**: Large buttons and touch targets
- **Optimized Charts**: Charts resize appropriately for mobile viewing
- **Collapsible Sections**: Efficient use of mobile screen space

## ⚙️ Configuration

### Environment Variables

- `OPENAI_API_KEY` - Required for AI-generated summaries (falls back to mock data)
- `ALPHA_VANTAGE_API_KEY` - Optional, for real stock data (currently uses mock data)
- `FINNHUB_API_KEY` - Optional, for real stock data (currently uses mock data)
- `PORT` - Server port (default: 3000)

### Customization

#### Adding New Companies/Cryptocurrencies
Edit `services/portfolioService.js` and modify the asset categories:
```javascript
this.assetCategories = {
    'Technology': ['AAPL', 'MSFT', 'GOOGL', /* add more */],
    'Cryptocurrency': ['BTC', 'ETH', 'ADA', /* add more */],
    // Add new categories as needed
};
```

#### Customizing Portfolio Features
- **Default Portfolio**: Modify `this.defaultPortfolioId` in `portfolioService.js`
- **Asset Classification**: Update `getSector()` method for custom sector mapping
- **Chart Colors**: Modify `generateColors()` method in `script.js`

## 🗂️ File Structure

```
├── server.js                    # Express server and API routes
├── package.json                 # Dependencies and scripts
├── .env.example                # Environment variables template
├── services/
│   ├── stockService.js         # Stock data fetching logic
│   ├── aiService.js            # OpenAI integration
│   ├── portfolioService.js     # Portfolio management logic (NEW)
│   ├── fundamentalsService.js  # Company fundamentals
│   ├── newsService.js          # News integration
│   ├── investmentSimulator.js  # Investment simulation
│   └── optionsService.js       # Options trading features
└── public/
    ├── index.html              # Main HTML file with portfolio UI
    ├── styles.css              # CSS with portfolio styling
    └── script.js               # Frontend JS with portfolio management
```

## 🎨 Portfolio UI Components

### Dashboard Overview
- **Statistics Cards**: Total value, cost, P&L, and position count
- **Quick Actions**: Add position and refresh buttons
- **Status Indicators**: Color-coded gains (green) and losses (red)

### Position Management
- **Add Position Form**: Clean, intuitive form with validation
- **Positions Table**: Sortable table with all position details
- **Action Buttons**: Edit and delete functionality for each position

### Visualization
- **Allocation Charts**: Two side-by-side pie charts for sector and asset type distribution
- **Responsive Charts**: Automatically resize based on screen size
- **Interactive Elements**: Hover effects and detailed tooltips

## 📊 Portfolio Data Flow

1. **User Input**: Add position via form (symbol, quantity, price, date, asset type)
2. **Data Storage**: Position stored in memory with unique ID and metadata
3. **Price Fetching**: Real-time prices retrieved from stock service
4. **Calculations**: P&L, weights, and allocations calculated automatically
5. **Visualization**: Charts and tables updated with new data
6. **Persistence**: Data maintained during session (can be extended to database)

## 🔧 Development

### Adding New Portfolio Features

1. **Backend**: Extend `portfolioService.js` with new methods
2. **API**: Add new routes in `server.js` for additional endpoints
3. **Frontend**: Update `script.js` with new UI functionality
4. **Styling**: Add corresponding CSS in `styles.css`

### Testing Portfolio Features

```bash
# Test adding a position
curl -X POST http://localhost:3000/api/portfolio/position \
  -H "Content-Type: application/json" \
  -d '{"position": {"symbol": "AAPL", "quantity": 10, "purchasePrice": 150.00}}'

# Test getting portfolio data
curl http://localhost:3000/api/portfolio

# Test portfolio performance
curl http://localhost:3000/api/portfolio/performance
```

## 🌐 Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚀 Deployment

### Heroku
1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy using Git or GitHub integration

### Docker
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/portfolio-enhancement`)
3. Commit your changes (`git commit -m 'Add portfolio feature'`)
4. Push to the branch (`git push origin feature/portfolio-enhancement`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is for educational and informational purposes only. The stock market data, cryptocurrency prices, and AI-generated summaries should not be considered as financial advice. Portfolio tracking features are for personal use and analysis only. Always consult with professional financial advisors before making investment decisions.

## 🛠️ Troubleshooting

### Common Issues

1. **Portfolio not loading**
   - Check browser console for JavaScript errors
   - Verify `/api/portfolio` endpoint is responding
   - Ensure Chart.js library is loaded

2. **Charts not displaying**
   - Verify Chart.js CDN is accessible
   - Check for canvas element conflicts
   - Ensure portfolio has positions to display

3. **Position calculations incorrect**
   - Verify stock service is returning price data
   - Check that symbols are properly formatted
   - Review console logs for calculation errors

4. **Mobile display issues**
   - Clear browser cache and reload
   - Test responsive breakpoints in dev tools
   - Check for CSS conflicts

### Portfolio-Specific Debugging

```javascript
// Enable portfolio debugging in browser console
localStorage.setItem('debug-portfolio', 'true');

// Check portfolio data
console.log(await fetch('/api/portfolio').then(r => r.json()));

// Verify chart initialization
console.log(Chart.instances);
```

### Support

For support and questions about portfolio management features, please open an issue in the GitHub repository with the label `portfolio-management`.

---

## 🎉 What's New in Portfolio Management

### Version 2.0 Features
- ✅ Complete portfolio tracking system
- ✅ Real-time P&L calculations
- ✅ Asset allocation visualization
- ✅ Cryptocurrency support (20+ coins)
- ✅ Responsive mobile design
- ✅ Interactive charts and tables
- ✅ RESTful API for portfolio operations
- ✅ Modern UI with glassmorphism effects

The application now serves as both a market intelligence tool and a comprehensive portfolio management platform, making it perfect for investors who want to track their holdings alongside market analysis.