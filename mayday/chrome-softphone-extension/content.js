// content.js

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/components/App";

// Import SIP service for call handling in content script context
import { sipService } from "./src/sipService";

const app = document.createElement("div");
app.id = "reach-mi-softphone-root";

// Add styling to make the extension UI visible
app.style.cssText = `
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: auto !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
`;

// Make child elements interactive
const style = document.createElement("style");
style.textContent = `
  #reach-mi-softphone-root * {
    pointer-events: auto !important;
    box-sizing: border-box !important;
  }
`;
document.head.appendChild(style);

document.body.appendChild(app);

const root = createRoot(app);
root.render(<App />);

// Bridge window.postMessage events from host page to extension background
window.addEventListener("message", (event) => {
  try {
    const allowedOrigins = [
      "*://*.cs.morvenconsults.com/*",
      "http://localhost:3000",
      "http://localhost:3002",
      "https://cs.hugamara.com",
      "https://cs.brhg.co",
      "*://*.hugamara.com/*",
      "*://*.zoho.com/*",
      "https://mayday-website-backend-c2abb923fa80.herokuapp.com/*",
    ];
    if (!allowedOrigins.includes(event.origin)) return;

    const data = event.data || {};
    if (!data || typeof data !== "object") return;

    if (data.type === "hugamara:call") {
      chrome.runtime.sendMessage(
        { type: "make_call", number: String(data.number || "").trim() },
        () => {}
      );
    } else if (data.type === "hugamara:hangup") {
      chrome.runtime.sendMessage({ type: "hangup_call" }, () => {});
    }
  } catch (_) {}
});

// Content script SIP service for handling calls
let contentSipService = null;
let isContentSipInitialized = false;

// Function to initialize SIP service
async function initializeSipService() {
  if (isContentSipInitialized) {
    console.log("[Content] SIP service already initialized");
    return;
  }

  try {
    // Get SIP configuration from storage
    const result = await chrome.storage.local.get([
      "sip_server",
      "sip_extension",
      "sip_password",
      "sip_transport",
      "sip_ws_port",
      "webrtc_enabled",
      "ice_servers",
      "ws_servers",
    ]);

    if (!result.sip_server || !result.sip_extension || !result.sip_password) {
      console.log("[Content] SIP configuration not available yet");
      return;
    }

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

    console.log("[Content] 🔧 Initializing SIP service...");
    await sipService.initialize(sipConfig);
    isContentSipInitialized = true;
    contentSipService = sipService;
    console.log("[Content] ✅ SIP service initialized successfully");

    // Check current registration status and send update
    const registrationStatus = sipService.getRegistrationStatus();
    console.log("[Content] Current registration status:", registrationStatus);

    if (registrationStatus === "Registered") {
      console.log("[Content] ✅ SIP already registered, sending status update");
      chrome.runtime.sendMessage({
        type: "sip_status_update",
        status: "Registered",
      });
    }

    // Set up SIP event listeners for registration status
    sipService.events.on("registered", () => {
      console.log("[Content] ✅ SIP registered successfully");
      chrome.runtime.sendMessage({
        type: "sip_status_update",
        status: "Registered",
      });
    });

    sipService.events.on("unregistered", () => {
      console.log("[Content] ❌ SIP unregistered");
      chrome.runtime.sendMessage({
        type: "sip_status_update",
        status: "Unregistered",
      });
    });

    sipService.events.on("registrationFailed", (e) => {
      console.log("[Content] ❌ SIP registration failed:", e);
      chrome.runtime.sendMessage({
        type: "sip_status_update",
        status: "Registration Failed",
        error: e?.cause || "Unknown error",
      });
    });

    // Set up incoming call event listener
    sipService.events.on("incoming_call", (event) => {
      // console.log("[Content] 🔔 Incoming call received:", event);
      // Forward the incoming call event to the React app
      window.dispatchEvent(
        new CustomEvent("incoming_call", {
          detail: event.detail,
        })
      );
    });
  } catch (error) {
    console.error("[Content] ❌ SIP service initialization failed:", error);
    throw error;
  }
}

function sendTokenToBackground() {
  const token = localStorage.getItem("token");
  if (token) {
    chrome.runtime.sendMessage({ type: "auth_token", token: token });
  }
}

// Initial check
sendTokenToBackground();

// Listen for storage changes
window.addEventListener("storage", () => {
  sendTokenToBackground();
});

// Enhanced message listener for call handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Only log important message types
  if (["initiate_call", "hangup_call"].includes(request.type)) {
    console.log("[Content] 📞 Received message:", request.type);
  }

  if (request.type === "get_token") {
    sendTokenToBackground();
    sendResponse({ success: true });
  } else if (request.type === "login_success") {
    // Initialize SIP service when login is successful
    console.log("[Content] Login success, initializing SIP service...");
    initializeSipService()
      .then(() => {
        console.log("[Content] ✅ SIP service initialized after login");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error(
          "[Content] ❌ SIP initialization failed after login:",
          error
        );
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.type === "initiate_call") {
    console.log("[Content] 🚀 Call initiation request received");
    console.log("[Content] 🎤 Audio capabilities:", {
      number: request.number,
      hasSipConfig: !!request.sipConfig,
      hasWindow: typeof window !== "undefined",
      hasNavigator: typeof navigator !== "undefined",
      hasMediaDevices: !!navigator?.mediaDevices,
      hasGetUserMedia: !!navigator?.mediaDevices?.getUserMedia,
    });

    // Handle call initiation in content script where WebRTC is available
    handleCallInitiation(request.number, request.sipConfig)
      .then((result) => {
        console.log("[Content] ✅ Call initiation result:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("[Content] ❌ Call initiation failed:", error);
        sendResponse({
          success: false,
          error: error.message || "Call initiation failed",
        });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  } else if (request.type === "hangup_call") {
    console.log("[Content] 🚀 Call hangup request received");
    handleCallHangup()
      .then((result) => {
        console.log("[Content] ✅ Call hangup result:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("[Content] ❌ Call hangup failed:", error);
        sendResponse({
          success: false,
          error: error.message || "Call hangup failed",
        });
      });
    return true;
  } else if (request.type === "answer_call") {
    console.log("[Content] 🚀 Answer call request received");
    if (contentSipService && contentSipService.answerCall) {
      contentSipService.answerCall();
      sendResponse({ success: true, message: "Call answered" });
    } else {
      sendResponse({ success: false, error: "SIP service not available" });
    }
  } else if (request.type === "hold_call") {
    console.log("[Content] 🚀 Hold call request received");
    if (contentSipService && contentSipService.hold) {
      contentSipService.hold();
      sendResponse({ success: true, message: "Call held" });
    } else {
      sendResponse({ success: false, error: "SIP service not available" });
    }
  } else if (request.type === "unhold_call") {
    console.log("[Content] 🚀 Unhold call request received");
    if (contentSipService && contentSipService.hold) {
      contentSipService.hold(); // hold() method toggles hold state
      sendResponse({ success: true, message: "Call unheld" });
    } else {
      sendResponse({ success: false, error: "SIP service not available" });
    }
  } else if (request.type === "transfer_call") {
    console.log("[Content] 🚀 Transfer call request received:", request.number);
    if (contentSipService && contentSipService.transfer && request.number) {
      contentSipService.transfer(request.number);
      sendResponse({
        success: true,
        message: `Call transferred to ${request.number}`,
      });
    } else {
      sendResponse({
        success: false,
        error: "SIP service not available or no transfer number",
      });
    }
  } else if (request.type === "toggle_mute") {
    console.log("[Content] 🚀 Toggle mute request received:", request.mute);
    if (contentSipService && contentSipService.toggleMute) {
      contentSipService.toggleMute();
      sendResponse({
        success: true,
        message: `Microphone ${request.mute ? "muted" : "unmuted"}`,
      });
    } else {
      sendResponse({ success: false, error: "SIP service not available" });
    }
  } else if (request.type === "reregister") {
    console.log("[Content] 🚀 Re-register request received");

    // Initialize SIP service if not already initialized
    if (!isContentSipInitialized) {
      console.log("[Content] SIP service not initialized, initializing now...");
      initializeSipService()
        .then(() => {
          if (contentSipService && contentSipService.reregister) {
            return contentSipService.reregister();
          } else {
            throw new Error("SIP service not available after initialization");
          }
        })
        .then(() => {
          sendResponse({ success: true, message: "Re-register initiated" });
        })
        .catch((error) => {
          console.error("[Content] ❌ Re-register failed:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate async response
    } else if (contentSipService && contentSipService.reregister) {
      contentSipService
        .reregister()
        .then(() => {
          sendResponse({ success: true, message: "Re-register initiated" });
        })
        .catch((error) => {
          console.error("[Content] ❌ Re-register failed:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicate async response
    } else {
      sendResponse({ success: false, error: "SIP service not available" });
    }
  } else if (request.type === "logout_sip_disconnect") {
    console.log("[Content] 🚀 Logout SIP disconnect requested");
    if (contentSipService && contentSipService.disconnect) {
      contentSipService
        .disconnect()
        .then(() => {
          console.log("[Content] ✅ SIP service disconnected successfully");
          isContentSipInitialized = false;
          contentSipService = null;
          sendResponse({ success: true, message: "SIP service disconnected" });
        })
        .catch((error) => {
          console.error("[Content] ❌ SIP disconnect failed:", error);
          sendResponse({ success: false, error: error.message });
        });
    } else {
      console.log("[Content] No SIP service to disconnect");
      isContentSipInitialized = false;
      contentSipService = null;
      sendResponse({ success: true, message: "No SIP service to disconnect" });
    }
    return true; // Indicate async response
  }
});

// Call initiation handler
async function handleCallInitiation(number, sipConfig) {
  try {
    console.log("[Content] 📞 Starting call initiation process...");

    // Check WebRTC support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("WebRTC not supported in this browser");
    }

    // Load audio settings
    let audioSettings = null;
    try {
      const result = await chrome.storage.local.get(["audioSettings"]);
      audioSettings = result.audioSettings;
      if (audioSettings) {
        console.log("[Content] 🎤 Using saved audio settings:", {
          inputDevice: audioSettings.inputDevice || "default",
          outputDevice: audioSettings.outputDevice || "default",
          volume: audioSettings.outputVolume || 50,
        });
      }
    } catch (error) {
      console.warn(
        "[Content] ⚠️ Could not load audio settings:",
        error.message
      );
    }

    // Request microphone permission with preferred device
    console.log("[Content] 🎤 Requesting microphone permission...");
    try {
      const constraints = {
        audio: {
          deviceId: audioSettings?.inputDevice
            ? { exact: audioSettings.inputDevice }
            : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // High quality audio
          channelCount: 1, // Mono for calls
          volume: audioSettings?.outputVolume
            ? audioSettings.outputVolume / 100
            : 0.7,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[Content] ✅ Microphone permission granted:", {
        deviceId: audioSettings?.inputDevice || "default",
        tracks: stream.getAudioTracks().length,
        trackEnabled: stream.getAudioTracks()[0]?.enabled,
        trackLabel: stream.getAudioTracks()[0]?.label,
      });

      // Close the stream since we just needed permission
      stream.getTracks().forEach((track) => track.stop());
    } catch (permError) {
      console.error(
        "[Content] ❌ Microphone permission denied:",
        permError.message
      );
      throw new Error(
        "Microphone permission is required for calls. Please enable microphone access and try again."
      );
    }

    // Enhance SIP config with audio settings
    const enhancedSipConfig = {
      ...sipConfig,
      mediaConstraints: {
        audio: {
          deviceId: audioSettings?.inputDevice
            ? { exact: audioSettings.inputDevice }
            : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          volume: audioSettings?.outputVolume
            ? audioSettings.outputVolume / 100
            : 0.7,
        },
        video: false,
      },
      // Add audio output device if supported
      ...(audioSettings?.outputDevice && {
        outputDevice: audioSettings.outputDevice,
      }),
    };

    // Initialize content script SIP service if needed
    if (!isContentSipInitialized && enhancedSipConfig) {
      console.log(
        "[Content] 🔧 Initializing SIP service with audio settings..."
      );
      try {
        await sipService.initialize(enhancedSipConfig);
        isContentSipInitialized = true;
        contentSipService = sipService;
        console.log("[Content] ✅ SIP service initialized successfully");

        // Set up SIP event listeners for registration status
        sipService.events.on("registered", () => {
          console.log("[Content] ✅ SIP registered successfully");
          // Broadcast registration status to background script
          chrome.runtime.sendMessage({
            type: "sip_status_update",
            status: "Registered",
          });
        });

        sipService.events.on("unregistered", () => {
          console.log("[Content] ❌ SIP unregistered");
          chrome.runtime.sendMessage({
            type: "sip_status_update",
            status: "Unregistered",
          });
        });

        sipService.events.on("registrationFailed", (e) => {
          console.log("[Content] ❌ SIP registration failed:", e);
          chrome.runtime.sendMessage({
            type: "sip_status_update",
            status: "Registration Failed",
            error: e?.cause || "Unknown error",
          });
        });

        // No need to forward events - SoftphoneBar listens directly to sipService
      } catch (sipError) {
        console.error(
          "[Content] ❌ SIP service initialization failed:",
          sipError.message
        );
        throw new Error(`SIP initialization failed: ${sipError.message}`);
      }
    }

    if (!contentSipService) {
      throw new Error("SIP service not available in content script");
    }

    // Make the call
    console.log("[Content] 📞 Making call to:", number);
    contentSipService.makeCall(number);

    return {
      success: true,
      message: `Call initiated to ${number}`,
      timestamp: new Date().toISOString(),
      audioSettings: audioSettings
        ? {
            inputDevice: audioSettings.inputDevice || "default",
            outputDevice: audioSettings.outputDevice || "default",
            volume: audioSettings.outputVolume || 50,
          }
        : null,
    };
  } catch (error) {
    console.error("[Content] ❌ Call initiation error:", error.message);
    throw error;
  }
}

// Call hangup handler
async function handleCallHangup() {
  try {
    console.log("[Content] Hanging up call...");

    if (!contentSipService) {
      throw new Error("SIP service not available");
    }

    contentSipService.hangupCall();

    return {
      success: true,
      message: "Call hung up",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Content] Call hangup error:", error);
    throw error;
  }
}
