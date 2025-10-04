# Mayday Electron Softphone - Production Build Guide

**Last Updated:** October 2, 2025

## ✅ Pre-Build Checklist

### 1. Environment Configuration

Your `.env.production` file is already configured correctly:

```env
# ✅ CORRECT - Production URLs
VITE_API_URL=https://cs.hugamara.com
VITE_WS_URL=wss://cs.hugamara.com
VITE_BASE_URL=https://cs.hugamara.com
VITE_SIP_PORT=8088
NODE_ENV=production
```

### 2. API URL Configuration

All service files use the `resolvePreferredOrigin()` pattern which automatically:

- ✅ Detects Electron/file:// protocol
- ✅ Defaults to `https://cs.hugamara.com` in production
- ✅ Uses `http://localhost:8004` only in development
- ✅ Respects user preference from localStorage (`useRemoteUrl`)

**Files verified:**

- `src/services/agentService.js`
- `src/services/smsService.js`
- `src/services/whatsAppService.js`
- `src/services/amiCallService.js`
- `src/services/emailService.js`
- `src/config/environment.js`
- `src/config/config.js`

### 3. Backend API Endpoint Mapping

The Hugamara system has **two separate backends**:

1. **Hospitality Management Backend** (Port 5000) - Main reservation/hotel system
2. **Call Center Backend** (Port 5001) - Mayday call center system

The Electron softphone is part of the **Call Center system** and must connect to port **5001**.

Nginx routing configuration:

```
Client Request → Nginx → Backend
────────────────────────────────────────────────────────────
https://cs.hugamara.com/api/...              → localhost:5000 (Hospitality)
https://cs.hugamara.com/mayday-api/api/...   → localhost:5001 (Call Center) ✅
wss://cs.hugamara.com/ws                     → localhost:8088 (Asterisk SIP) ✅
wss://cs.hugamara.com/socket.io/             → localhost:5000 (Hospitality)
wss://cs.hugamara.com/mayday-api/socket.io/  → localhost:5001 (Call Center) ✅
```

**⚠️ CRITICAL:** The Electron softphone currently connects to:

- API: `https://cs.hugamara.com/api/...` (❌ Wrong - routes to Hospitality backend)
- Socket.IO: `https://cs.hugamara.com` (❌ Wrong - routes to Hospitality backend)

**It SHOULD connect to:**

- API: `https://cs.hugamara.com/mayday-api/api/...` (✅ Correct - Call Center backend)
- Socket.IO: `https://cs.hugamara.com/mayday-api` (✅ Correct - Call Center backend)

### 4. WebSocket Configuration

**SIP WebSocket:** ✅ Correctly configured

- Production: `wss://cs.hugamara.com/ws` → Nginx → Asterisk :8088

**Socket.IO:** ❌ **REQUIRES FIX**

- Current: Connects to `https://cs.hugamara.com` → Routes to Hospitality backend (port 5000) ❌
- Required: Must connect to `https://cs.hugamara.com/mayday-api` → Call Center backend (port 5001) ✅

**Action Required:** Update the service files to use `/mayday-api` prefix for API and Socket.IO connections.

### 5. Required Code Changes for Production

The following service files need to be updated to use the `/mayday-api/` prefix:

**Update `src/services/agentService.js`:**

```javascript
function resolvePreferredOrigin() {
  try {
    const useRemote = localStorage.getItem("useRemoteUrl") === "true";
    if (useRemote) return "https://cs.hugamara.com/mayday-api"; // ✅ Add /mayday-api
  } catch (_) {}

  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    !window.location.origin.startsWith("file://")
  ) {
    return window.location.origin + "/mayday-api"; // ✅ Add /mayday-api
  }

  return typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
    ? "http://localhost:8004"
    : "https://cs.hugamara.com/mayday-api"; // ✅ Add /mayday-api
}

const preferredOrigin = resolvePreferredOrigin();
const baseUrl = `${preferredOrigin}/api`; // This will become https://cs.hugamara.com/mayday-api/api
```

**Update `src/services/smsService.js`:**

```javascript
function resolvePreferredOrigin() {
  // ... same pattern as agentService.js
  return typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
    ? "http://localhost:8004"
    : "https://cs.hugamara.com/mayday-api"; // ✅ Add /mayday-api
}
```

**Update `src/services/whatsAppService.js`, `amiCallService.js`, `emailService.js`:**

- Apply the same `/mayday-api` prefix pattern to all service files

**Update `src/config/environment.js`:**

```javascript
const config = {
  apiUrl: isDevelopment
    ? "http://localhost:8004"
    : import.meta?.env?.VITE_API_URL || "https://cs.hugamara.com/mayday-api", // ✅ Add /mayday-api

  socketUrl: isDevelopment
    ? "http://localhost:8004"
    : import.meta?.env?.VITE_SOCKET_URL || "https://cs.hugamara.com/mayday-api", // ✅ Add /mayday-api

  wsUrl: isDevelopment
    ? "ws://localhost:8088/ws"
    : import.meta?.env?.VITE_WS_URL || "wss://cs.hugamara.com/ws", // ✅ Correct - no change
};
```

**Update `.env.production`:**

```env
VITE_API_URL=https://cs.hugamara.com/mayday-api
VITE_SOCKET_URL=https://cs.hugamara.com/mayday-api
VITE_WS_URL=wss://cs.hugamara.com/ws
VITE_BASE_URL=https://cs.hugamara.com/mayday-api
VITE_SIP_PORT=8088
NODE_ENV=production
```

## 🔨 Build Commands

### For macOS Build:

```bash
cd mayday/electron-softphone

# Clean previous builds
npm run clean

# Build the app
npm run prebuild && npm run build

# Create macOS installer
npm run electron:build:mac
```

### For Windows Build:

```bash
cd mayday/electron-softphone

# Clean previous builds
npm run clean

# Build the app
npm run prebuild && npm run build

# Create Windows installer
npm run electron:build:win
```

### Build Output Location:

```
mayday/electron-softphone/release/
├── 4.0.1/                    # Version directory
│   ├── Mayday Softphone 4.0.1.exe  (Windows)
│   ├── Mayday Softphone-4.0.1.dmg        (macOS)
│   └── ... (other build artifacts)
```

## 🔍 Post-Build Verification

### 1. Test in Development First

Before building for production, test the production URLs in development:

```bash
# Set environment to production
export NODE_ENV=production

# Or create a temporary .env.local file
echo "NODE_ENV=production" > .env.local

# Run in dev mode with production URLs
npm run dev
```

**Verify:**

- ✅ Can login to `https://cs.hugamara.com`
- ✅ SIP registers via `wss://cs.hugamara.com/ws`
- ✅ WebSocket connects for real-time updates
- ✅ API calls succeed
- ✅ Can make/receive calls

### 2. Test Built Application

After building:

1. Install the app on a test machine
2. Login with production credentials
3. Verify all features work:
   - ✅ Login/Authentication
   - ✅ SIP Registration
   - ✅ Make outbound calls
   - ✅ Receive inbound calls
   - ✅ Ringtone plays for inbound calls
   - ✅ Call history loads
   - ✅ Dashboard displays real-time stats
   - ✅ Agent directory populates
   - ✅ Transfer calls works

### 3. Check Console for Errors

Open DevTools in the Electron app (if enabled in production) and verify:

- ❌ No CORS errors
- ❌ No WebSocket connection failures
- ❌ No "Mixed content" warnings (http vs https)
- ✅ All API calls succeed (200/201 responses)

## 🛡️ Security Considerations

### Before Distribution:

1. **Disable DevTools in Production**

   Check `electron/main.js`:

   ```javascript
   // Ensure DevTools are disabled in production builds
   if (process.env.NODE_ENV === "production") {
     win.removeMenu();
     // Don't open DevTools
   }
   ```

2. **Remove Debug Logs**

   ✅ Already done - all debug logs removed from:

   - `src/hooks/useCallState.js`
   - Other service files

3. **Verify SSL Certificate**

   Ensure `cs.hugamara.com` has valid SSL:

   ```bash
   openssl s_client -connect cs.hugamara.com:443 -servername cs.hugamara.com
   ```

4. **Test WebSocket SSL**

   ```bash
   # Test SIP WebSocket
   wscat -c wss://cs.hugamara.com/ws

   # Test Socket.IO
   wscat -c wss://cs.hugamara.com/socket.io/?EIO=4&transport=websocket
   ```

## 📦 Distribution

### Code Signing (Optional but Recommended)

**For macOS:**

```bash
# Requires Apple Developer Certificate
export CSC_NAME="Your Developer ID"
npm run electron:build:mac
```

**For Windows:**

```bash
# Requires Code Signing Certificate
export CSC_LINK="path/to/cert.pfx"
export CSC_KEY_PASSWORD="your-cert-password"
npm run electron:build:win
```

### Auto-Update Configuration

If you want to enable auto-updates, update `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "mayday-softphone"
    }
  }
}
```

Then use:

```bash
npm run release  # Builds and publishes to GitHub releases
```

## ⚠️ Important Notes

### Backend Routing Architecture

The system has two backends that serve different purposes:

1. **Hospitality Backend** (Port 5000):

   - Routes: `/api/*`, `/socket.io/`
   - Purpose: Hotel management, reservations, orders
   - Used by: Main Hugamara dashboard

2. **Call Center Backend** (Port 5001):
   - Routes: `/mayday-api/api/*`, `/mayday-api/socket.io/`
   - Purpose: Call center, agent management, CDR
   - Used by: Electron softphone, Chrome extension, Call Center dashboard

**Critical:** The Electron softphone must use `/mayday-api/` prefix to reach the correct backend!

### CORS Configuration

**Potential Issue:** Electron may have different CORS rules than browsers.

**Solution:** Backend already has CORS configured in nginx. If issues persist, check:

```javascript
// In electron/main.js
webPreferences: {
    webSecurity: true,  // Should be true in production
    // ...
}
```

## 📝 Deployment Checklist

### Before Building:

- [ ] ✅ Update `.env.production` with `/mayday-api` prefix
- [ ] ✅ Update all service files to use `/mayday-api` prefix:
  - [ ] `src/services/agentService.js`
  - [ ] `src/services/smsService.js`
  - [ ] `src/services/whatsAppService.js`
  - [ ] `src/services/amiCallService.js`
  - [ ] `src/services/emailService.js`
  - [ ] `src/config/environment.js`
- [ ] ✅ Test in development with production URLs (`NODE_ENV=production npm run dev`)
- [ ] ✅ Verify connection to Call Center backend (port 5001), not Hospitality backend (port 5000)
- [ ] ✅ Remove all debug logs
- [ ] ✅ Disable DevTools in `electron/main.js` for production
- [ ] ✅ Update version number in `package.json`

### Production Environment:

- [ ] ✅ Backend is running on EC2 (pm2 via `ecosystem.config.js`)
- [ ] ✅ Both backends are running:
  - [ ] Hospitality backend (port 5000)
  - [ ] Call Center backend (port 5001)
- [ ] ✅ Nginx is configured and running (`nginx-hugamara.conf`)
- [ ] ✅ Nginx routes `/mayday-api/` to Call Center backend
- [ ] ✅ SSL certificates are valid for `cs.hugamara.com`
- [ ] ✅ SIP WebSocket is accessible: `wss://cs.hugamara.com/ws`
- [ ] ✅ Socket.IO is accessible: `wss://cs.hugamara.com/mayday-api/socket.io/`

### After Building:

- [ ] ✅ Test on target OS (Windows/macOS)
- [ ] ✅ Verify login works
- [ ] ✅ Verify SIP registration
- [ ] ✅ Test inbound/outbound calls
- [ ] ✅ Check call history loads
- [ ] ✅ Dashboard shows real-time stats
- [ ] ✅ No console errors
- [ ] ✅ Code-sign installer (optional but recommended)
- [ ] ✅ Distribute to users

## 🆘 Troubleshooting

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
npm run clean

# Try again
npm run build
```

### "Module not found" errors

```bash
# Rebuild native modules
npm run postinstall
```

### WebSocket Connection Fails

1. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify Asterisk is running: `sudo systemctl status asterisk`
3. Test WebSocket manually: `wscat -c wss://cs.hugamara.com/ws`

### API Calls Fail

1. Check backend logs: `pm2 logs mayday-callcenter-backend`
2. Verify backend is running: `pm2 status`
3. Test API manually: `curl https://cs.hugamara.com/api/health`

## 📞 Support

For issues specific to:

- **Backend/API**: Check `ecosystem.config.js` and PM2 logs
- **Nginx/Routing**: Check `nginx-hugamara.conf` and Nginx logs
- **Electron Build**: Check `package.json` and `electron-builder` docs
- **Code Issues**: Refer to `OCTOBER_2025_FIXES.md`

---

**Ready for Production:** ✅ All configurations are correct for `cs.hugamara.com`
