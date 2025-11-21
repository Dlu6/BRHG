/**
 * Session Recovery Manager
 *
 * Comprehensive session restoration system that:
 * 1. Detects all types of connection failures
 * 2. Validates session integrity (auth, user data)
 * 3. Restores services in correct order
 * 4. Verifies complete restoration before marking as ready
 * 5. Provides clear status updates to UI
 * 6. Handles proactive token refresh to prevent expiration
 */

import { EventEmitter } from "events";
import * as storageService from "./storageService";
import tokenManager from "./tokenManager";
import authApi from "./api/authApi";

/**
 * Creates a Session Recovery Manager instance
 * Using functional approach with closures for state management
 */
const createSessionRecoveryManager = () => {
  const emitter = new EventEmitter();

  // Private state using closures
  const state = {
    isRecovering: false,
    recoveryAttempt: 0,
    maxRecoveryAttempts: 5,
    lastRecoveryTime: null,
    recoveryPhase: "idle", // idle, validating, reconnecting, verifying, complete, failed
    failedServices: new Set(),
    healthStatus: {
      auth: false,
      websocket: false,
      sip: false,
      agent: false,
      monitoring: false,
    },
    isRefreshingToken: false, // Prevent concurrent refresh attempts
  };

  const config = {
    recoveryDelay: 2000,
    maxRecoveryDelay: 30000,
    healthCheckInterval: 2000, // Check health every 2 seconds for faster recovery
    sessionValidationTimeout: 10000,
    serviceStartupTimeout: 15000,
  };

  const services = {
    sipService: null,
    websocketService: null,
    agentService: null,
    callMonitoringService: null,
    connectionManager: null,
  };

  let healthCheckInterval = null;
  let recoveryTimeout = null;

  // Store event handler references for proper cleanup
  const eventHandlers = {
    websocket: {},
    sip: {},
    connectionManager: {},
  };

  /**
   * Initialize the recovery manager with service references
   */
  const initialize = (serviceRefs) => {
    console.log("🔄 [SessionRecovery] Initializing Session Recovery Manager");

    Object.assign(services, serviceRefs);

    // Start health monitoring
    startHealthMonitoring();

    // Listen for critical failures
    setupFailureDetection();

    // Start token monitoring for proactive refresh
    startTokenMonitoring();

    console.log("✅ [SessionRecovery] Session Recovery Manager initialized");
  };

  /**
   * Setup failure detection for all critical services
   */
  const setupFailureDetection = () => {
    console.log("🔌 [SessionRecovery] Setting up failure detection...");

    // WebSocket Service failures - Listen directly for immediate response
    if (services.websocketService) {
      // Check if it has an 'on' method (EventEmitter pattern)
      if (typeof services.websocketService.on === "function") {
        console.log("✅ [SessionRecovery] WebSocket service supports events");

        // Create and store handler references
        eventHandlers.websocket.disconnected = () => {
          // If websocket service is already in an intentional reconnect flow, do not trigger full session recovery
          try {
            const wsStatus =
              typeof services.websocketService.getStatus === "function"
                ? services.websocketService.getStatus()
                : {};

            if (wsStatus?.reconnecting === true) {
              console.warn(
                "⚠️ [SessionRecovery] WebSocket disconnected (reconnecting in progress) - skipping full recovery"
              );
              state.healthStatus.websocket = false;
              return;
            }
          } catch (_) {
            // fall through to recovery
          }

          console.error("❌ [SessionRecovery] WebSocket disconnected");
          state.failedServices.add("websocket");
          state.healthStatus.websocket = false;
          triggerRecovery("websocket_disconnected");
        };

        eventHandlers.websocket.failed = (error) => {
          console.error(
            "❌ [SessionRecovery] WebSocket connection failed:",
            error
          );
          state.failedServices.add("websocket");
          state.healthStatus.websocket = false;
          triggerRecovery("websocket_failed");
        };

        eventHandlers.websocket.maxAttempts = () => {
          console.error("❌ [SessionRecovery] WebSocket max attempts reached");
          triggerRecovery("websocket_max_attempts");
        };

        eventHandlers.websocket.connected = () => {
          console.log("✅ [SessionRecovery] WebSocket connected");
          state.failedServices.delete("websocket");
          state.healthStatus.websocket = true;
        };

        // Attach handlers
        services.websocketService.on(
          "connection:disconnected",
          eventHandlers.websocket.disconnected
        );
        services.websocketService.on(
          "connection:failed",
          eventHandlers.websocket.failed
        );
        services.websocketService.on(
          "connection:max_attempts_reached",
          eventHandlers.websocket.maxAttempts
        );
        services.websocketService.on(
          "connection:connected",
          eventHandlers.websocket.connected
        );
      }
    }

    // SIP failures
    if (services.sipService?.events) {
      console.log("✅ [SessionRecovery] SIP service supports events");

      // Create and store handler references
      eventHandlers.sip.registrationFailed = (error) => {
        console.error("❌ [SessionRecovery] SIP registration failed:", error);
        state.failedServices.add("sip");
        state.healthStatus.sip = false;
        triggerRecovery("sip_registration_failed");
      };

      eventHandlers.sip.unregistered = () => {
        console.warn("⚠️ [SessionRecovery] SIP unregistered");
        state.failedServices.add("sip");
        state.healthStatus.sip = false;
        triggerRecovery("sip_unregistered");
      };

      eventHandlers.sip.disconnected = () => {
        console.warn("⚠️ [SessionRecovery] SIP disconnected");
        state.failedServices.add("sip");
        state.healthStatus.sip = false;
      };

      eventHandlers.sip.registered = () => {
        console.log("✅ [SessionRecovery] SIP registered");
        state.failedServices.delete("sip");
        state.healthStatus.sip = true;
      };

      // Attach handlers
      services.sipService.events.on(
        "registration_failed",
        eventHandlers.sip.registrationFailed
      );
      services.sipService.events.on(
        "unregistered",
        eventHandlers.sip.unregistered
      );
      services.sipService.events.on(
        "disconnected",
        eventHandlers.sip.disconnected
      );
      services.sipService.events.on("registered", eventHandlers.sip.registered);
    }

    // Connection Manager failures
    if (services.connectionManager) {
      console.log("✅ [SessionRecovery] Connection Manager supports events");

      // Create and store handler references
      eventHandlers.connectionManager.maxAttempts = () => {
        console.error(
          "❌ [SessionRecovery] Connection Manager: Max attempts reached"
        );
        triggerRecovery("connection_max_attempts");
      };

      eventHandlers.connectionManager.stateChanged = ({ type, connected }) => {
        if (!connected) {
          console.warn(`⚠️ [SessionRecovery] ${type} disconnected`);
          state.failedServices.add(type);
          state.healthStatus[type] = false;
        } else {
          console.log(`✅ [SessionRecovery] ${type} connected`);
          state.failedServices.delete(type);
          state.healthStatus[type] = true;
        }
      };

      // Attach handlers
      services.connectionManager.on(
        "connection:maxAttemptsReached",
        eventHandlers.connectionManager.maxAttempts
      );
      services.connectionManager.on(
        "connection:stateChanged",
        eventHandlers.connectionManager.stateChanged
      );
    }

    // Listen for custom recovery triggers
    eventHandlers.windowRecoveryTrigger = (event) => {
      console.log(
        "🔄 [SessionRecovery] Manual recovery triggered:",
        event.detail
      );
      triggerRecovery(event.detail?.reason || "manual_trigger");
    };

    window.addEventListener(
      "session:recovery:trigger",
      eventHandlers.windowRecoveryTrigger
    );

    console.log("✅ [SessionRecovery] Failure detection setup complete");
  };

  /**
   * Start continuous health monitoring
   */
  const startHealthMonitoring = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    healthCheckInterval = setInterval(async () => {
      // Skip health check during logout or recovery
      if (window.isLoggingOut) {
        return;
      }

      const health = await checkSystemHealth();

      // If we're mid-recovery but everything is healthy, finalize quickly to clear UI state
      if (state.isRecovering && health.isHealthy) {
        try {
          await completeRecovery();
        } catch (_) {}
        state.isRecovering = false;
        state.recoveryAttempt = 0;
        state.recoveryPhase = "complete";
        state.failedServices.clear();
        emitter.emit("recovery:completed", {
          healthStatus: state.healthStatus,
        });
        return;
      }

      if (!health.isHealthy && !state.isRecovering) {
        console.warn("⚠️ [SessionRecovery] Unhealthy system detected:", health);
        triggerRecovery("health_check_failed");
      }
    }, config.healthCheckInterval);
  };

  /**
   * Comprehensive system health check
   */
  const checkSystemHealth = async () => {
    const health = {
      isHealthy: true,
      issues: [],
      services: { ...state.healthStatus },
    };

    // Check authentication
    const token = storageService.getAuthToken();
    const userData = storageService.getUserData();

    if (!token || !userData) {
      health.isHealthy = false;
      health.issues.push("missing_auth");
      health.services.auth = false;
    } else {
      health.services.auth = true;
    }

    // Check WebSocket
    if (services.websocketService) {
      // WebSocket service uses isConnected property
      let wsConnected = services.websocketService.isConnected === true;

      // If the websocket is in an active reconnect flow, avoid marking system unhealthy
      try {
        const wsStatus =
          typeof services.websocketService.getStatus === "function"
            ? services.websocketService.getStatus()
            : {};
        if (wsStatus?.reconnecting === true) {
          wsConnected = false; // reflect UI as disconnected
          // but do not fail overall health because recovery is already underway at transport layer
        }
      } catch (_) {}

      health.services.websocket = wsConnected;

      if (!wsConnected) {
        // Only mark as unhealthy if not in reconnecting state
        try {
          const wsStatus =
            typeof services.websocketService.getStatus === "function"
              ? services.websocketService.getStatus()
              : {};
          if (wsStatus?.reconnecting !== true) {
            health.isHealthy = false;
            health.issues.push("websocket_disconnected");
          }
        } catch (_) {
          health.isHealthy = false;
          health.issues.push("websocket_disconnected");
        }
      }
    }

    // Check SIP
    if (services.sipService) {
      const sipConnected = services.sipService.isConnected;
      const sipRegistered = services.sipService.state?.registerer?.registered;

      health.services.sip = sipConnected && sipRegistered;

      if (!sipConnected || !sipRegistered) {
        health.isHealthy = false;
        health.issues.push("sip_not_registered");
      }
    }

    // Align Agent status with SIP registration as single source of truth
    // If SIP is registered, treat agent as connected/available
    try {
      if (services.sipService) {
        const isSipRegistered =
          services.sipService.isConnected === true &&
          services.sipService.state?.registerer?.registered === true;
        health.services.agent = isSipRegistered;
      }
    } catch (_) {
      // keep previous value
    }

    // Check Call Monitoring (OPTIONAL - not critical for session health)
    if (services.callMonitoringService) {
      const monitoringConnected = services.callMonitoringService.isConnected();
      health.services.monitoring = monitoringConnected;

      // NOTE: callMonitoringService is not critical for session health
      // It can reconnect independently and doesn't affect authentication or SIP
      // Only log a warning if disconnected, don't mark system as unhealthy
      if (!monitoringConnected) {
        console.warn(
          "⚠️ [SessionRecovery] Call monitoring disconnected (non-critical)"
        );
        health.issues.push("monitoring_disconnected (non-critical)");
        // DO NOT set health.isHealthy = false for monitoring
      }
    }

    // Align Agent status with SIP registration as single source of truth
    // If SIP is registered, treat agent as connected/available
    try {
      if (services.sipService) {
        const isSipRegistered =
          services.sipService.isConnected === true &&
          services.sipService.state?.registerer?.registered === true;
        health.services.agent = isSipRegistered;
      }
    } catch (_) {
      // keep previous value
    }

    state.healthStatus = health.services;

    return health;
  };

  /**
   * Trigger session recovery
   */
  const triggerRecovery = async (reason = "unknown") => {
    // Prevent recovery during logout or authentication
    if (window.isLoggingOut || window.isAuthenticating) {
      console.log(
        "🔐 [SessionRecovery] Recovery blocked: Authentication in progress"
      );
      return false;
    }

    // Prevent multiple simultaneous recovery attempts
    if (state.isRecovering) {
      console.log(
        "🔄 [SessionRecovery] Recovery already in progress, skipping"
      );
      return false;
    }

    // Check max attempts
    if (state.recoveryAttempt >= state.maxRecoveryAttempts) {
      console.error("❌ [SessionRecovery] Max recovery attempts reached");
      emitter.emit("recovery:failed", { reason: "max_attempts_reached" });
      state.recoveryPhase = "failed";
      return false;
    }

    console.log(
      `🔄 [SessionRecovery] Starting recovery (attempt ${
        state.recoveryAttempt + 1
      }/${state.maxRecoveryAttempts})`
    );
    console.log(`🔄 [SessionRecovery] Recovery reason: ${reason}`);

    state.isRecovering = true;
    state.recoveryAttempt++;
    state.lastRecoveryTime = Date.now();
    state.recoveryPhase = "validating";

    emitter.emit("recovery:started", {
      attempt: state.recoveryAttempt,
      reason,
      failedServices: Array.from(state.failedServices),
    });

    try {
      // Phase 1: Validate Session
      await validateSession();

      // Phase 2: Restore Services
      await restoreServices();

      // Phase 3: Verify Restoration
      await verifyRestoration();

      // Phase 4: Complete Recovery
      await completeRecovery();

      console.log(
        "✅ [SessionRecovery] Session recovery completed successfully"
      );
      state.isRecovering = false;
      state.recoveryAttempt = 0;
      state.recoveryPhase = "complete";
      state.failedServices.clear();

      emitter.emit("recovery:completed", {
        healthStatus: state.healthStatus,
      });

      return true;
    } catch (error) {
      console.error("❌ [SessionRecovery] Recovery failed:", error);
      state.isRecovering = false;
      state.recoveryPhase = "failed";

      emitter.emit("recovery:error", {
        error: error.message,
        attempt: state.recoveryAttempt,
      });

      // Schedule next recovery attempt with exponential backoff
      const delay = Math.min(
        config.recoveryDelay * Math.pow(2, state.recoveryAttempt - 1),
        config.maxRecoveryDelay
      );

      console.log(
        `🔄 [SessionRecovery] Scheduling next recovery attempt in ${delay}ms`
      );

      recoveryTimeout = setTimeout(() => {
        triggerRecovery(`retry_after_${reason}`);
      }, delay);

      return false;
    }
  };

  /**
   * Phase 1: Validate Session
   */
  const validateSession = async () => {
    console.log("🔍 [SessionRecovery] Phase 1: Validating session...");
    state.recoveryPhase = "validating";
    emitter.emit("recovery:phase", { phase: "validating" });

    const token = storageService.getAuthToken();
    const userData = storageService.getUserData();

    // If no authentication credentials, redirect to login
    if (!token || !userData || !userData.user) {
      console.error(
        "❌ [SessionRecovery] Authentication missing - redirecting to login"
      );
      emitter.emit("recovery:auth_required");

      // Clear any stale data
      storageService.clear();

      // Redirect to login page
      setTimeout(() => {
        window.location.href = "/";
      }, 500);

      throw new Error("Authentication required - redirecting to login");
    }

    // Validate SIP configuration
    if (!userData.user.pjsip || !userData.user.extension) {
      console.error(
        "❌ [SessionRecovery] Invalid SIP configuration - redirecting to login"
      );
      emitter.emit("recovery:auth_required");

      // Clear invalid data
      storageService.clear();

      // Redirect to login page
      setTimeout(() => {
        window.location.href = "/";
      }, 500);

      throw new Error("Invalid SIP configuration - redirecting to login");
    }

    console.log("✅ [SessionRecovery] Session validation passed");
    state.healthStatus.auth = true;
  };

  /**
   * Phase 2: Restore Services
   */
  const restoreServices = async () => {
    console.log("🔧 [SessionRecovery] Phase 2: Restoring services...");
    state.recoveryPhase = "reconnecting";
    emitter.emit("recovery:phase", { phase: "reconnecting" });

    const userData = storageService.getUserData();
    const restorationOrder = [
      { name: "websocket", service: services.websocketService },
      { name: "callMonitoring", service: services.callMonitoringService },
      { name: "sip", service: services.sipService },
      { name: "agent", service: services.agentService },
    ];

    for (const { name, service } of restorationOrder) {
      if (!service) {
        console.warn(
          `⚠️ [SessionRecovery] Service ${name} not available, skipping`
        );
        continue;
      }

      try {
        console.log(`🔧 [SessionRecovery] Restoring ${name} service...`);

        switch (name) {
          case "websocket":
            // websocketService uses isConnected property (not a function)
            if (!service.isConnected) {
              await service.connect();
              await waitForCondition(
                () => service.isConnected,
                10000,
                `WebSocket connection`
              );
            }
            state.healthStatus.websocket = true;
            state.failedServices.delete("websocket");
            break;

          case "callMonitoring":
            // callMonitoringService delegates to websocketService (single source of truth)
            // Now that isConnected() checks websocketService directly, we just need to ensure
            // it has the latest socket reference if it was disconnected
            if (!service.isConnected()) {
              console.log(
                `🔧 [SessionRecovery] CallMonitoring not connected, syncing with WebSocket...`
              );

              // Don't pass a callback - preserve the original callback from initial setup
              // Just sync the socket reference with websocketService
              await service.connect();

              // Verify it's now connected via websocketService
              if (service.isConnected()) {
                console.log(
                  `✅ [SessionRecovery] CallMonitoring synced with WebSocket`
                );
              } else {
                // Should not happen if websocketService is connected
                throw new Error(
                  "CallMonitoring failed to sync despite WebSocket being connected"
                );
              }
            } else {
              console.log(
                `✅ [SessionRecovery] CallMonitoring already connected via WebSocket`
              );
            }
            state.healthStatus.monitoring = true;
            state.failedServices.delete("monitoring");
            break;

          case "sip":
            const sipConnected = service.isConnected;
            const sipRegistered = service.state?.registerer?.registered;

            if (!sipConnected || !sipRegistered) {
              // Retrieve stored user data and token for re-initialization
              const userData = storageService.getUserData();
              const token = storageService.getAuthToken();

              if (!userData?.user || !token) {
                throw new Error(
                  "Cannot restore SIP: Missing user data or authentication token"
                );
              }

              const user = userData.user;

              // Validate required SIP configuration
              if (
                !user?.pjsip?.server ||
                !user?.extension ||
                !user?.pjsip?.password
              ) {
                throw new Error(
                  "Cannot restore SIP: Incomplete SIP configuration in user data"
                );
              }

              console.log(
                `🔧 [SessionRecovery] Re-initializing SIP for extension ${user.extension}`
              );

              // Re-initialize SIP service with full configuration
              await service.initialize({
                extension: user.extension,
                pjsip: {
                  server: user.pjsip.server,
                  password: user.pjsip.password,
                  ws_servers: user.pjsip.ws_servers,
                  ice_servers: user.pjsip.ice_servers,
                },
                registerExpires: 300,
                apiUrl:
                  process.env.NODE_ENV === "development"
                    ? "http://localhost:8004"
                    : "https://cs.backspace.ug/mayday-api",
                token: token,
              });

              // Wait for SIP registration
              await waitForCondition(
                () =>
                  service.isConnected && service.state?.registerer?.registered,
                15000,
                `SIP registration`
              );

              console.log(
                `✅ [SessionRecovery] SIP re-initialized and registered successfully`
              );
            }
            state.healthStatus.sip = true;
            state.failedServices.delete("sip");

            // Keep agent status aligned with SIP registration as the source of truth
            try {
              const isSipRegistered =
                service.isConnected === true &&
                service.state?.registerer?.registered === true;
              state.healthStatus.agent = isSipRegistered;
            } catch (_) {}
            break;

          case "agent":
            // Restore agent status
            if (service.connect && typeof service.connect === "function") {
              await service.connect();
              state.healthStatus.agent = true;
              state.failedServices.delete("agent");
            }
            break;
        }

        console.log(`✅ [SessionRecovery] ${name} service restored`);
        emitter.emit("recovery:service_restored", { service: name });
      } catch (error) {
        console.error(`❌ [SessionRecovery] Failed to restore ${name}:`, error);
        state.failedServices.add(name);
        throw new Error(`Failed to restore ${name} service: ${error.message}`);
      }
    }

    console.log("✅ [SessionRecovery] All services restored");
  };

  /**
   * Phase 3: Verify Restoration
   */
  const verifyRestoration = async () => {
    console.log("🔍 [SessionRecovery] Phase 3: Verifying restoration...");
    state.recoveryPhase = "verifying";
    emitter.emit("recovery:phase", { phase: "verifying" });

    const health = await checkSystemHealth();

    if (!health.isHealthy) {
      throw new Error(
        `System still unhealthy after restoration: ${health.issues.join(", ")}`
      );
    }

    console.log("✅ [SessionRecovery] Restoration verification passed");
  };

  /**
   * Phase 4: Complete Recovery
   */
  const completeRecovery = async () => {
    console.log("🎉 [SessionRecovery] Phase 4: Completing recovery...");

    // Re-subscribe to all critical events
    if (services.websocketService) {
      // WebSocket will auto-resubscribe on reconnection
    }

    // Fetch fresh agent details
    if (services.agentService) {
      const userData = storageService.getUserData();
      if (userData?.user?.extension) {
        try {
          await services.agentService.getAgentDetailsByExtension(
            userData.user.extension
          );
        } catch (error) {
          console.warn(
            "⚠️ [SessionRecovery] Could not fetch agent details:",
            error
          );
        }
      }
    }

    // Finalize agent health from SIP registration to ensure UI reflects correct status immediately
    try {
      if (services.sipService) {
        const isSipRegistered =
          services.sipService.isConnected === true &&
          services.sipService.state?.registerer?.registered === true;
        state.healthStatus.agent = isSipRegistered;
      }
    } catch (_) {}

    console.log("✅ [SessionRecovery] Recovery completion successful");
  };

  /**
   * Utility: Wait for a condition to be true
   */
  const waitForCondition = (condition, timeout, description) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 200;

      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for: ${description}`));
        } else {
          setTimeout(check, checkInterval);
        }
      };

      check();
    });
  };

  /**
   * Get current recovery status
   */
  const getStatus = () => {
    return {
      isRecovering: state.isRecovering,
      recoveryPhase: state.recoveryPhase,
      recoveryAttempt: state.recoveryAttempt,
      maxRecoveryAttempts: state.maxRecoveryAttempts,
      healthStatus: state.healthStatus,
      failedServices: Array.from(state.failedServices),
      lastRecoveryTime: state.lastRecoveryTime,
    };
  };

  /**
   * Start token monitoring for proactive refresh
   */
  const startTokenMonitoring = () => {
    console.log("🔄 [SessionRecovery] Starting token monitoring");

    // Start monitoring with callback to handle refresh
    tokenManager.startTokenMonitoring(async () => {
      await handleTokenRefresh();
    }, 60); // Check every 60 seconds

    console.log("✅ [SessionRecovery] Token monitoring started");
  };

  /**
   * Handle proactive token refresh
   */
  const handleTokenRefresh = async () => {
    // Prevent concurrent refresh attempts
    if (state.isRefreshingToken) {
      console.log("⏳ [SessionRecovery] Token refresh already in progress, skipping");
      return;
    }

    // Don't refresh during logout or recovery
    if (window.isLoggingOut || state.isRecovering) {
      console.log("⚠️ [SessionRecovery] Skipping token refresh (logout or recovery in progress)");
      return;
    }

    try {
      state.isRefreshingToken = true;
      console.log("🔄 [SessionRecovery] Starting token refresh...");

      const refreshToken = storageService.getRefreshToken();
      if (!refreshToken) {
        console.error("❌ [SessionRecovery] No refresh token found");
        emitter.emit("token:refresh_failed", { reason: "No refresh token" });
        return;
      }

      // Call refresh token API
      const result = await authApi.refreshToken(refreshToken);

      // Update stored tokens
      storageService.setAuthToken(result.token);
      storageService.setRefreshToken(result.refreshToken);

      // Update user data if provided
      if (result.user) {
        const existingUserData = storageService.getUserData();
        storageService.setUserData({
          ...existingUserData,
          user: {
            ...existingUserData?.user,
            ...result.user,
          },
        });
      }

      console.log("✅ [SessionRecovery] Token refreshed successfully");

      // Update WebSocket with new token if needed
      if (services.websocketService && services.websocketService.isConnected) {
        console.log("🔄 [SessionRecovery] Updating WebSocket with new token");
        // WebSocket will pick up new token on next reconnect if needed
        // No need to manually update since it reads from storage
      }

      // Emit success event
      emitter.emit("token:refreshed", {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ [SessionRecovery] Token refresh failed:", error);

      // Check if refresh token expired
      if (error.message === "REFRESH_TOKEN_EXPIRED") {
        console.error("❌ [SessionRecovery] Refresh token expired - session invalid");
        
        // Stop token monitoring
        tokenManager.stopTokenMonitoring();

        // Emit event for UI to handle (show session expired message)
        emitter.emit("token:expired", {
          reason: "Refresh token expired",
        });

        // Clear auth and redirect to login
        storageService.clear();
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } else if (error.message === "NETWORK_ERROR") {
        console.warn("⚠️ [SessionRecovery] Network error during token refresh, will retry");
        // Token manager will retry on next interval
      } else {
        // Other errors - emit event but allow retry
        emitter.emit("token:refresh_failed", {
          error: error.message,
        });
      }
    } finally {
      state.isRefreshingToken = false;
    }
  };

  /**
   * Force immediate recovery
   */
  const forceRecovery = async () => {
    console.log("🔧 [SessionRecovery] Force recovery initiated");
    state.recoveryAttempt = 0; // Reset attempt counter
    return triggerRecovery("force_recovery");
  };

  /**
   * Reset recovery state
   */
  const reset = () => {
    console.log("🔄 [SessionRecovery] Resetting recovery state");
    state.isRecovering = false;
    state.recoveryAttempt = 0;
    state.recoveryPhase = "idle";
    state.failedServices.clear();

    if (recoveryTimeout) {
      clearTimeout(recoveryTimeout);
      recoveryTimeout = null;
    }
  };

  /**
   * Stop health monitoring
   */
  const stopHealthMonitoring = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  };

  /**
   * Cleanup
   */
  const destroy = () => {
    console.log("🧹 [SessionRecovery] Destroying Session Recovery Manager");

    // Stop health monitoring
    stopHealthMonitoring();

    // Stop token monitoring
    tokenManager.stopTokenMonitoring();
    console.log("✅ [SessionRecovery] Token monitoring stopped");

    // Remove WebSocket event listeners
    if (services.websocketService && eventHandlers.websocket) {
      if (typeof services.websocketService.off === "function") {
        services.websocketService.off(
          "connection:disconnected",
          eventHandlers.websocket.disconnected
        );
        services.websocketService.off(
          "connection:failed",
          eventHandlers.websocket.failed
        );
        services.websocketService.off(
          "connection:max_attempts_reached",
          eventHandlers.websocket.maxAttempts
        );
        services.websocketService.off(
          "connection:connected",
          eventHandlers.websocket.connected
        );
        console.log("✅ [SessionRecovery] WebSocket listeners removed");
      }
    }

    // Remove SIP event listeners
    if (services.sipService?.events && eventHandlers.sip) {
      services.sipService.events.off(
        "registration_failed",
        eventHandlers.sip.registrationFailed
      );
      services.sipService.events.off(
        "unregistered",
        eventHandlers.sip.unregistered
      );
      services.sipService.events.off(
        "disconnected",
        eventHandlers.sip.disconnected
      );
      services.sipService.events.off(
        "registered",
        eventHandlers.sip.registered
      );
      console.log("✅ [SessionRecovery] SIP listeners removed");
    }

    // Remove Connection Manager event listeners
    if (services.connectionManager && eventHandlers.connectionManager) {
      services.connectionManager.off(
        "connection:maxAttemptsReached",
        eventHandlers.connectionManager.maxAttempts
      );
      services.connectionManager.off(
        "connection:stateChanged",
        eventHandlers.connectionManager.stateChanged
      );
      console.log("✅ [SessionRecovery] Connection Manager listeners removed");
    }

    // Remove window event listener
    if (eventHandlers.windowRecoveryTrigger) {
      window.removeEventListener(
        "session:recovery:trigger",
        eventHandlers.windowRecoveryTrigger
      );
      console.log("✅ [SessionRecovery] Window listener removed");
    }

    // Reset state
    reset();

    // Remove all emitter listeners
    emitter.removeAllListeners();

    console.log("✅ [SessionRecovery] Cleanup complete");
  };

  // Return public API
  return {
    // Core methods
    initialize,
    triggerRecovery,
    forceRecovery,
    checkSystemHealth,
    getStatus,
    reset,
    destroy,
    stopHealthMonitoring,

    // Event methods
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    emit: (event, data) => emitter.emit(event, data),
  };
};

// Create singleton instance
const sessionRecoveryManager = createSessionRecoveryManager();

export default sessionRecoveryManager;
