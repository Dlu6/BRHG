import React, { useState, useEffect, useRef } from "react";
import TransferDialog from "./TransferDialog.jsx";
import SettingsDialog from "./SettingsDialog.jsx";
import {
  FaPhone,
  FaPhoneSlash,
  FaPause,
  FaPlay,
  FaExchangeAlt,
  FaCog,
  FaUserCircle,
  FaKeyboard,
  FaMicrophone,
  FaMicrophoneSlash,
  FaBackspace,
  FaServer,
  FaSignOutAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaHistory,
  FaArrowUp,
  FaArrowDown,
  FaTimes,
} from "react-icons/fa";
import { MdPauseCircleFilled } from "react-icons/md";
import licenseService from "../licenseService";
import callHistoryService from "../callHistoryService";
import pauseService from "../pauseService";
import { sipService } from "../sipService";
import config from "../config.js";

const SoftphoneBar = ({
  isAuthenticated = true,
  height = 60,
  onResizeStart,
}) => {
  const [number, setNumber] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callDetails, setCallDetails] = useState(null); // Store detailed call info
  const [incomingCall, setIncomingCall] = useState(null);
  const [onHold, setOnHold] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("Unregistered");
  const [backendHealth, setBackendHealth] = useState("Unknown");
  const [lastHealthCheck, setLastHealthCheck] = useState(null);
  const [agentDetails, setAgentDetails] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // User choice for how to place calls from Zoho phone icons
  const [callPreference, setCallPreference] = useState(null); // 'mayday' | 'zoho' | null
  const [callChoicePrompt, setCallChoicePrompt] = useState({
    visible: false,
    number: "",
    x: 0,
    y: 0,
  });
  const [rememberChoice, setRememberChoice] = useState(false);
  const [showAudioUnlock, setShowAudioUnlock] = useState(false);
  const [callStartAt, setCallStartAt] = useState(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [license, setLicense] = useState({
    isValid: false,
    message: "Checking license...",
    features: {},
    status: "unknown",
  });

  // Call history state
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [callHistoryLoading, setCallHistoryLoading] = useState(false);
  const [callHistoryError, setCallHistoryError] = useState(null);

  // Simplified connection monitoring
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Add missing refs
  const audioContextRef = useRef(null);
  const softphoneBarRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const ringingIntervalRef = useRef(null);
  const callDurationIntervalRef = useRef(null);

  // License and session information
  const [licenseInfo, setLicenseInfo] = useState({
    valid: false,
    status: "unknown",
    message: "Checking license...",
    organization: "",
    type: "",
    maxUsers: 0,
    webrtcMaxUsers: 0,
    currentUsers: 0,
    features: {},
    externalManaged: false,
  });

  // Load license information
  useEffect(() => {
    const loadLicenseInfo = async () => {
      try {
        const stored = await chrome.storage.local.get([
          "licenseInfo",
          "sessionCount",
        ]);

        if (stored.licenseInfo) {
          const info = stored.licenseInfo;

          // Parse features properly
          let features = {};
          if (info.features) {
            try {
              features =
                typeof info.features === "string"
                  ? JSON.parse(info.features)
                  : info.features;
            } catch (error) {
              console.warn("[SoftphoneBar] Error parsing features:", error);
              features = {};
            }
          }

          setLicenseInfo({
            valid: info.status === "active",
            status: info.status || "active",
            message: info.externalManaged
              ? `External License: ${info.organization} (${info.type})`
              : `Local License: ${info.organization} (${info.type})`,
            organization: info.organization || "Unknown",
            type: info.type || "Unknown",
            maxUsers: info.maxUsers || 0,
            webrtcMaxUsers: info.webrtcMaxUsers || 0,
            currentUsers: info.currentUsers || 0,
            features: features,
            externalManaged: info.externalManaged || false,
          });
        } else {
          // Try to fetch license info if not stored
          const token = await chrome.storage.local.get(["token"]);
          if (token.token) {
            try {
              const licenseResult = await licenseService.getCurrentLicense(
                token.token
              );
              if (licenseResult.success && licenseResult.license) {
                console.log(
                  "[SoftphoneBar] Fresh license data received:",
                  licenseResult
                );

                // Parse features properly
                let features = {};
                if (licenseResult.license.license_type?.features) {
                  try {
                    features =
                      typeof licenseResult.license.license_type.features ===
                      "string"
                        ? JSON.parse(
                            licenseResult.license.license_type.features
                          )
                        : licenseResult.license.license_type.features;
                  } catch (error) {
                    console.warn(
                      "[SoftphoneBar] Error parsing fresh features:",
                      error
                    );
                    features = {};
                  }
                }

                console.log("[SoftphoneBar] Fresh parsed features:", features);

                const info = {
                  organization: licenseResult.license.organization_name,
                  type: licenseResult.license.license_type?.name,
                  status: licenseResult.license.status,
                  maxUsers:
                    licenseResult.license.license_type?.max_concurrent_users,
                  webrtcMaxUsers:
                    licenseResult.license.webrtc_allocation?.webrtc_max_users ||
                    licenseResult.license.webrtc_max_users ||
                    0,
                  externalManaged: licenseResult.external_managed,
                  features: features,
                };

                await chrome.storage.local.set({ licenseInfo: info });
                setLicenseInfo({
                  valid: info.status === "active",
                  status: info.status,
                  message: info.externalManaged
                    ? `External License: ${info.organization} (${info.type})`
                    : `Local License: ${info.organization} (${info.type})`,
                  organization: info.organization,
                  type: info.type,
                  maxUsers: info.maxUsers,
                  webrtcMaxUsers: info.webrtcMaxUsers,
                  currentUsers: 0,
                  features: features,
                  externalManaged: info.externalManaged,
                });
              }
            } catch (error) {
              console.error("[SoftphoneBar] Error fetching license:", error);
            }
          }
        }
      } catch (error) {
        console.error("[SoftphoneBar] Error loading license info:", error);
        setLicenseInfo((prev) => ({
          ...prev,
          valid: false,
          message: "License check failed",
        }));
      }
    };

    loadLicenseInfo();
  }, []);

  // Periodic license and session updates
  useEffect(() => {
    const updateInterval = setInterval(async () => {
      try {
        const token = await chrome.storage.local.get(["token"]);
        if (token.token) {
          // Get session count
          const sessionResult = await licenseService.getSessionCount(
            token.token
          );
          if (sessionResult.success) {
            // console.log(
            //   "[SoftphoneBar] Session count update:",
            //   sessionResult.data
            // );
            setLicenseInfo((prev) => ({
              ...prev,
              currentUsers: sessionResult.data.currentUsers,
              maxUsers: sessionResult.data.maxUsers,
              webrtcMaxUsers: sessionResult.data.webrtcMaxUsers,
              organization:
                sessionResult.data.organization || prev.organization,
              type: sessionResult.data.licenseType || prev.type,
              valid: sessionResult.data.licenseStatus === "active",
              status: sessionResult.data.licenseStatus,
            }));
          }

          // Also refresh pause status periodically
          if (isAuthenticated && agentDetails.extension) {
            try {
              const pauseResult = await pauseService.getPauseStatus(
                token.token
              );
              if (pauseResult.success && pauseResult.data) {
                // Only update if the status actually changed to avoid unnecessary re-renders
                if (
                  pauseResult.data.isPaused !== isPaused ||
                  pauseResult.data.pauseReason !== pauseReason
                ) {
                  console.log(
                    "[SoftphoneBar] Pause status changed, updating state"
                  );
                  setIsPaused(pauseResult.data.isPaused);
                  setPauseReason(pauseResult.data.pauseReason);
                }
              }
            } catch (pauseError) {
              console.error(
                "[SoftphoneBar] Error updating pause status:",
                pauseError
              );
            }
          }
        }
      } catch (error) {
        console.error("[SoftphoneBar] Error updating license info:", error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [isAuthenticated, agentDetails.extension, isPaused, pauseReason]);

  // Helper function to check if a feature is enabled
  const hasFeature = (featureName) => {
    // If no features data is available, allow the feature (same logic as isCallsEnabled)
    if (Object.keys(licenseInfo.features).length === 0) {
      return true;
    }
    const hasIt = Boolean(licenseInfo.features[featureName]);
    // console.log(`[SoftphoneBar] Feature check '${featureName}':`, {
    //   hasFeature: hasIt,
    //   allFeatures: licenseInfo.features,
    //   featureValue: licenseInfo.features[featureName],
    // });
    return hasIt;
  };

  // Helper function to get license status color
  const getLicenseStatusColor = () => {
    if (!licenseInfo.valid) return "#ff4444";
    if (licenseInfo.status === "active") return "#00bb66";
    if (licenseInfo.status === "suspended") return "#ff8800";
    return "#999999";
  };

  // Helper function to get license tooltip
  const getLicenseTooltip = () => {
    if (!licenseInfo.valid) {
      return `License Invalid: ${licenseInfo.message}`;
    }

    const managementType = licenseInfo.externalManaged ? "External" : "Local";
    const webrtcInfo = hasFeature("webrtc_extension")
      ? `WebRTC Users: ${licenseInfo.currentUsers}/${licenseInfo.webrtcMaxUsers}`
      : "WebRTC: Not Available";

    return `${managementType} License: ${licenseInfo.organization}
License Type: ${licenseInfo.type}
Status: ${licenseInfo.status}
Total Users: ${licenseInfo.currentUsers}/${licenseInfo.maxUsers}
${webrtcInfo}
Features: ${
      Object.entries(licenseInfo.features)
        .filter(([_, enabled]) => enabled)
        .map(([name, _]) => name)
        .join(", ") || "None"
    }`;
  };

  // Helper function to check if calls are allowed
  const isCallsEnabled = () => {
    // Check if user is authenticated and has calling features
    const hasCallingFeature =
      hasFeature("calls") || Object.keys(licenseInfo.features).length === 0; // Allow if no features data

    const enabled =
      isAuthenticated &&
      hasCallingFeature &&
      (licenseInfo.status === "active" ||
        licenseInfo.status === "trial" ||
        licenseInfo.status === "unknown" || // Allow if status is unknown (during loading)
        !licenseInfo.status); // Allow if status is not set yet

    // Debug logging
    // console.log("[SoftphoneBar] Calls enabled check:", {
    //   isAuthenticated,
    //   licenseValid: licenseInfo.valid,
    //   licenseStatus: licenseInfo.status,
    //   hasCallingFeature,
    //   featuresCount: Object.keys(licenseInfo.features).length,
    //   features: licenseInfo.features,
    //   enabled,
    // });

    return enabled;
  };

  // Call history functions
  const loadCallHistory = async () => {
    if (!isAuthenticated || !agentDetails.extension) {
      console.log(
        "[SoftphoneBar] Cannot load call history: not authenticated or no extension"
      );
      return;
    }

    setCallHistoryLoading(true);
    setCallHistoryError(null);

    try {
      const token = await chrome.storage.local.get(["token"]);
      if (!token.token) {
        throw new Error("No authentication token available");
      }

      console.log(
        "[SoftphoneBar] Loading enhanced call history for extension:",
        agentDetails.extension
      );

      // Use enhanced call history service for better formatted data with called number
      const result = await callHistoryService.getEnhancedCallHistory(
        token.token,
        agentDetails.extension,
        20 // Limit to 20 most recent calls
      );

      if (result.success && result.data?.records) {
        setCallHistory(result.data.records);
        console.log(
          `[SoftphoneBar] Loaded ${result.data.records.length} enhanced call history records with called number tracking`
        );
      } else {
        throw new Error(result.message || "Failed to load call history");
      }
    } catch (error) {
      console.error("[SoftphoneBar] Error loading call history:", error);
      setCallHistoryError(error.message || "Failed to load call history");
      setCallHistory([]);
    } finally {
      setCallHistoryLoading(false);
    }
  };

  const toggleCallHistory = () => {
    const newShowState = !showCallHistory;
    setShowCallHistory(newShowState);

    // Load call history when opening the dialog
    if (newShowState && callHistory.length === 0) {
      loadCallHistory();
    }
  };

  // Auto-refresh call history periodically when dialog is open
  useEffect(() => {
    let refreshInterval;

    if (showCallHistory && isAuthenticated && agentDetails.extension) {
      // Refresh call history every 30 seconds when dialog is open
      refreshInterval = setInterval(() => {
        console.log("[SoftphoneBar] Auto-refreshing call history");
        loadCallHistory();
      }, 30000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [showCallHistory, isAuthenticated, agentDetails.extension]);

  // Load pause status when agent details are available
  useEffect(() => {
    if (isAuthenticated && agentDetails.extension) {
      console.log(
        "[SoftphoneBar] Agent details available, loading pause status"
      );
      loadPauseStatus();
    }
  }, [isAuthenticated, agentDetails.extension]);

  const handleCallFromHistory = (phoneNumber) => {
    // console.log("[SoftphoneBar] Initiating call from history to:", phoneNumber);

    // Set the number in the input field
    setNumber(phoneNumber);

    // Close call history
    setShowCallHistory(false);

    // Initiate the call if calls are enabled
    if (isCallsEnabled() && hasFeature("webrtc_extension")) {
      setTimeout(() => {
        handleCall();
      }, 100);
    }
  };

  // Load pause status from backend
  const loadPauseStatus = async () => {
    if (!isAuthenticated || !agentDetails.extension) {
      console.log(
        "[SoftphoneBar] Cannot load pause status: not authenticated or no extension"
      );
      return;
    }

    try {
      const token = await chrome.storage.local.get(["token"]);
      if (!token.token) {
        console.log("[SoftphoneBar] No token available for pause status check");
        return;
      }

      // console.log(
      //   "[SoftphoneBar] Loading pause status for extension:",
      //   agentDetails.extension
      // );
      const result = await pauseService.getPauseStatus(token.token);

      if (result.success && result.data) {
        setIsPaused(result.data.isPaused);
        setPauseReason(result.data.pauseReason);
        // console.log(
        //   `[SoftphoneBar] Pause status loaded: ${
        //     result.data.isPaused ? "Paused" : "Available"
        //   }`,
        //   result.data
        // );
      }
    } catch (error) {
      console.error("[SoftphoneBar] Error loading pause status:", error);
    }
  };

  // Handle pause/unpause button click
  const handlePauseToggle = async () => {
    if (!isAuthenticated || !agentDetails.extension) {
      console.log(
        "[SoftphoneBar] Cannot toggle pause: not authenticated or no extension"
      );
      return;
    }

    setPauseLoading(true);

    try {
      const token = await chrome.storage.local.get(["token"]);
      if (!token.token) {
        throw new Error("No authentication token available");
      }

      console.log(
        `[SoftphoneBar] Toggling pause state from ${
          isPaused ? "paused" : "unpaused"
        }`
      );

      let result;
      if (isPaused) {
        // Currently paused, so unpause
        result = await pauseService.unpauseAgent(token.token);
        setIsPaused(false);
        setPauseReason(null);
        console.log("[SoftphoneBar] Agent unpaused successfully");
      } else {
        // Currently not paused, so pause
        const reason = "Manual Pause"; // Could make this configurable
        result = await pauseService.pauseAgent(token.token, reason);
        setIsPaused(true);
        setPauseReason(reason);
        console.log("[SoftphoneBar] Agent paused successfully");
      }

      console.log(`[SoftphoneBar] Pause toggle result:`, result);

      // Optional: Show success message
      if (result.success) {
        console.log(`[SoftphoneBar] ${result.message}`);
      }
    } catch (error) {
      console.error("[SoftphoneBar] Error toggling pause state:", error);
      // Revert state on error
      // Don't change the state on error to avoid confusion
      alert(
        `Failed to ${isPaused ? "unpause" : "pause"} agent: ${error.message}`
      );
    } finally {
      setPauseLoading(false);
    }
  };

  // Helper function to get license status icon
  const getLicenseStatusIcon = (status, isValid) => {
    if (!isAuthenticated) return <FaUserCircle style={{ color: "#7f8c8d" }} />;
    if (!isValid) return <FaTimesCircle style={{ color: "#e74c3c" }} />;

    switch (status) {
      case "active":
        return <FaCheckCircle style={{ color: "#27ae60" }} />;
      case "trial":
        return <FaExclamationTriangle style={{ color: "#f39c12" }} />;
      case "expired":
      case "suspended":
        return <FaTimesCircle style={{ color: "#e74c3c" }} />;
      default:
        return <FaQuestionCircle style={{ color: "#7f8c8d" }} />;
    }
  };

  // Health check function
  const checkBackendHealth = async () => {
    try {
      // Get dynamic endpoints based on stored host URL
      const endpoints = await config.getDynamicEndpoints();

      const response = await fetch(endpoints.users.systemHealth, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        const healthData = data.data;
        setBackendHealth(healthData.status); // healthy, degraded, or unhealthy
        setLastHealthCheck(new Date());
        return healthData;
      } else {
        setBackendHealth("Unhealthy");
        setLastHealthCheck(new Date());
        return null;
      }
    } catch (error) {
      console.log("[SoftphoneBar] Backend health check failed:", error.message);
      setBackendHealth("Unreachable");
      setLastHealthCheck(new Date());
      return null;
    }
  };

  // Add CSS animation for spinner and incoming call animations (higher-contrast colors)
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes ring {
        0% { transform: rotate(0deg); }
        10% { transform: rotate(-25deg); }
        20% { transform: rotate(25deg); }
        30% { transform: rotate(-25deg); }
        40% { transform: rotate(25deg); }
        50% { transform: rotate(-25deg); }
        60% { transform: rotate(0deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes incomingCallPulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.35);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
      }
      @keyframes incomingCallGlow {
        0% {
          background-color: rgba(31, 41, 55, 0.96);
          border-color: rgba(16, 185, 129, 0.8);
        }
        50% {
          background-color: rgba(31, 41, 55, 1);
          border-color: rgba(34, 197, 94, 1);
        }
        100% {
          background-color: rgba(31, 41, 55, 0.96);
          border-color: rgba(16, 185, 129, 0.8);
        }
      }
      @keyframes incomingCallShake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }
      @keyframes incomingCallBounce {
        0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
        40%, 43% { transform: translate3d(0, -8px, 0); }
        70% { transform: translate3d(0, -4px, 0); }
        90% { transform: translate3d(0, -2px, 0); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Only setup message listeners and authentication checks if authenticated
    if (!isAuthenticated) {
      // Set basic state for unauthenticated users
      setRegistrationStatus("Not Authenticated");
      setAgentDetails({ username: "Guest" });
      setLicense({
        isValid: false,
        message: "Authentication required",
        features: {},
        status: "unauthenticated",
      });
      return;
    }

    // Sanitize helper: strip +256 to 0XXXXXXXXX (10 digits)
    const normalizeUgNumber = (raw) => {
      if (!raw) return "";
      const digits = String(raw).replace(/\D/g, "");
      if (!digits) return "";
      if (digits.startsWith("256") && digits.length >= 11) {
        const local = digits.slice(3);
        return `0${local.replace(/^0+/, "")}`.slice(0, 10);
      }
      if (digits.startsWith("0")) {
        return digits.slice(0, 10);
      }
      if (digits.length === 9) return `0${digits}`;
      return digits;
    };

    // Helper: extract and normalize caller number from various inbound formats
    const extractCallerNumber = (raw) => {
      if (!raw) return "";
      try {
        const decoded = decodeURIComponent(String(raw));
        // Strip common prefixes like CDR(userfield)= and any non-digit prefix
        const cleaned = decoded.replace(/^.*?=\s*/g, "");
        const match = cleaned.match(/\+?\d{7,15}/);
        const candidate = match ? match[0] : cleaned;
        return normalizeUgNumber(candidate);
      } catch (_) {
        const m = String(raw).match(/\+?\d{7,15}/);
        return normalizeUgNumber(m ? m[0] : String(raw));
      }
    };

    // Listener for messages from the background script
    const messageListener = (request, sender, sendResponse) => {
      // console.log("[🔥🔥🔥SoftphoneBar>>>>>>>>>>?] Message received:", request);
      // Update heartbeat on any message from background
      setLastUpdate(Date.now());

      if (request.type === "status_update") {
        // console.log("[SoftphoneBar] Status update received:", {
        //   registrationStatus: request.registrationStatus,
        //   websocketStatus: request.websocketStatus,
        //   agentDetails: request.agentDetails,
        // });
        setRegistrationStatus(request.registrationStatus);
        if (request.agentDetails) {
          setAgentDetails(request.agentDetails);
        }
      } else if (request.type === "registration_status_change") {
        console.log("[SoftphoneBar] Registration status change:", {
          status: request.status,
          agentDetails: request.agentDetails,
        });
        setRegistrationStatus(request.status);
        if (request.agentDetails) {
          setAgentDetails(request.agentDetails);
        }
      } else if (request.type === "incoming_call") {
        const raw = request.from || request.number || request.fullUri || "";
        const caller = extractCallerNumber(raw);
        console.log("[SoftphoneBar] Incoming call received:", { raw, caller });
        setIncomingCall(caller || raw);
        setCallState("incoming");
        // Start local ringing tone until answered/ended
        playRingingTone();
      } else if (request.type === "call_state_change") {
        console.log("[SoftphoneBar] Call state change:", request.state);
        setCallState(request.state || "idle");
        if (request.state === "idle") {
          setIncomingCall(null);
          setOnHold(false);
          // Ensure ringing stops when call ends or is cleared
          stopRingingTone();
        }
      } else if (request.type === "hold_state_change") {
        console.log("[SoftphoneBar] Hold state change:", request.isOnHold);
        setOnHold(request.isOnHold);
      } else if (request.type === "mute_state_change") {
        console.log("[SoftphoneBar] Mute state change:", request.isMuted);
        setIsMuted(request.isMuted);
      } else if (request.type === "call_progress") {
        console.log("[SoftphoneBar] Call progress - ringing");
        setCallState("ringing");
        // For outbound calls, rely on provider ringback (no local tone)
      } else if (request.type === "call_confirmed") {
        console.log("[SoftphoneBar] Call confirmed - active");
        setCallState("active");
        // Stop local ringing tone once call is established
        stopRingingTone();
        // Start duration tracking
        const start = Date.now();
        setCallStartAt(start);
        if (callDurationIntervalRef.current) {
          clearInterval(callDurationIntervalRef.current);
        }
        callDurationIntervalRef.current = setInterval(() => {
          setCallDurationSec(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      } else if (request.type === "call_failed") {
        console.log("[SoftphoneBar] ❌ SIP call_failed event:", event);
        setCallState("idle");
        setIncomingCall(null); // Clear incoming call display on failure
        // Stop ringing tone on failure
        stopRingingTone();
        // Reset duration
        if (callDurationIntervalRef.current) {
          clearInterval(callDurationIntervalRef.current);
          callDurationIntervalRef.current = null;
        }
        setCallStartAt(null);
        setCallDurationSec(0);

        // Show appropriate error message based on cause
        if (event && event.cause) {
          console.error("[SoftphoneBar] Call failed with cause:", event.cause);

          // Map JsSIP causes to user-friendly messages
          let errorMessage = "Call failed";
          switch (event.cause) {
            case "Busy":
              errorMessage = "The line is busy";
              break;
            case "Rejected":
              errorMessage = "Call was rejected";
              break;
            case "Unavailable":
              errorMessage = "User is unavailable";
              break;
            case "Not Found":
              errorMessage = "Number not found";
              break;
            case "Canceled":
              errorMessage = "Call was canceled";
              break;
            case "No Answer":
              errorMessage = "No answer";
              break;
            case "Request Timeout":
              errorMessage = "Call timed out";
              break;
            default:
              errorMessage = `Call failed: ${event.cause}`;
          }

          // You can show a notification or update UI with the error message
          console.log(`[SoftphoneBar] ${errorMessage}`);
          // Optionally show an alert or notification
          // alert(errorMessage);
        }
      } else if (request.type === "heartbeat_response") {
        // Heartbeat response received
        setLastUpdate(Date.now());
      } else if (request.type === "logout") {
        // Handle logout and cleanup session
        console.log("[SoftphoneBar] Logout message received");
        handleLogout();
      }
    };
    // Listen for messages from dashboard pages
    const windowListener = (event) => {
      try {
        const data = event.data || {};
        if (data && data.type === "reachmi:call" && data.number) {
          const normalized = normalizeUgNumber(data.number);
          setNumber(normalized);
          if (isCallsEnabled() && hasFeature("webrtc_extension")) {
            setTimeout(() => handleCall(), 50);
          }
        } else if (data && data.type === "reachmi:populate" && data.number) {
          // Populate only; do not auto-dial
          const normalized = normalizeUgNumber(data.number);
          setNumber(normalized);
        }
      } catch (_) {}
    };
    chrome.runtime.onMessage.addListener(messageListener);
    window.addEventListener("message", windowListener);

    // Heartbeat mechanism to monitor background script connection
    const startHeartbeat = () => {
      heartbeatIntervalRef.current = setInterval(() => {
        // Send heartbeat to background script
        chrome.runtime.sendMessage({ type: "heartbeat" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Heartbeat failed:", chrome.runtime.lastError);
            // Don't call attemptReconnection here to avoid loops
          } else {
            setLastUpdate(Date.now());
          }
        });
      }, 5000); // Check every 5 seconds
    };

    // Initial connection and status check
    const initializeConnection = async () => {
      console.log(
        "[SoftphoneBar] Initializing connection, requesting registration status..."
      );

      // Check if user has stored credentials (indicating they were previously logged in)
      try {
        const stored = await chrome.storage.local.get(["user", "token"]);
        const hasCredentials = stored.user && stored.token;

        // Ask the background script for the current status when the bar loads
        chrome.runtime.sendMessage(
          { type: "get_registration_status" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "[SoftphoneBar] Initial connection failed:",
                chrome.runtime.lastError
              );

              // If we have credentials but can't connect, try to re-register
              if (hasCredentials) {
                console.log(
                  "[SoftphoneBar] Has credentials but connection failed, attempting re-registration..."
                );
                setTimeout(() => {
                  handleReregister();
                }, 1000);
              }
            } else {
              console.log(
                "[SoftphoneBar] Initial registration status received:",
                response
              );
              setLastUpdate(Date.now());
              if (response) {
                const status = response.registrationStatus || "Unregistered";
                setRegistrationStatus(status);
                if (response.agentDetails) {
                  setAgentDetails(response.agentDetails);
                }

                // Auto re-register if user has credentials but is unregistered
                if (hasCredentials && status === "Unregistered") {
                  console.log(
                    "[SoftphoneBar] User has credentials but is unregistered, auto re-registering..."
                  );
                  setTimeout(() => {
                    handleReregister();
                  }, 1000);
                }
              }
            }
          }
        );
      } catch (error) {
        console.error(
          "[SoftphoneBar] Error checking stored credentials:",
          error
        );
        // Fallback to basic status check
        chrome.runtime.sendMessage(
          { type: "get_registration_status" },
          (response) => {
            if (!chrome.runtime.lastError && response) {
              setLastUpdate(Date.now());
              setRegistrationStatus(
                response.registrationStatus || "Unregistered"
              );
              if (response.agentDetails) {
                setAgentDetails(response.agentDetails);
              }
            }
          }
        );
      }
    };

    // Fetch license and session info on component mount
    chrome.storage.local.get(
      ["token", "user", "sessionInfo"],
      async (result) => {
        if (result.token) {
          try {
            const licenseData = await licenseService.getCurrentLicense(
              result.token
            );

            const isLicenseValid =
              licenseData.licensed && licenseData.license?.status === "active";
            const licenseStatus = licenseData.license?.status || "unknown";

            // Get current session count
            let sessionInfo = result.sessionInfo || {};
            try {
              const sessionCountData = await licenseService.getSessionCount(
                result.token
              );
              sessionInfo = {
                ...sessionInfo,
                currentUsers: sessionCountData.data.currentUsers,
                maxUsers: sessionCountData.data.maxUsers,
                availableSlots: sessionCountData.data.availableSlots,
              };
            } catch (sessionError) {
              console.warn("Failed to get session count:", sessionError);
            }

            let licenseMessage =
              licenseData.message ||
              (licenseData.licensed
                ? `License Status: ${licenseStatus}`
                : "Invalid License");

            // Add session info to message if available
            if (sessionInfo.maxUsers) {
              licenseMessage += ` (${sessionInfo.currentUsers}/${sessionInfo.maxUsers} users)`;
            }

            // Parse features from license data
            let licenseFeatures = {};
            if (licenseData.license?.license_type?.features) {
              try {
                licenseFeatures =
                  typeof licenseData.license.license_type.features === "string"
                    ? JSON.parse(licenseData.license.license_type.features)
                    : licenseData.license.license_type.features;
              } catch (error) {
                console.warn(
                  "[SoftphoneBar] Error parsing license features:",
                  error
                );
                licenseFeatures = {};
              }
            }

            console.log("[SoftphoneBar] Legacy license data:", {
              isValid: isLicenseValid,
              status: licenseStatus,
              features: licenseFeatures,
              sessionInfo: sessionInfo,
            });

            setLicense({
              isValid: isLicenseValid,
              message: licenseMessage,
              features: licenseFeatures,
              status: licenseStatus,
              sessionInfo: sessionInfo,
            });
          } catch (error) {
            console.error("Error fetching license:", error);
            setLicense({
              isValid: false,
              message: "License check failed",
              features: {},
              status: "error",
            });
          }
        } else {
          setLicense({
            isValid: false,
            message: "No authentication token",
            features: {},
            status: "unauthenticated",
          });
        }
      }
    );

    // Initialize connection and start heartbeat
    initializeConnection();
    startHeartbeat();

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      window.removeEventListener("message", windowListener);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  // Listen for SIP events directly from sipService
  useEffect(() => {
    if (!sipService || !sipService.events) {
      console.warn(
        "[SoftphoneBar] sipService not available for event listening"
      );
      return;
    }

    const handleCallInitiated = (event) => {
      console.log("[SoftphoneBar] 🚀 SIP call_initiated event:", event);
      setCallState("calling");
    };

    const handleCallProgress = (event) => {
      console.log("[SoftphoneBar] 📞 SIP call_progress event:", event);
      // Progress can be 180 (Ringing) or 183 (Session Progress with early media)
      setCallState("ringing");

      // Store progress details if available
      if (event.response) {
        setCallDetails({
          statusCode: event.response.status_code,
          reasonPhrase: event.response.reason_phrase,
          hasEarlyMedia: event.response.status_code === 183,
        });
      }

      // Play local ringing tone
      // Note: If early media (183) is available, the SIP service should play the provider's ringback tone
      // But as a fallback, we'll play our own ringing tone
      playRingingTone();
    };

    const handleCallConfirmed = (event) => {
      console.log("[SoftphoneBar] ✅ SIP call_confirmed event:", event);
      setCallState("active");
      // Stop ringing tone when call is answered
      stopRingingTone();
    };

    const handleCallFailed = (event) => {
      console.log("[SoftphoneBar] ❌ SIP call_failed event:", event);
      setCallState("idle");
      setIncomingCall(null); // Clear incoming call display on failure
      // Stop ringing tone on failure
      stopRingingTone();

      // Show appropriate error message based on cause
      if (event && event.cause) {
        console.error("[SoftphoneBar] Call failed with cause:", event.cause);

        // Map JsSIP causes to user-friendly messages
        let errorMessage = "Call failed";
        switch (event.cause) {
          case "Busy":
            errorMessage = "The line is busy";
            break;
          case "Rejected":
            errorMessage = "Call was rejected";
            break;
          case "Unavailable":
            errorMessage = "User is unavailable";
            break;
          case "Not Found":
            errorMessage = "Number not found";
            break;
          case "Canceled":
            errorMessage = "Call was canceled";
            break;
          case "No Answer":
            errorMessage = "No answer";
            break;
          case "Request Timeout":
            errorMessage = "Call timed out";
            break;
          default:
            errorMessage = `Call failed: ${event.cause}`;
        }

        // You can show a notification or update UI with the error message
        console.log(`[SoftphoneBar] ${errorMessage}`);
        // Optionally show an alert or notification
        // alert(errorMessage);
      }
    };

    const handleCallEnded = (event) => {
      console.log("[SoftphoneBar] 📞 SIP call_ended event:", event);
      setCallState("idle");
      setIncomingCall(null); // Clear incoming call display
      // Stop ringing tone if still playing
      stopRingingTone();
      // Reset duration
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }
      setCallStartAt(null);
      setCallDurationSec(0);

      // Refresh call history after call ends (with a small delay to ensure CDR is updated)
      setTimeout(() => {
        if (showCallHistory || callHistory.length > 0) {
          loadCallHistory();
        }
      }, 2000);
    };

    const handleCallTerminated = () => {
      console.log("[SoftphoneBar] 📞 SIP call_terminated event");
      setCallState("idle");
      setIncomingCall(null); // Clear incoming call display
      // Stop ringing tone if still playing
      stopRingingTone();
      // Reset duration
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }
      setCallStartAt(null);
      setCallDurationSec(0);

      // Refresh call history after call terminates (with a small delay to ensure CDR is updated)
      setTimeout(() => {
        if (showCallHistory || callHistory.length > 0) {
          loadCallHistory();
        }
      }, 2000);
    };

    const handleCallAccepted = () => {
      console.log("[SoftphoneBar] ✅ SIP call_accepted event");
      setCallState("active");
      setIncomingCall(null); // Clear incoming call display when accepted
      // Stop ringing tone when call is accepted
      stopRingingTone();
      // Start duration tracking
      const start = Date.now();
      setCallStartAt(start);
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
      }
      callDurationIntervalRef.current = setInterval(() => {
        setCallDurationSec(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    };

    const handleIncomingCall = (event) => {
      console.log("[SoftphoneBar] 🔔 SIP incoming_call event:", event);
      if (event.detail && event.detail.from) {
        // Sanitize and extract just the digits from any encoded/URI value
        const raw = event.detail.from || "";
        let onlyNumber = raw;
        try {
          const decoded = decodeURIComponent(String(raw));
          const matched = decoded.match(/\+?\d{7,15}/);
          onlyNumber = matched ? matched[0] : raw;
        } catch (_) {
          const matched = String(raw).match(/\+?\d{7,15}/);
          onlyNumber = matched ? matched[0] : raw;
        }
        setIncomingCall(onlyNumber);
        setCallState("incoming");
        // Start local ringing tone
        playRingingTone();
      }
    };

    const handleHoldStateChange = (event) => {
      console.log("[SoftphoneBar] ⏸️ SIP hold_state_change event:", event);
      if (event.detail) {
        setOnHold(event.detail.onHold);
      }
    };

    const handleMuteStateChange = (event) => {
      console.log("[SoftphoneBar] 🔇 SIP mute_state_change event:", event);
      if (event.detail) {
        setIsMuted(event.detail.isMuted);
      }
    };

    // NEW: Registration lifecycle hooks to keep UI in sync with server
    const onRegistered = () => {
      console.log("[SoftphoneBar] ✅ SIP registered event");
      setRegistrationStatus("Registered");
    };
    const onUnregistered = () => {
      console.log("[SoftphoneBar] ❌ SIP unregistered event");
      setRegistrationStatus("Unregistered");
    };
    const onRegistrationFailed = () => {
      console.log("[SoftphoneBar] ❌ SIP registrationFailed event");
      setRegistrationStatus("Registration Failed");
    };
    const onWsConnected = () => {
      console.log("[SoftphoneBar] 🔌 WS connected");
      // keep existing status
    };
    const onWsDisconnected = () => {
      console.log("[SoftphoneBar] 🔌 WS disconnected");
      // If transport drops, consider not registered anymore
      setRegistrationStatus((prev) =>
        prev === "Registered" ? "Unregistered" : prev
      );
    };

    // Add event listeners
    sipService.events.on("call_initiated", handleCallInitiated);
    sipService.events.on("call_progress", handleCallProgress);
    sipService.events.on("call_confirmed", handleCallConfirmed);
    sipService.events.on("call_failed", handleCallFailed);
    sipService.events.on("call_ended", handleCallEnded);
    sipService.events.on("call_terminated", handleCallTerminated);
    sipService.events.on("call_accepted", handleCallAccepted);
    sipService.events.on("incoming_call", handleIncomingCall);
    sipService.events.on("hold_state_change", handleHoldStateChange);
    sipService.events.on("mute_state_change", handleMuteStateChange);

    // Registration lifecycle
    sipService.events.on("registered", onRegistered);
    sipService.events.on("unregistered", onUnregistered);
    sipService.events.on("registrationFailed", onRegistrationFailed);
    sipService.events.on("ws:connected", onWsConnected);
    sipService.events.on("ws:disconnected", onWsDisconnected);

    // Cleanup
    return () => {
      sipService.events.off("call_initiated", handleCallInitiated);
      sipService.events.off("call_progress", handleCallProgress);
      sipService.events.off("call_confirmed", handleCallConfirmed);
      sipService.events.off("call_failed", handleCallFailed);
      sipService.events.off("call_ended", handleCallEnded);
      sipService.events.off("call_terminated", handleCallTerminated);
      sipService.events.off("call_accepted", handleCallAccepted);
      sipService.events.off("incoming_call", handleIncomingCall);
      sipService.events.off("hold_state_change", handleHoldStateChange);
      sipService.events.off("mute_state_change", handleMuteStateChange);
      sipService.events.off("registered", onRegistered);
      sipService.events.off("unregistered", onUnregistered);
      sipService.events.off("registrationFailed", onRegistrationFailed);
      sipService.events.off("ws:connected", onWsConnected);
      sipService.events.off("ws:disconnected", onWsDisconnected);
      // Clean up ringing tone
      stopRingingTone();
    };
  }, []);

  // Listen for clicks on Zoho CRM phone icons (zpb-phone) and prompt for call app
  useEffect(() => {
    // Load stored preference
    try {
      chrome.storage?.local?.get(["callPreference"], (res) => {
        if (res && res.callPreference) {
          setCallPreference(res.callPreference);
        }
      });
    } catch (_) {}

    const isZoho = () =>
      /\.zoho\./i.test(window.location.hostname) ||
      /crm\.zoho\.com/i.test(window.location.href);

    if (!isZoho()) return;

    const normalizeUg = (raw) => {
      if (!raw) return "";
      const digits = String(raw).replace(/\D/g, "");
      if (!digits) return "";
      if (digits.startsWith("256") && digits.length >= 11) {
        const local = digits.slice(3);
        return `0${local.replace(/^0+/, "")}`.slice(0, 10);
      }
      if (digits.startsWith("0")) return digits.slice(0, 10);
      if (digits.length === 9) return `0${digits}`;
      return digits;
    };

    const findPhoneTarget = (evt) => {
      const path = (
        typeof evt.composedPath === "function" ? evt.composedPath() : []
      ).concat([evt.target]);
      for (const node of path) {
        if (!node || !node.closest) continue;
        const el = node.closest(
          ".zpb-phone,[zpb-phone],a[lt-prop-title='Call'],a[title='Call'],.cPxPhoneViewZPBEnabledCurPreventClick,.cPxPrevAriaActive,a[href^='tel:']"
        );
        if (el) return el;
      }
      return null;
    };

    const extractNumber = (el) => {
      if (!el) return "";
      let phoneNumber =
        el.getAttribute("lt-prop-value") ||
        el.getAttribute("data-number") ||
        el.getAttribute("data-phone") ||
        el.getAttribute("number") ||
        el.getAttribute("phone");
      if (!phoneNumber && el.tagName === "A") {
        const href = el.getAttribute("href") || "";
        if (/^tel:/i.test(href)) phoneNumber = href.replace(/^tel:/i, "");
      }
      if (!phoneNumber) {
        const row = el.closest("tr") || el.closest("[role='row']");
        const text = row ? row.textContent || "" : el.textContent || "";
        const match = text.match(/\+?\d[\d\s()\-]{6,}/);
        if (match) phoneNumber = match[0];
      }
      return phoneNumber || "";
    };

    const handleClick = (evt) => {
      try {
        const target = findPhoneTarget(evt);
        if (!target) return;
        let phoneNumber = extractNumber(target);

        if (!phoneNumber) return;

        const normalized = normalizeUg(phoneNumber);
        if (!normalized) return;

        // Respect saved preference
        if (callPreference === "mayday") {
          evt.preventDefault();
          evt.stopPropagation();
          if (typeof evt.stopImmediatePropagation === "function") {
            evt.stopImmediatePropagation();
          }
          setNumber(normalized);
          return;
        }

        if (callPreference === "zoho") {
          // Let Zoho proceed (FaceTime prompt), but still prefill our input for convenience
          setNumber(normalized);
          return;
        }

        // No preference set: show inline choice popover and block default
        evt.preventDefault();
        evt.stopPropagation();
        if (typeof evt.stopImmediatePropagation === "function") {
          evt.stopImmediatePropagation();
        }
        setCallChoicePrompt({
          visible: true,
          number: normalized,
          x: evt.clientX || 24,
          y: evt.clientY || 24,
        });
      } catch (e) {
        // no-op
      }
    };

    // Early-phase handlers to block FaceTime before Zoho handles the click
    const handlePointerDown = (evt) => {
      const target = findPhoneTarget(evt);
      if (!target) return;
      // Only block if we plan to use Mayday or prompt
      if (callPreference === "zoho") return; // let Zoho proceed
      evt.preventDefault();
      evt.stopPropagation();
      if (typeof evt.stopImmediatePropagation === "function") {
        evt.stopImmediatePropagation();
      }
    };

    // Use capture to ensure we see the event even if Zoho stops propagation
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [callPreference]);

  // Handle logout and session cleanup
  const handleLogout = async () => {
    try {
      // End the user session on the backend
      try {
        const userInfo = await new Promise((resolve) =>
          chrome.storage.local.get("user", (result) => resolve(result.user))
        );
        if (userInfo && userInfo.username) {
          await licenseService.endUserSession(userInfo.username);
        }
      } catch (sessionError) {
        console.error("Error ending user session:", sessionError);
      }
      // Explicitly unregister from SIP and disconnect
      try {
        await sipService.unregister?.();
      } catch (_) {}
      try {
        await sipService.disconnect?.();
      } catch (_) {}

      // Notify background script
      chrome.runtime.sendMessage({ type: "logout" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error sending logout message:",
            chrome.runtime.lastError
          );
        } else {
          console.log("Logout message sent successfully:", response);
        }
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Ensure we unregister on page unload to keep server state clean
  useEffect(() => {
    const onUnload = () => {
      try {
        sipService.unregister?.();
      } catch (_) {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // Backend health monitoring
  useEffect(() => {
    // Initial health check
    checkBackendHealth();

    // Set up periodic health checks every 30 seconds
    const healthCheckInterval = setInterval(() => {
      checkBackendHealth();
    }, 30000);

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, []);

  // Backend health status functions
  const getBackendHealthColor = (health) => {
    switch (health) {
      case "healthy":
        return "#27ae60"; // green
      case "degraded":
        return "#f39c12"; // orange
      case "unhealthy":
      case "Unreachable":
        return "#c0392b"; // red
      default:
        return "#7f8c8d"; // grey
    }
  };

  const getBackendHealthIcon = (health) => {
    const spinStyle = {
      animation: "spin 1s linear infinite",
    };

    switch (health) {
      case "healthy":
        return <FaServer style={{ color: "#27ae60" }} />;
      case "degraded":
        return <FaExclamationTriangle style={{ color: "#f39c12" }} />;
      case "unhealthy":
      case "Unreachable":
        return <FaTimesCircle style={{ color: "#c0392b" }} />;
      case "Unknown":
        return <FaSpinner style={{ color: "#7f8c8d", ...spinStyle }} />;
      default:
        return <FaServer style={{ color: "#7f8c8d" }} />;
    }
  };

  const getSipStatusColor = (status) => {
    switch (status) {
      case "Registered":
        return "#27ae60"; // green
      case "Unregistered":
        return "#f39c12"; // orange
      case "Registration Failed":
        return "#c0392b"; // red
      case "Not Authenticated":
        return "#7f8c8d"; // grey
      default:
        return "#7f8c8d"; // grey
    }
  };

  // Function to play ringing tone
  const playRingingTone = () => {
    // Create audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    // Try to resume if the context is suspended (browser autoplay policies)
    if (audioContextRef.current.state === "suspended") {
      try {
        audioContextRef.current.resume();
      } catch (_) {}
    }

    // Clear any existing ringing interval
    if (ringingIntervalRef.current) {
      clearInterval(ringingIntervalRef.current);
    }

    let ringCount = 0;

    const playRingPattern = () => {
      if (ringCount % 2 === 0) {
        // Play the ring tone (two beeps)
        playTone(440, 200); // First beep
        setTimeout(() => playTone(440, 200), 300); // Second beep
      }
      // Silence for the other half of the pattern
      ringCount++;
    };

    // Play immediately
    playRingPattern();

    // Then repeat every 1 second
    ringingIntervalRef.current = setInterval(playRingPattern, 1000);
  };

  const stopRingingTone = () => {
    if (ringingIntervalRef.current) {
      clearInterval(ringingIntervalRef.current);
      ringingIntervalRef.current = null;
    }
  };

  // Proactively unlock/resume AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
        setShowAudioUnlock(false);
      } catch (_) {}
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("click", unlock, true);
    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("keydown", unlock, true);
    // If Chrome blocked audio, show a small banner until user interacts
    try {
      if (
        audioContextRef.current &&
        audioContextRef.current.state === "suspended"
      ) {
        setShowAudioUnlock(true);
      }
    } catch (_) {}
    return () => {
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  // Modified playTone function to support duration
  const playTone = (frequency, duration = 100) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    // Ensure context is running
    if (audioContextRef.current.state === "suspended") {
      try {
        audioContextRef.current.resume();
      } catch (_) {}
    }
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    oscillator.type = "sine";
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    oscillator.frequency.value = frequency;
    const now = audioContextRef.current.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    oscillator.start(now);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, now + duration / 1000);
    oscillator.stop(now + duration / 1000);
  };

  const dtmfFrequencies = {
    1: 697,
    2: 697,
    3: 697,
    4: 770,
    5: 770,
    6: 770,
    7: 852,
    8: 852,
    9: 852,
    "*": 941,
    0: 941,
    "#": 941,
  };

  const handleKeyPress = (key) => {
    setNumber(number + key);
    playTone(dtmfFrequencies[key]);
  };

  const handleDelete = () => {
    setNumber(number.slice(0, -1));
  };

  const handleClearField = () => {
    setNumber("");
  };

  const handleNumberInputChange = (e) => {
    const newValue = e.target.value;
    const lastChar = newValue[newValue.length - 1];

    // Only play tone if a valid DTMF character was added
    if (newValue.length > number.length && dtmfFrequencies[lastChar]) {
      playTone(dtmfFrequencies[lastChar]);
    }

    setNumber(newValue);
  };

  const handleNumberInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (number && isCallsEnabled() && hasFeature("webrtc_extension")) {
        handleCall();
      }
    }
  };

  const handleCall = () => {
    console.log("[SoftphoneBar] 🚀 handleCall initiated");
    console.log("[SoftphoneBar] Current callState before call:", callState);
    console.log("[SoftphoneBar] Call parameters:", {
      number: number,
      isAuthenticated: isAuthenticated,
      isCallsEnabled: isCallsEnabled(),
      licenseStatus: licenseInfo.status,
      registrationStatus: registrationStatus,
      hasWebrtcFeature: hasFeature("webrtc_extension"),
      featuresCount: Object.keys(licenseInfo.features).length,
    });

    if (!isAuthenticated) {
      console.error("[SoftphoneBar] ❌ Call failed: Not authenticated");
      alert("Please login to make calls");
      return;
    }

    if (!isCallsEnabled()) {
      console.error("[SoftphoneBar] ❌ Call failed: Calls not enabled", {
        licenseStatus: licenseInfo.status,
        licenseMessage: licenseInfo.message,
      });
      alert(
        `Calls are disabled. License status: ${licenseInfo.status}. ${licenseInfo.message}`
      );
      return;
    }

    if (!number || number.trim() === "") {
      console.error("[SoftphoneBar] ❌ Call failed: No number provided");
      alert("Please enter a phone number");
      return;
    }

    // Don't manually set state - let SIP events handle it
    // The sipService will emit "call_initiated" which will set state to "calling"

    console.log(
      "[SoftphoneBar] ✅ Sending make_call message to background script"
    );
    chrome.runtime.sendMessage(
      { type: "make_call", number: number },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[SoftphoneBar] ❌ Background script message failed:",
            chrome.runtime.lastError
          );
          // Don't set state to idle here, let the SIP events handle it
        } else {
          console.log(
            "[SoftphoneBar] ✅ Background script responded:",
            response
          );
        }
      }
    );
  };

  const handleHangup = () => {
    console.log("[SoftphoneBar] 🚀 handleHangup called");
    console.log("[SoftphoneBar] Current call state:", callState);

    // Provide feedback based on current call state
    let action = "ending";
    switch (callState) {
      case "calling":
        action = "canceling dial";
        break;
      case "ringing":
        action = "canceling call";
        break;
      case "incoming":
        action = "rejecting call";
        break;
      case "active":
        action = "hanging up";
        break;
    }

    console.log(`[SoftphoneBar] Call ${action}...`);

    // Since we're making calls through content script's sipService,
    // we should hangup through it as well
    if (sipService && sipService.hangupCall) {
      console.log("[SoftphoneBar] Calling sipService.hangupCall()");
      sipService.hangupCall();

      // For user-initiated cancellations, we can immediately update the UI
      if (callState === "calling" || callState === "ringing") {
        // Stop ringing tone immediately for better UX
        stopRingingTone();
        console.log(`[SoftphoneBar] Call ${action} initiated by user`);
      }
    } else {
      // Fallback to background script method
      console.log("[SoftphoneBar] Falling back to background script hangup");
      chrome.runtime.sendMessage({ type: "hangup_call" });
    }
  };

  const handleAnswer = () => {
    if (!isCallsEnabled()) {
      alert(
        `Cannot answer calls. License status: ${licenseInfo.status}. ${licenseInfo.message}`
      );
      return;
    }

    console.log("[SoftphoneBar] 🚀 handleAnswer called");
    if (sipService && sipService.answerCall) {
      console.log("[SoftphoneBar] Calling sipService.answerCall()");
      sipService.answerCall();
    } else {
      console.log("[SoftphoneBar] Falling back to background script answer");
      chrome.runtime.sendMessage({ type: "answer_call" });
    }
  };

  const handleHold = () => {
    console.log("[SoftphoneBar] 🚀 handleHold called");
    if (sipService && sipService.hold) {
      console.log("[SoftphoneBar] Calling sipService.hold()");
      sipService.hold();
    } else {
      console.log("[SoftphoneBar] Falling back to background script hold");
      chrome.runtime.sendMessage({ type: "hold_call" });
    }
  };

  const handleUnhold = () => {
    console.log("[SoftphoneBar] 🚀 handleUnhold called");
    if (sipService && sipService.hold) {
      console.log("[SoftphoneBar] Calling sipService.hold() to unhold");
      sipService.hold(); // hold() toggles hold state
    } else {
      console.log("[SoftphoneBar] Falling back to background script unhold");
      chrome.runtime.sendMessage({ type: "unhold_call" });
    }
  };

  const handleTransfer = (transferNumber) => {
    console.log(
      "[SoftphoneBar] 🚀 handleTransfer called with:",
      transferNumber
    );
    if (sipService && sipService.transfer) {
      console.log("[SoftphoneBar] Calling sipService.transfer()");
      sipService.transfer(transferNumber);
    } else {
      console.log("[SoftphoneBar] Falling back to background script transfer");
      chrome.runtime.sendMessage({
        type: "transfer_call",
        number: transferNumber,
      });
    }
    setShowTransferDialog(false);
  };

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    console.log(
      "[SoftphoneBar] 🚀 handleToggleMute called, new state:",
      newMutedState
    );
    if (sipService && sipService.toggleMute) {
      console.log("[SoftphoneBar] Calling sipService.toggleMute()");
      sipService.toggleMute();
    } else {
      console.log("[SoftphoneBar] Falling back to background script mute");
      chrome.runtime.sendMessage({ type: "toggle_mute", mute: newMutedState });
    }
  };

  const handleUnregister = () => {
    chrome.runtime.sendMessage({ type: "unregister" });
  };

  const handleReregister = () => {
    chrome.runtime.sendMessage({ type: "reregister" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[SoftphoneBar] Re-register message failed:",
          chrome.runtime.lastError
        );
      } else {
      }
    });
  };

  // Status icon functions
  const getSipIcon = (status) => {
    switch (status) {
      case "Registered":
        return <FaCheckCircle style={{ color: "#27ae60" }} />;
      case "Unregistered":
        return <FaExclamationCircle style={{ color: "#f39c12" }} />;
      case "Registration Failed":
        return <FaTimesCircle style={{ color: "#c0392b" }} />;
      case "Not Authenticated":
        return <FaUserCircle style={{ color: "#7f8c8d" }} />;
      default:
        return <FaExclamationCircle style={{ color: "#7f8c8d" }} />;
    }
  };

  // Remove old status functions
  const getStatusColor = getSipStatusColor; // Keep for backward compatibility

  const Dialpad = () => {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            title={`Dial ${key}`}
            style={{
              padding: "12px",
              fontSize: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            {key}
          </button>
        ))}
        <button
          onClick={handleDelete}
          title="Delete last digit"
          style={{
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            gridColumn: "span 3",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.02)";
            e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          }}
        >
          <FaBackspace />
        </button>
      </div>
    );
  };

  const IconButton = ({
    icon,
    onClick,
    color,
    disabled,
    title,
    style = {},
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: "none",
        border: "none",
        color: disabled ? "#555" : color || "white",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: height > 100 ? "26px" : height > 80 ? "24px" : "22px",
        margin: "0 10px",
        transition: "all 0.2s ease",
        padding: height > 100 ? "10px" : height > 80 ? "9px" : "8px", // Add padding for larger clickable area
        borderRadius: "4px", // Add rounded corners
        minWidth: height > 100 ? "44px" : height > 80 ? "42px" : "40px", // Ensure minimum width
        minHeight: height > 100 ? "44px" : height > 80 ? "42px" : "40px", // Ensure minimum height
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.transform = "scale(1.1)";
          e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"; // Add hover background
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.transform = "scale(1)";
          e.target.style.backgroundColor = "transparent";
        }
      }}
    >
      {icon}
    </button>
  );

  return (
    <>
      {/* License Warning Banner - shown if license is invalid or expired */}
      {isAuthenticated && !licenseInfo.valid && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            backgroundColor: "#e74c3c",
            color: "white",
            padding: "8px 20px",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: "600",
            zIndex: 10001,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          ⚠️ {licenseInfo.message} - Softphone functionality is disabled
        </div>
      )}

      {/* Pause Status Banner - shown when agent is paused */}
      {isAuthenticated && licenseInfo.valid && isPaused && (
        <div
          style={{
            position: "fixed",
            top: isAuthenticated && !licenseInfo.valid ? "44px" : 0,
            left: 0,
            width: "100%",
            backgroundColor: "#f39c12",
            color: "white",
            padding: "6px 20px",
            textAlign: "center",
            fontSize: "13px",
            fontWeight: "600",
            zIndex: 10001,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          ⏸️ You are paused{pauseReason ? ` (${pauseReason})` : ""} - Not
          receiving calls
        </div>
      )}

      <div
        ref={softphoneBarRef}
        style={{
          position: "fixed",
          top: (() => {
            let topOffset = 0;
            if (isAuthenticated && !licenseInfo.valid) topOffset += 44; // License banner
            if (isAuthenticated && licenseInfo.valid && isPaused)
              topOffset += 36; // Pause banner
            return `${topOffset}px`;
          })(),
          left: 0,
          width: "100%",
          height: `${height}px`,
          backgroundColor: isAuthenticated
            ? licenseInfo.valid
              ? "rgba(26, 42, 58, 0.8)"
              : "rgba(189, 195, 199, 0.8)" // Grey for invalid license
            : "rgba(95, 39, 205, 0.8)", // Purple for unauthenticated
          backdropFilter: "blur(10px)",
          color: "white",
          padding: "5px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 10000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
        }}
      >
        {/* Audio unlock prompt (Chrome autoplay policy) */}
        {showAudioUnlock && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 12,
              backgroundColor: "rgba(39, 174, 96, 0.15)",
              border: "1px solid rgba(39, 174, 96, 0.5)",
              color: "#ecf0f1",
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: "11px",
              cursor: "pointer",
            }}
            onClick={() => {
              try {
                if (!audioContextRef.current) {
                  audioContextRef.current = new (window.AudioContext ||
                    window.webkitAudioContext)();
                }
                audioContextRef.current.resume();
              } catch (_) {}
              setShowAudioUnlock(false);
            }}
            title="Click to enable sound for ringing"
          >
            🔊 Enable sound
          </div>
        )}
        {/* Top resize handle */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            cursor: "ns-resize",
            backgroundColor: "transparent",
            zIndex: 10001,
            transition: "background-color 0.2s ease",
          }}
          onMouseDown={onResizeStart}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
          title="Drag to resize height (60-200px)"
        />

        {/* Bottom resize handle */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            cursor: "ns-resize",
            backgroundColor: "transparent",
            zIndex: 10001,
            transition: "background-color 0.2s ease",
          }}
          onMouseDown={onResizeStart}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
          title="Drag to resize height (60-200px)"
        />

        {/* Main content container */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flex: 1,
            minHeight: 0,
            padding: height > 80 ? "8px 0" : "5px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                fontWeight: "bold",
                fontSize: height > 100 ? "20px" : height > 80 ? "18px" : "16px",
                marginRight: "15px",
              }}
            >
              Mayday{" "}
              {!isAuthenticated && (
                <span style={{ fontSize: "12px", opacity: 0.8 }}>(Demo)</span>
              )}
              {isAuthenticated && !licenseInfo.valid && (
                <span style={{ fontSize: "12px", opacity: 0.8 }}>
                  ({licenseInfo.status})
                </span>
              )}
            </div>
            <FaUserCircle
              size={height > 100 ? 32 : height > 80 ? 28 : 24}
              style={{ marginRight: "10px" }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: "15px",
                minWidth: "140px",
              }}
            >
              {/* User Name and Status */}
              <div
                style={{
                  fontWeight: "bold",
                  fontSize:
                    height > 100 ? "16px" : height > 80 ? "14px" : "12px",
                  textTransform: "capitalize",
                  marginBottom: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{agentDetails.username || "Agent"}</span>
                {isAuthenticated && licenseInfo.valid && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "normal",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      backgroundColor:
                        pauseService.getPauseStatusColor(isPaused),
                      color: "white",
                      opacity: 0.9,
                    }}
                    title={
                      pauseReason
                        ? `Paused: ${pauseReason}`
                        : isPaused
                        ? "Paused"
                        : "Available"
                    }
                  >
                    {isPaused ? "PAUSED" : "AVAIL"}
                  </span>
                )}
              </div>

              {/* Status Indicators Container */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {/* SIP Registration Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize:
                      height > 100 ? "12px" : height > 80 ? "11px" : "10px",
                  }}
                >
                  {getSipIcon(registrationStatus)}
                  <span
                    style={{ color: getSipStatusColor(registrationStatus) }}
                  >
                    {registrationStatus}
                  </span>
                  {agentDetails.extension && (
                    <span
                      style={{
                        color: "#ccc",
                        fontSize: height > 100 ? "11px" : "10px",
                      }}
                    >
                      ({agentDetails.extension})
                    </span>
                  )}
                </div>

                {/* Backend Health Status - only show if authenticated and license is valid */}
                {isAuthenticated && licenseInfo.valid && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: height > 100 ? "11px" : "10px",
                    }}
                  >
                    {getBackendHealthIcon(backendHealth)}
                    <span
                      style={{ color: getBackendHealthColor(backendHealth) }}
                    >
                      {backendHealth === "healthy"
                        ? "Backend Healthy"
                        : backendHealth === "degraded"
                        ? "Backend Degraded"
                        : backendHealth === "unhealthy" ||
                          backendHealth === "Unreachable"
                        ? "Backend Unhealthy"
                        : `Backend ${backendHealth}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Authentication-specific buttons */}
            {isAuthenticated && licenseInfo.valid && (
              <>
                {/* Logout Button */}
                <IconButton
                  icon={<FaSignOutAlt />}
                  onClick={handleLogout}
                  color="#e74c3c"
                  title="Logout and end session"
                  style={{
                    margin: "0 10px 0 0",
                    fontSize: "16px",
                  }}
                />

                {/* Unregister Button */}
                {registrationStatus === "Registered" && (
                  <IconButton
                    icon={<FaSignOutAlt />}
                    onClick={handleUnregister}
                    color="#f39c12"
                    title="Unregister from SIP server"
                    style={{
                      margin: "0 10px 0 0",
                      fontSize: "14px",
                    }}
                  />
                )}
                {/* Re-register Button */}
                {registrationStatus === "Unregistered" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      margin: "0 15px 0 0",
                    }}
                  >
                    <IconButton
                      icon={<FaServer />}
                      onClick={handleReregister}
                      color="#3498db"
                      title="Re-register with server"
                      style={{
                        margin: "0 8px 0 0",
                        fontSize: "18px",
                        backgroundColor: "rgba(52, 152, 219, 0.1)",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #3498db",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#3498db",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      onClick={handleReregister}
                    >
                      Register
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Debug: Show current status */}
            {process.env.NODE_ENV === "development" && (
              <div
                style={{ fontSize: "10px", color: "#ccc", margin: "0 10px" }}
              >
                Status: "{registrationStatus}" | Auth:{" "}
                {isAuthenticated ? "Yes" : "No"} | License: {licenseInfo.status}
                {licenseInfo.currentUsers && (
                  <span>
                    {" "}
                    | Users: {licenseInfo.currentUsers}/{licenseInfo.maxUsers}
                  </span>
                )}
                <br />
                Call: "{callState}" | Number: "{number}" | Enabled:{" "}
                {isCallsEnabled() ? "Yes" : "No"} | WebRTC:{" "}
                {hasFeature("webrtc_extension") ? "Yes" : "No"} | Features:{" "}
                {Object.keys(licenseInfo.features).length}
                <br />
                Paused: {isPaused ? "Yes" : "No"} | Reason: "
                {pauseReason || "None"}" | Loading:{" "}
                {pauseLoading ? "Yes" : "No"}
              </div>
            )}

            {/* Vertical line */}
            <div
              style={{
                width: "1px",
                height: "24px",
                backgroundColor: "#fff",
                margin: "0 3px",
                opacity: 0.5,
              }}
            />

            {/* Pause button - only show if authenticated and license is valid */}
            {isAuthenticated && licenseInfo.valid && (
              <IconButton
                icon={
                  pauseLoading ? (
                    <FaSpinner
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <MdPauseCircleFilled />
                  )
                }
                onClick={handlePauseToggle}
                color={isPaused ? "#f39c12" : "#fff"}
                title={
                  pauseLoading
                    ? "Updating..."
                    : pauseService.getPauseButtonTitle(isPaused)
                }
                style={{ margin: "0 0 0 -2px" }}
                disabled={pauseLoading}
              />
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "nowrap",
            }}
          >
            {incomingCall ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  backgroundColor: "#1f2937", // slate-800
                  border: "2px solid #10b981", // emerald-500
                  borderRadius: "12px",
                  boxShadow: "0 0 0 0 rgba(16,185,129,0.7)",
                  animation:
                    "incomingCallGlow 2s ease-in-out infinite, incomingCallShake 0.5s ease-in-out infinite, incomingCallBounce 2s ease-in-out infinite",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "rgba(99, 102, 241, 0.08)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    boxShadow:
                      "0 8px 24px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    animation: "incomingCallPulse 1.5s ease-in-out infinite",
                    gap: "8px",
                    animation: "incomingCallPulse 1.5s ease-in-out infinite",
                  }}
                >
                  <FaPhone
                    style={{
                      color: "#10b981",
                      fontSize: "18px",
                      animation: "ring 1s ease-in-out infinite",
                    }}
                  />
                  <p
                    style={{
                      margin: "0",
                      color: "#ecf0f1",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Incoming: {incomingCall}
                  </p>
                </div>
                <IconButton
                  icon={<FaPhone />}
                  onClick={handleAnswer}
                  color="#27ae60"
                  title={
                    isCallsEnabled()
                      ? "Answer incoming call - Accept"
                      : `Calls disabled - License ${licenseInfo.status}`
                  }
                  disabled={!isCallsEnabled()}
                  style={{
                    backgroundColor: "rgba(39, 174, 96, 0.2)",
                    border: "1px solid rgba(39, 174, 96, 0.5)",
                    borderRadius: "10px",
                    padding: "8px",
                    margin: "0 5px 0 0",
                  }}
                />
                <IconButton
                  icon={<FaPhoneSlash />}
                  onClick={handleHangup}
                  color="#e74c3c"
                  title="Reject incoming call - Decline"
                  disabled={!isAuthenticated}
                  style={{
                    backgroundColor: "rgba(17, 47, 38, 0.62)",
                    border: "1px solid rgba(197, 231, 60, 0.5)",
                    borderRadius: "10px",
                    padding: "8px",
                  }}
                />
              </div>
            ) : (
              <>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {/* License Status Indicator - moved here */}
                  {isAuthenticated && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginRight: "8px",
                      }}
                      title={getLicenseTooltip()}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: getLicenseStatusColor(),
                          border: "1px solid rgba(255, 255, 255, 0.3)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          color: getLicenseStatusColor(),
                          fontWeight: "500",
                          textTransform: "capitalize",
                        }}
                      >
                        {licenseInfo.status === "unauthenticated"
                          ? "Auth"
                          : licenseInfo.status}
                      </span>
                    </div>
                  )}

                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <input
                      type="text"
                      value={number}
                      onChange={handleNumberInputChange}
                      onKeyDown={handleNumberInputKeyDown}
                      placeholder={
                        !isAuthenticated
                          ? "Login required for calls"
                          : !isCallsEnabled()
                          ? `License ${licenseInfo.status} - Calls disabled`
                          : !hasFeature("webrtc_extension") &&
                            Object.keys(licenseInfo.features).length > 0
                          ? "WebRTC extension not licensed"
                          : "Enter Number..."
                      }
                      title="Enter phone number"
                      disabled={
                        !isCallsEnabled() ||
                        (!hasFeature("webrtc_extension") &&
                          Object.keys(licenseInfo.features).length > 0)
                      }
                      style={{
                        padding:
                          height > 100
                            ? "10px 14px"
                            : height > 80
                            ? "9px 13px"
                            : "8px 12px",
                        paddingRight: number
                          ? "35px"
                          : height > 100
                          ? "14px"
                          : height > 80
                          ? "13px"
                          : "12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        backgroundColor:
                          isCallsEnabled() && hasFeature("webrtc_extension")
                            ? "rgba(255, 255, 255, 0.15)"
                            : "rgba(255, 255, 255, 0.08)",
                        color:
                          isCallsEnabled() && hasFeature("webrtc_extension")
                            ? "white"
                            : "#ccc",
                        width: "150px",
                        fontSize:
                          height > 100 ? "14px" : height > 80 ? "13px" : "12px",
                        outline: "none",
                        transition: "all 0.2s ease",
                        "::placeholder": {
                          color: "rgba(255, 255, 255, 0.6)",
                        },
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(255, 255, 255, 0.6)";
                        e.target.style.backgroundColor =
                          "rgba(255, 255, 255, 0.2)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
                        e.target.style.backgroundColor =
                          isCallsEnabled() && hasFeature("webrtc_extension")
                            ? "rgba(255, 255, 255, 0.15)"
                            : "rgba(255, 255, 255, 0.08)";
                      }}
                    />
                    {number && (
                      <button
                        onClick={handleClearField}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "rgba(255, 255, 255, 0.7)",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "2px",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = "rgba(255, 255, 255, 0.9)";
                          e.target.style.backgroundColor =
                            "rgba(255, 255, 255, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = "rgba(255, 255, 255, 0.7)";
                          e.target.style.backgroundColor = "transparent";
                        }}
                        title="Clear field"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                  <IconButton
                    icon={<FaKeyboard />}
                    onClick={() => setShowDialpad(!showDialpad)}
                    color="#fff"
                    title={showDialpad ? "Hide dialpad" : "Show dialpad"}
                    style={{ margin: "0 0 0 4px" }}
                    disabled={
                      !hasFeature("webrtc_extension") &&
                      Object.keys(licenseInfo.features).length > 0
                    }
                  />
                </div>

                {callState === "idle" ? (
                  <IconButton
                    icon={<FaPhone />}
                    onClick={handleCall}
                    color={
                      isCallsEnabled() &&
                      hasFeature("webrtc_extension") &&
                      number &&
                      number.trim() !== ""
                        ? "#27ae60"
                        : "#7f8c8d"
                    }
                    disabled={
                      !number ||
                      !isCallsEnabled() ||
                      (!hasFeature("webrtc_extension") &&
                        Object.keys(licenseInfo.features).length > 0)
                    }
                    title={
                      !isAuthenticated
                        ? "Login required to make calls"
                        : !isCallsEnabled()
                        ? `Calls disabled - License ${licenseInfo.status}`
                        : !hasFeature("webrtc_extension") &&
                          Object.keys(licenseInfo.features).length > 0
                        ? "WebRTC extension feature not licensed"
                        : !number
                        ? "Enter a number to call"
                        : "Make call"
                    }
                  />
                ) : callState === "calling" ? (
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <IconButton
                      icon={<FaPhoneSlash />}
                      onClick={handleHangup}
                      color="#f39c12"
                      title="Cancel Dialing"
                      disabled={!isAuthenticated}
                      style={{
                        animation: "pulse 1s ease-in-out infinite",
                        position: "relative",
                        zIndex: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    >
                      <FaSpinner
                        style={{
                          fontSize: "16px",
                          color: "#f39c12",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    </div>
                  </div>
                ) : callState === "ringing" ? (
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <IconButton
                      icon={<FaPhoneSlash />}
                      onClick={handleHangup}
                      color="#e74c3c"
                      title="Cancel ringing call"
                      disabled={!isAuthenticated}
                      style={{
                        animation: "pulse 1.5s ease-in-out infinite",
                        position: "relative",
                        zIndex: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    >
                      <FaPhone
                        style={{
                          fontSize: "16px",
                          color: "#e74c3c",
                          animation: "ring 2s ease-in-out infinite",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <IconButton
                    icon={<FaPhoneSlash />}
                    onClick={handleHangup}
                    color="#e74c3c"
                    title="End active call"
                    disabled={!isAuthenticated}
                  />
                )}
              </>
            )}

            {callState === "active" &&
              isAuthenticated &&
              licenseInfo.valid &&
              (hasFeature("webrtc_extension") ||
                Object.keys(licenseInfo.features).length === 0) && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#ecf0f1",
                      padding: "2px 6px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 6,
                      marginRight: 4,
                      minWidth: 48,
                      textAlign: "center",
                    }}
                    title="Call duration"
                  >
                    {String(Math.floor(callDurationSec / 60)).padStart(2, "0")}:
                    {String(callDurationSec % 60).padStart(2, "0")}
                  </span>
                  <IconButton
                    icon={onHold ? <FaPlay /> : <FaPause />}
                    onClick={onHold ? handleUnhold : handleHold}
                    color="#f39c12"
                    title={onHold ? "Unhold call" : "Hold call"}
                  />
                  <IconButton
                    icon={<FaExchangeAlt />}
                    onClick={() => setShowTransferDialog(true)}
                    color="#3498db"
                    title="Transfer call"
                    disabled={!hasFeature("transfers")}
                  />
                  <IconButton
                    icon={isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                    onClick={handleToggleMute}
                    color={isMuted ? "#e74c3c" : "#fff"}
                    title={isMuted ? "Unmute microphone" : "Mute microphone"}
                  />
                </div>
              )}
            {/* Call History Button - only show if authenticated and license is valid */}
            {isAuthenticated && licenseInfo.valid && (
              <IconButton
                icon={<FaHistory />}
                onClick={toggleCallHistory}
                color="#fff"
                title="Call History"
                style={{ margin: "0 5px 0 0" }}
              />
            )}
            <IconButton
              icon={<FaCog />}
              onClick={() => setShowSettings(true)}
              title="Settings"
            />
          </div>
        </div>
      </div>
      {showDialpad && (
        <div
          style={{
            position: "fixed",
            top: softphoneBarRef.current
              ? height +
                25 +
                (isAuthenticated && !licenseInfo.valid ? 44 : 0) +
                (isAuthenticated && licenseInfo.valid && isPaused ? 36 : 0)
              : "85px",
            right: "150px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <Dialpad />
        </div>
      )}
      {/* Choice popover for Zoho phone icon clicks */}
      {callChoicePrompt.visible && (
        <div
          style={{
            position: "fixed",
            top: callChoicePrompt.y + 10,
            left: Math.min(callChoicePrompt.x + 10, window.innerWidth - 280),
            background: "#1a2a3a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            padding: 12,
            zIndex: 10002,
            width: 260,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Place call with
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}>
            {callChoicePrompt.number}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              style={{
                flex: 1,
                background: "#27ae60",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 10px",
                cursor: "pointer",
              }}
              onClick={() => {
                setNumber(callChoicePrompt.number);
                setCallChoicePrompt({ ...callChoicePrompt, visible: false });
                if (rememberChoice) {
                  setCallPreference("mayday");
                  try {
                    chrome.storage?.local?.set({ callPreference: "mayday" });
                  } catch (_) {}
                }
              }}
            >
              Use Mayday
            </button>
            <button
              style={{
                flex: 1,
                background: "#34495e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 10px",
                cursor: "pointer",
              }}
              onClick={() => {
                // Allow Zoho to proceed by simulating a click without our interception
                setCallChoicePrompt({ ...callChoicePrompt, visible: false });
                if (rememberChoice) {
                  setCallPreference("zoho");
                  try {
                    chrome.storage?.local?.set({ callPreference: "zoho" });
                  } catch (_) {}
                }
                // Trigger FaceTime directly via tel: scheme
                try {
                  const tel = `tel:${callChoicePrompt.number}`;
                  // Prefer assigning location to avoid popup blockers
                  window.location.href = tel;
                } catch (_) {}
              }}
            >
              Use Zoho (FaceTime)
            </button>
          </div>
          <label
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
            />
            Remember my choice
          </label>
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
              }}
              onClick={() =>
                setCallChoicePrompt({ ...callChoicePrompt, visible: false })
              }
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {showTransferDialog && isAuthenticated && licenseInfo.valid && (
        <TransferDialog
          onTransfer={handleTransfer}
          onCancel={() => setShowTransferDialog(false)}
        />
      )}
      {showSettings && (
        <SettingsDialog onCancel={() => setShowSettings(false)} />
      )}

      {/* Call History Dialog */}
      {showCallHistory && (
        <CallHistoryDialog
          callHistory={callHistory}
          loading={callHistoryLoading}
          error={callHistoryError}
          onClose={() => setShowCallHistory(false)}
          onCallNumber={handleCallFromHistory}
          onRefresh={loadCallHistory}
          currentExtension={agentDetails.extension}
        />
      )}
    </>
  );
};

// Call History Dialog Component
const CallHistoryDialog = ({
  callHistory,
  loading,
  error,
  onClose,
  onCallNumber,
  onRefresh,
  currentExtension,
}) => {
  // Local helpers to sanitize numbers shown in history
  const normalizeUgNumberLocal = (raw) => {
    if (!raw) return "";
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("256") && digits.length >= 12) {
      const local = digits.slice(3);
      return `0${local.replace(/^0+/, "")}`.slice(0, 10);
    }
    if (digits.startsWith("0")) return digits.slice(0, 10);
    if (digits.length === 9) return `0${digits}`;
    return digits;
  };

  const extractDisplayNumber = (raw) => {
    if (!raw) return "";
    try {
      const decoded = decodeURIComponent(String(raw));
      const cleaned = decoded.replace(/^.*?=\s*/g, "");
      const match = cleaned.match(/\+?\d{7,15}/);
      const candidate = match ? match[0] : cleaned;
      return normalizeUgNumberLocal(candidate);
    } catch (_) {
      const m = String(raw).match(/\+?\d{7,15}/);
      return normalizeUgNumberLocal(m ? m[0] : String(raw));
    }
  };
  const getCallIcon = (call) => {
    const statusInfo = callHistoryService.getCallStatusInfo(call);
    switch (statusInfo.icon) {
      case "FaArrowDown":
        return <FaArrowDown style={{ color: statusInfo.color }} />;
      case "FaArrowUp":
        return <FaArrowUp style={{ color: statusInfo.color }} />;
      default:
        return <FaPhone style={{ color: statusInfo.color }} />;
    }
  };

  const dialogStyle = {
    position: "fixed",
    top: "80px",
    right: "20px",
    width: "320px",
    maxHeight: "500px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    zIndex: 10001,
    color: "black",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  };

  const headerStyle = {
    padding: "15px 20px",
    borderBottom: "1px solid #e9ecef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  };

  const contentStyle = {
    maxHeight: "400px",
    overflowY: "auto",
    padding: "0",
  };

  const callItemStyle = {
    padding: "12px 20px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };

  const emptyStateStyle = {
    padding: "40px 20px",
    textAlign: "center",
    color: "#6c757d",
  };

  const errorStyle = {
    padding: "20px",
    textAlign: "center",
    color: "#e74c3c",
    backgroundColor: "#fdf2f2",
    margin: "10px",
    borderRadius: "6px",
    border: "1px solid #fca5a5",
  };

  const loadingStyle = {
    padding: "40px 20px",
    textAlign: "center",
    color: "#6c757d",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          zIndex: 10000,
        }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div style={dialogStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#1a2a3a" }}>
            📞 Call History
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={onRefresh}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                color: "#6c757d",
                fontSize: "14px",
                padding: "4px",
              }}
              title="Refresh call history"
            >
              {loading ? (
                <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                "🔄"
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6c757d",
                fontSize: "18px",
                padding: "4px",
              }}
              title="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {loading ? (
            <div style={loadingStyle}>
              <FaSpinner
                style={{
                  animation: "spin 1s linear infinite",
                  marginBottom: "10px",
                }}
              />
              <div>Loading call history...</div>
            </div>
          ) : error ? (
            <div style={errorStyle}>
              <div style={{ marginBottom: "10px" }}>⚠️ {error}</div>
              <button
                onClick={onRefresh}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#e74c3c",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Try Again
              </button>
            </div>
          ) : callHistory.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>📱</div>
              <div>No call history found</div>
              <div style={{ fontSize: "12px", marginTop: "5px" }}>
                Your recent calls will appear here
              </div>
            </div>
          ) : (
            callHistory.map((call, index) => {
              const displayNumber = extractDisplayNumber(
                call.phoneNumber || call.calledNumber || call.from || ""
              );
              const reachedNumber = extractDisplayNumber(
                call.calledNumber || ""
              );
              return (
                <div
                  key={call.id || index}
                  style={callItemStyle}
                  onClick={() => onCallNumber(displayNumber)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                  title={`Click to call ${displayNumber}`}
                >
                  {/* Call Direction Icon */}
                  <div style={{ marginRight: "12px", fontSize: "16px" }}>
                    {getCallIcon(call)}
                  </div>

                  {/* Call Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "14px",
                        color: "#1a2a3a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayNumber}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6c757d",
                        marginTop: "2px",
                      }}
                    >
                      {callHistoryService.formatTimestamp(call.timestamp)}
                      {call.duration && (
                        <span style={{ marginLeft: "8px" }}>
                          • {call.duration}
                        </span>
                      )}
                      {/* Enhanced display for inbound calls */}
                      {call.type === "inbound" && (
                        <>
                          {/* Show which number they dialed (the extension they reached) */}
                          {reachedNumber && (
                            <span
                              style={{
                                marginLeft: "8px",
                                color: "#27ae60",
                                fontWeight: "500",
                              }}
                            >
                              • Reached {reachedNumber}
                            </span>
                          )}
                        </>
                      )}
                      {/* For outbound calls, show the dialed number */}
                      {call.type === "outbound" && reachedNumber && (
                        <span
                          style={{
                            marginLeft: "8px",
                            color: "#27ae60",
                            fontWeight: "500",
                          }}
                        >
                          • To {reachedNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call Button */}
                  <div style={{ marginLeft: "8px" }}>
                    <FaPhone
                      style={{
                        fontSize: "12px",
                        color: call.type === "inbound" ? "#27ae60" : "#e74c3c", // Green for incoming, red for outgoing
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {callHistory.length > 0 && (
          <div
            style={{
              padding: "10px 20px",
              borderTop: "1px solid #e9ecef",
              backgroundColor: "#f8f9fa",
              fontSize: "11px",
              color: "#6c757d",
              textAlign: "center",
            }}
          >
            Showing last {callHistory.length} calls for ext. {currentExtension}
          </div>
        )}
      </div>
    </>
  );
};

export default SoftphoneBar;
