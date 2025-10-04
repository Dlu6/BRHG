import smsService from "../services/smsService.js";
import SmsMessage from "../models/SmsMessage.js"; // Import the model
import { Op, fn, col, literal } from "sequelize";

export const sendSms = async (req, res) => {
  try {
    const { to, content, from, dlr, dlrUrl, dlrLevel } = req.body;
    if (!to || !content) {
      return res
        .status(400)
        .json({ success: false, message: "To and content are required" });
    }

    const data = await smsService.send({
      to,
      content,
      from,
      dlr,
      dlrUrl,
      dlrLevel,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("SMS send error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send SMS",
      error: error.message,
    });
  }
};

export const getBalance = async (req, res) => {
  try {
    const data = await smsService.balance();
    return res.json({ success: true, data });
  } catch (error) {
    console.error("SMS balance error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch balance",
      error: error.message,
    });
  }
};

export const deliveryReport = async (req, res) => {
  try {
    // Log the incoming DLR for debugging
    console.log("Incoming DLR:", req.body);
    const normalizedDlr = smsService.normalizeDlr(req.body);

    if (normalizedDlr.messageId) {
      const message = await SmsMessage.findOne({
        where: { providerMessageId: normalizedDlr.messageId },
      });

      if (message) {
        let newStatus = message.status;
        const dlrStatus = normalizedDlr.status.toLowerCase();

        if (dlrStatus.includes("delivered")) {
          newStatus = "delivered";
        } else if (
          dlrStatus.includes("failed") ||
          dlrStatus.includes("undelivered")
        ) {
          newStatus = "undelivered";
        }

        if (newStatus !== message.status) {
          message.status = newStatus;
          await message.save();
          console.log(`Updated message ${message.id} status to ${newStatus}`);
        }
      } else {
        console.warn(
          `DLR received for unknown messageId: ${normalizedDlr.messageId}`
        );
      }
    }

    return res.json({ success: true, message: "DLR received" });
  } catch (error) {
    console.error("DLR processing error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "DLR processing failed" });
  }
};

export const getConversations = async (req, res) => {
  try {
    // This is a complex query to get the last message for each conversation partner.
    // We define a "partner" as the other phone number in the conversation.
    const conversations = await SmsMessage.findAll({
      attributes: [
        [
          literal(
            `CASE WHEN direction = 'outbound' THEN toNumber ELSE fromNumber END`
          ),
          "partner",
        ],
        [fn("MAX", col("createdAt")), "lastMessageTimestamp"],
      ],
      group: ["partner"],
      order: [[col("lastMessageTimestamp"), "DESC"]],
    });

    // For each conversation, fetch the last message details
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (c) => {
        const partner = c.get("partner");
        const lastMessage = await SmsMessage.findOne({
          where: {
            [Op.or]: [{ fromNumber: partner }, { toNumber: partner }],
          },
          order: [["createdAt", "DESC"]],
        });
        return {
          partner: partner,
          lastMessage: lastMessage.content,
          timestamp: lastMessage.createdAt,
          direction: lastMessage.direction,
        };
      })
    );

    return res.json({ success: true, data: conversationsWithDetails });
  } catch (error) {
    console.error("Failed to get conversations:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get conversations" });
  }
};

export const getMessagesForConversation = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    const messages = await SmsMessage.findAll({
      where: {
        [Op.or]: [{ fromNumber: phoneNumber }, { toNumber: phoneNumber }],
      },
      order: [["createdAt", "ASC"]],
      limit: 100, // Limit to the last 100 messages for performance
    });

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error("Failed to get messages:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get messages" });
  }
};

export const listProviders = async (req, res) => {
  try {
    // In a real scenario, this would list configured providers from a DB
    // For now, we return a static list of supported providers
    return res.json({
      success: true,
      data: [
        {
          key: "cyber_innovative",
          name: "Cyber Innovative SMS",
          baseUrl:
            process.env.SMS_PROVIDER_BASE_URL ||
            "https://sms.cyber-innovative.com/secure",
          supportsDeliveryReports: true,
          configEnv: [
            "SMS_PROVIDER_BASE_URL",
            "SMS_PROVIDER_AUTH",
            "SMS_PROVIDER_USERNAME",
            "SMS_PROVIDER_PASSWORD",
            "SMS_PROVIDER_OVERRIDE_IP",
            "SMS_PROVIDER_STRICT_TLS",
            "SMS_DEFAULT_SENDER",
            "SMS_DLR_URL",
          ],
        },
      ],
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to list providers" });
  }
};

export const getSmsConfig = async (req, res) => {
  try {
    const config = await smsService.getProviderConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error("Failed to get SMS config:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get SMS config" });
  }
};

export const updateSmsConfig = async (req, res) => {
  try {
    const newConfig = req.body;
    await smsService.updateProviderConfig(newConfig);
    return res.json({
      success: true,
      message: "SMS config updated successfully",
    });
  } catch (error) {
    console.error("Failed to update SMS config:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update SMS config" });
  }
};

export default {
  sendSms,
  getBalance,
  deliveryReport,
  getConversations,
  getMessagesForConversation,
  listProviders,
  getSmsConfig,
  updateSmsConfig,
};
