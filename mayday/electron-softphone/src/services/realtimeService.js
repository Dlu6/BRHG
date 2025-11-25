import io from "socket.io-client";
import { storageService } from "./storageService";

// Determine the Socket.IO URL based on environment
const getSocketUrl = () => {
  if (process.env.SOCKET_URL) {
    return process.env.SOCKET_URL;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8004";
  }

  // In production or Electron, use the production URL
  return "https://cs.brhgroup.co";
};

// Determine Socket.IO path based on environment
const socketPath = import.meta.env.PROD
  ? "/mayday-api/socket.io/"
  : "/socket.io/";

const socket = io(getSocketUrl(), {
  path: socketPath,
  auth: {
    token: storageService.getToken(),
  },
});

const listeners = new Map();
const endpointSubscriptions = new Map();

const setupSocketListeners = () => {
  socket.on("connect", () => {
    console.log("Connected to realtime service");
  });

  socket.on("endpoint_status", (data) => {
    notifyListeners("status", data);
    handleEndpointEvent(data);
  });

  socket.on("call_event", (data) => {
    notifyListeners("call", data);
  });

  socket.on("endpoint_event", (data) => {
    handleEndpointEvent(data);
  });
};

const notifyListeners = (event, data) => {
  const eventListeners = listeners.get(event);
  if (eventListeners) {
    eventListeners.forEach((listener) => listener(data));
  }
};

const subscribe = (event, callback) => {
  if (!listeners.has(event)) {
    listeners.set(event, []);
  }
  listeners.get(event).push(callback);

  return () => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  };
};

const subscribeToEndpoint = (extension, callback) => {
  if (!endpointSubscriptions.has(extension)) {
    endpointSubscriptions.set(extension, []);

    socket.emit("subscribe_endpoint", { extension });
  }

  endpointSubscriptions.get(extension).push(callback);

  socket.on(`endpoint_${extension}`, (data) => {
    const callbacks = endpointSubscriptions.get(extension);
    callbacks.forEach((cb) => cb(data));
  });

  return () => {
    const callbacks = endpointSubscriptions.get(extension);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      if (callbacks.length === 0) {
        endpointSubscriptions.delete(extension);
        socket.emit("unsubscribe_endpoint", { extension });
      }
    }
  };
};

const handleEndpointEvent = (data) => {
  const { extension } = data;
  const callbacks = endpointSubscriptions.get(extension);
  callbacks.forEach((callback) => callback(data));
};

const updateEndpointStatus = (extension, status) => {
  socket.emit("update_status", { extension, status });
};

const disconnect = () => {
  socket.disconnect();
  listeners.clear();
};

setupSocketListeners();

export const realtimeService = {
  subscribe,
  subscribeToEndpoint,
  updateEndpointStatus,
  disconnect,
};
