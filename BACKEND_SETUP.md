# Environment Configuration

## Backend Deployment URLs

### Production (Render.com)
- Backend URL: `https://your-backend-app.onrender.com`
- Frontend URL: `https://stefancecati-NC.github.io/VCweek-StockMarket`

### Local Development
- Backend URL: `http://localhost:3000`
- Frontend URL: `http://localhost:3000`

## Setup Instructions

1. Replace `https://your-backend-app.onrender.com/api` in `public/script.js` with your actual Render URL
2. Make sure your `.env` variables are added to Render dashboard
3. Verify CORS settings allow your GitHub Pages domain

## Environment Variables Needed

Create these in your Render dashboard:
```
OPENAI_API_KEY=your_openai_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FMP_API_KEY=your_fmp_key
NEWS_API_KEY=your_news_api_key
```
