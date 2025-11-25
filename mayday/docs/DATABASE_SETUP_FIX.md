# Asterisk Database Setup Fix Documentation

## Overview

This document describes the common database setup issues encountered when deploying the Mayday Contact Center system with Asterisk PJSIP realtime configuration, and provides comprehensive solutions.

## Issues Addressed

### 1. Missing PJSIP Tables

**Problem**: Asterisk logs showed errors like:
```
WARNING[xxxx]: res_odbc.c:529 ast_odbc_print_errors: SQL Prepare returned an error: 42S02: Table 'asterisk.ps_aors' doesn't exist
WARNING[xxxx]: res_config_odbc.c:125 custom_prepare: SQL Prepare failed! [SELECT * FROM ps_aors WHERE id LIKE ? ORDER BY id]
```

**Root Cause**: The MariaDB database was missing the essential PJSIP realtime tables that Asterisk expects for SIP endpoint management.

**Solution**: Created the following tables with proper schema:
- `ps_aors` - Address of Record (AOR) configuration
- `ps_auths` - Authentication credentials
- `ps_contacts` - SIP contact registrations
- `ps_endpoints` - SIP endpoint configuration
- `ps_endpoint_id_ips` - IP-based endpoint identification
- `ps_globals` - Global PJSIP settings
- `ps_transports` - Transport layer configuration

### 2. Missing Columns in ps_contacts Table

**Problem**: Asterisk was looking for columns that didn't exist:
```
WARNING[xxxx]: res_odbc.c:529 ast_odbc_print_errors: SQL Prepare returned an error: 42S22: Unknown column 'expiration_time' in 'WHERE'
WARNING[xxxx]: res_config_odbc.c:125 custom_prepare: SQL Prepare failed! [SELECT * FROM ps_contacts WHERE expiration_time <= ? ORDER BY expiration_time]
```

**Root Cause**: The `ps_contacts` table had `expiration_timestamp` but Asterisk was querying for `expiration_time`.

**Solution**: Added missing columns to `ps_contacts` table:
- `expiration_time` (bigint) - Unix timestamp format
- `outbound_proxy` - SIP outbound proxy configuration
- `qualify_timeout` - Qualify timeout in seconds
- `reg_server` - Registration server
- `authenticate_qualify` - Qualify authentication options
- `via_addr` - Via header address
- `via_port` - Via header port
- `qualify_2xx_only` - Qualify response options

### 3. Missing queue_members Table

**Problem**: Queue functionality was broken:
```
WARNING[xxxx]: res_config_odbc.c:1230 require_odbc: Realtime table queue_members@asterisk requires column 'paused', but that column does not exist!
WARNING[xxxx]: res_config_odbc.c:1230 require_odbc: Realtime table queue_members@asterisk requires column 'uniqueid', but that column does not exist!
```

**Root Cause**: The `queue_members` table was completely missing from the database.

**Solution**: Created `queue_members` table with all required columns:
- `uniqueid` - Primary key (auto-increment)
- `queue_name` - Name of the queue
- `interface` - Agent interface (SIP endpoint)
- `paused` - Agent pause status
- `reason_paused` - Reason for pausing
- Other queue management columns

### 4. Asterisk Service Configuration Issues

**Problem**: Asterisk service failed to start with USER error (exit code 217).

**Root Cause**: The systemd service file had syntax errors and user permission issues.

**Solution**: 
- Fixed the systemd service configuration
- Created required directories with proper permissions
- Set Asterisk to run as root temporarily to avoid permission issues
- Ensured proper socket directory creation

## Implementation Details

### Database Schema

#### PJSIP Tables Schema

```sql
-- Core PJSIP tables
ps_aors (id, contact, qualify_frequency, support_path, default_expiration, ...)
ps_auths (id, auth_type, password, realm, username, md5_cred)
ps_contacts (id, uri, expiration_time, outbound_proxy, qualify_timeout, ...)
ps_endpoints (id, transport, aors, auth, context, allow, disallow, ...)
ps_endpoint_id_ips (id, endpoint, match)
ps_globals (id, attribute, value)
ps_transports (id, transport, bind, protocol, port, ...)

-- Queue management
queue_members (uniqueid, queue_name, interface, paused, reason_paused, ...)
```

### ODBC Configuration

The ODBC configuration in `/etc/odbc.ini` and `/etc/asterisk/res_odbc.conf` should reference the correct database:

```ini
[asterisk]
Description = MariaDB Asterisk
Driver = MariaDB Unicode
Server = localhost
Port = 3306
Database = asterisk
User = asterisk
Password = Pasword@256
```

### Environment Variables

For the Node.js application, create `.env` file with:

```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=asterisk
DB_USER=asterisk
DB_PASSWORD=Pasword@256
DB_SSL=false
```

## Automated Fix Script

The `fix-database-setup.sh` script automates all the fixes:

1. **Dependency Installation**: Installs Node.js, ODBC drivers, MariaDB
2. **Service Configuration**: Fixes Asterisk systemd service
3. **Database Setup**: Creates all required tables with proper schema
4. **Permissions**: Grants necessary database permissions
5. **Verification**: Tests ODBC and PJSIP configuration
6. **Environment Setup**: Creates .env file for Node.js app

### Usage

```bash
# Make script executable
chmod +x fix-database-setup.sh

# Run as root/sudo
sudo ./fix-database-setup.sh
```

## Verification Steps

After running the fix script, verify the setup:

### 1. Check Asterisk Service
```bash
systemctl status asterisk
```

### 2. Test ODBC Connection
```bash
asterisk -rx 'odbc show'
```

### 3. Verify PJSIP Tables
```bash
asterisk -rx 'pjsip show endpoints'
asterisk -rx 'pjsip show contacts'
```

### 4. Check Database Tables
```bash
mysql -u root asterisk -e 'SHOW TABLES LIKE "ps_%";'
```

### 5. Start Node.js Application
```bash
cd /home/admin/brhg-portal
pm2 start ecosystem.config.cjs
```

## Common Troubleshooting

### Asterisk Service Fails to Start
- Check systemd service file syntax: `systemctl daemon-reload`
- Verify user permissions: `id asterisk`
- Check logs: `journalctl -xeu asterisk.service`

### ODBC Connection Errors
- Verify MariaDB is running: `systemctl status mariadb`
- Test ODBC manually: `isql -v asterisk`
- Check ODBC configuration: `/etc/odbc.ini`

### Missing Table Errors
- Verify tables exist: `mysql -u root asterisk -e 'SHOW TABLES;'`
- Check table structure: `mysql -u root asterisk -e 'DESCRIBE ps_endpoints;'`
- Reload Asterisk modules: `asterisk -rx 'module reload res_config_odbc.so'`

## Best Practices

1. **Regular Backups**: Always backup the database before making changes
2. **Version Control**: Keep track of schema changes
3. **Monitoring**: Monitor Asterisk logs for database-related errors
4. **Testing**: Test configuration changes in development first
5. **Documentation**: Document any custom schema modifications

## Future Considerations

1. **Migration Scripts**: Create proper database migration scripts for version updates
2. **Schema Validation**: Implement schema validation checks
3. **Automated Testing**: Add automated tests for database connectivity
4. **Performance Optimization**: Monitor and optimize database queries
5. **Security**: Review and harden database access permissions

## Related Files

- `/etc/asterisk/res_odbc.conf` - Asterisk ODBC configuration
- `/etc/odbc.ini` - System ODBC configuration
- `/etc/systemd/system/asterisk.service` - Asterisk service configuration
- `ecosystem.config.cjs` - PM2 application configuration
- `mayday/slave-backend/.env` - Node.js environment variables

## Support

For issues related to this setup:
1. Check Asterisk logs: `/var/log/asterisk/` or `journalctl -u asterisk`
2. Verify database connectivity with MySQL client
3. Test ODBC configuration with `isql`
4. Review the automated script output for specific error messages

---

**Last Updated**: 2025-11-25  
**Version**: 1.0  
**Compatible With**: Asterisk 20.12.0, MariaDB 10.11.14
