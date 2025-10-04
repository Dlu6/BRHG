// WhatsApp Service - Supports both Facebook API and Lipachat
import axios from "axios";

const getApiConfig = () => {
  const provider = process.env.WHATSAPP_PROVIDER || "facebook";

  if (provider === "facebook") {
    return {
      baseUrl:
        process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0",
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    };
  } else if (provider === "lipachat") {
    return {
      baseUrl:
        process.env.LIPACHAT_GATEWAY_URL ||
        "https://gateway.lipachat.com/api/v1/whatsapp",
      apiKey: process.env.LIPACHAT_API_KEY,
      phoneNumber: process.env.LIPACHAT_PHONE_NUMBER,
      webhookSecret: process.env.LIPACHAT_WEBHOOK_SECRET,
    };
  }

  throw new Error(
    'Invalid WhatsApp provider. Set WHATSAPP_PROVIDER to "facebook" or "lipachat"'
  );
};

// Facebook API Methods
const sendViaFacebookAPI = async (config, to, message) => {
  const url = `${config.baseUrl}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: {
      body: message,
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

const sendTemplateViaFacebookAPI = async (
  config,
  to,
  templateName,
  variables
) => {
  const url = `${config.baseUrl}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en",
      },
      components: variables
        ? [
            {
              type: "body",
              parameters: Object.entries(variables).map(([key, value]) => ({
                type: "text",
                text: value,
              })),
            },
          ]
        : [],
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

// Lipachat Methods
const sendViaLipachat = async (config, to, message) => {
  const payload = {
    to: to,
    from: config.phoneNumber,
    message: message,
    messageId: `client-${Date.now()}`,
  };

  const response = await axios.post(config.baseUrl, payload, {
    headers: {
      apiKey: config.apiKey,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

const sendTemplateViaLipachat = async (config, to, templateName, variables) => {
  const payload = {
    to: to,
    from: config.phoneNumber,
    type: "TEMPLATE",
    template: {
      name: templateName,
      language: "en",
      components: variables
        ? [
            {
              type: "body",
              parameters: Object.entries(variables).map(([key, value]) => ({
                type: "text",
                text: value,
              })),
            },
          ]
        : [],
    },
  };

  const response = await axios.post(config.baseUrl, payload, {
    headers: {
      apiKey: config.apiKey,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

// Main Service Functions
export const sendText = async (to, message) => {
  const config = getApiConfig();
  const provider = process.env.WHATSAPP_PROVIDER || "facebook";

  if (provider === "facebook") {
    return await sendViaFacebookAPI(config, to, message);
  } else if (provider === "lipachat") {
    return await sendViaLipachat(config, to, message);
  }
};

export const sendTemplate = async (to, templateName, variables = {}) => {
  const config = getApiConfig();
  const provider = process.env.WHATSAPP_PROVIDER || "facebook";

  if (provider === "facebook") {
    return await sendTemplateViaFacebookAPI(
      config,
      to,
      templateName,
      variables
    );
  } else if (provider === "lipachat") {
    return await sendTemplateViaLipachat(config, to, templateName, variables);
  }
};

export const sendMedia = async (
  to,
  mediaUrl,
  mediaType = "image",
  caption = ""
) => {
  const config = getApiConfig();
  const provider = process.env.WHATSAPP_PROVIDER || "facebook";

  if (provider === "facebook") {
    const url = `${config.baseUrl}/${config.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
        caption: caption,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } else if (provider === "lipachat") {
    const payload = {
      to: to,
      from: config.phoneNumber,
      type: mediaType.toUpperCase(),
      [mediaType]: {
        url: mediaUrl,
        caption: caption,
      },
    };

    const response = await axios.post(config.baseUrl, payload, {
      headers: {
        apiKey: config.apiKey,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  }
};

export const verifyWebhook = (req) => {
  const config = getApiConfig();
  const provider = process.env.WHATSAPP_PROVIDER || "facebook";

  if (provider === "facebook") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.verifyToken) {
      return challenge;
    }
    return false;
  } else if (provider === "lipachat") {
    // Lipachat webhook verification logic
    const signature =
      req.headers["x-lipachat-signature"] || req.headers["x-signature"];
    const secret = config.webhookSecret;

    if (!secret || !signature) {
      return true; // Allow if not configured
    }

    // Implement signature verification logic here
    return true;
  }

  return false;
};

export const processWebhook = (req) => {
  const provider = process.env.WHATSAPP_PROVIDER || "facebook";

  if (provider === "facebook") {
    const body = req.body;

    if (body.object === "whatsapp_business_account") {
      body.entry.forEach((entry) => {
        entry.changes.forEach((change) => {
          if (change.field === "messages") {
            change.value.messages?.forEach((message) => {
              return {
                id: message.id,
                text: message.text?.body || "",
                timestamp: new Date(
                  parseInt(message.timestamp) * 1000
                ).toISOString(),
                sender: "contact",
                type: message.type,
                from: change.value.contacts?.[0]?.wa_id,
              };
            });
          }
        });
      });
    }
  } else if (provider === "lipachat") {
    const body = req.body;

    return {
      id: body.message?.id || body.id,
      text: body.message?.text || body.text || "",
      timestamp:
        body.message?.timestamp || body.timestamp || new Date().toISOString(),
      sender: "contact",
      type: body.message?.type || body.type || "text",
      from: body.contact?.phoneNumber || body.from,
    };
  }

  return null;
};

export default {
  sendText,
  sendTemplate,
  sendMedia,
  verifyWebhook,
  processWebhook,
};
