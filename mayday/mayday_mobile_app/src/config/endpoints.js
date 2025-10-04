import { Platform } from "react-native";
import Constants from "expo-constants";

const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};

let currentBaseUrl;

function computeDefaultBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL || extra.API_BASE_URL;
  if (explicit) return explicit; // honor explicit config

  // Local development defaults only (no production host hard-coding)
  if (Platform.OS === "android") {
    // Android emulator maps host loopback to 10.0.2.2
    return "http://10.0.2.2:8004/api";
  }
  // iOS simulator/mac
  return "http://127.0.0.1:8004/api";
}

currentBaseUrl = computeDefaultBaseUrl();

export const setApiBaseUrl = (url) => {
  if (typeof url === "string" && url.trim()) {
    currentBaseUrl = url.trim();
  }
};

export const getApiBaseUrl = () => currentBaseUrl;

// Normalize a user-provided base URL (ensure protocol, strip trailing slash)
export const normalizeApiBaseUrl = (url) => {
  if (typeof url !== "string") return currentBaseUrl;
  let u = url.trim();
  if (!u) return currentBaseUrl;
  // Add protocol if missing
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  // Remove trailing slash (but keep path like /api or /mayday-api)
  u = u.replace(/\/$/, "");
  // Ensure it ends with /api since backend is mounted under /api
  if (!/\/(api)$/i.test(u)) {
    u = `${u}/api`;
  }
  return u;
};

export const ENDPOINTS = {
  get BASE_URL() {
    return currentBaseUrl;
  },
  LOGIN: "/users/agent-login",
  LICENSE_CURRENT: "/licenses/current",
  CREATE_SESSION: "/licenses/create-session",
  END_SESSION: "/licenses/end-session",
};
