const axios = require('axios');

class NewsService {
    constructor() {
        // API keys for various news and data providers
        this.newsApiKey = process.env.NEWS_API_KEY;
        this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
        this.finnhubKey = process.env.FINNHUB_API_KEY;
        this.polygonKey = process.env.POLYGON_API_KEY;
        
        // News sources and categories
        this.financialSources = [
            'bloomberg.com',
            'reuters.com',
            'cnbc.com',
            'marketwatch.com',
            'wsj.com',
            'ft.com',
            'seekingalpha.com',
            'fool.com'
        ];
        
        this.sentimentKeywords = {
            positive: [
                'beat', 'exceeded', 'strong', 'growth', 'gain', 'rise', 'bull', 'upgrade',
                'positive', 'bullish', 'outperform', 'buy', 'rally', 'surge', 'momentum',
                'optimistic', 'confident', 'success', 'profit', 'revenue', 'earnings'
            ],
            negative: [
                'miss', 'fell', 'drop', 'decline', 'bear', 'downgrade', 'negative',
                'bearish', 'underperform', 'sell', 'crash', 'plunge', 'concern',
                'pessimistic', 'loss', 'risk', 'warning', 'disappointing', 'weak'
            ]
        };
    }

    async getMarketNews(limit = 20, category = 'general') {
        try {
            const news = await this.fetchMarketNews(limit, category);
            const processedNews = await this.processNewsItems(news);
            
            return {
                articles: processedNews,
                summary: this.generateNewsSummary(processedNews),
                sentimentAnalysis: this.analyzeOverallSentiment(processedNews),
                categories: this.categorizeNews(processedNews),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching market news:', error);
            return this.getMockMarketNews();
        }
    }

    async getCompanyNews(symbol, limit = 10) {
        try {
            const news = await this.fetchCompanySpecificNews(symbol, limit);
            const processedNews = await this.processNewsItems(news);
            
            return {
                symbol,
                articles: processedNews,
                sentimentAnalysis: this.analyzeCompanySentiment(processedNews, symbol),
                keyTopics: this.extractKeyTopics(processedNews, symbol),
                impactScore: this.calculateNewsImpact(processedNews),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error fetching news for ${symbol}:`, error);
            return this.getMockCompanyNews(symbol);
        }
    }

    async getSentimentAnalysis(symbol, timeframe = '7d') {
        try {
            const [newsData, socialData, analystData] = await Promise.all([
                this.getCompanyNews(symbol, 50),
                this.getSocialMediaSentiment(symbol),
                this.getAnalystSentiment(symbol)
            ]);

            return {
                symbol,
                timeframe,
                overall: {
                    score: this.calculateOverallSentiment(newsData, socialData, analystData),
                    direction: 'positive', // or 'negative', 'neutral'
                    confidence: 0.82,
                    change: '+0.15' // change from previous period
                },
                breakdown: {
                    news: {
                        score: newsData.sentimentAnalysis?.score || 0.6,
                        articles: newsData.articles?.length || 0,
                        positiveCount: newsData.sentimentAnalysis?.positive || 0,
                        negativeCount: newsData.sentimentAnalysis?.negative || 0
                    },
                    social: {
                        score: socialData.overallSentiment || 0.55,
                        mentions: socialData.totalMentions || 0,
                        engagement: socialData.totalEngagement || 0
                    },
                    analyst: {
                        score: analystData.consensusScore || 0.7,
                        upgrades: analystData.recentUpgrades || 0,
                        downgrades: analystData.recentDowngrades || 0
                    }
                },
                trends: {
                    daily: this.generateSentimentTrend('daily', 7),
                    weekly: this.generateSentimentTrend('weekly', 4),
                    monthly: this.generateSentimentTrend('monthly', 3)
                },
                keyEvents: this.identifyKeyEvents(newsData.articles),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error analyzing sentiment for ${symbol}:`, error);
            return this.getMockSentimentAnalysis(symbol);
        }
    }

    async fetchMarketNews(limit, category) {
        try {
            // Mock implementation - in production, integrate with real news APIs
            return [
                {
                    title: "Federal Reserve Signals Potential Rate Cuts in 2024",
                    description: "Fed officials hint at possible monetary policy easing as inflation shows signs of cooling.",
                    url: "https://example.com/fed-rate-cuts",
                    source: "Reuters",
                    publishedAt: "2024-01-16T09:30:00Z",
                    category: "monetary-policy"
                },
                {
                    title: "Tech Stocks Rally on Strong AI Earnings",
                    description: "Major technology companies report better-than-expected earnings driven by AI investments.",
                    url: "https://example.com/tech-rally",
                    source: "CNBC",
                    publishedAt: "2024-01-16T08:15:00Z",
                    category: "technology"
                },
                {
                    title: "Oil Prices Surge Amid Middle East Tensions",
                    description: "Crude oil futures jump 3% as geopolitical concerns affect supply chains.",
                    url: "https://example.com/oil-surge",
                    source: "Bloomberg",
                    publishedAt: "2024-01-16T07:45:00Z",
                    category: "commodities"
                }
            ];
        } catch (error) {
            console.error('Error fetching market news:', error);
            return [];
        }
    }

    async fetchCompanySpecificNews(symbol, limit) {
        try {
            // Mock company-specific news
            return [
                {
                    title: `${symbol} Beats Q4 Earnings Expectations`,
                    description: `${symbol} reports stronger than expected quarterly results with revenue growth of 8.2%.`,
                    url: `https://example.com/${symbol.toLowerCase()}-earnings`,
                    source: "Financial Times",
                    publishedAt: "2024-01-15T16:00:00Z",
                    relevanceScore: 0.95
                },
                {
                    title: `Analysts Raise Price Target for ${symbol}`,
                    description: `Multiple investment firms increase their price targets following strong fundamentals.`,
                    url: `https://example.com/${symbol.toLowerCase()}-target`,
                    source: "MarketWatch",
                    publishedAt: "2024-01-15T14:30:00Z",
                    relevanceScore: 0.88
                },
                {
                    title: `${symbol} Announces New Product Launch`,
                    description: `Company unveils innovative product expected to drive future growth.`,
                    url: `https://example.com/${symbol.toLowerCase()}-product`,
                    source: "TechCrunch",
                    publishedAt: "2024-01-14T12:00:00Z",
                    relevanceScore: 0.75
                }
            ];
        } catch (error) {
            console.error('Error fetching company news:', error);
            return [];
        }
    }

    async processNewsItems(articles) {
        return articles.map(article => ({
            ...article,
            sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
            keywords: this.extractKeywords(article.title + ' ' + article.description),
            readingTime: this.estimateReadingTime(article.description),
            publishedAgo: this.getTimeAgo(article.publishedAt)
        }));
    }

    analyzeSentiment(text) {
        if (!text) return { score: 0, label: 'neutral' };
        
        const words = text.toLowerCase().split(/\W+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (this.sentimentKeywords.positive.includes(word)) {
                positiveCount++;
            } else if (this.sentimentKeywords.negative.includes(word)) {
                negativeCount++;
            }
        });

        const totalSentimentWords = positiveCount + negativeCount;
        if (totalSentimentWords === 0) {
            return { score: 0, label: 'neutral' };
        }

        const score = (positiveCount - negativeCount) / totalSentimentWords;
        let label = 'neutral';
        
        if (score > 0.2) label = 'positive';
        else if (score < -0.2) label = 'negative';

        return { score: score, label: label };
    }

    extractKeywords(text) {
        if (!text) return [];
        
        const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word));
        
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    estimateReadingTime(text) {
        const wordsPerMinute = 200;
        const words = text ? text.split(/\s+/).length : 0;
        return Math.ceil(words / wordsPerMinute);
    }

    getTimeAgo(dateString) {
        const now = new Date();
        const published = new Date(dateString);
        const diffInSeconds = Math.floor((now - published) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    generateNewsSummary(articles) {
        const totalArticles = articles.length;
        const positiveArticles = articles.filter(a => a.sentiment?.label === 'positive').length;
        const negativeArticles = articles.filter(a => a.sentiment?.label === 'negative').length;
        
        return {
            totalArticles,
            sentimentBreakdown: {
                positive: positiveArticles,
                negative: negativeArticles,
                neutral: totalArticles - positiveArticles - negativeArticles
            },
            topCategories: this.getTopCategories(articles),
            topSources: this.getTopSources(articles)
        };
    }

    analyzeOverallSentiment(articles) {
        if (!articles || articles.length === 0) {
            return { score: 0, label: 'neutral', confidence: 0 };
        }

        const sentiments = articles.map(a => a.sentiment?.score || 0);
        const averageScore = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
        
        let label = 'neutral';
        if (averageScore > 0.1) label = 'positive';
        else if (averageScore < -0.1) label = 'negative';
        
        const confidence = Math.abs(averageScore);
        
        return { score: averageScore, label: label, confidence: confidence };
    }

    categorizeNews(articles) {
        const categories = {};
        articles.forEach(article => {
            const category = article.category || this.detectCategory(article.title);
            categories[category] = (categories[category] || 0) + 1;
        });
        return categories;
    }

    detectCategory(title) {
        const categoryKeywords = {
            'earnings': ['earnings', 'revenue', 'profit', 'quarterly'],
            'technology': ['ai', 'tech', 'software', 'digital'],
            'monetary-policy': ['fed', 'interest', 'rate', 'policy'],
            'commodities': ['oil', 'gold', 'commodity', 'energy'],
            'market': ['market', 'stock', 'index', 'trading']
        };
        
        const lowerTitle = title.toLowerCase();
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerTitle.includes(keyword))) {
                return category;
            }
        }
        return 'general';
    }

    getTopCategories(articles) {
        const categories = this.categorizeNews(articles);
        return Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
    }

    getTopSources(articles) {
        const sources = {};
        articles.forEach(article => {
            const source = article.source || 'Unknown';
            sources[source] = (sources[source] || 0) + 1;
        });
        return Object.entries(sources)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([source, count]) => ({ source, count }));
    }

    async getSocialMediaSentiment(symbol) {
        try {
            // Mock social media sentiment data
            return {
                overallSentiment: 0.65,
                totalMentions: 1520,
                totalEngagement: 45000,
                platforms: {
                    twitter: { mentions: 800, sentiment: 0.72 },
                    reddit: { mentions: 450, sentiment: 0.58 },
                    stocktwits: { mentions: 270, sentiment: 0.68 }
                },
                trending: true,
                sentimentChange: '+0.12'
            };
        } catch (error) {
            console.error('Error fetching social sentiment:', error);
            return {};
        }
    }

    async getAnalystSentiment(symbol) {
        try {
            return {
                consensusScore: 0.75,
                recentUpgrades: 3,
                recentDowngrades: 1,
                averageRating: 4.2,
                priceTargetChange: '+5.8%'
            };
        } catch (error) {
            console.error('Error fetching analyst sentiment:', error);
            return {};
        }
    }

    calculateOverallSentiment(newsData, socialData, analystData) {
        const newsWeight = 0.4;
        const socialWeight = 0.3;
        const analystWeight = 0.3;
        
        const newsScore = newsData.sentimentAnalysis?.score || 0;
        const socialScore = socialData.overallSentiment || 0;
        const analystScore = analystData.consensusScore || 0;
        
        return (newsScore * newsWeight + socialScore * socialWeight + analystScore * analystWeight);
    }

    generateSentimentTrend(period, points) {
        // Generate mock trend data
        const trend = [];
        for (let i = points - 1; i >= 0; i--) {
            const baseScore = 0.6 + (Math.random() - 0.5) * 0.4;
            trend.push({
                period: this.formatPeriod(period, i),
                score: parseFloat(baseScore.toFixed(2))
            });
        }
        return trend;
    }

    formatPeriod(period, offset) {
        const now = new Date();
        if (period === 'daily') {
            const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
            return date.toISOString().split('T')[0];
        } else if (period === 'weekly') {
            const weekStart = new Date(now.getTime() - offset * 7 * 24 * 60 * 60 * 1000);
            return `Week of ${weekStart.toISOString().split('T')[0]}`;
        } else {
            const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            return month.toISOString().slice(0, 7);
        }
    }

    identifyKeyEvents(articles) {
        // Identify high-impact news events
        return articles
            .filter(article => article.relevanceScore > 0.8 || article.sentiment?.score > 0.5)
            .slice(0, 5)
            .map(article => ({
                title: article.title,
                impact: article.relevanceScore > 0.9 ? 'high' : 'medium',
                sentiment: article.sentiment?.label || 'neutral',
                date: article.publishedAt
            }));
    }

    calculateNewsImpact(articles) {
        if (!articles || articles.length === 0) return 0;
        
        const impactFactors = articles.map(article => {
            let impact = 0.5; // base impact
            
            // Adjust based on sentiment strength
            if (article.sentiment?.score) {
                impact += Math.abs(article.sentiment.score) * 0.3;
            }
            
            // Adjust based on relevance
            if (article.relevanceScore) {
                impact += article.relevanceScore * 0.2;
            }
            
            return Math.min(impact, 1); // cap at 1
        });
        
        return impactFactors.reduce((sum, impact) => sum + impact, 0) / impactFactors.length;
    }

    getMockMarketNews() {
        return {
            articles: [
                {
                    title: "Market Opens Higher on Economic Data",
                    description: "Stock indices rise as latest economic indicators show continued growth.",
                    source: "Reuters",
                    publishedAt: new Date().toISOString(),
                    sentiment: { score: 0.3, label: 'positive' }
                }
            ],
            summary: { totalArticles: 1, sentimentBreakdown: { positive: 1, negative: 0, neutral: 0 } },
            sentimentAnalysis: { score: 0.3, label: 'positive', confidence: 0.3 },
            timestamp: new Date().toISOString()
        };
    }

    getMockCompanyNews(symbol) {
        return {
            symbol,
            articles: [
                {
                    title: `${symbol} Shows Strong Performance`,
                    description: "Company continues to demonstrate solid fundamentals and growth.",
                    source: "Financial Times",
                    publishedAt: new Date().toISOString(),
                    sentiment: { score: 0.4, label: 'positive' }
                }
            ],
            sentimentAnalysis: { score: 0.4, label: 'positive', confidence: 0.4 },
            timestamp: new Date().toISOString()
        };
    }

    getMockSentimentAnalysis(symbol) {
        return {
            symbol,
            overall: { score: 0.6, direction: 'positive', confidence: 0.7, change: '+0.1' },
            breakdown: {
                news: { score: 0.6, articles: 10, positiveCount: 6, negativeCount: 2 },
                social: { score: 0.55, mentions: 150, engagement: 5000 },
                analyst: { score: 0.7, upgrades: 2, downgrades: 0 }
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new NewsService(); 