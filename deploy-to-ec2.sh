#!/bin/bash

# BRHG EC2 Deployment Script
# This script sets up the complete deployment environment on EC2

set -e

echo "🚀 Starting BRHG deployment on EC2..."

# Configurable variables
PROJECT_DIR=/home/admin/brhg-portal
DOMAIN=cs.backspace.ug
DB_ROOT_PASSWORD="Pasword@256"
DB_APP_PASSWORD="Pasword@256"
DB_NAME="asterisk"
DB_USER="root"

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install MariaDB
echo "📦 Installing MariaDB..."
apt install -y mariadb-server mariadb-client

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Install Certbot for SSL
echo "📦 Installing Certbot..."
apt install -y certbot

# Start and enable services
echo "🔄 Starting and enabling services..."
systemctl start nginx
systemctl enable nginx
systemctl start mariadb
systemctl enable mariadb

# Secure MariaDB installation
echo "🔒 Securing MariaDB..."
mysql_secure_installation <<EOF

y
${DB_ROOT_PASSWORD}
${DB_ROOT_PASSWORD}
y
y
y
y
EOF

# Create database and user
echo "🗄️ Setting up database..."
mysql -u root -p"${DB_ROOT_PASSWORD}" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_APP_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p /home/admin/logs

# Clone the repository
echo "📥 Ensuring project directory exists..."
cd /home/admin
if [ -d "${PROJECT_DIR}" ]; then
  echo "ℹ️ Project directory ${PROJECT_DIR} already exists. Updating from git..."
  cd ${PROJECT_DIR}
  git fetch origin
  git checkout bhr_development
  git pull origin bhr_development
else
  echo "❗ PROJECT_DIR ${PROJECT_DIR} not found. Please clone your repo into this path with the development branch."
  echo "   Example: git clone https://github.com/Dlu6/BRHG.git ${PROJECT_DIR} && cd ${PROJECT_DIR} && git checkout bhr_development"
  exit 1
fi

# Install dependencies
echo "📦 Installing call center backend dependencies..."
cd ${PROJECT_DIR}/mayday/slave-backend
npm install --production

echo "📦 Installing provisioning backend dependencies..."
cd ${PROJECT_DIR}/mayday/provisioning_backend
npm install --production

echo "📦 Installing call center frontend dependencies..."
cd ${PROJECT_DIR}/mayday/mayday-client-dashboard
npm install

# Build call center frontend
echo "🏗️ Building call center frontend..."
npm run build

############### SSL + Nginx setup ###############
# Obtain SSL certificate first (standalone), then enable SSL in nginx
echo "🔒 Obtaining SSL certificate (standalone)..."
systemctl stop nginx
certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos --email medhi.matovu@gmail.com || true
systemctl start nginx

# Configure nginx site with SSL
echo "🌐 Setting up Nginx configuration..."
cp ${PROJECT_DIR}/brhg-hugamara.conf /etc/nginx/sites-available/mayday
ln -sf /etc/nginx/sites-available/mayday /etc/nginx/sites-enabled/mayday
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Run production database migrations
echo "🗄️ Running production database migrations..."

# Create call center specific tables
echo "📋 Creating call center tables..."
mysql -u root -p"${DB_ROOT_PASSWORD}" ${DB_NAME} << 'EOF'
-- Create basic call center tables if they don't exist
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin','supervisor','agent') DEFAULT 'agent',
  `is_active` BOOLEAN DEFAULT true,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `license_key` VARCHAR(255) NOT NULL UNIQUE,
  `license_type` ENUM('trial','basic','professional','enterprise') DEFAULT 'trial',
  `max_agents` INT DEFAULT 1,
  `max_concurrent_calls` INT DEFAULT 10,
  `features` JSON,
  `is_active` BOOLEAN DEFAULT true,
  `expires_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Verify tables exist
SHOW TABLES;
EOF

echo "✅ Database migrations completed successfully!"

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ${PROJECT_DIR}/ecosystem.config.cjs --update-env
pm2 save
pm2 startup

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is now available at: https://${DOMAIN}"
echo "📊 Check PM2 status with: pm2 status"
echo "📋 Check logs with: pm2 logs"
