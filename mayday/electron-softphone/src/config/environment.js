// Environment configuration for Electron app
// This file provides centralized URL configuration to avoid file:// protocol issues

const isDevelopment =
  process.env.NODE_ENV === "development" ||
  (typeof import.meta !== "undefined" &&
    import.meta.env?.MODE === "development");

const isElectron =
  typeof window !== "undefined" && window.location?.protocol === "file:";

const config = {
  // API Base URL - Call Center Backend (Port 5001)
  apiUrl: isDevelopment
    ? "http://localhost:8004"
    : import.meta?.env?.VITE_API_URL || "https://cs.backspace.ug/mayday-api",

  // Socket.IO URL - Call Center Backend (Port 5001)
  socketUrl: isDevelopment
    ? "http://localhost:8004"
    : import.meta?.env?.VITE_SOCKET_URL || "https://cs.backspace.ug/mayday-api",

  // WebSocket URL for SIP - Asterisk (Port 8088)
  wsUrl: isDevelopment
    ? "ws://localhost:8088/ws"
    : import.meta?.env?.VITE_WS_URL || "wss://cs.backspace.ug/ws",

  // Environment flags
  isDevelopment,
  isProduction: !isDevelopment,
  isElectron,

  // Helper function to get full API URL
  getApiUrl: (path = "") => {
    const baseUrl = config.apiUrl;
    return path ? `${baseUrl}${path}` : baseUrl;
  },

  // Helper function to ensure we never use file:// URLs
  getSafeOrigin: () => {
    if (
      isElectron ||
      (typeof window !== "undefined" &&
        window.location?.origin?.startsWith("file://"))
    ) {
      return config.apiUrl;
    }
    return window.location?.origin || config.apiUrl;
  },
};

export default config;
