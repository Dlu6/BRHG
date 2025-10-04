//services/websocketService.js
import { io } from "socket.io-client";

let socket = null;
let heartbeatIntervalId = null;

const isDevelopment = window.location.hostname === "localhost";

export const connectWebSocket = () => {
  if (!socket) {
    const token = localStorage.getItem("token");
    const actualToken = token?.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    if (!token) {
      console.error("No authentication token found");
      localStorage.clear();
      window.location.href = "/login";
      return null;
    }
    const host = window.location.hostname;
    const port = isDevelopment ? ":8004" : "";
    const socketUrl = process.env.REACT_APP_SLAVE_WEBSOCKET_URL
      ? process.env.REACT_APP_SLAVE_WEBSOCKET_URL
      : `${window.location.protocol}//${host}${port}`;

    console.log("[WebSocket] Connecting to:", socketUrl);

    socket = io(socketUrl, {
      path: "/socket.io/",
      transports: ["websocket"],
      secure: window.location.protocol === "https:",
      rejectUnauthorized: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      auth: {
        token: actualToken,
      },
      extraHeaders: {
        Authorization: `Bearer ${actualToken}`,
      },
    });

    // Enhanced error handling and logging
    socket.on("connect", () => {
      console.log("[WebSocket] Connected successfully");
      // Resubscribe to any necessary rooms/events
      const extension = localStorage.getItem("extension");
      if (extension) {
        socket.emit("authenticate", { extension });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error.message);

      // Handle authentication errors
      if (error.message.includes("TOKEN") || error.message.includes("auth")) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      // Log detailed error information
      console.error("[WebSocket] Full error details:", {
        message: error.message,
        type: error.type,
        description: error.description,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);

      if (reason === "io server disconnect" || reason === "transport close") {
        setTimeout(() => {
          console.log("[WebSocket] Attempting reconnection...");
          socket.connect();
        }, 2000);
      }
    });

    // Add heartbeat mechanism (guard when socket becomes null)
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    heartbeatIntervalId = setInterval(() => {
      if (socket?.connected) {
        socket.emit("ping");
      }
    }, 30000);

    socket.on("pong", () => {
      console.debug("[WebSocket] Heartbeat received");
    });
  }
  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    return connectWebSocket();
  }
  return socket;
};

export const reconnectWebSocket = () => {
  disconnectWebSocket();
  return connectWebSocket();
};

const websocketService = {
  connectWebSocket,
  disconnectWebSocket,
  getSocket,
  reconnectWebSocket,
};

export default websocketService;
