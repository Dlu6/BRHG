import express from "express";
import {
  verifyBalanceForCall,
  getBalanceVerificationStatus,
  estimateCallCostForDestination,
} from "../controllers/balanceVerificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Verify balance before allowing a call
router.post("/verify-call", verifyBalanceForCall);

// Get balance verification status for a trunk
router.get("/status", getBalanceVerificationStatus);

// Estimate call cost for a destination
router.get("/estimate-cost", estimateCallCostForDestination);

export default router;
