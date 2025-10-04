# Changelog

All notable changes to the Mayday Call Center System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - October 1, 2025

#### Dashboard Analytics Fixes (CRITICAL)

##### Weekly > Monthly Stats Bug

- **Problem**: Weekly stats (123 abandoned calls) illogically exceeded monthly stats (8 abandoned calls)
- **Root Cause**: Week calculation started on Sunday which could fall in previous month, including previous month's calls in weekly total
- **Solution**: Cap week start at current month start when Sunday falls in previous month
- **Files Changed**:
  - `mayday/electron-softphone/src/components/DashboardView.jsx` - Lines 689-702 (fetchAgentPerformanceData)
  - `mayday/slave-backend/services/callMonitoringService.js` - Lines 156-160, 247-251 (weekly count functions)
- **Impact**: ✅ Weekly stats now logically subset of monthly stats

##### Timezone Bug (UTC+3)

- **Problem**: Agent call statistics showing wrong day's data from midnight-3AM
- **Root Cause**: `toISOString()` converts local midnight to UTC, shifting date backward for positive UTC offsets
- **Solution**: Format dates using local year/month/day components without UTC conversion
- **Files Changed**:
  - `mayday/electron-softphone/src/components/DashboardView.jsx` - Lines 672-704, 1061-1075
  - `mayday/slave-backend/controllers/cdrController.js` - Lines 342-356
- **Impact**: ✅ Correct data displayed 24/7 for UTC+3 timezone

##### Monthly Range Fix

- **Problem**: "Monthly" tab showing "last 30 days" instead of current month
- **Solution**: Changed to calculate from first day of current month (Oct 1) to today
- **Files Changed**:
  - `mayday/electron-softphone/src/components/DashboardView.jsx` - Lines 695-700
- **Impact**: ✅ Monthly stats now show actual calendar month

##### Loading Indicator Fix

- **Problem**: Loading spinner never stops if WebSocket connection fails
- **Solution**: Added 5-second hard timeout and 2-second fallback timeout
- **Files Changed**:
  - `mayday/electron-softphone/src/components/DashboardView.jsx` - Lines 736-766
- **Impact**: ✅ Loading indicator always stops, preventing stuck UI

##### Answered Calls Calculation

- **Problem**: Week/month views missing answered calls count
- **Solution**: Calculate as `totalCalls - abandonedCalls`
- **Files Changed**:
  - `mayday/electron-softphone/src/components/DashboardView.jsx` - Lines 800, 817
- **Impact**: ✅ Complete statistics in all time period views

#### CDR Disposition Value Standardization

- **Problem**: Dashboard showing 0 answered calls despite calls being answered
- **Root Cause**: Node.js app writing `"NORMAL"` while Asterisk uses `"ANSWERED"`
- **Solution**: Aligned CDR disposition with Asterisk standard
- **Files Changed**:
  - `mayday/slave-backend/services/callMonitoringService.js` - Line 701
  - `mayday/slave-backend/controllers/adminStatsController.js` - Multiple queries
- **Impact**: ✅ Answered calls now display correctly on dashboard
- **Details**: [CDR_AND_METRICS_FIX.md](slave-backend/docs/CDR_AND_METRICS_FIX.md#1-cdr-disposition-value-mismatch-answered-vs-normal)

#### Abandon Rate Calculation Fix

- **Problem**: Abandon rate showing 71.4% when actual rate should be ~42.9%
- **Root Cause**: Counting internal Asterisk queue records (billsec=0) as abandoned calls
- **Solution**: Refined logic to only count true abandoned dispositions (NO ANSWER, BUSY, FAILED)
- **Files Changed**:
  - `mayday/slave-backend/controllers/adminStatsController.js` - `getCallStats()`, `getAbandonRateStats()`, hourly breakdown
  - `mayday/slave-backend/services/callMonitoringService.js` - `getAbandonedCallsCount()`, weekly/monthly functions
- **Impact**: ✅ Accurate abandon rate reflecting true customer abandonments
- **Details**: [CDR_AND_METRICS_FIX.md](slave-backend/docs/CDR_AND_METRICS_FIX.md#2-abandon-rate-calculation-inflated-numbers)

#### Chrome Extension Auto Re-registration

- **Problem**: Extension showing "Unregistered" after browser page refresh
- **Root Cause**: Component re-mounting without checking stored credentials
- **Solution**: Auto re-register on mount if credentials exist but status is "Unregistered"
- **Files Changed**:
  - `mayday/chrome-softphone-extension/src/components/SoftphoneBar.jsx` - `initializeConnection()`
- **Impact**: ✅ Seamless user experience - no manual re-registration needed
- **Details**: [CDR_AND_METRICS_FIX.md](slave-backend/docs/CDR_AND_METRICS_FIX.md#3-chrome-extension-auto-re-registration-after-page-refresh)

### Verified - October 1, 2025

#### Timezone Consistency

- **Verification**: All system components use Africa/Nairobi (EAT, +0300)
- **Components Checked**:
  - System (VM): ✅ Africa/Nairobi
  - MySQL: ✅ SYSTEM (inherits Africa/Nairobi)
  - Asterisk CDR: ✅ System timezone
  - Node.js App: ✅ System timezone
- **Impact**: ✅ Consistent timestamps across all components
- **Details**: [CDR_AND_METRICS_FIX.md](slave-backend/docs/CDR_AND_METRICS_FIX.md#timezone-configuration-verification)

---

## Deployment Status

### Pending

- [ ] Deploy dashboard analytics fixes to production
- [ ] Restart slave-backend service on VM to apply all fixes

### Completed

- [x] Fixed weekly > monthly stats logic bug (CRITICAL)
- [x] Fixed timezone conversion bug for UTC+3
- [x] Fixed monthly range calculation
- [x] Fixed loading indicator timeout
- [x] Fixed answered calls calculation
- [x] Fixed CDR disposition value mismatch
- [x] Updated adminStatsController.js queries for backward compatibility
- [x] Fixed abandon rate calculation logic
- [x] Added Chrome extension auto re-registration
- [x] Verified timezone consistency
- [x] Consolidated documentation (deleted 16 redundant .md files)
- [x] Updated CHANGELOG.md and README.md
- [x] Committed changes to development branch

---

## Known Issues

### Asterisk Multiple CDR Records

- **Issue**: Asterisk creates multiple CDR records per queue call (customer record + internal bookkeeping)
- **Impact**: Metrics must account for this by filtering on `billsec > 0` for customer-facing records
- **Status**: Documented and handled in current implementation

### Backward Compatibility

- **Issue**: Existing records may have `disposition = "NORMAL"`
- **Impact**: Queries updated to accept both "ANSWERED" and "NORMAL"
- **Status**: Resolved with backward-compatible queries

---

## Future Enhancements

### Proposed

- [ ] Add CDR data cleanup job for old records
- [ ] Implement real-time abandon rate monitoring
- [ ] Add configurable timezone settings per tenant
- [ ] Create admin dashboard for CDR quality verification

---

**Note**: For detailed technical documentation, see [CDR_AND_METRICS_FIX.md](slave-backend/docs/CDR_AND_METRICS_FIX.md)
