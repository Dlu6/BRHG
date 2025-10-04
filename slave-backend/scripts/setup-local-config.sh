#!/bin/bash

# Local Development Asterisk Configuration Setup
# This script sets up configuration for local development

echo "🔧 Setting up local Asterisk configuration for development..."

# Create local config directory
mkdir -p "$(dirname "$0")/../config/local"

# Copy configuration files to local directory
echo "📋 Copying configuration files to local directory..."

# Copy manager.conf
cp "$(dirname "$0")/../config/asterisk/manager.conf" "$(dirname "$0")/../config/local/manager.conf"
echo "✅ manager.conf copied to local config"

# Copy odbc.ini
cp "$(dirname "$0")/../config/asterisk/odbc.ini" "$(dirname "$0")/../config/local/odbc.ini"
echo "✅ odbc.ini copied to local config"

# Create a local environment file for development
echo "📝 Creating local development environment file..."
cat > "$(dirname "$0")/../.env.local" << EOF
# Local Development Environment
# Copy this to .env for local development

# Database Configuration
# Note: For local development, we connect to production database
# In production (ecosystem.config.js), the asterisk database uses root user
DB_HOST=cs.hugamara.com
DB_NAME=asterisk
DB_USER=hugamara_user
DB_PASSWORD=Pasword@256
DB_PORT=3306

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Server Configuration
BACKEND_PORT=8004
NODE_ENV=development

# AMI Configuration
AMI_HOST=localhost
AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
AMI_PASSWORD=admin123

# Security
JWT_SECRET=dev_jwt_secret_key_for_local_development_only
SESSION_SECRET=dev_session_secret_for_local_development_only

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

# Default Admin User
DEFAULT_UI_USERNAME=admin
DEFAULT_UI_USER_PASSWORD=Pasword@256
DEFAULT_UI_USER_FULLNAME=System Administrator
DEFAULT_UI_USER_ROLE=admin

# Master Server (disabled for local development)
MASTER_SERVER_URL=http://localhost:8001
INTERNAL_API_KEY=dev_internal_key
MASTER_WEBSOCKET_URL=ws://localhost:8001

# License Configuration
LICENSE_CACHE_TTL=1800000
BACKGROUND_SYNC_INTERVAL=900000

# Session Management
SESSION_CLEANUP_INTERVAL=900000
SESSION_TTL=86400

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/slave-backend.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Lipachat Configuration
LIPACHAT_API_KEY=dev_lipachat_key
LIPACHAT_PHONE_NUMBER=+1234567890
EOF

echo "✅ Local environment file created: .env.local"
echo ""
echo "📋 Configuration Summary:"
echo "   - Manager interface: localhost:5038"
echo "   - AMI Username: admin"
echo "   - AMI Password: admin123"
echo "   - ODBC DSN: asterisk"
echo "   - Database: cs.hugamara.com:3306/asterisk"
echo ""
echo "🔍 Next Steps:"
echo "   1. Copy .env.local to .env: cp .env.local .env"
echo "   2. Install ODBC MariaDB driver: brew install unixodbc mariadb-connector-odbc"
echo "   3. Copy config files to system locations (requires sudo):"
echo "      - sudo cp config/local/manager.conf /etc/asterisk/manager.conf"
echo "      - sudo cp config/local/odbc.ini /etc/odbc.ini"
echo "   4. Restart Asterisk: sudo systemctl restart asterisk"
echo ""
echo "🎉 Local configuration setup complete!"
