# External License Management Integration

This document explains how to configure the Reach-Mi backend to work with an external license management server for WebRTC extension licensing.

## Overview

The system now supports both local license management and external license management. When configured with an external license server, the backend will:

1. Fetch license information from the external server based on server fingerprint
2. Validate WebRTC extension feature access and user allocations
3. Manage local user sessions while respecting external license limits
4. Provide fallback to local licensing if external server is unavailable

## Current Implementation Status

### ✅ **Working Features**

- **Local License Management**: Fully functional with local license generation and validation
- **Chrome Extension Integration**: Login, session validation, and feature checking working
- **License Validation**: Both external and local license validation implemented
- **Session Management**: User session tracking and limits enforcement
- **Feature Parsing**: Robust JSON feature parsing for both string and object formats
- **Fallback System**: Automatic fallback to local licenses when external server unavailable

### 🔧 **Recent Fixes (Latest Update)**

- **Feature Parsing**: Fixed JSON parsing issues in Chrome extension for license features
- **Session Info**: Improved session information handling and display
- **WebRTC Extension**: Enhanced feature checking with fallback during loading states
- **Auth Middleware**: Fixed token parsing to handle both `id` and `userId` fields
- **License Validation**: Updated to check local licenses when external ones unavailable

## Environment Variables

Add these variables to your `.env` file:

```bash
# External License Management Server Configuration
LICENSE_MGMT_API_URL=https://your-license-server.com/api
LICENSE_MGMT_API_KEY=your-internal-api-key-here

# Local License System (fallback)
LICENSE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END RSA PRIVATE KEY-----"
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"
```

## License Types and Features

### Available License Types

1. **Basic** (ID: 1)

   - Max Users: 2
   - Features: calls, recording, transfers, conferences, reports, crm, zoho
   - WebRTC Extension: ❌ Disabled
   - Price: $29.99/month

2. **Professional** (ID: 2) ⭐ **Recommended for WebRTC**

   - Max Users: 5
   - Features: All Basic + whatsapp, sms, video, voicemail, email, zoho
   - WebRTC Extension: ✅ Enabled
   - Price: $79.99/month

3. **Enterprise** (ID: 3)

   - Max Users: 25
   - Features: All Professional + salesforce, twilio, facebook, third_party_integrations
   - WebRTC Extension: ✅ Enabled
   - Price: $199.99/month

4. **Developer** (ID: 4) 🛠️ **Development/Testing**
   - Max Users: 1
   - Features: calls, recording, transfers, conferences
   - WebRTC Extension: ❌ Disabled
   - Price: $0.00/month (Free)

### Feature Structure

Features are stored as JSON in the database and can be either:

- **JSON String**: `"{\"calls\":true,\"webrtc_extension\":true}"`
- **JSON Object**: `{"calls": true, "webrtc_extension": true}`

The system automatically handles both formats.

## External License Server API Requirements

Your external license management server must provide the following endpoints:

### 1. Get All Licenses

```
GET /licenses
Headers:
  X-Internal-API-Key: your-api-key
```

Response format:

```json
{
  "data": [
    {
      "id": 123,
      "organization_name": "Acme Corp",
      "server_fingerprint": "server-fingerprint-hash",
      "status": "active",
      "max_users": 50,
      "webrtc_max_users": 25,
      "license_type_id": 2,
      "license_type": {
        "id": 2,
        "name": "Professional",
        "features": {
          "calls": true,
          "recording": true,
          "webrtc_extension": true,
          "whatsapp": true
        },
        "max_concurrent_users": 25
      },
      "expires_at": "2024-12-31T23:59:59Z",
      "issued_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Get License Types

```
GET /licenses/types
Headers:
  X-Internal-API-Key: your-api-key
```

### 3. Get WebRTC Sessions (Optional)

```
GET /licenses/{id}/webrtc-sessions
Headers:
  X-Internal-API-Key: your-api-key
```

Response format:

```json
{
  "webrtc_max_users": 25,
  "activeSessions": 12
}
```

## How It Works

### 1. License Discovery

- On startup, the backend generates a server fingerprint
- It queries the external license server for licenses matching this fingerprint
- If found, it uses the external license; otherwise falls back to local licensing
- **Fallback Logic**: If external server returns 404, system uses local licenses

### 2. Feature Validation

- WebRTC extension access is controlled by the `webrtc_extension` feature flag
- User limits are enforced based on `webrtc_max_users` allocation
- Features can be stored as JSON object or JSON string in the database
- **Robust Parsing**: System handles both string and object feature formats

### 3. Session Management

- Local session tracking in `client_sessions` table
- Sessions are validated against external license limits
- Real-time session counting and user limit enforcement
- **Session Cleanup**: Automatic cleanup of expired sessions

### 4. Database Integration

- External licenses are cached locally in `server_licenses` table
- Session tracking remains local for performance
- **Sync Timestamps**: Track when licenses were last synced from external server

## API Endpoints

### Public Endpoints (Authenticated Users)

- `GET /api/licenses/current` - Get current server license
- `GET /api/licenses/session-count` - Get session information
- `POST /api/licenses/validate-session` - Validate user session
- `POST /api/licenses/create-session` - Create user session
- `POST /api/licenses/end-session` - End user session

### Admin Endpoints

- `GET /api/licenses/` - Get all licenses (from local cache)
- `GET /api/licenses/types` - Get license types (from local cache)
- `GET /api/licenses/active-sessions` - Local active sessions
- `POST /api/licenses/sync` - Manual sync from external server

### WebRTC Management Endpoints

- `GET /api/licenses/:id/webrtc-sessions` - Get WebRTC sessions info
- `PUT /api/licenses/:id/webrtc-allocation` - Update WebRTC allocation
- `GET /api/licenses/:id/users` - Get users for a license
- `PUT /api/licenses/:id/users/:userId/webrtc` - Update user WebRTC access

### Legacy Endpoints

These endpoints return HTTP 501 (Not Implemented) with appropriate messages:

- `POST /api/licenses/generate`
- `PUT /api/licenses/:id`
- `PUT /api/licenses/:id/status`

## Chrome Extension Integration

The chrome extension automatically:

1. **Login Process**: Validates license and WebRTC extension access during login
2. **Session Management**: Creates and manages user sessions
3. **Feature Display**: Shows license information in the softphone bar
4. **User Limits**: Displays user count and allocation details
5. **Error Handling**: Provides license-specific error messages
6. **Real-time Updates**: Updates session info every 30 seconds

### Extension Features

- **Robust Feature Parsing**: Handles JSON string/object feature formats
- **Loading States**: Graceful handling during license loading
- **Fallback Logic**: Works even when features data is incomplete
- **Debug Logging**: Extensive console logging for troubleshooting

## Error Handling

The system provides detailed error messages for:

- **Feature not licensed**: "WebRTC Extension is not enabled in your license plan"
- **User limit reached**: "Maximum user limit reached (X users). Please wait..."
- **No allocation**: "WebRTC Extension is not allocated for your license"
- **Concurrent session**: "User already logged in from another device"
- **External server unavailable**: Automatic fallback to local licensing

## Monitoring and Logging

The system logs:

- License validation attempts
- External server communication
- Session creation/termination
- Feature access attempts
- Sync operations
- **Debug Information**: Feature parsing, license loading, session updates

## Development and Testing

For development, you can use the "Developer" license type which:

- Enables all features including WebRTC extension
- Allows 1 concurrent user (suitable for testing)
- Is managed locally (not externally)
- Has no cost ($0.00/month)

### Local License Generation

```bash
# Generate a local license for testing
curl -X POST http://localhost:8004/api/licenses/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "organizationName": "Test Organization",
    "licenseTypeId": 2,
    "serverFingerprint": "your-server-fingerprint",
    "issued_at": "2024-01-01T00:00:00Z",
    "expires_at": "2024-12-31T23:59:59Z"
  }'
```

## Troubleshooting

### External Server Unavailable

- System automatically falls back to local license management
- Check `LICENSE_MGMT_API_URL` configuration
- Verify API key in `LICENSE_MGMT_API_KEY`
- **Logs**: Look for "Error syncing from external server" messages

### License Not Found

- Verify server fingerprint matches license in external system
- Check license status is "active"
- Ensure license includes WebRTC allocation
- **Fallback**: System will use local licenses if external not found

### Session Limit Issues

- Check `webrtc_max_users` vs actual concurrent sessions
- Verify session cleanup is working properly
- Monitor Redis session counters
- **Database**: Check `client_sessions` table for active sessions

### Feature Access Denied

- Verify license type includes `webrtc_extension: true`
- Check user allocation in external license system
- Ensure license status is "active"
- **Debug**: Check browser console for feature parsing logs

### Chrome Extension Issues

- **Feature Parsing**: Check console for "[SoftphoneBar] Feature check" logs
- **Session Info**: Verify `sessionInfo` in browser storage
- **License Loading**: Check "[Login] Parsed license features" logs
- **Fallback Logic**: Extension works during license loading phases

## Recent Updates

### Latest Fixes (Current Version)

1. **Fixed Feature Parsing**: Chrome extension now properly parses JSON features
2. **Enhanced Session Info**: Improved session information handling
3. **Better Error Handling**: More robust error messages and fallbacks
4. **Auth Middleware**: Fixed token parsing for Chrome extension
5. **Loading States**: Extension works during license loading phases

### Performance Improvements

- **Caching**: External licenses cached locally for 5 minutes
- **Fallback**: Automatic fallback to local licenses
- **Session Tracking**: Efficient Redis-based session counting
- **Feature Validation**: Optimized feature checking logic

## Support

For issues related to:

- **External License Server**: Contact your license provider
- **Local License System**: Check this documentation
- **Chrome Extension**: Review browser console logs
- **Backend Issues**: Check server logs for detailed error messages
