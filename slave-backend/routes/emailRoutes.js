import express from "express";
import multer from "multer";
import {
  getEmails,
  getEmailById,
  createEmail,
  updateEmail,
  sendEmailAction,
  deleteEmail,
  markEmailRead,
  toggleEmailStar,
  toggleEmailArchive,
  getEmailThreads,
  getEmailStats,
  uploadAttachment,
  deleteAttachment,
  getEmailConfiguration,
  updateEmailConfiguration,
  testEmailConnection,
} from "../controllers/emailController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { upload } from "../services/fileService.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// IMPORTANT: More specific routes must come BEFORE parameterized routes like "/:id"

// Configuration routes (placed before "/:id" to avoid route conflicts)
router.get("/configuration", getEmailConfiguration);
router.put("/configuration", updateEmailConfiguration);
router.post("/test-connection", testEmailConnection);

// Email CRUD operations
router.get("/", getEmails);
router.get("/stats", getEmailStats);
router.get("/threads/:threadId", getEmailThreads);
router.get("/:id", getEmailById);
router.post("/", createEmail);
router.put("/:id", updateEmail);
router.delete("/:id", deleteEmail);

// Email actions
router.post("/:id/send", sendEmailAction);
router.patch("/:id/read", markEmailRead);
router.patch("/:id/star", toggleEmailStar);
router.patch("/:id/archive", toggleEmailArchive);

// File attachments
router.post("/:id/attachments", upload.single("file"), uploadAttachment);
router.delete("/:id/attachments/:attachmentIndex", deleteAttachment);

export default router;
