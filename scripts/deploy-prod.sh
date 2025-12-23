#!/bin/bash

# RegiNor Production Deployment Script
# Usage: ./deploy-prod.sh

set -e

echo "🚀 Deploying RegiNor Production..."
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SSH_HOST="${PROD_SSH_HOST:-cpanel34.proisp.no}"
SSH_USER="${PROD_SSH_USER:-dilequac}"
SSH_PORT="${PROD_SSH_PORT:-22}"
REMOTE_DIR="~/reginor-events.dileque.no"

echo -e "${YELLOW}Connecting to ${SSH_USER}@${SSH_HOST}...${NC}"

# SSH and deploy
ssh -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST} << 'ENDSSH'
    set -e
    
    echo "📂 Navigating to production directory..."
    cd ~/reginor-events.dileque.no
    
    echo "🔄 Pulling latest code from main branch..."
    git fetch origin main
    git reset --hard origin/main
    
    echo "🔧 Setting up Node.js environment..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 18
    
    echo "📦 Installing root dependencies..."
    npm install
    
    echo "📦 Installing web app dependencies..."
    cd apps/web
    npm install
    cd ../..
    
    echo "🗃️  Generating Prisma Client..."
    cd packages/database
    npx prisma generate
    
    echo "🗃️  Running database migrations..."
    npx dotenv-cli -e .env.prod -- npx prisma migrate deploy
    
    echo "🏗️  Building Next.js application..."
    cd ~/reginor-prod/apps/web
    npm run build
    
    echo "🔄 Restarting PM2 process..."
    pm2 restart reginor-prod
    
    echo "📊 Checking PM2 status..."
    pm2 status reginor-prod
    
    echo "✅ Production deployment completed!"
ENDSSH

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${YELLOW}🔍 Checking health...${NC}"

# Health check
sleep 5
if curl -f -s https://reginor.events > /dev/null; then
    echo -e "${GREEN}✅ Production is up and running!${NC}"
else
    echo -e "${RED}❌ Warning: Health check failed. Please check PM2 logs immediately!${NC}"
    echo -e "${YELLOW}Run: ssh ${SSH_USER}@${SSH_HOST} 'pm2 logs reginor-prod'${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Production deployment complete!${NC}"
echo -e "${YELLOW}📝 View logs: ssh ${SSH_USER}@${SSH_HOST} 'pm2 logs reginor-prod'${NC}"
