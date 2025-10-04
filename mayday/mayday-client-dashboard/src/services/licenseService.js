import apiClient from "../api/apiClient";

const licenseService = {
  getLicenses: () => apiClient.get("/licenses"),
  getLicenseTypes: () => apiClient.get("/licenses/types"),
  generateLicense: (licenseData) =>
    apiClient.post("/licenses/generate", licenseData),
  getServerFingerprint: () => apiClient.get("/licenses/fingerprint"),
  getCurrentLicense: () => apiClient.get("/licenses/current"),
  getAllFeatures: () => apiClient.get("/licenses/features"),

  // License management endpoints
  updateLicense: (id, updateData) =>
    apiClient.put(`/licenses/${id}`, updateData),
  updateLicenseStatus: (id, status) =>
    apiClient.put(`/licenses/${id}/status`, { status }),

  // WebRTC management endpoints
  getWebRTCSessions: (id) => apiClient.get(`/licenses/${id}/webrtc-sessions`),
  getCurrentWebRTCSessions: () => apiClient.get(`/licenses/webrtc-sessions`),
  updateWebRTCAllocation: (id, allocationData) =>
    apiClient.put(`/licenses/${id}/webrtc-allocation`, allocationData),
  getLicenseUsers: (id) => apiClient.get(`/licenses/${id}/users`),
  updateUserWebRTCAccess: (licenseId, userId, hasAccess) =>
    apiClient.put(`/licenses/${licenseId}/users/${userId}/webrtc`, {
      hasAccess,
    }),
  // Admin: end/cleanup sessions for a user and feature
  cleanupUserSessions: (userId, feature = "webrtc_extension") =>
    apiClient.delete(`/licenses/sessions/cleanup/${userId}/${feature}`),
};

export default licenseService;
