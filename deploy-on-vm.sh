#!/bin/bash

# Simple deployment script to run on the VM
# Usage: ./deploy-on-vm.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting BRHG deployment on VM...${NC}"

# Configuration
PROJECT_DIR="/home/admin/brhg-portal"
BRANCH="bhr_development"

# Navigate to project directory
cd ${PROJECT_DIR}

# Update git repository
echo -e "${BLUE}📥 Updating git repository...${NC}"
git fetch origin
git checkout ${BRANCH}
git pull origin ${BRANCH}

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install call center backend dependencies
cd mayday/slave-backend
npm install --production --no-audit --no-fund

# Install call center frontend dependencies
cd ../mayday-client-dashboard
npm install --no-audit --no-fund

# Build frontend
echo -e "${BLUE}🏗️ Building frontend...${NC}"
# Remove homepage setting to build for root path
if grep -q '"homepage":' package.json; then
    echo -e "${YELLOW}⚠️  Removing homepage setting for root path serving...${NC}"
    sed -i '/"homepage":/d' package.json
fi
CI=false GENERATE_SOURCEMAP=false NODE_OPTIONS="--max_old_space_size=3072" npm run build

# Go back to project root
cd ../..

# Update nginx configuration
echo -e "${BLUE}🌐 Updating nginx configuration...${NC}"
if [ -f "brhg-hugamara.conf" ]; then
    sudo cp brhg-hugamara.conf /etc/nginx/sites-available/mayday
    sudo ln -sf /etc/nginx/sites-available/mayday /etc/nginx/sites-enabled/mayday
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx configuration updated and reloaded${NC}"
    else
        echo -e "${RED}❌ Nginx configuration test failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  nginx configuration file not found${NC}"
fi

# Create logs directory
mkdir -p logs

# Restart PM2 services
echo -e "${BLUE}🔄 Restarting PM2 services...${NC}"
if pm2 describe brhg-callcenter-backend >/dev/null 2>&1; then
    pm2 restart brhg-callcenter-backend
else
    pm2 start ecosystem.config.cjs --only brhg-callcenter-backend
fi

pm2 save

# Check status
echo -e "${BLUE}📊 Checking service status...${NC}"
pm2 status

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Access URLs:${NC}"
echo "• Call Center Dashboard: https://cs.backspace.ug/"
echo "• Call Center API: https://cs.backspace.ug/mayday-api/api/"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "• Check PM2 status: pm2 status"
echo "• View logs: pm2 logs"
echo "• Restart services: pm2 restart all"
