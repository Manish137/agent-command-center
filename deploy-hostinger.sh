#!/bin/bash
echo "🚀 Starting ApexAgent Hostinger Automated Setup..."

# Update and install Node.js 20 if needed
if ! command -v node &> /dev/null
then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 process manager
if ! command -v pm2 &> /dev/null
then
    echo "📦 Installing PM2 process manager..."
    npm install -g pm2
fi

# Install dependencies and build frontend
echo "⚙️ Installing packages and building frontend..."
npm install
npm run build

# Restart process via PM2
echo "⚡ Starting ApexAgent Command Center process..."
pm2 restart apexagent || pm2 start server/index.js --name "apexagent"
pm2 save

echo "🎉 ApexAgent Command Center is live on your Hostinger server!"
