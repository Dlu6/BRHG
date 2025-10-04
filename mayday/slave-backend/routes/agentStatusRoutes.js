import express from "express";
import {
  getAgentStatus,
  getAgentStatusByExtension,
  refreshAgentStatus,
  getAgentStatusSummary,
  refreshAgentList,
  getServiceHealth,
} from "../controllers/agentStatusController.js";

const router = express.Router();

// Get current status for all agents
router.get("/", getAgentStatus);

// Get status summary (counts only)
router.get("/summary", getAgentStatusSummary);

// Get service health
router.get("/health", getServiceHealth);

// Force refresh status (manual poll)
router.post("/refresh", refreshAgentStatus);

// Refresh agent list from database
router.post("/refresh-agents", refreshAgentList);

// Get status for specific agent by extension
router.get("/:extension", getAgentStatusByExtension);

export default router;
