#!/bin/bash

# Build script for serving React app from root path
# This removes the homepage setting and builds the app

set -e

echo "🔧 Building React app for root path serving..."

# Check if package.json has homepage setting
if grep -q '"homepage":' package.json; then
    echo "⚠️  Removing homepage setting for root path serving..."
    sed -i '/"homepage":/d' package.json
    echo "✅ Homepage setting removed"
else
    echo "✅ No homepage setting found - already configured for root path"
fi

# Build the app
echo "🏗️ Building React app..."
CI=false GENERATE_SOURCEMAP=false npm run build

echo "✅ Build completed! App is ready to be served from root path."
echo "📁 Build files are in: ./build/"