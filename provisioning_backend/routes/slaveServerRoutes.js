const express = require("express");
const {
  getAllSlaveServers,
  getSlaveServer,
  registerSlaveServer,
  updateSlaveServer,
  deleteSlaveServer,
  activateSlaveServer,
  deactivateSlaveServer,
  checkSlaveServerHealth,
  checkAllSlaveServersHealth,
  regenerateApiKeys,
  receiveSlaveServerPing,
  getSlaveServerConfig,
  selfRegisterSlaveServer, // New function for slave server self-registration
  clearSlaveServerRegistration, // Development helper
} = require("../controllers/slaveServerController.js");
const { protect, authorizeAdmin } = require("../middleware/auth.js");

const router = express.Router();

// Slave server self-registration route (no auth required)
router.post("/register-self", selfRegisterSlaveServer);

// Development helper: Clear existing registration (development only)
router.post("/clear-registration", clearSlaveServerRegistration);

// Admin routes - require authentication
router.get("/", protect, authorizeAdmin, getAllSlaveServers);
router.get("/:id", protect, authorizeAdmin, getSlaveServer);
router.post("/", protect, authorizeAdmin, registerSlaveServer);
router.put("/:id", protect, authorizeAdmin, updateSlaveServer);
router.delete("/:id", protect, authorizeAdmin, deleteSlaveServer);

// Status management routes
router.patch("/:id/activate", protect, authorizeAdmin, activateSlaveServer);
router.patch("/:id/deactivate", protect, authorizeAdmin, deactivateSlaveServer);

// Health monitoring routes
router.post(
  "/:id/health-check",
  protect,
  authorizeAdmin,
  checkSlaveServerHealth
);
router.post(
  "/health-check/all",
  protect,
  authorizeAdmin,
  checkAllSlaveServersHealth
);

// Security management routes
router.post("/:id/regenerate-keys", protect, authorizeAdmin, regenerateApiKeys);

// Slave server communication routes (no auth middleware - uses API key)
router.post("/ping", receiveSlaveServerPing);
router.get("/config", getSlaveServerConfig);

module.exports = router;
