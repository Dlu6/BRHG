# CDR and Dashboard Metrics Fix

## Overview

This document describes critical fixes applied to the Call Detail Record (CDR) handling and dashboard metrics calculation to ensure accurate call statistics and abandon rate reporting.

## Issues Fixed

### 1. CDR Disposition Value Mismatch (ANSWERED vs NORMAL)

#### Problem

- Asterisk writes `"ANSWERED"` to CDR CSV files for successfully answered calls
- Our Node.js application was writing `"NORMAL"` to the MySQL database
- Dashboard queries were looking for `"ANSWERED"` disposition, causing **answered calls count to show 0**

#### Root Cause

In `callMonitoringService.js`, the `handleHangup` function was setting disposition to `"NORMAL"` instead of Asterisk's standard `"ANSWERED"` value:

```javascript
// OLD (incorrect)
const disposition = isNormal ? "NORMAL" : "NO ANSWER";
```

#### Solution

**Files Changed:**

- `mayday/slave-backend/services/callMonitoringService.js` (line 701)
- `mayday/slave-backend/controllers/adminStatsController.js`

**Changes Made:**

1. **callMonitoringService.js** - Changed disposition value to align with Asterisk standard:

```javascript
// NEW (correct)
const disposition = isNormal ? "ANSWERED" : "NO ANSWER";
```

2. **adminStatsController.js** - Updated queries to handle both values for backward compatibility:

```javascript
// Handle both "ANSWERED" (Asterisk standard) and "NORMAL" (legacy)
disposition: { [Op.in]: ["ANSWERED", "NORMAL"] },
```

**Impact:**

- ✅ Answered calls now display correctly on dashboard
- ✅ Single source of truth: Asterisk CDR CSV standard
- ✅ Backward compatible with existing "NORMAL" records

---

### 2. Abandon Rate Calculation (Inflated Numbers)

#### Problem

Abandon rate was showing **71.4%** (10 of 14 calls) when actual abandon rate should be much lower (~42.9%).

#### Root Cause

Asterisk creates **multiple CDR records per queue call**:

1. **Customer call record** (the actual call):

   ```
   src: "Maze_Bistro ~ 0700771301"  (external caller)
   lastapp: "Queue"
   disposition: "ANSWERED"
   billsec: 24  (actual talk time) ✅ Real call
   ```

2. **Internal queue mechanism record** (system bookkeeping):
   ```
   src: "0323300249"  (queue number itself)
   lastapp: "Queue"
   disposition: "ANSWERED"
   billsec: 0  (no talk time - just a system record) ⚠️ Not a real call
   ```

**The old logic was incorrectly counting internal queue records with `billsec=0` as abandoned calls!**

#### Solution

**Files Changed:**

- `mayday/slave-backend/controllers/adminStatsController.js`
- `mayday/slave-backend/services/callMonitoringService.js`

**Old Logic (Incorrect):**

```javascript
// Counted as abandoned:
// - NO ANSWER, BUSY, FAILED
// - ANSWERED/NORMAL with billsec=0 ❌ (internal records!)
const abandonedCalls = await CDR.count({
  where: {
    [Op.or]: [
      { disposition: "NO ANSWER" },
      { disposition: "BUSY" },
      { disposition: "FAILED" },
      {
        [Op.and]: [
          { disposition: { [Op.in]: ["ANSWERED", "NORMAL"] } },
          { billsec: 0 }, // ❌ This counted internal records
        ],
      },
    ],
  },
});
```

**New Logic (Correct):**

```javascript
// Only count TRUE abandoned calls:
// - NO ANSWER (caller hung up in queue)
// - BUSY
// - FAILED
// Exclude internal queue records (ANSWERED/NORMAL with billsec=0)
const abandonedCalls = await CDR.count({
  where: {
    [Op.or]: [
      { disposition: "NO ANSWER" },
      { disposition: "BUSY" },
      { disposition: "FAILED" },
    ],
  },
});
```

**Functions Updated:**

- `getCallStats()` - Main dashboard stats
- `getAbandonRateStats()` - Abandon rate calculation
- `getAbandonedCallsCount()` - Daily abandoned count
- `getWeeklyAbandonedCallsCount()` - Weekly abandoned count
- `getMonthlyAbandonedCallsCount()` - Monthly abandoned count
- Hourly breakdown SQL query

**Impact:**

- ✅ Accurate abandon rate reflecting true customer abandonments
- ✅ Removed false positives from internal Asterisk records
- ✅ Consistent calculation across all time periods (hourly, daily, weekly, monthly)

---

### 3. Chrome Extension Auto Re-registration After Page Refresh

#### Problem

When refreshing the browser page, the Chrome extension would become "Unregistered" and users had to manually click the Register button.

#### Root Cause

The `SoftphoneBar` component would re-mount on page refresh but didn't automatically re-register with the SIP server, even though user credentials were still stored.

#### Solution

**File Changed:**

- `mayday/chrome-softphone-extension/src/components/SoftphoneBar.jsx`

**Changes Made:**

Updated `initializeConnection()` function to:

1. Check for stored credentials (user + token) when component mounts
2. Auto re-register if user has valid credentials but status is "Unregistered"
3. Handle connection failures by attempting re-registration

```javascript
const initializeConnection = async () => {
  // Check if user has stored credentials
  const stored = await chrome.storage.local.get(["user", "token"]);
  const hasCredentials = stored.user && stored.token;

  chrome.runtime.sendMessage(
    { type: "get_registration_status" },
    (response) => {
      const status = response.registrationStatus || "Unregistered";

      // Auto re-register if user has credentials but is unregistered
      if (hasCredentials && status === "Unregistered") {
        setTimeout(() => {
          handleReregister();
        }, 1000); // 1-second delay for SIP service initialization
      }
    }
  );
};
```

**Impact:**

- ✅ Seamless user experience - no manual re-registration needed
- ✅ Extension automatically reconnects after page refresh
- ✅ Maintains SIP registration state across browser sessions

---

## Timezone Configuration Verification

### System-Wide Timezone: Africa/Nairobi (EAT, +0300)

All components consistently use the correct timezone:

| Component        | Timezone                         | Status     |
| ---------------- | -------------------------------- | ---------- |
| **System (VM)**  | Africa/Nairobi (EAT, +0300)      | ✅ Correct |
| **MySQL**        | SYSTEM (inherits Africa/Nairobi) | ✅ Correct |
| **Asterisk CDR** | System timezone (Africa/Nairobi) | ✅ Correct |
| **Node.js App**  | System timezone (Africa/Nairobi) | ✅ Correct |

**Verification Commands:**

```bash
# System timezone
timedatectl
# Output: Time zone: Africa/Nairobi (EAT, +0300)

# MySQL timezone
mysql -e "SELECT @@global.time_zone, @@session.time_zone;"
# Output: SYSTEM, SYSTEM (uses Africa/Nairobi)

# Compare times
date && mysql -e "SELECT NOW(), UTC_TIMESTAMP();"
```

**Impact:**

- ✅ All timestamps are consistent across the stack
- ✅ Hourly grouping displays correct local time (e.g., 09:00 PM = 21:00 EAT)
- ✅ No timezone conversion issues

---

## Deployment Instructions

### 1. Commit and Push Changes

```bash
cd /path/to/hugamara-portal
git add mayday/slave-backend/services/callMonitoringService.js
git add mayday/slave-backend/controllers/adminStatsController.js
git add mayday/chrome-softphone-extension/src/components/SoftphoneBar.jsx
git commit -m "Fix: CDR disposition and abandon rate calculation

- Changed CDR disposition from 'NORMAL' to 'ANSWERED' (Asterisk standard)
- Fixed abandon rate calculation to exclude internal queue records
- Added Chrome extension auto re-registration after page refresh
- Verified timezone consistency (Africa/Nairobi)"
git push origin development
```

### 2. Deploy to VM

```bash
# SSH to VM
ssh -i ~/Downloads/hugamara.pem admin@ec2-13-234-18-2.ap-south-1.compute.amazonaws.com

# Pull changes
cd /home/admin/hugamara-portal
git pull origin development

# Restart slave-backend service
pm2 restart slave-backend

# Verify service is running
pm2 status slave-backend
```

### 3. Verify Dashboard Metrics

After deployment, verify:

- ✅ Answered calls count is accurate
- ✅ Abandon rate is realistic (not inflated)
- ✅ Hourly breakdown shows correct timezone
- ✅ Chrome extension auto-registers after page refresh

---

## Testing Checklist

### CDR Disposition Test

1. Make a test call and answer it
2. Check MySQL CDR table:
   ```sql
   SELECT disposition, billsec FROM cdr ORDER BY start DESC LIMIT 1;
   ```
3. ✅ Should show `disposition = "ANSWERED"` with `billsec > 0`

### Abandon Rate Test

1. Check current abandon rate on dashboard
2. Verify calculation in database:

   ```sql
   -- Total calls today
   SELECT COUNT(*) FROM cdr WHERE DATE(start) = CURDATE();

   -- Abandoned calls (NO ANSWER, BUSY, FAILED only)
   SELECT COUNT(DISTINCT uniqueid) FROM cdr
   WHERE DATE(start) = CURDATE()
   AND disposition IN ('NO ANSWER', 'BUSY', 'FAILED');
   ```

3. ✅ Abandon rate should match: (abandoned / total) \* 100

### Chrome Extension Test

1. Login to Chrome extension
2. Verify SIP registration status shows "Registered"
3. Refresh the browser page
4. ✅ Extension should auto re-register (no manual button click needed)

---

## Known Issues and Considerations

### Multiple CDR Records Per Call

- Asterisk creates multiple CDR records for queue calls
- One record for the customer (with billsec > 0)
- One or more records for internal queue mechanics (with billsec = 0)
- **Important:** Only count external caller records for metrics

### Backward Compatibility

- Queries support both "ANSWERED" and "NORMAL" dispositions
- Existing records with "NORMAL" will still be counted
- New records will use "ANSWERED" (Asterisk standard)

---

## Related Files

### Backend

- `mayday/slave-backend/services/callMonitoringService.js` - CDR handling and stats
- `mayday/slave-backend/controllers/adminStatsController.js` - Dashboard API
- `mayday/slave-backend/models/cdr.js` - CDR model

### Frontend

- `mayday/mayday-client-dashboard/src/components/Dashboard.js` - Dashboard UI
- `mayday/mayday-client-dashboard/src/services/callStatsService.js` - API client

### Chrome Extension

- `mayday/chrome-softphone-extension/src/components/SoftphoneBar.jsx` - Main UI

---

## References

### Asterisk CDR Documentation

- CDR CSV Format: https://wiki.asterisk.org/wiki/display/AST/CDR+CSV
- Standard disposition values: ANSWERED, NO ANSWER, BUSY, FAILED, CONGESTION

### Timezone Configuration

- System: Africa/Nairobi (EAT, +0300)
- MySQL: Uses SYSTEM timezone
- All timestamps in EAT (East Africa Time)

---

**Document Version:** 1.0  
**Last Updated:** October 1, 2025  
**Author:** Development Team
