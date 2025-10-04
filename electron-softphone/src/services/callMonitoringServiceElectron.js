// Call Monitoring Service with WebSocket Integration
// This service now works alongside the new websocketService for enhanced reconnection
// The websocketService handles the core WebSocket connection and reconnection logic
// while this service focuses on call monitoring specific functionality

import logoutManager from "./logoutManager";
import websocketService from "./websocketService";

let socket = null;
let statsUpdateCallback = null;
let currentStats = null;
let connectionManager = null;

// Enhanced connection configuration with progressive timeouts
const connectionConfig = {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 15000, // Initial timeout
  autoConnect: false, // We'll connect manually
  forceNew: true,
  upgrade: true,
  rememberUpgrade: true,
  maxBackoff: 30000,
  backoffMultiplier: 2,
  randomizationFactor: 0.5,
};

// Progressive timeout configuration for better user experience
const timeoutConfig = {
  initial: 15000, // 15 seconds for first attempt
  progressive: 25000, // 25 seconds for subsequent attempts
  max: 45000, // 45 seconds maximum timeout
  backoffMultiplier: 1.5, // Increase timeout progressively
  maxAttempts: 3, // Max attempts before using max timeout
};

// Enhanced connection state tracking
let connectionState = {
  attempts: 0,
  lastAttempt: null,
  lastError: null,
  isConnecting: false,
  progressiveTimeout: timeoutConfig.initial,
  consecutiveFailures: 0,
  lastSuccess: null,
  connectionQuality: "unknown", // 'excellent', 'good', 'poor', 'failed'
};

const defaultStats = {
  activeCalls: 0,
  abandonedCalls: 0,
  totalCalls: 0,
  answeredCalls: 0,
  inboundCalls: 0,
  outboundCalls: 0,
  avgCallDuration: "0:00",
  activeAgents: 0,
  queuedCalls: 0,
  callsPerHour: [],
  queueMetrics: {
    avgWaitTime: "0:00",
    serviceLevelToday: 0,
    abandonRate: 0,
  },
  activeCallsList: [],
  queueStatus: [],
  activeAgentsList: [],
  // Date-related fields with defaults
  timestamp: new Date().toISOString(),
  todayDate: new Date().setHours(0, 0, 0, 0),
  weekStartDate: null,
  weekEndDate: null,
  monthStartDate: null,
  monthEndDate: null,
  // Weekly and monthly stats
  weeklyTotalCalls: 0,
  weeklyAbandonedCalls: 0,
  weeklyInboundCalls: 0,
  weeklyOutboundCalls: 0,
  monthlyTotalCalls: 0,
  monthlyAbandonedCalls: 0,
  monthlyInboundCalls: 0,
  monthlyOutboundCalls: 0,
};

// Format date helper functions
const formatDate = (dateVal) => {
  if (!dateVal) return "";
  return new Date(dateVal).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "";
  return `${new Date(startDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} - ${new Date(endDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

const formatMonth = (dateVal) => {
  if (!dateVal) return "";
  return new Date(dateVal).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

// Add AMI event mapping
const handleAmiEvent = (event) => {
  // CRITICAL: Check authentication before handling AMI event
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 handleAmiEvent: No auth token, ignoring AMI event");
    return;
  }

  switch (event.type) {
    case "call:new":
      handleActiveCall({ action: "new", data: event });
      break;
    case "call:bridged":
      handleActiveCall({ action: "answer", data: event });
      break;
    case "call:hangup":
      handleActiveCall({ action: "hangup", data: event });
      break;
    case "queue:update":
      handleQueueUpdate(event);
      break;
  }
};

// Enhanced connection management with progressive timeout handling
const connect = async (callback) => {
  // Only update callback if a new one is provided (preserve existing during recovery)
  if (callback !== undefined) {
    statsUpdateCallback = callback;
  }

  // Initialize currentStats with default stats if not already set
  if (!currentStats) {
    currentStats = getDefaultStats();
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionState.isConnecting) {
    console.log(
      "🔄 Connection already in progress, skipping duplicate attempt"
    );
    return false;
  }

  try {
    // CRITICAL: Check if we have authentication before attempting connection
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      console.warn(
        "🔐 Call Monitoring Service: No auth token available, delaying connection"
      );
      // Return false to indicate connection not ready
      return false;
    }

    console.log(
      "🔐 Call Monitoring Service: Auth token confirmed, proceeding with connection"
    );

    // Update connection state
    connectionState.isConnecting = true;
    connectionState.attempts++;
    connectionState.lastAttempt = new Date();
    connectionState.lastError = null;

    // Calculate progressive timeout based on attempt number
    if (connectionState.attempts <= timeoutConfig.maxAttempts) {
      connectionState.progressiveTimeout = Math.min(
        timeoutConfig.initial *
          Math.pow(
            timeoutConfig.backoffMultiplier,
            connectionState.attempts - 1
          ),
        timeoutConfig.max
      );
    } else {
      connectionState.progressiveTimeout = timeoutConfig.max;
    }

    console.log(
      `🔄 Connection attempt ${connectionState.attempts} with ${connectionState.progressiveTimeout}ms timeout`
    );

    // CRITICAL: Clean disconnect existing socket with proper state validation
    if (socket) {
      try {
        // Check if socket is in a valid state before disconnecting
        if (socket.connected || socket.connecting) {
          console.log("🔌 Cleaning up existing socket connection...");
          socket.removeAllListeners();
          socket.disconnect();
        }
        socket = null;
      } catch (cleanupError) {
        console.warn("⚠️ Error during socket cleanup:", cleanupError);
        socket = null;
      }
    }

    // Delegate connection lifecycle to centralized websocketService
    const connectedBefore = websocketService.isConnected;
    if (!connectedBefore) {
      await websocketService.connect();
    }

    // Use the centralized socket instance
    socket = websocketService.socket;

    // Validate socket
    if (!socket) {
      throw new Error("No centralized WebSocket available");
    }

    // Set up event handlers (idempotent attach)
    setupSocketEventHandlers();

    const connected = websocketService.isConnected === true;

    if (connected) {
      // Connection successful - update state
      connectionState.isConnecting = false;
      connectionState.consecutiveFailures = 0;
      connectionState.lastSuccess = new Date();
      connectionState.connectionQuality =
        connectionState.attempts === 1 ? "excellent" : "good";

      console.log(
        `✅ Connection successful on attempt ${connectionState.attempts} (${connectionState.connectionQuality} quality)`
      );

      // If connection is successful and we have a connectionManager, update its state
      if (
        connectionManager &&
        typeof connectionManager.updateConnectionState === "function"
      ) {
        try {
          connectionManager.updateConnectionState("websocket", true, "healthy");
        } catch (error) {
          console.warn("⚠️ Could not update connection manager state:", error);
        }
      }

      // Health monitoring handled by websocketService

      // Emit connection success event with quality info
      window.dispatchEvent(
        new CustomEvent("websocket:connected", {
          detail: {
            attempt: connectionState.attempts,
            quality: connectionState.connectionQuality,
            timeout: connectionState.progressiveTimeout,
          },
        })
      );

      return true;
    } else {
      // Connection failed - update state
      connectionState.isConnecting = false;
      connectionState.consecutiveFailures++;
      connectionState.connectionQuality = "failed";

      console.warn(
        `❌ Connection failed on attempt ${connectionState.attempts} (${connectionState.consecutiveFailures} consecutive failures)`
      );

      // Rely on websocketService reconnection; do not manually tear down

      // Emit connection failure event with detailed info
      window.dispatchEvent(
        new CustomEvent("websocket:connection_failed", {
          detail: {
            attempt: connectionState.attempts,
            consecutiveFailures: connectionState.consecutiveFailures,
            timeout: connectionState.progressiveTimeout,
            lastError: connectionState.lastError,
          },
        })
      );

      return false;
    }
  } catch (error) {
    // Connection error - update state
    connectionState.isConnecting = false;
    connectionState.lastError = error.message;
    connectionState.consecutiveFailures++;
    connectionState.connectionQuality = "failed";

    console.error("❌ Connection failed with error:", error);

    // CRITICAL: Clean up on error
    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      } catch (cleanupError) {
        console.warn("⚠️ Error during error cleanup:", cleanupError);
        socket = null;
      }
    }

    // Emit connection error event
    window.dispatchEvent(
      new CustomEvent("websocket:connection_error", {
        detail: {
          error: error.message,
          attempt: connectionState.attempts,
          consecutiveFailures: connectionState.consecutiveFailures,
        },
      })
    );

    return false;
  }
};

// Enhanced socket event handlers
const setupSocketEventHandlers = () => {
  // CRITICAL: Check authentication before setting up socket event handlers
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn(
      "🔐 setupSocketEventHandlers: No auth token, cannot setup handlers"
    );
    return;
  }

  // CRITICAL: Validate socket instance and methods
  if (!socket) {
    console.error("❌ setupSocketEventHandlers: No socket instance available");
    return;
  }

  if (typeof socket.on !== "function") {
    console.error(
      "❌ setupSocketEventHandlers: Socket on method not available"
    );
    return;
  }

  // Connection events with error handling
  try {
    socket.on("connect", () => {
      try {
        console.log("✅ Connected to call monitoring service");

        // Emit connection event for connection manager (if available)
        if (
          connectionManager &&
          typeof connectionManager.updateConnectionState === "function"
        ) {
          try {
            connectionManager.updateConnectionState(
              "websocket",
              true,
              "healthy"
            );
          } catch (error) {
            console.warn(
              "⚠️ Could not update connection manager state on connect:",
              error
            );
          }
        }

        // Subscribe to services
        if (typeof socket.emit === "function") {
          socket.emit("subscribeToCallStats");
          socket.emit("requestCallStats");
        }

        // Emit connection success event
        window.dispatchEvent(new CustomEvent("websocket:connected"));
        // Also emit the event the connection manager is listening for
        window.dispatchEvent(new CustomEvent("connected"));
      } catch (connectError) {
        console.error("❌ Error in connect handler:", connectError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up connect listener:", listenerError);
  }

  try {
    socket.on("connect_error", (error) => {
      try {
        console.error("❌ Socket connection error:", error);

        // Update connection state
        connectionState.lastError = error.message || "Connection error";
        connectionState.consecutiveFailures++;

        // Emit connection failure event for connection manager (if available)
        if (
          connectionManager &&
          typeof connectionManager.updateConnectionState === "function"
        ) {
          try {
            connectionManager.updateConnectionState(
              "websocket",
              false,
              "unhealthy"
            );
          } catch (error) {
            console.warn(
              "⚠️ Could not update connection manager state on connect error:",
              error
            );
          }
        }

        // Centralized websocketService emits connection failure events

        // Trigger smart retry if appropriate
        if (connectionState.consecutiveFailures <= 3) {
          setTimeout(() => {
            console.log("🔄 Triggering smart retry after connection error");
            autoReconnect();
          }, 2000);
        }
      } catch (errorHandlerError) {
        console.error("❌ Error in connect_error handler:", errorHandlerError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up connect_error listener:", listenerError);
  }

  try {
    socket.on("disconnect", (reason) => {
      try {
        console.warn("🔌 Socket disconnected:", reason);

        // Emit disconnection event for connection manager (if available)
        if (
          connectionManager &&
          typeof connectionManager.updateConnectionState === "function"
        ) {
          try {
            connectionManager.updateConnectionState(
              "websocket",
              false,
              "unhealthy"
            );
          } catch (error) {
            console.warn(
              "⚠️ Could not update connection manager state on disconnect:",
              error
            );
          }
        }

        // Centralized websocketService emits disconnection events
      } catch (disconnectError) {
        console.error("❌ Error in disconnect handler:", disconnectError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up disconnect listener:", listenerError);
  }

  try {
    socket.on("reconnect", (attemptNumber) => {
      try {
        console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);

        // Emit reconnection event for connection manager (if available)
        if (
          connectionManager &&
          typeof connectionManager.updateConnectionState === "function"
        ) {
          try {
            connectionManager.updateConnectionState(
              "websocket",
              true,
              "healthy"
            );
          } catch (error) {
            console.warn(
              "⚠️ Could not update connection manager state on reconnect:",
              error
            );
          }
        }

        // Emit reconnection event
        window.dispatchEvent(
          new CustomEvent("websocket:reconnected", { detail: attemptNumber })
        );
        // Also emit the event the connection manager is listening for
        window.dispatchEvent(
          new CustomEvent("reconnected", { detail: attemptNumber })
        );
      } catch (reconnectError) {
        console.error("❌ Error in reconnect handler:", reconnectError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up reconnect listener:", listenerError);
  }

  // Centralized websocketService will emit reconnection attempt events

  // Centralized websocketService will emit reconnection error events

  // Centralized websocketService will emit reconnection failed events

  // Data events with error handling
  try {
    socket.on("amiEvent", (event) => {
      try {
        console.log("📡 Received AMI event:", event);
        handleAmiEvent(event);
      } catch (amiEventError) {
        console.error("❌ Error handling AMI event:", amiEventError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up amiEvent listener:", listenerError);
  }

  try {
    socket.on("callStats", (data) => {
      try {
        handleCallStats(data);
      } catch (callStatsError) {
        console.error("❌ Error handling call stats:", callStatsError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up callStats listener:", listenerError);
  }

  try {
    socket.on("activeCall", (data) => {
      try {
        console.log("📞 Received active call update:", data);
        handleActiveCall(data);
      } catch (activeCallError) {
        console.error("❌ Error handling active call:", activeCallError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up activeCall listener:", listenerError);
  }

  try {
    socket.on("queueUpdate", (data) => {
      try {
        handleQueueUpdate(data);
      } catch (queueUpdateError) {
        console.error("❌ Error handling queue update:", queueUpdateError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up queueUpdate listener:", listenerError);
  }

  try {
    socket.on("callEvent", (event) => {
      try {
        console.log("📞 Received call event from SIP:", event);
        handleActiveCall(event);
      } catch (callEventError) {
        console.error("❌ Error handling call event:", callEventError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up callEvent listener:", listenerError);
  }

  try {
    socket.on("heartbeat", (data) => {
      try {
        console.log("💓 Heartbeat response received:", data);
      } catch (heartbeatError) {
        console.error("❌ Error handling heartbeat:", heartbeatError);
      }
    });
  } catch (listenerError) {
    console.error("❌ Error setting up heartbeat listener:", listenerError);
  }
};

// Enhanced wait for connection with progressive timeout and user feedback
const waitForConnection = (timeoutMs = connectionConfig.timeout) => {
  return new Promise((resolve) => {
    // CRITICAL: Check authentication before waiting for connection
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      console.warn("🔐 waitForConnection: No auth token, resolving as failed");
      resolve(false);
      return;
    }

    // CRITICAL: Validate socket instance before proceeding
    if (!socket) {
      console.error("❌ waitForConnection: No socket instance available");
      resolve(false);
      return;
    }

    // CRITICAL: Validate socket methods before proceeding
    if (typeof socket.on !== "function" || typeof socket.off !== "function") {
      console.error("❌ waitForConnection: Socket methods not available");
      resolve(false);
      return;
    }

    // If already connected, resolve immediately
    if (socket.connected) {
      console.log("✅ Socket already connected, resolving immediately");
      resolve(true);
      return;
    }

    // CRITICAL: Set up connection listener with error handling
    const onConnect = () => {
      try {
        console.log("✅ Socket connected successfully");
        socket.off("connect", onConnect);
        socket.off("connect_error", onConnectError);
        clearTimeout(connectionTimeout);
        clearTimeout(progressTimeout);
        resolve(true);
      } catch (error) {
        console.error("❌ Error in onConnect handler:", error);
        resolve(true); // Still resolve as connected
      }
    };

    const onConnectError = (error) => {
      try {
        console.error("❌ Socket connection error:", error);
        socket.off("connect", onConnect);
        socket.off("connect_error", onConnectError);
        clearTimeout(connectionTimeout);
        clearTimeout(progressTimeout);

        // Update connection state with error details
        connectionState.lastError = error.message || "Connection error";

        console.error("Connection failed:", error);
        resolve(false);
      } catch (handlerError) {
        console.error("❌ Error in onConnectError handler:", handlerError);
        resolve(false);
      }
    };

    // Set connection timeout with detailed logging
    const connectionTimeout = setTimeout(() => {
      try {
        console.error(
          `❌ Connection timeout after ${timeoutMs}ms (attempt ${connectionState.attempts})`
        );

        // CRITICAL: Clean up event listeners safely
        if (socket && typeof socket.off === "function") {
          try {
            socket.off("connect", onConnect);
            socket.off("connect_error", onConnectError);
          } catch (cleanupError) {
            console.warn(
              "⚠️ Error cleaning up socket listeners:",
              cleanupError
            );
          }
        }

        clearTimeout(progressTimeout);

        // Update connection state
        connectionState.lastError = `Connection timeout after ${timeoutMs}ms`;

        // Emit timeout event with detailed information
        window.dispatchEvent(
          new CustomEvent("websocket:timeout", {
            detail: {
              timeout: timeoutMs,
              attempt: connectionState.attempts,
              consecutiveFailures: connectionState.consecutiveFailures,
              timestamp: new Date().toISOString(),
            },
          })
        );

        resolve(false);
      } catch (timeoutError) {
        console.error("❌ Error in connection timeout handler:", timeoutError);
        resolve(false);
      }
    }, timeoutMs);

    // Progress feedback during connection attempt
    const progressTimeout = setTimeout(() => {
      try {
        const remainingTime = Math.ceil((timeoutMs - 5000) / 1000);
        if (remainingTime > 0) {
          console.log(
            `⏳ Connection attempt ${connectionState.attempts} still in progress... (${remainingTime}s remaining)`
          );

          // Emit progress event for UI feedback
          window.dispatchEvent(
            new CustomEvent("websocket:connecting", {
              detail: {
                attempt: connectionState.attempts,
                remainingTime,
                timeout: timeoutMs,
                quality: connectionState.connectionQuality,
              },
            })
          );
        }
      } catch (progressError) {
        console.warn("⚠️ Error in progress handler:", progressError);
      }
    }, timeoutMs - 5000); // Show progress 5 seconds before timeout

    // CRITICAL: Listen for connection events with error handling
    try {
      socket.on("connect", onConnect);
      socket.on("connect_error", onConnectError);
    } catch (listenerError) {
      console.error("❌ Error setting up socket listeners:", listenerError);
      clearTimeout(connectionTimeout);
      clearTimeout(progressTimeout);
      resolve(false);
    }
  });
};

const handleCallStats = (stats) => {
  // CRITICAL: Check authentication before handling call stats
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 handleCallStats: No auth token, ignoring stats update");
    return;
  }

  if (!statsUpdateCallback) return;

  // Log the received stats for debugging
  // console.log("Received call stats from server:", {
  //   activeCalls: stats.activeCalls,
  //   totalCalls: stats.totalCalls,
  //   abandonedCalls: stats.abandonedCalls,
  //   weeklyTotalCalls: stats.weeklyTotalCalls,
  //   weeklyAbandonedCalls: stats.weeklyAbandonedCalls,
  //   monthlyTotalCalls: stats.monthlyTotalCalls,
  //   monthlyAbandonedCalls: stats.monthlyAbandonedCalls,
  // });

  // Process active calls list once - it's the most complex part
  const filteredActiveCallsList = (stats.activeCallsList || [])
    .filter((call) => {
      // Only include calls with valid uniqueid
      if (!call.uniqueid) {
        console.warn("Received call without uniqueid:", call);
        return false;
      }

      // Match the server-side logic for active calls
      return (
        call.status === "answered" ||
        call.status === "ringing" ||
        (call.status === "new" &&
          Date.now() - new Date(call.startTime).getTime() < 30000) // 30 seconds as a safeguard
      );
    })
    .map((call) => ({
      ...call,
      // Ensure all required fields are present
      uniqueid: call.uniqueid,
      callerId: call.src || call.clid || call.callerId || "Unknown",
      extension: call.dst || call.extension || "Unknown",
      status: call.status || "ringing",
      startTime: call.startTime || new Date().toISOString(),
      duration: call.duration || 0,
      direction: call.direction || "unknown",
    }));

  // Only process what needs to be processed, keep original data intact
  const processedStats = {
    ...stats,
    // Ensure numbers are actually numbers
    activeCalls:
      Number(stats.activeCalls) || filteredActiveCallsList.length || 0,
    abandonedCalls: Number(stats.abandonedCalls) || 0,
    totalCalls: Number(stats.totalCalls) || 0,
    weeklyTotalCalls: Number(stats.weeklyTotalCalls) || 0,
    weeklyAbandonedCalls: Number(stats.weeklyAbandonedCalls) || 0,
    monthlyTotalCalls: Number(stats.monthlyTotalCalls) || 0,
    monthlyAbandonedCalls: Number(stats.monthlyAbandonedCalls) || 0,
    activeAgents: Number(stats.activeAgents) || 0,

    // Process complex objects
    activeCallsList: filteredActiveCallsList,

    // Format dates for display
    todayDateFormatted: formatDate(stats.todayDate),
    weekDateFormatted: formatDateRange(stats.weekStartDate, stats.weekEndDate),
    monthDateFormatted: formatMonth(stats.monthStartDate),
  };

  // console.log("Processed stats ready for UI:", {
  //   totalCalls: processedStats.totalCalls,
  //   abandonedCalls: processedStats.abandonedCalls,
  // });

  // Store the current stats
  currentStats = processedStats;

  // Update the UI with the processed data
  statsUpdateCallback(processedStats);
};

const handleActiveCall = ({ action, data }) => {
  // CRITICAL: Check authentication before handling active call
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 handleActiveCall: No auth token, ignoring call update");
    return;
  }

  if (!statsUpdateCallback) return;

  // Log the received active call data
  console.log(`Handling active call: ${action}`, data);

  statsUpdateCallback((prevStats) => {
    const activeCallsList = [...(prevStats.activeCallsList || [])];
    const newStats = { ...prevStats };

    // Process the call based on the action
    switch (action) {
      case "new":
        if (
          data.uniqueid &&
          !activeCallsList.some((call) => call.uniqueid === data.uniqueid)
        ) {
          activeCallsList.push({
            uniqueid: data.uniqueid,
            callerId: data.callerId || data.src || "Unknown",
            extension: data.extension || data.dst || "Unknown",
            status: "ringing",
            startTime: data.startTime || new Date().toISOString(),
            duration: 0,
            direction: data.direction || "inbound",
            queue: data.queue || null,
          });
        }
        break;
      case "hangup":
        const hangupIndex = activeCallsList.findIndex(
          (call) => call.uniqueid === data.uniqueid
        );
        if (hangupIndex >= 0) {
          activeCallsList.splice(hangupIndex, 1);
        }
        break;
      case "answer":
        const callIndex = activeCallsList.findIndex(
          (call) => call.uniqueid === data.uniqueid
        );
        if (callIndex >= 0) {
          activeCallsList[callIndex] = {
            ...activeCallsList[callIndex],
            status: "answered",
            answerTime: data.answerTime || new Date().toISOString(),
          };
        }
        break;
    }

    // Update the stats with the new active calls
    const updatedStats = {
      ...newStats,
      activeCalls: activeCallsList.length,
      activeCallsList,
    };

    // Store the updated stats
    currentStats = updatedStats;

    return updatedStats;
  });
};

const handleQueueUpdate = (queueData) => {
  // CRITICAL: Check authentication before handling queue update
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 handleQueueUpdate: No auth token, ignoring queue update");
    return;
  }

  if (!statsUpdateCallback) return;

  statsUpdateCallback((prevStats) => {
    const updatedStats = {
      ...prevStats,
      queuedCalls: Number(queueData.waiting) || 0,
      queueMetrics: {
        ...prevStats.queueMetrics,
        avgWaitTime: queueData.avgWaitTime || "0:00",
        serviceLevelToday: Number(queueData.serviceLevel) || 0,
        abandonRate: Number(queueData.abandonRate) || 0,
      },
    };

    // Store the updated stats
    currentStats = updatedStats;

    return updatedStats;
  });
};

const getDefaultStats = () => {
  // CRITICAL: Check authentication before providing default stats
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 getDefaultStats: No auth token, returning minimal stats");
    return {
      ...defaultStats,
      todayDateFormatted: "Not Authenticated",
      weekDateFormatted: "Not Authenticated",
      monthDateFormatted: "Not Authenticated",
      error: "Authentication required",
    };
  }

  return {
    ...defaultStats,
    todayDateFormatted: formatDate(defaultStats.todayDate),
    weekDateFormatted: "",
    monthDateFormatted: "",
  };
};

// Enhanced disconnect function with authentication awareness
const disconnect = () => {
  console.log("🔌 Disconnecting from call monitoring service...");

  try {
    // CRITICAL: Check if this is a controlled disconnection during authentication/logout
    const isControlledDisconnection =
      window.isLoggingOut || window.isAuthenticating;

    if (isControlledDisconnection) {
      console.log(
        "🔐 Controlled disconnection detected, preventing reconnection triggers"
      );
    }

    // CRITICAL: Check authentication before disconnecting
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      console.warn("🔐 disconnect: No auth token, but proceeding with cleanup");
    }

    // Delegate cleanup to websocketService
    try {
      websocketService.disconnect();
      socket = null;
      console.log("✅ Centralized socket cleaned up successfully");
    } catch (socketError) {
      console.error("❌ Error during centralized socket cleanup:", socketError);
      socket = null;
    }

    // CRITICAL: Safe connection manager state update
    if (
      connectionManager &&
      typeof connectionManager.updateConnectionState === "function"
    ) {
      try {
        connectionManager.updateConnectionState(
          "websocket",
          false,
          "unhealthy"
        );
      } catch (error) {
        console.warn(
          "⚠️ Could not update connection manager state during disconnect:",
          error
        );
      }
    }

    // CRITICAL: Only emit disconnection events if this is NOT a controlled disconnection
    // This prevents the connection manager from triggering reconnection during auth/logout
    if (!isControlledDisconnection) {
      console.log("🔌 Emitting disconnection events for reconnection handling");
      // Emit disconnection event
      window.dispatchEvent(new CustomEvent("websocket:disconnected"));
      // Also emit the event the connection manager is listening for
      window.dispatchEvent(new CustomEvent("disconnected"));
    } else {
      console.log(
        "🔐 Controlled disconnection - skipping reconnection-triggering events"
      );
    }

    // CRITICAL: Reset connection state
    connectionState.isConnecting = false;
    connectionState.consecutiveFailures = 0;
    connectionState.connectionQuality = "unknown";

    console.log("✅ Disconnected successfully");
  } catch (error) {
    console.error("❌ Error during disconnect:", error);

    // CRITICAL: Force cleanup even on error
    try {
      if (socket) {
        socket = null;
      }
      connectionState.isConnecting = false;
      connectionState.consecutiveFailures = 0;
      connectionState.connectionQuality = "unknown";
    } catch (cleanupError) {
      console.error("❌ Error during forced cleanup:", cleanupError);
    }
  }
};

const handleSipCallEvent = (event) => {
  // CRITICAL: Check authentication before handling SIP events
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 handleSipCallEvent: No auth token, ignoring event");
    return;
  }

  if (socket && socket.connected) {
    console.log("Forwarding SIP call event to server:", event);
    socket.emit("callEvent", event);
  } else {
    console.warn(
      "🔐 handleSipCallEvent: Socket not connected, cannot forward event"
    );
  }
};

const getStats = () => {
  // CRITICAL: Check authentication before providing stats
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 getStats: No auth token, returning default stats");
    return getDefaultStats();
  }

  if (!currentStats) {
    currentStats = getDefaultStats();
  }
  return currentStats;
};

// Enhanced isConnected method - Check the single source of truth
const isConnected = () => {
  // CRITICAL: Always check websocketService as the single source of truth
  // This prevents stale socket references after WebSocket reconnects
  return websocketService.isConnected;
};

// Check if service is ready to connect (has authentication)
const isReadyToConnect = () => {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  return !!token;
};

// Enhanced heartbeat with connection health monitoring
const sendHeartbeat = () => {
  // DEPRECATED: Heartbeat now handled by centralized websocketService
  // This function is kept for backward compatibility but delegates to websocketService

  // Check if websocketService is available and connected
  if (websocketService && websocketService.isConnected) {
    // Heartbeat is automatically handled by websocketService
    return;
  }

  // If for some reason we still have a direct socket reference, don't send heartbeat
  // as it should be managed by websocketService
  return;
};

// Enhanced connection health monitoring with automatic recovery
// DEPRECATED: Health monitoring now handled by centralized websocketService
const startHealthMonitoring = () => {
  console.log(
    "🏥 Call Monitoring Service: Health monitoring delegated to websocketService"
  );

  // Health monitoring is now handled by the centralized websocketService
  // Disabling local health checks to prevent duplicate heartbeats and monitoring
  return () => {}; // Return empty cleanup function

  // Original health monitoring code (now disabled):
  /*
  const healthCheckInterval = setInterval(() => {
    try {
      // CRITICAL: Check if we should be monitoring
      if (window.isLoggingOut || window.isAuthenticating) {
        console.log(
          "🔐 Health monitoring: Authentication in progress, skipping check"
        );
        return;
      }

      // CRITICAL: Check authentication
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      if (!token) {
        console.log("🔐 Health monitoring: No auth token, skipping check");
        return;
      }

      // Check if socket exists and is in a valid state
      if (!socket) {
        console.log("🔌 Health monitoring: No socket, triggering reconnection");
        setTimeout(() => autoReconnect(), 1000);
        return;
      }

      // Check connection health
      const healthStatus = assessConnectionHealth();
      console.log(
        `🏥 Connection health: ${healthStatus} (quality: ${connectionState.connectionQuality})`
      );

      if (healthStatus === "unhealthy" || healthStatus === "failed") {
        console.warn("⚠️ Connection health check failed, triggering recovery");

        // Emit health check failed event
        window.dispatchEvent(
          new CustomEvent("websocket:health_check_failed", {
            detail: {
              quality: connectionState.connectionQuality,
              consecutiveFailures: connectionState.consecutiveFailures,
              timestamp: new Date().toISOString(),
              healthStatus,
            },
          })
        );

        // Trigger recovery if appropriate
        if (connectionState.consecutiveFailures < 5) {
          setTimeout(() => {
            console.log("🔄 Triggering recovery after health check failure");
            autoReconnect();
          }, 3000);
        } else {
          console.error(
            "❌ Max recovery attempts reached, manual intervention required"
          );
          window.dispatchEvent(
            new CustomEvent("websocket:max_recovery_attempts_reached", {
              detail: {
                consecutiveFailures: connectionState.consecutiveFailures,
                timestamp: new Date().toISOString(),
              },
            })
          );
        }
      } else if (healthStatus === "excellent" || healthStatus === "good") {
        // Reset failure counter on good health
        if (connectionState.consecutiveFailures > 0) {
          console.log(
            "✅ Connection health improved, resetting failure counter"
          );
          connectionState.consecutiveFailures = 0;
          connectionState.connectionQuality = healthStatus;
        }
      }
    } catch (healthCheckError) {
      console.error("❌ Error during health check:", healthCheckError);

      // Emit health check error event
      window.dispatchEvent(
        new CustomEvent("websocket:health_check_error", {
          detail: {
            error: healthCheckError.message,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => {
    console.log("🏥 Stopping connection health monitoring");
    clearInterval(healthCheckInterval);
  };
  */
};

// Assess connection health
const assessConnectionHealth = () => {
  if (!socket || !socket.connected) {
    return "disconnected";
  }

  // Check if we've had recent successful operations
  if (connectionState.lastSuccess) {
    const timeSinceLastSuccess =
      Date.now() - connectionState.lastSuccess.getTime();

    if (timeSinceLastSuccess < 60000) {
      return "excellent";
    } else if (timeSinceLastSuccess < 300000) {
      return "good";
    } else if (timeSinceLastSuccess < 900000) {
      return "fair";
    } else {
      return "poor";
    }
  }

  // Check consecutive failures
  if (connectionState.consecutiveFailures > 3) {
    return "unhealthy";
  }

  return "unknown";
};

// Get connection status for connection manager
const getConnectionStatus = () => {
  // CRITICAL: Check authentication before providing connection status
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    return {
      connected: false,
      id: null,
      transport: null,
      url: null,
      timestamp: new Date().toISOString(),
      error: "No authentication token available",
    };
  }

  return {
    connected: socket ? socket.connected : false,
    id: socket ? socket.id : null,
    transport: socket ? socket.io.engine.transport.name : null,
    url: socket ? socket.io.uri : null,
    timestamp: new Date().toISOString(),
  };
};

// Initialize connection manager reference
const setConnectionManager = (manager) => {
  // CRITICAL: Check authentication before setting connection manager
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn(
      "🔐 setConnectionManager: No auth token, but setting manager for cleanup"
    );
  }

  // Only set the connection manager if we have authentication
  if (token) {
    connectionManager = manager;
    console.log(
      "🔐 setConnectionManager: Connection manager set with auth token"
    );
  } else {
    // Store for cleanup purposes only
    connectionManager = manager;
    console.warn(
      "🔐 setConnectionManager: Connection manager stored for cleanup only"
    );
  }
};

// Smart retry mechanism with exponential backoff
const smartRetry = async (maxRetries = 3, baseDelay = 2000) => {
  if (connectionState.consecutiveFailures >= maxRetries) {
    console.warn(
      `🔄 Max retries (${maxRetries}) reached, waiting longer before next attempt`
    );
    return false;
  }

  const delay = Math.min(
    baseDelay * Math.pow(2, connectionState.consecutiveFailures),
    30000 // Max 30 second delay
  );

  console.log(
    `🔄 Smart retry in ${delay}ms (failure ${
      connectionState.consecutiveFailures + 1
    }/${maxRetries})`
  );

  // Emit retry event for UI feedback
  window.dispatchEvent(
    new CustomEvent("websocket:retry_scheduled", {
      detail: {
        delay,
        attempt: connectionState.attempts + 1,
        consecutiveFailures: connectionState.consecutiveFailures,
        maxRetries,
      },
    })
  );

  await new Promise((resolve) => setTimeout(resolve, delay));
  return true;
};

// Connection quality assessment (kept minimal for UI display)
const assessConnectionQuality = () => "unknown";

// Enhanced connection status with quality metrics
const getEnhancedConnectionStatus = () => {
  const baseStatus = getConnectionStatus();
  const quality = assessConnectionQuality();

  return {
    ...baseStatus,
    quality,
    attempts: connectionState.attempts,
    consecutiveFailures: connectionState.consecutiveFailures,
    lastSuccess: connectionState.lastSuccess,
    lastError: connectionState.lastError,
    isConnecting: connectionState.isConnecting,
    progressiveTimeout: connectionState.progressiveTimeout,
    connectionQuality: connectionState.connectionQuality,
  };
};

// Auto-reconnection with smart backoff and state validation
const autoReconnect = async () => {
  // CRITICAL: Prevent multiple simultaneous reconnection attempts
  if (connectionState.isConnecting) {
    console.log("🔄 Auto-reconnection already in progress, skipping");
    return false;
  }

  // CRITICAL: Check authentication before attempting reconnection
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.warn("🔐 Auto-reconnection: No auth token, skipping");
    return false;
  }

  // CRITICAL: Check if this is a controlled disconnection
  if (window.isLoggingOut || window.isAuthenticating) {
    console.log(
      "🔐 Auto-reconnection: Controlled disconnection in progress, skipping"
    );
    return false;
  }

  // CRITICAL: Implement exponential backoff to prevent connection storms
  const maxDelay = Math.min(
    30000,
    Math.pow(2, connectionState.consecutiveFailures) * 1000
  );
  const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
  const delay = Math.min(maxDelay + jitter, 30000);

  console.log(
    `🔄 Auto-reconnection scheduled in ${Math.round(delay)}ms (attempt ${
      connectionState.attempts + 1
    })`
  );

  // Emit auto-reconnection event
  window.dispatchEvent(
    new CustomEvent("websocket:auto_reconnect", {
      detail: {
        attempt: connectionState.attempts + 1,
        consecutiveFailures: connectionState.consecutiveFailures,
        quality: connectionState.connectionQuality,
        delay: Math.round(delay),
      },
    })
  );

  // Wait for the calculated delay
  await new Promise((resolve) => setTimeout(resolve, delay));

  // CRITICAL: Re-validate state before attempting reconnection
  if (window.isLoggingOut || window.isAuthenticating) {
    console.log("🔐 Auto-reconnection: State changed during delay, aborting");
    return false;
  }

  // CRITICAL: Check if we still need to reconnect
  if (socket && socket.connected) {
    console.log("✅ Auto-reconnection: Socket already connected, skipping");
    return true;
  }

  try {
    console.log(
      "🔄 Requesting centralized websocketService auto-reconnection..."
    );
    await websocketService.forceReconnection();
    return true;
  } catch (error) {
    console.error("❌ Auto-reconnection failed:", error);

    // CRITICAL: Update connection state on failure
    connectionState.consecutiveFailures++;
    connectionState.lastError = error.message;
    connectionState.connectionQuality = "failed";

    // Emit reconnection failure event
    window.dispatchEvent(
      new CustomEvent("websocket:auto_reconnect_failed", {
        detail: {
          error: error.message,
          attempt: connectionState.attempts,
          consecutiveFailures: connectionState.consecutiveFailures,
          timestamp: new Date().toISOString(),
        },
      })
    );

    return false;
  }
};

export const callMonitoringService = {
  connect,
  disconnect,
  getDefaultStats,
  handleSipCallEvent,
  getStats,
  isConnected,
  isReadyToConnect,
  setConnectionManager,
  sendHeartbeat,
  getConnectionStatus,
  getEnhancedConnectionStatus, // Enhanced status with quality metrics
  autoReconnect, // Smart auto-reconnection (delegates to websocketService)
  assessConnectionQuality, // Connection quality assessment (UI only)
  getConnectionState: () => ({ ...connectionState }), // Get current connection state
  resetConnectionState: () => {
    // Reset connection state
    connectionState = {
      attempts: 0,
      lastAttempt: null,
      lastError: null,
      isConnecting: false,
      progressiveTimeout: timeoutConfig.initial,
      consecutiveFailures: 0,
      lastSuccess: null,
      connectionQuality: "unknown",
    };
    console.log("🔄 Connection state reset successfully");
  },

  // Enhanced method to force connection reset and cleanup
  forceReset: () => {
    console.log("🔄 Force resetting connection state and cleaning up...");

    try {
      // Stop health monitoring if running
      if (connectionManager && connectionManager._healthMonitoringCleanup) {
        try {
          connectionManager._healthMonitoringCleanup();
          console.log("🏥 Health monitoring stopped");
        } catch (cleanupError) {
          console.warn("⚠️ Error stopping health monitoring:", cleanupError);
        }
      }

      // Clean up socket
      if (socket) {
        try {
          if (typeof socket.removeAllListeners === "function") {
            socket.removeAllListeners();
          }
          if (typeof socket.disconnect === "function") {
            socket.disconnect();
          }
          socket = null;
          console.log("🔌 Socket cleaned up");
        } catch (socketError) {
          console.warn("⚠️ Error cleaning up socket:", socketError);
          socket = null;
        }
      }

      // Reset connection state
      connectionState = {
        attempts: 0,
        lastAttempt: null,
        lastError: null,
        isConnecting: false,
        progressiveTimeout: timeoutConfig.initial,
        consecutiveFailures: 0,
        lastSuccess: null,
        connectionQuality: "unknown",
      };

      console.log("✅ Force reset completed successfully");
    } catch (resetError) {
      console.error("❌ Error during force reset:", resetError);
    }
  },
  startHealthMonitoring, // Start connection health monitoring
  assessConnectionHealth, // Assess current connection health
  getTimeoutConfig: () => ({ ...timeoutConfig }), // Get timeout configuration
};

// At the bottom of the file (after exports or near disconnect definition), register with logout manager
logoutManager.registerService("CallMonitoringService", async () => {
  try {
    disconnect();
  } catch (_) {}
});
