import apiClient from "../api/apiClient";

const smsService = {
  // Admin-only
  getProviders: () => apiClient.get("/sms/providers"),
  getConfig: () => apiClient.get("/sms/config"),
  updateConfig: (update) => apiClient.put("/sms/config", update),
  getBalance: () => apiClient.get("/sms/balance"),

  // Utility send (if needed from dashboard)
  send: (payload) => apiClient.post("/sms/send", payload),
};

export default smsService;
