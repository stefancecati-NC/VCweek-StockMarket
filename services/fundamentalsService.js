const axios = require('axios');

class FundamentalsService {
    constructor() {
        // API keys for various financial data providers
        this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
        this.finnhubKey = process.env.FINNHUB_API_KEY;
        this.fmpKey = process.env.FMP_API_KEY; // Financial Modeling Prep
        this.polygonKey = process.env.POLYGON_API_KEY;
        
        // Peer groups for comparison analysis
        this.peerGroups = {
            'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'META'],
            'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'ORCL'],
            'GOOGL': ['AAPL', 'MSFT', 'META', 'AMZN'],
            'AMZN': ['AAPL', 'MSFT', 'GOOGL', 'META'],
            'TSLA': ['F', 'GM', 'NIO', 'RIVN'],
            'META': ['GOOGL', 'SNAP', 'TWTR', 'PINS'],
            'NVDA': ['AMD', 'INTC', 'QCOM', 'AVGO']
        };
    }

    async getCompanyFundamentals(symbol) {
        try {
            const [
                financialStatements,
                keyRatios,
                analystRatings,
                executiveComp,
                insiderTrading,
                esgScores,
                peerComparison
            ] = await Promise.all([
                this.getFinancialStatements(symbol),
                this.getKeyFinancialRatios(symbol),
                this.getAnalystRatings(symbol),
                this.getExecutiveCompensation(symbol),
                this.getInsiderTrading(symbol),
                this.getESGScores(symbol),
                this.getPeerComparison(symbol)
            ]);

            return {
                symbol,
                company: await this.getCompanyInfo(symbol),
                financialStatements,
                keyRatios,
                analystRatings,
                executiveComp,
                insiderTrading,
                esgScores,
                peerComparison,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error fetching fundamentals for ${symbol}:`, error);
            return this.getMockFundamentals(symbol);
        }
    }

    async getFinancialStatements(symbol) {
        try {
            // In production, integrate with real APIs
            // For now, returning comprehensive mock data
            return {
                incomeStatement: {
                    annual: [
                        {
                            year: 2023,
                            revenue: 383285000000,
                            grossProfit: 169148000000,
                            operatingIncome: 114301000000,
                            netIncome: 96995000000,
                            eps: 6.13,
                            shares: 15812547000
                        },
                        {
                            year: 2022,
                            revenue: 394328000000,
                            grossProfit: 170782000000,
                            operatingIncome: 119437000000,
                            netIncome: 99803000000,
                            eps: 6.15,
                            shares: 16215963000
                        }
                    ],
                    quarterly: [
                        {
                            quarter: "Q4 2023",
                            revenue: 119575000000,
                            grossProfit: 54738000000,
                            operatingIncome: 40313000000,
                            netIncome: 33916000000,
                            eps: 2.18
                        }
                    ]
                },
                balanceSheet: {
                    totalAssets: 352755000000,
                    totalLiabilities: 290437000000,
                    shareholdersEquity: 62146000000,
                    cash: 29965000000,
                    totalDebt: 109280000000,
                    workingCapital: -7757000000
                },
                cashFlow: {
                    operatingCashFlow: 110543000000,
                    investingCashFlow: -3503000000,
                    financingCashFlow: -108488000000,
                    freeCashFlow: 99584000000,
                    capex: 10959000000
                }
            };
        } catch (error) {
            console.error('Error fetching financial statements:', error);
            return {};
        }
    }

    async getKeyFinancialRatios(symbol) {
        try {
            return {
                profitability: {
                    grossMargin: 44.13,
                    operatingMargin: 29.83,
                    netMargin: 25.31,
                    returnOnAssets: 28.27,
                    returnOnEquity: 147.25,
                    returnOnCapital: 31.08
                },
                liquidity: {
                    currentRatio: 0.98,
                    quickRatio: 0.83,
                    cashRatio: 0.25,
                    workingCapital: -7757000000
                },
                leverage: {
                    debtToEquity: 1.76,
                    debtToAssets: 0.31,
                    interestCoverage: 28.45,
                    debtToCapital: 0.64
                },
                efficiency: {
                    assetTurnover: 1.12,
                    inventoryTurnover: 10.85,
                    receivablesTurnover: 15.42,
                    payablesTurnover: 11.23
                },
                valuation: {
                    priceToEarnings: 29.85,
                    priceToBook: 45.23,
                    priceToSales: 7.45,
                    pegRatio: 2.18,
                    enterpriseValue: 2950000000000,
                    evToRevenue: 7.69,
                    evToEbitda: 24.12
                }
            };
        } catch (error) {
            console.error('Error fetching key ratios:', error);
            return {};
        }
    }

    async getAnalystRatings(symbol) {
        try {
            return {
                consensus: {
                    rating: "Buy",
                    score: 4.2,
                    totalAnalysts: 38
                },
                ratings: {
                    strongBuy: 18,
                    buy: 15,
                    hold: 4,
                    sell: 1,
                    strongSell: 0
                },
                priceTargets: {
                    average: 198.50,
                    high: 225.00,
                    low: 165.00,
                    current: 185.20,
                    upside: 7.18
                },
                recentChanges: [
                    {
                        analyst: "Morgan Stanley",
                        action: "Upgraded",
                        from: "Hold",
                        to: "Buy",
                        priceTarget: 210.00,
                        date: "2024-01-15"
                    },
                    {
                        analyst: "Goldman Sachs",
                        action: "Maintained",
                        rating: "Buy",
                        priceTarget: 205.00,
                        date: "2024-01-10"
                    }
                ]
            };
        } catch (error) {
            console.error('Error fetching analyst ratings:', error);
            return {};
        }
    }

    async getExecutiveCompensation(symbol) {
        try {
            return {
                ceo: {
                    name: "Tim Cook",
                    title: "Chief Executive Officer",
                    totalCompensation: 63209845,
                    salary: 3000000,
                    bonus: 0,
                    stockAwards: 58121184,
                    optionAwards: 0,
                    otherComp: 2088661,
                    year: 2023
                },
                executives: [
                    {
                        name: "Luca Maestri",
                        title: "Chief Financial Officer",
                        totalCompensation: 29456319,
                        salary: 1000000,
                        stockAwards: 27865514,
                        year: 2023
                    },
                    {
                        name: "Katherine Adams",
                        title: "General Counsel",
                        totalCompensation: 29203806,
                        salary: 1000000,
                        stockAwards: 27574212,
                        year: 2023
                    }
                ],
                payRatio: {
                    ceoToMedianWorker: 1447,
                    medianWorkerPay: 43713
                }
            };
        } catch (error) {
            console.error('Error fetching executive compensation:', error);
            return {};
        }
    }

    async getInsiderTrading(symbol) {
        try {
            return {
                recentTransactions: [
                    {
                        insider: "Timothy D. Cook",
                        title: "CEO",
                        transactionType: "Sale",
                        shares: 511000,
                        pricePerShare: 185.50,
                        totalValue: 94791500,
                        date: "2024-01-12",
                        filingDate: "2024-01-16"
                    },
                    {
                        insider: "Luca Maestri",
                        title: "CFO",
                        transactionType: "Sale",
                        shares: 85000,
                        pricePerShare: 182.30,
                        totalValue: 15495500,
                        date: "2024-01-08",
                        filingDate: "2024-01-10"
                    }
                ],
                summary: {
                    last3Months: {
                        totalTransactions: 15,
                        netShares: -750000,
                        netValue: -138250000,
                        sentiment: "Negative"
                    },
                    last12Months: {
                        totalTransactions: 47,
                        netShares: -2150000,
                        netValue: -385420000,
                        sentiment: "Negative"
                    }
                }
            };
        } catch (error) {
            console.error('Error fetching insider trading:', error);
            return {};
        }
    }

    async getESGScores(symbol) {
        try {
            return {
                overallScore: 78.5,
                grade: "A-",
                environmental: {
                    score: 82.1,
                    grade: "A",
                    factors: {
                        carbonFootprint: 85.2,
                        renewableEnergy: 78.9,
                        wasteManagement: 83.4,
                        waterUsage: 80.7
                    }
                },
                social: {
                    score: 76.3,
                    grade: "B+",
                    factors: {
                        employeeSatisfaction: 89.1,
                        diversityInclusion: 72.5,
                        communityEngagement: 78.8,
                        productSafety: 81.2
                    }
                },
                governance: {
                    score: 77.1,
                    grade: "B+",
                    factors: {
                        boardDiversity: 73.5,
                        executiveCompensation: 68.9,
                        shareholders: 82.3,
                        businessEthics: 83.7
                    }
                },
                peerRank: 2,
                industryAverage: 65.3,
                riskLevel: "Low",
                trends: {
                    yearOverYear: 2.3,
                    threeYear: 8.7
                }
            };
        } catch (error) {
            console.error('Error fetching ESG scores:', error);
            return {};
        }
    }

    async getPeerComparison(symbol) {
        try {
            const peers = this.peerGroups[symbol] || [];
            
            return {
                peers: peers,
                comparison: {
                    marketCap: {
                        company: 2890000000000,
                        peerAverage: 1850000000000,
                        rank: 1
                    },
                    peRatio: {
                        company: 29.85,
                        peerAverage: 35.42,
                        rank: 2
                    },
                    revenue: {
                        company: 383285000000,
                        peerAverage: 298750000000,
                        rank: 1
                    },
                    netMargin: {
                        company: 25.31,
                        peerAverage: 18.75,
                        rank: 1
                    },
                    roe: {
                        company: 147.25,
                        peerAverage: 22.84,
                        rank: 1
                    },
                    debtToEquity: {
                        company: 1.76,
                        peerAverage: 0.45,
                        rank: 4
                    }
                }
            };
        } catch (error) {
            console.error('Error fetching peer comparison:', error);
            return {};
        }
    }

    async getCompanyInfo(symbol) {
        try {
            const companyData = {
                'AAPL': {
                    name: 'Apple Inc.',
                    sector: 'Technology',
                    industry: 'Consumer Electronics',
                    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
                    headquarters: 'Cupertino, California',
                    founded: 1976,
                    employees: 164000,
                    website: 'https://www.apple.com'
                },
                'MSFT': {
                    name: 'Microsoft Corporation',
                    sector: 'Technology',
                    industry: 'Software',
                    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
                    headquarters: 'Redmond, Washington',
                    founded: 1975,
                    employees: 221000,
                    website: 'https://www.microsoft.com'
                }
            };
            
            return companyData[symbol] || {
                name: symbol,
                sector: 'Unknown',
                industry: 'Unknown',
                description: 'Company information not available',
                headquarters: 'Unknown',
                founded: null,
                employees: null,
                website: null
            };
        } catch (error) {
            console.error('Error fetching company info:', error);
            return {};
        }
    }

    getMockFundamentals(symbol) {
        return {
            symbol,
            company: { name: symbol, sector: 'Unknown' },
            financialStatements: {},
            keyRatios: {},
            analystRatings: { consensus: { rating: 'N/A' } },
            executiveComp: {},
            insiderTrading: {},
            esgScores: { overallScore: 0, grade: 'N/A' },
            peerComparison: {},
            lastUpdated: new Date().toISOString(),
            error: 'Unable to fetch fundamentals data'
        };
    }

    async getCompanyNews(symbol, limit = 10) {
        try {
            // Mock news data - in production, integrate with news APIs
            return [
                {
                    headline: `${symbol} Reports Strong Q4 Earnings`,
                    summary: "Company beats analyst expectations with record revenue and profit margins.",
                    source: "Financial Times",
                    publishedAt: "2024-01-15T10:30:00Z",
                    sentiment: "positive",
                    url: "#"
                },
                {
                    headline: `Analysts Upgrade ${symbol} Price Target`,
                    summary: "Multiple investment firms raise price targets following strong fundamentals.",
                    source: "Reuters",
                    publishedAt: "2024-01-14T15:45:00Z",
                    sentiment: "positive",
                    url: "#"
                }
            ];
        } catch (error) {
            console.error('Error fetching company news:', error);
            return [];
        }
    }
}

module.exports = new FundamentalsService(); 