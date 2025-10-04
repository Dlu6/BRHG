import express from "express";
import {
  addContact,
  getContacts,
  getMedia,
  getMessages,
  getMessageStatus,
  handleWebhook,
  // sendMessage,
  updateContact,
  uploadMedia,
  getWhatsAppConfig,
  updateWhatsAppConfig,
  getChats,
  getChatMessages,
  sendChatMessage,
  updateMessageStatus,
  getWhatsAppTemplates,
  getTemplateById,
  createTemplate,
  deleteTemplate,
  markChatAsRead,
  assignConversationToAgent,
  updateConversationDisposition,
  getAgentConversations,
  getConversationDetails,
  transferConversation,
  getHospitalityTemplates,
  getHospitalityTemplate,
  sendTemplateMessage,
  validateTemplateVariables,
} from "../controllers/whatsappController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { Conversation } from "../models/WhatsAppModel.js";

const router = express.Router();

// Configuration endpoints
router.get("/integrations/whatsapp/config", getWhatsAppConfig);
router.post("/integrations/whatsappConfig", updateWhatsAppConfig);

// Message endpoints
// router.post("/send", authMiddleware, sendMessage);
router.get("/messages/:contactId", getMessages);
router.get("/status/:messageId", getMessageStatus);

// Contact management
router.get("/contacts", getContacts);
router.post("/contacts", authMiddleware, addContact);
router.put("/contacts/:contactId", authMiddleware, updateContact);

// Media handling
router.post("/media", authMiddleware, uploadMedia);
router.get("/media/:mediaId", authMiddleware, getMedia);

// Chat management
router.get("/chats", getChats);
router.get("/chats/:contactId/messages", getChatMessages);
router.post("/chats/:contactId/messages", sendChatMessage);
router.put("/messages/:messageId/status", updateMessageStatus);
router.post("/chats/:contactId/read", markChatAsRead);

// Templates
router.get("/templates", getWhatsAppTemplates);
router.get("/templates/:templateId", getTemplateById);
router.post("/templates", createTemplate);
router.delete("/templates/:templateId", deleteTemplate);

// Webhook routes
router.post("/webhook", handleWebhook);
// router.post("/status-callback", handleWebhook);
router.post("/webhook/statusCallback", handleWebhook);

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    // Test database connection
    await Conversation.findOne();
    res.json({
      success: true,
      message: "WhatsApp API is healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
      details: error.message,
    });
  }
});

// Simple conversation management routes (MVP)
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    console.log("Fetching conversations for user:", req.user?.id);

    // Check if Conversation model is available
    if (!Conversation) {
      console.error("Conversation model is not available");
      return res.status(500).json({
        success: false,
        error: "Conversation model not available",
      });
    }

    const convs = await Conversation.findAll({
      order: [["updatedAt", "DESC"]],
    });

    console.log(`Found ${convs.length} conversations`);
    res.json({ success: true, data: convs });
  } catch (e) {
    console.error("Error fetching conversations:", e);
    res.status(500).json({
      success: false,
      error: e.message,
      stack: e.stack,
    });
  }
});

router.post("/conversations/:id/claim", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await Conversation.findByPk(id);
    if (!conv)
      return res
        .status(404)
        .json({ success: false, error: "Conversation not found" });
    await conv.update({ assignedAgentId: req.user.id });
    res.json({ success: true, data: conv });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/conversations/:id/transfer", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const conv = await Conversation.findByPk(id);
    if (!conv)
      return res
        .status(404)
        .json({ success: false, error: "Conversation not found" });
    await conv.update({ assignedAgentId: agentId });
    res.json({ success: true, data: conv });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/conversations/:id/resolve", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await Conversation.findByPk(id);
    if (!conv)
      return res
        .status(404)
        .json({ success: false, error: "Conversation not found" });
    await conv.update({ status: "resolved" });
    res.json({ success: true, data: conv });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Agent Ownership and Disposition Management Routes
router.post("/conversations/assign", authMiddleware, assignConversationToAgent);
router.put(
  "/conversations/:conversationId/disposition",
  authMiddleware,
  updateConversationDisposition
);
router.get("/agent/conversations", authMiddleware, getAgentConversations);
router.get(
  "/conversations/:conversationId",
  authMiddleware,
  getConversationDetails
);
router.post(
  "/conversations/:conversationId/transfer",
  authMiddleware,
  transferConversation
);

// Hospitality Template Routes
router.get("/templates/hospitality", authMiddleware, getHospitalityTemplates);
router.get(
  "/templates/hospitality/:templateName",
  authMiddleware,
  getHospitalityTemplate
);
router.post("/templates/send", authMiddleware, sendTemplateMessage);
router.post("/templates/validate", authMiddleware, validateTemplateVariables);

export default router;
