// services/callHistoryService.js
import axios from "axios";
import io from "socket.io-client";
import {
  getAuthToken,
  getUserData,
  canInitializeServices,
} from "./storageService";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8004"
    : "https://cs.brhgroup.co/mayday-api";

console.log("API_URL in callHistoryService.js>>>>>:", API_URL);

const API = axios.create({ baseURL: API_URL });

API.interceptors.request.use(
  async (config) => {
    // Check if API calls are blocked during logout
    if (window.apiCallsBlocked) {
      const cancelError = new axios.CancelToken.source();
      cancelError.cancel("API calls blocked during logout");
      config.cancelToken = cancelError.token;
      return config;
    }

    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Fetch Call History
const getCallHistory = async (
  limit = 20,
  lastTimestamp = null,
  specificExtension = null
) => {
  // Check if services can be initialized (has token and not logging out)
  if (!canInitializeServices()) {
    console.log(
      "Cannot fetch call history - no auth token or logout in progress"
    );
    return { success: false, data: [], error: "Authentication required" };
  }

  try {
    const params = { limit };
    const userData = await getUserData();

    // More robust extension extraction with fallbacks and logging
    let extension = specificExtension;

    if (!extension && userData) {
      // Try to get extension directly from userData
      extension = userData.extension;

      // If not found, try to get from user object
      if (!extension && userData.user) {
        extension = userData.user.extension;
      }
    }

    // Ensure extension is never undefined - use empty string as fallback
    params.extension = extension || "";

    // console.log("Using extension for call history:", params.extension);

    if (lastTimestamp) params.lastTimestamp = lastTimestamp;

    const response = await API.get("/api/cdr/call-history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching call history:", error);
    throw error;
  }
};

const getCallDetails = async (callId) => {
  // Check if services can be initialized (has token and not logging out)
  if (!canInitializeServices()) {
    console.log(
      "Cannot fetch call details - no auth token or logout in progress"
    );
    return { success: false, data: null, error: "Authentication required" };
  }

  try {
    const response = await API.get(`/api/cdr/call-details/${callId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching call details:", error);
    throw error;
  }
};

const getCallCountsByExtension = async (
  extension,
  startDate = null,
  endDate = null
) => {
  // GRACEFUL: Check if API calls are blocked during logout
  if (window.apiCallsBlocked) {
    console.log(
      "🔒 Call counts API call gracefully skipped during logout for extension:",
      extension
    );
    return {
      success: true,
      data: {
        answeredCalls: 0,
        missedCalls: 0,
        outboundCalls: 0,
        inboundCalls: 0,
        totalCalls: 0,
        avgCallDuration: 0,
        extension: extension,
      },
      message: "Service unavailable during logout",
    };
  }

  // Check if services can be initialized (has token and not logging out)
  if (!canInitializeServices()) {
    console.log(
      "Cannot fetch call counts - no auth token or logout in progress"
    );
    return { success: false, data: null, error: "Authentication required" };
  }

  const params = { extension };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  try {
    const response = await API.get("/api/cdr/counts", { params });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching call counts for extension ${extension}:`,
      error
    );
    throw error;
  }
};

const setupRealtimeUpdates = (callback) => {
  // Check if services can be initialized (has token and not logging out)
  if (!canInitializeServices()) {
    console.log(
      "Cannot setup realtime updates - no auth token or logout in progress"
    );
    return null;
  }

  // Determine Socket.IO path based on environment
  const socketPath = import.meta.env.PROD
    ? "/mayday-api/socket.io/"
    : "/socket.io/";

  // Extract base URL without /mayday-api path for Socket.IO
  const socketUrl = API_URL.replace("/mayday-api", "");

  const socket = io(socketUrl, {
    path: socketPath,
    transports: ["websocket"],
    auth: { token: getAuthToken() },
  });

  socket.on("connect", () => console.log("Socket connected"));
  socket.on("disconnect", () => console.log("Socket disconnected"));
  socket.on("cdr-update", (data) => callback && callback(data));
  socket.on("connect_error", (err) =>
    console.error("Socket connection error:", err)
  );

  return socket;
};

export default {
  getCallHistory,
  getCallDetails,
  setupRealtimeUpdates,
  getCallCountsByExtension,
};
