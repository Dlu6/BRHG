import { useState, useEffect, useCallback } from "react";
import logoutManager from "../services/logoutManager";
import websocketService from "../services/websocketService";
import {
  getAuthToken,
  getUserData,
  canInitializeServices,
  setLogoutFlag,
  clearLogoutFlag,
  isLoggingOut,
} from "../services/storageService";

export const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [mongoUser, setMongoUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status
  const checkAuthStatus = useCallback(() => {
    const token = getAuthToken();
    const userData = getUserData();
    const logoutFlag = isLoggingOut();

    if (token && userData && !logoutFlag) {
      setUser(userData.user);
      setMongoUser(userData.mongoUser);
      setIsAuthenticated(true);
      clearLogoutFlag(); // Clear any lingering logout flag
    } else {
      setUser(null);
      setMongoUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  // Initialize auth state
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Check if services can be initialized
  const canInitServices = useCallback(() => {
    return canInitializeServices();
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setLogoutFlag(true);
    try {
      // Ensure WS is cleaned up proactively
      try {
        websocketService.destroy();
      } catch (_) {}

      await logoutManager.startLogout();
    } finally {
      setUser(null);
      setMongoUser(null);
      setIsAuthenticated(false);
      clearLogoutFlag();
    }
  }, []);

  // Login function
  const login = useCallback((userData) => {
    setUser(userData.user);
    setMongoUser(userData.mongoUser);
    setIsAuthenticated(true);
    clearLogoutFlag();
  }, []);

  return {
    user,
    mongoUser,
    isAuthenticated,
    isLoading,
    canInitServices,
    logout,
    login,
    checkAuthStatus,
  };
};
