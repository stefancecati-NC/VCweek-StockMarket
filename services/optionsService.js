/**
 * Options Trading Service
 * Provides options chain data, Greeks calculations, strategy analysis, and market data
 */

const axios = require('axios');

class OptionsService {
    constructor() {
        // Black-Scholes model helper constants
        this.riskFreeRate = 0.05; // 5% risk-free rate
        
        // Options strategy templates
        this.strategies = {
            'covered_call': {
                name: 'Covered Call',
                legs: [
                    { type: 'stock', action: 'buy', quantity: 100 },
                    { type: 'call', action: 'sell', quantity: 1 }
                ],
                description: 'Hold long stock position and sell call option',
                maxProfit: 'Limited to strike + premium',
                maxLoss: 'Stock price can go to zero minus premium collected',
                outlook: 'Neutral to slightly bullish'
            },
            'cash_secured_put': {
                name: 'Cash Secured Put',
                legs: [
                    { type: 'put', action: 'sell', quantity: 1 }
                ],
                description: 'Sell put option while holding cash to buy stock if assigned',
                maxProfit: 'Premium collected',
                maxLoss: 'Strike price minus premium',
                outlook: 'Neutral to bullish'
            },
            'bull_call_spread': {
                name: 'Bull Call Spread',
                legs: [
                    { type: 'call', action: 'buy', quantity: 1, strike: 'lower' },
                    { type: 'call', action: 'sell', quantity: 1, strike: 'higher' }
                ],
                description: 'Buy call at lower strike, sell call at higher strike',
                maxProfit: 'Difference in strikes minus net premium paid',
                maxLoss: 'Net premium paid',
                outlook: 'Moderately bullish'
            },
            'iron_condor': {
                name: 'Iron Condor',
                legs: [
                    { type: 'put', action: 'buy', quantity: 1, strike: 'lowest' },
                    { type: 'put', action: 'sell', quantity: 1, strike: 'low' },
                    { type: 'call', action: 'sell', quantity: 1, strike: 'high' },
                    { type: 'call', action: 'buy', quantity: 1, strike: 'highest' }
                ],
                description: 'Neutral strategy that profits from low volatility',
                maxProfit: 'Net premium collected',
                maxLoss: 'Strike width minus net premium',
                outlook: 'Neutral'
            },
            'straddle': {
                name: 'Long Straddle',
                legs: [
                    { type: 'call', action: 'buy', quantity: 1 },
                    { type: 'put', action: 'buy', quantity: 1 }
                ],
                description: 'Buy call and put at same strike and expiration',
                maxProfit: 'Unlimited',
                maxLoss: 'Total premium paid',
                outlook: 'High volatility expected'
            },
            'strangle': {
                name: 'Long Strangle',
                legs: [
                    { type: 'call', action: 'buy', quantity: 1, strike: 'higher' },
                    { type: 'put', action: 'buy', quantity: 1, strike: 'lower' }
                ],
                description: 'Buy call and put at different strikes',
                maxProfit: 'Unlimited',
                maxLoss: 'Total premium paid',
                outlook: 'High volatility expected'
            }
        };
    }

    /**
     * Get options chain for a symbol
     */
    async getOptionsChain(symbol, expiration = null) {
        try {
            // In a real implementation, you would fetch from a data provider
            // For now, we'll return mock data
            return this.getMockOptionsChain(symbol, expiration);
        } catch (error) {
            console.error('Error fetching options chain:', error);
            return this.getMockOptionsChain(symbol, expiration);
        }
    }

    /**
     * Get unusual options activity
     */
    async getUnusualActivity(filters = {}) {
        try {
            return this.getMockUnusualActivity(filters);
        } catch (error) {
            console.error('Error fetching unusual activity:', error);
            return { activities: [], timestamp: new Date().toISOString() };
        }
    }

    /**
     * Get options expiration calendar
     */
    async getExpirationCalendar(symbol = null) {
        try {
            return this.getMockExpirationCalendar(symbol);
        } catch (error) {
            console.error('Error fetching expiration calendar:', error);
            return { expirations: [], timestamp: new Date().toISOString() };
        }
    }

    /**
     * Calculate implied volatility
     */
    calculateImpliedVolatility(optionPrice, stockPrice, strike, timeToExpiry, interestRate, optionType) {
        // Simplified Newton-Raphson method for IV calculation
        // In production, you'd use a more sophisticated algorithm
        let iv = 0.2; // Initial guess
        const tolerance = 0.0001;
        const maxIterations = 100;

        for (let i = 0; i < maxIterations; i++) {
            const theoreticalPrice = this.blackScholesPrice(stockPrice, strike, timeToExpiry, interestRate, iv, optionType);
            const vega = this.calculateVega(stockPrice, strike, timeToExpiry, interestRate, iv);
            
            if (Math.abs(theoreticalPrice - optionPrice) < tolerance) {
                break;
            }
            
            iv = iv - (theoreticalPrice - optionPrice) / vega;
            
            // Ensure IV stays positive
            if (iv < 0.001) iv = 0.001;
            if (iv > 5.0) iv = 5.0;
        }

        return iv;
    }

    /**
     * Black-Scholes option pricing model
     */
    blackScholesPrice(S, K, T, r, sigma, optionType) {
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        if (optionType === 'call') {
            return S * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
        } else {
            return K * Math.exp(-r * T) * this.normalCDF(-d2) - S * this.normalCDF(-d1);
        }
    }

    /**
     * Calculate option Greeks
     */
    calculateGreeks(stockPrice, strike, timeToExpiry, interestRate, volatility, optionType) {
        const S = stockPrice;
        const K = strike;
        const T = timeToExpiry;
        const r = interestRate;
        const sigma = volatility;

        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);

        const delta = optionType === 'call' ? this.normalCDF(d1) : this.normalCDF(d1) - 1;
        const gamma = this.normalPDF(d1) / (S * sigma * Math.sqrt(T));
        const theta = optionType === 'call' 
            ? -(S * this.normalPDF(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * this.normalCDF(d2)
            : -(S * this.normalPDF(d1) * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * this.normalCDF(-d2);
        const vega = this.calculateVega(S, K, T, r, sigma);
        const rho = optionType === 'call' 
            ? K * T * Math.exp(-r * T) * this.normalCDF(d2)
            : -K * T * Math.exp(-r * T) * this.normalCDF(-d2);

        return {
            delta: delta,
            gamma: gamma,
            theta: theta / 365, // Per day
            vega: vega / 100,   // Per 1% volatility change
            rho: rho / 100      // Per 1% interest rate change
        };
    }

    /**
     * Calculate Vega
     */
    calculateVega(S, K, T, r, sigma) {
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        return S * this.normalPDF(d1) * Math.sqrt(T);
    }

    /**
     * Strategy profit/loss calculation
     */
    calculateStrategyPnL(strategy, stockPrices, currentStockPrice) {
        const results = stockPrices.map(price => {
            let totalPnL = 0;
            
            strategy.legs.forEach(leg => {
                if (leg.type === 'stock') {
                    const stockPnL = leg.action === 'buy' 
                        ? (price - currentStockPrice) * leg.quantity
                        : (currentStockPrice - price) * leg.quantity;
                    totalPnL += stockPnL;
                } else {
                    // Options PnL calculation
                    const intrinsicValue = leg.type === 'call' 
                        ? Math.max(0, price - leg.strike)
                        : Math.max(0, leg.strike - price);
                    
                    const optionPnL = leg.action === 'buy'
                        ? (intrinsicValue - leg.premium) * leg.quantity * 100
                        : (leg.premium - intrinsicValue) * leg.quantity * 100;
                    
                    totalPnL += optionPnL;
                }
            });
            
            return { stockPrice: price, pnl: totalPnL };
        });
        
        return results;
    }

    /**
     * Mock data generators
     */
    getMockOptionsChain(symbol, expiration) {
        const currentDate = new Date();
        const stockPrice = this.getStockPrice(symbol);
        
        // Generate strikes around current price
        const strikes = [];
        const baseStrike = Math.round(stockPrice / 5) * 5; // Round to nearest $5
        
        for (let i = -10; i <= 10; i++) {
            strikes.push(baseStrike + (i * 5));
        }

        // Generate expiration dates if not provided
        const expirations = expiration ? [expiration] : this.generateExpirationDates();

        const optionsChain = {
            symbol: symbol,
            stockPrice: stockPrice,
            timestamp: new Date().toISOString(),
            expirations: expirations.map(exp => ({
                date: exp,
                daysToExpiry: this.getDaysToExpiration(exp),
                calls: this.generateOptionsData(strikes, stockPrice, exp, 'call'),
                puts: this.generateOptionsData(strikes, stockPrice, exp, 'put')
            }))
        };

        return optionsChain;
    }

    generateOptionsData(strikes, stockPrice, expiration, optionType) {
        const timeToExpiry = this.getDaysToExpiration(expiration) / 365;
        const baseVolatility = 0.25 + Math.random() * 0.15; // 25-40% IV
        
        return strikes.map(strike => {
            const volatility = baseVolatility + (Math.random() - 0.5) * 0.1;
            const theoreticalPrice = this.blackScholesPrice(
                stockPrice, strike, timeToExpiry, this.riskFreeRate, volatility, optionType
            );
            
            const bid = theoreticalPrice * (0.95 + Math.random() * 0.05);
            const ask = theoreticalPrice * (1.05 + Math.random() * 0.05);
            const last = (bid + ask) / 2;
            
            const greeks = this.calculateGreeks(
                stockPrice, strike, timeToExpiry, this.riskFreeRate, volatility, optionType
            );

            return {
                strike: strike,
                bid: Math.max(0.01, bid),
                ask: ask,
                last: last,
                volume: Math.floor(Math.random() * 1000),
                openInterest: Math.floor(Math.random() * 5000),
                impliedVolatility: volatility,
                delta: greeks.delta,
                gamma: greeks.gamma,
                theta: greeks.theta,
                vega: greeks.vega,
                rho: greeks.rho,
                intrinsicValue: optionType === 'call' 
                    ? Math.max(0, stockPrice - strike)
                    : Math.max(0, strike - stockPrice),
                timeValue: last - (optionType === 'call' 
                    ? Math.max(0, stockPrice - strike)
                    : Math.max(0, strike - stockPrice)),
                inTheMoney: optionType === 'call' ? stockPrice > strike : stockPrice < strike
            };
        });
    }

    getMockUnusualActivity(filters) {
        const activities = [];
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];
        
        for (let i = 0; i < 15; i++) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const stockPrice = this.getStockPrice(symbol);
            const isCall = Math.random() > 0.5;
            const strike = stockPrice + (Math.random() - 0.5) * stockPrice * 0.2;
            
            activities.push({
                symbol: symbol,
                optionType: isCall ? 'call' : 'put',
                strike: Math.round(strike),
                expiration: this.getRandomExpiration(),
                volume: Math.floor(Math.random() * 10000) + 1000,
                averageVolume: Math.floor(Math.random() * 2000) + 500,
                volumeRatio: (Math.random() * 10 + 1).toFixed(1),
                price: (Math.random() * 20 + 0.5).toFixed(2),
                impliedVolatility: (0.2 + Math.random() * 0.3).toFixed(3),
                delta: (Math.random() * (isCall ? 1 : -1)).toFixed(3),
                premium: Math.floor(Math.random() * 500000) + 50000,
                timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                unusual: true
            });
        }
        
        return {
            activities: activities.sort((a, b) => b.volumeRatio - a.volumeRatio),
            timestamp: new Date().toISOString()
        };
    }

    getMockExpirationCalendar(symbol) {
        const expirations = this.generateExpirationDates();
        const calendar = expirations.map(date => {
            const daysToExpiry = this.getDaysToExpiration(date);
            
            return {
                date: date,
                daysToExpiry: daysToExpiry,
                isWeekly: daysToExpiry % 7 === 0 && daysToExpiry <= 21,
                isMonthly: new Date(date).getDate() > 15 && new Date(date).getDate() <= 21,
                isQuarterly: [2, 5, 8, 11].includes(new Date(date).getMonth()),
                totalVolume: Math.floor(Math.random() * 100000) + 10000,
                totalOpenInterest: Math.floor(Math.random() * 500000) + 50000,
                earnings: Math.random() > 0.8, // 20% chance of earnings near expiration
                events: this.generateEvents(date)
            };
        });

        return {
            symbol: symbol,
            expirations: calendar,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Helper functions
     */
    getStockPrice(symbol) {
        const prices = {
            'AAPL': 185.20,
            'MSFT': 378.45,
            'GOOGL': 142.30,
            'AMZN': 152.50,
            'TSLA': 248.50,
            'META': 485.20,
            'NVDA': 485.20,
            'SPY': 445.20,
            'QQQ': 378.45
        };
        return prices[symbol] || 150 + Math.random() * 100;
    }

    generateExpirationDates() {
        const dates = [];
        const today = new Date();
        
        // Add weekly expirations for next 8 weeks
        for (let i = 1; i <= 8; i++) {
            const friday = new Date(today);
            friday.setDate(today.getDate() + (5 - today.getDay() + 7 * (i - 1)));
            dates.push(friday.toISOString().split('T')[0]);
        }
        
        // Add monthly expirations for next 6 months
        for (let i = 1; i <= 6; i++) {
            const monthly = new Date(today.getFullYear(), today.getMonth() + i, 1);
            // Get third Friday of the month
            const thirdFriday = new Date(monthly);
            thirdFriday.setDate(1);
            while (thirdFriday.getDay() !== 5) {
                thirdFriday.setDate(thirdFriday.getDate() + 1);
            }
            thirdFriday.setDate(thirdFriday.getDate() + 14);
            dates.push(thirdFriday.toISOString().split('T')[0]);
        }
        
        return [...new Set(dates)].sort();
    }

    getDaysToExpiration(expirationDate) {
        const today = new Date();
        const expiry = new Date(expirationDate);
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    }

    getRandomExpiration() {
        const expirations = this.generateExpirationDates();
        return expirations[Math.floor(Math.random() * Math.min(5, expirations.length))];
    }

    generateEvents(date) {
        const events = [];
        if (Math.random() > 0.7) {
            events.push('Earnings');
        }
        if (Math.random() > 0.9) {
            events.push('FOMC');
        }
        if (Math.random() > 0.85) {
            events.push('Dividend');
        }
        return events;
    }

    /**
     * Mathematical helper functions
     */
    normalCDF(x) {
        // Approximation of the cumulative standard normal distribution
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return 0.5 * (1.0 + sign * y);
    }

    normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }

    /**
     * Get strategy templates
     */
    getStrategies() {
        return this.strategies;
    }

    /**
     * Analyze a custom strategy
     */
    analyzeStrategy(legs, stockPrice, expirationDate) {
        const timeToExpiry = this.getDaysToExpiration(expirationDate) / 365;
        
        // Calculate strategy metrics
        const analysis = {
            legs: legs.map(leg => {
                if (leg.type === 'option') {
                    const greeks = this.calculateGreeks(
                        stockPrice, 
                        leg.strike, 
                        timeToExpiry, 
                        this.riskFreeRate, 
                        leg.impliedVolatility || 0.25, 
                        leg.optionType
                    );
                    
                    return {
                        ...leg,
                        greeks: greeks,
                        premium: leg.premium || this.blackScholesPrice(
                            stockPrice, 
                            leg.strike, 
                            timeToExpiry, 
                            this.riskFreeRate, 
                            leg.impliedVolatility || 0.25, 
                            leg.optionType
                        )
                    };
                }
                return leg;
            }),
            breakevens: this.calculateBreakevens(legs, stockPrice),
            maxProfit: this.calculateMaxProfit(legs),
            maxLoss: this.calculateMaxLoss(legs),
            profitProbability: this.calculateProfitProbability(legs, stockPrice, timeToExpiry)
        };

        return analysis;
    }

    calculateBreakevens(legs, stockPrice) {
        // Simplified breakeven calculation - would need more sophisticated logic for complex strategies
        const breakevens = [];
        
        // This is a simplified implementation
        // Real implementation would solve for stock prices where total P&L = 0
        
        return breakevens;
    }

    calculateMaxProfit(legs) {
        // Calculate theoretical maximum profit
        // Implementation depends on strategy type
        return 'Unlimited'; // Placeholder
    }

    calculateMaxLoss(legs) {
        // Calculate theoretical maximum loss
        // Implementation depends on strategy type
        return 'Limited'; // Placeholder
    }

    calculateProfitProbability(legs, stockPrice, timeToExpiry) {
        // Calculate probability of profit using Monte Carlo or analytical methods
        // This is a simplified implementation
        return Math.random() * 100; // Placeholder
    }
}

module.exports = OptionsService;
