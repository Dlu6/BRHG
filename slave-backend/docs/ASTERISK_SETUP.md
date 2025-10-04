# Asterisk Configuration Setup Guide

This guide explains how to configure Asterisk manager.conf and ODBC for the Mayday Contact Center system.

## Overview

The Mayday system requires:

1. **Asterisk Manager Interface (AMI)** - for real-time call control
2. **ODBC Database Connection** - for call detail records and data storage
3. **Proper user permissions** - for AMI access

## Configuration Files

### 1. Manager Configuration (`/etc/asterisk/manager.conf`)

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = admin123
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
permit = 192.168.0.0/255.255.0.0
permit = 10.0.0.0/255.0.0.0
permit = 172.16.0.0/255.240.0.0
read = system,call,log,verbose,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,agent,user,config,command,reporting,originate
```

### 2. ODBC Configuration (`/etc/odbc.ini`)

```ini
[general]

[asterisk]
Description = Asterisk Database Connection
Driver = MariaDB
Server = cs.hugamara.com
Port = 3306
Database = asterisk
User = asterisk
Password = Pasword@256
# Note: In production, the asterisk database is accessed using the asterisk user
# The hugamara_user is used for the hugamara_db database only
Option = 3
```

## Installation Steps

### On EC2 Server (Production)

1. **Install ODBC MariaDB Driver**

   ```bash
   sudo apt-get update
   sudo apt-get install -y unixodbc unixodbc-dev odbc-mariadb mariadb-server mariadb-client
   ```

2. **Copy Configuration Files**

   ```bash
   # Copy manager.conf
   sudo cp /path/to/mayday/slave-backend/config/asterisk/manager.conf /etc/asterisk/manager.conf
   sudo chown asterisk:asterisk /etc/asterisk/manager.conf
   sudo chmod 640 /etc/asterisk/manager.conf

   # Copy odbc.ini
   sudo cp /path/to/mayday/slave-backend/config/asterisk/odbc.ini /etc/odbc.ini
   sudo chmod 644 /etc/odbc.ini
   ```

3. **Test ODBC Connection**

   ```bash
   isql -v "asterisk"
   ```

4. **Restart Asterisk**
   ```bash
   sudo systemctl restart asterisk
   sudo systemctl status asterisk
   ```

### On Local Development Machine (macOS)

1. **Install ODBC MariaDB Driver**

   ```bash
   brew install unixodbc mariadb-connector-odbc
   ```

2. **Copy Configuration Files**

   ```bash
   # Copy manager.conf (requires sudo)
   sudo cp /path/to/mayday/slave-backend/config/local/manager.conf /etc/asterisk/manager.conf
   sudo chown root:wheel /etc/asterisk/manager.conf
   sudo chmod 640 /etc/asterisk/manager.conf

   # Copy odbc.ini
   sudo cp /path/to/mayday/slave-backend/config/local/odbc.ini /etc/odbc.ini
   sudo chmod 644 /etc/odbc.ini
   ```

3. **Test ODBC Connection**
   ```bash
   isql -v "asterisk"
   ```

## Environment Variables

The following environment variables must be set in your `.env` file:

```bash
# AMI Configuration
AMI_HOST=localhost
AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
AMI_PASSWORD=admin123

# Database Configuration
DB_HOST=cs.hugamara.com
DB_NAME=asterisk
DB_USER=hugamara_user
DB_PASSWORD=Pasword@256
DB_PORT=3306

# Security
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
```

## Provider IP Identify Mapping (PJSIP Realtime)

When your SIP provider sends OPTIONS/INVITE from specific public IPs, Asterisk must map those source IPs to a trunk endpoint. We use realtime table `ps_endpoint_id_ips` to create an identify that matches the provider IPs.

### Add/Update identify rows (example)

Run inside MySQL on the VM (asterisk DB):

```sql
-- Map provider IP 41.77.78.155 to endpoint Hugamara_Trunk
INSERT INTO ps_endpoint_id_ips (id, endpoint, `match`, srv_lookups, match_request_uri)
VALUES ('provider-41.77.78.155', 'Hugamara_Trunk', '41.77.78.155/32', 'no', 'no')
ON DUPLICATE KEY UPDATE `match`=VALUES(`match`);
```

Repeat per provider IP/CIDR. Example for a /29 block:

```sql
INSERT INTO ps_endpoint_id_ips (id, endpoint, `match`, srv_lookups, match_request_uri)
VALUES ('provider-203.0.113.8-29', 'Hugamara_Trunk', '203.0.113.8/29', 'no', 'no')
ON DUPLICATE KEY UPDATE `match`=VALUES(`match`);
```

### Verify mappings and identifier order

```sql
SELECT * FROM ps_endpoint_id_ips \G;
SELECT * FROM ps_globals \G; -- expect endpoint_identifier_order to include ip
```

Recommended `endpoint_identifier_order` (set in `ps_globals` where `id='global'`):

```text
ip,username,auth_username,anonymous
```

Reload PJSIP after changes:

```bash
sudo asterisk -rx "pjsip reload"
```

This prevents "No matching endpoint found" notices for legitimate provider OPTIONS/INVITEs coming from known IPs.

### Ensure realtime identify is enabled in config (recommended)

To avoid future drift and make identifies fully managed via the database, confirm these are enabled on the VM:

1. `/etc/asterisk/extconfig.conf`

```
[settings]
ps_endpoints => odbc,asterisk,ps_endpoints
ps_auths => odbc,asterisk,ps_auths
ps_aors => odbc,asterisk,ps_aors
ps_contacts => odbc,asterisk,ps_contacts
ps_endpoint_id_ips => odbc,asterisk,ps_endpoint_id_ips   ; UNCOMMENT/ADD THIS
```

2. `/etc/asterisk/sorcery.conf`

```
[res_pjsip]
endpoint=realtime,ps_endpoints
auth=realtime,ps_auths
aor=realtime,ps_aors
contact=realtime,ps_contacts

[res_pjsip_endpoint_identifier_ip]
identify=realtime,ps_endpoint_id_ips   ; UNCOMMENT/ADD THIS
```

3. Reload configuration:

```bash
sudo asterisk -rx "module reload res_config_odbc.so"
sudo asterisk -rx "pjsip reload"
```

With these in place, adding rows to `ps_endpoint_id_ips` (as shown above) immediately activates identify mappings without further file edits.

## Verification

### 1. Test AMI Connection

```bash
telnet localhost 5038
# You should see: "Asterisk Call Manager/X.X"
```

### 2. Test ODBC Connection

```bash
isql -v "asterisk"
# You should see: "Connected!"
```

### 3. Check Asterisk Logs

```bash
# On Linux
sudo journalctl -u asterisk -f

# On macOS
tail -f /var/log/asterisk/full
```

## Troubleshooting

### Common Issues

1. **AMI Connection Failed**

   - Check if Asterisk is running: `systemctl status asterisk`
   - Verify manager.conf syntax: `asterisk -T -c`
   - Check firewall settings: `ufw status`

2. **ODBC Connection Failed**

   - Verify database credentials
   - Check network connectivity to database server
   - Ensure ODBC driver is installed: `odbcinst -q -d`

3. **Permission Denied**
   - Check file ownership: `ls -la /etc/asterisk/manager.conf`
   - Verify asterisk user exists: `id asterisk`

### Debug Commands

```bash
# Check Asterisk configuration
asterisk -T -c

# Test ODBC drivers
odbcinst -q -d

# Check ODBC data sources
odbcinst -q -s

# Test specific ODBC connection
isql -v "asterisk" -b
```

## CDR Configuration

### CSV CDR Setup (Recommended)

Asterisk writes CDR records to both CSV files and MySQL database. The CSV files serve as the single source of truth for CDR disposition values.

#### 1. Enable CSV CDR Module

```bash
# On Asterisk server
sudo asterisk -rx "module load cdr_csv.so"
```

#### 2. Configure CDR CSV (`/etc/asterisk/cdr.conf`)

```ini
[general]
enable=yes

[csv]
usegmtime=no    ; Use local time (Africa/Nairobi)
loguniqueid=yes
loguserfield=yes
accountlogs=yes
```

#### 3. Verify CDR Location

Default location: `/var/log/asterisk/cdr-csv/Master.csv`

```bash
# Check CDR file permissions
ls -la /var/log/asterisk/cdr-csv/Master.csv

# View recent CDR entries
tail -n 20 /var/log/asterisk/cdr-csv/Master.csv
```

#### 4. Standard CDR Disposition Values

Asterisk uses these standard disposition values in CSV:

- **ANSWERED**: Call was answered and connected
- **NO ANSWER**: Call was not answered (abandoned in queue)
- **BUSY**: Destination was busy
- **FAILED**: Call failed to complete
- **CONGESTION**: Network congestion

**Important**: The Node.js application must use `"ANSWERED"` (not `"NORMAL"`) to align with Asterisk's standard.

#### 5. CDR Timezone Configuration

Ensure consistent timezone across all components:

```bash
# Check system timezone
timedatectl

# Should show: Time zone: Africa/Nairobi (EAT, +0300)

# Check MySQL timezone
mysql -e "SELECT @@global.time_zone, @@session.time_zone;"

# Should show: SYSTEM, SYSTEM (uses Africa/Nairobi)
```

#### 6. MySQL CDR Table (`/etc/asterisk/cdr_mysql.conf`)

```ini
[global]
hostname=cs.hugamara.com
dbname=asterisk
user=asterisk
password=Pasword@256
port=3306
table=cdr
charset=utf8mb4

; Timezone handling
; Ensure MySQL uses same timezone as system
cdrzone=local
```

### CDR Data Integrity

#### Multiple CDR Records Per Call

Asterisk creates multiple CDR records for queue calls:

1. **Customer call record** (billsec > 0):

   ```
   src: "Maze_Bistro ~ 0700771301"  (external caller)
   lastapp: "Queue"
   disposition: "ANSWERED"
   billsec: 24  ✅ Real customer call
   ```

2. **Internal queue record** (billsec = 0):
   ```
   src: "0323300249"  (queue number)
   lastapp: "Queue"
   disposition: "ANSWERED"
   billsec: 0  ⚠️ System bookkeeping, not a real call
   ```

**Important for Metrics**: Only count records with `billsec > 0` for customer-facing statistics.

#### Verification Queries

```sql
-- Check CDR disposition distribution
SELECT disposition, COUNT(*) as count
FROM cdr
WHERE DATE(start) = CURDATE()
GROUP BY disposition;

-- Verify answered calls (with talk time)
SELECT COUNT(*) as answered_calls
FROM cdr
WHERE DATE(start) = CURDATE()
  AND disposition IN ('ANSWERED', 'NORMAL')
  AND billsec > 0;

-- Find internal queue records
SELECT uniqueid, src, dst, disposition, billsec, lastapp
FROM cdr
WHERE DATE(start) = CURDATE()
  AND disposition = 'ANSWERED'
  AND billsec = 0
LIMIT 10;
```

### Related Documentation

- **[CDR and Metrics Fix](CDR_AND_METRICS_FIX.md)**: Detailed fix documentation for CDR disposition and abandon rate issues
- **[Asterisk CDR Documentation](https://wiki.asterisk.org/wiki/display/AST/CDR+CSV)**: Official Asterisk CDR CSV format

## Security Notes

- Change default passwords in production
- Restrict AMI access to specific IP ranges
- Use strong JWT secrets
- Regularly update Asterisk and ODBC drivers
- Monitor AMI access logs

## Next Steps

After successful configuration:

1. Start the Mayday backend service
2. Verify AMI connection in logs
3. Test call monitoring features
4. Configure additional Asterisk modules as needed
