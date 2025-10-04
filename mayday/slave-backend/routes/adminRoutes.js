import express from "express";

// import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
import {
  getCallStats,
  getQueueActivity,
  getHistoricalStats,
  getAbandonRateStats,
} from "../controllers/adminStatsController.js";

// Apply authentication middleware to all admin routes
// router.use(authMiddleware);

// System health check routes
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
  });
});

// Redis health check
router.get("/health/redis", async (req, res) => {
  try {
    const redisClient = (await import("../config/redis.js")).default;

    if (redisClient?.isReady) {
      // Test Redis connection with a simple ping
      const pong = await redisClient.ping();
      res.json({
        status: "healthy",
        redis: "connected",
        ping: pong,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: "unhealthy",
        redis: "disconnected",
        timestamp: new Date().toISOString(),
        message: "Redis client is not ready",
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      redis: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Call statistics routes
router.get("/call-stats", getCallStats);
router.get("/queue-activity", getQueueActivity);
router.get("/historical-stats", getHistoricalStats);
router.get("/abandon-rate-stats", getAbandonRateStats);

export default router;
