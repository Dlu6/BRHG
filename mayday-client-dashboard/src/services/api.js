import apiClient from "../api/apiClient";
import licenseService from "./licenseService";

// Admin API for user management
export const adminAPI = {
  getUsers: () => apiClient.get("/admin/users"),
  updateUser: (id, userData) => apiClient.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  verifyUser: (id) => apiClient.put(`/admin/users/${id}/verify`),
};

// License API - re-export the license service
export const licenseAPI = licenseService;

// Dialplan Contexts API
export const contextsAPI = {
  list: () => apiClient.get("/contexts"),
  create: (payload) => apiClient.post("/contexts", payload),
  update: (id, payload) => apiClient.put(`/contexts/${id}`, payload),
  remove: (id) => apiClient.delete(`/contexts/${id}`),
  sync: () => apiClient.post("/contexts/sync"),
};

// DID inventory API (derived from inbound routes list)
export const didsAPI = {
  list: () => apiClient.get("/users/inbound_route/dids"),
};
