import redisClient from "../config/redis.js";
import { ClientSession } from "../models/licenseModel.js";
import { Op } from "sequelize";

/**
 * Redis-based session management service
 * Provides atomic operations and better performance than database-only approach
 */

// Constants
const SESSION_PREFIX = "session:";
const USER_SESSION_PREFIX = "user_sessions:";
const FEATURE_COUNT_PREFIX = "feature_count:";
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Generate session key for Redis
 */
export const getSessionKey = (sessionId) => {
  return `${SESSION_PREFIX}${sessionId}`;
};

/**
 * Generate user sessions key for Redis
 */
export const getUserSessionsKey = (userId, feature) => {
  return `${USER_SESSION_PREFIX}${userId}:${feature}`;
};

/**
 * Generate feature count key for Redis
 */
export const getFeatureCountKey = (licenseId, feature) => {
  return `${FEATURE_COUNT_PREFIX}${licenseId}:${feature}`;
};

/**
 * Check if user has active session using Redis
 */
export const hasActiveSession = async (userId, feature) => {
  try {
    console.log("🔍 [hasActiveSession] Checking for active session:", {
      userId,
      feature,
      timestamp: new Date().toISOString(),
    });

    if (!redisClient?.isReady) {
      console.warn(
        "⚠️ [hasActiveSession] Redis not available, falling back to database"
      );
      return await hasActiveSessionDB(userId, feature);
    }

    const key = getUserSessionsKey(userId, feature);
    console.log("🔑 [hasActiveSession] User sessions key:", key);

    const sessionIds = await redisClient.sMembers(key);
    console.log(
      "📋 [hasActiveSession] Session IDs from Redis set:",
      sessionIds
    );

    if (sessionIds.length === 0) {
      console.log("ℹ️ [hasActiveSession] No session IDs found in Redis set");
      return { hasSession: false, sessionId: null };
    }

    // Check if any of the sessions are still valid
    console.log("🔍 [hasActiveSession] Checking validity of session IDs...");
    for (const sessionId of sessionIds) {
      const sessionKey = getSessionKey(sessionId);
      console.log("🔑 [hasActiveSession] Checking session key:", sessionKey);

      const exists = await redisClient.exists(sessionKey);
      console.log("✅ [hasActiveSession] Session exists check result:", exists);

      if (exists) {
        console.log(
          "🎯 [hasActiveSession] Found valid active session:",
          sessionId
        );
        return { hasSession: true, sessionId };
      } else {
        console.log(
          "🗑️ [hasActiveSession] Removing expired session from set:",
          sessionId
        );
        // Remove expired session from set
        await redisClient.sRem(key, sessionId);
      }
    }

    console.log(
      "ℹ️ [hasActiveSession] No valid sessions found after checking all IDs"
    );
    return { hasSession: false, sessionId: null };
  } catch (error) {
    console.error("❌ [hasActiveSession] Error checking active session:", {
      error: error.message,
      stack: error.stack,
      userId,
      feature,
    });
    // Fallback to database
    console.log("🔄 [hasActiveSession] Falling back to database check...");
    return await hasActiveSessionDB(userId, feature);
  }
};

/**
 * Check if user has active session using database (fallback)
 */
export const hasActiveSessionDB = async (userId, feature) => {
  try {
    console.log(
      "🗄️ [hasActiveSessionDB] Checking database for active session:",
      {
        userId,
        feature,
        timestamp: new Date().toISOString(),
      }
    );

    const activeSession = await ClientSession.findOne({
      where: {
        user_id: userId,
        feature,
        status: "active",
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
      order: [["created_at", "DESC"]],
    });

    console.log("📊 [hasActiveSessionDB] Database query result:", {
      foundSession: !!activeSession,
      sessionId: activeSession?.session_token || null,
      sessionData: activeSession
        ? {
            id: activeSession.id,
            session_token: activeSession.session_token,
            user_id: activeSession.user_id,
            feature: activeSession.feature,
            status: activeSession.status,
            created_at: activeSession.created_at,
            expires_at: activeSession.expires_at,
          }
        : null,
    });

    const result = {
      hasSession: !!activeSession,
      sessionId: activeSession?.session_token || null,
    };

    console.log("📤 [hasActiveSessionDB] Returning result:", result);
    return result;
  } catch (error) {
    console.error("❌ [hasActiveSessionDB] Database fallback error:", {
      error: error.message,
      stack: error.stack,
      userId,
      feature,
    });
    return { hasSession: false, sessionId: null };
  }
};

/**
 * Create new session with Redis and database backup
 */
export const createSession = async (sessionData) => {
  const {
    sessionId,
    userId,
    username,
    feature,
    licenseId,
    clientFingerprint,
    expiresAt,
  } = sessionData;

  try {
    // Try Redis first
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const userSessionsKey = getUserSessionsKey(userId, feature);
      const featureCountKey = getFeatureCountKey(licenseId, feature);

      // Use Redis pipeline for atomic operations
      const pipeline = redisClient.multi();

      // Store session data
      pipeline.hSet(sessionKey, {
        userId: String(userId),
        username: String(username),
        feature: String(feature),
        licenseId: String(licenseId),
        clientFingerprint: String(clientFingerprint),
        ipAddress: String(sessionData.ipAddress || "unknown"),
        userAgent: String(sessionData.userAgent || "unknown"),
        createdAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        status: "active",
      });

      // Set TTL
      pipeline.expire(sessionKey, SESSION_TTL);

      // Add to user's session set
      pipeline.sAdd(userSessionsKey, sessionId);
      pipeline.expire(userSessionsKey, SESSION_TTL);

      // Increment feature count
      pipeline.incr(featureCountKey);
      pipeline.expire(featureCountKey, SESSION_TTL);

      await pipeline.exec();

      console.log(`[RedisSession] Session created in Redis: ${sessionId}`);
    }

    // Always backup to database
    await createSessionDB(sessionData);

    return {
      success: true,
      sessionId,
      message: "Session created successfully",
    };
  } catch (error) {
    console.error("[RedisSession] Error creating session:", error);
    throw new Error(`Failed to create session: ${error.message}`);
  }
};

/**
 * Create session in database (backup)
 */
export const createSessionDB = async (sessionData) => {
  const {
    sessionId,
    userId,
    username,
    feature,
    licenseId,
    clientFingerprint,
    expiresAt,
  } = sessionData;

  await ClientSession.create({
    session_token: sessionId,
    user_id: userId,
    username,
    feature,
    license_cache_id: licenseId,
    client_fingerprint: clientFingerprint,
    ip_address: sessionData.ipAddress || "unknown",
    user_agent: sessionData.userAgent || "unknown",
    status: "active",
    expires_at: expiresAt,
    last_heartbeat: new Date(),
  });

  console.log(`[RedisSession] Session backed up to database: ${sessionId}`);
};

/**
 * Update session heartbeat
 */
export const updateHeartbeat = async (sessionId) => {
  try {
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const exists = await redisClient.exists(sessionKey);

      if (exists) {
        await redisClient.hSet(
          sessionKey,
          "lastHeartbeat",
          new Date().toISOString()
        );
        await redisClient.expire(sessionKey, SESSION_TTL);
        console.log(
          `[RedisSession] Heartbeat updated for session: ${sessionId}`
        );
      }
    }

    // Also update database
    await ClientSession.update(
      { last_heartbeat: new Date() },
      {
        where: {
          session_token: sessionId,
          status: "active",
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error("[RedisSession] Error updating heartbeat:", error);
    return { success: false, error: error.message };
  }
};

/**
 * End session and cleanup
 */
export const endSession = async (sessionId, userId, feature) => {
  try {
    console.log("🚀 [endSession] Starting session cleanup:", {
      sessionId,
      userId,
      feature,
      timestamp: new Date().toISOString(),
    });

    let licenseId = null;

    // Get license ID from Redis first
    if (redisClient?.isReady) {
      console.log("🔍 [endSession] Redis is ready, checking session data...");
      const sessionKey = getSessionKey(sessionId);
      console.log("🔑 [endSession] Session key:", sessionKey);

      const sessionData = await redisClient.hGetAll(sessionKey);
      console.log("📊 [endSession] Session data from Redis:", sessionData);

      licenseId = sessionData.licenseId;
      console.log("🏷️ [endSession] License ID from session data:", licenseId);

      if (licenseId) {
        const userSessionsKey = getUserSessionsKey(userId, feature);
        const featureCountKey = getFeatureCountKey(licenseId, feature);

        console.log("🔑 [endSession] Redis keys:", {
          userSessionsKey,
          featureCountKey,
        });

        // Use pipeline for atomic cleanup
        console.log("⚡ [endSession] Executing Redis pipeline for cleanup...");
        const pipeline = redisClient.multi();
        pipeline.del(sessionKey);
        pipeline.sRem(userSessionsKey, sessionId);
        pipeline.decr(featureCountKey);

        const pipelineResults = await pipeline.exec();
        console.log(
          "📋 [endSession] Pipeline execution results:",
          pipelineResults
        );

        console.log(
          `✅ [endSession] Session cleaned up from Redis: ${sessionId}`
        );
      } else {
        console.log(
          "⚠️ [endSession] No license ID found in session data, skipping Redis cleanup"
        );
      }
    } else {
      console.log("⚠️ [endSession] Redis not ready, skipping Redis cleanup");
    }

    // Always cleanup database
    console.log("🗄️ [endSession] Cleaning up database session...");
    await endSessionDB(sessionId);
    console.log("✅ [endSession] Database cleanup completed");

    const result = {
      success: true,
      message: "Session ended successfully",
    };

    console.log(
      "🎉 [endSession] Session cleanup completed successfully:",
      result
    );
    return result;
  } catch (error) {
    console.error("❌ [endSession] Error ending session:", {
      error: error.message,
      stack: error.stack,
      sessionId,
      userId,
      feature,
    });
    throw new Error(`Failed to end session: ${error.message}`);
  }
};

/**
 * Force end session by sessionId only
 * Looks up userId/feature from Redis hash when available and cleans Redis + DB
 */
export const endSessionById = async (sessionId) => {
  try {
    let userId = null;
    let feature = null;
    let licenseId = null;

    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const sessionData = await redisClient.hGetAll(sessionKey);
      if (Object.keys(sessionData).length > 0) {
        userId = sessionData.userId || null;
        feature = sessionData.feature || null;
        licenseId = sessionData.licenseId || null;

        const pipeline = redisClient.multi();
        pipeline.del(sessionKey);
        if (userId && feature) {
          pipeline.sRem(getUserSessionsKey(userId, feature), sessionId);
        }
        if (licenseId && feature) {
          pipeline.decr(getFeatureCountKey(licenseId, feature));
        }
        await pipeline.exec();
        console.log(`[RedisSession] Forced cleanup for session: ${sessionId}`);
      }
    }

    // Always mark as expired in DB (noop if already expired)
    await endSessionDB(sessionId);

    return { success: true, message: "Session ended successfully" };
  } catch (error) {
    console.error("[RedisSession] Error force-ending session:", error);
    return { success: false, error: error.message };
  }
};

/**
 * End session in database
 */
export const endSessionDB = async (sessionId) => {
  try {
    console.log("🗄️ [endSessionDB] Starting database session cleanup:", {
      sessionId,
      timestamp: new Date().toISOString(),
    });

    const result = await ClientSession.update(
      {
        status: "expired",
        ended_at: new Date(),
      },
      {
        where: {
          session_token: sessionId,
          status: "active",
        },
      }
    );

    console.log("📊 [endSessionDB] Database update result:", {
      sessionId,
      affectedRows: result[0],
      result,
    });

    console.log(
      `✅ [endSessionDB] Session marked as expired in database: ${sessionId}`
    );
    return result;
  } catch (error) {
    console.error("❌ [endSessionDB] Error updating database session:", {
      error: error.message,
      stack: error.stack,
      sessionId,
    });
    throw error;
  }
};

/**
 * Get current feature count
 */
export const getFeatureCount = async (licenseId, feature) => {
  try {
    if (redisClient?.isReady) {
      const countKey = getFeatureCountKey(licenseId, feature);
      const count = await redisClient.get(countKey);
      if (count !== null) {
        return parseInt(count, 10);
      }
    }

    // Fallback to database count
    const count = await ClientSession.count({
      where: {
        license_cache_id: licenseId,
        feature,
        status: "active",
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });

    return count;
  } catch (error) {
    console.error("[RedisSession] Error getting feature count:", error);
    return 0;
  }
};

/**
 * Validate session exists and matches fingerprint
 */
export const validateSession = async (sessionId, clientFingerprint) => {
  try {
    if (redisClient?.isReady) {
      const sessionKey = getSessionKey(sessionId);
      const sessionData = await redisClient.hGetAll(sessionKey);

      if (Object.keys(sessionData).length > 0) {
        const isValid = sessionData.clientFingerprint === clientFingerprint;
        return {
          valid: isValid,
          session: isValid ? sessionData : null,
        };
      }
    }

    // Fallback to database
    const session = await ClientSession.findOne({
      where: {
        session_token: sessionId,
        client_fingerprint: clientFingerprint,
        status: "active",
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });

    return {
      valid: !!session,
      session: session || null,
    };
  } catch (error) {
    console.error("[RedisSession] Error validating session:", error);
    return { valid: false, session: null };
  }
};

/**
 * Cleanup expired sessions with enhanced logic
 */
export const cleanupExpiredSessions = async () => {
  try {
    console.log(
      "[RedisSession] Starting enhanced cleanup of expired sessions..."
    );

    // Cleanup database sessions first
    const expiredCount = await ClientSession.update(
      {
        status: "expired",
        ended_at: new Date(),
      },
      {
        where: {
          status: "active",
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      }
    );

    console.log(
      `[RedisSession] Marked ${expiredCount[0]} sessions as expired in database`
    );

    // Enhanced Redis cleanup
    if (redisClient?.isReady) {
      try {
        // Clean up sessions without recent heartbeat (more aggressive)
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        // Find sessions in database that haven't had heartbeat in the last hour
        const staleSessions = await ClientSession.findAll({
          where: {
            status: "active",
            [Op.or]: [
              { last_heartbeat: null },
              {
                last_heartbeat: {
                  [Op.lt]: oneHourAgo,
                },
              },
            ],
          },
          attributes: [
            "session_token",
            "user_id",
            "feature",
            "license_cache_id",
          ],
        });

        if (staleSessions.length > 0) {
          console.log(
            `[RedisSession] Found ${staleSessions.length} stale sessions to cleanup in Redis`
          );

          for (const session of staleSessions) {
            try {
              // Clean up from Redis
              const sessionKey = getSessionKey(session.session_token);
              const userSessionsKey = getUserSessionsKey(
                session.user_id,
                session.feature
              );
              const featureCountKey = getFeatureCountKey(
                session.license_cache_id,
                session.feature
              );

              // Use pipeline for atomic cleanup
              const pipeline = redisClient.multi();
              pipeline.del(sessionKey);
              pipeline.sRem(userSessionsKey, session.session_token);
              pipeline.decr(featureCountKey);

              const results = await pipeline.exec();
              console.log(
                `[RedisSession] Cleaned up stale session ${session.session_token} from Redis`
              );

              // Mark as expired in database
              await ClientSession.update(
                {
                  status: "expired",
                  ended_at: new Date(),
                },
                {
                  where: {
                    session_token: session.session_token,
                  },
                }
              );
            } catch (sessionError) {
              console.error(
                `[RedisSession] Error cleaning up stale session ${session.session_token}:`,
                sessionError
              );
            }
          }
        }

        // Scan for orphaned Redis keys and clean them up
        await cleanupOrphanedRedisKeys();
      } catch (redisError) {
        console.error("[RedisSession] Error during Redis cleanup:", redisError);
      }
    }

    return {
      success: true,
      expiredCount: expiredCount[0],
    };
  } catch (error) {
    console.error("[RedisSession] Error during cleanup:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Clean up orphaned Redis keys that don't have corresponding database records
 */
export const cleanupOrphanedRedisKeys = async () => {
  try {
    if (!redisClient?.isReady) return;

    console.log("[RedisSession] Scanning for orphaned Redis keys...");

    let orphanedCount = 0;
    // Prefer scanIterator to avoid cursor shape issues across redis versions
    const iterator = redisClient.scanIterator({
      MATCH: `${SESSION_PREFIX}*`,
      COUNT: 100,
    });

    for await (const key of iterator) {
      try {
        const sessionId = String(key).replace(SESSION_PREFIX, "");
        // Ensure key is the expected hash type; otherwise treat as orphan and delete
        const keyType = await redisClient.type(key);
        if (keyType !== "hash") {
          await redisClient.del(key);
          orphanedCount++;
          continue;
        }

        const sessionData = await redisClient.hGetAll(key);

        if (!sessionData || Object.keys(sessionData).length === 0) {
          // Empty key, remove it
          await redisClient.del(key);
          orphanedCount++;
          continue;
        }

        // Check if session exists in database
        const dbSession = await ClientSession.findOne({
          where: {
            session_token: sessionId,
            status: "active",
          },
        });

        if (!dbSession) {
          // Session doesn't exist in database, clean up Redis structures
          const userId = sessionData.userId;
          const feature = sessionData.feature;
          const licenseId = sessionData.licenseId;

          if (userId && feature && licenseId) {
            const userSessionsKey = getUserSessionsKey(userId, feature);
            const featureCountKey = getFeatureCountKey(licenseId, feature);

            const pipeline = redisClient.multi();
            pipeline.del(key);
            // Only sRem if the key is a set; otherwise delete wrong-typed key
            const userSetType = await redisClient.type(userSessionsKey);
            if (userSetType === "set") {
              pipeline.sRem(userSessionsKey, sessionId);
            } else if (userSetType !== "none") {
              pipeline.del(userSessionsKey);
            }
            // Only decr if counter is a string/integer; otherwise delete
            const counterType = await redisClient.type(featureCountKey);
            if (counterType === "string") {
              pipeline.decr(featureCountKey);
            } else if (counterType !== "none") {
              pipeline.del(featureCountKey);
            }
            await pipeline.exec();
          } else {
            await redisClient.del(key);
          }
          orphanedCount++;
        }
      } catch (keyError) {
        console.error(`[RedisSession] Error processing key ${key}:`, keyError);
      }
    }

    if (orphanedCount > 0) {
      console.log(
        `[RedisSession] Cleaned up ${orphanedCount} orphaned Redis keys`
      );
    }
  } catch (error) {
    console.error("[RedisSession] Error during orphaned key cleanup:", error);
  }
};

/**
 * Force cleanup of all sessions for a specific user (admin function)
 */
export const forceCleanupUserSessions = async (userId, feature) => {
  try {
    console.log(
      `[RedisSession] Force cleaning up all sessions for user ${userId}, feature ${feature}`
    );

    // Get all sessions for this user/feature
    const userSessionsKey = getUserSessionsKey(userId, feature);
    const sessionIds = await redisClient.sMembers(userSessionsKey);

    if (sessionIds.length > 0) {
      console.log(
        `[RedisSession] Found ${sessionIds.length} sessions to force cleanup`
      );

      for (const sessionId of sessionIds) {
        try {
          const sessionKey = getSessionKey(sessionId);
          const sessionData = await redisClient.hGetAll(sessionKey);
          const licenseId = sessionData.licenseId;

          if (licenseId) {
            const featureCountKey = getFeatureCountKey(licenseId, feature);

            // Clean up Redis
            const pipeline = redisClient.multi();
            pipeline.del(sessionKey);
            pipeline.sRem(userSessionsKey, sessionId);
            pipeline.decr(featureCountKey);
            await pipeline.exec();
          }
        } catch (sessionError) {
          console.error(
            `[RedisSession] Error force cleaning up session ${sessionId}:`,
            sessionError
          );
        }
      }
    }

    // Clean up database sessions
    await ClientSession.update(
      {
        status: "expired",
        ended_at: new Date(),
      },
      {
        where: {
          user_id: userId,
          feature: feature,
          status: "active",
        },
      }
    );

    console.log(`[RedisSession] Force cleanup completed for user ${userId}`);

    return {
      success: true,
      message: `Force cleanup completed for user ${userId}`,
    };
  } catch (error) {
    console.error("[RedisSession] Error during force cleanup:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get all active sessions for debugging
 */
export const getActiveSessions = async (userId = null, feature = null) => {
  try {
    const whereClause = {
      status: "active",
      expires_at: {
        [Op.gt]: new Date(),
      },
    };

    if (userId) whereClause.user_id = userId;
    if (feature) whereClause.feature = feature;

    const sessions = await ClientSession.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    return sessions;
  } catch (error) {
    console.error("[RedisSession] Error getting active sessions:", error);
    return [];
  }
};

// Export a default object for backward compatibility
export default {
  hasActiveSession,
  hasActiveSessionDB,
  createSession,
  createSessionDB,
  updateHeartbeat,
  endSession,
  endSessionDB,
  getFeatureCount,
  validateSession,
  cleanupExpiredSessions,
  getActiveSessions,
  getSessionKey,
  getUserSessionsKey,
  getFeatureCountKey,
};
