#!/bin/bash

# Debug script for deployment issues
# Usage: ./debug-deployment.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 BRHG Deployment Debug Script${NC}"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "ecosystem.config.cjs" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ In project root directory${NC}"

# Check PM2 status
echo -e "\n${BLUE}📊 PM2 Status:${NC}"
pm2 status

# Check if backend is running
echo -e "\n${BLUE}🔌 Backend Health Check:${NC}"
if curl -s http://localhost:5001/api/system/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi

# Check nginx status
echo -e "\n${BLUE}🌐 Nginx Status:${NC}"
sudo systemctl status nginx --no-pager

# Check nginx configuration
echo -e "\n${BLUE}🔧 Nginx Configuration Test:${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
fi

# Check if build directory exists
echo -e "\n${BLUE}📁 Build Directory Check:${NC}"
BUILD_DIR="/home/admin/brhg-portal/mayday/mayday-client-dashboard/build"
if [ -d "$BUILD_DIR" ]; then
    echo -e "${GREEN}✅ Build directory exists${NC}"
    echo "Contents:"
    ls -la "$BUILD_DIR"
    
    if [ -f "$BUILD_DIR/index.html" ]; then
        echo -e "${GREEN}✅ index.html exists${NC}"
        echo "File size: $(du -h $BUILD_DIR/index.html | cut -f1)"
    else
        echo -e "${RED}❌ index.html not found${NC}"
    fi
else
    echo -e "${RED}❌ Build directory not found${NC}"
fi

# Check nginx error logs
echo -e "\n${BLUE}📋 Recent Nginx Error Logs:${NC}"
sudo tail -n 20 /var/log/nginx/error.log

# Check nginx access logs
echo -e "\n${BLUE}📋 Recent Nginx Access Logs:${NC}"
sudo tail -n 10 /var/log/nginx/access.log

# Test local file serving
echo -e "\n${BLUE}🧪 Testing File Serving:${NC}"
if [ -f "$BUILD_DIR/index.html" ]; then
    echo "Testing if nginx can serve the file:"
    if curl -s -I http://localhost/ | head -1 | grep -q "200 OK"; then
        echo -e "${GREEN}✅ Nginx is serving files correctly${NC}"
    else
        echo -e "${RED}❌ Nginx is not serving files correctly${NC}"
        echo "Response:"
        curl -s -I http://localhost/ | head -5
    fi
fi

# Check disk space
echo -e "\n${BLUE}💾 Disk Space:${NC}"
df -h /home/admin/brhg-portal/

# Check memory usage
echo -e "\n${BLUE}🧠 Memory Usage:${NC}"
free -h

echo -e "\n${YELLOW}🔧 Troubleshooting Tips:${NC}"
echo "1. If backend is not responding, check: pm2 logs brhg-callcenter-backend"
echo "2. If nginx has errors, check: sudo nginx -t"
echo "3. If build directory is missing, run: cd mayday/mayday-client-dashboard && npm run build"
echo "4. If files exist but not serving, check nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "5. Check if port 80/443 are accessible: sudo netstat -tlnp | grep :80"
