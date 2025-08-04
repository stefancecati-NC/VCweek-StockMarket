const OpenAI = require('openai');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async generateDailySummary(marketData, earningsData) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                console.warn('OpenAI API key not found, using mock summary');
                return this.getMockSummary(marketData, earningsData);
            }

            const prompt = this.buildPrompt(marketData, earningsData);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional financial analyst providing daily market summaries. Be concise, informative, and focus on key trends and opportunities."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.7
            });

            return {
                summary: completion.choices[0].message.content,
                keyPoints: this.extractKeyPoints(completion.choices[0].message.content),
                sentiment: this.analyzeSentiment(marketData),
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating AI summary:', error);
            return this.getMockSummary(marketData, earningsData);
        }
    }

    buildPrompt(marketData, earningsData) {
        let prompt = "Provide a daily stock market summary based on the following data:\n\n";
        
        // Market indices
        prompt += "Market Indices:\n";
        if (marketData.indices) {
            Object.entries(marketData.indices).forEach(([symbol, data]) => {
                prompt += `${symbol}: $${data.price} (${data.change >= 0 ? '+' : ''}${data.change}, ${data.changePercent}%)\n`;
            });
        }
        
        // Top movers
        prompt += "\nTop Gainers:\n";
        if (marketData.topMovers?.gainers) {
            marketData.topMovers.gainers.forEach(stock => {
                prompt += `${stock.symbol}: $${stock.price} (+${stock.change}, +${stock.changePercent}%)\n`;
            });
        }
        
        prompt += "\nTop Losers:\n";
        if (marketData.topMovers?.losers) {
            marketData.topMovers.losers.forEach(stock => {
                prompt += `${stock.symbol}: $${stock.price} (${stock.change}, ${stock.changePercent}%)\n`;
            });
        }
        
        // Upcoming earnings
        prompt += "\nUpcoming Earnings (Next 7 Days):\n";
        if (earningsData && earningsData.length > 0) {
            earningsData.forEach(earning => {
                prompt += `${earning.symbol} (${earning.company}): ${earning.dateFormatted}, Est. EPS: $${earning.estimatedEPS}\n`;
            });
        }
        
        prompt += "\nPlease provide:\n";
        prompt += "1. A brief market overview highlighting key trends\n";
        prompt += "2. Analysis of notable stock movements\n";
        prompt += "3. What to watch for in upcoming earnings\n";
        prompt += "4. Any significant market events or economic factors\n";
        prompt += "\nKeep the summary professional, concise, and actionable for investors.";
        
        return prompt;
    }

    extractKeyPoints(summary) {
        // Extract key points from the summary
        const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
        return sentences.slice(0, 5).map(s => s.trim());
    }

    analyzeSentiment(marketData) {
        let positiveCount = 0;
        let negativeCount = 0;
        let totalCount = 0;

        // Analyze indices sentiment
        if (marketData.indices) {
            Object.values(marketData.indices).forEach(data => {
                totalCount++;
                if (data.change > 0) positiveCount++;
                else if (data.change < 0) negativeCount++;
            });
        }

        // Analyze major stocks sentiment
        if (marketData.majorStocks) {
            Object.values(marketData.majorStocks).forEach(data => {
                totalCount++;
                if (data.change > 0) positiveCount++;
                else if (data.change < 0) negativeCount++;
            });
        }

        const positiveRatio = totalCount > 0 ? positiveCount / totalCount : 0.5;
        
        if (positiveRatio > 0.6) return 'bullish';
        if (positiveRatio < 0.4) return 'bearish';
        return 'neutral';
    }

    getMockSummary(marketData, earningsData) {
        const sentiment = this.analyzeSentiment(marketData);
        
        let mockSummary = `Today's market session showed ${sentiment} sentiment with mixed performance across major indices. `;
        
        if (marketData.topMovers?.gainers?.length > 0) {
            const topGainer = marketData.topMovers.gainers[0];
            mockSummary += `${topGainer.symbol} led gains with a ${topGainer.changePercent}% increase to $${topGainer.price}. `;
        }
        
        if (marketData.topMovers?.losers?.length > 0) {
            const topLoser = marketData.topMovers.losers[0];
            mockSummary += `On the downside, ${topLoser.symbol} declined ${Math.abs(topLoser.changePercent)}% to $${topLoser.price}. `;
        }
        
        mockSummary += "Technology stocks continue to show volatility as investors assess AI developments and interest rate expectations. ";
        
        if (earningsData && earningsData.length > 0) {
            mockSummary += `Looking ahead, earnings reports from ${earningsData.slice(0, 3).map(e => e.symbol).join(', ')} will be key catalysts for market direction. `;
        }
        
        mockSummary += "Traders should monitor Federal Reserve communications and economic data releases for further market direction.";

        return {
            summary: mockSummary,
            keyPoints: [
                `Market sentiment appears ${sentiment}`,
                "Technology sector showing continued volatility",
                "Upcoming earnings reports will be key catalysts",
                "Interest rate expectations remain a focus",
                "Economic data releases worth monitoring"
            ],
            sentiment: sentiment,
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = new AIService();