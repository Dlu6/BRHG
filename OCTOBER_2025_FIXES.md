# October 2025 Dashboard & Call System Fixes

**Date:** October 2, 2025  
**Status:** ✅ ALL FIXES COMPLETE AND PRODUCTION READY

This document consolidates all fixes made to the Electron Softphone and Dashboard system during the October 2025 development sprint.

---

## Table of Contents

1. [Dashboard Fixes](#1-dashboard-fixes)
2. [Agent Call Statistics Fix](#2-agent-call-statistics-fix)
3. [Call History Phone Number Fix](#3-call-history-phone-number-fix)
4. [Dashboard Refresh Button Fix](#4-dashboard-refresh-button-fix)
5. [Session Recovery Loop Fix](#5-session-recovery-loop-fix)
6. [Inbound Call Ringtone Fix](#6-inbound-call-ringtone-fix)

---

## 1. Dashboard Fixes

### Problem

The DashboardView component had three critical issues:

1. **Active Agents Not Loading**: The active agents list wasn't populating properly
2. **SIP Reconnection Errors**: "Configuration object is missing" errors when switching tabs
3. **No Inbound/Outbound Call Differentiation**: Dashboard lacked visibility into call direction metrics

### Root Cause

**Issue 1 & 2:** The `DashboardView.jsx` component was prematurely disconnecting services in its `useEffect` cleanup function, causing:

- Services to disconnect when component unmounted/re-rendered
- SIP service to lose configuration
- WebSocket connections to drop unnecessarily

**Issue 3:** The backend `callMonitoringService.js` wasn't querying CDR records by `dcontext` to differentiate inbound vs outbound calls.

### Solution

#### Frontend Changes (`DashboardView.jsx`)

1. **Removed Premature Service Disconnection:**

```javascript
// BEFORE (BROKEN):
useEffect(() => {
  // ... setup code
  return () => {
    callMonitoringService.disconnect(); // ❌ BAD
    sipService.disconnect(); // ❌ BAD
  };
}, [open]);

// AFTER (FIXED):
useEffect(() => {
  // ... setup code
  return () => {
    // ✅ No disconnection - let connectionManager handle lifecycle
  };
}, [open]);
```

2. **Added Inbound/Outbound Call Display:**

```javascript
const getTimeRangeStats = useMemo(() => {
  return {
    totalCalls: stats.totalCalls,
    answeredCalls: stats.answeredCalls,
    abandonedCalls: stats.abandonedCalls,
    inboundCalls: stats.inboundCalls, // ✅ NEW
    outboundCalls: stats.outboundCalls, // ✅ NEW
    // ... other stats
  };
}, [stats, timeRange]);
```

#### Backend Changes (`callMonitoringService.js`)

1. **Added Inbound/Outbound Call Counting:**

```javascript
// Query inbound calls by dcontext
const getInboundCallsCount = async (startDate) => {
  return await CDR.count({
    where: {
      start: { [Op.gte]: startDate },
      dcontext: { [Op.in]: ["from-pstn", "from-trunk"] },
    },
  });
};

// Query outbound calls by dcontext
const getOutboundCallsCount = async (startDate) => {
  return await CDR.count({
    where: {
      start: { [Op.gte]: startDate },
      dcontext: { [Op.in]: ["from-internal", "outbound-routes"] },
    },
  });
};
```

2. **Parallel Query Execution for Performance:**

```javascript
// Execute all queries in parallel
const [totalCalls, abandonedCalls, inboundCalls, outboundCalls /* ... */] =
  await Promise.all([
    getTotalCallsCount(),
    getAbandonedCallsCount(),
    getInboundCallsCount(todayStart),
    getOutboundCallsCount(todayStart),
    // ... other queries
  ]);
```

#### Service Layer Updates (`callMonitoringServiceElectron.js`)

Updated default stats to include new fields:

```javascript
const defaultStats = {
  // ... existing fields
  inboundCalls: 0,
  outboundCalls: 0,
  weeklyInboundCalls: 0,
  weeklyOutboundCalls: 0,
  monthlyInboundCalls: 0,
  monthlyOutboundCalls: 0,
};
```

### Files Modified

1. `mayday/electron-softphone/src/components/DashboardView.jsx`
2. `mayday/slave-backend/services/callMonitoringService.js`
3. `mayday/electron-softphone/src/services/callMonitoringServiceElectron.js`

### Results

✅ Active agents now load consistently  
✅ No more SIP reconnection errors  
✅ Clear visibility into inbound vs outbound call metrics  
✅ Improved performance with parallel queries

---

## 2. Agent Call Statistics Fix

### Problem

Individual agent call statistics in the "Active Agents" section were showing 0 for all agents, despite calls being logged in the CDR database.

### Root Cause

The CDR records in the Asterisk database had `billsec = 0` or negative values for answered calls, but the backend query was filtering them out:

```javascript
// BROKEN QUERY:
const answeredCalls = await CDR.count({
  where: {
    ...whereConditions,
    disposition: "ANSWERED",
    billsec: { [Op.gt]: 0 }, // ❌ Excludes billsec=0 records
  },
});
```

### Investigation

Connected to the VM and verified CDR structure:

```sql
SELECT disposition, billsec, COUNT(*)
FROM cdr
WHERE DATE(start) = CURDATE()
GROUP BY disposition, billsec;

-- Result showed many ANSWERED calls with billsec=0
```

### Solution

#### Backend Changes

**File: `cdrController.js`**

1. **Fixed Answered Calls Count:**

```javascript
// Count all ANSWERED calls regardless of billsec
const answeredCalls = await CDR.count({
  where: {
    ...whereConditions,
    disposition: "ANSWERED", // ✅ No billsec filter
  },
});
```

2. **Fixed Average Call Duration:**

```javascript
// Use ABS for billsec and filter zeros for average
const callDurationResult = await CDR.findOne({
  attributes: [
    [
      sequelize.fn("AVG", sequelize.fn("ABS", sequelize.col("billsec"))),
      "avgDuration",
    ],
  ],
  where: {
    ...whereConditions,
    disposition: "ANSWERED",
    billsec: { [Op.ne]: 0 }, // ✅ Exclude zeros only for average
  },
  raw: true,
});
```

**File: `adminStatsController.js`**

```javascript
// Handle both ANSWERED and NORMAL dispositions
const answeredCalls = await CDR.count({
  where: {
    start: { [Op.gte]: todayStart },
    disposition: { [Op.in]: ["ANSWERED", "NORMAL"] }, // ✅ Both types
  },
});
```

#### Frontend Changes

**File: `DashboardView.jsx`**

Fixed date range parameters:

```javascript
// Pass both startDate and endDate
const response = await callHistoryService.getCallCountsByExtension(
  ext,
  todayStr,
  todayStr // ✅ Added endDate parameter
);
```

### Files Modified

1. `mayday/slave-backend/controllers/cdrController.js`
2. `mayday/slave-backend/controllers/adminStatsController.js`
3. `mayday/electron-softphone/src/components/DashboardView.jsx`

### Results

✅ Agent call statistics now show correct counts  
✅ Average call duration calculated properly  
✅ Handles both positive and zero billsec values  
✅ Compatible with Asterisk CDR quirks

---

## 3. Call History Phone Number Fix

### Problem

The Call History component (`CallHistory.jsx`) was showing the agent's extension instead of the actual caller/callee phone number for all calls.

### Root Cause

Two issues were identified:

1. **Masked Caller ID in `src` field**: Asterisk was storing a masked caller ID in the `src` field instead of the actual phone number
2. **Invalid `userfield` data**: The `userfield` contained "s" (invalid) instead of the phone number
3. **Incorrect call direction detection**: Outbound calls were being classified as "Incoming"

### Investigation

Examined CDR records and found:

- `src` field: Extension or masked ID (e.g., "1009", "Main")
- `userfield`: Often contained "s" or empty
- `dcontext`: Contained actual phone number in many cases
- `channel`: Format like "PJSIP/1009-00000123" shows actual extension

### Solution

#### Backend Changes (`cdrController.js`)

1. **Enhanced Phone Number Extraction:**

```javascript
// Validate userfield contains actual phone number (at least 5 digits)
const callerNumber =
  userfieldParts[0] && userfieldParts[0].match(/^\d{5,}$/)
    ? userfieldParts[0]
    : null;
```

2. **Fixed Call Direction Detection:**

```javascript
// Extract extension from channel field
const channelExtension =
  record.channel && record.channel.startsWith("PJSIP/")
    ? record.channel.split("-")[0].replace("PJSIP/", "")
    : null;

// Determine if outbound based on channel or src
const isOutbound = channelExtension === extension || record.src === extension;
const type = isOutbound ? "outbound" : "inbound";
```

3. **Comprehensive Number Extraction Logic:**

```javascript
if (isOutbound) {
  // For outbound: try dst, dnid, lastdata, clid
  phoneNumber = callerNumber || record.dst;
  if (!phoneNumber || phoneNumber.length <= 4) {
    phoneNumber =
      record.dnid || record.lastdata || extractFromClid(record.clid);
  }
} else {
  // For inbound: try userfield, src, connectedlinenum, callerid
  phoneNumber = callerNumber || record.src;
  if (!phoneNumber || phoneNumber === extension) {
    phoneNumber =
      record.connectedlinenum || extractFromCallerid(record.callerid);
  }
}
```

### Files Modified

1. `mayday/slave-backend/controllers/cdrController.js`

### Results

✅ Call History now shows correct phone numbers  
✅ Call direction (inbound/outbound) correctly identified  
✅ Handles masked caller IDs properly  
✅ Works with various CDR field configurations

---

## 4. Dashboard Refresh Button Fix

### Problem

The dashboard refresh button caused an infinite loop of re-renders, making the dashboard unusable.

### Root Cause

**Circular Dependency in useCallback:**

```javascript
// BROKEN CODE:
const fetchAgentCallCounts = useCallback(() => {
  // ... uses stats
}, [stats]); // ❌ Recreated when stats changes

useEffect(() => {
  fetchAgentCallCounts();
}, [fetchAgentCallCounts]); // ❌ Re-runs when function recreated

// RESULT: stats update → function recreated → effect re-runs → stats update → LOOP!
```

### Solution

**Implemented useRef Pattern for Stable Function References:**

```javascript
// Create ref to hold the latest function
const fetchAgentCallCountsRef = useRef();

// Update ref with function that accesses stats directly
fetchAgentCallCountsRef.current = async () => {
  if (!stats?.activeAgents?.length) return;

  // Access stats directly - no dependency needed
  const updatedAgents = await Promise.all(
    stats.activeAgents.map(async (agent) => {
      const response = await callHistoryService.getCallCountsByExtension(
        agent.extension,
        todayStr,
        todayStr
      );
      return { ...agent, callCount: response.data.totalCalls };
    })
  );

  setStats((prev) => ({ ...prev, activeAgents: updatedAgents }));
};

// Create stable callback with empty dependencies
const fetchAgentCallCounts = useCallback(() => {
  return fetchAgentCallCountsRef.current();
}, []); // ✅ Empty deps = stable reference

// useEffect only depends on 'open', not on stats or the function
useEffect(() => {
  if (!open || !canInitializeServices() || window.apiCallsBlocked) {
    return;
  }

  fetchAgentCallCounts(); // Initial fetch

  const interval = setInterval(() => {
    if (open && canInitializeServices() && !window.apiCallsBlocked) {
      fetchAgentCallCounts();
    }
  }, 60000);

  return () => clearInterval(interval);
}, [open]); // ✅ Only depends on open
```

**Enhanced Refresh Handler:**

```javascript
const handleRefresh = async () => {
  setRefreshing(true);

  // 1. Disconnect WebSocket
  callMonitoringService.disconnect();

  // 2. Clear stats
  setStats(callMonitoringService.getDefaultStats());

  // 3. Wait for cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 4. Reconnect WebSocket
  await setupSocket();

  // 5. Fetch fresh data
  await fetchInitialStats();
  await fetchAgentPerformanceData();

  // 6. Refresh agent call counts
  await fetchAgentCallCounts();

  setRefreshing(false);
};
```

### Files Modified

1. `mayday/electron-softphone/src/components/DashboardView.jsx`

### Results

✅ Refresh button works without infinite loops  
✅ Stable function references prevent unnecessary re-renders  
✅ Clean dependency management  
✅ Predictable component behavior

---

## 5. Session Recovery Loop Fix

### Problem

The session recovery manager was stuck in an infinite "Verifying restoration..." loop even though the dashboard was working perfectly and showing data correctly.

### Symptoms

- ✅ Dashboard loads and displays data correctly
- ✅ WebSocket connected
- ✅ SIP registered
- ✅ All services working
- ❌ But "Verifying restoration..." notification persists
- ❌ Shows "Attempt 1/5", "Attempt 2/5", etc. and keeps retrying

### Root Cause

**Recovery-Refresh Circular Loop:**

```
1. Recovery completes → emits recovery:completed
2. Dashboard receives event → calls handleRefresh()
3. handleRefresh() disconnects callMonitoringService
4. Recovery manager checks health → sees monitoring disconnected
5. Throws "System still unhealthy after restoration"
6. Schedules another recovery attempt
7. LOOP! 🔄♾️
```

The issue was that `callMonitoringService` was being treated as **critical** for system health, but the dashboard's refresh handler legitimately disconnects it to force fresh data.

### Solution

**Made Call Monitoring Service Non-Critical:**

```javascript
// sessionRecoveryManager.js

// Check Call Monitoring (OPTIONAL - not critical for session health)
if (services.callMonitoringService) {
  const monitoringConnected = services.callMonitoringService.isConnected();
  health.services.monitoring = monitoringConnected;

  // NOTE: callMonitoringService is not critical for session health
  // It can reconnect independently and doesn't affect authentication or SIP
  // Only log a warning if disconnected, don't mark system as unhealthy
  if (!monitoringConnected) {
    console.warn("[Recovery] Call monitoring disconnected (non-critical)");
    // ✅ DON'T set health.isHealthy = false
    // ✅ DON'T add to health.issues
  }
}
```

**Critical vs Non-Critical Services:**

| Service         | Critical? | Reason                                         |
| --------------- | --------- | ---------------------------------------------- |
| SIP Service     | ✅ Yes    | Required for making/receiving calls            |
| WebSocket       | ✅ Yes    | Required for real-time updates                 |
| Call Monitoring | ❌ No     | Dashboard feature, can reconnect independently |

### Files Modified

1. `mayday/electron-softphone/src/services/sessionRecoveryManager.js`

### Results

✅ No more infinite verification loops  
✅ Dashboard refresh works without triggering recovery  
✅ Recovery focuses on critical services (SIP, WebSocket)  
✅ Call monitoring can disconnect/reconnect freely

---

## 6. Inbound Call Ringtone Fix

### Problem

The ringtone for inbound calls was not playing continuously while the call was ringing. Instead, it only played for a split second when the user answered the call.

### Expected vs Actual Behavior

**Expected:**

1. 📞 Inbound call arrives
2. 🔊 Ringtone starts playing in a loop
3. 🔂 Ringtone continues until user answers or call ends
4. ✅ User answers call
5. 🔇 Ringtone stops immediately
6. 💬 Call proceeds normally

**Actual (Before Fix):**

1. 📞 Inbound call arrives
2. 🔇 No ringtone plays (or very brief)
3. ✅ User answers call
4. 🔊 Ringtone briefly plays for ~1 second
5. 🔇 Ringtone stops
6. 💬 Call proceeds

### Root Cause

**React Hooks Dependency Problem - useEffect Cleanup Loop:**

```javascript
// BROKEN CODE:
useEffect(() => {
  const handleCallEvents = {
    "call:incoming": (data) => {
      updateCallState({ direction: 'inbound', state: 'ringing' }); // Changes dependencies!
      safePlayAudio(ringtoneMp3, 0.8);
    }
  };

  sipService.events.on("call:incoming", handleCallEvents["call:incoming"]);

  return () => {
    sipService.events.off("call:incoming", ...);
    safeStopAudio(); // ❌ STOPS AUDIO WHEN EFFECT RE-RUNS
  };
}, [sipService, callState.direction, callState.state, safeStopAudio]);
// ⬆️ These dependencies cause the effect to re-run when state changes

// THE PROBLEM FLOW:
// 1. call:incoming fires → starts audio
// 2. updateCallState changes direction/state
// 3. useEffect dependencies changed → effect re-runs
// 4. Cleanup runs FIRST → stops audio! 💥
// 5. Event listeners re-registered (but audio already stopped)
```

### Solution

**Removed State from useEffect Dependencies:**

```javascript
// FIXED CODE:
useEffect(() => {
  const handleCallEvents = {
    "call:incoming": (data) => {
      updateCallState({ direction: 'inbound', state: 'ringing' });
      safePlayAudio(ringtoneMp3, 0.8);
    }
  };

  sipService.events.on("call:incoming", handleCallEvents["call:incoming"]);

  return () => {
    sipService.events.off("call:incoming", ...);
    // ✅ NO safeStopAudio() here
    // Audio stops explicitly in session state handlers
  };
}, [sipService, safePlayAudio, safeStopAudio, updateCallState, callState.session]);
// ✅ Removed callState.direction and callState.state from dependencies
```

**Key Changes:**

1. **Removed state from dependencies** - Prevents effect from re-running on state changes
2. **Removed cleanup audio stops** - Audio only stops when session explicitly says to
3. **Maintained stable function references** - Event handlers access state through closures

### Files Modified

1. `mayday/electron-softphone/src/hooks/useCallState.js`
   - Removed `callState.direction` and `callState.state` from session state useEffect dependencies
   - Removed `callState.direction` and `callState.state` from call events useEffect dependencies
   - Removed `safeStopAudio()` calls from cleanup functions
   - Audio now only stops when session state is `Established` or `Terminated`

### Production Readiness

**Debug Logs Removed:**

All debug console logs have been removed for production deployment:

- 🔊 Audio playback logs ("Play requested", "Starting playback", "Successfully playing")
- 🔇 Audio stop logs ("Stop requested", "Setting desired=false", "Audio stopped and reset")
- 🔔 Inbound call logs ("Incoming call detected", "Starting ringtone playback NOW")
- ✅ Session state logs ("Call established", "Ringtone already playing")
- 📞 Call state logs ("Call establishing", "Call state updated")
- 🔄 Cleanup logs ("useEffect cleanup (not stopping audio)")

**Retained Logs:**

- Error logs only: "Error playing audio", "No audio element available"

### Results

✅ Ringtone plays continuously for inbound calls  
✅ Ringtone stops immediately when call is answered  
✅ No more audio race conditions  
✅ Production-ready with clean logging  
✅ No linting errors

---

## Summary

### Issues Fixed

| #   | Issue                                   | Impact | Status   |
| --- | --------------------------------------- | ------ | -------- |
| 1   | Dashboard service disconnection         | High   | ✅ Fixed |
| 2   | Agent call statistics showing 0         | High   | ✅ Fixed |
| 3   | Incorrect phone numbers in call history | Medium | ✅ Fixed |
| 4   | Refresh button infinite loop            | High   | ✅ Fixed |
| 5   | Session recovery infinite loop          | Medium | ✅ Fixed |
| 6   | Inbound ringtone not playing            | High   | ✅ Fixed |

### Production Readiness Checklist

- ✅ All debug logs removed
- ✅ No linting errors
- ✅ Performance optimized
- ✅ Error handling preserved
- ✅ User-tested and verified
- ✅ Documentation complete

### Key Learnings

1. **Service Lifecycle Management**: Let centralized managers (connectionManager) handle service lifecycle, not individual components
2. **React Hooks Dependencies**: Be careful with useEffect dependencies - state changes can cause unnecessary re-renders
3. **useRef Pattern**: Use refs for stable function references that need access to latest state
4. **Critical vs Non-Critical Services**: Not all services need to be critical for system health
5. **Audio Playback**: Audio cleanup should be explicit, not automatic in component lifecycle
6. **CDR Database Quirks**: Asterisk CDR can have unexpected data (zero billsec for answered calls, masked IDs)

---

**End of Documentation**
