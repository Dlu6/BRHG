// routes/trunkRoutes.js
import express from "express";
import {
  createTrunk,
  updateTrunk,
  deleteTrunk,
  getTrunks,
  getTrunkById,
  checkTrunkBalance,
  updateTrunkBalanceInfo,
  getTrunkBalance,
} from "../controllers/trunkController.js";

const router = express.Router();

router.post("/create", createTrunk);
router.get("/read", getTrunks);
router.get("/:trunkId", getTrunkById);
router.put("/update/:trunkId", updateTrunk);
router.delete("/delete/:trunkId", deleteTrunk);

// Balance-related routes
router.get("/:trunkId/balance", getTrunkBalance);
router.post("/:trunkId/balance/check", checkTrunkBalance);
router.put("/:trunkId/balance/info", updateTrunkBalanceInfo);

export default router;
