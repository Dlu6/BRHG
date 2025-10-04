# WebRTC Chrome Extension Setup Guide

This guide explains how to configure the Chrome Softphone Extension to work with the Reach-mi master-slave license architecture.

## Architecture Overview

- **Master Server** (`/mayday_website`): Manages licenses and WebRTC allocations (Port 8001)
- **Slave Server** (`/backend`): Handles Asterisk integration and WebRTC sessions (Port 8004)
- **Chrome Extension**: WebRTC client that connects to both servers

## Prerequisites

### 1. Master Server Setup

The master server must be running with proper license configuration:

```bash
cd mayday_website
npm start # Runs on port 8001
```

### 2. Slave Server Setup

The slave server must be configured with WebRTC transport:

```bash
cd backend
cp env.example .env
# Edit .env file with proper configuration
npm start # Runs on port 8004
```

### 3. ✅ **Automatic WebRTC Configuration**

**No manual configuration scripts needed!**

WebRTC features are **automatically enabled** when you:

1. **Create agents with `chrome_softphone` typology** in the Reach-mi Dashboard
2. The system automatically:
   - ✅ Enables `webrtc_extension` feature for your license
   - ✅ Sets reasonable WebRTC user allocation (default: 5 users or license max, whichever is smaller)
   - ✅ Configures proper PJSIP WebSocket transport (`transport-wss`)
   - ✅ Syncs changes with master server
   - ✅ Provides WebRTC-ready SIP configuration to chrome extension

**This replaces any manual utility scripts!**

### 4. Required Environment Variables (Backend)

```env
# Asterisk Configuration
ASTERISK_HOST=localhost
ASTERISK_SIP_PORT=5060

# WebRTC Configuration
WS_URI_SECURE=wss://localhost:8089/ws
STUN_SERVER01=stun:stun.l.google.com:19302
TURN_SERVER=turn:localhost:5349
TURN_USERNAME=webrtc
TURN_PASSWORD=webrtc123

# SSL Configuration (for production)
SSL_CERT_FILE=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_PRIVATE_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# License Management
LICENSE_MGMT_API_URL=http://localhost:8001/api
JWT_SECRET=mayday-super-secret-jwt-key-2024-secure
```

## License Configuration

### 1. Enable WebRTC Extension Feature

In the master server admin panel:

1. Go to **License Management**
2. Edit your license
3. Ensure the license type includes `webrtc_extension: true` in features
4. Set **WebRTC Max Users** allocation (e.g., 5 out of 10 total users)

### 2. Create WebRTC-Enabled Agents

In the slave server dashboard:

1. Go to **Agents** → **Add New Agent**
2. Set **Typology** to **Chrome Extension** or **WebRTC Appbar**
3. System will automatically configure PJSIP endpoint for WebRTC

## Chrome Extension Configuration

### 1. Load Extension

1. Open Chrome → Extensions → Developer mode
2. Click "Load unpacked" and select `/chrome-softphone-extension` folder
3. Extension should appear in toolbar

### 2. Login Process

1. Click extension icon or floating button
2. Enter credentials for an agent with WebRTC typology
3. System will:
   - Authenticate with slave server
   - Validate license with master server
   - Create WebRTC session if allocation allows
   - Connect to Asterisk via WebSocket

### 3. Verify Connection

Check extension console (F12 → Console) for:

```
[Background] License authenticated via websocket
[SIP] Connecting to WebSocket: wss://localhost:8089/ws
[SIP] SIP UserAgent registered.
```

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed

**Error**: `WebSocket connection failed`
**Solution**:

- Ensure Asterisk is running with WebSocket transport
- Check firewall allows port 8089 (WSS) or 8088 (WS)
- Verify SSL certificates for production

#### 2. License Feature Not Enabled

**Error**: `WebRTC extension feature not licensed`
**Solution**:

- Check license features in master admin panel
- Ensure `webrtc_extension: true` in license type
- Verify license sync between master and slave

#### 3. User Limit Reached

**Error**: `Maximum user limit reached`
**Solution**:

- Check current WebRTC session count in admin panel
- Increase WebRTC allocation or wait for sessions to end
- Verify session cleanup is working properly

#### 4. SIP Registration Failed

**Error**: `SIP UserAgent registration failed`
**Solution**:

- Check agent password and extension
- Verify PJSIP endpoint is created correctly
- Check Asterisk logs: `asterisk -rvvv`

### Debug Commands

#### Check WebSocket Transport (Asterisk CLI)

```bash
asterisk -rvvv
pjsip show transports
pjsip show endpoints
```

#### Check License Sync (Backend)

```bash
curl http://localhost:8004/api/licenses/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Check Active Sessions (Master)

```bash
curl http://localhost:8001/api/licenses/YOUR_LICENSE_ID/webrtc-sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Network Configuration

### Development (Local)

- WebSocket: `ws://localhost:8088/ws`
- STUN: `stun:stun.l.google.com:19302`
- No SSL certificates required

### Production

- WebSocket: `wss://yourdomain.com:8089/ws`
- TURN server recommended for NAT traversal
- Valid SSL certificates required
- Firewall rules for WebRTC ports

## Session Management

### How Sessions Work

1. User logs in via chrome extension
2. Extension validates license with master server
3. If WebRTC allocation available, session created
4. Session tracked on both master (licensing) and slave (calls)
5. Heartbeat maintains session every 30 seconds
6. Session ends on logout or extension close

### Session Limits

- Controlled by license `webrtc_max_users` setting
- Enforced at both master and slave levels
- Real-time monitoring in admin panels
- Automatic cleanup on disconnect

## Testing

### Basic Functionality Test

1. Load extension and login
2. Verify green status indicator
3. Enter test number and click call
4. Check audio/video permissions
5. Verify call appears in call history

### License Limit Test

1. Create license with 1 WebRTC user
2. Login with first user (should succeed)
3. Login with second user (should fail with limit error)
4. Logout first user
5. Login with second user (should now succeed)

## Support

For issues:

1. Check browser console for extension errors
2. Check backend logs for license/session errors
3. Check Asterisk logs for SIP/WebRTC errors
4. Verify network connectivity and firewall rules
