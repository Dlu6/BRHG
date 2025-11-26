// Configuration utility for Chrome Softphone Extension
// This file manages all environment variables and API endpoints

const getEnvironmentConfig = async () => {
  // In Chrome extensions, we need to use chrome.storage or manifest to get environment variables
  // For now, we'll use a configuration object that can be updated based on environment

  // Check if window exists (service workers don't have window object)
  const hasWindow = typeof window !== "undefined";
  const currentOrigin = hasWindow
    ? `${window.location.protocol}//${window.location.host}`
    : null;

  // Environment detection - check if we're actually in a development environment
  const isDevelopment =
    (typeof process !== "undefined" &&
      process.env &&
      process.env.NODE_ENV === "development") ||
    (hasWindow &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.includes("localhost")));

  // Try to get stored host URL and api base path from chrome.storage
  let storedHostUrl = null;
  let storedApiBasePath = null;
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(["hostUrl", "apiBasePath"]);
      storedHostUrl = result.hostUrl;
      storedApiBasePath = result.apiBasePath;
    }
  } catch (error) {
    console.warn("[Config] Could not retrieve stored host URL:", error);
  }

  // Normalize api base path with tenant-aware default
  const originHost = hasWindow ? window.location.hostname : null;
  const defaultApiPath =
    originHost && /(^|\.)hugamara\.com$/i.test(originHost)
      ? "/mayday-api"
      : "/api";
  const apiPathRaw = storedApiBasePath || defaultApiPath;
  const apiPath = `/${String(apiPathRaw)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")}`;

  const baseConfig = {
    // Development configuration
    development: {
      SLAVE_SERVER_URL: storedHostUrl || "http://localhost:8004",
      SLAVE_SERVER_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}`
        : "http://localhost:8004/api",
      MASTER_SERVER_URL: "http://localhost:8001",
      MASTER_SERVER_API_URL: "http://localhost:8001/api",
      SLAVE_WEBSOCKET_URL: storedHostUrl
        ? storedHostUrl.replace(/^https?/, "ws")
        : "ws://localhost:8004",
      MASTER_WEBSOCKET_URL: "ws://localhost:8001",
      LICENSE_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/licenses`
        : "http://localhost:8004/api/licenses",
      LICENSE_SESSION_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/licenses/sessions`
        : "http://localhost:8004/api/licenses/sessions",
      USER_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/users`
        : "http://localhost:8004/api/users",
      CDR_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/cdr`
        : "http://localhost:8004/api/cdr",
      SYSTEM_HEALTH_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/users/system/health`
        : "http://localhost:8004/api/users/system/health",
    },

    // Production configuration
    production: {
      SLAVE_SERVER_URL:
        storedHostUrl ||
        currentOrigin ||
        (typeof process !== "undefined" &&
          process.env &&
          process.env.SLAVE_SERVER_URL) ||
        "https://cs.hugamara.com" ||
        "https://cs.brhg.co" ||
        "https://cs.morvenconsults.com",
      SLAVE_SERVER_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}`
        : currentOrigin
        ? `${currentOrigin}${apiPath}`
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.SLAVE_SERVER_API_URL) ||
          "https://cs.hugamara.com/api" ||
          "https://cs.brhg.co/api",
      MASTER_SERVER_URL:
        (typeof process !== "undefined" &&
          process.env &&
          process.env.MASTER_SERVER_URL) ||
        "https://mayday-website-backend-c2abb923fa80.herokuapp.com",
      MASTER_SERVER_API_URL:
        (typeof process !== "undefined" &&
          process.env &&
          process.env.MASTER_SERVER_API_URL) ||
        "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api",
      SLAVE_WEBSOCKET_URL: storedHostUrl
        ? storedHostUrl.replace(/^https?/, "wss")
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.SLAVE_WEBSOCKET_URL) ||
          "wss://cs.morvenconsults.com",
      MASTER_WEBSOCKET_URL:
        (typeof process !== "undefined" &&
          process.env &&
          process.env.MASTER_WEBSOCKET_URL) ||
        "wss://mayday-website-backend-c2abb923fa80.herokuapp.com",
      LICENSE_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/licenses`
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.LICENSE_API_URL) ||
          "https://cs.morvenconsults.com/api/licenses",
      LICENSE_SESSION_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/licenses/sessions`
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.LICENSE_SESSION_API_URL) ||
          "https://cs.morvenconsults.com/api/licenses/sessions",
      USER_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/users`
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.USER_API_URL) ||
          "https://cs.morvenconsults.com/api/users",
      CDR_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/cdr`
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.CDR_API_URL) ||
          "https://cs.morvenconsults.com/api/cdr",
      SYSTEM_HEALTH_API_URL: storedHostUrl
        ? `${storedHostUrl}${apiPath}/users/system/health`
        : (typeof process !== "undefined" &&
            process.env &&
            process.env.SYSTEM_HEALTH_API_URL) ||
          "https://cs.morvenconsults.com/api/users/system/health",
    },
  };

  return baseConfig[isDevelopment ? "development" : "production"];
};

// Default configuration (fallback)
const defaultConfig = {
  SLAVE_SERVER_URL: "https://cs.hugamara.com",
  SLAVE_SERVER_API_URL: "https://cs.hugamara.com/api",
  MASTER_SERVER_URL:
    "https://mayday-website-backend-c2abb923fa80.herokuapp.com",
  MASTER_SERVER_API_URL:
    "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api",
  SLAVE_WEBSOCKET_URL: "wss://cs.morvenconsults.com",
  MASTER_WEBSOCKET_URL:
    "wss://mayday-website-backend-c2abb923fa80.herokuapp.com",
  LICENSE_API_URL: "https://cs.morvenconsults.com/api/licenses",
  LICENSE_SESSION_API_URL:
    "https://cs.morvenconsults.com/api/licenses/sessions",
  USER_API_URL: "https://cs.morvenconsults.com/api/users",
  CDR_API_URL: "https://cs.morvenconsults.com/api/cdr",
  SYSTEM_HEALTH_API_URL:
    "https://cs.morvenconsults.com/api/users/system/health",
};

// Helper functions for common API endpoints
const getApiEndpoint = (endpoint, config = defaultConfig) => {
  return `${config.SLAVE_SERVER_API_URL}${endpoint}`;
};

const getMasterApiEndpoint = (endpoint, config = defaultConfig) => {
  return `${config.MASTER_SERVER_API_URL}${endpoint}`;
};

// Export configuration and helper functions
export default {
  ...defaultConfig,
  getApiEndpoint,
  getMasterApiEndpoint,
  getEnvironmentConfig, // Export the async function for dynamic config

  // Dynamic endpoint getters that use the stored host URL
  async getDynamicEndpoints() {
    const config = await this.getEnvironmentConfig();

    return {
      // License management
      license: {
        current: `${config.LICENSE_API_URL}/current`,
        sessions: {
          atomicSetup: `${config.LICENSE_SESSION_API_URL}/atomic-setup`,
          validate: `${config.LICENSE_SESSION_API_URL}/validate`,
          create: `${config.LICENSE_SESSION_API_URL}/create`,
          end: `${config.LICENSE_SESSION_API_URL}/end`,
          count: `${config.LICENSE_SESSION_API_URL}/count`,
        },
      },

      // User management
      users: {
        login: `${config.USER_API_URL}/agent-login`,
        pause: `${config.USER_API_URL}/pause`,
        unpause: `${config.USER_API_URL}/unpause`,
        pauseStatus: `${config.USER_API_URL}/pause-status`,
        systemHealth: config.SYSTEM_HEALTH_API_URL,
      },

      // Call history
      cdr: {
        callHistory: `${config.CDR_API_URL}/call-history`,
        counts: `${config.CDR_API_URL}/counts`,
      },
    };
  },

  // Common API endpoints (fallback to default)
  endpoints: {
    // License management
    license: {
      current: `${defaultConfig.LICENSE_API_URL}/current`,
      sessions: {
        atomicSetup: `${defaultConfig.LICENSE_SESSION_API_URL}/atomic-setup`,
        validate: `${defaultConfig.LICENSE_SESSION_API_URL}/validate`,
        create: `${defaultConfig.LICENSE_SESSION_API_URL}/create`,
        end: `${defaultConfig.LICENSE_SESSION_API_URL}/end`,
        count: `${defaultConfig.LICENSE_SESSION_API_URL}/count`,
      },
    },

    // User management
    users: {
      login: `${defaultConfig.USER_API_URL}/agent-login`,
      pause: `${defaultConfig.USER_API_URL}/pause`,
      unpause: `${defaultConfig.USER_API_URL}/unpause`,
      pauseStatus: `${defaultConfig.USER_API_URL}/pause-status`,
      systemHealth: defaultConfig.SYSTEM_HEALTH_API_URL,
    },

    // Call history
    cdr: {
      callHistory: `${defaultConfig.CDR_API_URL}/call-history`,
      counts: `${defaultConfig.CDR_API_URL}/counts`,
    },
  },
};
