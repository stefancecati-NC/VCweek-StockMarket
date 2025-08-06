const axios = require('axios');

class InvestmentSimulator {
    constructor() {
        // Historical volatility data for different asset classes (annualized)
        this.volatilityProfiles = {
            'conservative': { volatility: 0.08, expectedReturn: 0.06 }, // Bonds, stable stocks
            'moderate': { volatility: 0.15, expectedReturn: 0.10 },     // Mixed portfolio
            'aggressive': { volatility: 0.25, expectedReturn: 0.12 },   // Growth stocks
            'crypto': { volatility: 0.80, expectedReturn: 0.20 }        // Cryptocurrency
        };

        // Major stock categories with their typical characteristics
        this.stockProfiles = {
            'AAPL': { volatility: 0.24, expectedReturn: 0.11, category: 'tech' },
            'MSFT': { volatility: 0.22, expectedReturn: 0.10, category: 'tech' },
            'GOOGL': { volatility: 0.26, expectedReturn: 0.12, category: 'tech' },
            'AMZN': { volatility: 0.30, expectedReturn: 0.13, category: 'tech' },
            'TSLA': { volatility: 0.65, expectedReturn: 0.18, category: 'growth' },
            'META': { volatility: 0.35, expectedReturn: 0.14, category: 'tech' },
            'NVDA': { volatility: 0.45, expectedReturn: 0.16, category: 'tech' },
            'SPY': { volatility: 0.16, expectedReturn: 0.09, category: 'index' },
            'QQQ': { volatility: 0.20, expectedReturn: 0.11, category: 'index' }
        };
    }

    /**
     * Simulates future investment value based on current investment
     * @param {number} initialAmount - Amount to invest today
     * @param {string} symbol - Stock symbol or portfolio type
     * @param {number} days - Number of days to project
     * @param {number} confidenceLevel - Confidence level (0.68, 0.95, 0.99)
     * @returns {Object} Simulation results
     */
    simulateFutureInvestment(initialAmount, symbol, days, confidenceLevel = 0.68) {
        const profile = this.getInvestmentProfile(symbol);
        const timeHorizon = days / 365; // Convert days to years
        
        // Calculate expected return and volatility for the time period
        const expectedReturn = profile.expectedReturn * timeHorizon;
        const volatility = profile.volatility * Math.sqrt(timeHorizon);
        
        // Monte Carlo simulation with multiple scenarios
        const scenarios = this.runMonteCarloSimulation(initialAmount, expectedReturn, volatility, 10000);
        
        // Calculate confidence intervals
        const sortedResults = scenarios.sort((a, b) => a - b);
        const confidenceIntervals = this.calculateConfidenceIntervals(sortedResults, confidenceLevel);
        
        return {
            initialAmount,
            symbol,
            days,
            projectedValue: {
                expected: initialAmount * (1 + expectedReturn),
                best: confidenceIntervals.upper,
                worst: confidenceIntervals.lower,
                median: this.calculateMedian(sortedResults)
            },
            returns: {
                expected: expectedReturn * 100,
                bestCase: ((confidenceIntervals.upper - initialAmount) / initialAmount) * 100,
                worstCase: ((confidenceIntervals.lower - initialAmount) / initialAmount) * 100
            },
            riskMetrics: {
                volatility: volatility * 100,
                maxDrawdown: this.estimateMaxDrawdown(profile.volatility, timeHorizon),
                sharpeRatio: expectedReturn / volatility
            },
            scenarios: {
                bull: initialAmount * (1 + expectedReturn + volatility),
                bear: initialAmount * (1 + expectedReturn - volatility),
                neutral: initialAmount * (1 + expectedReturn)
            }
        };
    }

    /**
     * Calculates what an investment would be worth today if made in the past
     * @param {number} initialAmount - Amount that was invested
     * @param {string} symbol - Stock symbol
     * @param {number} daysAgo - How many days ago the investment was made
     * @returns {Object} Historical analysis results
     */
    async calculateHistoricalWhatIf(initialAmount, symbol, daysAgo) {
        try {
            // In a real implementation, you'd fetch actual historical data
            // For now, we'll use simulation based on typical performance
            const profile = this.getInvestmentProfile(symbol);
            const timeHorizon = daysAgo / 365;
            
            // Simulate what actually might have happened
            const actualReturn = this.simulateHistoricalReturn(profile, timeHorizon);
            const currentValue = initialAmount * (1 + actualReturn);
            
            // Get some realistic historical scenarios
            const historicalScenarios = this.generateHistoricalScenarios(initialAmount, profile, timeHorizon);
            
            return {
                initialAmount,
                symbol,
                daysAgo,
                investmentDate: this.calculatePastDate(daysAgo),
                currentValue,
                totalReturn: currentValue - initialAmount,
                percentageReturn: ((currentValue - initialAmount) / initialAmount) * 100,
                annualizedReturn: (Math.pow(currentValue / initialAmount, 1 / timeHorizon) - 1) * 100,
                scenarios: historicalScenarios,
                marketEvents: this.getSignificantMarketEvents(daysAgo),
                comparison: {
                    spyReturn: this.simulateHistoricalReturn(this.stockProfiles['SPY'], timeHorizon) * 100,
                    inflationAdjusted: this.adjustForInflation(currentValue, timeHorizon)
                }
            };
        } catch (error) {
            console.error('Error calculating historical what-if:', error);
            throw error;
        }
    }

    /**
     * Simulates a diversified portfolio investment
     * @param {Object} portfolio - Portfolio allocation {symbol: percentage}
     * @param {number} totalAmount - Total amount to invest
     * @param {number} days - Investment horizon in days
     * @returns {Object} Portfolio simulation results
     */
    simulatePortfolioInvestment(portfolio, totalAmount, days) {
        const portfolioResults = {};
        let totalExpectedReturn = 0;
        let totalVolatility = 0;
        
        // Calculate portfolio-level metrics
        for (const [symbol, allocation] of Object.entries(portfolio)) {
            const profile = this.getInvestmentProfile(symbol);
            const amount = totalAmount * (allocation / 100);
            
            const simulation = this.simulateFutureInvestment(amount, symbol, days);
            portfolioResults[symbol] = {
                allocation: allocation,
                amount: amount,
                simulation: simulation
            };
            
            totalExpectedReturn += profile.expectedReturn * (allocation / 100);
            totalVolatility += Math.pow(profile.volatility * (allocation / 100), 2);
        }
        
        // Portfolio volatility (simplified - doesn't account for correlations)
        totalVolatility = Math.sqrt(totalVolatility);
        
        const timeHorizon = days / 365;
        const portfolioExpectedReturn = totalExpectedReturn * timeHorizon;
        
        return {
            totalAmount,
            days,
            portfolio: portfolioResults,
            portfolioMetrics: {
                expectedValue: totalAmount * (1 + portfolioExpectedReturn),
                expectedReturn: portfolioExpectedReturn * 100,
                volatility: totalVolatility * 100,
                sharpeRatio: portfolioExpectedReturn / totalVolatility,
                diversificationBenefit: this.calculateDiversificationBenefit(portfolio)
            },
            riskAnalysis: {
                valueAtRisk: this.calculateValueAtRisk(totalAmount, portfolioExpectedReturn, totalVolatility),
                conditionalVaR: this.calculateConditionalVaR(totalAmount, portfolioExpectedReturn, totalVolatility)
            }
        };
    }

    /**
     * Get investment profile for a symbol or create a default one
     */
    getInvestmentProfile(symbol) {
        if (this.stockProfiles[symbol]) {
            return this.stockProfiles[symbol];
        }
        
        if (this.volatilityProfiles[symbol]) {
            return this.volatilityProfiles[symbol];
        }
        
        // Default profile for unknown symbols
        return {
            volatility: 0.20,
            expectedReturn: 0.08,
            category: 'unknown'
        };
    }

    /**
     * Run Monte Carlo simulation
     */
    runMonteCarloSimulation(initialAmount, expectedReturn, volatility, iterations) {
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            // Generate random return using normal distribution
            const randomReturn = this.generateNormalRandom(expectedReturn, volatility);
            const finalValue = initialAmount * (1 + randomReturn);
            results.push(finalValue);
        }
        
        return results;
    }

    /**
     * Generate normally distributed random number (Box-Muller transform)
     */
    generateNormalRandom(mean, stdDev) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mean + z * stdDev;
    }

    /**
     * Calculate confidence intervals
     */
    calculateConfidenceIntervals(sortedResults, confidenceLevel) {
        const alpha = 1 - confidenceLevel;
        const lowerIndex = Math.floor(sortedResults.length * (alpha / 2));
        const upperIndex = Math.floor(sortedResults.length * (1 - alpha / 2));
        
        return {
            lower: sortedResults[lowerIndex],
            upper: sortedResults[upperIndex]
        };
    }

    /**
     * Calculate median value
     */
    calculateMedian(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 !== 0 ? 
            sortedArray[mid] : 
            (sortedArray[mid - 1] + sortedArray[mid]) / 2;
    }

    /**
     * Estimate maximum drawdown
     */
    estimateMaxDrawdown(volatility, timeHorizon) {
        // Simplified estimation based on volatility
        return volatility * Math.sqrt(timeHorizon) * 2;
    }

    /**
     * Simulate historical return based on profile
     */
    simulateHistoricalReturn(profile, timeHorizon) {
        // Add some randomness to make it more realistic
        const marketCycles = this.getMarketCycleAdjustment(timeHorizon);
        const baseReturn = profile.expectedReturn * timeHorizon;
        const volatilityAdjustment = this.generateNormalRandom(0, profile.volatility * Math.sqrt(timeHorizon));
        
        return baseReturn + volatilityAdjustment + marketCycles;
    }

    /**
     * Get market cycle adjustments for historical periods
     */
    getMarketCycleAdjustment(timeHorizon) {
        // Simulate market cycles - bull and bear markets
        if (timeHorizon > 1) {
            // Longer periods might have experienced different market conditions
            return this.generateNormalRandom(0, 0.05); // Additional market cycle noise
        }
        return 0;
    }

    /**
     * Generate historical scenarios
     */
    generateHistoricalScenarios(initialAmount, profile, timeHorizon) {
        return {
            bull: {
                name: "Bull Market Scenario",
                return: profile.expectedReturn * timeHorizon + profile.volatility * Math.sqrt(timeHorizon),
                value: initialAmount * (1 + profile.expectedReturn * timeHorizon + profile.volatility * Math.sqrt(timeHorizon))
            },
            bear: {
                name: "Bear Market Scenario", 
                return: profile.expectedReturn * timeHorizon - profile.volatility * Math.sqrt(timeHorizon),
                value: initialAmount * (1 + profile.expectedReturn * timeHorizon - profile.volatility * Math.sqrt(timeHorizon))
            },
            crash: {
                name: "Market Crash Scenario",
                return: -0.30, // Assume 30% crash
                value: initialAmount * 0.70
            }
        };
    }

    /**
     * Calculate past date
     */
    calculatePastDate(daysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    }

    /**
     * Get significant market events for a time period
     */
    getSignificantMarketEvents(daysAgo) {
        const events = [];
        
        if (daysAgo > 365) {
            events.push("Potential market cycles experienced");
        }
        if (daysAgo > 730) {
            events.push("Multiple economic cycles");
        }
        if (daysAgo > 1095) {
            events.push("Long-term compound growth period");
        }
        
        return events;
    }

    /**
     * Adjust for inflation
     */
    adjustForInflation(amount, timeHorizon) {
        const inflationRate = 0.025; // Assume 2.5% annual inflation
        const inflationAdjustment = Math.pow(1 + inflationRate, timeHorizon);
        return amount / inflationAdjustment;
    }

    /**
     * Calculate diversification benefit
     */
    calculateDiversificationBenefit(portfolio) {
        const numAssets = Object.keys(portfolio).length;
        if (numAssets <= 1) return 0;
        
        // Simplified diversification benefit calculation
        return Math.min(0.15, 0.05 * Math.log(numAssets));
    }

    /**
     * Calculate Value at Risk (VaR)
     */
    calculateValueAtRisk(amount, expectedReturn, volatility) {
        // 95% VaR (5% worst case)
        const zScore = -1.645; // 95th percentile
        const varReturn = expectedReturn + zScore * volatility;
        return amount * (1 + varReturn) - amount;
    }

    /**
     * Calculate Conditional Value at Risk (CVaR)
     */
    calculateConditionalVaR(amount, expectedReturn, volatility) {
        // Expected loss given that we're in the worst 5%
        const zScore = -2.062; // Conditional on being in worst 5%
        const cvarReturn = expectedReturn + zScore * volatility;
        return amount * (1 + cvarReturn) - amount;
    }

    /**
     * Get mock market data for simulation
     */
    getMockMarketData() {
        return {
            'AAPL': { currentPrice: 185.20, volatility: 0.24 },
            'MSFT': { currentPrice: 378.45, volatility: 0.22 },
            'GOOGL': { currentPrice: 142.30, volatility: 0.26 },
            'AMZN': { currentPrice: 152.50, volatility: 0.30 },
            'TSLA': { currentPrice: 248.50, volatility: 0.65 },
            'META': { currentPrice: 485.20, volatility: 0.35 },
            'NVDA': { currentPrice: 485.20, volatility: 0.45 },
            'SPY': { currentPrice: 445.20, volatility: 0.16 },
            'QQQ': { currentPrice: 378.45, volatility: 0.20 }
        };
    }
}

module.exports = new InvestmentSimulator();
