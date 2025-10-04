import axios from "axios";

// Create axios instance with base configuration for the Mayday server
const licenseMgmtAPI = axios.create({
  baseURL: process.env.REACT_APP_LICENSE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

licenseMgmtAPI.interceptors.request.use(
  (config) => {
    config.headers["X-Internal-API-Key"] =
      process.env.REACT_APP_SECRET_INTERNAL_API_KEY;
    // Attach admin JWT if available so admin-only routes (e.g. cleanup-sessions) authorize
    const token =
      typeof window !== "undefined" && localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// License Management API calls that use the separate instance.
export const licenseAPI = {
  getLicenses: async () => {
    try {
      const response = await licenseMgmtAPI.get("/licenses");
      // console.log(response, "License response >>>>>>>>>>>>>>>>");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getLicense: (id) => licenseMgmtAPI.get(`/licenses/${id}`),
  generateLicense: async (data) => {
    try {
      const response = await licenseMgmtAPI.post("/licenses/generate", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateLicense: async (id, data) => {
    try {
      const response = await licenseMgmtAPI.put(`/licenses/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateLicenseStatus: async (id, status) => {
    try {
      const response = await licenseMgmtAPI.put(`/licenses/${id}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getLicenseTypes: async () => {
    try {
      console.log("Making request to license types endpoint...");
      const response = await licenseMgmtAPI.get("/licenses/types");
      // console.log("License types response:", response.data); !Important log
      return response.data;
    } catch (error) {
      console.error("Error fetching license types:", error);
      throw error.response?.data || error.message;
    }
  },
  createLicenseType: (data) => licenseMgmtAPI.post("/licenses/types", data),
  updateLicenseType: async (id, data) => {
    try {
      const response = await licenseMgmtAPI.put(`/licenses/types/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteLicenseType: (id) => licenseMgmtAPI.delete(`/licenses/types/${id}`),
  getAllFeatures: async () => {
    try {
      const response = await licenseMgmtAPI.get("/licenses/features");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getServerFingerprint: async () => {
    try {
      const response = await licenseMgmtAPI.get("/licenses/fingerprint");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateWebRTCAllocation: async (id, data) => {
    try {
      const response = await licenseMgmtAPI.put(
        `/licenses/${id}/webrtc-allocation`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getWebRTCSessions: async (id) => {
    try {
      const response = await licenseMgmtAPI.get(
        `/licenses/${id}/webrtc-sessions`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  endWebRTCSession: async (licenseId, sessionId) => {
    try {
      const response = await licenseMgmtAPI.post(
        `/licenses/${licenseId}/webrtc-sessions/${sessionId}/end`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getLicenseUsers: async (id) => {
    try {
      const response = await licenseMgmtAPI.get(`/licenses/${id}/users`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateUserWebRTCAccess: async (licenseId, userId, hasAccess) => {
    try {
      const response = await licenseMgmtAPI.put(
        `/licenses/${licenseId}/users/${userId}/webrtc-access`,
        { hasAccess }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  forceCleanupUserSessions: async (
    licenseId,
    userId,
    feature = "webrtc_extension"
  ) => {
    try {
      const response = await licenseMgmtAPI.post(`/licenses/cleanup-sessions`, {
        licenseId,
        userId,
        feature,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateLicenseFingerprint: async (id, data) => {
    try {
      const response = await licenseMgmtAPI.put(
        `/licenses/${id}/fingerprint`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Create axios instance with base configuration for your backend
const API = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api"
      : process.env.REACT_APP_API_URL || "http://localhost:8001/api",
  // || "http://localhost:8001/api",
  withCredentials: true, // Important for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token to requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Remove invalid token
      localStorage.removeItem("token");

      // Redirect to login or dispatch logout action
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await API.post("/auth/login", credentials);
      if (response.data.data.token) {
        localStorage.setItem("token", response.data.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await API.post("/auth/logout");
      localStorage.removeItem("token");
    } catch (error) {
      // Even if logout fails, remove token locally
      localStorage.removeItem("token");
      throw error.response?.data || error.message;
    }
  },

  // Get current user
  getMe: async () => {
    try {
      const response = await API.get("/auth/me");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await API.put("/auth/profile", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Admin API calls for user management
export const adminAPI = {
  // Get user statistics
  getUserStats: async () => {
    try {
      const response = await API.get("/admin/users/stats");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all users
  getUsers: async (params = {}) => {
    try {
      const response = await API.get("/admin/users", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create new user (admin only)
  createUser: async (userData) => {
    try {
      const response = await API.post("/admin/users", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user (admin only)
  updateUser: async (userId, userData) => {
    try {
      const response = await API.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify user (super admin only)
  verifyUser: async (userId) => {
    try {
      const response = await API.put(`/admin/users/${userId}/verify`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete user (super admin only)
  deleteUser: async (userId) => {
    try {
      const response = await API.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Protected routes API calls
export const protectedAPI = {
  // Get dashboard data
  getDashboard: async () => {
    try {
      const response = await API.get("/protected/dashboard");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get user settings
  getSettings: async () => {
    try {
      const response = await API.get("/protected/settings");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin only - get admin panel
  getAdminPanel: async () => {
    try {
      const response = await API.get("/protected/admin");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin only - get users info
  getUsersInfo: async () => {
    try {
      const response = await API.get("/protected/admin/users");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await API.get("/health");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default API;
