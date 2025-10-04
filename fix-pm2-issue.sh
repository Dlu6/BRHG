#!/bin/bash

# Quick fix for PM2 ES module issue
# Run this on the VM to fix the ecosystem config issue

echo "🔧 Fixing PM2 ES module issue..."

# Rename ecosystem config to .cjs
if [ -f "ecosystem.config.js" ]; then
    mv ecosystem.config.js ecosystem.config.cjs
    echo "✅ Renamed ecosystem.config.js to ecosystem.config.cjs"
fi

# Start PM2 with the correct config file
echo "🚀 Starting PM2 services..."
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

echo "✅ PM2 services started successfully!"
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs"
