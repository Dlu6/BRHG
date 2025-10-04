#!/bin/bash

# Setup Asterisk Configuration Script
# This script copies the configuration files to the appropriate locations

echo "🔧 Setting up Asterisk configuration files..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

# Create backup of existing files
echo "📦 Creating backups of existing configuration files..."

if [ -f "/etc/asterisk/manager.conf" ]; then
    cp /etc/asterisk/manager.conf /etc/asterisk/manager.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up existing manager.conf"
fi

if [ -f "/etc/odbc.ini" ]; then
    cp /etc/odbc.ini /etc/odbc.ini.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up existing odbc.ini"
fi

# Copy manager.conf
echo "📋 Copying manager.conf..."
cp "$(dirname "$0")/../config/asterisk/manager.conf" /etc/asterisk/manager.conf
chown asterisk:asterisk /etc/asterisk/manager.conf
chmod 640 /etc/asterisk/manager.conf
echo "✅ manager.conf copied and permissions set"

# Copy odbc.ini
echo "📋 Copying odbc.ini..."
cp "$(dirname "$0")/../config/asterisk/odbc.ini" /etc/odbc.ini
chmod 644 /etc/odbc.ini
echo "✅ odbc.ini copied and permissions set"

# Install ODBC MariaDB driver if not present
echo "🔧 Checking for ODBC MariaDB driver..."
if ! odbcinst -q -d | grep -q "MariaDB"; then
    echo "📦 Installing ODBC MariaDB driver..."
    apt-get update
    apt-get install -y odbc-mariadb
    echo "✅ ODBC MariaDB driver installed"
else
    echo "✅ ODBC MariaDB driver already installed"
fi

# Test ODBC connection
echo "🧪 Testing ODBC connection..."
if isql -v "asterisk" -b; then
    echo "✅ ODBC connection test successful"
else
    echo "❌ ODBC connection test failed"
    echo "💡 Please check your database credentials and network connectivity"
fi

# Restart Asterisk service
echo "🔄 Restarting Asterisk service..."
systemctl restart asterisk
sleep 3

# Check Asterisk status
if systemctl is-active --quiet asterisk; then
    echo "✅ Asterisk service is running"
else
    echo "❌ Asterisk service failed to start"
    echo "💡 Check Asterisk logs: journalctl -u asterisk -f"
fi

echo "🎉 Asterisk configuration setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   - Manager interface: 0.0.0.0:5038"
echo "   - AMI Username: admin"
echo "   - AMI Password: admin123"
echo "   - ODBC DSN: asterisk"
echo "   - Database: cs.hugamara.com:3306/asterisk"
echo ""
echo "🔍 To verify configuration:"
echo "   - Check Asterisk logs: journalctl -u asterisk -f"
echo "   - Test AMI connection: telnet localhost 5038"
echo "   - Test ODBC: isql -v asterisk"
