import config from "./config.js";

const pauseService = {
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
      console.error(`[PauseService] ${context} failed:`, {
        status: response.status,
        statusText: response.statusText,
        responseData,
      });

      // Handle specific error formats
      if (responseData.success === false) {
        const errorMessage =
          responseData.details || responseData.message || `${context} failed`;

        if (responseData.errorType === "JsonWebTokenError") {
          throw new Error(
            `Authentication Error: ${errorMessage}\n\nPlease log out and log in again to get a fresh token.`
          );
        } else if (responseData.errorType === "TokenExpiredError") {
          throw new Error(
            `Session Expired: ${errorMessage}\n\nYour login session has expired. Please log in again.`
          );
        } else {
          throw new Error(`${context} Error: ${errorMessage}`);
        }
      } else {
        throw new Error(
          responseData.message || `${context} failed: ${response.statusText}`
        );
      }
    }

    return responseData;
  },

  /**
   * Pause the current agent
   * @param {string} token - Authentication token
   * @param {string} pauseReason - Reason for pause (optional)
   * @returns {Promise<Object>} Pause operation result
   */
  async pauseAgent(token, pauseReason = "Manual Pause") {
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

      const response = await fetch(endpoints.users.pause, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pauseReason: pauseReason,
        }),
      });

      const result = await this.handleApiResponse(response, "Pause agent");

      return result;
    } catch (error) {
      console.error("[PauseService] Error pausing agent:", error);
      throw error;
    }
  },

  /**
   * Unpause the current agent
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} Unpause operation result
   */
  async unpauseAgent(token) {
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

      const response = await fetch(endpoints.users.unpause, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      const result = await this.handleApiResponse(response, "Unpause agent");

      return result;
    } catch (error) {
      console.error("[PauseService] Error unpausing agent:", error);
      throw error;
    }
  },

  /**
   * Get current agent pause status
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} Pause status data
   */
  async getPauseStatus(token) {
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

      const response = await fetch(endpoints.users.pauseStatus, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      const result = await this.handleApiResponse(response, "Get pause status");

      return result;
    } catch (error) {
      console.error("[PauseService] Error getting pause status:", error);
      throw error;
    }
  },

  /**
   * Toggle pause status (pause if unpaused, unpause if paused)
   * @param {string} token - Authentication token
   * @param {boolean} currentlyPaused - Current pause state
   * @param {string} pauseReason - Reason for pause (when pausing)
   * @returns {Promise<Object>} Toggle operation result
   */
  async togglePause(token, currentlyPaused, pauseReason = "Manual Pause") {
    try {
      if (currentlyPaused) {
        console.log("[PauseService] Toggling to unpause agent");
        return await this.unpauseAgent(token);
      } else {
        console.log("[PauseService] Toggling to pause agent");
        return await this.pauseAgent(token, pauseReason);
      }
    } catch (error) {
      console.error("[PauseService] Error toggling pause status:", error);
      throw error;
    }
  },

  /**
   * Get user-friendly pause status text
   * @param {boolean} isPaused - Whether agent is paused
   * @param {string} pauseReason - Reason for pause
   * @returns {string} Status text
   */
  getPauseStatusText(isPaused, pauseReason = null) {
    if (!isPaused) {
      return "Available";
    }

    if (pauseReason) {
      return `Paused: ${pauseReason}`;
    }

    return "Paused";
  },

  /**
   * Get pause status color for UI
   * @param {boolean} isPaused - Whether agent is paused
   * @returns {string} Color code
   */
  getPauseStatusColor(isPaused) {
    return isPaused ? "#f39c12" : "#27ae60"; // Orange for paused, green for available
  },

  /**
   * Get pause button title based on current state
   * @param {boolean} isPaused - Whether agent is paused
   * @returns {string} Button title
   */
  getPauseButtonTitle(isPaused) {
    return isPaused
      ? "Click to resume and receive calls"
      : "Click to pause and stop receiving calls";
  },
};

export default pauseService;
