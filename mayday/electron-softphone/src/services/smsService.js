// services/smsService.js
import { storageService } from "./storageService";

function resolvePreferredOrigin() {
  try {
    const useRemote = localStorage.getItem("useRemoteUrl") === "true";
    if (useRemote) return "https://cs.backspace.ug/mayday-api";
  } catch (_) {}

  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    !window.location.origin.startsWith("file://")
  ) {
    if (process.env.NODE_ENV !== "development")
      return window.location.origin + "/mayday-api";
  }
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8004"
    : "https://cs.backspace.ug/mayday-api";
}

const baseUrl = `${resolvePreferredOrigin()}/api/sms`;

async function request(path, options = {}) {
  const token = storageService.getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const smsService = {
  async send({ to, content, from, dlr = "yes" }) {
    return request(`/send`, {
      method: "POST",
      body: JSON.stringify({ to, content, from, dlr }),
    });
  },

  async balance() {
    return request(`/balance`, { method: "GET" });
  },

  async providers() {
    return request(`/providers`, { method: "GET" });
  },

  async getConversations() {
    return request(`/conversations`, { method: "GET" });
  },

  async getMessages(phoneNumber) {
    return request(`/conversations/${phoneNumber}`, { method: "GET" });
  },
};

export default smsService;
