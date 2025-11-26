import axios from "axios";
import logoutManager from "./logoutManager";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://cs.brhgroup.co/mayday-api/api/whatsapp"
    : "http://localhost:8004/api/whatsapp";

// Register this service with the logout manager for automatic cleanup
logoutManager.registerService("WhatsAppService", async () => {
  console.log("🧹 Cleaning up WhatsApp service...");
  // Cancel any ongoing requests
  if (window.axiosCancelTokenSource) {
    window.axiosCancelTokenSource.cancel("Logout in progress");
  }
});

// Helper function to safely make API calls using centralized logout manager
const safeApiCall = async (apiFunction, ...args) => {
  if (logoutManager.shouldBlockApiCalls()) {
    console.log("🔒 WhatsApp API call blocked during logout");
    throw new Error("API call blocked during logout");
  }

  try {
    return await apiFunction(...args);
  } catch (error) {
    if (logoutManager.shouldBlockApiCalls()) {
      console.log("🔒 WhatsApp API call failed due to logout");
      throw new Error("API call failed due to logout");
    }
    throw error;
  }
};

const whatsAppService = {
  getChats: async () => {
    return safeApiCall(async () => {
      const response = await axios.get(`${API_BASE_URL}/chats`);
      return response.data;
    });
  },

  getChatMessages: async (contactId) => {
    return safeApiCall(async () => {
      const encodedContactId = encodeURIComponent(contactId);
      const response = await axios.get(
        `${API_BASE_URL}/chats/${encodedContactId}/messages`
      );
      return response.data;
    });
  },

  getConversations: async () => {
    return safeApiCall(async () => {
      const response = await axios.get(`${API_BASE_URL}/conversations`);
      return response.data;
    });
  },

  claimConversation: async (conversationId) => {
    return safeApiCall(async () => {
      const response = await axios.post(
        `${API_BASE_URL}/conversations/${conversationId}/claim`
      );
      return response.data;
    });
  },

  transferConversationToAgent: async (conversationId, agentId) => {
    return safeApiCall(async () => {
      const response = await axios.post(
        `${API_BASE_URL}/conversations/${conversationId}/transfer`,
        { agentId }
      );
      return response.data;
    });
  },

  resolveConversation: async (conversationId) => {
    return safeApiCall(async () => {
      const response = await axios.post(
        `${API_BASE_URL}/conversations/${conversationId}/resolve`
      );
      return response.data;
    });
  },

  markChatAsRead: async (contactPhone) => {
    return safeApiCall(async () => {
      const encoded = encodeURIComponent(contactPhone);
      const response = await axios.post(
        `${API_BASE_URL}/chats/${encoded}/read`
      );
      return response.data;
    });
  },

  sendChatMessage: async (contactId, messageData) => {
    return safeApiCall(async () => {
      const encodedContactId = encodeURIComponent(contactId);
      const response = await axios.post(
        `${API_BASE_URL}/chats/${encodedContactId}/messages`,
        messageData
      );
      return response.data;
    });
  },

  updateMessageStatus: async (messageId, status) => {
    return safeApiCall(async () => {
      const response = await axios.put(
        `${API_BASE_URL}/messages/${messageId}/status`,
        { status }
      );
      return response.data;
    });
  },

  sendTemplateMessageToContact: async (contactId, messageData) => {
    return safeApiCall(async () => {
      const encodedContactId = encodeURIComponent(contactId);
      const response = await axios.post(
        `${API_BASE_URL}/chats/${encodedContactId}/template-message`,
        messageData
      );
      return response.data;
    });
  },

  getWhatsAppConfig: async () => {
    return safeApiCall(async () => {
      const response = await axios.get(
        `${API_BASE_URL}/integrations/whatsapp/config`
      );
      return response.data;
    });
  },

  // Agent ownership and disposition management
  assignConversationToAgent: async (conversationId, agentId) => {
    return safeApiCall(async () => {
      const response = await axios.post(
        `${API_BASE_URL}/conversations/assign`,
        {
          conversationId,
          agentId,
        }
      );
      return response.data;
    });
  },

  updateConversationDisposition: async (conversationId, dispositionData) => {
    return safeApiCall(async () => {
      const response = await axios.put(
        `${API_BASE_URL}/conversations/${conversationId}/disposition`,
        dispositionData
      );
      return response.data;
    });
  },

  getAgentConversations: async (status = "open", limit = 50, offset = 0) => {
    return safeApiCall(async () => {
      const response = await axios.get(`${API_BASE_URL}/agent/conversations`, {
        params: { status, limit, offset },
      });
      return response.data;
    });
  },

  getConversationDetails: async (conversationId) => {
    return safeApiCall(async () => {
      const response = await axios.get(
        `${API_BASE_URL}/conversations/${conversationId}`
      );
      return response.data;
    });
  },

  transferConversation: async (
    conversationId,
    targetAgentId,
    transferReason
  ) => {
    return safeApiCall(async () => {
      const response = await axios.post(
        `${API_BASE_URL}/conversations/${conversationId}/transfer`,
        {
          targetAgentId,
          transferReason,
        }
      );
      return response.data;
    });
  },

  getAvailableAgents: async () => {
    return safeApiCall(async () => {
      const response = await axios.get(`${API_BASE_URL}/agents/available`);
      return response.data;
    });
  },

  // Hospitality Template Management
  getHospitalityTemplates: async (category = null) => {
    return safeApiCall(async () => {
      const params = category ? { category } : {};
      const response = await axios.get(
        `${API_BASE_URL}/templates/hospitality`,
        { params }
      );
      return response.data;
    });
  },

  getHospitalityTemplate: async (templateName) => {
    return safeApiCall(async () => {
      const response = await axios.get(
        `${API_BASE_URL}/templates/hospitality/${templateName}`
      );
      return response.data;
    });
  },

  sendTemplateMessage: async (templateName, to, variables) => {
    return safeApiCall(async () => {
      const response = await axios.post(`${API_BASE_URL}/templates/send`, {
        templateName,
        to,
        variables,
      });
      return response.data;
    });
  },

  validateTemplateVariables: async (templateName, variables) => {
    return safeApiCall(async () => {
      const response = await axios.post(`${API_BASE_URL}/templates/validate`, {
        templateName,
        variables,
      });
      return response.data;
    });
  },

  // Cancel all ongoing requests when logout starts
  cancelAllRequests: () => {
    if (window.axiosCancelTokenSource) {
      window.axiosCancelTokenSource.cancel("Logout in progress");
    }
  },
};

export default whatsAppService;
