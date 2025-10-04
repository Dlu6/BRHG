import { Op } from "../config/sequelize.js";
import {
  Contact,
  WhatsAppMessage,
  WhatsAppConfig,
  Conversation,
} from "../models/WhatsAppModel.js";
// import pkg from "twilio"; // Removed Twilio import
import { socketService } from "../services/socketService.js";
import axios from "axios"; // Added axios import
import hospitalityTemplateService from "../services/hospitalityTemplateService.js";
import lipachatService from "../services/lipachatService.js";
// const { Twilio } = pkg; // Removed Twilio import

// Get configuration from environment variables
// Removed Twilio config variables
const lipaChatApiKey = process.env.LIPACHAT_API_KEY;
console.log("lipaChatApiKey>>>>>", lipaChatApiKey);
const lipaChatPhoneNumber = process.env.LIPACHAT_PHONE_NUMBER;
console.log(
  `CONTROLLER TOP LEVEL: lipaChatPhoneNumber from env is: ${lipaChatPhoneNumber}`
);

if (!lipaChatApiKey || !lipaChatPhoneNumber) {
  console.error(
    "Missing required Lipachat configuration in environment variables"
  );
}

// const client = new Twilio(twilioAccountSid, twilioAuthToken); // Removed Twilio client initialization

// export const sendMessage = async (req, res) => { ... }; // Entire sendMessage function removed as it was Twilio specific

export const handleWebhook = async (req, res) => {
  // Verify webhook signature if configured
  if (!lipachatService.verifyWebhookSignature(req)) {
    return res.status(401).json({ success: false, error: "Invalid signature" });
  }
  console.log("--- LIPACHAT WEBHOOK RECEIVED ---");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));

  const payload = req.body;
  const eventsToProcess = Array.isArray(payload) ? payload : [payload];

  try {
    for (const event of eventsToProcess) {
      // Check if it's a Lipachat message status update
      if (event.event === "MESSAGE_STATUS" && event.messageStatus) {
        const { waId, messageId, conversationId, status, statusDesc } =
          event.messageStatus;

        if (!messageId || !status) {
          console.warn(
            "Skipping Lipachat MESSAGE_STATUS update due to missing messageId or status:",
            event.messageStatus
          );
          continue;
        }

        const existingMessage = await WhatsAppMessage.findOne({
          where: { messageId: messageId }, // Lipachat uses messageId for status updates
          include: [{ model: Contact, attributes: ["phoneNumber", "id"] }],
        });

        if (existingMessage && existingMessage.whatsapp_contact) {
          await existingMessage.update({
            status: status.toLowerCase(), // DELIVERED -> delivered
            // timestamp: new Date(), // Lipachat status doesn't provide a timestamp for the status event itself
            errorMessage: statusDesc || null, // Use statusDesc for potential error messages
          });

          console.log(
            "Emitting whatsapp:status_update for Lipachat messageId:",
            messageId,
            "status:",
            status
          );
          socketService.emitWhatsAppStatusUpdate({
            messageId: existingMessage.messageId,
            dbMessageId: existingMessage.id,
            status: existingMessage.status,
            timestamp: existingMessage.timestamp, // Keep original message timestamp or update if status provides one
            contactPhoneNumber: existingMessage.whatsapp_contact.phoneNumber,
            contactId: existingMessage.whatsapp_contact.id,
            errorMessage: existingMessage.errorMessage,
          });
        } else {
          console.warn(
            `Received Lipachat MESSAGE_STATUS update for unknown messageId: ${messageId} or message has no associated contact.`
          );
          if (existingMessage) {
            console.warn(
              `Message was found for messageId ${messageId}, but contact was missing. Message details (contactId should be populated):`,
              JSON.stringify(existingMessage.toJSON(), null, 2)
            );
          } else {
            console.warn(
              `Message was NOT found in the database for messageId: ${messageId}`
            );
          }
        }
      }
      // Check if it's a Lipachat template status update
      else if (event.event === "TEMPLATE_STATUS" && event.templateStatus) {
        const { status, templateId, templateName, statusDescription } =
          event.templateStatus;
        console.log(
          `Received Lipachat TEMPLATE_STATUS update: ID ${templateId}, Name: ${templateName}, Status: ${status}, Description: ${statusDescription}`
        );
        // Here you would typically update your local database record of the template status
        // For example:
        // await YourTemplateModel.update({ status, statusDescription }, { where: { templateId } });

        // And potentially emit a socket event if your UI needs to react to template status changes
        socketService.emitGenericNotification({
          type: "TEMPLATE_STATUS_UPDATE",
          data: {
            templateId,
            templateName,
            status,
            statusDescription,
          },
        });
      }
      // Existing logic for inbound messages
      else {
        let isMessageEvent = false;
        let messages = [];

        if (event.messages && Array.isArray(event.messages)) {
          messages = event.messages;
          isMessageEvent = true;
        } else if (
          event.messageId &&
          event.from &&
          event.to &&
          event.type &&
          [
            "TEXT",
            "IMAGE",
            "VIDEO",
            "AUDIO",
            "DOCUMENT",
            "STICKER",
            "LOCATION",
            "INTERACTIVE", // Added INTERACTIVE for buttons/lists
          ].includes(event.type.toUpperCase())
        ) {
          messages = [event];
          isMessageEvent = true;
        }

        if (isMessageEvent) {
          for (const msg of messages) {
            const fromNumberRaw = msg.from;
            const toNumberRaw = msg.to;
            const fromNumber =
              fromNumberRaw && !fromNumberRaw.startsWith("+")
                ? `+${fromNumberRaw}`
                : fromNumberRaw;
            const toNumber =
              toNumberRaw && !toNumberRaw.startsWith("+")
                ? `+${toNumberRaw}`
                : toNumberRaw;
            const lipaMessageId = msg.messageId; // Lipachat specific 'messageId'
            let textContent = msg.text; // For TEXT type

            // Handle interactive messages
            if (msg.type?.toUpperCase() === "INTERACTIVE") {
              if (msg.interactive?.type === "button_reply") {
                textContent = `Button: ${msg.interactive.button_reply.title} (ID: ${msg.interactive.button_reply.id})`;
              } else if (msg.interactive?.type === "list_reply") {
                textContent = `List Reply: ${msg.interactive.list_reply.title} (ID: ${msg.interactive.list_reply.id})`;
              }
            }

            let messageType = (msg.type || "text").toLowerCase();
            let mediaUrl = null;
            const profileName = msg.profileName;

            let eventTimestamp = new Date();
            if (msg.timestamp) {
              const ts = parseInt(msg.timestamp);
              if (!isNaN(ts)) {
                eventTimestamp =
                  ts > 9999999999 ? new Date(ts) : new Date(ts * 1000);
              }
            }

            // Lipachat uses direct 'url' for media, not 'link' based on sample payload
            if (
              msg.type?.toUpperCase() === "IMAGE" &&
              msg.image &&
              msg.image.url
            ) {
              messageType = "image";
              mediaUrl = msg.image.url;
              if (msg.image.caption) textContent = msg.image.caption;
            } else if (
              msg.type?.toUpperCase() === "VIDEO" &&
              msg.video &&
              msg.video.url
            ) {
              messageType = "video";
              mediaUrl = msg.video.url;
              if (msg.video.caption) textContent = msg.video.caption;
            } else if (
              msg.type?.toUpperCase() === "AUDIO" &&
              msg.audio &&
              msg.audio.url
            ) {
              messageType = "audio";
              mediaUrl = msg.audio.url;
              if (msg.audio.caption) textContent = msg.audio.caption;
            } else if (
              msg.type?.toUpperCase() === "DOCUMENT" &&
              msg.document &&
              msg.document.url
            ) {
              messageType = "document";
              mediaUrl = msg.document.url;
              if (msg.document.caption) textContent = msg.document.caption;
            } else if (
              msg.type?.toUpperCase() === "STICKER" &&
              msg.sticker &&
              msg.sticker.url
            ) {
              messageType = "sticker";
              mediaUrl = msg.sticker.url;
              if (msg.sticker.caption) textContent = msg.sticker.caption;
            }

            if (!fromNumber || !toNumber || !lipaMessageId) {
              console.warn(
                "Skipping message due to missing critical info (from, to, or messageId):",
                msg
              );
              continue;
            }

            let contact = null;
            let unreadCountForEmit = 0;

            const [foundContact, created] = await Contact.findOrCreate({
              where: { phoneNumber: fromNumber },
              defaults: {
                name: profileName || fromNumber,
                lastInteraction: eventTimestamp,
                lastMessage: textContent || `Media (${messageType})`,
                isOnline: true,
                unreadCount: 1,
              },
            });
            contact = foundContact;

            if (!created) {
              await contact.increment("unreadCount");
              await contact.update({
                name: profileName || contact.name,
                lastInteraction: eventTimestamp,
                lastMessage: textContent || `Media (${messageType})`,
                lastMessageSender: "contact",
                lastMessageId: lipaMessageId,
              });
              await contact.reload();
              unreadCountForEmit = contact.unreadCount;
            } else {
              unreadCountForEmit = contact.unreadCount;
            }

            // Find/create conversation for this contact
            let conversation = await Conversation.findOne({
              where: { contactId: contact.id, status: "open" },
              order: [["updatedAt", "DESC"]],
            });
            if (!conversation) {
              conversation = await Conversation.create({
                contactId: contact.id,
                provider: "lipachat",
                status: "open",
                unreadCount: 1,
                lastMessageAt: eventTimestamp,
              });
            } else {
              await conversation.update({
                unreadCount: conversation.unreadCount + 1,
                lastMessageAt: eventTimestamp,
              });
            }

            const incomingMessage = await WhatsAppMessage.create({
              messageId: lipaMessageId,
              from: fromNumber,
              to: toNumber,
              text: textContent,
              mediaUrl: mediaUrl,
              status: "received",
              contactId: contact.id,
              sender: fromNumber,
              type: messageType,
              timestamp: eventTimestamp,
              conversationId: conversation.id,
            });

            console.log(
              "Emitting whatsapp:message for contact:",
              contact.phoneNumber,
              "Our DB msg ID:",
              incomingMessage.id,
              "Lipa Msg ID:",
              lipaMessageId
            );
            socketService.emitWhatsAppMessage({
              message: {
                id: incomingMessage.id,
                messageId: incomingMessage.messageId,
                text: incomingMessage.text,
                mediaUrl: incomingMessage.mediaUrl,
                timestamp: incomingMessage.timestamp,
                sender: "contact",
                status: incomingMessage.status,
                type: incomingMessage.type,
              },
              contact: {
                id: contact.id,
                phoneNumber: contact.phoneNumber,
                name: contact.name,
                avatar:
                  contact.avatar ||
                  contact.name?.substring(0, 2).toUpperCase() ||
                  fromNumber.substring(fromNumber.length - 2),
                lastMessage: contact.lastMessage,
                unreadCount: conversation.unreadCount,
                isOnline: contact.isOnline,
                lastMessageSender: contact.lastMessageSender,
                lastMessageId: contact.lastMessageId,
                conversationId: conversation.id,
              },
            });
          }
        } else {
          console.log(
            "Received unhandled Lipachat event structure or non-message/non-status event:",
            event
          );
        }
      }
    }

    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Error processing Lipachat webhook:", error);
    res
      .status(500)
      .json({ success: false, error: error.message, details: error.stack });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { contactId } = req.params;
    const messages = await WhatsAppMessage.findAll({
      where: {
        [Op.or]: [{ from: contactId }, { to: contactId }],
      },
      order: [["timestamp", "DESC"]],
      limit: 100,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
    });
  }
};

export const getMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await WhatsAppMessage.findOne({
      where: { messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    res.json({
      success: true,
      data: {
        messageId: message.messageId,
        status: message.status,
      },
    });
  } catch (error) {
    console.error("Error fetching message status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch message status",
    });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      include: [
        {
          model: WhatsAppMessage,
          as: "messageHistory",
          limit: 1,
          order: [["createdAt", "DESC"]],
          attributes: [
            "id",
            "messageId",
            "text",
            "status",
            "errorCode",
            "errorMessage",
            "createdAt",
          ],
        },
      ],
      order: [["lastInteraction", "DESC"]],
      attributes: [
        "id",
        "phoneNumber",
        "lastInteraction",
        "lastMessage",
        "unreadCount",
      ],
    });

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contacts",
    });
  }
};

export const addContact = async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;
    const contact = await Contact.create({
      phoneNumber,
      name,
      lastInteraction: new Date(),
    });

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Error adding contact:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add contact",
    });
  }
};

export const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const updates = req.body;

    const [updated] = await Contact.update(updates, {
      where: { phoneNumber: contactId },
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Contact not found",
      });
    }

    const updatedContact = await Contact.findOne({
      where: { phoneNumber: contactId },
    });

    res.json({
      success: true,
      data: updatedContact,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update contact",
    });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // TODO: Implement media upload to a storage service (e.g., S3, Cloudinary)
    // For now, returning a placeholder or saving locally if desired.
    // This example does not use Lipachat's media upload directly in this endpoint.
    // Lipachat expects a publicly accessible URL when sending media messages.

    console.warn(
      "uploadMedia: Media upload to external service not yet implemented. File details:",
      file.originalname
    );
    // Placeholder response
    res.json({
      success: true,
      data: {
        // mediaId: "placeholder-media-id", // Replace with actual ID from storage
        mediaUrl: `https://your-media-storage.example.com/${file.originalname}`, // Replace with actual URL
        message:
          "Media upload endpoint called. Implement actual storage logic.",
      },
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload media",
    });
  }
};

export const getMedia = async (req, res) => {
  try {
    const { mediaId } = req.params; // This mediaId would be our internal ID or one from a storage service

    // TODO: Implement fetching media metadata from your storage
    // This endpoint is not for fetching from Lipachat directly as they provide direct URLs in webhooks.

    console.warn(
      `getMedia: Fetching media for ID ${mediaId} not yet fully implemented.`
    );
    // Placeholder response
    res.json({
      success: true,
      data: {
        mediaId: mediaId,
        mediaUrl: `https://your-media-storage.example.com/path/to/${mediaId}`, // Replace with actual URL
        contentType: "image/jpeg", // Example
        size: 12345, // Example
        message:
          "Media fetch endpoint called. Implement actual storage retrieval.",
      },
    });
  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch media",
    });
  }
};

export const getWhatsAppConfig = async (req, res) => {
  try {
    // Prefer DB-configured values; fall back to env
    const cfg = await WhatsAppConfig.findOne();
    const phone = cfg?.phoneNumber || lipaChatPhoneNumber || null;
    if (!phone) {
      return res.status(200).json({
        success: true,
        data: {
          enabled: cfg?.enabled || false,
          phoneNumber: "",
          webhookUrl: cfg?.webhookUrl || "",
          apiKeyProvided: Boolean(cfg?.lipaApiKey),
        },
        warning: "WhatsApp number not configured yet.",
      });
    }

    res.json({
      success: true,
      data: {
        enabled: cfg?.enabled ?? Boolean(process.env.LIPACHAT_API_KEY),
        phoneNumber: phone,
        webhookUrl: cfg?.webhookUrl || "",
        apiKeyProvided: Boolean(
          cfg?.lipaApiKey || process.env.LIPACHAT_API_KEY
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching WhatsApp agent config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch WhatsApp agent configuration",
    });
  }
};

export const updateWhatsAppConfig = async (req, res) => {
  try {
    const {
      enabled,
      // accountSid, // Removed Twilio
      // authToken, // Removed Twilio
      apiKey, // Added for Lipachat
      phoneNumber,
      webhookUrl, // This should be your app's incoming webhook URL
      // contentSid, // Removed Twilio
    } = req.body;

    let config = await WhatsAppConfig.findOne();

    if (!config) {
      config = await WhatsAppConfig.create({
        enabled,
        lipaApiKey: apiKey || null,
        phoneNumber: phoneNumber || null,
        webhookUrl: webhookUrl || null,
      });
    } else {
      await config.update({
        enabled,
        lipaApiKey: apiKey || config.lipaApiKey,
        phoneNumber: phoneNumber || config.phoneNumber,
        webhookUrl: webhookUrl || config.webhookUrl,
      });
    }

    // No Twilio client to test connection with.
    // If Lipachat has a "verify credentials" API endpoint, you could call it here.

    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        phoneNumber: config.phoneNumber || "",
        webhookUrl: config.webhookUrl || "",
        apiKeyProvided: Boolean(config.lipaApiKey),
      },
    });
  } catch (error) {
    console.error("Error updating WhatsApp config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update WhatsApp configuration",
    });
  }
};

export const getChats = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      attributes: [
        "id",
        "name",
        "phoneNumber",
        "lastMessage",
        "lastInteraction",
        "unreadCount",
        "status",
        "isOnline",
        "isBlocked",
        "isGroup",
        "lastMessageSender",
        "lastMessageId",
      ],
      include: [
        {
          model: WhatsAppMessage,
          as: "messageHistory",
          limit: 1,
          order: [["createdAt", "DESC"]],
          attributes: ["text", "timestamp", "status", "sender"],
        },
      ],
      order: [["lastInteraction", "DESC"]],
    });

    // console.log("Fetched contacts:", JSON.stringify(contacts, null, 2));

    const formattedChats = contacts.map((contact) => {
      const contactData = contact.get({ plain: true });
      // console.log("Processing contact:", contactData);

      // Determine the status to show based on lastMessageSender
      let displayStatus = contactData.status || "offline";
      if (
        contactData.lastMessageSender === "user" &&
        contactData.messageHistory?.[0]
      ) {
        // If last message was sent by user, use the message status
        displayStatus = contactData.messageHistory[0].status || displayStatus;
      }

      return {
        id: contactData.id,
        name: contactData.name || contactData.phoneNumber,
        phoneNumber: contactData.phoneNumber,
        avatar: contactData.name
          ? contactData.name.substring(0, 2).toUpperCase()
          : contactData.phoneNumber.substring(0, 2).toUpperCase(),
        lastMessage:
          contactData.messageHistory?.[0]?.text ||
          contactData.lastMessage ||
          "",
        timestamp:
          contactData.messageHistory?.[0]?.timestamp ||
          contactData.lastInteraction,
        unread: contactData.unreadCount || 0,
        status: displayStatus,
        isOnline: contactData.isOnline || false,
        isBlocked: contactData.isBlocked || false,
        isGroup: contactData.isGroup || false,
        lastMessageSender: contactData.lastMessageSender,
        lastMessageId: contactData.lastMessageId,
      };
    });

    // console.log("Formatted chats:", JSON.stringify(formattedChats, null, 2));

    res.json({
      success: true,
      data: formattedChats,
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch chats",
    });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await Contact.findOne({
      attributes: ["id", "phoneNumber", "name"],
      where: { phoneNumber: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found",
      });
    }

    const messages = await WhatsAppMessage.findAll({
      where: {
        contactId: contact.id,
      },
      order: [["timestamp", "ASC"]],
    });

    const formattedMessages = messages.map((message) => ({
      id: message.id,
      messageId: message.messageId, // Include original messageId
      text: message.text,
      mediaUrl: message.mediaUrl, // Include mediaUrl
      timestamp: message.timestamp,
      // Determine sender based on whether the message.from matches our Lipachat number
      sender:
        message.from ===
        (lipaChatPhoneNumber.startsWith("+")
          ? lipaChatPhoneNumber
          : `+${lipaChatPhoneNumber}`)
          ? "user" // Our application sent this message
          : "contact", // The external contact sent this message
      status: message.status,
      type: message.type, // Include message type
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    }));

    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat messages",
    });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { text, mediaUrl, template } = req.body;

    console.log(
      `SENDCHATMESSAGE: lipaChatPhoneNumber (module scope): ${lipaChatPhoneNumber}`
    );
    console.log(
      `SENDCHATMESSAGE: lipaChatApiKey (module scope): ${lipaChatApiKey}`
    );

    const contact = await Contact.findOne({
      where: { phoneNumber: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found",
      });
    }

    if (!lipaChatApiKey || !lipaChatPhoneNumber) {
      console.error(
        "SENDCHATMESSAGE ERROR: Lipachat API Key or Phone Number not configured properly at the top of the controller."
      );
      return res.status(400).json({
        success: false,
        error: "Lipachat API Key or Phone Number not configured on the server.",
      });
    }

    // Try sending the fromNumber exactly as it is in the .env, as per the dashboard display
    const fromNumberForApi = lipaChatPhoneNumber;

    // Ensure 'to' number is correctly formatted (E.164 with +)
    const toNumberForApi = contact.phoneNumber.startsWith("+")
      ? contact.phoneNumber
      : `+${contact.phoneNumber}`;

    // Normalize the sender's number for consistent database storage (with +)
    const normalizedFromNumberForDb = lipaChatPhoneNumber.startsWith("+")
      ? lipaChatPhoneNumber
      : `+${lipaChatPhoneNumber}`;

    console.log(
      `SENDCHATMESSAGE: Using FROM number for API: ${fromNumberForApi}`
    );
    console.log(`SENDCHATMESSAGE: Using TO number for API: ${toNumberForApi}`);

    let lipaMessageId = null;
    let lipaMessageStatus = "failed";
    let finalMessageType = "text";

    // TODO: Determine the LIPACHAT_API_BASE_URL, e.g., from .env or hardcode if static
    // Assuming it's "https://gateway.lipachat.com/api/v1/whatsapp" based on Postman
    const LIPACHAT_API_BASE_URL = process.env.LIPACHAT_GATEWAY_URL;

    if (template && template.name) {
      finalMessageType = "template";
      try {
        const resp = await lipachat.sendTemplate({
          to: toNumberForApi,
          from: fromNumberForApi,
          template,
          apiKey:
            (await WhatsAppConfig.findOne())?.lipaApiKey || lipaChatApiKey,
        });
        if (resp?.data?.messageId) {
          lipaMessageId = resp.data.messageId;
          lipaMessageStatus = resp.data.status?.toLowerCase() || "sent";
        } else {
          lipaMessageId = `lipa-template-${Date.now()}`;
        }
      } catch (e) {
        console.error(
          "Lipachat template send error:",
          e.response?.data || e.message
        );
        lipaMessageId = `lipa-template-error-${Date.now()}`;
      }
    } else if (mediaUrl) {
      finalMessageType =
        mediaUrl.includes(".jpg") || mediaUrl.includes(".png")
          ? "image"
          : mediaUrl.includes(".mp4")
          ? "video"
          : "document";
      try {
        const resp = await lipachat.sendMedia({
          to: toNumberForApi,
          from: fromNumberForApi,
          url: mediaUrl,
          type: finalMessageType,
          apiKey:
            (await WhatsAppConfig.findOne())?.lipaApiKey || lipaChatApiKey,
        });
        if (resp?.data?.messageId) {
          lipaMessageId = resp.data.messageId;
          lipaMessageStatus = resp.data.status?.toLowerCase() || "sent";
        } else {
          lipaMessageId = `lipa-media-${Date.now()}`;
        }
      } catch (e) {
        console.error(
          "Lipachat media send error:",
          e.response?.data || e.message
        );
        lipaMessageId = `lipa-media-error-${Date.now()}`;
      }
    } else if (text) {
      finalMessageType = "text";
      try {
        const response = await lipachat.sendText({
          to: toNumberForApi,
          from: fromNumberForApi,
          message: text,
          apiKey:
            (await WhatsAppConfig.findOne())?.lipaApiKey || lipaChatApiKey,
        });
        if (response?.data?.messageId) {
          lipaMessageId = response.data.messageId;
          lipaMessageStatus = response.data.status?.toLowerCase() || "sent";
        } else {
          lipaMessageId = `lipa-text-${Date.now()}`;
        }
      } catch (apiError) {
        console.error(
          "Error calling Lipachat API for text message:",
          apiError.response
            ? JSON.stringify(apiError.response.data, null, 2)
            : apiError.message
        );
        lipaMessageId = `lipa-error-text-${Date.now()}`;
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "No message content (text, media, or template) provided.",
      });
    }

    // Find or create conversation for outbound message
    let conversation = await Conversation.findOne({
      where: { contactId: contact.id, status: "open" },
      order: [["updatedAt", "DESC"]],
    });
    if (!conversation) {
      conversation = await Conversation.create({
        contactId: contact.id,
        provider: "lipachat",
        status: "open",
        unreadCount: 0,
        lastMessageAt: new Date(),
      });
    } else {
      await conversation.update({ lastMessageAt: new Date() });
    }

    const messageToSave = {
      messageId: lipaMessageId || `unknown-${Date.now()}`,
      from: normalizedFromNumberForDb, // Store the number as it was sent
      to: toNumberForApi, // Store the number as it was sent
      text: text,
      mediaUrl: finalMessageType !== "text" ? mediaUrl : null,
      status: lipaMessageStatus,
      contactId: contact.id,
      sender: normalizedFromNumberForDb, // Our number is the sender
      template: template ? JSON.stringify(template) : null,
      type: finalMessageType,
      timestamp: new Date(),
      conversationId: conversation.id,
    };

    const message = await WhatsAppMessage.create(messageToSave);

    await contact.update({
      lastInteraction: new Date(),
      lastMessage: text || `Sent ${finalMessageType}`,
      lastMessageSender: "user",
      lastMessageId: lipaMessageId,
    });

    socketService.emitWhatsAppMessage({
      message: {
        id: message.id,
        messageId: message.messageId,
        text: message.text,
        mediaUrl: message.mediaUrl,
        timestamp: message.timestamp,
        sender: "user",
        status: message.status,
        type: message.type,
      },
      contact: {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        lastMessageSender: "user",
        lastMessageId: message.messageId,
        conversationId: conversation.id,
      },
    });

    return res.json({
      success: lipaMessageStatus !== "failed",
      data: message,
    });
  } catch (error) {
    console.error("Error in sendChatMessage main try block:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
    });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const [updated] = await WhatsAppMessage.update(
      { status },
      { where: { messageId } }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    const updatedMessage = await WhatsAppMessage.findOne({
      where: { messageId },
      include: [
        {
          model: WhatsAppMessage,
          as: "replyMessage",
          attributes: ["id", "text", "sender", "timestamp"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        id: updatedMessage.id,
        messageId: updatedMessage.messageId,
        status: updatedMessage.status,
        timestamp: updatedMessage.timestamp,
        replyTo: updatedMessage.replyMessage || null,
      },
    });
  } catch (error) {
    console.error("Error updating message status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update message status",
    });
  }
};

export const getWhatsAppTemplates = async (req, res) => {
  try {
    // This endpoint would now need to call Lipachat's API to list templates
    // if (!lipaChatApiKey) {
    //   return res.status(400).json({ success: false, error: "Lipachat API Key not configured." });
    // }
    // const lipaTemplatesResponse = await axios.get("LIPACHAT_LIST_TEMPLATES_API_ENDPOINT", {
    //   headers: { "api-key": lipaChatApiKey },
    // });
    // const formattedTemplates = lipaTemplatesResponse.data.map(t => ({...}));

    console.warn(
      "getWhatsAppTemplates: Lipachat integration not yet implemented. Returning empty array."
    );
    res.json({
      success: true,
      data: [], // Placeholder
    });
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch templates: ${error.message}`,
    });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;
    // This endpoint would now need to call Lipachat's API to get a specific template
    // const lipaTemplateResponse = await axios.get(`LIPACHAT_GET_TEMPLATE_API_ENDPOINT/${templateId}`, { ... });
    console.warn(
      `getTemplateById: Lipachat integration for template ${templateId} not yet implemented.`
    );
    res.status(404).json({
      success: false,
      error: "Not implemented for Lipachat yet",
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template",
    });
  }
};

export const createTemplate = async (req, res) => {
  try {
    // This endpoint would now need to call Lipachat's API to create a template
    // const lipaCreateResponse = await axios.post("LIPACHAT_CREATE_TEMPLATE_API_ENDPOINT", req.body, { ... });
    console.warn("createTemplate: Lipachat integration not yet implemented.");
    res.status(404).json({
      success: false,
      error: "Not implemented for Lipachat yet",
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      error: `Failed to create template: ${error.message}`,
    });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    // This endpoint would now need to call Lipachat's API to delete a template
    // await axios.delete(`LIPACHAT_DELETE_TEMPLATE_API_ENDPOINT/${templateId}`, { ... });
    console.warn(
      `deleteTemplate: Lipachat integration for template ${templateId} not yet implemented.`
    );
    res.status(404).json({
      success: false,
      error: "Not implemented for Lipachat yet",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      error: `Failed to delete template: ${error.message}`,
    });
  }
};

// This function might be redundant if all status updates are handled by the main webhook.
// Kept for now if there's a direct call path, but review its necessity.
export const handleMessageStatus = async (messageId, status) => {
  try {
    const message = await WhatsAppMessage.findOne({
      where: { messageId: messageId }, // Assuming messageId is the Lipachat message ID
      include: [{ model: Contact, attributes: ["phoneNumber", "id"] }],
    });

    if (message && message.whatsapp_contact) {
      // Lipachat statuses are typically uppercase: SENT, DELIVERED, READ, FAILED
      // We store them lowercase.
      const normalizedStatus = status.toLowerCase();

      await message.update({ status: normalizedStatus });

      socketService.emitWhatsAppStatusUpdate({
        messageId: message.messageId,
        dbMessageId: message.id,
        status: normalizedStatus,
        timestamp: new Date().toISOString(), // Or use timestamp from Lipachat if available in this context
        contactPhoneNumber: message.whatsapp_contact.phoneNumber,
        contactId: message.whatsapp_contact.id,
      });
    } else {
      console.warn(
        `handleMessageStatus: Message or associated contact not found for Lipachat messageId ${messageId}`
      );
    }
  } catch (error) {
    console.error("Error updating message status from direct call:", error);
  }
};

export const markChatAsRead = async (req, res) => {
  try {
    const { contactId } = req.params; // This will be the phone number
    const phoneNumber = contactId.startsWith("+") ? contactId : `+${contactId}`;

    const contact = await Contact.findOne({
      where: { phoneNumber: phoneNumber },
    });

    if (!contact) {
      return res
        .status(404)
        .json({ success: false, error: "Contact not found" });
    }

    // Reset unread on the latest open conversation
    const conversation = await Conversation.findOne({
      where: { contactId: contact.id, status: "open" },
      order: [["updatedAt", "DESC"]],
    });
    if (conversation && conversation.unreadCount > 0) {
      await conversation.update({ unreadCount: 0 });

      // Emit an update to inform clients
      socketService.emitWhatsAppMessage({
        // Re-using emitWhatsAppMessage structure for simplicity
        // It will trigger 'whatsapp:chat_update' on the frontend
        message: {
          // Provide minimal message-like info if needed, or adapt frontend
          id: null, // No specific message, just chat update
          timestamp: conversation.lastMessageAt || new Date(),
        },
        contact: {
          id: contact.id,
          phoneNumber: contact.phoneNumber,
          name: contact.name,
          avatar:
            contact.avatar ||
            contact.name?.substring(0, 2).toUpperCase() ||
            phoneNumber.substring(phoneNumber.length - 2),
          lastMessage: contact.lastMessage,
          unreadCount: 0,
          isOnline: contact.isOnline,
          lastMessageSender: contact.lastMessageSender,
          lastMessageId: contact.lastMessageId,
          conversationId: conversation.id,
        },
      });
    }

    res.json({ success: true, data: { unreadCount: 0 } });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark chat as read" });
  }
};

// Agent Ownership and Disposition Management

export const assignConversationToAgent = async (req, res) => {
  try {
    const { conversationId, agentId } = req.body;

    if (!conversationId || !agentId) {
      return res.status(400).json({
        success: false,
        error: "conversationId and agentId are required",
      });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Update conversation with agent assignment
    await conversation.update({
      assignedAgentId: agentId,
      status: "open",
      lockOwnerId: agentId,
      lockExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes lock
    });

    // Emit real-time update
    socketService.emitWhatsAppMessage({
      message: {
        id: `assignment-${Date.now()}`,
        timestamp: new Date(),
        type: "assignment",
      },
      contact: {
        conversationId: conversation.id,
        assignedAgentId: agentId,
        status: "assigned",
      },
    });

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        assignedAgentId: agentId,
        status: conversation.status,
      },
    });
  } catch (error) {
    console.error("Error assigning conversation to agent:", error);
    res.status(500).json({
      success: false,
      error: "Failed to assign conversation to agent",
    });
  }
};

export const updateConversationDisposition = async (req, res) => {
  try {
    const {
      conversationId,
      disposition,
      dispositionNotes,
      customerSatisfaction,
    } = req.body;
    const agentId = req.user?.id;

    if (!conversationId || !disposition) {
      return res.status(400).json({
        success: false,
        error: "conversationId and disposition are required",
      });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Check if agent has permission to update this conversation
    if (conversation.assignedAgentId !== agentId) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to update this conversation",
      });
    }

    // Calculate resolution time if conversation is being resolved
    let resolutionTime = conversation.resolutionTime;
    if (disposition === "resolved" && !conversation.resolutionTime) {
      const startTime = conversation.createdAt;
      const endTime = new Date();
      resolutionTime = Math.floor((endTime - startTime) / 1000); // in seconds
    }

    // Update conversation with disposition
    await conversation.update({
      disposition,
      dispositionNotes,
      dispositionDate: new Date(),
      customerSatisfaction,
      resolutionTime,
      status: disposition === "resolved" ? "resolved" : conversation.status,
    });

    // Emit real-time update
    socketService.emitWhatsAppMessage({
      message: {
        id: `disposition-${Date.now()}`,
        timestamp: new Date(),
        type: "disposition_update",
      },
      contact: {
        conversationId: conversation.id,
        disposition,
        status: conversation.status,
      },
    });

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        disposition,
        dispositionNotes,
        customerSatisfaction,
        resolutionTime,
        status: conversation.status,
      },
    });
  } catch (error) {
    console.error("Error updating conversation disposition:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update conversation disposition",
    });
  }
};

export const getAgentConversations = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const { status = "open", limit = 50, offset = 0 } = req.query;

    const conversations = await Conversation.findAndCountAll({
      where: {
        assignedAgentId: agentId,
        ...(status !== "all" && { status }),
      },
      include: [
        {
          model: Contact,
          attributes: ["id", "phoneNumber", "name", "avatar", "isOnline"],
        },
        {
          model: WhatsAppMessage,
          as: "messageHistory",
          limit: 1,
          order: [["createdAt", "DESC"]],
          attributes: ["id", "text", "timestamp", "sender", "type"],
        },
      ],
      order: [["lastMessageAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        conversations: conversations.rows,
        total: conversations.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error fetching agent conversations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch agent conversations",
    });
  }
};

export const getConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const agentId = req.user?.id;

    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: Contact,
          attributes: [
            "id",
            "phoneNumber",
            "name",
            "avatar",
            "isOnline",
            "customerType",
          ],
        },
        {
          model: WhatsAppMessage,
          as: "messageHistory",
          order: [["createdAt", "ASC"]],
          attributes: [
            "id",
            "messageId",
            "text",
            "timestamp",
            "sender",
            "type",
            "status",
            "mediaUrl",
            "replyTo",
          ],
        },
      ],
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Check if agent has permission to view this conversation
    if (conversation.assignedAgentId !== agentId) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to view this conversation",
      });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversation details",
    });
  }
};

export const transferConversation = async (req, res) => {
  try {
    const { conversationId, targetAgentId, transferReason } = req.body;
    const fromAgentId = req.user?.id;

    if (!conversationId || !targetAgentId) {
      return res.status(400).json({
        success: false,
        error: "conversationId and targetAgentId are required",
      });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Check if current agent has permission to transfer
    if (conversation.assignedAgentId !== fromAgentId) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to transfer this conversation",
      });
    }

    // Update conversation with new agent assignment
    await conversation.update({
      assignedAgentId: targetAgentId,
      lockOwnerId: targetAgentId,
      lockExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes lock
      metadata: {
        ...conversation.metadata,
        transferHistory: [
          ...(conversation.metadata?.transferHistory || []),
          {
            fromAgentId,
            toAgentId: targetAgentId,
            transferReason,
            transferredAt: new Date(),
          },
        ],
      },
    });

    // Emit real-time update
    socketService.emitWhatsAppMessage({
      message: {
        id: `transfer-${Date.now()}`,
        timestamp: new Date(),
        type: "transfer",
      },
      contact: {
        conversationId: conversation.id,
        assignedAgentId: targetAgentId,
        status: "transferred",
      },
    });

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        assignedAgentId: targetAgentId,
        status: conversation.status,
      },
    });
  } catch (error) {
    console.error("Error transferring conversation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to transfer conversation",
    });
  }
};

// Hospitality Template Management
export const getHospitalityTemplates = async (req, res) => {
  try {
    const { category } = req.query;

    let templates;
    if (category) {
      templates = hospitalityTemplateService.getTemplatesByCategory(category);
    } else {
      templates = hospitalityTemplateService.getAllTemplates();
    }

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching hospitality templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
    });
  }
};

export const getHospitalityTemplate = async (req, res) => {
  try {
    const { templateName } = req.params;

    const template = hospitalityTemplateService.getTemplate(templateName);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template",
    });
  }
};

export const sendTemplateMessage = async (req, res) => {
  try {
    const { templateName, to, variables } = req.body;
    const agentId = req.user?.id;

    if (!templateName || !to) {
      return res.status(400).json({
        success: false,
        error: "templateName and to are required",
      });
    }

    // Get the template
    const template = hospitalityTemplateService.getTemplate(templateName);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    // Validate template variables
    const validation = hospitalityTemplateService.validateTemplateVariables(
      template,
      variables || {}
    );
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Missing required template variables",
        missingVariables: validation.missingVariables,
        requiredVariables: validation.requiredVariables,
      });
    }

    // Replace variables in template
    const processedTemplate = {
      ...template,
      components: template.components.map((component) => ({
        ...component,
        text: component.text
          ? hospitalityTemplateService.replaceTemplateVariables(
              component.text,
              variables
            )
          : component.text,
      })),
    };

    // Send template message via Lipachat
    const response = await lipachat.sendTemplate({
      to,
      from: process.env.LIPACHAT_PHONE_NUMBER,
      template: processedTemplate,
    });

    // Log the message
    const message = await WhatsAppMessage.create({
      messageId: `template-${Date.now()}`,
      contactId: to,
      text:
        processedTemplate.components.find((c) => c.type === "BODY")?.text || "",
      timestamp: new Date(),
      sender: "agent",
      type: "template",
      status: "sent",
      agentId,
    });

    // Emit real-time update
    socketService.emitWhatsAppMessage({
      message: {
        id: message.id,
        timestamp: message.timestamp,
        type: "template",
      },
      contact: {
        phoneNumber: to,
        messageId: message.messageId,
      },
    });

    res.json({
      success: true,
      data: {
        messageId: message.id,
        templateName,
        status: "sent",
      },
    });
  } catch (error) {
    console.error("Error sending template message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send template message",
    });
  }
};

export const validateTemplateVariables = async (req, res) => {
  try {
    const { templateName, variables } = req.body;

    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: "templateName is required",
      });
    }

    const template = hospitalityTemplateService.getTemplate(templateName);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const validation = hospitalityTemplateService.validateTemplateVariables(
      template,
      variables || {}
    );

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error("Error validating template variables:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate template variables",
    });
  }
};
