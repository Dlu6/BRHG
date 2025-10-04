import config from "./config.js";

const licenseService = {
  // Enhanced error handler for API responses
  async handleApiResponse(response, context = "API call") {
    let responseData;
    try {
      responseData = await response.json();
    } catch (jsonError) {
      throw new Error(
        `Failed to parse response for ${context}: ${response.statusText}`
      );
    }

    if (!response.ok) {
      console.error(`[LicenseService] ${context} failed:`, {
        status: response.status,
        statusText: response.statusText,
        responseData,
      });

      // Handle specific error formats from enhanced authMiddleware
      if (responseData.success === false) {
        const errorMessage =
          responseData.details || responseData.message || `${context} failed`;

        // Add specific guidance based on error type
        if (responseData.errorType === "JsonWebTokenError") {
          throw new Error(
            `Authentication Error: ${errorMessage}\n\nPlease log out and log in again to get a fresh token.`
          );
        } else if (responseData.errorType === "TokenExpiredError") {
          throw new Error(
            `Session Expired: ${errorMessage}\n\nYour login session has expired. Please log in again.`
          );
        } else if (responseData.message?.includes("Maximum user limit")) {
          throw new Error(`License Limit Reached: ${errorMessage}`);
        } else if (responseData.message?.includes("already logged in")) {
          throw new Error(`Concurrent Session Error: ${errorMessage}`);
        } else if (responseData.message?.includes("not enabled")) {
          throw new Error(`Feature Not Licensed: ${errorMessage}`);
        } else {
          throw new Error(`${context} Error: ${errorMessage}`);
        }
      } else {
        // Fallback for older error format
        throw new Error(
          responseData.message || `${context} failed: ${response.statusText}`
        );
      }
    }

    return responseData;
  },

  async getCurrentLicense(token) {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      // For this API call, we need to handle the token properly
      let authHeader;
      if (token.startsWith("Bearer ")) {
        // Token already has Bearer prefix, use as-is
        authHeader = token;
      } else {
        // Token doesn't have Bearer prefix, add it
        authHeader = `Bearer ${token}`;
      }

      const response = await fetch(endpoints.license.current, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      return await this.handleApiResponse(response, "Get current license");
    } catch (error) {
      console.error("[LicenseService] Error fetching license:", error);
      throw error;
    }
  },

  // Atomic session setup - eliminates race condition between validate and create
  async atomicSessionSetup(token, username, fingerprint) {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      // Validate inputs
      if (!username) throw new Error("Username is required for session setup");
      if (!fingerprint)
        throw new Error("Client fingerprint is required for session setup");

      // Handle token with or without Bearer prefix
      let authHeader;
      if (token.startsWith("Bearer ")) {
        authHeader = token;
      } else {
        authHeader = `Bearer ${token}`;
      }

      const response = await fetch(endpoints.license.sessions.atomicSetup, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          clientFingerprint: fingerprint,
          feature: "webrtc_extension",
        }),
      });

      return await this.handleApiResponse(response, "Atomic session setup");
    } catch (error) {
      console.error("[LicenseService] Error in atomic session setup:", error);
      throw error;
    }
  },

  async validateUserSession(token, username, fingerprint) {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      // Validate inputs
      if (!username)
        throw new Error("Username is required for session validation");
      if (!fingerprint)
        throw new Error(
          "Client fingerprint is required for session validation"
        );

      // Handle token with or without Bearer prefix
      let authHeader;
      if (token.startsWith("Bearer ")) {
        authHeader = token;
      } else {
        authHeader = `Bearer ${token}`;
      }

      const response = await fetch(endpoints.license.sessions.validate, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          clientFingerprint: fingerprint,
          feature: "webrtc_extension",
        }),
      });

      return await this.handleApiResponse(response, "Validate user session");
    } catch (error) {
      console.error("[LicenseService] Error validating session:", error);
      throw error;
    }
  },

  async createUserSession(token, username, fingerprint) {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      // Validate inputs
      if (!username)
        throw new Error("Username is required for session creation");
      if (!fingerprint)
        throw new Error("Client fingerprint is required for session creation");

      // Handle token with or without Bearer prefix
      let authHeader;
      if (token.startsWith("Bearer ")) {
        authHeader = token;
      } else {
        authHeader = `Bearer ${token}`;
      }

      const response = await fetch(endpoints.license.sessions.create, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          clientFingerprint: fingerprint,
          feature: "webrtc_extension",
        }),
      });

      return await this.handleApiResponse(response, "Create user session");
    } catch (error) {
      console.error("[LicenseService] Error creating session:", error);
      throw error;
    }
  },

  async endUserSession(token, username) {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      // Validate inputs
      if (!username) throw new Error("Username is required for ending session");

      // Handle token with or without Bearer prefix
      let authHeader;
      if (token.startsWith("Bearer ")) {
        authHeader = token;
      } else {
        authHeader = `Bearer ${token}`;
      }

      const response = await fetch(endpoints.license.sessions.end, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          feature: "webrtc_extension",
        }),
      });

      return await this.handleApiResponse(response, "End user session");
    } catch (error) {
      console.error("[LicenseService] Error ending session:", error);
      throw error;
    }
  },

  async getSessionCount(token) {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      // Handle token with or without Bearer prefix
      let authHeader;
      if (token.startsWith("Bearer ")) {
        authHeader = token;
      } else {
        authHeader = `Bearer ${token}`;
      }

      const response = await fetch(endpoints.license.sessions.count, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      return await this.handleApiResponse(response, "Get session count");
    } catch (error) {
      console.error("[LicenseService] Error getting session count:", error);
      throw error;
    }
  },

  generateClientFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Browser fingerprint", 2, 2);

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || "unknown",
        navigator.platform,
      ].join("|");

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      const hashedFingerprint = Math.abs(hash).toString(16);
      console.log(
        "[LicenseService] Generated client fingerprint:",
        hashedFingerprint
      );
      return hashedFingerprint;
    } catch (error) {
      console.error("[LicenseService] Error generating fingerprint:", error);
      // Fallback fingerprint
      return "fallback-" + Date.now().toString(16);
    }
  },
};

export default licenseService;
