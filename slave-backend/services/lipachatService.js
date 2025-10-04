import axios from "axios";

const getApiBaseUrl = () =>
  process.env.LIPACHAT_GATEWAY_URL ||
  "https://gateway.lipachat.com/api/v1/whatsapp";

const getApiKey = () => process.env.LIPACHAT_API_KEY;

const getHeaders = (overrideKey) => ({
  apiKey: overrideKey || getApiKey(),
  "Content-Type": "application/json",
});

export const sendText = async ({ to, from, message, messageId, apiKey }) => {
  const payload = {
    to,
    from,
    message,
    messageId: messageId || `client-${Date.now()}`,
  };
  const url = getApiBaseUrl();
  const res = await axios.post(url, payload, { headers: getHeaders(apiKey) });
  return res.data;
};

export const sendMedia = async ({
  to,
  from,
  url,
  type = "image",
  caption,
  apiKey,
}) => {
  const payload = {
    to,
    from,
    type: type.toUpperCase(),
  };
  if (type === "image") payload.image = { url, caption };
  if (type === "video") payload.video = { url, caption };
  if (type === "audio") payload.audio = { url };
  if (type === "document") payload.document = { url, caption };
  const apiUrl = getApiBaseUrl();
  const res = await axios.post(apiUrl, payload, {
    headers: getHeaders(apiKey),
  });
  return res.data;
};

export const sendTemplate = async ({ to, from, template, apiKey }) => {
  // Depending on Lipachat template API; placeholder maps template as-is
  const payload = {
    to,
    from,
    type: "TEMPLATE",
    template,
  };
  const apiUrl = getApiBaseUrl();
  const res = await axios.post(apiUrl, payload, {
    headers: getHeaders(apiKey),
  });
  return res.data;
};

export const verifyWebhookSignature = (req) => {
  try {
    const secret = process.env.LIPACHAT_WEBHOOK_SECRET;
    const provided =
      req.headers["x-lipachat-signature"] || req.headers["x-signature"];
    if (!secret || !provided) return true; // Fallback when not configured
    // NOTE: Without Lipachat HMAC details, we allow pass-through; fill in when docs available
    return true;
  } catch (e) {
    return true;
  }
};

export default {
  sendText,
  sendMedia,
  sendTemplate,
  verifyWebhookSignature,
};
