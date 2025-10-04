// Centralized API Interceptor Service (function-based)
// Provides unified handling for API calls with logout guards
// All services can use these helpers instead of implementing their own logic

import logoutManager from "./logoutManager";

let isInitialized = false;
let originalFetch = null;
let originalXHROpen = null;
let originalXHRSend = null;
let originalAxiosRequest = null;
let originalAxiosResponse = null;

// Create a blocked response for fetch
const createBlockedResponse = () =>
  Promise.resolve({
    ok: false,
    status: 0,
    statusText: "Blocked during logout",
    json: async () => ({
      success: false,
      data: null,
      message: "Service unavailable during logout",
      blocked: true,
    }),
    text: async () => "Service unavailable during logout",
    headers: new Headers(),
    blocked: true,
  });

const shouldAllowApiCall = () => !logoutManager.shouldBlockApiCalls();

const setupFetchInterceptor = () => {
  if (originalFetch) return; // already set
  // Bind original fetch to avoid Illegal invocation
  originalFetch = window.fetch.bind(window);
  const boundOriginalFetch = originalFetch;

  window.fetch = async (...args) => {
    if (logoutManager.shouldBlockApiCalls()) {
      console.log("🔒 Fetch blocked during logout:", args[0]);
      return createBlockedResponse();
    }
    try {
      return await boundOriginalFetch(...args);
    } catch (error) {
      if (logoutManager.shouldBlockApiCalls()) {
        console.log("🔒 Fetch error during logout:", error.message);
        return createBlockedResponse();
      }
      throw error;
    }
  };
};

const setupXHRInterceptor = () => {
  if (originalXHROpen || originalXHRSend) return; // already set

  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (logoutManager.shouldBlockApiCalls()) {
      console.log("🔒 XHR open blocked during logout:", url);
      this._blocked = true;
      return;
    }
    return originalXHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (data) {
    if (this._blocked) {
      console.log("🔒 XHR send blocked during logout");
      setTimeout(() => {
        if (this.onreadystatechange) {
          this.readyState = 4;
          this.status = 0;
          this.statusText = "Blocked during logout";
          this.responseText = "Service unavailable during logout";
          this.response = "Service unavailable during logout";
          this.onreadystatechange();
        }
      }, 10);
      return;
    }
    return originalXHRSend.call(this, data);
  };
};

const setupAxiosInterceptor = () => {
  if (typeof window === "undefined") return;
  if (originalAxiosRequest || originalAxiosResponse) return; // already set

  // Axios might not be available globally; skip gracefully
  if (!window.axios || !window.axios.interceptors) return;

  originalAxiosRequest = window.axios.interceptors.request;
  originalAxiosResponse = window.axios.interceptors.response;

  window.axios.interceptors.request.use(
    (config) => {
      if (logoutManager.shouldBlockApiCalls()) {
        console.log("🔒 Axios request blocked during logout:", config.url);
        return Promise.reject(new Error("API call blocked during logout"));
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (logoutManager.shouldBlockApiCalls()) {
        console.log("🔒 Axios response error during logout:", error.message);
        return Promise.reject(new Error("API call failed due to logout"));
      }
      return Promise.reject(error);
    }
  );

  console.log("✅ Axios interceptor setup complete");
};

const setupInterceptors = () => {
  if (isInitialized) {
    console.warn("⚠️ API interceptor already initialized");
    return;
  }
  setupFetchInterceptor();
  setupXHRInterceptor();
  setupAxiosInterceptor();
  isInitialized = true;
  console.log("✅ API interceptor initialized successfully");
};

const restore = () => {
  try {
    if (originalFetch) {
      window.fetch = originalFetch;
      originalFetch = null;
    }
    if (originalXHROpen) {
      XMLHttpRequest.prototype.open = originalXHROpen;
      originalXHROpen = null;
    }
    if (originalXHRSend) {
      XMLHttpRequest.prototype.send = originalXHRSend;
      originalXHRSend = null;
    }
    if (originalAxiosRequest && window.axios) {
      window.axios.interceptors.request.clear();
      originalAxiosRequest = null;
    }
    if (originalAxiosResponse && window.axios) {
      window.axios.interceptors.response.clear();
      originalAxiosResponse = null;
    }
    isInitialized = false;
    console.log("✅ API interceptor restored to original state");
  } catch (error) {
    console.error("❌ Failed to restore API interceptor:", error);
  }
};

const safeApiCall = (apiFunction, ...args) => {
  if (!shouldAllowApiCall()) {
    console.log("🔒 API call blocked during logout");
    throw new Error("API call blocked during logout");
  }
  return apiFunction(...args);
};

const safeAsyncApiCall = async (apiFunction, ...args) => {
  if (!shouldAllowApiCall()) {
    console.log("🔒 Async API call blocked during logout");
    throw new Error("API call blocked during logout");
  }
  try {
    return await apiFunction(...args);
  } catch (error) {
    if (logoutManager.shouldBlockApiCalls()) {
      console.log("🔒 Async API call failed due to logout");
      throw new Error("API call failed due to logout");
    }
    throw error;
  }
};

const getStatus = () => ({
  isInitialized,
  shouldBlockApiCalls: shouldAllowApiCall(),
  logoutManagerStatus: logoutManager.getStatus(),
});

// Initialize only in production to avoid noisy stack traces during development
try {
  const env =
    (typeof process !== "undefined" && process.env && process.env.NODE_ENV) ||
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE);
  if (env === "production") {
    setupInterceptors();
  }
} catch (e) {
  // If env detection fails, do not initialize automatically
}

const apiInterceptor = {
  setupInterceptors,
  restore,
  getStatus,
  safeApiCall,
  safeAsyncApiCall,
};

export default apiInterceptor;
