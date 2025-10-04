# Dynamic Host Configuration System

## Overview

The Chrome softphone extension now supports dynamic host configuration, allowing different organizations to use their own backend servers instead of hardcoded URLs. This provides better multi-tenant support and flexibility for different deployments.

## Architecture

### 1. Dashboard Configuration (AgentEdit.js)

**Location**: `Reach-mi-dashboard/src/components/AgentEdit.js`

**New Field**: `phoneBarChromeExtensionHost`

- **Purpose**: Configure the backend server URL for each agent
- **Type**: URL input field
- **Location**: Phonebar Settings tab → Chrome Extension Configuration section
- **Default**: Empty (user must configure)

**Example Configuration**:

```
Chrome Extension Host URL: https://cs.morvenconsults.com
```

### 2. Extension Login Process

**Location**: `chrome-softphone-extension/src/components/Login.jsx`

**Changes**:

- Host URL input field (disabled, read-only)
- Host URL retrieved from server response
- Storage of host URL in chrome.storage.local

**User Experience**:

1. User enters email and password
2. Extension connects using stored host URL or fallback
3. Server returns the configured host URL for the agent
4. Extension validates that host URL is properly configured
5. Extension stores the host URL for future use
6. Host URL is displayed but cannot be modified by user

### 3. Dynamic Configuration Loading

**Location**: `chrome-softphone-extension/src/config.js`

**Changes**:

- `getEnvironmentConfig()` is now async
- Reads stored host URL from chrome.storage.local
- Falls back to default URLs if no stored host
- All API endpoints dynamically generated from stored host

## Benefits

### For Organizations

- **Multi-tenant Support**: Each organization can use their own backend
- **Custom Deployments**: Support for custom server URLs
- **Development Flexibility**: Easy switching between dev/prod environments

### For Users

- **No Configuration Required**: Host URL is automatically configured by administrator
- **Persistent Settings**: Host URL remembered between sessions
- **Secure**: Users cannot modify the host URL

### For Developers

- **Flexible Architecture**: Easy to add new backend servers
- **Backward Compatibility**: Falls back to default URLs
- **Clean Separation**: Configuration separated from code

## Implementation Details

### Dashboard Changes

```javascript
// In AgentEdit.js - PhonebarTabContent
<TextField
  label="Chrome Extension Host URL"
  type="url"
  fullWidth
  name="phoneBarChromeExtensionHost"
  value={formAgentDetails.phoneBarChromeExtensionHost || ""}
  onChange={handleInputChange}
  margin="dense"
  variant="outlined"
  placeholder="https://your-backend-server.com"
  helperText="The backend server URL for the Chrome extension."
/>
```

### Extension Changes

```javascript
// In Login.jsx
const [host, setHost] = useState(""); // Will be populated from server

// Get host from server response - required
if (!phoneBarChromeExtensionHost) {
  throw new Error("Chrome Extension Host URL is not configured for this agent");
}

const serverHost = phoneBarChromeExtensionHost;
setHost(serverHost); // Update UI to show configured host

// Store in chrome.storage.local
const storageData = {
  hostUrl: serverHost,
  // ... other data
};
```

### Configuration Changes

```javascript
// In config.js
const getEnvironmentConfig = async () => {
  // Try to get stored host URL
  let storedHostUrl = null;
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(["hostUrl"]);
      storedHostUrl = result.hostUrl;
    }
  } catch (error) {
    console.warn("[Config] Could not retrieve stored host URL:", error);
  }

  // Use stored host or fallback to defaults
  return {
    SLAVE_SERVER_URL: storedHostUrl || "https://cs.morvenconsults.com",
    SLAVE_SERVER_API_URL: storedHostUrl
      ? `${storedHostUrl}/api`
      : "https://cs.morvenconsults.com/api",
    // ... other endpoints
  };
};
```

## Migration Guide

### For Existing Users

1. **First Login**: Users will use stored host URL or fallback for initial connection
2. **Server Configuration**: Host URL is retrieved from server response
3. **Validation**: Extension validates that host URL is properly configured
4. **Subsequent Logins**: Host URL is remembered automatically
5. **No Data Loss**: All existing functionality preserved

### For Administrators

1. **Configure Agents**: Set the Chrome Extension Host URL for each agent
2. **Test Configuration**: Verify the URL is accessible
3. **Monitor Usage**: Check that agents can connect successfully

### For Developers

1. **Update Backend**: Ensure the backend supports the new host configuration
2. **Test Extension**: Verify login works with different host URLs
3. **Update Documentation**: Inform users about the new configuration process

## Security Considerations

### URL Validation

- **Protocol Check**: Ensures http/https protocols
- **Format Normalization**: Removes trailing slashes
- **Fallback Handling**: Graceful degradation to defaults

### Storage Security

- **Chrome Storage**: Uses chrome.storage.local for persistence
- **No Sensitive Data**: Only stores the host URL, not credentials
- **User Control**: Users can clear storage to reset configuration

## Troubleshooting

### Common Issues

1. **Host Not Configured**

   - **Solution**: Administrator must configure the Chrome Extension Host URL in the dashboard
   - **Check**: Verify the agent has a valid host URL set in AgentEdit.js
   - **Error**: "Chrome Extension Host URL is not configured for this agent"

2. **Connection Failed**

   - **Solution**: Verify the backend server is accessible
   - **Check**: Network connectivity and server status

3. **Configuration Not Saved**
   - **Solution**: Check chrome.storage permissions
   - **Debug**: Use browser dev tools to inspect storage

### Debug Information

```javascript
// Check stored host URL
chrome.storage.local.get(["hostUrl"], (result) => {
  console.log("Stored host URL:", result.hostUrl);
});

// Check current configuration
import config from "./config.js";
const envConfig = await config.getEnvironmentConfig();
console.log("Current config:", envConfig);
```

## Future Enhancements

### Planned Features

- **Host URL Validation**: Server-side validation of host URLs
- **Auto-discovery**: Automatic detection of available servers
- **Multiple Hosts**: Support for multiple backend servers
- **Load Balancing**: Automatic failover between servers

### Configuration Options

- **Default Hosts**: Pre-configured host URLs for common deployments
- **Host Templates**: Reusable host configurations
- **Environment Switching**: Easy switching between dev/staging/prod

## Conclusion

The dynamic host configuration system provides a flexible, secure, and user-friendly way to manage backend server URLs for the Chrome softphone extension. This enables better multi-tenant support and simplifies deployment across different environments.
