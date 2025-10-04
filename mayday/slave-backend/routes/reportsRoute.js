import express from "express";

import { sipAuthMiddleware } from "../middleware/sipAuth.js";
import {
  getBillingAnalysis,
  getCallDetail,
  getCallVolumeAnalytics,
  getCustomReport,
  getPerformanceMetrics,
  getQualityMetrics,
  getQueueAnalytics,
  getSystemHealthMetrics,
  downloadReport,
  getCallVolume,
  getAgentPerformance,
  getQueueDistribution,
  getSLACompliance,
  exportReport,
  getAgentCallDetails,
  previewReport,
  // Asterisk CDR based handlers (aliases for clarity)
  getCallVolumeAsterisk,
  getAgentPerformanceAsterisk,
  getAgentCallDetailsAsterisk,
  getQueueDistributionAsterisk,
  getSLAComplianceAsterisk,
  getMyPerformanceStats,
} from "../controllers/reportsController.js";
import { validateDateRange } from "../middleware/dateValidation.js";

const router = express.Router();

// Base route prefix: /api/v1/reports

// Call Detail Reports
router.get("/calls/:callId", getCallDetail);

// Quality Metrics
router.get("/quality", validateDateRange, getQualityMetrics);

// Call Volume Analytics
router.get("/volume", validateDateRange, getCallVolumeAnalytics);

// Billing Analysis
router.get("/billing", validateDateRange, getBillingAnalysis);

// Performance Metrics
router.get("/performance", validateDateRange, getPerformanceMetrics);

// Queue Analytics
router.get("/queues", validateDateRange, getQueueAnalytics);

// Custom Reports
router.post("/custom", validateDateRange, getCustomReport);

// System Health Metrics
router.get("/system-health", validateDateRange, getSystemHealthMetrics);

router.get("/:type/download", validateDateRange, downloadReport);

// Call volume data
router.get("/call-volume", getCallVolume);

// Agent performance data
router.get("/agent-performance", getAgentPerformance);

// Agent call details
router.get("/agent-call-details", getAgentCallDetails);

// Queue distribution data
router.get("/queue-distribution", getQueueDistribution);

// SLA compliance data
router.get("/sla-compliance", getSLACompliance);

// ========= Explicit Asterisk CDR endpoints =========
router.get("/call-volume-asterisk", getCallVolumeAsterisk);
router.get("/performance-asterisk", getAgentPerformanceAsterisk);
router.get("/agent-call-details-asterisk", getAgentCallDetailsAsterisk);
router.get("/queue-distribution-asterisk", getQueueDistributionAsterisk);
router.get("/sla-compliance-asterisk", getSLAComplianceAsterisk);

// Export report data as CSV
router.get("/export", exportReport);

// Preview report data
router.get("/preview", previewReport);

// Data availability
import { getDataAvailability } from "../controllers/reportsController.js";
router.get("/availability", getDataAvailability);

// New route for mobile dashboard
router.get("/my-performance", sipAuthMiddleware, getMyPerformanceStats);

export default router;
