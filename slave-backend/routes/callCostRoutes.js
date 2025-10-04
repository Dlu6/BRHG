import express from "express";
import {
  getCallCostStats,
  getCallCostsByDateRange,
  getCostSummaryByTrunk,
  updateCallCostWithProvider,
  getCallCostByUniqueId,
  exportCallCostsToCSV,
} from "../controllers/callCostController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get call cost statistics
router.get("/stats", getCallCostStats);

// Get call costs by date range
router.get("/by-date-range", getCallCostsByDateRange);

// Get cost summary by trunk
router.get("/summary-by-trunk", getCostSummaryByTrunk);

// Get call cost details by unique ID
router.get("/:uniqueid", getCallCostByUniqueId);

// Export call costs to CSV
router.get("/export/csv", exportCallCostsToCSV);

// Update call cost with provider verification (admin only)
router.put("/update-provider-cost", isAdmin, updateCallCostWithProvider);

export default router;
