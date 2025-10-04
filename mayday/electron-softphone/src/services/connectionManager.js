// services/connectionManager.js
import { EventEmitter } from "events";
import { sipService } from "./sipService";
// Remove direct import of callMonitoringService to avoid circular dependency
// import { callMonitoringService } from './callMonitoringServiceElectron';
import logoutManager from "./logoutManager";

// Connection states
let states = {
  sip: { connected: false, lastSeen: null, health: "unknown" },
  websocket: { connected: false, lastSeen: null, health: "unknown" },
  ami: { connected: false, lastSeen: null, health: "unknown" },
};

// Service references (set via setters to avoid circular dependencies)
let callMonitoringServiceRef = null;

// Reconnection configuration
const config = {
  maxReconnectAttempts: 15,
  baseDelay: 1000,
  maxDelay: 30000,
  healthCheckInterval: 30000, // 30 seconds
  connectionTimeout: 15000, // 15 seconds
  heartbeatInterval: 25000, // 25 seconds
  unhealthyThreshold: 3, // consecutive failures before marking unhealthy
};

// Reconnection state
let reconnectState = {
  attempts: 0,
  isReconnecting: false,
  lastAttempt: null,
  nextAttempt: null,
  timeout: null,
};

// Health monitoring
let healthState = {
  consecutiveFailures: 0,
  lastHealthCheck: null,
  healthCheckTimer: null,
  heartbeatTimer: null,
};

// Event emitter instance
const eventEmitter = new EventEmitter();
try {
  eventEmitter.setMaxListeners(50);
} catch (_) {}

// Event handlers
const boundHandlers = {
  sipConnected: handleSipConnected,
  sipDisconnected: handleSipDisconnected,
  websocketConnected: handleWebSocketConnected,
  websocketDisconnected: handleWebSocketDisconnected,
  amiConnected: handleAmiConnected,
  amiDisconnected: handleAmiDisconnected,
};

// WebSocket event handlers
const websocketEventHandlers = {
  connected: handleWebSocketConnected,
  disconnected: handleWebSocketDisconnected,
  connection_error: handleWebSocketDisconnected,
  reconnected: handleWebSocketConnected,
  reconnect_failed: handleWebSocketDisconnected,
};

// Connection state management
function updateConnectionState(type, connected, health = "unknown") {
  const wasConnected = states[type].connected;
  states[type] = {
    connected,
    lastSeen: connected ? new Date() : states[type].lastSeen,
    health,
  };

  // Emit state change event
  eventEmitter.emit("connection:stateChanged", { type, ...states[type] });

  // Check overall system health
  checkOverallHealth();

  // Log state change
  if (wasConnected !== connected) {
    console.log(
      `🔌 ${type.toUpperCase()} connection ${
        connected ? "established" : "lost"
      }`
    );
  }
}

// Event handlers
function handleSipConnected() {
  updateConnectionState("sip", true, "healthy");
  resetReconnectionState();
}

function handleSipDisconnected() {
  updateConnectionState("sip", false, "unhealthy");
  scheduleReconnection();
}

function handleWebSocketConnected() {
  updateConnectionState("websocket", true, "healthy");
  resetReconnectionState();
}

function handleWebSocketDisconnected() {
  updateConnectionState("websocket", false, "unhealthy");

  // CRITICAL: Only schedule reconnection if not during authentication
  if (!window.isLoggingOut && !window.isAuthenticating) {
    console.log("🔌 WebSocket disconnected, scheduling reconnection");
    scheduleReconnection();
  } else {
    console.log(
      "🔐 WebSocket disconnected during authentication, skipping reconnection"
    );
  }
}

function handleAmiConnected() {
  updateConnectionState("ami", true, "healthy");
  resetReconnectionState();
}

function handleAmiDisconnected() {
  updateConnectionState("ami", false, "unhealthy");

  // CRITICAL: Only schedule reconnection if not during authentication
  if (!window.isLoggingOut && !window.isAuthenticating) {
    console.log("🔌 AMI disconnected, scheduling reconnection");
    scheduleReconnection();
  } else {
    console.log(
      "🔐 AMI disconnected during authentication, skipping reconnection"
    );
  }
}

// Reconnection logic with authentication awareness
function scheduleReconnection() {
  // CRITICAL: Prevent reconnection during authentication/login
  if (window.isLoggingOut || window.isAuthenticating) {
    console.log("🔐 Authentication in progress, skipping reconnection");
    return;
  }

  if (reconnectState.isReconnecting) {
    console.log("🔄 Reconnection already in progress, skipping");
    return;
  }

  if (reconnectState.attempts >= config.maxReconnectAttempts) {
    console.error("❌ Max reconnection attempts reached");
    eventEmitter.emit("connection:maxAttemptsReached");
    return;
  }

  reconnectState.isReconnecting = true;
  reconnectState.attempts++;

  const delay = Math.min(
    config.baseDelay * Math.pow(2, reconnectState.attempts - 1),
    config.maxDelay
  );

  reconnectState.nextAttempt = new Date(Date.now() + delay);

  console.log(
    `🔄 Scheduling reconnection attempt ${reconnectState.attempts}/${config.maxReconnectAttempts} in ${delay}ms`
  );

  reconnectState.timeout = setTimeout(() => {
    attemptReconnection();
  }, delay);
}

async function attemptReconnection() {
  if (!reconnectState.isReconnecting) {
    return;
  }

  // CRITICAL: Prevent reconnection during authentication
  if (window.isLoggingOut || window.isAuthenticating) {
    console.log(
      "🔐 Authentication in progress, canceling reconnection attempt"
    );
    resetReconnectionState();
    return;
  }

  console.log(
    `🔄 Attempting reconnection (${reconnectState.attempts}/${config.maxReconnectAttempts})`
  );

  try {
    // Attempt to reconnect SIP first
    if (!states.sip.connected) {
      await reconnectSip();
    }

    // Attempt to reconnect WebSocket
    if (!states.websocket.connected) {
      await reconnectWebSocket();
    }

    // Check if reconnection was successful
    if (states.sip.connected || states.websocket.connected) {
      console.log("✅ Reconnection successful");
      resetReconnectionState();
      eventEmitter.emit("connection:reconnected");
    } else {
      throw new Error("Reconnection failed - no services connected");
    }
  } catch (error) {
    console.error("❌ Reconnection attempt failed:", error);
    healthState.consecutiveFailures++;

    // Only schedule next attempt if not during authentication
    if (!window.isLoggingOut && !window.isAuthenticating) {
      scheduleReconnection();
    } else {
      console.log(
        "🔐 Authentication in progress, stopping reconnection attempts"
      );
      resetReconnectionState();
    }
  }
}

async function reconnectSip() {
  try {
    // CRITICAL: Prevent SIP reconnection during authentication
    if (window.isLoggingOut || window.isAuthenticating) {
      console.log("🔐 Authentication in progress, skipping SIP reconnection");
      return false;
    }

    if (
      sipService &&
      sipService.state?.lastConfig &&
      typeof sipService.reconnect === "function"
    ) {
      console.log("🔄 Reconnecting SIP service...");
      await sipService.reconnect();
      return true;
    } else {
      console.warn("⚠️ SIP service not available for reconnection");
      return false;
    }
  } catch (error) {
    console.error("❌ SIP reconnection failed:", error);
    return false;
  }
}

async function reconnectWebSocket() {
  try {
    // CRITICAL: Prevent WebSocket reconnection during authentication
    if (window.isLoggingOut || window.isAuthenticating) {
      console.log(
        "🔐 Authentication in progress, skipping WebSocket reconnection"
      );
      return false;
    }

    // Assuming callMonitoringService is now set via setConnectionManager
    if (
      callMonitoringServiceRef &&
      typeof callMonitoringServiceRef.connect === "function"
    ) {
      console.log("🔄 Reconnecting WebSocket...");
      await callMonitoringServiceRef.connect();
      return true;
    } else {
      console.warn("⚠️ Call monitoring service not available for reconnection");
      return false;
    }
  } catch (error) {
    console.error("❌ WebSocket reconnection failed:", error);
    return false;
  }
}

function resetReconnectionState() {
  reconnectState.attempts = 0;
  reconnectState.isReconnecting = false;
  reconnectState.lastAttempt = new Date();
  reconnectState.nextAttempt = null;

  if (reconnectState.timeout) {
    clearTimeout(reconnectState.timeout);
    reconnectState.timeout = null;
  }

  healthState.consecutiveFailures = 0;
}

// Health monitoring with authentication awareness
function startHealthMonitoring() {
  // Health check timer
  healthState.healthCheckTimer = setInterval(() => {
    try {
      // CRITICAL: Skip health checks during authentication
      if (window.isLoggingOut || window.isAuthenticating) {
        return;
      }
      performHealthCheck();
    } catch (error) {
      console.error("❌ Health check error:", error);
    }
  }, config.healthCheckInterval);

  // Heartbeat timer
  healthState.heartbeatTimer = setInterval(() => {
    try {
      // CRITICAL: Skip heartbeats during authentication
      if (window.isLoggingOut || window.isAuthenticating) {
        return;
      }
      sendHeartbeat();
    } catch (error) {
      console.error("❌ Heartbeat error:", error);
    }
  }, config.heartbeatInterval);

  console.log("💓 Health monitoring started (authentication-aware)");
}

async function performHealthCheck() {
  try {
    healthState.lastHealthCheck = new Date();

    // Check SIP health
    if (states.sip.connected) {
      const sipHealth = await checkSipHealth();
      updateConnectionState("sip", states.sip.connected, sipHealth);
    }

    // Check WebSocket health
    if (states.websocket.connected) {
      const wsHealth = await checkWebSocketHealth();
      updateConnectionState("websocket", states.websocket.connected, wsHealth);
    }

    // Check AMI health
    if (states.ami.connected) {
      const amiHealth = await checkAmiHealth();
      updateConnectionState("ami", states.ami.connected, amiHealth);
    }
  } catch (error) {
    console.error("❌ Health check failed:", error);
    healthState.consecutiveFailures++;
  }
}

async function checkSipHealth() {
  try {
    // Check if SIP service is responsive
    if (sipService && sipService.state?.userAgent?.transport?.isConnected) {
      return sipService.state.userAgent.transport.isConnected()
        ? "healthy"
        : "unhealthy";
    }
    return "unknown";
  } catch (error) {
    console.warn("⚠️ SIP health check failed:", error);
    return "unhealthy";
  }
}

async function checkWebSocketHealth() {
  try {
    // Assuming callMonitoringService is now set via setConnectionManager
    if (
      callMonitoringServiceRef &&
      typeof callMonitoringServiceRef.isConnected === "function"
    ) {
      return callMonitoringServiceRef.isConnected() ? "healthy" : "unhealthy";
    }
    return "unknown";
  } catch (error) {
    console.warn("⚠️ WebSocket health check failed:", error);
    return "unhealthy";
  }
}

async function checkAmiHealth() {
  try {
    // This would check AMI connection health
    // For now, assume healthy if we have recent AMI events
    return "healthy";
  } catch (error) {
    console.warn("⚠️ AMI health check failed:", error);
    return "unhealthy";
  }
}

function sendHeartbeat() {
  try {
    // Send heartbeat to keep connections alive
    // Assuming callMonitoringService is now set via setConnectionManager
    if (
      states.websocket.connected &&
      callMonitoringServiceRef &&
      callMonitoringServiceRef.sendHeartbeat
    ) {
      // WebSocket heartbeat
      callMonitoringServiceRef.sendHeartbeat();
      eventEmitter.emit("heartbeat:websocket");
    }

    if (states.sip.connected) {
      // SIP keep-alive
      eventEmitter.emit("heartbeat:sip");
    }
  } catch (error) {
    console.error("❌ Heartbeat failed:", error);
  }
}

function checkOverallHealth() {
  const healthyConnections = Object.values(states).filter(
    (state) => state.health === "healthy"
  ).length;
  const totalConnections = Object.keys(states).length;

  if (healthyConnections === totalConnections) {
    eventEmitter.emit("connection:allHealthy");
  } else if (healthyConnections === 0) {
    eventEmitter.emit("connection:allUnhealthy");
  } else {
    eventEmitter.emit("connection:partiallyHealthy", {
      healthy: healthyConnections,
      total: totalConnections,
    });
  }
}

// Public API functions
function getConnectionStatus() {
  return {
    states: { ...states },
    reconnectState: { ...reconnectState },
    healthState: { ...healthState },
    overallHealth: getOverallHealthScore(),
  };
}

function getOverallHealthScore() {
  const scores = {
    healthy: 100,
    unknown: 50,
    unhealthy: 0,
  };

  const totalScore = Object.values(states).reduce((sum, state) => {
    return sum + scores[state.health];
  }, 0);

  return Math.round(totalScore / Object.keys(states).length);
}

function isReady() {
  return (
    healthState.healthCheckTimer !== null && healthState.heartbeatTimer !== null
  );
}

async function forceReconnection() {
  console.log("🔄 Force reconnection requested");

  // Clear current reconnection state
  resetReconnectionState();

  // Force disconnect all services
  try {
    if (sipService && typeof sipService.disconnect === "function") {
      await sipService.disconnect();
    } else {
      console.warn("⚠️ SIP service not available for disconnect");
    }

    // Assuming callMonitoringService is now set via setConnectionManager
    if (
      callMonitoringServiceRef &&
      typeof callMonitoringServiceRef.disconnect === "function"
    ) {
      callMonitoringServiceRef.disconnect();
    } else {
      console.warn("⚠️ Call monitoring service not available for disconnect");
    }
  } catch (error) {
    console.warn("Error during force disconnect:", error);
  }

  // Start fresh reconnection
  scheduleReconnection();
}

async function refreshStatus() {
  console.log("🔄 Status refresh requested");

  try {
    // Perform immediate health check
    await performHealthCheck();

    // Emit status update
    eventEmitter.emit("connection:statusRefreshed", getConnectionStatus());

    return getConnectionStatus();
  } catch (error) {
    console.error("❌ Status refresh failed:", error);
    throw error;
  }
}

// Setter for call monitoring service
function setCallMonitoringService(service) {
  callMonitoringServiceRef = service;
  console.log("🔌 Call monitoring service reference set");
}

// Cleanup function
function destroy() {
  // Clear timers
  if (healthState.healthCheckTimer) {
    clearInterval(healthState.healthCheckTimer);
    healthState.healthCheckTimer = null;
  }

  if (healthState.heartbeatTimer) {
    clearInterval(healthState.heartbeatTimer);
    healthState.heartbeatTimer = null;
  }

  if (reconnectState.timeout) {
    clearTimeout(reconnectState.timeout);
    reconnectState.timeout = null;
  }

  // Remove event listeners
  try {
    if (sipService && sipService.events) {
      sipService.events.off("ws:connected", boundHandlers.sipConnected);
      sipService.events.off("ws:disconnected", boundHandlers.sipDisconnected);
      sipService.events.off("ws:failed", boundHandlers.sipDisconnected);
    }
  } catch (error) {
    console.warn("⚠️ Could not remove SIP service event listeners:", error);
  }

  // Remove WebSocket event listeners
  try {
    Object.entries(websocketEventHandlers).forEach(([event, handler]) => {
      window.removeEventListener(event, handler);
    });
  } catch (error) {
    console.warn("⚠️ Could not remove WebSocket event listeners:", error);
  }

  console.log("🔌 Connection Manager destroyed");
}

// Initialize function
function initialize() {
  try {
    // Bind SIP service event handlers (if available)
    if (sipService && sipService.events) {
      sipService.events.on("ws:connected", boundHandlers.sipConnected);
      sipService.events.on("ws:disconnected", boundHandlers.sipDisconnected);
      sipService.events.on("ws:failed", boundHandlers.sipDisconnected);
      console.log("🔌 SIP service event handlers bound");
    } else {
      console.warn("⚠️ SIP service not available during initialization");
    }

    // Bind WebSocket event handlers
    try {
      Object.entries(websocketEventHandlers).forEach(([event, handler]) => {
        window.addEventListener(event, handler);
      });
      console.log("🔌 WebSocket event handlers bound");
    } catch (error) {
      console.warn("⚠️ Could not bind WebSocket event handlers:", error);
    }

    // Start health monitoring
    startHealthMonitoring();

    console.log("🔌 Connection Manager initialized");
  } catch (error) {
    console.error("❌ Connection Manager initialization failed:", error);
  }
}

// Initialize immediately
console.log("🔌 Connection Manager: Starting initialization...");
initialize();
console.log("🔌 Connection Manager: Initialization complete");

// Register cleanup for logout
logoutManager.registerService("ConnectionManager", async () => {
  try {
    destroy();
  } catch (_) {}
});

// Export the public API
const exportedAPI = {
  // Event emitter methods
  on: (event, listener) => eventEmitter.on(event, listener),
  off: (event, listener) => eventEmitter.off(event, listener),
  emit: (event, ...args) => eventEmitter.emit(event, ...args),

  // Public methods
  getConnectionStatus,
  getOverallHealthScore,
  isReady,
  forceReconnection,
  refreshStatus,
  destroy,

  // Internal state (for debugging)
  _states: () => ({ ...states }),
  _reconnectState: () => ({ ...reconnectState }),
  _healthState: () => ({ ...healthState }),
  setCallMonitoringService, // Expose the setter
};

console.log("🔌 Connection Manager: Exporting API:", Object.keys(exportedAPI));

export default exportedAPI;
