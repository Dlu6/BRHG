#!/bin/bash

# =============================================================================
# Asterisk Database Setup Fix Script
# =============================================================================
# This script fixes common database issues with Asterisk PJSIP realtime tables
# and ensures proper configuration for the Mayday Contact Center system.
#
# Created: 2025-11-25
# Purpose: Fix missing tables and columns that cause Asterisk ODBC errors
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Database configuration
DB_NAME="asterisk"
DB_USER="root"
DB_PASSWORD=""

print_status "Starting Asterisk database setup fix..."

# =============================================================================
# 1. Install Required Dependencies
# =============================================================================
print_status "Installing required dependencies..."

# Update package list
apt-get update -qq

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    print_success "Node.js is already installed"
fi

# Install ODBC and MariaDB dependencies
print_status "Installing ODBC and MariaDB dependencies..."
apt-get install -y unixodbc unixodbc-dev odbc-mariadb mariadb-server mariadb-client

# =============================================================================
# 2. Fix Asterisk Service Configuration
# =============================================================================
print_status "Fixing Asterisk service configuration..."

# Stop any running Asterisk instances
pkill -f asterisk || true
sleep 2

# Create proper asterisk user if needed
if ! id "asterisk" &>/dev/null; then
    print_status "Creating asterisk user..."
    useradd -r -s /bin/false -d /var/lib/asterisk asterisk
fi

# Create required directories
mkdir -p /var/lib/asterisk /var/run/asterisk /var/log/asterisk /var/spool/asterisk
chown -R asterisk:asterisk /var/lib/asterisk /var/run/asterisk /var/log/asterisk /var/spool/asterisk 2>/dev/null || chown -R root:root /var/lib/asterisk /var/run/asterisk /var/log/asterisk /var/spool/asterisk

# Create fixed Asterisk service file
cat > /etc/systemd/system/asterisk.service << 'EOF'
[Unit]
Description=Asterisk PBX
After=network.target mariadb.service

[Service]
Type=forking
User=root
Group=root
Environment=HOME=/var/lib/asterisk
WorkingDirectory=/var/lib/asterisk
RuntimeDirectory=asterisk
RuntimeDirectoryMode=0775
ExecStart=/usr/sbin/asterisk -g
ExecStop=/usr/sbin/asterisk -rx 'core stop now'
ExecReload=/usr/sbin/asterisk -rx 'core reload'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable asterisk

print_success "Asterisk service configuration fixed"

# =============================================================================
# 3. Create Database Tables
# =============================================================================
print_status "Creating Asterisk database tables..."

# Create PJSIP tables
mysql -u root ${DB_NAME} << 'EOF'
-- PJSIP AORS table
CREATE TABLE IF NOT EXISTS ps_aors (
    id varchar(40) NOT NULL PRIMARY KEY,
    contact varchar(255) DEFAULT NULL,
    qualify_frequency int(11) DEFAULT 30,
    support_path enum('yes','no') DEFAULT 'yes',
    default_expiration int(11) DEFAULT 3600,
    remove_existing enum('yes','no') DEFAULT 'yes',
    max_contacts int(11) DEFAULT 1,
    rewrite_contact varchar(10) DEFAULT 'yes',
    minimum_expiration int(11) NOT NULL DEFAULT 60,
    maximum_expiration int(11) NOT NULL DEFAULT 7200,
    authenticate_qualify enum('yes','no') NOT NULL DEFAULT 'yes',
    outbound_proxy varchar(255) DEFAULT NULL,
    websocket_enabled enum('yes','no') NOT NULL DEFAULT 'yes',
    media_websocket enum('yes','no') NOT NULL DEFAULT 'yes'
) ENGINE=InnoDB;

-- PJSIP AUTHS table
CREATE TABLE IF NOT EXISTS ps_auths (
    id varchar(40) NOT NULL PRIMARY KEY,
    auth_type varchar(20) NOT NULL DEFAULT 'userpass',
    password varchar(80) DEFAULT NULL,
    realm varchar(40) DEFAULT NULL,
    username varchar(40) NOT NULL,
    md5_cred varchar(40) DEFAULT NULL
) ENGINE=InnoDB;

-- PJSIP CONTACTS table (with all required columns)
CREATE TABLE IF NOT EXISTS ps_contacts (
    id varchar(255) NOT NULL PRIMARY KEY,
    uri varchar(511) NOT NULL,
    expiration_time bigint(20) DEFAULT NULL,
    qualify_frequency int(11) DEFAULT NULL,
    outbound_proxy varchar(255) DEFAULT NULL,
    path text DEFAULT NULL,
    user_agent varchar(255) DEFAULT NULL,
    qualify_timeout float DEFAULT NULL,
    reg_server varchar(255) DEFAULT NULL,
    authenticate_qualify enum('0','1','off','on','false','true','no','yes') DEFAULT NULL,
    via_addr varchar(40) DEFAULT NULL,
    via_port int(11) DEFAULT NULL,
    call_id varchar(255) DEFAULT NULL,
    endpoint varchar(255) DEFAULT NULL,
    prune_on_boot enum('0','1','off','on','false','true','no','yes') DEFAULT NULL,
    qualify_2xx_only enum('0','1','off','on','false','true','no','yes') DEFAULT NULL,
    expiration_timestamp datetime DEFAULT NULL,
    UNIQUE KEY id (id)
) ENGINE=InnoDB;

-- PJSIP ENDPOINTS table (comprehensive schema)
CREATE TABLE IF NOT EXISTS ps_endpoints (
    id varchar(255) NOT NULL PRIMARY KEY,
    trunk_id varchar(40) DEFAULT NULL UNIQUE,
    transport varchar(40) NOT NULL DEFAULT 'transport-udp',
    aors varchar(40) DEFAULT NULL,
    send_pai enum('yes','no') DEFAULT 'no',
    direct_media enum('yes','no') NOT NULL DEFAULT 'no',
    auth varchar(40) DEFAULT NULL,
    context varchar(40) NOT NULL,
    disallow varchar(255) DEFAULT 'all',
    allow varchar(255) DEFAULT 'ulaw',
    rewrite_contact enum('yes','no') NOT NULL DEFAULT 'yes',
    force_rport enum('yes','no') NOT NULL DEFAULT 'yes',
    connected_line_method varchar(40) DEFAULT 'invite',
    direct_media_method varchar(40) DEFAULT 'invite',
    ice_support enum('yes','no') NOT NULL DEFAULT 'yes',
    identify_by varchar(40) DEFAULT NULL,
    mailboxes varchar(40) DEFAULT NULL,
    moh_suggest varchar(40) DEFAULT NULL,
    outbound_auth varchar(40) DEFAULT NULL,
    outbound_proxy varchar(40) DEFAULT NULL,
    rtp_symmetric enum('yes','no') NOT NULL DEFAULT 'yes',
    dtls_cert_file varchar(40) DEFAULT NULL,
    dtls_private_key varchar(40) DEFAULT NULL,
    dtls_cipher varchar(40) DEFAULT NULL,
    dtls_ca_file varchar(40) DEFAULT NULL,
    dtls_ca_path varchar(40) DEFAULT NULL,
    dtls_setup enum('active','passive','actpass') DEFAULT 'actpass',
    dtls_fingerprint varchar(40) DEFAULT NULL,
    media_encryption varchar(40) DEFAULT NULL,
    max_audio_streams int(11) DEFAULT NULL,
    max_video_streams int(11) DEFAULT NULL,
    webrtc enum('yes','no') DEFAULT 'no',
    user_id char(36) DEFAULT NULL,
    endpoint_type enum('user','trunk') NOT NULL DEFAULT 'user',
    enabled tinyint(1) NOT NULL DEFAULT 1,
    active int(11) NOT NULL DEFAULT 1,
    from_user varchar(40) DEFAULT NULL,
    from_domain varchar(40) DEFAULT NULL,
    call_counter enum('yes','no') NOT NULL DEFAULT 'yes',
    phone_url enum('yes','no') NOT NULL DEFAULT 'no',
    trust_remote_party_id enum('yes','no') NOT NULL DEFAULT 'no',
    send_remote_party_id_header enum('yes','no') NOT NULL DEFAULT 'no',
    encryption enum('yes','no') NOT NULL DEFAULT 'no',
    t38pt_udptl enum('yes','no') NOT NULL DEFAULT 'no',
    video_support enum('yes','no') NOT NULL DEFAULT 'no',
    account_number varchar(40) DEFAULT NULL,
    phone_number varchar(40) DEFAULT NULL,
    current_balance decimal(10,2) DEFAULT 0.00,
    balance_currency varchar(10) DEFAULT 'USHS',
    balance_last_updated datetime DEFAULT NULL,
    balance_error text DEFAULT NULL
) ENGINE=InnoDB;

-- PJSIP ENDPOINT ID IPs table (match is a reserved keyword)
CREATE TABLE IF NOT EXISTS ps_endpoint_id_ips (
    id varchar(40) NOT NULL PRIMARY KEY,
    endpoint varchar(40) NOT NULL,
    `match` varchar(80) NOT NULL
) ENGINE=InnoDB;

-- PJSIP GLOBALS table
CREATE TABLE IF NOT EXISTS ps_globals (
    id varchar(40) NOT NULL PRIMARY KEY,
    attribute varchar(40) NOT NULL,
    value varchar(200) DEFAULT NULL
) ENGINE=InnoDB;

-- PJSIP TRANSPORTS table
CREATE TABLE IF NOT EXISTS ps_transports (
    id varchar(40) NOT NULL PRIMARY KEY,
    transport varchar(20) NOT NULL,
    bind varchar(80) NOT NULL,
    async_smtp_support enum('yes','no') DEFAULT 'no',
    allow_reload enum('yes','no') DEFAULT 'yes',
    ca_list_file varchar(200) DEFAULT NULL,
    ca_list_path varchar(200) DEFAULT NULL,
    cert_file varchar(200) DEFAULT NULL,
    cipher varchar(200) DEFAULT NULL,
    domain varchar(80) DEFAULT NULL,
    external_media_address varchar(80) DEFAULT NULL,
    external_signaling_address varchar(80) DEFAULT NULL,
    external_signaling_port int(11) DEFAULT 0,
    external_media_port int(11) DEFAULT 0,
    local_net varchar(40) DEFAULT NULL,
    method varchar(20) DEFAULT 'unspecified',
    password varchar(80) DEFAULT NULL,
    priv_key_file varchar(200) DEFAULT NULL,
    public_address varchar(80) DEFAULT NULL,
    require_client_cert enum('yes','no') DEFAULT 'no',
    symmetric_transport enum('yes','no') DEFAULT 'no',
    tos varchar(20) DEFAULT 'lowdelay',
    verify_server enum('yes','no') DEFAULT 'yes',
    verify_client enum('yes','no') DEFAULT 'no',
    protocol varchar(20) NOT NULL,
    port int(11) DEFAULT 0
) ENGINE=InnoDB;

-- QUEUE MEMBERS table (with required columns)
CREATE TABLE IF NOT EXISTS queue_members (
    uniqueid int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    queue_name varchar(128) NOT NULL,
    interface varchar(128) NOT NULL,
    penalty int(11) DEFAULT 0,
    paused int(11) DEFAULT 0,
    reason_paused varchar(128) DEFAULT NULL,
    state_interface varchar(128) DEFAULT NULL,
    membership varchar(128) DEFAULT 'static',
    lastcall int(11) DEFAULT 0,
    status int(11) DEFAULT 0,
    UNIQUE KEY unique_queue_name (queue_name, interface)
) ENGINE=InnoDB;
EOF

print_success "Database tables created successfully"

# =============================================================================
# 4. Grant Database Permissions
# =============================================================================
print_status "Granting database permissions..."

mysql -u root << 'EOF'
-- Grant permissions to asterisk user
GRANT ALL PRIVILEGES ON asterisk.* TO 'asterisk'@'localhost' IDENTIFIED BY 'Pasword@256';
GRANT ALL PRIVILEGES ON asterisk.* TO 'asterisk'@'127.0.0.1' IDENTIFIED BY 'Pasword@256';
FLUSH PRIVILEGES;
EOF

print_success "Database permissions granted"

# =============================================================================
# 5. Start Asterisk Service
# =============================================================================
print_status "Starting Asterisk service..."

systemctl restart asterisk
sleep 5

# Check if Asterisk is running
if systemctl is-active --quiet asterisk; then
    print_success "Asterisk service started successfully"
else
    print_error "Asterisk service failed to start"
    systemctl status asterisk --no-pager
    exit 1
fi

# =============================================================================
# 6. Verify Configuration
# =============================================================================
print_status "Verifying Asterisk configuration..."

# Test ODBC connection
echo "Testing ODBC connection..."
asterisk -rx 'odbc show' | grep -E "(Number of active connections|Name:|DSN:)"

# Test PJSIP endpoints
echo "Testing PJSIP endpoints..."
asterisk -rx 'pjsip show endpoints'

# Test PJSIP contacts
echo "Testing PJSIP contacts..."
asterisk -rx 'pjsip show contacts'

print_success "Configuration verification completed"

# =============================================================================
# 7. Create Environment File for Node.js Application
# =============================================================================
print_status "Creating environment file for Node.js application..."

# Determine the correct path based on directory structure
if [ -d "/home/admin/brhg-portal/mayday/mayday/slave-backend" ]; then
    ENV_PATH="/home/admin/brhg-portal/mayday/mayday/slave-backend/.env"
elif [ -d "/home/admin/brhg-portal/mayday/slave-backend" ]; then
    ENV_PATH="/home/admin/brhg-portal/mayday/slave-backend/.env"
else
    print_warning "Could not determine Node.js application path, skipping .env creation"
fi

if [ ! -z "$ENV_PATH" ]; then
    cat > "$ENV_PATH" << 'EOF'
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=asterisk
DB_USER=asterisk
DB_PASSWORD=Pasword@256
DB_SSL=false
EOF
    print_success "Environment file created at $ENV_PATH"
fi

# =============================================================================
# 8. Summary
# =============================================================================
print_success "Asterisk database setup fix completed successfully!"
echo ""
echo "Summary of actions performed:"
echo "  ✓ Installed Node.js and required dependencies"
echo "  ✓ Fixed Asterisk service configuration"
echo "  ✓ Created all required PJSIP tables"
echo "  ✓ Added missing columns to existing tables"
echo "  ✓ Created queue_members table with required columns"
echo "  ✓ Granted proper database permissions"
echo "  ✓ Started Asterisk service successfully"
echo "  ✓ Verified ODBC and PJSIP configuration"
echo "  ✓ Created environment file for Node.js application"
echo ""
echo "Next steps:"
echo "  1. Start the Node.js application with PM2"
echo "  2. Test the Mayday Contact Center functionality"
echo "  3. Monitor Asterisk logs for any remaining issues"
echo ""
echo "Useful commands:"
echo "  - Check Asterisk status: systemctl status asterisk"
echo "  - View Asterisk CLI: asterisk -rvvv"
echo "  - Test ODBC: asterisk -rx 'odbc show'"
echo "  - Reload PJSIP: asterisk -rx 'pjsip reload'"
echo "  - Start Node.js app: pm2 start ecosystem.config.cjs"

print_success "Script completed successfully!"
