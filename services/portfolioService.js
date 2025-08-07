const stockService = require('./stockService');

class PortfolioService {
    constructor() {
        // In-memory storage for demo purposes
        // In production, this would be replaced with a database
        this.portfolios = new Map();
        this.defaultPortfolioId = 'default';
        
        // Initialize default portfolio
        this.portfolios.set(this.defaultPortfolioId, {
            id: this.defaultPortfolioId,
            name: 'My Portfolio',
            positions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Asset type categories for allocation
        this.assetCategories = {
            'Technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC', 'CSCO', 'IBM'],
            'Consumer Discretionary': ['TSLA', 'AMZN'],
            'Healthcare': [],
            'Financial': [],
            'Energy': [],
            'Utilities': [],
            'Real Estate': [],
            'Materials': [],
            'Industrials': [],
            'Consumer Staples': [],
            'Communication Services': []
        };
    }

    // Get portfolio by ID
    getPortfolio(portfolioId = this.defaultPortfolioId) {
        return this.portfolios.get(portfolioId) || null;
    }

    // Get all portfolios
    getAllPortfolios() {
        return Array.from(this.portfolios.values());
    }

    // Create new portfolio
    createPortfolio(name) {
        const id = `portfolio_${Date.now()}`;
        const portfolio = {
            id,
            name,
            positions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.portfolios.set(id, portfolio);
        return portfolio;
    }

    // Add position to portfolio
    addPosition(position, portfolioId = this.defaultPortfolioId) {
        const portfolio = this.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        // Validate position data
        if (!position.symbol || !position.quantity || !position.purchasePrice) {
            throw new Error('Missing required position data: symbol, quantity, purchasePrice');
        }

        // Check if position already exists for this symbol
        const existingPositionIndex = portfolio.positions.findIndex(p => p.symbol === position.symbol.toUpperCase());
        
        const newPosition = {
            id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol: position.symbol.toUpperCase(),
            quantity: Number.parseFloat(position.quantity),
            purchasePrice: Number.parseFloat(position.purchasePrice),
            purchaseDate: position.purchaseDate || new Date().toISOString().split('T')[0],
            assetType: position.assetType || this.getAssetType(position.symbol),
            sector: position.sector || this.getSector(position.symbol),
            createdAt: new Date().toISOString()
        };

        if (existingPositionIndex >= 0) {
            // Update existing position (average cost)
            const existingPosition = portfolio.positions[existingPositionIndex];
            const totalValue = (existingPosition.quantity * existingPosition.purchasePrice) + 
                             (newPosition.quantity * newPosition.purchasePrice);
            const totalQuantity = existingPosition.quantity + newPosition.quantity;
            
            existingPosition.quantity = totalQuantity;
            existingPosition.purchasePrice = totalValue / totalQuantity;
            existingPosition.updatedAt = new Date().toISOString();
        } else {
            // Add new position
            portfolio.positions.push(newPosition);
        }

        portfolio.updatedAt = new Date().toISOString();
        return portfolio;
    }

    // Remove position from portfolio
    removePosition(positionId, portfolioId = this.defaultPortfolioId) {
        const portfolio = this.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        const positionIndex = portfolio.positions.findIndex(p => p.id === positionId);
        if (positionIndex === -1) {
            throw new Error('Position not found');
        }

        portfolio.positions.splice(positionIndex, 1);
        portfolio.updatedAt = new Date().toISOString();
        return portfolio;
    }

    // Update position quantity
    updatePosition(positionId, updates, portfolioId = this.defaultPortfolioId) {
        const portfolio = this.getPortfolio(portfolioId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        const position = portfolio.positions.find(p => p.id === positionId);
        if (!position) {
            throw new Error('Position not found');
        }

        // Update allowed fields
        if (updates.quantity !== undefined) position.quantity = Number.parseFloat(updates.quantity);
        if (updates.purchasePrice !== undefined) position.purchasePrice = Number.parseFloat(updates.purchasePrice);
        if (updates.assetType !== undefined) position.assetType = updates.assetType;
        if (updates.sector !== undefined) position.sector = updates.sector;
        
        position.updatedAt = new Date().toISOString();
        portfolio.updatedAt = new Date().toISOString();
        
        return portfolio;
    }

    // Calculate portfolio performance with real-time data
    async calculatePortfolioPerformance(portfolioId = this.defaultPortfolioId) {
        const portfolio = this.getPortfolio(portfolioId);
        if (!portfolio || portfolio.positions.length === 0) {
            return {
                totalValue: 0,
                totalCost: 0,
                totalGainLoss: 0,
                totalGainLossPercent: 0,
                positions: []
            };
        }

        try {
            // Get current market data
            const marketData = await stockService.getMarketOverview();
            const currentPrices = this.extractCurrentPrices(marketData);

            let totalValue = 0;
            let totalCost = 0;
            const positionsWithPerformance = [];

            for (const position of portfolio.positions) {
                const currentPrice = currentPrices[position.symbol] || position.purchasePrice;
                const marketValue = position.quantity * currentPrice;
                const costBasis = position.quantity * position.purchasePrice;
                const gainLoss = marketValue - costBasis;
                const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

                positionsWithPerformance.push({
                    ...position,
                    currentPrice,
                    marketValue,
                    costBasis,
                    gainLoss,
                    gainLossPercent,
                    weight: 0 // Will be calculated after total value is known
                });

                totalValue += marketValue;
                totalCost += costBasis;
            }

            // Calculate weights
            for (const position of positionsWithPerformance) {
                position.weight = totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0;
            }

            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

            return {
                totalValue,
                totalCost,
                totalGainLoss,
                totalGainLossPercent,
                positions: positionsWithPerformance,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error calculating portfolio performance:', error);
            // Return basic calculation without real-time data
            return this.calculateBasicPerformance(portfolio);
        }
    }

    // Calculate asset allocation
    async calculateAssetAllocation(portfolioId = this.defaultPortfolioId) {
        const performance = await this.calculatePortfolioPerformance(portfolioId);
        
        const allocations = {
            byAssetType: {},
            bySector: {},
            bySymbol: {}
        };

        performance.positions.forEach(position => {
            // By asset type
            const assetType = position.assetType || 'Unknown';
            if (!allocations.byAssetType[assetType]) {
                allocations.byAssetType[assetType] = { value: 0, weight: 0, positions: 0 };
            }
            allocations.byAssetType[assetType].value += position.marketValue;
            allocations.byAssetType[assetType].weight += position.weight;
            allocations.byAssetType[assetType].positions += 1;

            // By sector
            const sector = position.sector || 'Unknown';
            if (!allocations.bySector[sector]) {
                allocations.bySector[sector] = { value: 0, weight: 0, positions: 0 };
            }
            allocations.bySector[sector].value += position.marketValue;
            allocations.bySector[sector].weight += position.weight;
            allocations.bySector[sector].positions += 1;

            // By symbol
            allocations.bySymbol[position.symbol] = {
                value: position.marketValue,
                weight: position.weight,
                quantity: position.quantity
            };
        });

        return {
            ...allocations,
            totalValue: performance.totalValue,
            lastUpdated: new Date().toISOString()
        };
    }

    // Helper methods
    extractCurrentPrices(marketData) {
        const prices = {};
        
        // Extract from major stocks
        if (marketData.majorStocks) {
            Object.keys(marketData.majorStocks).forEach(symbol => {
                prices[symbol] = marketData.majorStocks[symbol].price;
            });
        }

        // Extract from top movers
        if (marketData.topMovers) {
            [...(marketData.topMovers.gainers || []), ...(marketData.topMovers.losers || [])].forEach(stock => {
                prices[stock.symbol] = stock.price;
            });
        }

        return prices;
    }

    calculateBasicPerformance(portfolio) {
        let totalValue = 0;
        let totalCost = 0;
        const positions = portfolio.positions.map(position => {
            const costBasis = position.quantity * position.purchasePrice;
            const marketValue = costBasis; // Use cost basis as market value when no real-time data
            
            totalValue += marketValue;
            totalCost += costBasis;

            return {
                ...position,
                currentPrice: position.purchasePrice,
                marketValue,
                costBasis,
                gainLoss: 0,
                gainLossPercent: 0,
                weight: 0
            };
        });

        // Calculate weights
        positions.forEach(position => {
            position.weight = totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0;
        });

        return {
            totalValue,
            totalCost,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            positions,
            lastUpdated: new Date().toISOString()
        };
    }

    getAssetType(symbol) {
        // Determine asset type based on symbol
        for (const [category, symbols] of Object.entries(this.assetCategories)) {
            if (symbols.includes(symbol.toUpperCase())) {
                return category;
            }
        }
        return 'Stock'; // Default asset type
    }

    getSector(symbol) {
        // Map symbols to sectors (simplified)
        const sectorMap = {
            'AAPL': 'Technology',
            'MSFT': 'Technology', 
            'GOOGL': 'Technology',
            'AMZN': 'Consumer Discretionary',
            'TSLA': 'Consumer Discretionary',
            'META': 'Technology',
            'NVDA': 'Technology',
            'AMD': 'Technology',
            'NFLX': 'Communication Services',
            'ADBE': 'Technology',
            'CRM': 'Technology',
            'ORCL': 'Technology',
            'INTC': 'Technology',
            'CSCO': 'Technology',
            'IBM': 'Technology'
        };
        
        return sectorMap[symbol.toUpperCase()] || 'Unknown';
    }

    // Get portfolio summary statistics
    async getPortfolioSummary(portfolioId = this.defaultPortfolioId) {
        const portfolio = this.getPortfolio(portfolioId);
        const performance = await this.calculatePortfolioPerformance(portfolioId);
        const allocation = await this.calculateAssetAllocation(portfolioId);
        
        return {
            portfolio: {
                id: portfolio.id,
                name: portfolio.name,
                positionsCount: portfolio.positions.length,
                createdAt: portfolio.createdAt,
                updatedAt: portfolio.updatedAt
            },
            performance,
            allocation
        };
    }
}

module.exports = new PortfolioService(); 