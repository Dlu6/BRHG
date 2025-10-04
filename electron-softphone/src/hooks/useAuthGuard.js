// electron-softphone/src/hooks/useAuthGuard.js
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { storageService } from "../services/storageService";
import { useNotification } from "../contexts/NotificationContext";

/**
 * Centralized authentication guard hook
 * Provides a reusable way to check authentication and handle failures
 */
export const useAuthGuard = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const authCheckTimeoutRef = useRef(null);
  const lastAuthCheckRef = useRef(0);
  const authFailureCountRef = useRef(0);

  // Check if authentication is valid
  const isAuthenticated = useCallback(() => {
    const token = storageService.getAuthToken();
    const userData = storageService.getUserData();

    return !!(token && userData?.user?.extension);
  }, []);

  // Handle authentication failure with automatic redirect
  const handleAuthFailure = useCallback(
    (reason = "Authentication expired") => {
      console.warn("🔐 Authentication failure:", reason);

      // Increment failure count
      authFailureCountRef.current += 1;

      // Clear storage to ensure clean state
      storageService.clear();

      // Show notification to user
      showNotification({
        message: `${reason}. Redirecting to login...`,
        severity: "warning",
        duration: 3000,
      });

      // Redirect to login page
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);

      return false;
    },
    [navigate, showNotification]
  );

  // Smart authentication check with throttling
  const checkAuth = useCallback(
    (operation = "operation") => {
      const now = Date.now();

      // Throttle auth checks to prevent excessive calls
      if (now - lastAuthCheckRef.current < 1000) {
        // Use cached result for frequent calls
        return isAuthenticated();
      }

      lastAuthCheckRef.current = now;

      if (!isAuthenticated()) {
        return handleAuthFailure(`Authentication required for ${operation}`);
      }

      // Reset failure count on successful auth
      authFailureCountRef.current = 0;
      return true;
    },
    [isAuthenticated, handleAuthFailure]
  );

  // Enhanced auth check with automatic retry for critical operations
  const requireAuth = useCallback(
    (operation = "operation") => {
      if (!checkAuth(operation)) {
        return false;
      }

      // For critical operations, do a secondary check after a brief delay
      if (authFailureCountRef.current > 0) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(checkAuth(operation));
          }, 500);
        });
      }

      return true;
    },
    [checkAuth]
  );

  // Guard function for wrapping operations that require authentication
  const withAuth = useCallback(
    (operation, operationName = "operation") => {
      return async (...args) => {
        const authResult = await requireAuth(operationName);
        if (!authResult) {
          console.warn(
            `🔐 Operation blocked due to auth failure: ${operationName}`
          );
          return null;
        }

        try {
          return await operation(...args);
        } catch (error) {
          // If error might be auth-related, check auth again
          if (
            error.message?.includes("token") ||
            error.message?.includes("auth") ||
            error.message?.includes("unauthorized") ||
            error.status === 401 ||
            error.status === 403
          ) {
            console.warn("🔐 Auth-related error detected:", error.message);
            handleAuthFailure("Authentication error during operation");
            return null;
          }
          throw error; // Re-throw non-auth errors
        }
      };
    },
    [requireAuth, handleAuthFailure]
  );

  // Monitor authentication state periodically
  useEffect(() => {
    const monitorAuth = () => {
      if (!isAuthenticated()) {
        handleAuthFailure("Authentication session expired");
        return;
      }
    };

    // Check auth every 30 seconds
    const authMonitorInterval = setInterval(monitorAuth, 30000);

    // Initial check
    monitorAuth();

    return () => {
      clearInterval(authMonitorInterval);
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [isAuthenticated, handleAuthFailure]);

  // Provide auth status for components
  const authStatus = {
    isAuthenticated: isAuthenticated(),
    token: storageService.getAuthToken(),
    user: storageService.getUserData()?.user,
    failureCount: authFailureCountRef.current,
  };

  return {
    // Core functions
    isAuthenticated,
    checkAuth,
    requireAuth,
    withAuth,
    handleAuthFailure,

    // Auth status
    authStatus,

    // Convenience methods
    guardedCallback: withAuth,
    guardedAsync: withAuth,
  };
};

// Higher-order component for protecting components
export const withAuthGuard = (Component) => {
  return (props) => {
    const { isAuthenticated, handleAuthFailure } = useAuthGuard();

    if (!isAuthenticated()) {
      // Component will be unmounted as redirect happens
      handleAuthFailure("Component requires authentication");
      return null;
    }

    return <Component {...props} />;
  };
};

export default useAuthGuard;


