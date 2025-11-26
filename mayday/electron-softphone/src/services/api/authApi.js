// services/api/authApi.js
import axios from "axios";

// Get API base URL
const getApiUrl = () => {
  const isDev =
    process.env.NODE_ENV === "development" ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.MODE === "development");

  if (isDev) {
    return "http://localhost:8004";
  }

  // Production URL
  return (
    import.meta.env?.VITE_API_URL ||
    window.location.origin + "/mayday-api" ||
    "https://cs.brhgroup.co/mayday-api"
  );
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @param {string} fingerprint - Client fingerprint (optional)
 * @returns {Promise<{token: string, refreshToken: string, user: object}>}
 */
export const refreshToken = async (refreshToken, fingerprint = null) => {
  try {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/users/refresh-token`;

    console.log(`🔄 [AuthApi] Refreshing token at ${endpoint}`);

    const response = await axios.post(
      endpoint,
      {
        refreshToken,
        fingerprint: fingerprint || generateFingerprint(),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (response.data.success) {
      console.log("✅ [AuthApi] Token refreshed successfully");
      return {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
      };
    } else {
      throw new Error(response.data.error || "Failed to refresh token");
    }
  } catch (error) {
    console.error("❌ [AuthApi] Token refresh failed:", error);

    // Check if it's a refresh token expiry error
    if (
      error.response?.status === 403 ||
      error.response?.data?.requiresReLogin
    ) {
      throw new Error("REFRESH_TOKEN_EXPIRED");
    }

    // Network or timeout errors
    if (error.code === "ECONNABORTED" || error.message === "Network Error") {
      throw new Error("NETWORK_ERROR");
    }

    throw error;
  }
};

/**
 * Generate a simple client fingerprint
 * @returns {string} - Client fingerprint
 */
const generateFingerprint = () => {
  try {
    // Use browser/device information to create a simple fingerprint
    const userAgent = navigator.userAgent || "unknown";
    const language = navigator.language || "en";
    const platform = navigator.platform || "unknown";
    const screenResolution = `${screen.width}x${screen.height}`;

    // Create a simple hash
    const fingerprintString = `${userAgent}-${language}-${platform}-${screenResolution}`;

    // Simple hash function (for demo - in production use a proper library)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `fp_${Math.abs(hash).toString(36)}`;
  } catch (error) {
    console.warn("⚠️ [AuthApi] Error generating fingerprint:", error);
    return `fp_${Date.now().toString(36)}`;
  }
};

/**
 * Logout and revoke refresh token
 * @param {string} extension - User extension
 * @param {string} refreshToken - Refresh token to revoke
 * @returns {Promise<void>}
 */
export const logout = async (extension, refreshToken) => {
  try {
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/users/agent-logout`;

    console.log(`🔄 [AuthApi] Logging out extension ${extension}`);

    await axios.post(
      endpoint,
      {
        extension,
        refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    console.log("✅ [AuthApi] Logout successful");
  } catch (error) {
    console.error("❌ [AuthApi] Logout failed:", error);
    // Don't throw - logout should continue even if API call fails
  }
};

// Export the auth API service
export const authApi = {
  refreshToken,
  logout,
  generateFingerprint,
};

export default authApi;
