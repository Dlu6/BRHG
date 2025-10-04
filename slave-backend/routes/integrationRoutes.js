import express from "express";
import {
  getAllIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  syncIntegrationData,
  getIntegrationMetrics,
  getIntegrationTemplates,
  getIntegrationData,
  exchangeZohoTokens,
  updateIntegrationRecord,
} from "../controllers/integrationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Test endpoint (temporary, for debugging)
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Integration routes are working!",
    timestamp: new Date().toISOString(),
  });
});

// Get all integrations
router.get("/", getAllIntegrations);

// Get integration templates
router.get("/templates", getIntegrationTemplates);

// Create new integration
router.post("/", createIntegration);

// OAuth helpers
router.post("/zoho/token", exchangeZohoTokens);

// Get integration by ID
router.get("/:id", getIntegrationById);

// Update integration
router.put("/:id", updateIntegration);

// Delete integration
router.delete("/:id", deleteIntegration);

// Test integration connection
router.post("/:id/test", testIntegration);

// Sync integration data
router.post("/:id/sync", syncIntegrationData);

// Get integration data
router.get("/:id/data", getIntegrationData);

// Update a specific record within an integration (e.g., update a Zoho contact phone)
router.put("/:id/data/:dataType/:externalId", updateIntegrationRecord);

// Get integration metrics
router.get("/:id/metrics", getIntegrationMetrics);

export default router;
