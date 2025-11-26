// services/authInterceptor.js
import axios from "axios";
import { getAuthToken, setAuthToken, getRefreshToken, setRefreshToken, clear } from "./storageService";
import authApi from "./api/authApi";

let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh completion
 * @param {function} callback - Callback to execute with new token
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers of token refresh completion
 * @param {string} token - New access token
 */
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * Setup axios interceptors for automatic token refresh
 * @param {object} axiosInstance - Axios instance to add interceptors to (optional, defaults to axios)
 */
export const setupAuthInterceptor = (axiosInstance = axios) => {
  // Request interceptor - Add auth token to requests
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle 401/403 errors and refresh token
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Check if error is 401/403 and not already retried
      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !originalRequest._retry
      ) {
        const errorData = error.response?.data;

        // Check if it's a token expiration error
        if (
          errorData?.errorType === "TokenExpiredError" ||
          errorData?.message?.includes("Token has expired") ||
          errorData?.error?.includes("Token has expired")
        ) {
          console.log("🔄 [AuthInterceptor] Token expired, attempting refresh");

          if (isRefreshing) {
            // If already refreshing, wait for it to complete
            console.log("⏳ [AuthInterceptor] Waiting for ongoing token refresh");
            return new Promise((resolve) => {
              subscribeTokenRefresh((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                originalRequest._retry = true;
                resolve(axiosInstance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
              console.error("❌ [AuthInterceptor] No refresh token available");
              throw new Error("NO_REFRESH_TOKEN");
            }

            // Attempt token refresh
            console.log("🔄 [AuthInterceptor] Refreshing token");
            const result = await authApi.refreshToken(refreshToken);

            // Update stored tokens
            setAuthToken(result.token);
            setRefreshToken(result.refreshToken);

            console.log("✅ [AuthInterceptor] Token refreshed successfully");

            // Update original request with new token
            originalRequest.headers.Authorization = `Bearer ${result.token}`;

            // Notify all waiting requests
            onTokenRefreshed(result.token);

            isRefreshing = false;

            // Retry original request
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error("❌ [AuthInterceptor] Token refresh failed:", refreshError);
            isRefreshing = false;
            refreshSubscribers = [];

            // Check if refresh token expired
            if (refreshError.message === "REFRESH_TOKEN_EXPIRED") {
              console.error("❌ [AuthInterceptor] Refresh token expired - session invalid");

              // Clear auth and redirect to login
              clear();

              // Emit custom event for session expiry
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("session:expired", {
                    detail: { reason: "Refresh token expired" },
                  })
                );
              }

              // Redirect to login
              setTimeout(() => {
                window.location.href = "/";
              }, 500);
            }

            return Promise.reject(refreshError);
          }
        }
      }

      return Promise.reject(error);
    }
  );

  console.log("✅ [AuthInterceptor] Auth interceptor setup complete");
};

/**
 * Remove auth interceptors
 * @param {object} axiosInstance - Axios instance to remove interceptors from
 */
export const removeAuthInterceptor = (axiosInstance = axios) => {
  // Note: This is a simplified version. In production, you'd want to store
  // interceptor IDs and eject them specifically
  console.log("🧹 [AuthInterceptor] Removing auth interceptors");
};

export default {
  setupAuthInterceptor,
  removeAuthInterceptor,
};

