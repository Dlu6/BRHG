import jwtDecode from "jwt-decode";
import { io } from "socket.io-client";
// Remove sipService import - WebRTC APIs not available in service workers
// import { sipService } from "./src/sipService";
import config from "./src/config.js";

// Debug logging for import verification
console.log("[Background] Script loaded, checking imports...");

// Remove sipService checks since it's not available in service workers
// try {
//   console.log("[Background] sipService imported:", !!sipService);
//   if (sipService && typeof sipService.initialize === "function") {
//     console.log("[Background] ✅ sipService.initialize is available");
//   }
// } catch (error) {
//   console.error("[Background] ❌ Error checking sipService:", error);
// }

const API_BASE_URL = config.SLAVE_SERVER_URL;
let socket;
let agentDetails = {};
let registrationStatus = "Unregistered"; // SIP registration status
let websocketStatus = "Disconnected"; // Backend websocket connection status

// Connection stability tracking
let connectionHealthTimer = null;
let lastSuccessfulConnection = Date.now();
let disconnectionGracePeriod = 10000; // 10 seconds grace period
let isInGracePeriod = false;

// License heartbeat tracking
let licenseHeartbeatTimer = null;
const HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30 seconds (well under 60s timeout)

// Enhanced session cleanup and heartbeat management
let sessionHeartbeatInterval = null;
let sessionCleanupTimeout = null;
let lastHeartbeatSuccess = Date.now();
const HEARTBEAT_FAILURE_THRESHOLD = 90000; // 90 seconds (3 failed heartbeats)

// Enhanced session cleanup handler with retry logic
const cleanupSession = async (retryCount = 0) => {
  try {
    const result = await chrome.storage.local.get(["token", "user"]);
    if (result.token && result.user) {
      try {
        // Handle token with or without Bearer prefix
        let authHeader;
        if (result.token.startsWith("Bearer ")) {
          authHeader = result.token;
        } else {
          authHeader = `Bearer ${result.token}`;
        }

        console.log(
          `[Background] Cleaning up session for user: ${
            result.user.username
          } (attempt ${retryCount + 1})`
        );

        // Get dynamic endpoints based on stored host URL
        const endpoints = await config.getDynamicEndpoints();

        const response = await fetch(endpoints.license.sessions.end, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: result.user.username,
            feature: "webrtc_extension",
          }),
        });

        if (response.ok) {
          console.log("[Background] ✅ Session cleaned up successfully");
          // Clear storage after successful cleanup
          await chrome.storage.local.clear();
          return true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn("[Background] Failed to cleanup session:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData.message || "Unknown error",
          });

          // Retry logic for failed cleanup
          if (retryCount < 3) {
            console.log(
              `[Background] Retrying session cleanup in 5 seconds... (${
                retryCount + 1
              }/3)`
            );
            setTimeout(() => cleanupSession(retryCount + 1), 5000);
          } else {
            console.error(
              "[Background] Failed to cleanup session after 3 attempts"
            );
            // Force clear storage even if server cleanup failed
            await chrome.storage.local.clear();
          }
        }
      } catch (error) {
        console.error("[Background] Error during session cleanup:", error);

        // Retry logic for network errors
        if (retryCount < 3) {
          console.log(
            `[Background] Retrying session cleanup in 5 seconds... (${
              retryCount + 1
            }/3)`
          );
          setTimeout(() => cleanupSession(retryCount + 1), 5000);
        } else {
          console.error(
            "[Background] Failed to cleanup session after 3 attempts"
          );
          // Force clear storage even if server cleanup failed
          await chrome.storage.local.clear();
        }
      }
    } else {
      console.log("[Background] No active session found to cleanup");
      return true;
    }
  } catch (error) {
    console.error(
      "[Background] Error accessing storage during cleanup:",
      error
    );
    return false;
  }
};

// Enhanced session heartbeat with failure detection
const startSessionHeartbeat = () => {
  if (sessionHeartbeatInterval) {
    clearInterval(sessionHeartbeatInterval);
  }

  console.log("[Background] Starting session heartbeat...");

  sessionHeartbeatInterval = setInterval(async () => {
    try {
      const result = await chrome.storage.local.get([
        "token",
        "user",
        "clientFingerprint",
      ]);
      if (result.token && result.user && result.clientFingerprint) {
        try {
          // Handle token with or without Bearer prefix
          let authHeader;
          if (result.token.startsWith("Bearer ")) {
            authHeader = result.token;
          } else {
            authHeader = `Bearer ${result.token}`;
          }

          // Get dynamic endpoints based on stored host URL
          const endpoints = await config.getDynamicEndpoints();

          const response = await fetch(endpoints.license.sessions.validate, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: result.user.username,
              clientFingerprint: result.clientFingerprint,
              feature: "webrtc_extension",
            }),
          });

          if (response.ok) {
            // Session is still valid, continue heartbeat
            lastHeartbeatSuccess = Date.now();
            console.log("[Background] ✅ Session heartbeat successful");
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn("[Background] Session validation failed:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData.message || "Unknown error",
            });

            // If session is invalid, trigger logout
            if (response.status === 401 || response.status === 404) {
              console.log("[Background] Session expired, triggering logout");
              broadcastToTabs({ type: "session_expired" });
            }
          }
        } catch (error) {
          console.error("[Background] Session heartbeat failed:", error);

          // Check if we've had too many consecutive failures
          const timeSinceLastSuccess = Date.now() - lastHeartbeatSuccess;
          if (timeSinceLastSuccess > HEARTBEAT_FAILURE_THRESHOLD) {
            console.error(
              "[Background] Too many heartbeat failures, triggering session cleanup"
            );
            await cleanupSession();
            stopSessionHeartbeat();
            broadcastToTabs({ type: "session_expired" });
          }
        }
      } else {
        console.log("[Background] No session data available for heartbeat");
        // Stop heartbeat if no session data
        stopSessionHeartbeat();
      }
    } catch (error) {
      console.error("[Background] Error during session heartbeat:", error);
    }
  }, 30000); // Send heartbeat every 30 seconds
};

// Stop session heartbeat
const stopSessionHeartbeat = () => {
  if (sessionHeartbeatInterval) {
    clearInterval(sessionHeartbeatInterval);
    sessionHeartbeatInterval = null;
    console.log("[Background] Session heartbeat stopped");
  }
};

// Enhanced broadcast function for better error handling
const broadcastToTabs = (message) => {
  const urlPatterns = [
    "*://*.zoho.com/*",
    "*://*.cs.morvenconsults.com/*",

    "https://cs.hugamara.com/*",
    "*://*.hugamara.com/*",
    "http://localhost:3000/*",
    "http://localhost:3002/*",
  ];

  chrome.tabs.query({ url: urlPatterns }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, message, () => {
        if (chrome.runtime.lastError) {
          // Silently ignore errors for tabs without content script
        }
      });
    });
  });
};

// Extension icon click handler
chrome.action.onClicked.addListener((tab) => {
  // Check if the current tab matches our content script patterns
  const allowedPatterns = [
    /^.*:\/\/.*\.zoho\.com\/.*$/,
    /^https?:\/\/cs\.hugamara\.com\/.*$/,
    /^https?:\/\/.*\.hugamara\.com\/.*$/,
    /^http:\/\/localhost:3000\/.*$/,
    /^http:\/\/localhost:3002\/.*$/,
  ];

  const isAllowedUrl = allowedPatterns.some((pattern) => pattern.test(tab.url));

  if (isAllowedUrl) {
    // Send message to content script to toggle login/softphone
    chrome.tabs.sendMessage(tab.id, { type: "toggle_login" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Failed to send toggle message:",
          chrome.runtime.lastError
        );
      }
    });
  } else {
    // Show notification for unsupported pages
    chrome.notifications.create({
      type: "basic",
      iconUrl: "logo.png",
      title: "Mayday Softphone",
      message:
        "This extension only works on supported platforms (Zoho, cs.hugamara.com, localhost:3000)",
    });
  }
});

function broadcastStatus() {
  // Query only for pages that match our content script patterns from manifest.json
  const urlPatterns = [
    "*://*.zoho.com/*",
    "*://cs.morvenconsults.com/*",
    "*://*.cs.hugamara.com/*",
    "*://*.hugamara.com/*",
    "http://localhost:3000/*",
    "http://localhost:3002/*",
  ];

  chrome.tabs.query({ url: urlPatterns }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "status_update",
          registrationStatus,
          websocketStatus,
          agentDetails,
        },
        () => {
          // This empty callback is used to gracefully handle the error when a tab
          // doesn't have our content script injected. It prevents the
          // "Receiving end does not exist" error from polluting the console.
          if (chrome.runtime.lastError) {
            // Silently ignore the error.
          }
        }
      );
    });
  });
}

// Connection health monitoring
function startConnectionHealthMonitoring() {
  if (connectionHealthTimer) {
    clearInterval(connectionHealthTimer);
  }

  connectionHealthTimer = setInterval(() => {
    const timeSinceLastConnection = Date.now() - lastSuccessfulConnection;

    // Only show disconnected after grace period
    if (
      timeSinceLastConnection > disconnectionGracePeriod &&
      !isInGracePeriod
    ) {
      if (websocketStatus === "Connected") {
        console.log(
          "[Background] Connection health check failed, setting to disconnected"
        );
        websocketStatus = "Connection Unstable";
        broadcastStatus();
      }
    }
  }, 5000); // Check every 5 seconds
}

function updateConnectionHealth(connected) {
  if (connected) {
    lastSuccessfulConnection = Date.now();
    isInGracePeriod = false;
    if (websocketStatus !== "Connected") {
      websocketStatus = "Connected";
      broadcastStatus();
    }
  } else if (!isInGracePeriod) {
    isInGracePeriod = true;
    websocketStatus = "Reconnecting";
    broadcastStatus();

    // Start grace period timer
    setTimeout(() => {
      isInGracePeriod = false;
      const timeSinceLastConnection = Date.now() - lastSuccessfulConnection;
      if (timeSinceLastConnection > disconnectionGracePeriod) {
        websocketStatus = "Disconnected";
        broadcastStatus();
      }
    }, disconnectionGracePeriod);
  }
}

// License heartbeat functions
function startLicenseHeartbeat() {
  if (licenseHeartbeatTimer) {
    clearInterval(licenseHeartbeatTimer);
  }

  licenseHeartbeatTimer = setInterval(() => {
    if (socket && socket.connected) {
      console.log("[Background] Sending license heartbeat");
      socket.emit("license:heartbeat");
    }
  }, HEARTBEAT_INTERVAL);
}

function stopLicenseHeartbeat() {
  if (licenseHeartbeatTimer) {
    clearInterval(licenseHeartbeatTimer);
    licenseHeartbeatTimer = null;
  }
}

async function connectToWebSocket(licenseSessionToken, sipConfig, userDetails) {
  console.log("[Background] Connecting to WebSocket with SIP config");

  agentDetails = userDetails;
  console.log("[Background] Set agentDetails:", agentDetails);

  // Update websocket status
  websocketStatus = "Connecting";
  broadcastStatus();

  // Start health monitoring
  startConnectionHealthMonitoring();

  if (socket) {
    socket.disconnect();
  }

  // Stop any existing heartbeat before new connection
  stopLicenseHeartbeat();

  socket = io(API_BASE_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Keep trying to reconnect
    timeout: 10000, // Increased from 5000 for more stability
    forceNew: false, // Allow connection reuse
    upgrade: true, // Allow transport upgrades
    rememberUpgrade: true,
    autoConnect: true,
    // Add ping/pong for connection health
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  socket.on("connect", () => {
    console.log("[Background] Connected to license server websocket");
    updateConnectionHealth(true);
    socket.emit("license:authenticate", { sessionToken: licenseSessionToken });
  });

  socket.on("license:auth_success", async (message) => {
    console.log("[Background] License authenticated successfully");
    updateConnectionHealth(true);

    // Start license heartbeat after successful authentication
    startLicenseHeartbeat();

    // Debug: Check if sipService is available
    // if (!sipService || typeof sipService.initialize !== "function") {
    //   console.error("[Background] ❌ sipService is not available!");
    //   return;
    // }

    try {
      // Set up event listeners BEFORE initialization to catch all events
      const forwardEvent = (eventName) => (event) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: eventName,
              ...event?.detail,
              agentDetails,
            });
          }
        });
      };

      sipService.events.on("registered", () => {
        registrationStatus = "Registered";
        console.log("[Background] ✅ SIP registered");
        broadcastStatus();
      });

      sipService.events.on("unregistered", () => {
        registrationStatus = "Unregistered";
        console.log("[Background] ❌ SIP unregistered");
        broadcastStatus();
      });

      sipService.events.on("registrationFailed", (e) => {
        registrationStatus = "Registration Failed";
        console.log("[Background] ❌ SIP registration failed:", e);
        broadcastStatus();
      });

      // Set up call event forwarding
      sipService.events.on("incoming_call", forwardEvent("incoming_call"));
      sipService.events.on("call_accepted", forwardEvent("call_state_change"));
      sipService.events.on(
        "call_terminated",
        forwardEvent("call_state_change")
      );
      sipService.events.on(
        "hold_state_change",
        forwardEvent("hold_state_change")
      );
      sipService.events.on(
        "mute_state_change",
        forwardEvent("mute_state_change")
      );

      // Add call progress events
      sipService.events.on("call_progress", (e) => {
        console.log("[Background] Call progress event - forwarding");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "call_progress",
              ...e?.detail,
              agentDetails,
            });
          }
        });
      });

      sipService.events.on("call_confirmed", (e) => {
        console.log("[Background] Call confirmed event - forwarding");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "call_confirmed",
              state: "active",
              ...e?.detail,
              agentDetails,
            });
          }
        });
      });

      sipService.events.on("call_failed", (e) => {
        console.log("[Background] Call failed event - forwarding");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "call_failed",
              state: "idle",
              ...e?.detail,
              agentDetails,
            });
          }
        });
      });

      sipService.events.on("call_ended", (e) => {
        console.log("[Background] Call ended event - forwarding");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "call_state_change",
              state: "idle",
              ...e?.detail,
              agentDetails,
            });
          }
        });
      });

      await sipService.initialize(sipConfig);
      console.log(
        "[Background] ✅ License authentication and connection setup completed"
      );

      // Force a status broadcast to ensure UI is updated
      setTimeout(() => {
        broadcastStatus();
      }, 1000);
    } catch (error) {
      console.error("[Background] ❌ Failed to initialize SIP service:", error);
    }
  });

  socket.on("license:auth_failed", (message) => {
    console.error(
      "[Background] License authentication failed:",
      message.reason
    );
    // Stop heartbeat if authentication failed
    stopLicenseHeartbeat();
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "[Background] Disconnected from license server websocket:",
      reason
    );
    updateConnectionHealth(false);
    stopLicenseHeartbeat(); // Stop heartbeat on disconnection
    console.log("[Background] License heartbeat stopped");
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(
      "[Background] Reconnected to license server websocket, attempt:",
      attemptNumber
    );
    updateConnectionHealth(true);
    startLicenseHeartbeat(); // Restart heartbeat on reconnect
    console.log("[Background] License heartbeat restarted");
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(
      "[Background] Attempting to reconnect to websocket, attempt:",
      attemptNumber
    );
    // Don't change status during reconnection attempts - let grace period handle it
  });

  socket.on("reconnect_failed", () => {
    console.log("[Background] Failed to reconnect to license server websocket");
    updateConnectionHealth(false);
    stopLicenseHeartbeat(); // Stop heartbeat on failed reconnect
    console.log("[Background] License heartbeat stopped");
  });

  // Add error handling
  socket.on("connect_error", (error) => {
    console.error("[Background] Websocket connection error:", error);
    updateConnectionHealth(false);
    stopLicenseHeartbeat(); // Stop heartbeat on connection error
  });

  // Add pong handler for connection health
  socket.on("pong", () => {
    updateConnectionHealth(true);
  });
}

async function getLicenseSessionToken(token) {
  try {
    const decodedToken = jwtDecode(token);
    const userId = decodedToken.id;

    if (!userId) {
      console.error("User ID not found in token.");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: userId,
        isSoftphone: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to get license session token"
      );
    }

    const data = await response.json();
    const licenseSessionToken = data.data.tokens.license;
    const sipConfig = data.data.user.pjsip;
    const userDetails = data.data.user;

    if (licenseSessionToken && sipConfig) {
      console.log("Received license session token:", licenseSessionToken);
      chrome.storage.local.set({ licenseSessionToken: licenseSessionToken });
      connectToWebSocket(licenseSessionToken, sipConfig, userDetails);
    } else {
      console.error(
        "License session token or SIP config not found in response."
      );
    }
  } catch (error) {
    console.error("Error getting license session token:", error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "login_success") {
    chrome.storage.local.get(
      [
        "licenseToken",
        "user",
        "sip_server",
        "sip_extension",
        "sip_password",
        "sip_transport",
        "sip_ws_port",
        "webrtc_enabled",
        "ice_servers",
        "ws_servers",
      ],
      (result) => {
        console.log("[Background] Login success, storage data:", result);
        if (result.licenseToken && result.sip_server) {
          const sipConfig = {
            server: result.sip_server,
            extension: result.sip_extension,
            password: result.sip_password,
            transport: result.sip_transport || "wss",
            wsPort: result.sip_ws_port || "8089",
            webrtc: result.webrtc_enabled || false,
            iceServers: result.ice_servers || [
              { urls: "stun:stun.l.google.com:19302" },
            ],
            ws_servers: result.ws_servers || null,
          };
          const userDetails = result.user;
          const licenseSessionToken = result.licenseToken;

          // Start session heartbeat for license management
          startSessionHeartbeat();

          // Notify content script to initialize SIP service
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { type: "login_success" });
            }
          });

          connectToWebSocket(licenseSessionToken, sipConfig, userDetails);
        }
      }
    );
  } else if (request.type === "logout") {
    console.log("[Background] Logout requested, cleaning up session...");
    // Stop session heartbeat
    stopSessionHeartbeat();
    // Cleanup session on server
    cleanupSession();

    // Notify content script to disconnect SIP service
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "logout_sip_disconnect" });
      }
    });

    // Clear local storage
    chrome.storage.local.clear(() => {
      console.log("[Background] Storage cleared");
    });
    // Disconnect WebSocket
    if (socket) {
      socket.disconnect();
      websocketStatus = "Disconnected";
      registrationStatus = "Unregistered";
      agentDetails = {};
    }
    // Broadcast logout to all tabs
    broadcastToTabs({ type: "logout_complete" });
    sendResponse({ success: true });
  } else if (request.type === "session_expired") {
    console.log("[Background] Session expired, forcing logout...");
    // Stop session heartbeat
    stopSessionHeartbeat();
    // Clear local storage
    chrome.storage.local.clear();
    // Disconnect WebSocket
    if (socket) {
      socket.disconnect();
      websocketStatus = "Disconnected";
      registrationStatus = "Unregistered";
      agentDetails = {};
    }
    // Broadcast session expiry to all tabs
    broadcastToTabs({ type: "session_expired_logout" });
  } else if (request.type === "get_registration_status") {
    sendResponse({
      registrationStatus,
      websocketStatus,
      agentDetails,
    });
    // Also broadcast to be sure
    broadcastStatus();
  } else if (request.type === "heartbeat") {
    // Respond to heartbeat with both connection statuses
    sendResponse({
      status: "alive",
      timestamp: Date.now(),
      websocketStatus,
      registrationStatus,
    });
  } else if (request.type === "make_call") {
    console.log("[Background] 🚀 make_call request received");
    console.log("[Background] Call request details:", {
      number: request.number,
      // hasSipService: !!sipService,
      registrationStatus: registrationStatus,
      websocketStatus: websocketStatus,
      // sipServiceMethods: sipService ? Object.keys(sipService) : "N/A",
    });

    // if (!sipService) {
    //   console.error("[Background] ❌ Call failed: sipService not available");
    //   sendResponse({ success: false, error: "SIP service not available" });
    //   return;
    // }

    if (registrationStatus !== "Registered") {
      console.error(
        "[Background] ❌ Call failed: Not registered to SIP server",
        {
          currentStatus: registrationStatus,
        }
      );
      sendResponse({
        success: false,
        error: `Not registered: ${registrationStatus}`,
      });
      return;
    }

    if (!request.number || request.number.trim() === "") {
      console.error("[Background] ❌ Call failed: No number provided");
      sendResponse({ success: false, error: "No phone number provided" });
      return;
    }

    // Send immediate response to prevent port closed error
    sendResponse({ success: true, message: "Call request received" });

    // Handle the call forwarding asynchronously
    chrome.storage.local.get(
      [
        "sip_server",
        "sip_extension",
        "sip_password",
        "sip_transport",
        "sip_ws_port",
        "ws_servers",
        "ice_servers",
      ],
      (result) => {
        const sipConfig = {
          server: result.sip_server,
          extension: result.sip_extension,
          password: result.sip_password,
          transport: result.sip_transport || "wss",
          wsPort: result.sip_ws_port || "8089",
          ws_servers: result.ws_servers,
          iceServers: result.ice_servers || [
            { urls: "stun:stun.l.google.com:19302" },
          ],
        };

        console.log("[Background] Complete SIP config for content script:", {
          server: sipConfig.server,
          extension: sipConfig.extension,
          transport: sipConfig.transport,
          wsPort: sipConfig.wsPort,
          hasPassword: !!sipConfig.password,
          hasWsServers: !!sipConfig.ws_servers,
          wsServersCount: sipConfig.ws_servers?.length || 0,
        });

        // Forward the call request to the content script where WebRTC APIs are available
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                type: "initiate_call",
                number: request.number,
                sipConfig: sipConfig,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "[Background] ❌ Failed to forward call to content script:",
                    chrome.runtime.lastError
                  );
                } else {
                  console.log(
                    "[Background] ✅ Content script responded:",
                    response
                  );
                }
              }
            );
          } else {
            console.error("[Background] ❌ No active tab found for call");
          }
        });
      }
    );

    // Return true to indicate we'll send a response asynchronously
    return true;
  } else if (request.type === "hangup_call") {
    // Forward hangup request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "hangup_call" });
      }
    });
  } else if (request.type === "answer_call") {
    // Forward answer request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "answer_call" });
      }
    });
  } else if (request.type === "hold_call") {
    // Forward hold request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "hold_call" });
      }
    });
  } else if (request.type === "unhold_call") {
    // Forward unhold request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "unhold_call" });
      }
    });
  } else if (request.type === "transfer_call") {
    // Forward transfer request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "transfer_call",
          number: request.number,
        });
      }
    });
  } else if (request.type === "toggle_mute") {
    // Forward mute toggle request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "toggle_mute",
          mute: request.mute,
        });
      }
    });
  } else if (request.type === "unregister") {
    // Manual unregister from SIP server
    console.log("[Background] Manual unregister requested");
    // if (sipService && sipService.unregister) {
    //   sipService.unregister();
    // }
    // Don't set registrationStatus here - let SIP events handle it
  } else if (request.type === "reregister") {
    // Manual re-register to SIP server
    console.log("[Background] Manual re-register requested");
    // Forward re-register request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "reregister" });
      }
    });
    sendResponse({ success: true, message: "Re-register initiated" });
  } else if (request.type === "sip_status_update") {
    // Handle SIP status updates from content script
    console.log("[Background] SIP status update received:", request.status);
    registrationStatus = request.status;
    if (request.error) {
      console.error("[Background] SIP registration error:", request.error);
    }
    // Broadcast status to all tabs
    broadcastStatus();
    sendResponse({ success: true });
  }
});

// Enhanced cleanup for extension lifecycle events
const setupExtensionLifecycleHandlers = () => {
  // Extension suspending (going to sleep)
  chrome.runtime.onSuspend.addListener(() => {
    console.log("[Background] Extension suspending, cleaning up session...");
    cleanupSession();
    stopSessionHeartbeat();
  });

  // Extension starting up
  chrome.runtime.onStartup.addListener(() => {
    console.log("[Background] Extension starting up...");
    // Check if we have an active session and start heartbeat
    chrome.storage.local.get(["token", "user"], (result) => {
      if (result.token && result.user) {
        console.log("Found existing session, starting heartbeat...");
        startSessionHeartbeat();
      }
    });
  });

  // Extension installed/updated
  chrome.runtime.onInstalled.addListener(() => {
    console.log(
      "[Background] Extension installed/updated, checking for existing sessions..."
    );
    // Clear any stale session data on install/update
    chrome.storage.local.clear(() => {
      console.log("[Background] Storage cleared on install/update");
    });
  });

  // Tab removal with enhanced session management
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    // Check if this was the last tab with our extension
    const urlPatterns = [
      "*://*.zoho.com/*",
      "*://cs.morvenconsults.com/*",
      "*://*.cs.hugamara.com/*",
      "*://*.hugamara.com/*",
      "http://localhost:3000/*",
    ];

    const remainingTabs = await chrome.tabs.query({ url: urlPatterns });
    if (remainingTabs.length === 0) {
      console.log(
        "[Background] No more active tabs, scheduling session cleanup..."
      );

      // Schedule cleanup with a delay to handle rapid tab switching
      if (sessionCleanupTimeout) {
        clearTimeout(sessionCleanupTimeout);
      }

      sessionCleanupTimeout = setTimeout(async () => {
        console.log("[Background] Executing delayed session cleanup...");
        await cleanupSession();
        stopSessionHeartbeat();
      }, 10000); // 10 second delay
    }
  });

  // Window focus change (user switching between windows)
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      console.log(
        "[Background] All windows lost focus, checking session status..."
      );
      // Don't cleanup immediately, just log for debugging
    }
  });

  // Network status changes (removed window event listeners)
};

// Initialize lifecycle handlers
setupExtensionLifecycleHandlers();
