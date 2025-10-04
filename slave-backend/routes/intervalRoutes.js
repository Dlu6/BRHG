// intervalRoutes.js
import express from "express";
import {
  getAllIntervals,
  getIntervalById,
  createInterval,
  updateInterval,
  deleteInterval,
} from "../controllers/intervalController.js";

const router = express.Router();

// Get all intervals
router.get("/", getAllIntervals);

// Get interval by ID
router.get("/:id", getIntervalById);

// Create a new interval
router.post("/", createInterval);

// Update an interval
router.put("/:id", updateInterval);

// Delete an interval
router.delete("/:id", deleteInterval);

export default router;
