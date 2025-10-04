import jwt from "jsonwebtoken";
import sequelize, { Op } from "../config/sequelize.js";
import redisClient from "../config/redis.js";
import {
  LicenseCache,
  ClientSession,
  LicenseValidation,
  FingerprintHistory,
} from "../models/licenseModel.js";

import { generateFingerprint } from "../utils/serverFingerprinting.js";

// Cache configuration for production
const CACHE_CONFIG = {
  // License cache TTL (Time To Live) in milliseconds
  LICENSE_CACHE_TTL: process.env.LICENSE_CACHE_TTL || 30 * 60 * 1000, // 30 minutes default
  // Stale cache grace period (how long to use stale cache)
  STALE_GRACE_PERIOD: process.env.STALE_GRACE_PERIOD || 2 * 60 * 60 * 1000, // 2 hours
  // Background sync interval
  BACKGROUND_SYNC_INTERVAL:
    process.env.BACKGROUND_SYNC_INTERVAL || 15 * 60 * 1000, // 15 minutes
  // Maximum retry attempts for sync
  MAX_SYNC_RETRIES: process.env.MAX_SYNC_RETRIES || 3,
  // Retry delay in milliseconds
  SYNC_RETRY_DELAY: process.env.SYNC_RETRY_DELAY || 5000, // 5 seconds
};

const createLicenseService = () => {
  const privateKey = process.env.LICENSE_PRIVATE_KEY || process.env.JWT_SECRET;
  const publicKey = process.env.LICENSE_PUBLIC_KEY || process.env.JWT_SECRET;

  // Clean up orphaned client sessions
  const cleanupOrphanedSessions = async () => {
    try {
      // Find client sessions that reference non-existent license cache entries
      const orphanedSessions = await ClientSession.findAll({
        include: [
          {
            model: LicenseCache,
            as: "license_cache",
            required: false,
          },
        ],
        where: {
          "$license_cache.id$": null,
        },
      });

      if (orphanedSessions.length > 0) {
        console.log(
          `🧹 Found ${orphanedSessions.length} orphaned client sessions`
        );

        for (const session of orphanedSessions) {
          try {
            await session.destroy();
            console.log(`🧹 Cleaned up orphaned session: ${session.id}`);
          } catch (error) {
            console.error(
              `❌ Error cleaning up orphaned session ${session.id}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Error cleaning up orphaned sessions:", error);
    }
  };

  // Cache validation and cleanup
  const validateAndCleanCache = async () => {
    try {
      // First, clean up any orphaned sessions
      await cleanupOrphanedSessions();

      const now = new Date();
      const staleThreshold = new Date(
        now.getTime() - CACHE_CONFIG.STALE_GRACE_PERIOD
      );

      // Find and mark very old cache entries as failed
      const oldEntries = await LicenseCache.findAll({
        where: {
          last_sync: {
            [Op.lt]: staleThreshold,
          },
          sync_status: "stale",
        },
      });

      for (const entry of oldEntries) {
        try {
          await entry.update({
            sync_status: "failed",
            status: "expired",
          });
          console.log(
            `🗑️ Marked old cache entry as failed: ${entry.organization_name}`
          );
        } catch (error) {
          console.error(
            `❌ Error marking cache entry as failed: ${entry.id}`,
            error
          );
        }
      }

      // Clean up failed entries older than 24 hours
      const cleanupThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // First, find license cache entries that should be cleaned up
      const failedEntries = await LicenseCache.findAll({
        where: {
          sync_status: "failed",
          last_sync: {
            [Op.lt]: cleanupThreshold,
          },
        },
      });

      let deletedCount = 0;

      for (const entry of failedEntries) {
        try {
          // Check if there are any active client sessions for this license cache
          const activeSessions = await ClientSession.count({
            where: {
              license_cache_id: entry.id,
            },
          });

          if (activeSessions > 0) {
            console.log(
              `⚠️ Skipping cleanup of license cache ${entry.id} - has ${activeSessions} active client sessions`
            );
            continue;
          }

          // Delete related records first (in reverse order of dependencies)
          await ClientSession.destroy({
            where: {
              license_cache_id: entry.id,
            },
          });

          await LicenseValidation.destroy({
            where: {
              license_cache_id: entry.id,
            },
          });

          await FingerprintHistory.destroy({
            where: {
              license_cache_id: entry.id,
            },
          });

          // Now delete the license cache entry
          await entry.destroy();
          deletedCount++;

          console.log(
            `🧹 Cleaned up license cache entry: ${entry.organization_name}`
          );
        } catch (error) {
          console.error(
            `❌ Error cleaning up license cache entry ${entry.id}:`,
            error
          );

          // If we can't delete due to foreign key constraints, try to mark as expired instead
          try {
            await entry.update({
              status: "expired",
              sync_status: "failed",
            });
            console.log(
              `⚠️ Marked license cache entry ${entry.id} as expired instead of deleting`
            );
          } catch (updateError) {
            console.error(
              `❌ Failed to mark license cache entry ${entry.id} as expired:`,
              updateError
            );
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old failed cache entries`);
      }
    } catch (error) {
      console.error("❌ Error during cache validation:", error);

      // Don't let this error crash the application
      console.log(
        "⚠️ Continuing with application startup despite cache validation error"
      );
    }
  };

  // Default fallback license for development when no master is available
  const createDefaultLicense = async (fingerprint) => {
    console.log("🔧 Creating default development license...");

    const developmentLicense = await LicenseCache.create({
      master_license_id: "0", // Special ID for local development (string format)
      server_fingerprint: fingerprint,
      license_key: null,
      organization_name: "Development License",
      status: "active",
      max_users: 2,
      webrtc_max_users: 0,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      features: {
        calls: true,
        recording: true,
        transfers: true,
        conferences: true,
        reports: true,
        crm: true,
        voicemail: false,
        video: false,
        sms: false,
        whatsapp: false,
        webrtc_extension: false,
      },
      license_type_name: "Development",
      last_sync: new Date(),
      sync_status: "synced",
    });

    console.log("✅ Created development license");
    return developmentLicense;
  };

  // Sync license from master server with retry logic
  const syncLicenseFromMaster = async (retryCount = 0) => {
    try {
      console.log(
        `🔄 Syncing license from master server... (attempt ${retryCount + 1})`
      );

      const currentFingerprint = await generateFingerprint();
      const masterUrl =
        process.env.LICENSE_MGMT_API_URL || "http://localhost:8001/api";

      console.log("🔍 Current server fingerprint:", currentFingerprint);

      // Check if fingerprint has changed
      const existingCache = await LicenseCache.findOne({
        where: { sync_status: ["synced", "stale"] },
        order: [["last_sync", "DESC"]],
      });

      if (
        existingCache &&
        existingCache.server_fingerprint !== currentFingerprint
      ) {
        console.log("⚠️ Fingerprint change detected!");
        console.log("   Old fingerprint:", existingCache.server_fingerprint);
        console.log("   New fingerprint:", currentFingerprint);

        // Record fingerprint change and mark previous cache stale, but DO NOT
        // fall back immediately. First attempt to fetch the correct license
        // for the new fingerprint from the master server.
        try {
          await FingerprintHistory.create({
            old_fingerprint: existingCache.server_fingerprint,
            new_fingerprint: currentFingerprint,
            change_reason: "network_change",
            license_cache_id: existingCache.id,
            action_taken: "marked_stale",
          });
        } catch (_) {}

        await existingCache.update({
          sync_status: "stale",
        });

        console.log(
          "ℹ️ Previous cache marked stale; attempting fetch from master before fallback"
        );
      }

      // Try to fetch license from master server
      console.log("📡 Fetching license from master server...");

      const response = await fetch(
        `${masterUrl}/licenses/fingerprint/${currentFingerprint}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key":
              process.env.SECRET_INTERNAL_API_KEY ||
              "aVeryLongAndRandomSecretStringForInternalComms_987654321",
          },
          // Add timeout for production
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(
            "⚠️ No license found on master server for this fingerprint"
          );
          console.log("🔧 Creating development fallback license");
          return {
            success: true,
            license: await createDefaultLicense(currentFingerprint),
          };
        }

        // Handle retryable errors
        if (
          (response.status >= 500 || response.status === 429) &&
          retryCount < CACHE_CONFIG.MAX_SYNC_RETRIES
        ) {
          console.log(
            `⚠️ Retryable error (${response.status}), retrying in ${CACHE_CONFIG.SYNC_RETRY_DELAY}ms...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, CACHE_CONFIG.SYNC_RETRY_DELAY)
          );
          return syncLicenseFromMaster(retryCount + 1);
        }

        throw new Error(
          `Master server responded with status: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid response from master server");
      }

      const masterLicense = result.data;
      console.log(
        "📥 Received license from master:",
        masterLicense.organization_name
      );

      // Parse features from master license
      let features = {};
      let licenseTypeName = "Unknown";

      if (masterLicense.license_type?.features) {
        const masterFeatures = masterLicense.license_type.features;
        features =
          typeof masterFeatures === "string"
            ? JSON.parse(masterFeatures)
            : masterFeatures;
      }

      if (masterLicense.license_type?.name) {
        licenseTypeName = masterLicense.license_type.name;
      }

      // Update or create license cache
      let licenseCache = await LicenseCache.findOne({
        where: { master_license_id: masterLicense._id || masterLicense.id },
      });

      if (!licenseCache) {
        // Create new license cache
        licenseCache = await LicenseCache.create({
          master_license_id: masterLicense._id || masterLicense.id,
          server_fingerprint: currentFingerprint,
          license_key: masterLicense.license_key,
          organization_name: masterLicense.organization_name,
          status: masterLicense.status || "active",
          max_users: masterLicense.max_users,
          webrtc_max_users: masterLicense.webrtc_max_users || 0,
          issued_at: masterLicense.issued_at,
          expires_at: masterLicense.expires_at,
          features: features,
          license_type_name: licenseTypeName,
          last_sync: new Date(),
          sync_status: "synced",
        });
        console.log(
          "✅ Created license cache from master:",
          licenseCache.organization_name
        );
      } else {
        // Update existing license cache
        await licenseCache.update({
          server_fingerprint: currentFingerprint,
          license_key: masterLicense.license_key,
          organization_name: masterLicense.organization_name,
          status: masterLicense.status || "active",
          max_users: masterLicense.max_users,
          webrtc_max_users: masterLicense.webrtc_max_users || 0,
          issued_at: masterLicense.issued_at,
          expires_at: masterLicense.expires_at,
          features: features,
          license_type_name: licenseTypeName,
          last_sync: new Date(),
          sync_status: "synced",
        });
        console.log(
          "✅ Updated license cache from master:",
          licenseCache.organization_name
        );
      }

      // Invalidate any other cache entries for this fingerprint to ensure we always get the latest
      await LicenseCache.update(
        {
          sync_status: "failed",
          status: "invalid",
        },
        {
          where: {
            server_fingerprint: currentFingerprint,
            id: { [Op.ne]: licenseCache.id }, // Exclude the current cache entry
          },
        }
      );

      // Also clear any old cache entries that are no longer needed
      const oldCacheEntries = await LicenseCache.findAll({
        where: {
          server_fingerprint: currentFingerprint,
          sync_status: "failed",
        },
      });

      if (oldCacheEntries.length > 0) {
        console.log(
          `🧹 Cleaning up ${oldCacheEntries.length} old cache entries`
        );
        for (const oldEntry of oldCacheEntries) {
          try {
            // First delete any related client sessions
            await ClientSession.update(
              { license_cache_id: licenseCache.id },
              {
                where: {
                  license_cache_id: oldEntry.id,
                },
              }
            );

            // Delete related license validations
            await LicenseValidation.destroy({
              where: {
                license_cache_id: oldEntry.id,
              },
            });

            // Delete related fingerprint histories
            await FingerprintHistory.destroy({
              where: {
                license_cache_id: oldEntry.id,
              },
            });

            // Then delete the license cache entry
            await oldEntry.destroy();
          } catch (error) {
            console.error(
              `❌ Error cleaning up cache entry ${oldEntry.id}:`,
              error
            );
            // Continue with other entries even if one fails
          }
        }
      }

      return { success: true, license: licenseCache };
    } catch (error) {
      console.error("❌ Error syncing license from master:", error);

      // Try to find existing license as fallback
      const fallbackLicense = await LicenseCache.findOne({
        where: { sync_status: ["synced", "stale"] },
        order: [["last_sync", "DESC"]],
      });

      if (fallbackLicense) {
        // Check if fallback is still within grace period
        const now = new Date();
        const gracePeriodThreshold = new Date(
          now.getTime() - CACHE_CONFIG.STALE_GRACE_PERIOD
        );

        if (fallbackLicense.last_sync > gracePeriodThreshold) {
          await fallbackLicense.update({ sync_status: "stale" });
          console.log("⚠️ Using stale license cache as fallback");
          return { success: true, license: fallbackLicense };
        } else {
          console.log("⚠️ Fallback license is too old, marking as failed");
          await fallbackLicense.update({ sync_status: "failed" });
        }
      }

      // Create development license as last resort
      const currentFingerprint = await generateFingerprint();
      console.log("🔧 Creating development fallback license");
      return {
        success: true,
        license: await createDefaultLicense(currentFingerprint),
      };
    }
  };

  // Get current license with improved cache management
  const getCurrentLicense = async () => {
    const currentFingerprint = await generateFingerprint();

    // First try to find a license with matching fingerprint
    let license = await LicenseCache.findOne({
      where: {
        server_fingerprint: currentFingerprint,
        status: ["active", "suspended"],
        sync_status: ["synced", "stale"], // Only get valid cache entries
      },
      order: [["last_sync", "DESC"]], // Always get the most recent
    });

    if (!license) {
      // Try to find any recent license
      license = await LicenseCache.findOne({
        where: {
          status: ["active", "suspended"],
          sync_status: ["synced", "stale"],
        },
        order: [["last_sync", "DESC"]],
      });

      if (license && license.server_fingerprint !== currentFingerprint) {
        console.log("⚠️ License fingerprint mismatch, triggering sync...");
        const syncResult = await syncLicenseFromMaster();
        return syncResult.license;
      }
    }

    if (!license) {
      console.log("📡 No license found, syncing from master...");
      const syncResult = await syncLicenseFromMaster();
      return syncResult.license;
    }

    // Check if license is expired
    if (license.expires_at && new Date() > new Date(license.expires_at)) {
      console.log("⚠️ License has expired, marking as expired");
      await license.update({
        status: "expired",
        sync_status: "failed",
      });

      // Try to sync fresh license
      const syncResult = await syncLicenseFromMaster();
      return syncResult.license;
    }

    // Check if license cache is stale (older than TTL)
    const now = new Date();
    const ttlThreshold = new Date(
      now.getTime() - CACHE_CONFIG.LICENSE_CACHE_TTL
    );

    if (license.last_sync < ttlThreshold && license.sync_status === "synced") {
      console.log("🔄 License cache is stale, triggering background sync...");

      // Mark as stale and trigger background sync
      await license.update({ sync_status: "stale" });

      // Trigger background sync but return current license immediately
      syncLicenseFromMaster().catch((err) =>
        console.error("Background sync failed:", err)
      );
    }

    // Check if license is in failed state and within grace period
    if (license.sync_status === "failed") {
      const gracePeriodThreshold = new Date(
        now.getTime() - CACHE_CONFIG.STALE_GRACE_PERIOD
      );

      if (license.last_sync < gracePeriodThreshold) {
        console.log("⚠️ License cache is too old, forcing sync...");
        const syncResult = await syncLicenseFromMaster();
        return syncResult.license;
      }
    }

    // Always parse features before returning license
    if (license && license.features && typeof license.features === "string") {
      try {
        license.features = JSON.parse(license.features);
      } catch (error) {
        console.error("Error parsing license features:", error);
        license.features = {};
      }
    }

    return license;
  };

  // Simplified license validation for slave server
  const validateLicense = async () => {
    const currentFingerprint = await generateFingerprint();
    const license = await getCurrentLicense();

    if (!license) {
      return { valid: false, error: "No license found" };
    }

    if (license.status !== "active") {
      return { valid: false, error: `License is ${license.status}` };
    }

    if (license.expires_at && new Date() > new Date(license.expires_at)) {
      await license.update({ status: "expired" });
      return { valid: false, error: "License has expired" };
    }

    if (license.server_fingerprint !== currentFingerprint) {
      return { valid: false, error: "Server fingerprint mismatch" };
    }

    return {
      valid: true,
      license: license,
      features: license.features || {},
      maxUsers: license.max_users,
      webrtcMaxUsers: license.webrtc_max_users,
    };
  };

  // Generate client session token (updated to include server_license_id)
  const generateClientToken = async (
    licenseCacheId,
    userId,
    clientFingerprint,
    sipUsername
  ) => {
    console.log("🚀 Generating client token...");

    // Get the license cache to extract the server license ID
    const licenseCache = await LicenseCache.findByPk(licenseCacheId);
    if (!licenseCache) {
      throw new Error(`License cache not found: ${licenseCacheId}`);
    }

    const sessionData = {
      licenseCacheId,
      userId,
      clientFp: clientFingerprint,
      sipUser: sipUsername,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    const sessionToken = jwt.sign(sessionData, privateKey, {
      algorithm: "RS256",
    });

    await ClientSession.create({
      session_token: sessionToken,
      license_cache_id: licenseCacheId,
      server_license_id: licenseCache.master_license_id, // Add the missing field
      user_id: userId,
      client_fingerprint: clientFingerprint,
      sip_username: sipUsername,
      expires_at: new Date(sessionData.exp * 1000),
    });

    await redisClient.set(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      "EX",
      86400
    );

    return sessionToken;
  };

  // Validate client session (updated)
  const validateClientSession = async (sessionToken) => {
    try {
      const decoded = jwt.verify(sessionToken, publicKey, {
        algorithm: "RS256",
      });

      const session = await ClientSession.findOne({
        where: { session_token: sessionToken, status: "active" },
        include: [{ model: LicenseCache, as: "license_cache" }],
      });

      if (!session) {
        throw new Error("Client session not found or inactive");
      }

      console.log("[LicenseService] Session found:", {
        sessionId: session.id,
        userId: session.user_id,
        sipUsername: session.sip_username,
        licenseCacheId: session.license_cache_id,
        hasLicenseCache: !!session.license_cache,
        licenseCacheData: session.license_cache
          ? {
              id: session.license_cache.id,
              organizationName: session.license_cache.organization_name,
              status: session.license_cache.status,
              features: session.license_cache.features,
            }
          : null,
      });

      // If license_cache is null, try to fetch it manually
      if (!session.license_cache && session.license_cache_id) {
        console.log(
          "[LicenseService] License cache not loaded, fetching manually..."
        );
        const licenseCache = await LicenseCache.findByPk(
          session.license_cache_id
        );
        if (licenseCache) {
          session.license_cache = licenseCache;
          console.log("[LicenseService] Manually loaded license cache:", {
            id: licenseCache.id,
            organizationName: licenseCache.organization_name,
            status: licenseCache.status,
          });
        } else {
          console.error(
            "[LicenseService] License cache not found for ID:",
            session.license_cache_id
          );
        }
      }

      // Parse features if they're stored as a JSON string
      let features = {};
      if (session.license_cache && session.license_cache.features) {
        if (typeof session.license_cache.features === "string") {
          try {
            features = JSON.parse(session.license_cache.features);
          } catch (error) {
            console.error("Error parsing license features:", error);
            features = {};
          }
        } else {
          features = session.license_cache.features;
        }
      }

      return {
        valid: true,
        licenseCacheId: session.license_cache_id,
        userId: session.user_id,
        username: session.sip_username,
        license: session.license_cache || null,
        features: features,
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  };

  // Helper functions for session management
  const getConcurrentUsers = async (licenseCacheId) => {
    const count = await redisClient.get(`concurrent_count:${licenseCacheId}`);
    return parseInt(count) || 0;
  };

  const incrementConcurrentUsers = (licenseCacheId) => {
    return redisClient.incr(`concurrent_count:${licenseCacheId}`);
  };

  const decrementConcurrentUsers = async (licenseCacheId) => {
    const current = await redisClient.decr(
      `concurrent_count:${licenseCacheId}`
    );
    if (current < 0) {
      await redisClient.set(`concurrent_count:${licenseCacheId}`, 0);
    }
    return Math.max(current, 0);
  };

  const getSessionTokenForSipUser = async (sipUsername) => {
    const session = await ClientSession.findOne({
      where: { sip_username: sipUsername, status: "active" },
      order: [["created_at", "DESC"]],
    });
    return session ? session.session_token : null;
  };

  // Update license features for current license
  const updateLicenseFeatures = async (licenseId, features) => {
    try {
      console.log(`🔧 Updating license features for license: ${licenseId}`);

      // First try to find by master_license_id (for backward compatibility)
      let license = await LicenseCache.findOne({
        where: { master_license_id: licenseId },
      });

      // If not found by master_license_id, try by primary key id
      if (!license) {
        license = await LicenseCache.findByPk(licenseId);
      }

      if (!license) {
        throw new Error(`License not found: ${licenseId}`);
      }

      // Update local cache
      await license.update({
        features: JSON.stringify(features),
        last_sync: new Date(),
      });

      console.log(
        `✅ Updated license features locally for: ${license.organization_name}`
      );

      // Try to sync with master server if available
      try {
        const masterUrl =
          process.env.LICENSE_MGMT_API_URL || "http://localhost:8001/api";
        const response = await fetch(
          `${masterUrl}/licenses/${licenseId}/features`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-internal-api-key":
                "aVeryLongAndRandomSecretStringForInternalComms_987654321",
            },
            body: JSON.stringify({ features }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          console.log(`✅ Synced license features with master server`);
        } else {
          console.log(
            `⚠️ Could not sync with master server (${response.status}), but local cache updated`
          );
        }
      } catch (syncError) {
        console.log(
          `⚠️ Master server not available for sync, but local cache updated`
        );
      }

      // Parse features before returning
      if (license && license.features && typeof license.features === "string") {
        try {
          license.features = JSON.parse(license.features);
        } catch (error) {
          console.error("Error parsing license features:", error);
          license.features = {};
        }
      }

      return license;
    } catch (error) {
      console.error("❌ Error updating license features:", error);
      throw error;
    }
  };

  // Update WebRTC allocation for current license
  const updateWebRTCAllocation = async (licenseId, webrtcMaxUsers) => {
    try {
      console.log(
        `🔧 Updating WebRTC allocation for license: ${licenseId} to ${webrtcMaxUsers} users`
      );

      // First try to find by master_license_id (for backward compatibility)
      let license = await LicenseCache.findOne({
        where: { master_license_id: licenseId },
      });

      // If not found by master_license_id, try by primary key id
      if (!license) {
        license = await LicenseCache.findByPk(licenseId);
      }

      if (!license) {
        throw new Error(`License not found: ${licenseId}`);
      }

      // Update local cache
      await license.update({
        webrtc_max_users: webrtcMaxUsers,
        last_sync: new Date(),
      });

      console.log(
        `✅ Updated WebRTC allocation locally for: ${license.organization_name}`
      );

      // Try to sync with master server if available
      try {
        const masterUrl =
          process.env.LICENSE_MGMT_API_URL || "http://localhost:8001/api";
        const response = await fetch(
          `${masterUrl}/licenses/${licenseId}/webrtc-allocation`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-internal-api-key":
                "aVeryLongAndRandomSecretStringForInternalComms_987654321",
            },
            body: JSON.stringify({ webrtc_max_users: webrtcMaxUsers }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          console.log(`✅ Synced WebRTC allocation with master server`);
        } else {
          console.log(
            `⚠️ Could not sync with master server (${response.status}), but local cache updated`
          );
        }
      } catch (syncError) {
        console.log(
          `⚠️ Master server not available for sync, but local cache updated`
        );
      }

      // Parse features before returning
      if (license && license.features && typeof license.features === "string") {
        try {
          license.features = JSON.parse(license.features);
        } catch (error) {
          console.error("Error parsing license features:", error);
          license.features = {};
        }
      }

      return license;
    } catch (error) {
      console.error("❌ Error updating WebRTC allocation:", error);
      throw error;
    }
  };

  return {
    syncLicenseFromMaster,
    getCurrentLicense,
    validateLicense,
    generateClientToken,
    validateClientSession,
    getConcurrentUsers,
    incrementConcurrentUsers,
    decrementConcurrentUsers,
    getSessionTokenForSipUser,
    // New cache management functions
    validateAndCleanCache,
    cleanupOrphanedSessions,
    updateLicenseFeatures,
    updateWebRTCAllocation,
    // Legacy methods for backward compatibility
    getOrCreateDefaultServerLicense: getCurrentLicense,
  };
};

// Background cache cleanup service
let cleanupInterval = null;

export const startCacheCleanupService = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  const service = createLicenseService();

  // Run initial cleanup
  service.validateAndCleanCache();
  cleanupStaleSessions(); // Run initial session cleanup

  // Also run Redis-based session cleanup
  import("./redisSessionService.js")
    .then((module) => {
      module.cleanupExpiredSessions().catch((error) => {
        console.error("Error in Redis session cleanup:", error);
      });
    })
    .catch((error) => {
      console.error("Error importing Redis session service:", error);
    });

  // Set up periodic cleanup (every 15 minutes instead of 1 hour for more aggressive cleanup)
  cleanupInterval = setInterval(async () => {
    try {
      await service.validateAndCleanCache();
      await cleanupStaleSessions(); // Add session cleanup

      // Also run Redis session cleanup
      import("./redisSessionService.js")
        .then((module) => {
          module.cleanupExpiredSessions().catch((error) => {
            console.error("Error in periodic Redis session cleanup:", error);
          });
        })
        .catch((error) => {
          console.error("Error importing Redis service during cleanup:", error);
        });
    } catch (error) {
      console.error("❌ Cache cleanup service error:", error);
    }
  }, 15 * 60 * 1000); // 15 minutes instead of 1 hour

  console.log(
    "🧹 Enhanced cache and session cleanup service started (15-minute intervals)"
  );
};

export const stopCacheCleanupService = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("🧹 Cache cleanup service stopped");
  }
};

// Enhanced session cleanup function to prevent session pollution
const cleanupStaleSessions = async () => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const thirtyMinutesAgo = new Date(); // More aggressive: 30 minutes instead of 1 hour
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    // Find sessions that are stale (older than 24 hours) or without recent heartbeat
    const staleSessions = await ClientSession.findAll({
      where: {
        status: "active",
        [Op.or]: [
          // Sessions older than 24 hours
          {
            created_at: {
              [Op.lt]: oneDayAgo,
            },
          },
          // Sessions without heartbeat in the last 30 minutes (more aggressive)
          {
            [Op.or]: [
              { last_heartbeat: null },
              {
                last_heartbeat: {
                  [Op.lt]: thirtyMinutesAgo,
                },
              },
            ],
          },
        ],
      },
    });

    if (staleSessions.length > 0) {
      console.log(`🧹 Cleaning up ${staleSessions.length} stale sessions...`);

      // Batch update for better performance
      await ClientSession.update(
        {
          status: "expired",
          ended_at: new Date(),
        },
        {
          where: {
            id: staleSessions.map((session) => session.id),
          },
        }
      );

      console.log(`✅ Cleaned up ${staleSessions.length} stale sessions`);

      // Also try to clean up Redis if available
      try {
        const { cleanupExpiredSessions: redisCleanup } = await import(
          "./redisSessionService.js"
        );
        await redisCleanup();
      } catch (redisError) {
        console.warn(
          "⚠️ Redis cleanup not available during stale session cleanup:",
          redisError
        );
      }
    }
  } catch (error) {
    console.error("❌ Error during session cleanup:", error);
  }
};

export default createLicenseService;
