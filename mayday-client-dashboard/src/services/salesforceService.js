import axios from "axios";

// Base API URL - adjust based on your backend configuration
const API_BASE_URL = process.env.REACT_APP_SLAVE_SERVER_API_URL
  ? `${process.env.REACT_APP_SLAVE_SERVER_API_URL}/salesforce`
  : process.env.NODE_ENV === "production"
  ? "/api/salesforce"
  : "http://localhost:8004/api/salesforce";

class SalesforceService {
  // Configuration management
  async getConfiguration() {
    try {
      const response = await axios.get(`${API_BASE_URL}/config`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch Salesforce configuration:", error);
      throw error;
    }
  }

  async saveConfiguration(config) {
    try {
      const response = await axios.post(`${API_BASE_URL}/config`, config);
      return response.data;
    } catch (error) {
      console.error("Failed to save Salesforce configuration:", error);
      throw error;
    }
  }

  async updateConfiguration(config) {
    try {
      const response = await axios.put(`${API_BASE_URL}/config`, config);
      return response.data;
    } catch (error) {
      console.error("Failed to update Salesforce configuration:", error);
      throw error;
    }
  }

  // Connection management
  async testConnection(credentials) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/test-connection`,
        credentials
      );
      return response.data;
    } catch (error) {
      console.error("Connection test failed:", error);
      throw error;
    }
  }

  async getConnectionStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/status`);
      return response.data;
    } catch (error) {
      console.error("Failed to get connection status:", error);
      throw error;
    }
  }

  // Authentication
  async authenticate() {
    try {
      const response = await axios.post(`${API_BASE_URL}/authenticate`);
      return response.data;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const response = await axios.post(`${API_BASE_URL}/refresh-token`);
      return response.data;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  // Data synchronization
  async syncData(options = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/sync`, options);
      return response.data;
    } catch (error) {
      console.error("Data synchronization failed:", error);
      throw error;
    }
  }

  async getSyncStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/sync/status`);
      return response.data;
    } catch (error) {
      console.error("Failed to get sync status:", error);
      throw error;
    }
  }

  async getSyncHistory(limit = 10) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/sync/history?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get sync history:", error);
      throw error;
    }
  }

  // Contact management
  async getContacts(options = {}) {
    try {
      const { page = 1, limit = 50, search = "", filters = {} } = options;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        ...filters,
      });

      const response = await axios.get(`${API_BASE_URL}/contacts?${params}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      throw error;
    }
  }

  async getContact(contactId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts/${contactId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch contact:", error);
      throw error;
    }
  }

  async createContact(contactData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/contacts`,
        contactData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create contact:", error);
      throw error;
    }
  }

  async updateContact(contactId, contactData) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/contacts/${contactId}`,
        contactData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update contact:", error);
      throw error;
    }
  }

  // Account management
  async getAccounts(options = {}) {
    try {
      const { page = 1, limit = 50, search = "", filters = {} } = options;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        ...filters,
      });

      const response = await axios.get(`${API_BASE_URL}/accounts?${params}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      throw error;
    }
  }

  async getAccount(accountId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch account:", error);
      throw error;
    }
  }

  // Lead management
  async getLeads(options = {}) {
    try {
      const { page = 1, limit = 50, search = "", filters = {} } = options;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        ...filters,
      });

      const response = await axios.get(`${API_BASE_URL}/leads?${params}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      throw error;
    }
  }

  // Field mapping
  async getFieldMappings() {
    try {
      const response = await axios.get(`${API_BASE_URL}/field-mappings`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch field mappings:", error);
      throw error;
    }
  }

  async saveFieldMappings(mappings) {
    try {
      const response = await axios.post(`${API_BASE_URL}/field-mappings`, {
        mappings,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to save field mappings:", error);
      throw error;
    }
  }

  // Analytics and reporting
  async getAnalytics(dateRange = {}) {
    try {
      const params = new URLSearchParams(dateRange);
      const response = await axios.get(`${API_BASE_URL}/analytics?${params}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      throw error;
    }
  }

  async getSyncMetrics(dateRange = {}) {
    try {
      const params = new URLSearchParams(dateRange);
      const response = await axios.get(`${API_BASE_URL}/metrics?${params}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch sync metrics:", error);
      throw error;
    }
  }

  // Call integration
  async logCall(callData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/calls/log`, callData);
      return response.data;
    } catch (error) {
      console.error("Failed to log call:", error);
      throw error;
    }
  }

  async searchByPhone(phoneNumber) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/search/phone/${encodeURIComponent(phoneNumber)}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to search by phone:", error);
      throw error;
    }
  }

  async getContactByPhone(phoneNumber) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/contacts/phone/${encodeURIComponent(phoneNumber)}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get contact by phone:", error);
      throw error;
    }
  }

  // Screen pop functionality
  async triggerScreenPop(contactId, callData = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/screen-pop`, {
        contactId,
        callData,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to trigger screen pop:", error);
      throw error;
    }
  }

  // Utility methods
  async validateCredentials(credentials) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/validate-credentials`,
        credentials
      );
      return response.data;
    } catch (error) {
      console.error("Credential validation failed:", error);
      throw error;
    }
  }

  async getApiLimits() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api-limits`);
      return response.data;
    } catch (error) {
      console.error("Failed to get API limits:", error);
      throw error;
    }
  }

  async getSystemInfo() {
    try {
      const response = await axios.get(`${API_BASE_URL}/system-info`);
      return response.data;
    } catch (error) {
      console.error("Failed to get system info:", error);
      throw error;
    }
  }

  // Error handling helper
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        status,
        message: data.message || data.error || "Unknown server error",
        details: data.details || null,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        status: 0,
        message: "Network error - unable to connect to server",
        details: null,
      };
    } else {
      // Something else happened
      return {
        status: -1,
        message: error.message || "Unknown error occurred",
        details: null,
      };
    }
  }
}

// Create and export a singleton instance
const salesforceService = new SalesforceService();
export default salesforceService;
