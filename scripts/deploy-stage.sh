#!/bin/bash

# RegiNor Stage Deployment Script
# Usage: ./deploy-stage.sh

set -e

echo "🚀 Deploying RegiNor Stage..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SSH_HOST="${STAGE_SSH_HOST:-cpanel34.proisp.no}"
SSH_USER="${STAGE_SSH_USER:-dilequac}"
SSH_PORT="${STAGE_SSH_PORT:-22}"
REMOTE_DIR="~/stage.reginor.events"

echo -e "${YELLOW}Connecting to ${SSH_USER}@${SSH_HOST}...${NC}"

# SSH and deploy
ssh -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST} << 'ENDSSH'
    set -e
    
    echo "📂 Navigating to stage directory..."
    cd ~/stage.reginor.events
    
    echo "🔄 Pulling latest code from vscode-dev branch..."
    git fetch origin vscode-dev
    git reset --hard origin/vscode-dev
    
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
    npx dotenv-cli -e .env.stage -- npx prisma migrate deploy
    
    echo "🏗️  Building Next.js application..."
    cd ~/reginor-stage/apps/web
    npm run build
    
    echo "🔄 Restarting PM2 process..."
    pm2 restart reginor-stage
    
    echo "📊 Checking PM2 status..."
    pm2 status reginor-stage
    
    echo "✅ Stage deployment completed!"
ENDSSH

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${YELLOW}🔍 Checking health...${NC}"

# Health check
sleep 5
if curl -f -s https://stage.reginor.events > /dev/null; then
    echo -e "${GREEN}✅ Stage is up and running!${NC}"
else
    echo -e "${RED}❌ Warning: Health check failed. Please check PM2 logs.${NC}"
    echo -e "${YELLOW}Run: ssh ${SSH_USER}@${SSH_HOST} 'pm2 logs reginor-stage'${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Stage deployment complete!${NC}"
echo -e "${YELLOW}📝 View logs: ssh ${SSH_USER}@${SSH_HOST} 'pm2 logs reginor-stage'${NC}"
