import { Router } from "express";
import {
  getCurrentLicense,
  manualSyncLicense,
  getServerFingerprint,
  getFingerprintHistory,
  validateUserSession,
  createUserSession,
  atomicSessionSetup,
  endUserSession,
  getSessionCount,
  generateClientSessionToken,
  getAllFeatures,
  getWebRTCSessions,
  getLicenseUsers,
  updateUserWebRTCAccess,
  updateWebRTCAllocation,
  cleanupUserSessions,
  validateLicense,
  forceCleanupUserSessions,
  getSessionDebugInfo,
  forceEndWebRTCSession,
} from "../controllers/licenseController.js";
import authMiddleware, { isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// Secure all routes with basic authentication EXCEPT /validate
router.use((req, res, next) => {
  // Skip authentication for license validation endpoint
  if (req.path === "/validate") {
    return next();
  }
  // Apply authentication for all other routes
  return authMiddleware(req, res, next);
});

// ========== SLAVE SERVER LICENSE ROUTES ==========
// These routes are for slave server operations only

// Get current license status (main endpoint for dashboards)
router.get("/current", getCurrentLicense);

// Manual sync from master server (admin only)
router.post("/sync", isAdmin, manualSyncLicense);

// Get server fingerprint for license requests
router.get("/fingerprint", getServerFingerprint);

// Get fingerprint change history (admin only)
router.get("/fingerprint/history", isAdmin, getFingerprintHistory);

// Get available features from cached license
router.get("/features", getAllFeatures);

// ========== ONE-TIME LICENSE VALIDATION ==========
// For Electron clients that need one-time validation instead of real-time WebSocket

// One-time license validation for Electron clients
router.post("/validate", validateLicense);

// ========== SESSION MANAGEMENT ==========
// User session validation and creation for WebRTC Extension

// Atomic session setup - eliminates race condition (RECOMMENDED)
router.post("/sessions/atomic-setup", authMiddleware, atomicSessionSetup);

// Validate user session before creating (LEGACY - use atomic-setup instead)
router.post("/sessions/validate", validateUserSession);

// Create new user session (LEGACY - use atomic-setup instead)
router.post("/sessions/create", createUserSession);

// End user session
router.post("/sessions/end", endUserSession);

// Manual cleanup of user sessions (admin only)
router.delete(
  "/sessions/cleanup/:userId/:feature",
  isAdmin,
  cleanupUserSessions
);

// Force cleanup of all sessions for a specific user (admin only)
router.delete(
  "/sessions/force-cleanup/:userId/:feature",
  isAdmin,
  forceCleanupUserSessions
);

// Get session debug information (admin only)
router.get("/sessions/debug", isAdmin, getSessionDebugInfo);

// Generate session token for existing user
router.post("/sessions/generate-token", generateClientSessionToken);

// Get session count for monitoring
router.get("/sessions/count", getSessionCount);

// ========== ADMIN PANEL WEBRTC MANAGEMENT ==========
// Routes for managing WebRTC users and sessions from admin panel

// Get WebRTC sessions for current license (admin only) - for master server communication
router.get("/webrtc-sessions", isAdmin, getWebRTCSessions);

// Get WebRTC sessions and active users for a license (admin only)
router.get("/:licenseId/webrtc-sessions", isAdmin, getWebRTCSessions);

// Get all users for current license (admin only) - for master server communication
router.get("/users", isAdmin, getLicenseUsers);

// Get all users for a specific license (admin only) - for backward compatibility
router.get("/:licenseId/users", isAdmin, getLicenseUsers);

// Update user WebRTC access for current license (admin only) - for master server communication
router.put("/users/:userId/webrtc-access", isAdmin, updateUserWebRTCAccess);

// Update user WebRTC access (admin only) - for backward compatibility
router.put(
  "/:licenseId/users/:userId/webrtc-access",
  isAdmin,
  updateUserWebRTCAccess
);

// Force end a specific WebRTC session by sessionId (admin only)
router.delete("/webrtc-sessions/:sessionId", isAdmin, forceEndWebRTCSession);

// Update WebRTC allocation for a license (admin only)
router.put("/:licenseId/webrtc-allocation", isAdmin, updateWebRTCAllocation);

// ========== LEGACY ROUTES (for backward compatibility) ==========
// These routes maintain compatibility with existing code

// Legacy route for getting current license
router.get("/", getCurrentLicense);

export default router;
