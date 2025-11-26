import { EventEmitter } from "events";
import { storageService } from "./storageService";
import { io } from "socket.io-client";
import logoutManager from "./logoutManager";

// Determine API/WS host dynamically so dev can target remote VM
function resolvePreferredOrigin() {
  try {
    const useRemote = localStorage.getItem("useRemoteUrl") === "true";
    if (useRemote) return "https://cs.brhgroup.co/mayday-api";
  } catch (_) {}

  // In Electron, window.location.origin might be file://
  // So we need to check for that and use the correct URL
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    !window.location.origin.startsWith("file://")
  ) {
    // In production builds this will be the served origin
    if (process.env.NODE_ENV !== "development")
      return window.location.origin + "/mayday-api";
  }

  // Default per NODE_ENV when no preference stored
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8004"
    : "https://cs.brhgroup.co/mayday-api";
}

const preferredOrigin = resolvePreferredOrigin();

const baseUrl = `${preferredOrigin}/api`;

const wsBaseUrl = preferredOrigin
  .replace(/^http/, "ws")
  .replace("/mayday-api", "");

let wsClient = null; // deprecated raw WS (kept for safety)
let socket = null; // Socket.IO client
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
const eventEmitter = new EventEmitter();

const state = {
  extension: null,
  status: "NOT_READY",
  isRegistered: false,
};

const updateStatus = (status) => {
  Object.assign(state, status);
  eventEmitter.emit("status:update", state);
};

const registerExtension = (extension) => {
  if (!extension) return;
  state.extension = extension;
  eventEmitter.emit("register_extension", { extension });
};

const connect = async () => {
  // Block connections during centralized logout
  if (logoutManager.shouldBlockApiCalls()) {
    throw new Error("Logout in progress");
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  return new Promise((resolve, reject) => {
    try {
      // Use Socket.IO – matches backend expectations in server/services/socketService.js
      const url = wsBaseUrl; // e.g., ws://localhost:8004 or wss://cs.brhgroup.co
      // Connection log suppressed after stabilization

      // Clean up previous socket if any
      if (socket) {
        try {
          socket.removeAllListeners?.();
          socket.disconnect?.();
        } catch (_) {}
      }

      // Determine Socket.IO path based on environment
      const socketPath = import.meta.env.PROD
        ? "/mayday-api/socket.io/"
        : "/socket.io/";

      socket = io(url, {
        path: socketPath,
        transports: ["websocket"],
        // Most Socket.IO auth middlewares expect the raw token here (no Bearer)
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });

      socket.on("connect", () => {
        console.log("Agent Socket.IO connected", socket.id);
        reconnectAttempts = 0;

        // Register current extension room so server can emit targeted updates
        if (state.extension) {
          socket.emit("register_extension", { extension: state.extension });
        }
        resolve();
      });

      socket.on("connect_error", (error) => {
        console.error("Agent Socket.IO connect_error:", {
          message: error?.message || String(error),
          data: error?.data,
          description: error?.description,
        });
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => connect(), 2000);
        } else {
          reject(error);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("Agent Socket.IO disconnected:", reason);
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => connect(), 2000);
        }
      });

      // Server → client events
      socket.on("extension:status", (payload) => {
        eventEmitter.emit("extension:status", payload);
        eventEmitter.emit("statusChange", payload);
      });

      socket.on("agent:status", (payload) => {
        // Normalize to our local events
        eventEmitter.emit("status:update", payload);
        eventEmitter.emit("statusChange", payload);
      });
    } catch (error) {
      console.error("Error connecting to agent WebSocket:", error);
      reject(error);
    }
  });
};

const getAgentStatus = async () => {
  // Block calls during centralized logout
  if (logoutManager.shouldBlockApiCalls()) {
    return { success: false, data: [], message: "Blocked during logout" };
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    // Use the AMI endpoint to get all extension statuses
    const response = await fetch(`${baseUrl}/agent-status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log("response🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥", response);

    if (!response.ok) throw new Error("Failed to fetch extension statuses");

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch extension statuses");
    }

    // Transform AMI data to match the expected format
    const extensions = result.data || [];
    const agents = extensions.map((ext) => ({
      extension: ext.extension,
      username: ext.extension,
      status: ext.status || "Offline",
      isRegistered: ext.isRegistered || false,
      amiStatus: ext.amiStatus || "Offline",
      amiConnected: ext.amiStatus !== "Offline",
      lastSeen: ext.lastSeen || null,
      online: ext.online || false,
      contactUri: ext.contactUri || null,
      rawStatus: ext.rawStatus || null,
      expirationTime: ext.expirationTime || null,
    }));

    return {
      success: true,
      data: agents,
      message: "Extension statuses retrieved successfully",
    };
  } catch (error) {
    console.error("Error fetching extension statuses:", error);

    // Return a safe fallback
    return {
      success: false,
      data: [],
      message: "Failed to fetch extension statuses",
      error: error.message,
    };
  }
};

const getAgentDetailsByExtension = async (extension) => {
  // Centralized guard
  if (logoutManager.shouldBlockApiCalls()) {
    return {
      extension,
      username: "Unknown",
      status: "Offline",
      isRegistered: false,
      amiStatus: "Offline",
      amiConnected: false,
      lastSeen: null,
      online: false,
    };
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    // Use the correct agent status endpoint from slave-backend
    const response = await fetch(`${baseUrl}/agent-status/${extension}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log("response🚀🚀🚀🚀🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥", response);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Extension not found");
      }
      throw new Error("Failed to fetch extension status");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch extension status");
    }

    const agentData = result.data || {};

    // Transform agent data to match the expected format
    const data = {
      extension: agentData.extension || extension,
      username: agentData.username || agentData.extension || extension,
      status: agentData.status || "Offline",
      isRegistered:
        agentData.status === "registered" || agentData.status === "online",
      amiStatus: agentData.asteriskStatus || "Offline",
      amiConnected: agentData.asteriskStatus !== "Offline",
      lastSeen: agentData.lastSeen || null,
      online: agentData.status === "online",
      contactUri: agentData.contactUri || null,
      rawStatus: agentData.rawStatus || null,
      expirationTime: agentData.expirationTime || null,
    };

    return data;
  } catch (error) {
    console.error("Error fetching extension status:", error);

    // Return a safe fallback object
    return {
      extension,
      username: extension,
      status: "Offline",
      isRegistered: false,
      amiStatus: "Offline",
      amiConnected: false,
      lastSeen: null,
      online: false,
      contactUri: null,
      rawStatus: null,
      expirationTime: null,
    };
  }
};

const broadcastLocalAvailability = (extension, status = "Offline") => {
  try {
    if (!extension) return;
    eventEmitter.emit("extension:status", {
      extension: String(extension),
      status,
    });
    eventEmitter.emit("statusChange", { extension: String(extension), status });
  } catch (e) {
    console.warn("agentService.broadcastLocalAvailability failed:", e);
  }
};

const logout = async (sipTerminateFunction = null) => {
  console.log("=== AGENT SERVICE LOGOUT STARTED ===");

  try {
    const token = storageService.getAuthToken();
    console.log("Agent logout - token present:", !!token);

    // Step 1: Close WebSocket connection first
    try {
      if (socket) {
        console.log("Closing Agent Socket.IO connection...");
        socket.removeAllListeners?.();
        socket.disconnect?.();
        socket = null;
        console.log("Agent Socket.IO connection closed");
      }
      if (wsClient) {
        wsClient.close?.();
        wsClient = null;
      }
    } catch (wsError) {
      console.warn("Error closing agent socket:", wsError);
    }

    // Step 2: Attempt server logout with timeout
    if (token) {
      console.log("Attempting server logout...");
      try {
        const logoutPromise = fetch(`${baseUrl}/users/agent-logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Server logout timeout")), 3000)
        );

        const response = await Promise.race([logoutPromise, timeoutPromise]);

        if (response.ok) {
          console.log("Server logout successful");
        } else {
          console.warn("Server logout failed with status:", response.status);
        }
      } catch (serverError) {
        console.warn("Server logout failed:", serverError.message);
      }
    } else {
      console.log("No token found, skipping server logout");
    }

    // Step 3: Clear local state (but first broadcast local Offline to UI)
    console.log("Clearing local state...");
    try {
      broadcastLocalAvailability(state.extension, "Offline");
    } catch (_) {}
    state.extension = null;
    state.status = "NOT_READY";
    state.isRegistered = false;
    reconnectAttempts = 0;

    // Step 4: Clear any stored data
    try {
      localStorage.removeItem("agentState");
      sessionStorage.removeItem("agentState");
    } catch (storageError) {
      console.warn("Error clearing storage:", storageError);
    }

    console.log("=== AGENT SERVICE LOGOUT COMPLETED ===");
    return true;
  } catch (error) {
    console.error("Agent service logout failed:", error);
    // Still clear local state even if there's an error
    state.extension = null;
    state.status = "NOT_READY";
    state.isRegistered = false;
    reconnectAttempts = 0;
    throw error;
  }
};

// Register with centralized logout manager for automatic cleanup
logoutManager.registerService("AgentService", async () => {
  try {
    await logout();
  } catch (_) {}
});

export const agentService = {
  connect,
  logout,
  getAgentStatus,
  getAgentDetailsByExtension,
  // Fetch all agents from backend (used to include offline extensions)
  getAllAgents: async () => {
    if (logoutManager.shouldBlockApiCalls()) {
      return [];
    }
    const token = storageService.getAuthToken();
    if (!token) return [];
    try {
      const res = await fetch(`${baseUrl}/users/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      return list
        .map((u) => ({
          extension: String(
            u.extension || u.pjsipExtension || u.username || ""
          ),
          name: u.fullName || u.username || String(u.extension || ""),
        }))
        .filter((a) => a.extension);
    } catch (_) {
      return [];
    }
  },
  updateStatus,
  registerExtension,
  broadcastLocalAvailability,

  // Get current extension status from AMI
  getCurrentExtensionStatus: async () => {
    if (!state.extension) {
      return {
        extension: null,
        status: "NOT_READY",
        isRegistered: false,
        online: false,
      };
    }

    try {
      return await getAgentDetailsByExtension(state.extension);
    } catch (error) {
      console.warn("Failed to get current extension status:", error.message);
      return {
        extension: state.extension,
        status: "Offline",
        isRegistered: false,
        online: false,
      };
    }
  },

  on: eventEmitter.on.bind(eventEmitter),
  off: eventEmitter.off.bind(eventEmitter),
  emit: eventEmitter.emit.bind(eventEmitter),
  state,
};

export default agentService;
