import axios from "axios";
import { storageService } from "./storageService";

// Create API instance with base URL pointing to callcenter backend
const API = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:8004"
      : "https://cs.hugamara.com/mayday-api",
});

// Add auth token to all requests
API.interceptors.request.use((req) => {
  const token = storageService.getAuthToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Email service functions
export const getAllEmails = async (filters = {}) => {
  try {
    const response = await API.get("/api/emails", { params: filters });
    return response.data;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};

export const getEmailById = async (id) => {
  try {
    const response = await API.get(`/api/emails/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching email:", error);
    throw error;
  }
};

export const sendEmail = async (emailData) => {
  try {
    const response = await API.post("/api/emails", emailData);
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const updateEmail = async (id, emailData) => {
  try {
    const response = await API.put(`/api/emails/${id}`, emailData);
    return response.data;
  } catch (error) {
    console.error("Error updating email:", error);
    throw error;
  }
};

export const deleteEmail = async (id) => {
  try {
    const response = await API.delete(`/api/emails/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting email:", error);
    throw error;
  }
};

export const markAsRead = async (id) => {
  try {
    const response = await API.patch(`/api/emails/${id}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking email as read:", error);
    throw error;
  }
};

export const markAsUnread = async (id) => {
  try {
    const response = await API.patch(`/api/emails/${id}/unread`);
    return response.data;
  } catch (error) {
    console.error("Error marking email as unread:", error);
    throw error;
  }
};

export const starEmail = async (id) => {
  try {
    const response = await API.patch(`/api/emails/${id}/star`);
    return response.data;
  } catch (error) {
    console.error("Error starring email:", error);
    throw error;
  }
};

export const unstarEmail = async (id) => {
  try {
    const response = await API.patch(`/api/emails/${id}/unstar`);
    return response.data;
  } catch (error) {
    console.error("Error unstarring email:", error);
    throw error;
  }
};

export const archiveEmail = async (id) => {
  try {
    const response = await API.patch(`/api/emails/${id}/archive`);
    return response.data;
  } catch (error) {
    console.error("Error archiving email:", error);
    throw error;
  }
};

export const unarchiveEmail = async (id) => {
  try {
    const response = await API.patch(`/api/emails/${id}/unarchive`);
    return response.data;
  } catch (error) {
    console.error("Error unarchiving email:", error);
    throw error;
  }
};

export const getEmailConfiguration = async () => {
  try {
    const response = await API.get("/api/emails/configuration");
    return response.data;
  } catch (error) {
    console.error("Error fetching email configuration:", error);
    throw error;
  }
};

export const updateEmailConfiguration = async (config) => {
  try {
    const response = await API.put("/api/emails/configuration", config);
    return response.data;
  } catch (error) {
    console.error("Error updating email configuration:", error);
    throw error;
  }
};

export const testEmailConnection = async (smtpConfig) => {
  try {
    const response = await API.post("/api/emails/test-connection", smtpConfig);
    return response.data;
  } catch (error) {
    console.error("Error testing email connection:", error);
    throw error;
  }
};

export const uploadAttachment = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await API.post("/api/emails/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    throw error;
  }
};

export const deleteAttachment = async (attachmentId) => {
  try {
    const response = await API.delete(
      `/api/emails/attachments/${attachmentId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting attachment:", error);
    throw error;
  }
};

// Helper functions
export const getStatusColor = (status) => {
  const statusColors = {
    draft: "#ff9800",
    sent: "#4caf50",
    delivered: "#2196f3",
    failed: "#f44336",
    bounced: "#e91e63",
    opened: "#9c27b0",
    replied: "#00bcd4",
  };
  return statusColors[status] || "#757575";
};

export const getPriorityColor = (priority) => {
  const priorityColors = {
    low: "#4caf50",
    normal: "#2196f3",
    high: "#ff9800",
    urgent: "#f44336",
  };
  return priorityColors[priority] || "#2196f3";
};

export const formatEmailDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString();
  }
};

// Integration functions for call context
export const sendCallFollowUpEmail = async (
  callData,
  customerEmail,
  message
) => {
  try {
    const emailData = {
      to: [customerEmail],
      subject: `Follow-up: Call from ${callData.from || "Unknown"}`,
      body: `Dear Customer,\n\nThank you for your call today at ${new Date(
        callData.timestamp
      ).toLocaleString()}.\n\n${
        message ||
        "We appreciate your business and look forward to serving you again."
      }\n\nBest regards,\nHugamara Support Team`,
      priority: "normal",
      metadata: {
        callId: callData.id,
        callDuration: callData.duration,
        callType: callData.type,
        followUp: true,
      },
    };

    const response = await sendEmail(emailData);
    return response;
  } catch (error) {
    console.error("Error sending call follow-up email:", error);
    throw error;
  }
};

export const sendCallSummaryEmail = async (callData, agentEmail, summary) => {
  try {
    const emailData = {
      to: [agentEmail],
      subject: `Call Summary: ${callData.from || "Unknown"} - ${new Date(
        callData.timestamp
      ).toLocaleDateString()}`,
      body: `Call Summary\n\nCall Details:\n- From: ${
        callData.from || "Unknown"
      }\n- To: ${callData.to || "Unknown"}\n- Duration: ${
        callData.duration || "N/A"
      }\n- Timestamp: ${new Date(
        callData.timestamp
      ).toLocaleString()}\n\nSummary:\n${summary}\n\nThis email was automatically generated from the call center system.`,
      priority: "normal",
      metadata: {
        callId: callData.id,
        callDuration: callData.duration,
        callType: callData.type,
        summary: true,
      },
    };

    const response = await sendEmail(emailData);
    return response;
  } catch (error) {
    console.error("Error sending call summary email:", error);
    throw error;
  }
};

// Default export for backward compatibility
const emailService = {
  getAllEmails,
  getEmailById,
  sendEmail,
  updateEmail,
  deleteEmail,
  markAsRead,
  markAsUnread,
  starEmail,
  unstarEmail,
  archiveEmail,
  unarchiveEmail,
  getEmailConfiguration,
  updateEmailConfiguration,
  testEmailConnection,
  uploadAttachment,
  deleteAttachment,
  getStatusColor,
  getPriorityColor,
  formatEmailDate,
  sendCallFollowUpEmail,
  sendCallSummaryEmail,
};

export default emailService;
