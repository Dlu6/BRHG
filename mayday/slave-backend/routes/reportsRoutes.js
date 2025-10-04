import express from "express";
import {
  getCallVolume,
  getPerformanceMetrics,
  getQueueDistribution,
  getSLACompliance,
  getAgentCallDetails,
  exportReport,
  previewReport,
  // Asterisk CDR-based endpoints
  getCallVolumeAsterisk,
  getAgentPerformanceAsterisk,
  getAgentCallDetailsAsterisk,
  getQueueDistributionAsterisk,
  getSLAComplianceAsterisk,
} from "../controllers/reportsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get call volume data
router.get("/call-volume", getCallVolume);

// Get performance metrics
router.get("/performance", getPerformanceMetrics);

// Get queue distribution
router.get("/queue-distribution", getQueueDistribution);

// Get SLA compliance
router.get("/sla-compliance", getSLACompliance);

// Get agent call details
router.get("/agent-call-details", getAgentCallDetails);

// Export reports
router.get("/export", exportReport);

// Preview reports
router.get("/preview", previewReport);

// ========== ASTERISK CDR-BASED ROUTES ==========

// Get call volume from Asterisk CDR
router.get("/call-volume-asterisk", getCallVolumeAsterisk);

// Get performance metrics from Asterisk CDR
router.get("/performance-asterisk", getAgentPerformanceAsterisk);

// Get queue distribution from Asterisk CDR
router.get("/queue-distribution-asterisk", getQueueDistributionAsterisk);

// Get SLA compliance from Asterisk CDR
router.get("/sla-compliance-asterisk", getSLAComplianceAsterisk);

// Get agent call details from Asterisk CDR
router.get("/agent-call-details-asterisk", getAgentCallDetailsAsterisk);

export default router;
