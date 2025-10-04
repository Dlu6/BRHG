import apiClient from "../api/apiClient";

const systemService = {
  getSystemInfo: () => apiClient.get("/system/info"),
  getSystemHealth: () => apiClient.get("/system/health"),
};

export default systemService;
