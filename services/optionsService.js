const axios = require('axios');

class OptionsService {
    constructor() {
        this.finnhubKey = process.env.FINNHUB_API_KEY;
        this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
        
        // Common option expiration dates (mock data for demo)
        this.mockExpirationDates = this.generateExpirationDates();
    }

    // Generate mock expiration dates for the next 6 months
    generateExpirationDates() {
        const dates = [];
        const now = new Date();
        
        for (let i = 0; i < 24; i++) { // Next 24 weeks
            const expDate = new Date(now);
            expDate.setDate(now.getDate() + (i * 7));
            
            // Options typically expire on Fridays
            const dayOfWeek = expDate.getDay();
            const daysToFriday = (5 - dayOfWeek + 7) % 7;
            expDate.setDate(expDate.getDate() + daysToFriday);
            
            dates.push(expDate.toISOString().split('T')[0]);
        }
        
        return dates;
    }

    // Black-Scholes option pricing model
    blackScholes(S, K, T, r, sigma, optionType = 'call') {
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        const N = (x) => {
            // Cumulative standard normal distribution
            return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
        };
        
        if (optionType === 'call') {
            return S * N(d1) - K * Math.exp(-r * T) * N(d2);
        } else {
            return K * Math.exp(-r * T) * N(-d2) - S * N(-d1);
        }
    }

    // Error function approximation
    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }

    // Calculate Greeks
    calculateGreeks(S, K, T, r, sigma, optionType = 'call') {
        const dt = 0.001;
        const dS = 0.01;
        const dsigma = 0.001;
        const dr = 0.001;

        const price = this.blackScholes(S, K, T, r, sigma, optionType);
        
        // Delta (price sensitivity to underlying)
        const priceUp = this.blackScholes(S + dS, K, T, r, sigma, optionType);
        const delta = (priceUp - price) / dS;
        
        // Gamma (delta sensitivity to underlying)
        const priceDown = this.blackScholes(S - dS, K, T, r, sigma, optionType);
        const gamma = (priceUp - 2 * price + priceDown) / (dS * dS);
        
        // Theta (time decay)
        const priceTheta = this.blackScholes(S, K, T - dt, r, sigma, optionType);
        const theta = -(priceTheta - price) / dt;
        
        // Vega (volatility sensitivity)
        const priceVega = this.blackScholes(S, K, T, r, sigma + dsigma, optionType);
        const vega = (priceVega - price) / dsigma;
        
        // Rho (interest rate sensitivity)
        const priceRho = this.blackScholes(S, K, T, r + dr, sigma, optionType);
        const rho = (priceRho - price) / dr;

        return {
            price: price,
            delta: delta,
            gamma: gamma,
            theta: theta,
            vega: vega,
            rho: rho
        };
    }

    // Generate options chain for a symbol
    async getOptionsChain(symbol, expiration = null) {
        try {
            // In a real implementation, you'd fetch from APIs like Finnhub, TD Ameritrade, etc.
            // For demo purposes, we'll generate mock data
            
            const stockPrice = await this.getStockPrice(symbol);
            const expirationDate = expiration || this.mockExpirationDates[0];
            
            const chain = this.generateMockOptionsChain(symbol, stockPrice, expirationDate);
            
            return {
                symbol: symbol,
                stockPrice: stockPrice,
                expiration: expirationDate,
                chain: chain,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching options chain:', error);
            return this.getMockOptionsChain(symbol);
        }
    }

    // Generate mock options chain
    generateMockOptionsChain(symbol, stockPrice, expiration) {
        const strikes = [];
        const baseStrike = Math.round(stockPrice / 5) * 5; // Round to nearest $5
        
        // Generate strikes from -20% to +20% of stock price
        for (let i = -8; i <= 8; i++) {
            strikes.push(baseStrike + (i * 5));
        }
        
        const timeToExpiry = this.calculateTimeToExpiry(expiration);
        const riskFreeRate = 0.05; // 5% risk-free rate
        const impliedVol = 0.25 + (Math.random() - 0.5) * 0.1; // Base IV around 25%
        
        const calls = [];
        const puts = [];
        
        strikes.forEach(strike => {
            // Add some randomness to IV based on moneyness
            const moneyness = strike / stockPrice;
            const adjustedIV = impliedVol + (Math.abs(moneyness - 1) * 0.1) + (Math.random() - 0.5) * 0.05;
            
            const callGreeks = this.calculateGreeks(stockPrice, strike, timeToExpiry, riskFreeRate, adjustedIV, 'call');
            const putGreeks = this.calculateGreeks(stockPrice, strike, timeToExpiry, riskFreeRate, adjustedIV, 'put');
            
            calls.push({
                strike: strike,
                bid: Math.max(0.01, callGreeks.price - 0.1),
                ask: callGreeks.price + 0.1,
                last: callGreeks.price + (Math.random() - 0.5) * 0.1,
                volume: Math.floor(Math.random() * 1000),
                openInterest: Math.floor(Math.random() * 5000),
                impliedVolatility: adjustedIV,
                delta: callGreeks.delta,
                gamma: callGreeks.gamma,
                theta: callGreeks.theta,
                vega: callGreeks.vega,
                rho: callGreeks.rho
            });
            
            puts.push({
                strike: strike,
                bid: Math.max(0.01, putGreeks.price - 0.1),
                ask: putGreeks.price + 0.1,
                last: putGreeks.price + (Math.random() - 0.5) * 0.1,
                volume: Math.floor(Math.random() * 800),
                openInterest: Math.floor(Math.random() * 4000),
                impliedVolatility: adjustedIV,
                delta: putGreeks.delta,
                gamma: putGreeks.gamma,
                theta: putGreeks.theta,
                vega: putGreeks.vega,
                rho: putGreeks.rho
            });
        });
        
        return { calls, puts };
    }

    // Calculate time to expiry in years
    calculateTimeToExpiry(expirationDate) {
        const now = new Date();
        const expiry = new Date(expirationDate);
        const diffTime = Math.abs(expiry - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays / 365.25; // Convert to years
    }

    // Get stock price (mock for demo)
    async getStockPrice(symbol) {
        // In real implementation, fetch from stock API
        const mockPrices = {
            'AAPL': 185.20,
            'MSFT': 378.45,
            'GOOGL': 142.30,
            'AMZN': 152.50,
            'TSLA': 248.50,
            'META': 485.20,
            'NVDA': 485.20,
            'NFLX': 465.80,
            'SPY': 445.20,
            'QQQ': 378.45
        };
        
        return mockPrices[symbol] || 100 + Math.random() * 200;
    }

    // Options strategy calculator
    calculateStrategy(strategy, legs, stockPrice) {
        const strategies = {
            'covered_call': this.calculateCoveredCall,
            'protective_put': this.calculateProtectivePut,
            'bull_call_spread': this.calculateBullCallSpread,
            'bear_put_spread': this.calculateBearPutSpread,
            'iron_condor': this.calculateIronCondor,
            'butterfly': this.calculateButterfly,
            'straddle': this.calculateStraddle,
            'strangle': this.calculateStrangle
        };
        
        if (strategies[strategy]) {
            return strategies[strategy].call(this, legs, stockPrice);
        }
        
        return null;
    }

    // Strategy calculations
    calculateCoveredCall(legs, stockPrice) {
        // Implementation for covered call P&L
        const stockPosition = 100; // 100 shares
        const callStrike = legs.call.strike;
        const callPremium = legs.call.price;
        
        const prices = [];
        for (let price = stockPrice * 0.7; price <= stockPrice * 1.3; price += 1) {
            const stockPnL = (price - stockPrice) * stockPosition;
            const optionPnL = Math.max(0, price - callStrike) * -100 + callPremium * 100;
            
            prices.push({
                stockPrice: price,
                pnl: stockPnL + optionPnL,
                stockPnL: stockPnL,
                optionPnL: optionPnL
            });
        }
        
        return {
            strategy: 'Covered Call',
            maxProfit: (callStrike - stockPrice + callPremium) * 100,
            maxLoss: (stockPrice - callPremium) * 100,
            breakeven: stockPrice - callPremium,
            pnlChart: prices
        };
    }

    calculateBullCallSpread(legs, stockPrice) {
        const longStrike = legs.longCall.strike;
        const shortStrike = legs.shortCall.strike;
        const netDebit = legs.longCall.price - legs.shortCall.price;
        
        const prices = [];
        for (let price = stockPrice * 0.7; price <= stockPrice * 1.3; price += 1) {
            const longValue = Math.max(0, price - longStrike);
            const shortValue = Math.max(0, price - shortStrike);
            const pnl = (longValue - shortValue - netDebit) * 100;
            
            prices.push({
                stockPrice: price,
                pnl: pnl
            });
        }
        
        return {
            strategy: 'Bull Call Spread',
            maxProfit: (shortStrike - longStrike - netDebit) * 100,
            maxLoss: netDebit * 100,
            breakeven: longStrike + netDebit,
            pnlChart: prices
        };
    }

    // Get unusual options activity
    async getUnusualActivity() {
        // Mock unusual options activity data
        return {
            highVolume: [
                {
                    symbol: 'AAPL',
                    strike: 190,
                    expiration: this.mockExpirationDates[1],
                    type: 'call',
                    volume: 15420,
                    avgVolume: 2341,
                    ratio: 6.58,
                    price: 3.45,
                    impliedVolatility: 0.28
                },
                {
                    symbol: 'TSLA',
                    strike: 250,
                    expiration: this.mockExpirationDates[0],
                    type: 'put',
                    volume: 8932,
                    avgVolume: 1205,
                    ratio: 7.41,
                    price: 8.20,
                    impliedVolatility: 0.42
                }
            ],
            highIV: [
                {
                    symbol: 'NVDA',
                    strike: 500,
                    expiration: this.mockExpirationDates[2],
                    type: 'call',
                    impliedVolatility: 0.65,
                    historicalIV: 0.35,
                    ivRank: 95
                }
            ],
            largeOrders: [
                {
                    symbol: 'SPY',
                    strike: 450,
                    expiration: this.mockExpirationDates[0],
                    type: 'call',
                    orderSize: 5000,
                    price: 2.15,
                    direction: 'buy'
                }
            ]
        };
    }

    // Get options expiration calendar
    getExpirationCalendar() {
        return {
            dates: this.mockExpirationDates,
            monthlyExpirations: this.mockExpirationDates.filter((date, index) => index % 4 === 0),
            weeklyExpirations: this.mockExpirationDates,
            quarterlyExpirations: this.mockExpirationDates.filter((date, index) => index % 12 === 0)
        };
    }

    // Mock fallback data
    getMockOptionsChain(symbol) {
        return {
            symbol: symbol,
            stockPrice: 150.00,
            expiration: this.mockExpirationDates[0],
            chain: {
                calls: [
                    {
                        strike: 145,
                        bid: 7.20,
                        ask: 7.40,
                        last: 7.30,
                        volume: 245,
                        openInterest: 1520,
                        impliedVolatility: 0.24,
                        delta: 0.68,
                        gamma: 0.03,
                        theta: -0.08,
                        vega: 0.12,
                        rho: 0.05
                    }
                ],
                puts: [
                    {
                        strike: 145,
                        bid: 2.10,
                        ask: 2.30,
                        last: 2.20,
                        volume: 189,
                        openInterest: 890,
                        impliedVolatility: 0.26,
                        delta: -0.32,
                        gamma: 0.03,
                        theta: -0.06,
                        vega: 0.12,
                        rho: -0.03
                    }
                ]
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new OptionsService();
