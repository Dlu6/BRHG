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
# Ensure homepage setting is correct for /callcenter/ path
if ! grep -q '"homepage": "/callcenter/"' package.json; then
    echo -e "${YELLOW}⚠️  Setting homepage to /callcenter/ for proper routing...${NC}"
    # Remove any existing homepage setting
    sed -i '/"homepage":/d' package.json
    # Add the correct homepage setting
    sed -i '/"private": true,/a\  "homepage": "/callcenter/",' package.json
fi

# Clean previous build
echo -e "${BLUE}🧹 Cleaning previous build...${NC}"
rm -rf build

# Build with proper environment
echo -e "${BLUE}🏗️ Building React app...${NC}"
CI=false GENERATE_SOURCEMAP=false NODE_OPTIONS="--max_old_space_size=3072" npm run build

# Verify build was successful
if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
    echo -e "${RED}❌ Build failed - build directory or index.html not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completed successfully${NC}"

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

# Verify build files exist
echo -e "${BLUE}🔍 Verifying build files...${NC}"
if [ -d "/home/admin/brhg-portal/mayday/mayday-client-dashboard/build" ]; then
    echo -e "${GREEN}✅ Build directory exists${NC}"
    ls -la /home/admin/brhg-portal/mayday/mayday-client-dashboard/build/
else
    echo -e "${RED}❌ Build directory not found${NC}"
fi

# Test nginx configuration
echo -e "${BLUE}🌐 Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Access URLs:${NC}"
echo "• Call Center Dashboard: https://cs.brhgroup.co/callcenter/"
echo "• Call Center API: https://cs.brhgroup.co/mayday-api/api/"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "• Check PM2 status: pm2 status"
echo "• View logs: pm2 logs"
echo "• Restart services: pm2 restart all"
echo "• Check nginx status: sudo systemctl status nginx"
echo "• View nginx logs: sudo tail -f /var/log/nginx/error.log"
