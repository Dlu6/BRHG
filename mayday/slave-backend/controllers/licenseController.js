import createLicenseService from "../services/licenseService.js";
import { generateFingerprint as generateServerFingerprint } from "../utils/serverFingerprinting.js";
import { ClientSession, FingerprintHistory } from "../models/licenseModel.js";
import redisClient from "../config/redis.js";
import sequelize, { Op } from "../config/sequelize.js";
import * as redisSessionService from "../services/redisSessionService.js";
import crypto from "crypto";
import fetch from "node-fetch";

const licenseService = createLicenseService();

// Get current license status (simplified for slave server)
export const getCurrentLicense = async (req, res) => {
  try {
    const license = await licenseService.getCurrentLicense();
    const currentFingerprint = await generateServerFingerprint();

    if (!license) {
      return res.status(200).json({
        licensed: false,
        message: "No license found on this server.",
        serverFingerprint: currentFingerprint,
      });
    }

    // Get WebRTC allocation info
    const webrtcAllocation = {
      webrtc_max_users: license.webrtc_max_users || 0,
      activeSessions: await ClientSession.count({
        where: {
          license_cache_id: license.id,
          status: "active",
          feature: "webrtc_extension",
        },
      }),
    };

    // Enhanced license response
    const enhancedLicense = {
      id: license.id,
      master_license_id: license.master_license_id, // Add this for UI detection
      organization_name: license.organization_name,
      license_type: {
        name: license.license_type_name,
        features: license.features,
      },
      status: license.status,
      max_users: license.max_users,
      webrtc_max_users: license.webrtc_max_users,
      issued_at: license.issued_at,
      expires_at: license.expires_at,
      server_fingerprint: license.server_fingerprint,
      current_fingerprint: currentFingerprint,
      webrtc_allocation: webrtcAllocation,
      sync_status: license.sync_status,
      last_sync: license.last_sync,
    };

    // Log license information
    console.log(
      `[License] Returning license: ${license.organization_name} (ID: ${license.id})`
    );
    console.log(`[License] Stored fingerprint: ${license.server_fingerprint}`);
    console.log(`[License] Current fingerprint: ${currentFingerprint}`);
    console.log(
      `[License] Fingerprint match: ${
        license.server_fingerprint === currentFingerprint
      }`
    );
    console.log(`[License] Sync status: ${license.sync_status}`);

    res.status(200).json({
      licensed: true,
      license: enhancedLicense,
      external_managed: license.master_license_id !== 0, // 0 = development license
    });
  } catch (error) {
    console.error("Error fetching current license:", error);
    res.status(500).json({
      message: "Failed to fetch current license",
      error: error.message,
    });
  }
};

// Manual sync from master server
export const manualSyncLicense = async (req, res) => {
  try {
    console.log("🔄 Manual license sync requested...");

    const syncResult = await licenseService.syncLicenseFromMaster();

    if (syncResult.success) {
      console.log("✅ License sync successful");
      res.status(200).json({
        success: true,
        message: "License synchronized successfully",
        license: syncResult.license,
      });
    } else {
      console.log("⚠️ License sync failed");
      res.status(500).json({
        success: false,
        message: "License synchronization failed",
        error: syncResult.error,
      });
    }
  } catch (error) {
    console.error("❌ Manual sync error:", error);
    res.status(500).json({
      success: false,
      message: "License synchronization failed",
      error: error.message,
    });
  }
};

// Get server fingerprint for license requests
export const getServerFingerprint = async (req, res) => {
  try {
    const fingerprint = await generateServerFingerprint();
    res.status(200).json({
      success: true,
      fingerprint: fingerprint,
    });
  } catch (error) {
    console.error("Error generating server fingerprint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate server fingerprint",
      error: error.message,
    });
  }
};

// Get fingerprint history for debugging
export const getFingerprintHistory = async (req, res) => {
  try {
    const history = await FingerprintHistory.findAll({
      order: [["changed_at", "DESC"]],
      limit: 10,
    });

    res.status(200).json({
      success: true,
      history: history,
    });
  } catch (error) {
    console.error("Error fetching fingerprint history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fingerprint history",
      error: error.message,
    });
  }
};

// Atomic session validation and creation to prevent race conditions
export const validateUserSession = async (req, res) => {
  try {
    const { username, clientFingerprint, feature } = req.body;
    const userId = req.user?.id;

    if (!username || !clientFingerprint || !feature) {
      return res.status(400).json({
        success: false,
        message: "Username, client fingerprint, and feature are required",
      });
    }

    // Get current license
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "No active license found for this server",
      });
    }

    if (license.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `License is ${license.status}. Please contact your administrator.`,
      });
    }

    // Check if feature is enabled in license
    let features = {};
    if (license.features) {
      try {
        features =
          typeof license.features === "string"
            ? JSON.parse(license.features)
            : license.features;
      } catch (error) {
        console.error("Error parsing license features:", error);
        features = {};
      }
    }
    const featureEnabled = features[feature];

    if (!featureEnabled) {
      return res.status(403).json({
        success: false,
        message: `Feature '${feature}' is not enabled in your license plan: ${license.license_type_name}`,
      });
    }

    // Use Redis for atomic session checking
    const sessionCheck = await redisSessionService.hasActiveSession(
      userId,
      feature
    );

    if (sessionCheck.hasSession) {
      // Get the actual session data to check fingerprint
      const sessionValidation = await redisSessionService.validateSession(
        sessionCheck.sessionId,
        clientFingerprint
      );

      if (sessionValidation.valid) {
        // Update last heartbeat
        await redisSessionService.updateHeartbeat(sessionCheck.sessionId);

        return res.status(200).json({
          success: true,
          message: "Session validated successfully",
          session: sessionValidation.session,
        });
      } else {
        // Different device - end the conflicting session
        try {
          await redisSessionService.endSession(
            sessionCheck.sessionId,
            userId,
            feature
          );
          console.log(
            `[Session] Ended conflicting session ${sessionCheck.sessionId} for user ${userId} during validation`
          );
        } catch (endError) {
          console.warn(
            `[Session] Failed to end conflicting session during validation:`,
            endError
          );
        }

        return res.status(200).json({
          success: true,
          message: "Session validation passed, ready to create session",
          canCreateSession: true,
          license: {
            organization: license.organization_name,
            type: license.license_type_name,
            webrtcMaxUsers:
              feature === "webrtc_extension" ? license.webrtc_max_users : null,
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Session validation passed, ready to create session",
      canCreateSession: true,
      license: {
        organization: license.organization_name,
        type: license.license_type_name,
        webrtcMaxUsers:
          feature === "webrtc_extension" ? license.webrtc_max_users : null,
      },
    });
  } catch (error) {
    console.error("Error validating user session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate session",
      error: error.message,
    });
  }
};

// Create user session atomically using Redis
export const createUserSession = async (req, res) => {
  try {
    const { username, clientFingerprint, feature } = req.body;
    const userId = req.user?.id;

    if (!username || !clientFingerprint || !feature) {
      return res.status(400).json({
        success: false,
        message: "Username, client fingerprint, and feature are required",
      });
    }

    // Get current license
    const license = await licenseService.getCurrentLicense();

    if (!license || license.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "No active license found for this server",
      });
    }

    // Check feature is enabled
    let features = {};
    if (license.features) {
      try {
        features =
          typeof license.features === "string"
            ? JSON.parse(license.features)
            : license.features;
      } catch (error) {
        console.error("Error parsing license features:", error);
        features = {};
      }
    }
    const featureEnabled = features[feature];

    if (!featureEnabled) {
      return res.status(403).json({
        success: false,
        message: `Feature '${feature}' is not enabled in your license`,
      });
    }

    // Double-check for existing active session using Redis (atomic)
    const sessionCheck = await redisSessionService.hasActiveSession(
      userId,
      feature
    );

    if (sessionCheck.hasSession) {
      // Additional check for fingerprint if session exists
      if (sessionCheck.sessionData?.client_fingerprint !== clientFingerprint) {
        return res.status(409).json({
          success: false,
          message:
            "User is already logged in from a different device. Only one session per user is allowed.",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "User already has an active session. Only one session per user is allowed.",
      });
    }

    // Check user limits using Redis for accurate count
    let maxUsers = license.max_users;
    if (feature === "webrtc_extension") {
      maxUsers = license.webrtc_max_users || 0;
    }

    const currentSessions = await redisSessionService.getFeatureCount(
      license.id,
      feature
    );

    if (currentSessions >= maxUsers) {
      return res.status(429).json({
        success: false,
        message: `Maximum user limit reached (${maxUsers} users). Please wait for another user to log out.`,
      });
    }

    // Generate unique session ID
    const sessionId = crypto.randomBytes(16).toString("hex");

    // Create session atomically in Redis
    const sessionResult = await redisSessionService.createSession({
      sessionId,
      userId,
      username: username,
      feature,
      clientFingerprint,
      licenseId: license.id,
      ipAddress:
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });

    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to create session",
        error: sessionResult.error,
      });
    }

    // Create session token
    const sessionToken = await licenseService.generateClientToken(
      license.id,
      userId,
      clientFingerprint,
      username
    );

    console.log(
      `✅ Session ${sessionId} created successfully for user ${userId} (${username})`
    );

    res.status(201).json({
      success: true,
      message: "Session created successfully",
      sessionToken,
      sessionId: sessionId,
      maxUsers,
      currentUsers: sessionResult.currentCount,
      license: {
        organization: license.organization_name,
        type: license.license_type_name,
      },
    });
  } catch (error) {
    console.error("❌ Error creating user session:", error);

    // Clean up any partial session creation
    try {
      if (typeof sessionId !== "undefined") {
        await redisSessionService.endSession(sessionId, userId, feature);
      }
    } catch (cleanupError) {
      console.error("Error during session cleanup:", cleanupError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to create session",
      error: error.message,
    });
  }
};

// Atomic session validation and creation - eliminates race condition
export const atomicSessionSetup = async (req, res) => {
  try {
    const { username, clientFingerprint, feature } = req.body;
    const userId = req.user?.id;

    if (!username || !clientFingerprint || !feature) {
      return res.status(400).json({
        success: false,
        message: "Username, client fingerprint, and feature are required",
      });
    }

    // Get current license
    const license = await licenseService.getCurrentLicense();

    if (!license || license.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "No active license found for this server",
      });
    }

    // Check if feature is enabled in license
    let features = {};
    if (license.features) {
      try {
        features =
          typeof license.features === "string"
            ? JSON.parse(license.features)
            : license.features;
      } catch (error) {
        console.error("Error parsing license features:", error);
        features = {};
      }
    }
    const featureEnabled = features[feature];

    if (!featureEnabled) {
      return res.status(403).json({
        success: false,
        message: `Feature '${feature}' is not enabled in your license plan: ${license.license_type_name}`,
      });
    }

    // Check for existing session and handle appropriately
    const sessionCheck = await redisSessionService.hasActiveSession(
      userId,
      feature
    );

    if (sessionCheck.hasSession) {
      // Get the actual session data to check fingerprint
      const sessionValidation = await redisSessionService.validateSession(
        sessionCheck.sessionId,
        clientFingerprint
      );

      if (sessionValidation.valid) {
        // Same device, update existing session heartbeat
        await redisSessionService.updateHeartbeat(sessionCheck.sessionId);

        return res.status(200).json({
          success: true,
          message: "Existing session validated successfully",
          sessionId: sessionCheck.sessionId,
          license: {
            organization: license.organization_name,
            type: license.license_type_name,
          },
        });
      } else {
        // Different device or invalid session
        // First, let's end the existing session to allow new login
        try {
          await redisSessionService.endSession(
            sessionCheck.sessionId,
            userId,
            feature
          );
          console.log(
            `[Session] Ended conflicting session ${sessionCheck.sessionId} for user ${userId}`
          );
        } catch (endError) {
          console.warn(
            `[Session] Failed to end conflicting session:`,
            endError
          );
        }

        // Now proceed with creating a new session
      }
    }

    // Check user limits
    let maxUsers = license.max_users;
    if (feature === "webrtc_extension") {
      maxUsers = license.webrtc_max_users || 0;
    }

    const currentSessions = await redisSessionService.getFeatureCount(
      license.id,
      feature
    );

    if (currentSessions >= maxUsers) {
      return res.status(429).json({
        success: false,
        message: `Maximum user limit reached (${maxUsers} users). Please wait for another user to log out.`,
      });
    }

    // Generate unique session ID
    const sessionId = crypto.randomBytes(16).toString("hex");

    // Create session atomically in Redis
    const sessionResult = await redisSessionService.createSession({
      sessionId,
      userId,
      username: username,
      clientFingerprint: clientFingerprint,
      licenseId: license.id,
      feature: feature,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    if (!sessionResult.success) {
      console.error(`[Session] Failed to create session:`, sessionResult.error);
      return res.status(500).json({
        success: false,
        message: "Failed to create session",
        error: sessionResult.error,
      });
    }

    // Notify master server about session creation
    try {
      const masterServerUrl =
        process.env.LICENSE_MGMT_API_URL || "http://localhost:8001/api";
      await fetch(`${masterServerUrl}/licenses/session-activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          action: "session_created",
          licenseId: license.master_license_id || license.id,
          userId: userId,
          username: username,
          feature: feature,
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (masterError) {
      console.warn(
        "⚠️ Failed to notify master server of session creation:",
        masterError
      );
      // Don't fail the session creation if master notification fails
    }

    console.log(
      `✅ Session ${sessionId} created successfully for user ${userId} (${username})`
    );

    res.status(200).json({
      success: true,
      message: "Session created successfully",
      sessionId: sessionId,
      maxUsers: maxUsers,
      currentUsers: currentSessions + 1,
      license: {
        organization: license.organization_name,
        type: license.license_type_name,
      },
    });
  } catch (error) {
    console.error("❌ Error in atomic session setup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set up session",
      error: error.message,
    });
  }
};

export const endUserSession = async (req, res) => {
  const { username } = req.body;
  const { "user-agent": userAgent } = req.headers;

  console.log(
    `[Session End] Received request to end session for user: ${username}, User-Agent: ${userAgent}`
  );
  try {
    const { success, message, ended_sessions_count } =
      await licenseService.endUserSession(username);
    if (success) {
      console.log(
        `[Session End] Successfully ended ${ended_sessions_count} session(s) for user: ${username}`
      );
      res.json({ success, message });
    } else {
      console.warn(
        `[Session End] Could not end session for user: ${username}, Reason: ${message}`
      );
      res.status(404).json({ success, message });
    }
  } catch (error) {
    console.error(
      `[Session End] Server error while ending session for user: ${username}`,
      error
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manual cleanup of stale sessions for a user
export const cleanupUserSessions = async (req, res) => {
  try {
    const { userId, feature } = req.params;

    console.log("🚀 [cleanupUserSessions] Starting manual session cleanup:", {
      userId,
      feature,
      timestamp: new Date().toISOString(),
      requestHeaders: req.headers,
    });

    // Check for existing sessions
    console.log("🔍 [cleanupUserSessions] Checking for active sessions...");
    const sessionCheck = await redisSessionService.hasActiveSession(
      userId,
      feature
    );

    console.log("📊 [cleanupUserSessions] Session check result:", {
      hasSession: sessionCheck.hasSession,
      sessionId: sessionCheck.sessionId,
      sessionData: sessionCheck.sessionData,
    });

    if (sessionCheck.hasSession) {
      console.log(
        "🎯 [cleanupUserSessions] Found active session, proceeding with cleanup:",
        {
          sessionId: sessionCheck.sessionId,
          userId,
          feature,
        }
      );

      // End the existing session
      console.log(
        "🗑️ [cleanupUserSessions] Calling redisSessionService.endSession..."
      );
      const endResult = await redisSessionService.endSession(
        sessionCheck.sessionId,
        userId,
        feature
      );

      console.log("📋 [cleanupUserSessions] End session result:", endResult);

      if (endResult.success) {
        console.log(
          `✅ [cleanupUserSessions] Successfully cleaned up session ${sessionCheck.sessionId} for user ${userId}`
        );

        // Respond immediately to improve perceived latency
        const responseData = {
          success: true,
          message: `Session cleanup completed for user ${userId}`,
          data: {
            sessionId: sessionCheck.sessionId,
            userId,
            feature,
            cleanedAt: new Date().toISOString(),
          },
        };

        console.log(
          "📤 [cleanupUserSessions] Sending success response:",
          responseData
        );
        res.status(200).json(responseData);

        // Notify master server in the background with a short timeout
        setImmediate(async () => {
          try {
            console.log(
              "📡 [cleanupUserSessions] Notifying master server about session termination (async)..."
            );
            const license = await licenseService.getCurrentLicense();
            if (!license) {
              console.log(
                "⚠️ [cleanupUserSessions] No license found, skipping master server notification"
              );
              return;
            }

            const masterServerUrl =
              process.env.LICENSE_MGMT_API_URL || "http://localhost:8001/api";

            const payload = {
              action: "session_ended",
              licenseId: license.master_license_id || license.id,
              userId,
              username: "manual_cleanup",
              feature,
              sessionId: sessionCheck.sessionId,
              timestamp: new Date().toISOString(),
            };

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            try {
              await fetch(`${masterServerUrl}/licenses/session-activity`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Internal-API-Key": process.env.SECRET_INTERNAL_API_KEY,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
              });
              console.log(
                "✅ [cleanupUserSessions] Master server notification sent (async)"
              );
            } catch (notifyErr) {
              console.warn(
                "⚠️ [cleanupUserSessions] Background master server notification failed:",
                notifyErr?.name === "AbortError" ? "timeout" : notifyErr
              );
            } finally {
              clearTimeout(timeout);
            }
          } catch (masterError) {
            console.warn(
              "⚠️ [cleanupUserSessions] Unexpected error in background notification:",
              masterError
            );
          }
        });
      } else {
        console.error(
          `❌ [cleanupUserSessions] Failed to clean up session:`,
          endResult.error
        );
        const errorResponse = {
          success: false,
          message: "Failed to clean up session",
          error: endResult.error,
        };
        console.log(
          "📤 [cleanupUserSessions] Sending error response:",
          errorResponse
        );
        res.status(500).json(errorResponse);
      }
    } else {
      console.log(
        "ℹ️ [cleanupUserSessions] No active session found for user:",
        {
          userId,
          feature,
        }
      );

      const responseData = {
        success: true,
        message: `No active session found for user ${userId}`,
        data: {
          userId,
          feature,
          cleanedAt: new Date().toISOString(),
        },
      };

      console.log(
        "📤 [cleanupUserSessions] Sending no-session response:",
        responseData
      );
      res.status(200).json(responseData);
    }
  } catch (error) {
    console.error("❌ [cleanupUserSessions] Error in manual session cleanup:", {
      error: error.message,
      stack: error.stack,
      userId: req.params?.userId,
      feature: req.params?.feature,
    });

    const errorResponse = {
      success: false,
      message: "Failed to clean up session",
      error: error.message,
    };

    console.log(
      "📤 [cleanupUserSessions] Sending error response:",
      errorResponse
    );
    res.status(500).json(errorResponse);
  }
};

// Force cleanup of all sessions for a specific user (admin function)
export const forceCleanupUserSessions = async (req, res) => {
  try {
    const { userId, feature = "webrtc_extension" } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Import Redis session service
    const { forceCleanupUserSessions: redisForceCleanup } = await import(
      "../services/redisSessionService.js"
    );

    // Force cleanup using Redis service
    const result = await redisForceCleanup(userId, feature);

    if (result.success) {
      console.log(
        `[Admin] Force cleanup completed for user ${userId}, feature ${feature}`
      );

      res.status(200).json({
        success: true,
        message: `Force cleanup completed for user ${userId}`,
        data: {
          userId,
          feature,
          cleanedAt: new Date().toISOString(),
        },
      });
    } else {
      console.error(
        `[Admin] Force cleanup failed for user ${userId}:`,
        result.error
      );

      res.status(500).json({
        success: false,
        message: "Force cleanup failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error in force cleanup user sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to force cleanup user sessions",
      error: error.message,
    });
  }
};

// Get detailed session information for debugging
export const getSessionDebugInfo = async (req, res) => {
  try {
    const { userId, feature = "webrtc_extension" } = req.query;

    // Import Redis session service
    const { hasActiveSession, getActiveSessions, getFeatureCount } =
      await import("../services/redisSessionService.js");

    let debugInfo = {};

    if (userId) {
      // Get session info for specific user
      const sessionCheck = await hasActiveSession(userId, feature);
      debugInfo.userSession = sessionCheck;
    }

    // Get all active sessions for the feature
    const allSessions = await getActiveSessions(userId, feature);
    debugInfo.allSessions = allSessions;

    // Get current feature count
    const license = await licenseService.getCurrentLicense();
    if (license) {
      const featureCount = await getFeatureCount(license.id, feature);
      debugInfo.featureCount = featureCount;
      debugInfo.license = {
        id: license.id,
        maxUsers:
          feature === "webrtc_extension"
            ? license.webrtc_max_users
            : license.max_users,
        status: license.status,
      };
    }

    res.status(200).json({
      success: true,
      message: "Session debug information retrieved",
      data: debugInfo,
    });
  } catch (error) {
    console.error("❌ Error getting session debug info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get session debug information",
      error: error.message,
    });
  }
};

// Get session count
export const getSessionCount = async (req, res) => {
  try {
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "No active license found for this server",
      });
    }

    // Get current active sessions
    const currentSessions = await ClientSession.count({
      where: {
        license_cache_id: license.id,
        status: "active",
      },
    });

    res.status(200).json({
      success: true,
      data: {
        currentUsers: currentSessions,
        maxUsers: license.max_users,
        webrtcMaxUsers: license.webrtc_max_users,
        webrtcAvailableSlots: license.webrtc_max_users - currentSessions,
        licenseStatus: license.status,
        organization: license.organization_name,
        licenseType: license.license_type_name,
      },
    });
  } catch (error) {
    console.error("Error getting session count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get session count",
      error: error.message,
    });
  }
};

// Generate client session token for existing users
export const generateClientSessionToken = async (req, res) => {
  try {
    const { sipUsername } = req.body;
    const userId = req.user?.id || 1;
    const clientFingerprint = "server-generated";

    // Get current license
    const license = await licenseService.getCurrentLicense();
    if (!license || license.status !== "active") {
      return res.status(404).json({ message: "No active license found" });
    }

    if (!sipUsername) {
      return res.status(400).json({ message: "sipUsername is required" });
    }

    const token = await licenseService.generateClientToken(
      license.id,
      userId,
      clientFingerprint,
      sipUsername
    );
    res.status(200).json({ sessionToken: token });
  } catch (error) {
    console.error("Error generating client session token:", error);
    res.status(500).json({
      message: "Failed to generate session token",
      error: error.message,
    });
  }
};

// Get feature list (from cached license)
export const getAllFeatures = async (req, res) => {
  try {
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "No license found",
      });
    }

    res.status(200).json({
      success: true,
      features: license.features || {},
    });
  } catch (error) {
    console.error("Error fetching features:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch features",
      error: error.message,
    });
  }
};

// Get WebRTC sessions and active users for admin panel
export const getWebRTCSessions = async (req, res) => {
  try {
    console.log("🚀 [getWebRTCSessions] Starting WebRTC sessions fetch:", {
      timestamp: new Date().toISOString(),
      requestHeaders: req.headers,
    });

    // Get current license to verify (slave server only has one license)
    const license = await licenseService.getCurrentLicense();
    console.log("🏷️ [getWebRTCSessions] Current license:", {
      id: license?.id,
      organization_name: license?.organization_name,
      webrtc_max_users: license?.webrtc_max_users,
    });

    if (!license) {
      console.log("❌ [getWebRTCSessions] No active license found");
      return res.status(404).json({
        success: false,
        message: "No active license found",
      });
    }

    // Get active WebRTC sessions
    console.log(
      "🔍 [getWebRTCSessions] Fetching active WebRTC sessions from database..."
    );
    const activeSessions = await ClientSession.findAll({
      where: {
        license_cache_id: license.id,
        feature: "webrtc_extension",
        status: "active",
      },
      order: [["created_at", "DESC"]],
    });

    console.log("📊 [getWebRTCSessions] Active sessions found:", {
      count: activeSessions.length,
      sessions: activeSessions.map((s) => ({
        id: s.id,
        session_token: s.session_token,
        user_id: s.user_id,
        username: s.username || s.sip_username,
        status: s.status,
        created_at: s.created_at,
        expires_at: s.expires_at,
      })),
    });

    // Get session history (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    console.log(
      "📅 [getWebRTCSessions] Fetching session history since:",
      yesterday.toISOString()
    );

    const sessionHistory = await ClientSession.findAll({
      where: {
        license_cache_id: license.id,
        feature: "webrtc_extension",
        created_at: {
          [Op.gte]: yesterday,
        },
      },
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    console.log("📈 [getWebRTCSessions] Session history found:", {
      count: sessionHistory.length,
      sessions: sessionHistory.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        username: s.username || s.sip_username,
        status: s.status,
        created_at: s.created_at,
        ended_at: s.ended_at,
      })),
    });

    // Calculate session durations and format data
    const formatSessionData = (sessions) => {
      console.log(
        "🔄 [getWebRTCSessions] Formatting session data for",
        sessions.length,
        "sessions"
      );
      return sessions.map((session) => {
        const startTime = new Date(session.created_at);
        const endTime = session.ended_at
          ? new Date(session.ended_at)
          : new Date();
        const duration = Math.floor((endTime - startTime) / 1000 / 60); // minutes

        return {
          id: session.id,
          username: session.username || session.sip_username,
          user_id: session.user_id,
          start_time: session.created_at,
          end_time: session.ended_at,
          duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
          status: session.status,
          ip_address: session.ip_address || "Not Available",
          user_agent: session.user_agent || "Not Available",
          client_fingerprint: session.client_fingerprint,
        };
      });
    };

    const webRTCData = {
      current_sessions: activeSessions.length,
      max_sessions: license.webrtc_max_users || 0,
      active_users: formatSessionData(activeSessions),
      session_history: formatSessionData(
        sessionHistory.filter((s) => s.status !== "active")
      ),
    };

    console.log("📤 [getWebRTCSessions] Final WebRTC data:", {
      current_sessions: webRTCData.current_sessions,
      max_sessions: webRTCData.max_sessions,
      active_users_count: webRTCData.active_users.length,
      session_history_count: webRTCData.session_history.length,
    });

    res.status(200).json({
      success: true,
      data: webRTCData,
    });
  } catch (error) {
    console.error("❌ [getWebRTCSessions] Error fetching WebRTC sessions:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch WebRTC sessions",
      error: error.message,
    });
  }
};

// Admin: force end a specific WebRTC session by sessionId
export const forceEndWebRTCSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const result = await redisSessionService.endSessionById(sessionId);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(200).json({
      success: true,
      message: "Session force-ended successfully",
    });
  } catch (error) {
    console.error("❌ Error force-ending WebRTC session:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get WebRTC users for license management
export const getLicenseUsers = async (req, res) => {
  try {
    // Get current license to verify (slave server only has one license)
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "No active license found",
      });
    }

    // Get all users who have used WebRTC extension (from client sessions)
    const webrtcUsers = await ClientSession.findAll({
      where: {
        license_cache_id: license.id,
        feature: "webrtc_extension",
      },
      attributes: [
        "user_id",
        "sip_username",
        [sequelize.fn("MAX", sequelize.col("created_at")), "last_activity"],
        [sequelize.fn("COUNT", sequelize.col("id")), "session_count"],
      ],
      group: ["user_id", "sip_username"],
      raw: true,
    });

    // Get currently active sessions to determine WebRTC access
    const activeSessions = await ClientSession.findAll({
      where: {
        license_cache_id: license.id,
        feature: "webrtc_extension",
        status: "active",
      },
      attributes: ["user_id", "sip_username"],
      raw: true,
    });

    const activeUserIds = new Set(activeSessions.map((s) => s.user_id));

    // Format user data
    const users = webrtcUsers.map((user, index) => ({
      id: user.user_id,
      username: user.sip_username,
      name: user.sip_username, // We could join with users table to get real name
      status: activeUserIds.has(user.user_id) ? "active" : "inactive",
      webrtc_access: true, // If they have sessions, they have access
      email: `${user.sip_username}@example.com`, // Mock email or join with users table
      created_at: user.last_activity,
      session_count: parseInt(user.session_count),
      last_activity: user.last_activity,
    }));

    // Add some additional users who don't have WebRTC access yet
    // This simulates users in the system who could potentially get WebRTC access
    const additionalUsers = [];
    for (
      let i = users.length;
      i < Math.min(users.length + 3, license.max_users);
      i++
    ) {
      additionalUsers.push({
        id: 1000 + i,
        username: `user${1000 + i}`,
        name: `User ${1000 + i}`,
        status: "inactive",
        webrtc_access: false,
        email: `user${1000 + i}@example.com`,
        created_at: new Date().toISOString(),
        session_count: 0,
        last_activity: null,
      });
    }

    const allUsers = [...users, ...additionalUsers];

    res.status(200).json({
      success: true,
      data: allUsers,
    });
  } catch (error) {
    console.error("Error fetching license users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch license users",
      error: error.message,
    });
  }
};

// Update user WebRTC access (mock implementation for admin panel)
export const updateUserWebRTCAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { hasAccess } = req.body;

    // Get current license to verify (slave server only has one license)
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "No active license found",
      });
    }

    // For now, this is a mock implementation
    // In a real system, you'd update user permissions in your user management system
    console.log(
      `[Admin] WebRTC access ${
        hasAccess ? "enabled" : "disabled"
      } for user ${userId}`
    );

    // If disabling access, end any active sessions for this user
    if (!hasAccess) {
      await ClientSession.update(
        {
          status: "terminated",
          ended_at: new Date(),
        },
        {
          where: {
            user_id: userId,
            license_cache_id: license.id,
            feature: "webrtc_extension",
            status: "active",
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: `User WebRTC access ${
        hasAccess ? "enabled" : "disabled"
      } successfully`,
      data: {
        userId,
        hasAccess,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating user WebRTC access:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user WebRTC access",
      error: error.message,
    });
  }
};

// Update WebRTC allocation for current license
export const updateWebRTCAllocation = async (req, res) => {
  try {
    const { licenseId } = req.params;
    const { webrtc_max_users } = req.body;

    if (typeof webrtc_max_users !== "number" || webrtc_max_users < 0) {
      return res.status(400).json({
        success: false,
        message: "webrtc_max_users must be a non-negative number",
      });
    }

    // Get current license to verify
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "No active license found",
      });
    }

    // Validate that WebRTC allocation doesn't exceed total license users
    if (webrtc_max_users > license.max_users) {
      return res.status(400).json({
        success: false,
        message: `WebRTC allocation (${webrtc_max_users}) cannot exceed total license users (${license.max_users})`,
      });
    }

    // Check if there are active sessions that would exceed the new limit
    const activeSessions = await ClientSession.count({
      where: {
        license_cache_id: license.id,
        feature: "webrtc_extension",
        status: "active",
      },
    });

    if (activeSessions > webrtc_max_users) {
      return res.status(409).json({
        success: false,
        message: `Cannot reduce allocation to ${webrtc_max_users} - there are currently ${activeSessions} active WebRTC sessions. Please wait for some users to log out first.`,
      });
    }

    // Update the license allocation
    const updatedLicense = await licenseService.updateWebRTCAllocation(
      license.id,
      webrtc_max_users
    );

    console.log(
      `[Admin] WebRTC allocation updated to ${webrtc_max_users} for license: ${license.organization_name}`
    );

    res.status(200).json({
      success: true,
      message: `WebRTC allocation updated to ${webrtc_max_users} users successfully`,
      data: {
        previous_allocation: license.webrtc_max_users,
        new_allocation: webrtc_max_users,
        active_sessions: activeSessions,
        available_slots: webrtc_max_users - activeSessions,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating WebRTC allocation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update WebRTC allocation",
      error: error.message,
    });
  }
};

// One-time license validation for Electron clients
export const validateLicense = async (req, res) => {
  try {
    const { sessionToken, clientFingerprint } = req.body;

    if (!sessionToken || !clientFingerprint) {
      return res.status(400).json({
        success: false,
        message: "Session token and client fingerprint are required",
      });
    }

    console.log(
      "[License] One-time validation requested for client:",
      clientFingerprint.substring(0, 20) + "..."
    );

    // Validate the session token
    const sessionValidation = await redisSessionService.validateSession(
      sessionToken,
      clientFingerprint
    );

    if (!sessionValidation.valid) {
      console.log(
        "[License] Session validation failed:",
        sessionValidation.reason
      );
      return res.status(401).json({
        success: false,
        message: sessionValidation.reason || "Invalid session",
        isValid: false,
        features: {},
        status: "invalid",
      });
    }

    // Get current license
    const license = await licenseService.getCurrentLicense();

    if (!license) {
      console.log("[License] No license found on server");
      return res.status(200).json({
        success: true,
        isValid: false,
        features: {},
        status: "no_license",
        message: "No license found on this server",
        license: null,
      });
    }

    // Check if license is active
    const isLicenseActive = license.status === "active";

    // Get features from license
    let features = {};
    if (license.features && typeof license.features === "string") {
      try {
        features = JSON.parse(license.features);
      } catch (error) {
        console.error("[License] Error parsing license features:", error);
        features = {};
      }
    } else if (license.features) {
      features = license.features;
    }

    // Check WebRTC allocation if needed
    if (isLicenseActive && features.webrtc_extension) {
      const activeWebRTCSessions = await ClientSession.count({
        where: {
          license_cache_id: license.id,
          status: "active",
          feature: "webrtc_extension",
        },
      });

      if (activeWebRTCSessions >= (license.webrtc_max_users || 0)) {
        console.log(
          "[License] WebRTC limit exceeded:",
          activeWebRTCSessions,
          "/",
          license.webrtc_max_users
        );
        return res.status(200).json({
          success: true,
          isValid: false,
          features: {},
          status: "limit_exceeded",
          message: "WebRTC user limit exceeded",
          license: {
            id: license.id,
            organization_name: license.organization_name,
            webrtc_max_users: license.webrtc_max_users,
            active_sessions: activeWebRTCSessions,
          },
        });
      }
    }

    console.log(
      "[License] One-time validation successful for client:",
      clientFingerprint.substring(0, 20) + "..."
    );
    console.log(
      "[License] License status:",
      license.status,
      "Features:",
      Object.keys(features)
    );

    return res.status(200).json({
      success: true,
      isValid: isLicenseActive,
      features: features,
      status: license.status,
      message: isLicenseActive
        ? "License is active"
        : `License is ${license.status}`,
      license: {
        id: license.id,
        organization_name: license.organization_name,
        license_type: {
          name: license.license_type_name,
          features: features,
        },
        status: license.status,
        max_users: license.max_users,
        webrtc_max_users: license.webrtc_max_users,
        issued_at: license.issued_at,
        expires_at: license.expires_at,
      },
    });
  } catch (error) {
    console.error("[License] Error during one-time validation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during license validation",
      isValid: false,
      features: {},
      status: "error",
    });
  }
};
