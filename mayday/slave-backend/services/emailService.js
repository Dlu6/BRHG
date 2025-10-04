import nodemailer from "nodemailer";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const readFile = promisify(fs.readFile);

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if SMTP credentials are provided
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn(
          "⚠️ SMTP credentials not provided. Email functionality will be disabled."
        );
        console.warn(
          "   Please set SMTP_USER and SMTP_PASS environment variables to enable email sending."
        );
        this.transporter = null;
        return;
      }

      // SMTP configuration
      const smtpConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      };

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("SMTP configuration error:", error);
        } else {
          console.log("✅ SMTP server is ready to take our messages");
        }
      });
    } catch (error) {
      console.error("Error initializing email transporter:", error);
      this.transporter = null;
    }
  }

  async sendEmail(emailData) {
    try {
      if (!this.transporter) {
        throw new Error(
          "Email functionality is disabled. Please configure SMTP credentials in environment variables."
        );
      }

      const {
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        replyTo,
        attachments = [],
        from = process.env.SMTP_FROM || process.env.SMTP_USER,
      } = emailData;

      // Validate required fields
      if (!to || !subject || (!text && !html)) {
        throw new Error("Missing required email fields");
      }

      // Prepare attachments
      const emailAttachments = [];
      for (const attachment of attachments) {
        if (attachment.path && fs.existsSync(attachment.path)) {
          const fileContent = await readFile(attachment.path);
          emailAttachments.push({
            filename: attachment.filename,
            content: fileContent,
            contentType: attachment.mimetype,
          });
        }
      }

      const mailOptions = {
        from,
        to: Array.isArray(to) ? to.join(", ") : to,
        cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
        subject,
        text,
        html,
        replyTo,
        attachments: emailAttachments,
      };

      // Remove undefined values
      Object.keys(mailOptions).forEach(
        (key) => mailOptions[key] === undefined && delete mailOptions[key]
      );

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      };
    } catch (error) {
      console.error("Error sending email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBulkEmail(emails) {
    const results = [];

    for (const emailData of emails) {
      const result = await this.sendEmail(emailData);
      results.push({
        ...emailData,
        result,
      });
    }

    return results;
  }

  async sendTemplateEmail(templateName, templateData, emailData) {
    try {
      // This would integrate with a template engine like Handlebars
      // For now, we'll use simple string replacement
      let html = await this.loadTemplate(templateName);

      // Replace template variables
      Object.keys(templateData).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        html = html.replace(regex, templateData[key]);
      });

      return await this.sendEmail({
        ...emailData,
        html,
      });
    } catch (error) {
      console.error("Error sending template email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(
        process.cwd(),
        "templates",
        "emails",
        `${templateName}.html`
      );
      return await readFile(templatePath, "utf8");
    } catch (error) {
      console.error("Error loading template:", error);
      return "<p>Template not found</p>";
    }
  }

  async validateEmailAddress(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async validateEmailData(emailData) {
    const errors = [];

    if (!emailData.to) {
      errors.push("Recipient (to) is required");
    } else {
      const recipients = Array.isArray(emailData.to)
        ? emailData.to
        : [emailData.to];
      for (const recipient of recipients) {
        if (!(await this.validateEmailAddress(recipient))) {
          errors.push(`Invalid email address: ${recipient}`);
        }
      }
    }

    if (!emailData.subject) {
      errors.push("Subject is required");
    }

    if (!emailData.text && !emailData.html) {
      errors.push("Email content (text or html) is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getEmailStatus(messageId) {
    // This would integrate with email service provider APIs
    // to get delivery status, bounces, etc.
    return {
      messageId,
      status: "delivered", // Placeholder
      deliveredAt: new Date(),
    };
  }

  async createEmailThread(emails) {
    // Group emails by thread ID or create new thread
    const threadId = `thread_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    for (const email of emails) {
      email.threadId = threadId;
    }

    return threadId;
  }

  async searchEmails(query, filters = {}) {
    // This would integrate with email search functionality
    // For now, return empty results
    return {
      emails: [],
      total: 0,
    };
  }

  async testConnection(config) {
    try {
      // Create a temporary transporter for testing
      const testTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection
      await testTransporter.verify();

      // Close the test transporter
      testTransporter.close();

      return {
        success: true,
        message: "Connection successful",
        data: {
          host: config.host,
          port: config.port,
          secure: config.secure,
        },
      };
    } catch (error) {
      console.error("Connection test failed:", error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export functions
export const sendEmail = (emailData) => emailService.sendEmail(emailData);
export const sendBulkEmail = (emails) => emailService.sendBulkEmail(emails);
export const sendTemplateEmail = (templateName, templateData, emailData) =>
  emailService.sendTemplateEmail(templateName, templateData, emailData);
export const validateEmailAddress = (email) =>
  emailService.validateEmailAddress(email);
export const validateEmailData = (emailData) =>
  emailService.validateEmailData(emailData);
export const getEmailStatus = (messageId) =>
  emailService.getEmailStatus(messageId);
export const createEmailThread = (emails) =>
  emailService.createEmailThread(emails);
export const searchEmails = (query, filters) =>
  emailService.searchEmails(query, filters);

export default emailService;
