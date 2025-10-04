# Session Management Fixes - Resolving "Maximum User Limit Reached" Errors

## Problem Description

Users were experiencing "Maximum user limit reached" errors even when they should have been able to log in. This was caused by sessions not being properly cleaned up when:

- Users closed their browser
- Users closed tabs
- The extension crashed or was suspended
- Network failures occurred during logout
- Browser crashes or force-closes

## Root Causes Identified

### 1. **Incomplete Session Cleanup in Chrome Extension**

- `chrome.runtime.onSuspend` only works when extension is properly suspended
- Tab closure events didn't trigger session cleanup
- No retry logic for failed cleanup API calls
- Missing cleanup on extension lifecycle events

### 2. **Race Conditions in Session Management**

- Sessions could be created but not properly cleaned up
- Redis vs Database sync issues
- Missing atomic cleanup operations

### 3. **Missing Heartbeat Failure Handling**

- Sessions stopped sending heartbeats without cleanup
- No automatic cleanup of "ghost" sessions
- Insufficient grace period handling

## Solutions Implemented

### 1. **Enhanced Chrome Extension Session Management**

#### **Improved Lifecycle Handlers**

```javascript
// Enhanced cleanup for extension lifecycle events
const setupExtensionLifecycleHandlers = () => {
  // Extension suspending (going to sleep)
  chrome.runtime.onSuspend.addListener(() => {
    console.log("[Background] Extension suspending, cleaning up session...");
    cleanupSession();
    stopSessionHeartbeat();
  });

  // Extension starting up
  chrome.runtime.onStartup.addListener(() => {
    console.log("[Background] Extension starting up...");
    // Check for existing sessions and restart heartbeat
  });

  // Extension installed/updated
  chrome.runtime.onInstalled.addListener(() => {
    console.log(
      "[Background] Extension installed/updated, clearing stale data..."
    );
    chrome.storage.local.clear();
  });

  // Tab removal with delayed cleanup
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    // Schedule cleanup with 10-second delay to handle rapid tab switching
    if (sessionCleanupTimeout) {
      clearTimeout(sessionCleanupTimeout);
    }

    sessionCleanupTimeout = setTimeout(async () => {
      await cleanupSession();
      stopSessionHeartbeat();
    }, 10000);
  });
};
```

#### **Enhanced Session Cleanup with Retry Logic**

```javascript
const cleanupSession = async (retryCount = 0) => {
  try {
    // ... cleanup logic ...

    if (response.ok) {
      console.log("[Background] ✅ Session cleaned up successfully");
      await chrome.storage.local.clear();
      return true;
    } else {
      // Retry logic for failed cleanup
      if (retryCount < 3) {
        console.log(
          `[Background] Retrying session cleanup in 5 seconds... (${
            retryCount + 1
          }/3)`
        );
        setTimeout(() => cleanupSession(retryCount + 1), 5000);
      } else {
        console.error(
          "[Background] Failed to cleanup session after 3 attempts"
        );
        // Force clear storage even if server cleanup failed
        await chrome.storage.local.clear();
      }
    }
  } catch (error) {
    // Similar retry logic for network errors
  }
};
```

#### **Enhanced Heartbeat with Failure Detection**

```javascript
const startSessionHeartbeat = () => {
  sessionHeartbeatInterval = setInterval(async () => {
    try {
      // ... heartbeat logic ...

      if (response.ok) {
        lastHeartbeatSuccess = Date.now();
        console.log("[Background] ✅ Session heartbeat successful");
      }
    } catch (error) {
      // Check if we've had too many consecutive failures
      const timeSinceLastSuccess = Date.now() - lastHeartbeatSuccess;
      if (timeSinceLastSuccess > HEARTBEAT_FAILURE_THRESHOLD) {
        console.error(
          "[Background] Too many heartbeat failures, triggering session cleanup"
        );
        await cleanupSession();
        stopSessionHeartbeat();
        broadcastToTabs({ type: "session_expired" });
      }
    }
  }, 30000); // 30 seconds
};
```

### 2. **Enhanced Slave Backend Session Cleanup**

#### **More Aggressive Cleanup Intervals**

```javascript
// Set up periodic cleanup (every 15 minutes instead of 1 hour)
cleanupInterval = setInterval(async () => {
  try {
    await service.validateAndCleanCache();
    await cleanupStaleSessions();
    // Also run Redis session cleanup
  } catch (error) {
    console.error("❌ Cache cleanup service error:", error);
  }
}, 15 * 60 * 1000); // 15 minutes instead of 1 hour
```

#### **Enhanced Redis Session Cleanup**

```javascript
export const cleanupExpiredSessions = async () => {
  try {
    // Clean up sessions without recent heartbeat (more aggressive)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Find sessions in database that haven't had heartbeat in the last hour
    const staleSessions = await ClientSession.findAll({
      where: {
        status: "active",
        [Op.or]: [
          { last_heartbeat: null },
          {
            last_heartbeat: {
              [Op.lt]: oneHourAgo,
            },
          },
        ],
      },
    });

    // Clean up from both Redis and database
    for (const session of staleSessions) {
      // Redis cleanup
      const sessionKey = getSessionKey(session.session_token);
      const userSessionsKey = getUserSessionsKey(
        session.user_id,
        session.feature
      );
      const featureCountKey = getFeatureCountKey(
        session.license_cache_id,
        session.feature
      );

      const pipeline = redisClient.multi();
      pipeline.del(sessionKey);
      pipeline.sRem(userSessionsKey, session.session_token);
      pipeline.decr(featureCountKey);
      await pipeline.exec();

      // Database cleanup
      await ClientSession.update(
        {
          status: "expired",
          ended_at: new Date(),
        },
        {
          where: {
            session_token: session.session_token,
          },
        }
      );
    }

    // Scan for orphaned Redis keys
    await cleanupOrphanedRedisKeys();
  } catch (error) {
    console.error("[RedisSession] Error during cleanup:", error);
  }
};
```

### 3. **New Admin Endpoints for Session Management**

#### **Force Cleanup User Sessions (Slave Backend)**

```bash
DELETE /api/licenses/sessions/force-cleanup/:userId/:feature
```

- Force cleanup all sessions for a specific user
- Cleans up both Redis and database
- Useful for resolving stuck sessions

#### **Session Debug Information (Slave Backend)**

```bash
GET /api/licenses/sessions/debug?userId=123&feature=webrtc_extension
```

- Get detailed session information for debugging
- Shows active sessions, feature counts, and license status

#### **Manual Session Cleanup (Master Server)**

```bash
POST /api/licenses/cleanup-sessions
{
  "licenseId": "license_id",
  "userId": "optional_user_id",
  "feature": "optional_feature"
}
```

- Clean up stale sessions on master server
- Resolves inconsistencies between master and slave

#### **Session Statistics (Master Server)**

```bash
GET /api/licenses/:licenseId/session-stats
```

- Get comprehensive session statistics
- Monitor session health and activity

## How to Resolve Current Session Issues

### **Immediate Fix (Admin Action Required)**

1. **Identify the affected user** from the error message
2. **Use the force cleanup endpoint** to clear their sessions:

```bash
# Replace USER_ID with the actual user ID from the error
curl -X DELETE "http://localhost:8004/api/licenses/sessions/force-cleanup/USER_ID/webrtc_extension" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

3. **Check session debug information**:

```bash
curl "http://localhost:8004/api/licenses/sessions/debug?userId=USER_ID&feature=webrtc_extension" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### **Preventive Measures**

1. **Enhanced cleanup is now automatic** - runs every 15 minutes
2. **Chrome extension cleanup is more robust** - handles crashes and tab closures
3. **Redis cleanup is more aggressive** - removes orphaned keys
4. **Heartbeat failure detection** - automatically cleans up dead sessions

### **Monitoring Session Health**

1. **Check session counts regularly** using the debug endpoint
2. **Monitor Redis key counts** for orphaned sessions
3. **Review session statistics** on master server
4. **Watch for cleanup logs** in server console

## Testing the Fixes

### **Test Session Cleanup**

1. **Login with a user** and verify session is created
2. **Close the browser tab** without logging out
3. **Wait 10 seconds** for delayed cleanup
4. **Check session count** - should be reduced
5. **Try logging in again** - should work

### **Test Heartbeat Failure**

1. **Login with a user** and verify heartbeat is working
2. **Disconnect network** or stop the backend
3. **Wait 90 seconds** for heartbeat failure threshold
4. **Session should be automatically cleaned up**
5. **Reconnect network** and verify cleanup occurred

### **Test Extension Lifecycle**

1. **Login with a user** and verify session is active
2. **Close all browser tabs** with the extension
3. **Wait for cleanup** (10-second delay)
4. **Check session count** - should be reduced
5. **Reopen browser** and verify no ghost sessions

## Troubleshooting

### **Session Still Not Cleaning Up**

1. **Check Redis connectivity** - ensure Redis is running
2. **Verify cleanup service** - check if running every 15 minutes
3. **Check database connections** - ensure MySQL is accessible
4. **Review server logs** - look for cleanup errors

### **User Still Can't Login**

1. **Force cleanup their sessions** using admin endpoint
2. **Check session debug info** for stuck sessions
3. **Verify license limits** - ensure not actually at capacity
4. **Check Redis vs Database sync** - ensure counts match

### **Performance Issues**

1. **Reduce cleanup frequency** from 15 to 30 minutes if needed
2. **Batch cleanup operations** for large numbers of sessions
3. **Monitor Redis memory usage** - cleanup orphaned keys
4. **Check database query performance** - ensure indexes exist

## Future Enhancements

### **Planned Improvements**

1. **Real-time session monitoring** - WebSocket updates for admins
2. **Automatic session recovery** - reconnect users after network issues
3. **Session analytics dashboard** - detailed usage statistics
4. **Predictive cleanup** - identify sessions likely to become stale

### **Configuration Options**

1. **Configurable cleanup intervals** - adjust based on usage patterns
2. **Custom heartbeat thresholds** - different timeouts for different features
3. **Selective cleanup** - target specific session types or users
4. **Cleanup scheduling** - run during low-usage periods

## Conclusion

These fixes address the root causes of session inconsistencies by:

1. **Improving Chrome extension lifecycle management** - better cleanup on crashes and tab closures
2. **Enhancing backend cleanup services** - more aggressive and frequent cleanup
3. **Adding admin tools** - manual cleanup and debugging capabilities
4. **Implementing retry logic** - resilient cleanup even with network issues
5. **Better monitoring** - comprehensive session health tracking

The system should now automatically resolve most session issues and provide administrators with tools to handle any remaining inconsistencies.
