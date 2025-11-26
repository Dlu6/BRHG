// services/refreshTokenService.js
import RefreshToken from "../models/refreshTokenModel.js";
import { generateRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { Op } from "sequelize";
import sequelize from "../config/sequelize.js";

const createRefreshTokenService = () => {
  /**
   * Create a new refresh token for a user
   * @param {number} userId - User ID
   * @param {string} clientFingerprint - Client device fingerprint (optional)
   * @returns {Promise<{token: string, expiresAt: Date}>}
   */
  const createRefreshToken = async (userId, clientFingerprint = null) => {
    try {
      // Generate JWT refresh token
      const token = generateRefreshToken(userId);

      // Calculate expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store in database
      const refreshToken = await RefreshToken.create({
        userId,
        token,
        clientFingerprint,
        expiresAt,
      });

      console.log(
        `✅ [RefreshTokenService] Created refresh token for user ${userId}`
      );

      return {
        token: refreshToken.token,
        expiresAt: refreshToken.expiresAt,
      };
    } catch (error) {
      console.error(
        "[RefreshTokenService] Error creating refresh token:",
        error
      );
      throw new Error(`Failed to create refresh token: ${error.message}`);
    }
  };

  /**
   * Validate a refresh token
   * @param {string} token - Refresh token to validate
   * @returns {Promise<{valid: boolean, userId?: number, error?: string}>}
   */
  const validateRefreshToken = async (token) => {
    try {
      // First verify JWT signature and expiration
      const decoded = verifyRefreshToken(token);

      // Check if token exists in database
      const storedToken = await RefreshToken.findOne({
        where: {
          token,
          expiresAt: {
            [Op.gt]: new Date(), // Token not expired
          },
        },
      });

      if (!storedToken) {
        return {
          valid: false,
          error: "Refresh token not found or expired",
        };
      }

      console.log(
        `✅ [RefreshTokenService] Validated refresh token for user ${decoded.userId}`
      );

      return {
        valid: true,
        userId: decoded.userId,
        tokenId: storedToken.id,
      };
    } catch (error) {
      console.error("[RefreshTokenService] Token validation failed:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  };

  /**
   * Revoke a specific refresh token
   * @param {string} token - Refresh token to revoke
   * @returns {Promise<boolean>}
   */
  const revokeRefreshToken = async (token) => {
    try {
      const result = await RefreshToken.destroy({
        where: { token },
      });

      if (result > 0) {
        console.log(`✅ [RefreshTokenService] Revoked refresh token`);
        return true;
      }

      console.warn(
        `⚠️ [RefreshTokenService] Refresh token not found for revocation`
      );
      return false;
    } catch (error) {
      console.error(
        "[RefreshTokenService] Error revoking refresh token:",
        error
      );
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  };

  /**
   * Revoke all refresh tokens for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Number of tokens revoked
   */
  const revokeAllUserTokens = async (userId) => {
    try {
      const count = await RefreshToken.destroy({
        where: { userId },
      });

      console.log(
        `✅ [RefreshTokenService] Revoked ${count} refresh tokens for user ${userId}`
      );
      return count;
    } catch (error) {
      console.error(
        "[RefreshTokenService] Error revoking all user tokens:",
        error
      );
      throw new Error(`Failed to revoke user tokens: ${error.message}`);
    }
  };

  /**
   * Clean up expired refresh tokens
   * @returns {Promise<number>} - Number of tokens deleted
   */
  const cleanupExpiredTokens = async () => {
    try {
      // Check if table exists first (for initial setup)
      const [results] = await sequelize.query(
        "SHOW TABLES LIKE 'refresh_tokens'"
      );
      
      if (results.length === 0) {
        console.log("ℹ️ [RefreshTokenService] refresh_tokens table doesn't exist yet, skipping cleanup");
        return 0;
      }

      const count = await RefreshToken.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date(), // Expired tokens
          },
        },
      });

      if (count > 0) {
        console.log(
          `✅ [RefreshTokenService] Cleaned up ${count} expired refresh tokens`
        );
      }

      return count;
    } catch (error) {
      // Handle table doesn't exist error gracefully
      if (error.name === "SequelizeDatabaseError" && 
          error.parent?.code === "ER_NO_SUCH_TABLE") {
        console.log("ℹ️ [RefreshTokenService] refresh_tokens table doesn't exist yet, skipping cleanup");
        return 0;
      }
      
      console.error(
        "[RefreshTokenService] Error cleaning up expired tokens:",
        error
      );
      throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
    }
  };

  /**
   * Rotate a refresh token (create new one and revoke old one)
   * @param {string} oldToken - Old refresh token
   * @param {string} clientFingerprint - Client device fingerprint (optional)
   * @returns {Promise<{token: string, expiresAt: Date}>}
   */
  const rotateRefreshToken = async (oldToken, clientFingerprint = null) => {
    try {
      // Validate old token
      const validation = await validateRefreshToken(oldToken);

      if (!validation.valid) {
        throw new Error(validation.error || "Invalid refresh token");
      }

      // Create new refresh token
      const newToken = await createRefreshToken(
        validation.userId,
        clientFingerprint
      );

      // Revoke old token
      await revokeRefreshToken(oldToken);

      console.log(
        `✅ [RefreshTokenService] Rotated refresh token for user ${validation.userId}`
      );

      return newToken;
    } catch (error) {
      console.error(
        "[RefreshTokenService] Error rotating refresh token:",
        error
      );
      throw new Error(`Failed to rotate refresh token: ${error.message}`);
    }
  };

  /**
   * Get count of active refresh tokens for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>}
   */
  const getUserTokenCount = async (userId) => {
    try {
      const count = await RefreshToken.count({
        where: {
          userId,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
      });

      return count;
    } catch (error) {
      console.error(
        "[RefreshTokenService] Error getting user token count:",
        error
      );
      return 0;
    }
  };

  return {
    createRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    cleanupExpiredTokens,
    rotateRefreshToken,
    getUserTokenCount,
  };
};

// Create singleton instance
const refreshTokenService = createRefreshTokenService();

export default refreshTokenService;
