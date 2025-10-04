const { ServerLicense, LicenseType } = require("../models/licenseModel");
const SlaveServer = require("../models/slaveServerModel");
const crypto = require("crypto");
const { emitLicenseUpdate } = require("../services/socketService");
const axios = require("axios");
// Note: Master server does not persist client sessions locally.
// All session operations are proxied to slave-backend.

// Helper to generate a unique license key
const generateLicenseKey = () => {
  return `MAYDAY-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
};

// License Type Management
exports.createLicenseType = async (req, res) => {
  try {
    const licenseType = new LicenseType(req.body);
    await licenseType.save();
    res.status(201).json({ success: true, data: licenseType });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getLicenseTypes = async (req, res) => {
  try {
    const licenseTypes = await LicenseType.find();
    res.status(200).json({ success: true, data: licenseTypes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateLicenseType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, max_concurrent_users, features, price_monthly } =
      req.body;

    const licenseType = await LicenseType.findById(id);

    if (!licenseType) {
      return res
        .status(404)
        .json({ success: false, error: "License type not found" });
    }

    // Update fields
    licenseType.name = name;
    licenseType.description = description;
    licenseType.max_concurrent_users = max_concurrent_users;
    licenseType.features = features;
    licenseType.price_monthly = price_monthly;

    await licenseType.save();

    res.status(200).json({ success: true, data: licenseType });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getAllFeatures = async (req, res) => {
  try {
    const { AllFeatures } = require("../utils/seedLicenseTypes");
    res.status(200).json({ success: true, data: AllFeatures });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// License Management
exports.generateLicense = async (req, res) => {
  try {
    const {
      organization_name,
      server_fingerprint,
      license_type_id,
      max_users,
      webrtc_max_users,
      issued_at,
      expires_at,
      slave_server_id,
    } = req.body;

    // Validate that server fingerprint is provided (should come from slave server)
    if (
      !server_fingerprint ||
      server_fingerprint === "placeholder_fingerprint_from_slave_server"
    ) {
      return res.status(400).json({
        success: false,
        error: "Server fingerprint must be provided by the slave server",
      });
    }

    const licenseType = await LicenseType.findById(license_type_id);
    if (!licenseType) {
      return res
        .status(404)
        .json({ success: false, error: "License type not found" });
    }

    const license = new ServerLicense({
      organization_name: organization_name,
      server_fingerprint: server_fingerprint,
      license_type_id: license_type_id,
      max_users,
      webrtc_max_users: webrtc_max_users || 0,
      issued_at,
      expires_at,
      license_key: generateLicenseKey(),
    });

    await license.save();

    // Emit a real-time update
    emitLicenseUpdate(license.server_fingerprint);

    res.status(201).json({ success: true, data: license });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getLicenses = async (req, res) => {
  try {
    const licenses = await ServerLicense.find().populate({
      path: "license_type_id",
      select: "name description max_concurrent_users features price_monthly",
    });

    // Transform the data to match frontend expectations
    const transformedLicenses = licenses.map((license) => {
      const licenseObj = license.toObject();
      // Add license_type field that frontend expects
      licenseObj.license_type = licenseObj.license_type_id;
      // Keep license_type_id as just the ID string
      licenseObj.license_type_id =
        licenseObj.license_type_id._id || licenseObj.license_type_id;
      return licenseObj;
    });

    res.status(200).json({ success: true, data: transformedLicenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLicenseById = async (req, res) => {
  try {
    const license = await ServerLicense.findById(req.params.id).populate({
      path: "license_type_id",
      select: "name description max_concurrent_users features price_monthly",
    });

    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Transform the data to match frontend expectations
    const licenseObj = license.toObject();
    licenseObj.license_type = licenseObj.license_type_id;
    // Keep license_type_id as just the ID string
    licenseObj.license_type_id =
      licenseObj.license_type_id._id || licenseObj.license_type_id;

    res.status(200).json({ success: true, data: licenseObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get license by server fingerprint (for slave servers)
exports.getLicenseByFingerprint = async (req, res) => {
  try {
    const { fingerprint } = req.params;

    const license = await ServerLicense.findOne({
      server_fingerprint: fingerprint,
      status: "active",
    }).populate({
      path: "license_type_id",
      select: "name description max_concurrent_users features price_monthly",
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        error: "No active license found for this server fingerprint",
      });
    }

    // Transform the data to match frontend expectations
    const licenseObj = license.toObject();
    licenseObj.license_type = licenseObj.license_type_id;
    // Keep license_type_id as just the ID string
    licenseObj.license_type_id =
      licenseObj.license_type_id._id || licenseObj.license_type_id;

    res.status(200).json({ success: true, data: licenseObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateLicense = async (req, res) => {
  try {
    const {
      organization_name,
      license_type_id,
      max_users,
      issued_at,
      expires_at,
    } = req.body;

    const license = await ServerLicense.findById(req.params.id);
    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Update fields
    license.organization_name = organization_name;
    license.license_type_id = license_type_id;
    license.max_users = max_users;
    license.issued_at = issued_at;
    license.expires_at = expires_at;

    // Always refresh features from the current license type to ensure latest features are included
    const newLicenseType = await LicenseType.findById(license_type_id);
    if (newLicenseType) {
      // Update WebRTC allocation if the license type has WebRTC extension
      const features =
        typeof newLicenseType.features === "string"
          ? JSON.parse(newLicenseType.features)
          : newLicenseType.features;

      if (features.webrtc_extension && !license.webrtc_max_users) {
        // Set default WebRTC allocation to max_users if not already set
        license.webrtc_max_users = Math.min(
          max_users,
          newLicenseType.max_concurrent_users || max_users
        );
      } else if (!features.webrtc_extension) {
        // Reset WebRTC allocation if license type doesn't support it
        license.webrtc_max_users = 0;
      }
    }

    await license.save();

    // Emit real-time update to slave servers
    emitLicenseUpdate(license.server_fingerprint);

    // Return populated license data so slave servers get updated features
    const populatedLicense = await ServerLicense.findById(license._id).populate(
      {
        path: "license_type_id",
        select: "name description max_concurrent_users features price_monthly",
      }
    );

    // Transform the data to match frontend expectations
    const licenseObj = populatedLicense.toObject();
    licenseObj.license_type = licenseObj.license_type_id;
    licenseObj.license_type_id =
      licenseObj.license_type_id._id || licenseObj.license_type_id;

    res.status(200).json({ success: true, data: licenseObj });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateLicenseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const license = await ServerLicense.findById(req.params.id);

    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    license.status = status;
    await license.save();

    // Emit real-time update to slave servers
    emitLicenseUpdate(license.server_fingerprint);

    res.status(200).json({ success: true, data: license });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateWebRTCAllocation = async (req, res) => {
  try {
    const { webrtc_max_users } = req.body;
    const license = await ServerLicense.findById(req.params.id);

    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Validate that webrtc_max_users is a non-negative number
    if (typeof webrtc_max_users !== "number" || webrtc_max_users < 0) {
      return res.status(400).json({
        success: false,
        error: "WebRTC max users must be a non-negative number",
      });
    }

    // Validate that webrtc_max_users doesn't exceed total license users
    if (webrtc_max_users > license.max_users) {
      return res.status(400).json({
        success: false,
        error: `WebRTC allocation cannot exceed total license users. You requested ${webrtc_max_users} users, but your license only supports ${license.max_users} total users. Please increase your license capacity first.`,
      });
    }

    license.webrtc_max_users = webrtc_max_users;
    await license.save();

    // Emit real-time update to slave servers
    emitLicenseUpdate(license.server_fingerprint);

    res.status(200).json({ success: true, data: license });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getLicenseUsers = async (req, res) => {
  try {
    const license = await ServerLicense.findById(req.params.id);
    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Get real user data from the slave server
    // The slave server has the actual user data with WebRTC typology information
    const slaveServerUrl =
      process.env.SLAVE_SERVER_URL || "http://localhost:8004";

    try {
      // Call the slave server's current license users endpoint
      const response = await axios.get(`${slaveServerUrl}/api/licenses/users`, {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
        },
      });

      const slaveData = response.data;

      if (slaveData.success) {
        res.status(200).json({ success: true, data: slaveData.data });
      } else {
        throw new Error(
          slaveData.message || "Failed to fetch users from slave server"
        );
      }
    } catch (slaveError) {
      console.error("Error fetching users from slave server:", slaveError);

      // Fallback: return empty array if slave server is unavailable
      res.status(200).json({
        success: true,
        data: [],
        message: "Slave server unavailable - no user data available",
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUserWebRTCAccess = async (req, res) => {
  try {
    const { licenseId, userId } = req.params;
    const { hasAccess } = req.body;

    const license = await ServerLicense.findById(licenseId);
    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Update user WebRTC access on the slave server
    const slaveServerUrl =
      process.env.SLAVE_SERVER_URL || "http://localhost:8004";

    try {
      // Call the slave server's user WebRTC access update endpoint
      const response = await axios.put(
        `${slaveServerUrl}/api/licenses/users/${userId}/webrtc-access`,
        { hasAccess },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
          },
        }
      );

      const slaveData = response.data;

      if (slaveData.success) {
        res.status(200).json({
          success: true,
          message:
            slaveData.message ||
            `User ${userId} WebRTC access ${
              hasAccess ? "enabled" : "disabled"
            }`,
        });
      } else {
        throw new Error(
          slaveData.message || "Failed to update user access on slave server"
        );
      }
    } catch (slaveError) {
      console.error("Error updating user access on slave server:", slaveError);

      // Fallback: return success but with warning
      res.status(200).json({
        success: true,
        message: `User ${userId} WebRTC access ${
          hasAccess ? "enabled" : "disabled"
        } (slave server unavailable - change may not be applied)`,
        warning:
          "Slave server unavailable - change may not be applied immediately",
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getWebRTCSessions = async (req, res) => {
  try {
    const license = await ServerLicense.findById(req.params.id);
    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Get real WebRTC session data from the slave server
    const slaveServerUrl =
      process.env.SLAVE_SERVER_URL || "http://localhost:8004";

    try {
      // Call the slave server's current license WebRTC sessions endpoint
      const response = await axios.get(
        `${slaveServerUrl}/api/licenses/webrtc-sessions`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
          },
        }
      );

      const slaveData = response.data;

      if (slaveData.success) {
        res.status(200).json({
          success: true,
          data: slaveData.data,
        });
      } else {
        throw new Error(
          slaveData.message ||
            "Failed to fetch WebRTC sessions from slave server"
        );
      }
    } catch (slaveError) {
      console.error(
        "Error fetching WebRTC sessions from slave server:",
        slaveError
      );

      // Fallback: return basic data structure with license info
      res.status(200).json({
        success: true,
        data: {
          current_sessions: 0,
          max_sessions: license.webrtc_max_users || 0,
          active_users: [],
          session_history: [],
        },
        message: "Slave server unavailable - showing basic license info only",
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Proxy: force end a specific WebRTC session on the slave-backend
exports.forceEndWebRTCSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const slaveServerUrl =
      process.env.SLAVE_SERVER_URL || "http://localhost:8004";

    const response = await axios.delete(
      `${slaveServerUrl}/api/licenses/webrtc-sessions/${sessionId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

exports.updateLicenseFingerprint = async (req, res) => {
  try {
    const { new_fingerprint, reason } = req.body;
    const license = await ServerLicense.findById(req.params.id);

    if (!license) {
      return res
        .status(404)
        .json({ success: false, error: "License not found" });
    }

    // Store the old fingerprint for audit purposes
    const oldFingerprint = license.server_fingerprint;

    // Update the fingerprint
    license.server_fingerprint = new_fingerprint;
    license.updated_at = new Date();

    await license.save();

    // Emit real-time update to slave servers with the new fingerprint
    emitLicenseUpdate(new_fingerprint);

    console.log(
      `License fingerprint updated for ${license.organization_name}:`
    );
    console.log(`  Old fingerprint: ${oldFingerprint}`);
    console.log(`  New fingerprint: ${new_fingerprint}`);
    console.log(`  Reason: ${reason || "hardware_change"}`);

    res.status(200).json({
      success: true,
      data: license,
      message:
        "Fingerprint updated successfully. Slave servers will sync automatically.",
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get server fingerprint from slave servers
exports.getServerFingerprint = async (req, res) => {
  try {
    // Get all active slave servers
    const slaveServers = await SlaveServer.find({ status: "active" });

    console.log(`Found ${slaveServers.length} active slave servers`);
    console.log(
      "Slave servers:",
      slaveServers.map((s) => ({
        id: s._id,
        name: s.name,
        status: s.status,
        api_url: s.api_url,
      }))
    );

    if (slaveServers.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No active slave servers found",
      });
    }

    const fingerprintResults = [];

    // Query each slave server for its fingerprint
    for (const server of slaveServers) {
      try {
        const response = await axios.get(`${server.api_url}/api/fingerprint`, {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
          },
          timeout: 5000, // 5 second timeout
        });

        if (response.data.success) {
          fingerprintResults.push({
            server_id: server._id,
            server_name: server.name,
            server_url: server.api_url,
            fingerprint: response.data.data.fingerprint,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(
          `Error getting fingerprint from ${server.name}:`,
          error.message
        );
        fingerprintResults.push({
          server_id: server._id,
          server_name: server.name,
          server_url: server.api_url,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        fingerprints: fingerprintResults,
        total_servers: slaveServers.length,
        successful_queries: fingerprintResults.filter((r) => !r.error).length,
        failed_queries: fingerprintResults.filter((r) => r.error).length,
      },
    });
  } catch (error) {
    console.error("Error getting server fingerprints:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Handle session activity notifications from slave servers
exports.handleSessionActivity = async (req, res) => {
  try {
    const {
      action,
      licenseId,
      userId,
      username,
      feature,
      sessionId,
      timestamp,
    } = req.body;

    if (!action || !licenseId || !userId || !username || !feature) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: action, licenseId, userId, username, feature",
      });
    }

    // Log session activity for monitoring (only for session creation/termination)
    if (action === "session_created" || action === "session_ended") {
      console.log(
        `📊 Session ${action}: User ${username} (${userId}) - Feature: ${feature}`
      );
    }

    // Emit real-time update to admin panels
    emitLicenseUpdate(licenseId);

    res.status(200).json({
      success: true,
      message: `Session activity logged: ${action}`,
      data: {
        action,
        licenseId,
        userId,
        username,
        feature,
        sessionId,
        timestamp,
      },
    });
  } catch (error) {
    console.error("Error handling session activity:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Manual session cleanup for resolving inconsistencies
exports.cleanupStaleSessions = async (req, res) => {
  try {
    const { licenseId, userId, feature } = req.body;

    if (!licenseId) {
      return res.status(400).json({
        success: false,
        error: "License ID is required",
      });
    }

    // Find the server license
    const serverLicense = await ServerLicense.findById(licenseId);
    if (!serverLicense) {
      return res.status(404).json({
        success: false,
        error: "License not found",
      });
    }

    // Proxy cleanup to slave-backend (master doesn't hold session records)
    const slaveServerUrl =
      process.env.SLAVE_SERVER_URL || "http://localhost:8004";
    try {
      const response = await axios.delete(
        `${slaveServerUrl}/api/licenses/sessions/force-cleanup/${
          userId || "all"
        }/${feature || "webrtc_extension"}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
          },
        }
      );

      const data = response.data || {};
      // Emit real-time update to admin panels regardless of slave response
      emitLicenseUpdate(licenseId);

      return res.status(200).json({
        success: true,
        message: data.message || "Cleanup request sent to slave server",
        data: {
          licenseId,
          userId: userId || null,
          feature: feature || "webrtc_extension",
          slaveResponse: data,
          cleanedAt: new Date().toISOString(),
        },
      });
    } catch (slaveError) {
      console.error(
        "Error proxying cleanup to slave server:",
        slaveError.message
      );
      return res.status(502).json({
        success: false,
        error: "Failed to cleanup sessions on slave server",
        details: slaveError.response?.data || slaveError.message,
      });
    }
  } catch (error) {
    console.error("Error cleaning up stale sessions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get session statistics for monitoring (proxied to slave-backend)
exports.getSessionStats = async (req, res) => {
  try {
    const { licenseId } = req.params;

    if (!licenseId) {
      return res.status(400).json({
        success: false,
        error: "License ID is required",
      });
    }

    const slaveServerUrl =
      process.env.SLAVE_SERVER_URL || "http://localhost:8004";

    try {
      const response = await axios.get(
        `${slaveServerUrl}/api/licenses/webrtc-sessions`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
          },
        }
      );

      const data = response.data?.data || {};
      const currentSessions = data.current_sessions || 0;
      const activeUsers = Array.isArray(data.active_users)
        ? data.active_users
        : [];

      const sessionStats = [
        {
          _id: "active",
          count: currentSessions,
          features: ["webrtc_extension"],
        },
      ];

      const activeSessionsByFeature = [
        {
          _id: "webrtc_extension",
          count: currentSessions,
          users: activeUsers.map((u) => u.user_id).filter(Boolean),
        },
      ];

      res.status(200).json({
        success: true,
        message: "Session statistics retrieved",
        data: {
          licenseId,
          sessionStats,
          activeSessionsByFeature,
          recentActivity: [],
          retrievedAt: new Date().toISOString(),
        },
      });
    } catch (slaveError) {
      console.warn(
        "Failed to retrieve session stats from slave:",
        slaveError.message
      );
      res.status(200).json({
        success: true,
        message: "Slave server unavailable - returning empty statistics",
        data: {
          licenseId,
          sessionStats: [],
          activeSessionsByFeature: [],
          recentActivity: [],
          retrievedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("Error getting session statistics:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
