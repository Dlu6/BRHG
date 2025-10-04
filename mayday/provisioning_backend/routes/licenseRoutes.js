const express = require("express");
const router = express.Router();
const {
  createLicenseType,
  getLicenseTypes,
  generateLicense,
  getLicenses,
  getLicenseById,
  getLicenseByFingerprint,
  updateLicense,
  updateLicenseStatus,
  updateWebRTCAllocation,
  getLicenseUsers,
  updateUserWebRTCAccess,
  getWebRTCSessions,
  forceEndWebRTCSession,
  updateLicenseFingerprint,
  handleSessionActivity,
  getServerFingerprint,
  updateLicenseType,
  getAllFeatures,
  cleanupStaleSessions,
  getSessionStats,
} = require("../controllers/licenseController");

// Middleware for authentication
const { protect, authorizeAdmin } = require("../middleware/auth");
const { protectOrInternal } = require("../middleware/authMiddleware");

// Helper middleware for admin authorization that works with both JWT and internal API
const authorizeAdminOrInternal = (req, res, next) => {
  // For internal API calls, skip admin authorization
  if (req.isInternal) {
    return next();
  }
  // For JWT calls, require admin authorization
  return authorizeAdmin(req, res, next);
};

// License Type Routes
router
  .route("/types")
  .post(protect, authorizeAdmin, createLicenseType)
  .get(getLicenseTypes); // Remove authentication for GET license types

router.route("/types/:id").put(protect, authorizeAdmin, updateLicenseType);

router.route("/features").get(getAllFeatures);

// License Routes
router.route("/").get(protectOrInternal, getLicenses);
router
  .route("/generate")
  .post(protectOrInternal, authorizeAdminOrInternal, generateLicense);
router.route("/fingerprint").get(protectOrInternal, getServerFingerprint);
router
  .route("/fingerprint/:fingerprint")
  .get(protectOrInternal, getLicenseByFingerprint);
router.route("/:id").get(protectOrInternal, getLicenseById);
router
  .route("/:id")
  .put(protectOrInternal, authorizeAdminOrInternal, updateLicense);
router
  .route("/:id/status")
  .put(protectOrInternal, authorizeAdminOrInternal, updateLicenseStatus);
router
  .route("/:id/fingerprint")
  .put(protectOrInternal, authorizeAdminOrInternal, updateLicenseFingerprint);
router
  .route("/:id/webrtc-allocation")
  .put(protectOrInternal, authorizeAdminOrInternal, updateWebRTCAllocation);

// WebRTC Session Endpoint for Slave Servers
router.route("/:id/webrtc-sessions").get(protectOrInternal, getWebRTCSessions);
// Backward-compatible endpoint used by frontend to end a session
router
  .route("/:licenseId/webrtc-sessions/:sessionId/end")
  .post(protectOrInternal, authorizeAdminOrInternal, forceEndWebRTCSession);
// Proxy to slave to force end a specific WebRTC session
router
  .route("/webrtc-sessions/:sessionId")
  .delete(protectOrInternal, authorizeAdminOrInternal, forceEndWebRTCSession);

// User Management Routes (for WebRTC access)
router.route("/:id/users").get(protectOrInternal, getLicenseUsers);
router
  .route("/:licenseId/users/:userId/webrtc-access")
  .put(protectOrInternal, authorizeAdminOrInternal, updateUserWebRTCAccess);

// Session Activity Endpoint for Slave Servers (internal use only)
router
  .route("/session-activity")
  .post(protectOrInternal, handleSessionActivity);

// Session Management and Cleanup Routes (admin only)
router
  .route("/cleanup-sessions")
  .post(protect, authorizeAdmin, cleanupStaleSessions);

router
  .route("/:licenseId/session-stats")
  .get(protect, authorizeAdmin, getSessionStats);

module.exports = router;
