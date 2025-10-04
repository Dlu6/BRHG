import { useEffect, useRef, useState, useCallback } from "react";
import websocketService from "../services/websocketService";

export const useWebSocket = () => {
  const [status, setStatus] = useState(websocketService.getStatus());
  const [healthScore, setHealthScore] = useState(
    websocketService.getHealthScore()
  );
  const [isConnected, setIsConnected] = useState(websocketService.isConnected);
  const [isReconnecting, setIsReconnecting] = useState(
    websocketService.isReconnecting
  );
  const [lastError, setLastError] = useState(null);

  const eventHandlers = useRef(new Map());
  const isInitialized = useRef(false);

  // Initialize WebSocket service
  const initialize = useCallback(async () => {
    if (isInitialized.current) return;

    try {
      // Set up event listeners
      setupEventListeners();

      // Attempt initial connection
      const connected = await websocketService.connect();
      if (connected) {
        // connected
      }

      isInitialized.current = true;
    } catch (error) {
      setLastError(error.message);
    }
  }, []);

  // Set up event listeners
  const setupEventListeners = useCallback(() => {
    const events = [
      "connection:connected",
      "connection:disconnected",
      "connection:failed",
      "connection:reconnecting",
      "connection:reconnected",
      "connection:max_attempts_reached",
      "connection:auth_required",
      "connection:auth_failed",
      "connection:health_degraded",
      "connection:health_check",
      "message",
    ];

    events.forEach((eventType) => {
      const handler = (data) => {
        // Update local state based on event
        switch (eventType) {
          case "connection:connected":
            setIsConnected(true);
            setIsReconnecting(false);
            setLastError(null);
            break;

          case "connection:disconnected":
            setIsConnected(false);
            setIsReconnecting(false);
            break;

          case "connection:reconnecting":
            setIsReconnecting(true);
            break;

          case "connection:reconnected":
            setIsConnected(true);
            setIsReconnecting(false);
            setLastError(null);
            break;

          case "connection:failed":
          case "connection:auth_failed":
            setLastError(data || "Connection failed");
            break;

          case "connection:max_attempts_reached":
            setLastError("Max reconnection attempts reached");
            break;
        }

        // Update status and health score
        setStatus(websocketService.getStatus());
        setHealthScore(websocketService.getHealthScore());
      };

      eventHandlers.current.set(eventType, handler);
      websocketService.on(eventType, handler);
    });
  }, []);

  // Clean up event listeners
  const cleanupEventListeners = useCallback(() => {
    eventHandlers.current.forEach((handler, eventType) => {
      websocketService.off(eventType, handler);
    });
    eventHandlers.current.clear();
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      return await websocketService.connect();
    } catch (error) {
      console.error("❌ useWebSocket: Connect failed:", error);
      setLastError(error.message);
      return false;
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Force reconnection
  const forceReconnect = useCallback(async () => {
    try {
      setLastError(null);
      return await websocketService.forceReconnection();
    } catch (error) {
      console.error("❌ useWebSocket: Force reconnect failed:", error);
      setLastError(error.message);
      return false;
    }
  }, []);

  // Send message
  const send = useCallback((data) => {
    return websocketService.send(data);
  }, []);

  // Get connection status
  const getStatus = useCallback(() => {
    return websocketService.getStatus();
  }, []);

  // Get health score
  const getHealthScore = useCallback(() => {
    return websocketService.getHealthScore();
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      cleanupEventListeners();
      // Don't disconnect here as other components might be using the service
    };
  }, [initialize, cleanupEventListeners]);

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(websocketService.getStatus());
      setHealthScore(websocketService.getHealthScore());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    isConnected,
    isReconnecting,
    status,
    healthScore,
    lastError,

    // Actions
    connect,
    disconnect,
    forceReconnect,
    send,

    // Getters
    getStatus,
    getHealthScore,

    // Service reference (for advanced usage)
    service: websocketService,
  };
};
