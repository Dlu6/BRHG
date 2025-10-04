# Mayday Softphone Chrome Extension

This is a Chrome extension that provides a WebRTC softphone for the Reach-mi Call Center.

## Features

- **Optional Authentication**: Users can browse supported pages without mandatory authentication
- **Draggable Floating Button**: Click and drag the floating button to any position on the page
- **Dismissible Interface**: Close the floating button entirely when not needed
- **Persistent Position**: Button remembers its position and visibility state across page loads
- **Multiple Access Methods**: Click floating button, extension icon, or use keyboard shortcut
- **License Status Integration**: Real-time license validation with visual indicators
- **Feature-Based Access Control**: Functionality enabled/disabled based on license status
- **Demo Mode**: Non-authenticated users can see the softphone interface (limited functionality)
- **Full Functionality**: Authenticated users get complete calling, transfer, and management features

## Supported Pages

The extension works on:

- `*.zoho.com/*` (Zoho CRM)
- `cs.lusuku.shop/*` (Custom CRM)
- `localhost:3000/*` (Development environment)

## Building the Extension

To build the extension, you need to have Node.js and npm installed.

1.  Navigate to the `chrome-softphone-extension` directory.
2.  Run `npm install` to install the dependencies.
3.  Run `npm run build` to build the extension.

The built extension will be in the `dist` directory.

## Installing the Extension

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode" in the top right corner.
3.  Click "Load unpacked" and select the `chrome-softphone-extension/dist` directory.

## Using the Extension

### For Regular Users (No Softphone Required)

- The extension runs quietly in the background
- Pages load normally without any interference
- The floating button appears in the top-right corner (draggable and dismissible)
- You can ignore the softphone features completely

### For Agents/Users Who Need Softphone

1. **Option 1**: Click the floating blue/green button
2. **Option 2**: Click the extension icon in Chrome's toolbar
3. **Option 3**: Use keyboard shortcut `Ctrl+Shift+M` (restores dismissed button)
4. Login with your credentials when prompted
5. The softphone bar will appear at the top of the page
6. You can toggle the softphone on/off using the floating button

### Floating Button Controls

- **Drag**: Click and drag the button to move it anywhere on the page
- **Dismiss**: Click the red "×" button to hide the floating button completely
- **Restore**: Press `Ctrl+Shift+M` to bring back a dismissed button
- **Position Memory**: The button remembers its position across page reloads
- **Auto-hide Hint**: The restore hint appears when dismissed and disappears after 1 minute

### Visual Indicators

- **Blue floating button**: Not authenticated (login required)
- **Green floating button**: Authenticated (toggle softphone)
- **Red dot**: Indicates authentication required
- **Red "×" button**: Click to dismiss the floating button
- **Purple softphone bar**: Demo mode (limited functionality)
- **Dark blue softphone bar**: Full functionality (authenticated)
- **Grey softphone bar**: License invalid or expired (functionality disabled)

### License Status Indicators

- **Green checkmark**: Active license - all features available
- **Orange warning**: Trial license - features available with time limit
- **Red X**: Expired/invalid license - calling functionality disabled
- **Grey shield**: Unknown license status - limited functionality
- **Red banner**: License warning - appears when license is invalid or expired

### License-Based Functionality

- **Active License**: Full calling, transfer, hold, and management features
- **Trial License**: All features available during trial period
- **Expired/Invalid License**:
  - Phone input field disabled
  - Call making disabled
  - Call answering disabled
  - Advanced features (transfer, hold) hidden
  - Warning banner displayed
- **No License**: Demo mode with visual interface only

### Debugging & Troubleshooting

- **Enhanced Error Messages**: Detailed error descriptions with specific guidance for each issue type
- **Smart Token Handling**: Automatically handles tokens with or without Bearer prefix from backend
- **Console Logging**: Comprehensive logging throughout the authentication and session flow
- **Development Mode**: Additional debug information shown in development environment
- **Session Tracking**: Real-time session count and status monitoring
- **Error Categories**:
  - 🔐 Authentication Token Errors
  - 🚫 License User Limit Reached
  - 🔒 Concurrent Session Detected
  - 📋 Feature Not Licensed
  - ⏰ Session Expired
  - ❌ General Session Errors

### Common Issues & Solutions

1. **"JWT malformed" Error**: Token format issue - try logging out and logging in again
2. **"Maximum user limit reached"**: License allows limited concurrent users - wait for others to logout
3. **"Already logged in elsewhere"**: Only one session per user - logout from other devices first
4. **"Feature not enabled"**: Contact administrator to upgrade license plan
5. **Authentication fails**: Check server connection and credentials
6. **"Admin access required" Error**: Fixed route ordering issue where specific routes were conflicting with parameterized routes

### Technical Notes

- **Token Compatibility**: Handles tokens with or without Bearer prefix for backend compatibility
- **Route Ordering**: Specific routes (like `/current`, `/session-count`) must be defined before parameterized routes (like `/:id`) in Express.js
- **Session Management**: All session management endpoints are accessible to authenticated users, not just admins
- **License Validation**: The system validates licenses on every session creation and periodically during heartbeats
- **Simplified Flow**: Removed authentication test step for cleaner login process

### Session Management & User Limits

- **Per-User Licensing**: Each license specifies maximum concurrent users
- **Single Session Enforcement**: One active session per username across all devices
- **Device Fingerprinting**: Prevents concurrent logins from different devices
- **Automatic Session Cleanup**: Sessions are cleaned up on logout or extension shutdown
- **Session Heartbeat**: Keeps sessions alive and validates license status every 30 seconds
- **User Count Display**: Shows current users vs. maximum allowed (e.g., "3/5 users")
- **Graceful Limit Handling**: Clear error messages when user limits are reached

### Keyboard Shortcuts

- **`Ctrl+Shift+M`**: Restore dismissed floating button to default position

## Debugging the Extension

To debug the background script, click the "service worker" link in the extension's card on the `chrome://extensions` page. This will open the developer tools for the background script.

To debug the content script and the softphone bar UI, open the developer tools on any page where the extension is active (i.e., any page that is not a Chrome internal page).

## Authentication and License Validation

The extension uses a flexible authentication system with integrated license management:

1.  **Optional Login**: Users can click the floating button or extension icon to trigger the login modal
2.  **Content Script**: Manages the floating toggle button and softphone interface
3.  **Background Script**: Handles SIP registration, WebSocket connections, and call management
4.  **License Validation**: Real-time license checking with automatic feature enablement/disabling
5.  **Progressive Enhancement**: Interface adapts based on authentication status and license validity
6.  **Demo Mode**: Non-authenticated users see a limited interface for demonstration purposes

### Authentication Flow

1. User clicks floating button or extension icon
2. Login modal appears (can be cancelled)
3. Upon successful login, SIP credentials are stored
4. License validation occurs automatically
5. Background script handles WebRTC registration
6. Interface adapts based on license status and available features
7. Full or limited functionality becomes available based on license

## User Experience Enhancements

### Persistent State

- Button position is saved to localStorage and restored on page reload
- Button visibility state is remembered across sessions
- User preferences persist until manually changed

### Accessibility

- All interactive elements have proper titles and hover states
- Keyboard shortcut for restoring dismissed buttons
- Visual feedback during drag operations
- Smooth animations and transitions

### Non-Intrusive Design

- Small floating button that can be moved or dismissed
- No blocking modals unless explicitly requested
- Graceful degradation for non-authenticated users
- Optional functionality that doesn't interfere with normal page usage
- Temporary restore hints that auto-disappear to avoid clutter
- License-aware interface that clearly communicates available functionality
- Progressive feature enablement based on authentication and license status
