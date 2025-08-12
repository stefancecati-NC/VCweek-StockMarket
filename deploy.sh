#!/bin/bash

# Deploy script for Stock Market App

echo "🚀 Deploying Stock Market App..."

# Build the frontend
echo "📦 Building frontend..."
npm run build

# Commit and push changes
echo "📤 Committing and pushing changes..."
git add .
git commit -m "Update deployment configuration with backend URL"
git push

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://stefancecati-NC.github.io/VCweek-StockMarket"
echo "🔧 Backend: Update script.js with your backend URL"

# Instructions
echo ""
echo "📋 Next steps:"
echo "1. Deploy backend to Render.com or Railway"
echo "2. Get your backend URL"
echo "3. Update public/script.js line ~13 with your backend URL"
echo "4. Run this script again to deploy the updated frontend"
