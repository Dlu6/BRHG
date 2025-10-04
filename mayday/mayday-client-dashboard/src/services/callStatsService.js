// Import the shared apiClient instead of axios
import apiClient from "../api/apiClient";

/**
 * Service for fetching call statistics from Asterisk
 */
const callStatsService = {
  /**
   * Get current call statistics
   * @returns {Promise<Object>} Call statistics data
   */
  getCallStats: async () => {
    try {
      // Use apiClient instead of custom API
      const response = await apiClient.get("/admin/call-stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching call statistics:", error);
      // Return fallback data in case of error
      return {
        waiting: 0,
        talking: 0,
        answered: 0,
        abandoned: 0,
        totalOffered: 0,
        avgHoldTime: 0,
      };
    }
  },

  /**
   * Get queue activity metrics
   * @returns {Promise<Object>} Queue activity data
   */
  getQueueActivity: async () => {
    try {
      // Use apiClient instead of custom API
      const response = await apiClient.get("/admin/queue-activity");
      return response.data;
    } catch (error) {
      console.error("Error fetching queue activity:", error);
      // Return fallback data in case of error
      return {
        serviceLevel: 0,
        waitTime: 0,
        abandonRate: 0,
      };
    }
  },

  /**
   * Get abandon rate statistics for different time periods
   * @returns {Promise<Object>} Abandon rate statistics data
   */
  getAbandonRateStats: async () => {
    try {
      // Use apiClient instead of custom API
      const response = await apiClient.get("/admin/abandon-rate-stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching abandon rate statistics:", error);
      // Return fallback data in case of error
      return {
        today: { totalCalls: 0, abandonedCalls: 0, abandonRate: 0 },
        week: { totalCalls: 0, abandonedCalls: 0, abandonRate: 0 },
        month: { totalCalls: 0, abandonedCalls: 0, abandonRate: 0 },
        hourlyBreakdown: [],
      };
    }
  },

  /**
   * Get historical call data for trends
   * @param {string} timeframe - Time period for historical data (hour, day, week)
   * @returns {Promise<Object>} Historical call data
   */
  getHistoricalData: async (timeframe = "hour") => {
    try {
      // Use apiClient instead of custom API
      const response = await apiClient.get(
        `/admin/historical-stats?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      return null;
    }
  },
};

export default callStatsService;
