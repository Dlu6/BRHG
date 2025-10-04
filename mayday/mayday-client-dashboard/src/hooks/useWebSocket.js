// src/hooks/useWebSocket.js
import { useEffect } from "react";
import {
  connectWebSocket,
  disconnectWebSocket,
} from "../services/websocketService";
import useAuth from "./useAuth";

const useWebSocket = () => {
  const { isAuthenticated } = useAuth();
  // console.log(isAuthenticated, "isAuthenticated>>>>>>");

  useEffect(() => {
    let socket = null;

    if (isAuthenticated) {
      try {
        socket = connectWebSocket();
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    }

    return () => {
      if (socket) {
        disconnectWebSocket();
      }
    };
  }, [isAuthenticated]);
};

export default useWebSocket;
