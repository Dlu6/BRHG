import express from "express";
import { getAmiState } from "../config/amiClient.js";
import sequelize from "../config/sequelize.js";
import redisClient from "../config/redis.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  updateSystem,
  getSystemInfo,
  getPublicConfig,
} from "../controllers/systemController.js";
import masterServerService from "../services/masterServerService.js";

const router = express.Router();

// Public health endpoint (no auth required) - comprehensive health check
router.get("/health", async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        http: true, // If we're responding, HTTP is working
        ami: false,
        database: false,
        redis: false,
      },
      details: {},
    };

    // Check AMI connection
    try {
      const amiState = getAmiState();
      healthStatus.services.ami = amiState.connected;
      healthStatus.details.ami = {
        connected: amiState.connected,
        status: amiState.connected
          ? "Connected to Asterisk"
          : "Disconnected from Asterisk",
      };
    } catch (error) {
      healthStatus.services.ami = false;
      healthStatus.details.ami = {
        connected: false,
        error: error.message,
        status: "AMI Error",
      };
    }

    // Check database connection
    try {
      await sequelize.authenticate();
      healthStatus.services.database = true;
      healthStatus.details.database = {
        connected: true,
        status: "Database Connected",
      };
    } catch (error) {
      healthStatus.services.database = false;
      healthStatus.details.database = {
        connected: false,
        error: error.message,
        status: "Database Error",
      };
    }

    // Check Redis connection
    try {
      await redisClient.ping();
      healthStatus.services.redis = true;
      healthStatus.details.redis = {
        connected: true,
        status: "Redis Connected",
      };
    } catch (error) {
      healthStatus.services.redis = false;
      healthStatus.details.redis = {
        connected: false,
        error: error.message,
        status: "Redis Error",
      };
    }

    // Determine overall health
    const criticalServices = ["http", "database"]; // AMI and Redis issues shouldn't mark backend as unhealthy
    const criticalServicesHealthy = criticalServices.every(
      (service) => healthStatus.services[service]
    );

    if (!criticalServicesHealthy) {
      healthStatus.status = "unhealthy";
    } else if (!healthStatus.services.ami || !healthStatus.services.redis) {
      healthStatus.status = "degraded"; // Some services down but core functionality works
    }

    // Add response time header for master server monitoring
    res.setHeader(
      "x-response-time",
      `${Date.now() - (req.startTime || Date.now())}ms`
    );

    res.status(healthStatus.status === "unhealthy" ? 503 : 200).json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        services: {
          http: true,
          ami: false,
          database: false,
          redis: false,
        },
      },
    });
  }
});

// Master server status (protected)
router.get("/master-status", authMiddleware, async (req, res) => {
  try {
    const masterStatus = masterServerService.getMasterServerStatus();

    res.status(200).json({
      success: true,
      data: masterStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get master server status",
      error: error.message,
    });
  }
});

// Existing authenticated routes
router.post("/update", authMiddleware, updateSystem);
router.get("/info", authMiddleware, getSystemInfo);
// Public config for UI placeholders
router.get("/public-config", getPublicConfig);

export default router;
