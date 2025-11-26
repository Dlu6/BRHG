// services/tokenManager.js
import { getAuthToken, getRefreshToken } from "./storageService";

/**
 * Parse JWT payload without verification
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null
 */
export const parseJwtPayload = (token) => {
  try {
    if (!token) {
      return null;
    }

    // Handle Bearer prefix if present
    const actualToken = token.replace(/^Bearer\s+/i, "");

    // Split token into parts
    const parts = actualToken.split(".");
    if (parts.length !== 3) {
      console.warn("⚠️ [TokenManager] Invalid token structure");
      return null;
    }

    // Decode payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error("❌ [TokenManager] Failed to parse JWT payload:", error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  try {
    const payload = parseJwtPayload(token);
    if (!payload || !payload.exp) {
      return true; // No expiry means treat as expired
    }

    // Compare expiry time (in seconds) with current time
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error("❌ [TokenManager] Error checking token expiry:", error);
    return true; // Treat errors as expired
  }
};

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {number|null} - Expiry timestamp in seconds or null
 */
export const getTokenExpiryTime = (token) => {
  try {
    const payload = parseJwtPayload(token);
    return payload?.exp || null;
  } catch (error) {
    console.error("❌ [TokenManager] Error getting token expiry:", error);
    return null;
  }
};

/**
 * Check if token should be refreshed
 * @param {string} token - JWT token
 * @param {number} bufferMinutes - Buffer time in minutes before expiry (default: 15)
 * @returns {boolean} - True if should refresh, false otherwise
 */
export const shouldRefreshToken = (token, bufferMinutes = 15) => {
  try {
    const payload = parseJwtPayload(token);
    if (!payload || !payload.exp) {
      return true; // No expiry means should refresh
    }

    // Calculate buffer time in seconds
    const bufferSeconds = bufferMinutes * 60;
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;

    // Refresh if less than buffer time remaining
    return timeUntilExpiry < bufferSeconds;
  } catch (error) {
    console.error("❌ [TokenManager] Error checking if should refresh:", error);
    return true; // Default to should refresh on error
  }
};

/**
 * Get time until token expiry in minutes
 * @param {string} token - JWT token
 * @returns {number|null} - Minutes until expiry or null
 */
export const getTimeUntilExpiry = (token) => {
  try {
    const payload = parseJwtPayload(token);
    if (!payload || !payload.exp) {
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    return Math.floor(timeUntilExpiry / 60); // Convert to minutes
  } catch (error) {
    console.error("❌ [TokenManager] Error getting time until expiry:", error);
    return null;
  }
};

// Token monitoring state
let monitoringInterval = null;
let monitoringCallback = null;

/**
 * Start token monitoring
 * @param {function} callback - Callback to execute when token needs refresh
 * @param {number} checkIntervalSeconds - Check interval in seconds (default: 60)
 */
export const startTokenMonitoring = (callback, checkIntervalSeconds = 60) => {
  // Stop any existing monitoring
  stopTokenMonitoring();

  console.log(`🔄 [TokenManager] Starting token monitoring (checking every ${checkIntervalSeconds}s)`);

  monitoringCallback = callback;

  // Set up monitoring interval
  monitoringInterval = setInterval(() => {
    const token = getAuthToken();
    const refreshToken = getRefreshToken();

    if (!token || !refreshToken) {
      console.warn("⚠️ [TokenManager] No tokens found, stopping monitoring");
      stopTokenMonitoring();
      return;
    }

    // Check if token should be refreshed
    if (shouldRefreshToken(token)) {
      const minutesUntilExpiry = getTimeUntilExpiry(token);
      console.log(
        `🔄 [TokenManager] Token needs refresh (${minutesUntilExpiry} minutes until expiry)`
      );

      // Call the callback to trigger refresh
      if (monitoringCallback) {
        monitoringCallback();
      }
    } else {
      const minutesUntilExpiry = getTimeUntilExpiry(token);
      // Only log every 5 minutes to reduce noise
      const checkCount = Math.floor(Date.now() / 1000 / checkIntervalSeconds);
      if (checkCount % 5 === 0) {
        console.log(
          `✅ [TokenManager] Token still valid (${minutesUntilExpiry} minutes remaining)`
        );
      }
    }
  }, checkIntervalSeconds * 1000);

  console.log("✅ [TokenManager] Token monitoring started");
};

/**
 * Stop token monitoring
 */
export const stopTokenMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    monitoringCallback = null;
    console.log("✅ [TokenManager] Token monitoring stopped");
  }
};

/**
 * Check if monitoring is active
 * @returns {boolean} - True if monitoring is active
 */
export const isMonitoring = () => {
  return monitoringInterval !== null;
};

// Export the token manager service
export const tokenManager = {
  parseJwtPayload,
  isTokenExpired,
  getTokenExpiryTime,
  shouldRefreshToken,
  getTimeUntilExpiry,
  startTokenMonitoring,
  stopTokenMonitoring,
  isMonitoring,
};

export default tokenManager;

