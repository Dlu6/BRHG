import apiClient from "../api/apiClient.js";

// Get all emails with filtering and pagination
export const getAllEmails = async (filters = {}) => {
  const params = new URLSearchParams();

  Object.keys(filters).forEach((key) => {
    if (
      filters[key] !== undefined &&
      filters[key] !== null &&
      filters[key] !== ""
    ) {
      params.append(key, filters[key]);
    }
  });

  const response = await apiClient.get(`/emails?${params.toString()}`);
  return response.data;
};

// Get email by ID
export const getEmailById = async (id) => {
  const response = await apiClient.get(`/emails/${id}`);
  return response.data;
};

// Create new email
export const createEmail = async (emailData) => {
  const response = await apiClient.post("/emails", emailData);
  return response.data;
};

// Update email
export const updateEmail = async (id, emailData) => {
  const response = await apiClient.put(`/emails/${id}`, emailData);
  return response.data;
};

// Send email
export const sendEmail = async (id) => {
  const response = await apiClient.post(`/emails/${id}/send`);
  return response.data;
};

// Delete email
export const deleteEmail = async (id) => {
  const response = await apiClient.delete(`/emails/${id}`);
  return response.data;
};

// Mark email as read/unread
export const markEmailRead = async (id, isRead) => {
  const response = await apiClient.patch(`/emails/${id}/read`, { isRead });
  return response.data;
};

// Toggle email star
export const toggleEmailStar = async (id) => {
  const response = await apiClient.patch(`/emails/${id}/star`);
  return response.data;
};

// Toggle email archive
export const toggleEmailArchive = async (id) => {
  const response = await apiClient.patch(`/emails/${id}/archive`);
  return response.data;
};

// Get email threads
export const getEmailThreads = async (threadId) => {
  const response = await apiClient.get(`/emails/threads/${threadId}`);
  return response.data;
};

// Get email statistics
export const getEmailStats = async (filters = {}) => {
  const params = new URLSearchParams();

  Object.keys(filters).forEach((key) => {
    if (
      filters[key] !== undefined &&
      filters[key] !== null &&
      filters[key] !== ""
    ) {
      params.append(key, filters[key]);
    }
  });

  const response = await apiClient.get(`/emails/stats?${params.toString()}`);
  return response.data;
};

// Upload attachment
export const uploadAttachment = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post(`/emails/${id}/attachments`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Delete attachment
export const deleteAttachment = async (id, attachmentIndex) => {
  const response = await apiClient.delete(
    `/emails/${id}/attachments/${attachmentIndex}`
  );
  return response.data;
};

// Search emails
export const searchEmails = async (query, filters = {}) => {
  const searchFilters = { ...filters, search: query };
  return getAllEmails(searchFilters);
};

// Get emails by status
export const getEmailsByStatus = async (status, filters = {}) => {
  const statusFilters = { ...filters, status };
  return getAllEmails(statusFilters);
};

// Get emails by priority
export const getEmailsByPriority = async (priority, filters = {}) => {
  const priorityFilters = { ...filters, priority };
  return getAllEmails(priorityFilters);
};

// Get emails by category
export const getEmailsByCategory = async (category, filters = {}) => {
  const categoryFilters = { ...filters, category };
  return getAllEmails(categoryFilters);
};

// Get unread emails
export const getUnreadEmails = async (filters = {}) => {
  const unreadFilters = { ...filters, isRead: false };
  return getAllEmails(unreadFilters);
};

// Get starred emails
export const getStarredEmails = async (filters = {}) => {
  const starredFilters = { ...filters, isStarred: true };
  return getAllEmails(starredFilters);
};

// Get archived emails
export const getArchivedEmails = async (filters = {}) => {
  const archivedFilters = { ...filters, isArchived: true };
  return getAllEmails(archivedFilters);
};

// Get important emails
export const getImportantEmails = async (filters = {}) => {
  const importantFilters = { ...filters, isImportant: true };
  return getAllEmails(importantFilters);
};

// Get emails by date range
export const getEmailsByDateRange = async (
  startDate,
  endDate,
  filters = {}
) => {
  const dateFilters = { ...filters, dateFrom: startDate, dateTo: endDate };
  return getAllEmails(dateFilters);
};

// Get emails by user
export const getEmailsByUser = async (userId, filters = {}) => {
  const userFilters = { ...filters, userId };
  return getAllEmails(userFilters);
};

// Get emails by agent
export const getEmailsByAgent = async (agentId, filters = {}) => {
  const agentFilters = { ...filters, agentId };
  return getAllEmails(agentFilters);
};

// Get emails by customer
export const getEmailsByCustomer = async (customerId, filters = {}) => {
  const customerFilters = { ...filters, customerId };
  return getAllEmails(customerFilters);
};

// Get emails by ticket
export const getEmailsByTicket = async (ticketId, filters = {}) => {
  const ticketFilters = { ...filters, ticketId };
  return getAllEmails(ticketFilters);
};

// Bulk actions
export const bulkMarkAsRead = async (emailIds, isRead = true) => {
  const promises = emailIds.map((id) => markEmailRead(id, isRead));
  return Promise.all(promises);
};

export const bulkStarEmails = async (emailIds, isStarred = true) => {
  const promises = emailIds.map((id) => toggleEmailStar(id));
  return Promise.all(promises);
};

export const bulkArchiveEmails = async (emailIds, isArchived = true) => {
  const promises = emailIds.map((id) => toggleEmailArchive(id));
  return Promise.all(promises);
};

export const bulkDeleteEmails = async (emailIds) => {
  const promises = emailIds.map((id) => deleteEmail(id));
  return Promise.all(promises);
};

// Email composition helpers
export const createReplyData = (originalEmail) => {
  return {
    to: originalEmail.from,
    subject: originalEmail.subject.startsWith("Re:")
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`,
    inReplyTo: originalEmail.messageId,
    threadId: originalEmail.threadId || originalEmail.id,
    body: `\n\n--- Original Message ---\nFrom: ${
      originalEmail.from
    }\nDate: ${new Date(originalEmail.createdAt).toLocaleString()}\nSubject: ${
      originalEmail.subject
    }\n\n${originalEmail.body}`,
  };
};

export const createForwardData = (originalEmail) => {
  return {
    subject: originalEmail.subject.startsWith("Fwd:")
      ? originalEmail.subject
      : `Fwd: ${originalEmail.subject}`,
    body: `\n\n--- Forwarded Message ---\nFrom: ${
      originalEmail.from
    }\nDate: ${new Date(originalEmail.createdAt).toLocaleString()}\nSubject: ${
      originalEmail.subject
    }\n\n${originalEmail.body}`,
  };
};

// Email validation
export const validateEmailData = (emailData) => {
  const errors = {};

  if (!emailData.to || emailData.to.trim() === "") {
    errors.to = "Recipient is required";
  }

  if (!emailData.subject || emailData.subject.trim() === "") {
    errors.subject = "Subject is required";
  }

  if (!emailData.body || emailData.body.trim() === "") {
    errors.body = "Email content is required";
  }

  if (emailData.to) {
    const recipients = emailData.to.split(",").map((email) => email.trim());
    const invalidEmails = recipients.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      errors.to = `Invalid email addresses: ${invalidEmails.join(", ")}`;
    }
  }

  if (emailData.cc) {
    const recipients = emailData.cc.split(",").map((email) => email.trim());
    const invalidEmails = recipients.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      errors.cc = `Invalid email addresses: ${invalidEmails.join(", ")}`;
    }
  }

  if (emailData.bcc) {
    const recipients = emailData.bcc.split(",").map((email) => email.trim());
    const invalidEmails = recipients.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      errors.bcc = `Invalid email addresses: ${invalidEmails.join(", ")}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Email formatting helpers
export const formatEmailForDisplay = (email) => {
  return {
    ...email,
    formattedDate: new Date(email.createdAt).toLocaleDateString(),
    formattedTime: new Date(email.createdAt).toLocaleTimeString(),
    formattedSentDate: email.sentAt
      ? new Date(email.sentAt).toLocaleDateString()
      : null,
    formattedSentTime: email.sentAt
      ? new Date(email.sentAt).toLocaleTimeString()
      : null,
    shortBody:
      email.body.length > 100
        ? `${email.body.substring(0, 100)}...`
        : email.body,
    recipientCount: email.to ? email.to.split(",").length : 0,
    hasAttachments: email.attachments && email.attachments.length > 0,
    attachmentCount: email.attachments ? email.attachments.length : 0,
  };
};

export const formatEmailAddresses = (addresses) => {
  if (!addresses) return [];
  return addresses.split(",").map((email) => email.trim());
};

// Priority and category helpers
export const getPriorityOptions = () => {
  return [
    { value: "low", label: "Low", color: "gray" },
    { value: "normal", label: "Normal", color: "blue" },
    { value: "high", label: "High", color: "orange" },
    { value: "urgent", label: "Urgent", color: "red" },
  ];
};

export const getCategoryOptions = () => {
  return [
    { value: "inquiry", label: "Inquiry", color: "blue" },
    { value: "support", label: "Support", color: "green" },
    { value: "complaint", label: "Complaint", color: "red" },
    { value: "feedback", label: "Feedback", color: "purple" },
    { value: "other", label: "Other", color: "gray" },
  ];
};

export const getStatusOptions = () => {
  return [
    { value: "draft", label: "Draft", color: "gray" },
    { value: "sent", label: "Sent", color: "blue" },
    { value: "delivered", label: "Delivered", color: "green" },
    { value: "failed", label: "Failed", color: "red" },
    { value: "bounced", label: "Bounced", color: "orange" },
  ];
};

export const getPriorityColor = (priority) => {
  const priorityMap = {
    low: "text-gray-500",
    normal: "text-blue-500",
    high: "text-orange-500",
    urgent: "text-red-500",
  };
  return priorityMap[priority] || "text-gray-500";
};

export const getCategoryColor = (category) => {
  const categoryMap = {
    inquiry: "bg-blue-100 text-blue-800",
    support: "bg-green-100 text-green-800",
    complaint: "bg-red-100 text-red-800",
    feedback: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
  };
  return categoryMap[category] || "bg-gray-100 text-gray-800";
};

export const getStatusColor = (status) => {
  const statusMap = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    bounced: "bg-orange-100 text-orange-800",
  };
  return statusMap[status] || "bg-gray-100 text-gray-800";
};

// Configuration functions
export const getEmailConfiguration = async () => {
  try {
    const response = await apiClient.get("/emails/configuration");
    return response.data;
  } catch (error) {
    console.error("Error fetching email configuration:", error);
    throw error;
  }
};

export const updateEmailConfiguration = async (config) => {
  try {
    const response = await apiClient.put("/emails/configuration", config);
    return response.data;
  } catch (error) {
    console.error("Error updating email configuration:", error);
    throw error;
  }
};

export const testEmailConnection = async (smtpConfig) => {
  try {
    const response = await apiClient.post(
      "/emails/test-connection",
      smtpConfig
    );
    return response.data;
  } catch (error) {
    console.error("Error testing email connection:", error);
    throw error;
  }
};

// Default export for backward compatibility
const emailService = {
  getAllEmails,
  getEmailById,
  createEmail,
  updateEmail,
  sendEmail,
  deleteEmail,
  markEmailRead,
  toggleEmailStar,
  toggleEmailArchive,
  getEmailThreads,
  getEmailStats,
  uploadAttachment,
  deleteAttachment,
  searchEmails,
  getEmailsByStatus,
  getEmailsByPriority,
  getEmailsByCategory,
  getUnreadEmails,
  getStarredEmails,
  getArchivedEmails,
  getImportantEmails,
  getEmailsByDateRange,
  getEmailsByUser,
  getEmailsByAgent,
  getEmailsByCustomer,
  getEmailsByTicket,
  bulkMarkAsRead,
  bulkStarEmails,
  bulkArchiveEmails,
  bulkDeleteEmails,
  createReplyData,
  createForwardData,
  validateEmailData,
  isValidEmail,
  formatEmailForDisplay,
  formatEmailAddresses,
  getPriorityOptions,
  getCategoryOptions,
  getStatusOptions,
  getPriorityColor,
  getCategoryColor,
  getStatusColor,
  getEmailConfiguration,
  updateEmailConfiguration,
  testEmailConnection,
};

export default emailService;
