// routes/smsRoutes.js
import { Router } from "express";
import authMiddleware, { isAdmin } from "../middleware/authMiddleware.js";
import {
  sendSms,
  getBalance,
  deliveryReport,
  listProviders,
  getSmsConfig,
  updateSmsConfig,
  getConversations,
  getMessagesForConversation,
} from "../controllers/smsController.js";

const router = Router();

// Authenticated endpoints
router.post("/send", authMiddleware, sendSms);
router.get("/balance", authMiddleware, isAdmin, getBalance);
router.get("/providers", authMiddleware, isAdmin, listProviders);
router.get("/config", authMiddleware, isAdmin, getSmsConfig);
router.post("/config", authMiddleware, isAdmin, updateSmsConfig); // allow POST as alias for environments that block PUT
router.put("/config", authMiddleware, isAdmin, updateSmsConfig);

// Routes for message history
router.get("/conversations", getConversations);
router.get("/conversations/:phoneNumber", getMessagesForConversation);

// DLR webhook (public; the provider will POST here)
router.post("/dlr", deliveryReport);

export default router;
