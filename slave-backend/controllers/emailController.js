import { Op } from "sequelize";
import { sendEmail } from "../services/emailService.js";
import { uploadFile, deleteFile } from "../services/fileService.js";

// Get Email model from global context (set in server.js)
const getEmailModel = () => {
  if (global.EmailModel) {
    return global.EmailModel;
  }
  throw new Error("Email model not initialized");
};

// Get all emails with filtering and pagination
export const getEmails = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      isRead,
      isImportant,
      isStarred,
      isArchived,
      search,
      userId,
      agentId,
      customerId,
      ticketId,
      threadId,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {
      isDeleted: false,
    };

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (isRead !== undefined) where.isRead = isRead === "true";
    if (isImportant !== undefined) where.isImportant = isImportant === "true";
    if (isStarred !== undefined) where.isStarred = isStarred === "true";
    if (isArchived !== undefined) where.isArchived = isArchived === "true";
    if (userId) where.userId = userId;
    if (agentId) where.agentId = agentId;
    if (customerId) where.customerId = customerId;
    if (ticketId) where.ticketId = ticketId;
    if (threadId) where.threadId = threadId;

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    // Search filter
    if (search) {
      // Use LIKE for MySQL/MariaDB compatibility
      where[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { body: { [Op.like]: `%${search}%` } },
        { from: { [Op.like]: `%${search}%` } },
        { to: { [Op.like]: `%${search}%` } },
      ];
    }

    const Email = getEmailModel();
    const UserModel = global.UserModel;

    const includeOptions = [
      {
        association: "user",
        attributes: ["id", "username", "email"],
      },
      {
        association: "agent",
        attributes: ["id", "username", "email"],
      },
    ];

    // Only include customer and ticket if models exist
    if (global.CustomerModel) {
      includeOptions.push({
        association: "customer",
        attributes: ["id", "name", "email", "phone"],
      });
    }

    if (global.TicketModel) {
      includeOptions.push({
        association: "ticket",
        attributes: ["id", "title", "status", "priority"],
      });
    }

    const { count, rows: emails } = await Email.findAndCountAll({
      where,
      include: includeOptions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch emails",
      error: error.message,
    });
  }
};

// Get email by ID
export const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;

    const Email = getEmailModel();

    const includeOptions = [
      {
        association: "user",
        attributes: ["id", "username", "email"],
      },
      {
        association: "agent",
        attributes: ["id", "username", "email"],
      },
    ];

    // Only include customer and ticket if models exist
    if (global.CustomerModel) {
      includeOptions.push({
        association: "customer",
        attributes: ["id", "name", "email", "phone"],
      });
    }

    if (global.TicketModel) {
      includeOptions.push({
        association: "ticket",
        attributes: ["id", "title", "status", "priority"],
      });
    }

    const email = await Email.findByPk(id, {
      include: includeOptions,
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    // Mark as read if not already read
    if (!email.isRead) {
      await email.update({ isRead: true, readAt: new Date() });
    }

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error("Error fetching email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email",
      error: error.message,
    });
  }
};

// Create new email (draft)
export const createEmail = async (req, res) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      htmlBody,
      priority = "normal",
      category = "inquiry",
      tags = [],
      replyTo,
      inReplyTo,
      threadId,
      customerId,
      ticketId,
      agentId,
      metadata = {},
    } = req.body;

    const userId = req.user.id;

    // Generate unique message ID
    const messageId = `<${Date.now()}.${Math.random()
      .toString(36)
      .substr(2, 9)}@${process.env.DOMAIN || "cs.hugamara.com"}>`;

    const emailData = {
      messageId,
      from: req.user.email,
      to,
      cc,
      bcc,
      subject,
      body,
      htmlBody,
      priority,
      category,
      tags,
      replyTo,
      inReplyTo,
      threadId,
      userId,
      agentId,
      customerId,
      ticketId,
      metadata,
      status: "draft",
    };

    const Email = getEmailModel();
    const email = await Email.create(emailData);

    res.status(201).json({
      success: true,
      message: "Email draft created successfully",
      data: email,
    });
  } catch (error) {
    console.error("Error creating email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create email",
      error: error.message,
    });
  }
};

// Update email
export const updateEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    // Don't allow updating sent emails
    if (email.status === "sent") {
      return res.status(400).json({
        success: false,
        message: "Cannot update sent email",
      });
    }

    await email.update(updateData);

    res.json({
      success: true,
      message: "Email updated successfully",
      data: email,
    });
  } catch (error) {
    console.error("Error updating email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update email",
      error: error.message,
    });
  }
};

// Send email
export const sendEmailAction = async (req, res) => {
  try {
    const { id } = req.params;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    if (email.status === "sent") {
      return res.status(400).json({
        success: false,
        message: "Email already sent",
      });
    }

    // Send the email
    const result = await sendEmail({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      text: email.body,
      html: email.htmlBody,
      replyTo: email.replyTo,
      attachments: email.attachments,
    });

    if (result.success) {
      await email.update({
        status: "sent",
        sentAt: new Date(),
        messageId: result.messageId || email.messageId,
      });

      res.json({
        success: true,
        message: "Email sent successfully",
        data: email,
      });
    } else {
      await email.update({
        status: "failed",
        errorMessage: result.error,
      });

      res.status(400).json({
        success: false,
        message: "Failed to send email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

// Delete email (soft delete)
export const deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    await email.update({ isDeleted: true });

    res.json({
      success: true,
      message: "Email deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete email",
      error: error.message,
    });
  }
};

// Mark email as read/unread
export const markEmailRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    await email.update({
      isRead,
      readAt: isRead ? new Date() : null,
    });

    res.json({
      success: true,
      message: `Email marked as ${isRead ? "read" : "unread"}`,
      data: email,
    });
  } catch (error) {
    console.error("Error marking email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark email",
      error: error.message,
    });
  }
};

// Star/unstar email
export const toggleEmailStar = async (req, res) => {
  try {
    const { id } = req.params;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    await email.update({ isStarred: !email.isStarred });

    res.json({
      success: true,
      message: `Email ${email.isStarred ? "starred" : "unstarred"}`,
      data: email,
    });
  } catch (error) {
    console.error("Error toggling email star:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle email star",
      error: error.message,
    });
  }
};

// Archive/unarchive email
export const toggleEmailArchive = async (req, res) => {
  try {
    const { id } = req.params;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    await email.update({ isArchived: !email.isArchived });

    res.json({
      success: true,
      message: `Email ${email.isArchived ? "archived" : "unarchived"}`,
      data: email,
    });
  } catch (error) {
    console.error("Error toggling email archive:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle email archive",
      error: error.message,
    });
  }
};

// Get email threads
export const getEmailThreads = async (req, res) => {
  try {
    const { threadId } = req.params;

    const Email = getEmailModel();
    const emails = await Email.findAll({
      where: {
        threadId,
        isDeleted: false,
      },
      include: [
        {
          association: "user",
          attributes: ["id", "username", "email"],
        },
        {
          association: "agent",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json({
      success: true,
      data: emails,
    });
  } catch (error) {
    console.error("Error fetching email threads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email threads",
      error: error.message,
    });
  }
};

// Get email statistics
export const getEmailStats = async (req, res) => {
  try {
    const { userId, dateFrom, dateTo } = req.query;

    const where = { isDeleted: false };
    if (userId) where.userId = userId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    const Email = getEmailModel();
    const stats = await Email.findAll({
      where,
      attributes: [
        "status",
        [Email.sequelize.fn("COUNT", Email.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const totalEmails = await Email.count({ where });
    const unreadEmails = await Email.count({
      where: { ...where, isRead: false },
    });
    const starredEmails = await Email.count({
      where: { ...where, isStarred: true },
    });
    const archivedEmails = await Email.count({
      where: { ...where, isArchived: true },
    });

    res.json({
      success: true,
      data: {
        totalEmails,
        unreadEmails,
        starredEmails,
        archivedEmails,
        statusBreakdown: stats,
      },
    });
  } catch (error) {
    console.error("Error fetching email stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email statistics",
      error: error.message,
    });
  }
};

// Upload email attachment
export const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    const attachment = {
      filename: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
    };

    const attachments = email.attachments || [];
    attachments.push(attachment);

    await email.update({ attachments });

    res.json({
      success: true,
      message: "Attachment uploaded successfully",
      data: attachment,
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload attachment",
      error: error.message,
    });
  }
};

// Delete email attachment
export const deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentIndex } = req.params;

    const Email = getEmailModel();
    const email = await Email.findByPk(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    const attachments = email.attachments || [];
    const attachmentIndexNum = parseInt(attachmentIndex);

    if (attachmentIndexNum < 0 || attachmentIndexNum >= attachments.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid attachment index",
      });
    }

    const attachment = attachments[attachmentIndexNum];

    // Delete file from filesystem
    await deleteFile(attachment.path);

    // Remove from attachments array
    attachments.splice(attachmentIndexNum, 1);

    await email.update({ attachments });

    res.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete attachment",
      error: error.message,
    });
  }
};

// Get email configuration
export const getEmailConfiguration = async (req, res) => {
  try {
    // Return current configuration from environment or database
    const config = {
      smtp: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER || "",
        password: process.env.SMTP_PASS || "",
        from: process.env.SMTP_FROM || "",
        domain: process.env.DOMAIN || "cs.hugamara.com",
      },
      user: {
        defaultFromName: "Hugamara Support",
        defaultReplyTo: "",
        signature: "",
        autoReply: false,
        autoReplyMessage: "",
      },
      security: {
        requireAuth: true,
        allowAttachments: true,
        maxAttachmentSize: 10,
        allowedFileTypes: ["pdf", "doc", "docx", "jpg", "png", "gif"],
        spamFilter: true,
        virusScan: true,
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error fetching email configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email configuration",
      error: error.message,
    });
  }
};

// Update email configuration
export const updateEmailConfiguration = async (req, res) => {
  try {
    const { smtp, user, security } = req.body;

    // In a real implementation, you would save this to a database
    // For now, we'll just return success
    console.log("Email configuration updated:", { smtp, user, security });

    res.json({
      success: true,
      message: "Email configuration updated successfully",
      data: { smtp, user, security },
    });
  } catch (error) {
    console.error("Error updating email configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update email configuration",
      error: error.message,
    });
  }
};

// Test email connection
export const testEmailConnection = async (req, res) => {
  try {
    const { host, port, secure, user, password, from } = req.body;

    // Import the email service
    const { EmailService } = await import("../services/emailService.js");
    const emailService = new EmailService();

    // Test the connection
    const result = await emailService.testConnection({
      host,
      port,
      secure,
      auth: { user, pass: password },
      from,
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error testing email connection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test email connection",
      error: error.message,
    });
  }
};
