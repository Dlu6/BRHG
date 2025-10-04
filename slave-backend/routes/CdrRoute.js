import express from "express";
import {
  getCallHistory,
  getCallCountsByExtension,
  getCallHistoryWithRealNumbers,
} from "../controllers/cdrController.js";
import { sipAuthMiddleware } from "../middleware/sipAuth.js";

const router = express.Router();

// Get call history
router.get("/call-history", getCallHistory);

// Get call history with real caller numbers (enhanced)
router.get("/call-history-real", getCallHistoryWithRealNumbers);

// Get call history with pagination and filtering
router.get("/history", sipAuthMiddleware, getCallHistory);

// Get call counts by extension
router.get(
  "/counts",
  // sipAuthMiddleware,
  getCallCountsByExtension
);

export default router;
