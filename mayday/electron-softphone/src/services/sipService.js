//electron-softphone/src/services/sipService.js
import { Inviter, Registerer, SessionState, UserAgent, Web } from "sip.js";
import { storageService } from "./storageService";
import { EventEmitter } from "events";

const state = {
  userAgent: null,
  registerer: null,
  session: null,
  isConnected: false,
  eventEmitter: new EventEmitter(),
  lastRegistration: null,
  callState: "idle",
  remoteIdentity: null,
  callStartTime: null,
  currentSession: null,
  audioElement: null,
  incomingSession: null,
  activeSession: null,
  lastConfig: null,
  isDisconnecting: false,
  isInitializing: false,
  consultationCall: null, // For attended transfers
  transferState: "idle", // idle, transferring, consulting, completed
  registerRefreshTimer: null,
};

async function connect(config) {
  // CRITICAL: Ensure all required configuration is present before proceeding
  const server = config?.pjsip?.server;
  const extension = config?.extension;
  const password = config?.pjsip?.password;

  // Enhanced validation with detailed error messages to prevent racing conditions
  if (!config) {
    throw new Error("Configuration object is missing");
  }
  if (!config.pjsip) {
    throw new Error("PJSIP configuration is missing");
  }
  if (!server) {
    throw new Error("PJSIP server is missing from configuration");
  }
  if (!extension) {
    throw new Error("Extension is missing from configuration");
  }
  if (!password) {
    throw new Error("PJSIP password is missing from configuration");
  }

  // Use WebSocket URL from config or determine based on environment
  let wsUrl = config?.pjsip?.ws_servers;

  // Normalize ws_servers which may be a string, object { uri }, or array of either
  if (Array.isArray(wsUrl)) {
    wsUrl = wsUrl[0]?.uri || wsUrl[0];
  } else if (wsUrl && typeof wsUrl === "object" && wsUrl.uri) {
    wsUrl = wsUrl.uri;
  }

  if (!wsUrl) {
    // In production, use WSS through nginx proxy
    if (
      process.env.NODE_ENV === "production" ||
      window.location.protocol === "https:"
    ) {
      // Use /ws endpoint which nginx will handle with proper TLS
      wsUrl = `wss://${server}/ws`;
    } else {
      // Development uses plain WebSocket
      wsUrl = `ws://${server}:8088/ws`;
    }
  }

  console.log("Establishing SIP connection to:", wsUrl);
  if (!wsUrl) {
    throw new Error("WebSocket servers configuration is missing");
  }

  // console.log("✅ Configuration validation passed:", {
  //   server,
  //   extension,
  //   hasPassword: !!password,
  //   wsUrl,
  //   configKeys: Object.keys(config.pjsip || {}),
  // });

  try {
    // Resolve registration expiration strictly from top-level config.registerExpires (Phonebar setting)
    const registerExpires = Math.max(
      60,
      Math.min(3600, Number(config?.registerExpires || 300) || 300)
    );
    const apiHost =
      process.env.NODE_ENV === "development"
        ? "localhost:8004"
        : "cs.hugamara.com";

    let iceServers = [];

    // Handle ICE servers from config
    if (config?.pjsip?.ice_servers) {
      if (Array.isArray(config.pjsip.ice_servers)) {
        iceServers = config.pjsip.ice_servers.map((server) => ({
          urls: Array.isArray(server.urls) ? server.urls : [server.urls],
        }));
      } else if (typeof config.pjsip.ice_servers === "string") {
        iceServers = [{ urls: [config.pjsip.ice_servers] }];
      }
    }

    // Add fallback STUN servers if none configured
    if (iceServers.length === 0) {
      iceServers = [
        { urls: ["stun:stun1.l.google.com:19302"] },
        { urls: ["stun:stun2.l.google.com:19302"] },
      ];
    }

    const userAgentConfig = {
      uri: UserAgent.makeURI(`sip:${extension}@${server}`),
      authorizationUsername: extension,
      authorizationPassword: password,
      displayName: extension,
      transportOptions: {
        wsServers: [wsUrl],
        traceSip: false,
        maxReconnectionAttempts: 5, // 5 reconnection attempts
        reconnectionTimeout: 10000, // 10 seconds between reconnection attempts
        keepAliveInterval: 60, // Send keep-alive every 60 seconds
        keepAliveDebounce: 20, // Minimum 20 seconds between keep-alives
        connectionTimeout: 30000, // 30 seconds to establish connection
        secure: process.env.NODE_ENV !== "development", // Use secure in production
        rejectUnauthorized: false, // Similar to websocketService
      },
      registerOptions: {
        expires: registerExpires,
        extraContactHeaderParams: ["transport=ws"],
        instanceId: config?.pjsip?.instance_id || Date.now().toString(),
        regId: 1,
        registrarServer: `sip:${server}`,
        contactParams: {
          transport: "ws",
          "reg-id": 1,
          "+sip.instance": `"<urn:uuid:${
            config?.pjsip?.instance_id || Date.now().toString()
          }>"`,
        },
      },
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers,
          iceCandidatePoolSize: 10,
          iceTransportPolicy: "all",
          rtcpMuxPolicy: "require",
          bundlePolicy: "balanced",
        },
        enableICERestart: true,
      },
      logConfiguration: {
        builtinEnabled: false,
        level: "off",
        connector: () => {},
      },
      hackViaTcp: true,
      viaHost: server,
      contactName: extension,
    };

    // Enhanced WebSocket error handling
    const userAgent = new UserAgent(userAgentConfig);
    userAgent.delegate = createUserAgentDelegate();

    // Apply enhanced WebSocket handlers
    setupWebSocketHandlers(userAgent.transport);

    console.log("🚀 Starting SIP UserAgent...");
    const connectionPromise = createConnectionPromise(userAgent);
    await userAgent.start();
    state.userAgent = userAgent;
    console.log("✅ SIP UserAgent started successfully");

    console.log("🔄 Waiting for WebSocket connection...");
    const connectedAgent = await connectionPromise;
    console.log("✅ SIP UserAgent connected successfully");
    console.log("WebSocket connection established to:", wsUrl);

    // Create registerer with specific configuration
    const registerer = new Registerer(userAgent, {
      expires: registerExpires,
      regId: 1,
      extraHeaders: [],
      extraContactHeaderParams: [],
      contactParams: {
        transport: "ws",
        "reg-id": 1,
        "+sip.instance": `"<urn:uuid:${
          config?.pjsip?.instance_id || Date.now().toString()
        }>"`,
      },
      // Force a single contact registration
      contact: `<sip:${extension}@${server};transport=ws;reg-id=1;+sip.instance="<urn:uuid:${
        config?.pjsip?.instance_id || Date.now().toString()
      }>">`,
    });

    // Set up registration state monitoring
    registerer.stateChange.addListener((newState) => {
      console.log("🔄 Registration state changed:", newState);
      state.registrationState = newState;
      state.isConnected = newState === "Registered";

      // Emit the state change event
      state.eventEmitter.emit("registration:state", newState);

      if (newState === "Registered") {
        console.log("✅ SIP registration completed successfully");
        state.lastRegistration = new Date().toISOString();
        state.eventEmitter.emit("registered", {
          timestamp: state.lastRegistration,
          userAgent: userAgent,
        });
      } else if (newState === "Terminated") {
        console.log("❌ SIP registration terminated");
      } else if (newState === "Unregistered") {
        console.log("⚠️ SIP registration unregistered");
      }
    });

    state.registerer = registerer;
    console.log("🚀 Starting SIP registration...");
    try {
      await registerer.register();
    } catch (error) {
      console.error("❌ SIP registration failed:", error);
      console.error("Registration error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      state.eventEmitter.emit("registration_failed", error);
      throw error;
    }

    // Schedule a safety refresh slightly before expiry (Registerer auto-refreshes, this is a backup)
    if (state.registerRefreshTimer) {
      clearTimeout(state.registerRefreshTimer);
      state.registerRefreshTimer = null;
    }
    const refreshMs = Math.max(30, registerExpires - 45) * 1000;
    state.registerRefreshTimer = setTimeout(async () => {
      try {
        console.log("⏰ Pre-expiry safety re-register");
        await safeRegister();
      } catch (e) {
        console.warn("Safety re-register failed:", e?.message || e);
      }
    }, refreshMs);

    return connectedAgent;
  } catch (error) {
    console.error("Error in SIP connection:", error);
    throw error;
  }
}

async function disconnect() {
  if (state.isDisconnecting) {
    console.log("Already disconnecting, skipping redundant disconnect");
    return;
  }

  state.isDisconnecting = true;
  console.log("=== SIP SERVICE DISCONNECT STARTED ===");

  try {
    // Step 1: Terminate current call session
    if (state.currentSession) {
      console.log("Terminating current call session...");
      try {
        if (state.currentSession.state === SessionState.Established) {
          await state.currentSession.bye();
        } else if (state.currentSession.state === SessionState.Establishing) {
          await state.currentSession.cancel();
        } else if (state.currentSession.reject) {
          await state.currentSession.reject();
        }
        console.log("Call session terminated");
      } catch (error) {
        console.warn("Error terminating call session:", error);
      }
      state.currentSession = null;
    }

    // Step 2: Unregister from SIP server
    if (state.registerer) {
      console.log("Unregistering from SIP server...");
      try {
        await state.registerer.unregister();
        console.log("SIP unregistration completed");
      } catch (error) {
        console.warn("Error during SIP unregistration:", error);
      }
      state.registerer = null;
    }

    // Clear any scheduled safety refresh
    if (state.registerRefreshTimer) {
      clearTimeout(state.registerRefreshTimer);
      state.registerRefreshTimer = null;
    }

    // Step 3: Stop user agent
    if (state.userAgent) {
      console.log("Stopping SIP user agent...");
      try {
        await state.userAgent.stop();
        console.log("SIP user agent stopped");
      } catch (error) {
        console.warn("Error stopping SIP user agent:", error);
      }
      state.userAgent = null;
    }

    // Step 4: Clear state (preserve lastConfig for reconnection)
    state.isConnected = false;
    state.isInitializing = false;
    // Note: NOT clearing state.lastConfig here to allow reconnection
    // state.lastConfig will be cleared only on explicit logout

    // Step 5: Emit disconnect event
    state.eventEmitter.emit("disconnected");
    console.log("=== SIP SERVICE DISCONNECT COMPLETED ===");
  } catch (error) {
    console.error("Error during SIP disconnect:", error);
  } finally {
    state.isDisconnecting = false;
  }
}

async function reconnect() {
  // CRITICAL: Prevent racing conditions during reconnection
  if (state.isInitializing) {
    console.log(
      "⚠️ Reconnection already in progress, skipping duplicate attempt"
    );
    return false;
  }

  if (!state.lastConfig) {
    throw new Error("No previous configuration found for reconnection");
  }

  // Validate configuration before attempting reconnection
  if (
    !state.lastConfig.pjsip?.server ||
    !state.lastConfig.extension ||
    !state.lastConfig.pjsip?.password
  ) {
    console.error("❌ Invalid configuration for reconnection:", {
      hasServer: !!state.lastConfig.pjsip?.server,
      hasExtension: !!state.lastConfig.extension,
      hasPassword: !!state.lastConfig.pjsip?.password,
    });
    throw new Error("Invalid configuration for reconnection");
  }

  try {
    console.log("🔄 Starting reconnection process...");
    state.isInitializing = true;

    await disconnect();

    // Small delay to ensure clean disconnect before reconnection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await connect(state.lastConfig);
    console.log("✅ Reconnection completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Reconnection failed:", error);
    throw error;
  } finally {
    state.isInitializing = false;
  }
}

const events = state.eventEmitter;

let _lastRegisterAt = 0;
let _registerInFlight = false;

async function safeRegister() {
  try {
    if (!state.registerer) return false;

    // Do not register while a call is active to avoid renegotiation drops
    const active =
      !!state.currentSession &&
      (state.currentSession.state === SessionState.Establishing ||
        state.currentSession.state === SessionState.Established);
    if (active) {
      console.log("🔒 safeRegister skipped: active call in progress");
      return false;
    }

    // Throttle duplicate REGISTERs
    const now = Date.now();
    if (_registerInFlight || now - _lastRegisterAt < 3000) {
      console.log("⏳ safeRegister throttled");
      return false;
    }

    _registerInFlight = true;
    _lastRegisterAt = now;

    console.log("🔄 safeRegister: sending REGISTER");
    await state.registerer.register();
    return true;
  } catch (e) {
    console.warn("safeRegister failed:", e?.message || e);
    return false;
  } finally {
    _registerInFlight = false;
  }
}

export const sipService = {
  initialize: async (config) => {
    // CRITICAL: Prevent racing conditions during initialization
    if (state.isDisconnecting) {
      console.log("⚠️ SIP service is disconnecting, skipping initialization");
      return;
    }

    if (state.isInitializing) {
      console.log(
        "⚠️ SIP service is already initializing, skipping redundant initialization"
      );
      return;
    }

    if (state.isConnected && state.userAgent) {
      console.log("✅ SIP service already initialized and connected");
      return;
    }

    // Enhanced configuration validation before initialization
    if (!config || !config.pjsip || !config.extension) {
      const error = new Error("Invalid configuration for SIP initialization");
      console.error("❌ Configuration validation failed:", {
        hasConfig: !!config,
        hasPjsip: !!config?.pjsip,
        hasExtension: !!config?.extension,
        configKeys: config ? Object.keys(config) : [],
      });
      throw error;
    }

    console.log("🚀 Starting SIP service initialization...");
    state.isInitializing = true;

    try {
      // Validate configuration before connecting
      if (
        !config.pjsip?.server ||
        !config.extension ||
        !config.pjsip?.password
      ) {
        throw new Error("Missing required configuration parameters");
      }

      // Clear any existing state
      state.isConnected = false;
      state.lastConfig = null;

      // Initialize connection
      await connect(config);

      // Update state only after successful connection
      state.lastConfig = config;
      state.isConnected = true;
      console.log("✅ SIP service initialized successfully");
    } catch (error) {
      console.error("❌ SIP initialization failed:", error);
      // Reset state on failure
      state.isConnected = false;
      state.lastConfig = null;
      throw error;
    } finally {
      state.isInitializing = false;
    }
  },

  disconnect,

  reconnect,
  get isConnected() {
    return state.isConnected;
  },
  get events() {
    return state.eventEmitter;
  },
  get state() {
    return state;
  },

  safeRegister,

  toggleMute: async () => {
    if (!state.currentSession) {
      throw new Error("No active call to mute");
    }

    try {
      const audioTrack =
        state.currentSession?.sessionDescriptionHandler?.peerConnection
          ?.getSenders()
          ?.find((sender) => sender.track?.kind === "audio")?.track;

      if (!audioTrack) {
        throw new Error("No audio track found");
      }

      audioTrack.enabled = !audioTrack.enabled;
      state.eventEmitter.emit("call:mute", { muted: !audioTrack.enabled });
      return !audioTrack.enabled;
    } catch (error) {
      console.error("Error toggling mute:", error);
      throw error;
    }
  },

  // Hold functionality
  holdCall: async () => {
    if (!state.currentSession) {
      throw new Error("No active call to hold");
    }

    if (state.currentSession.state !== SessionState.Established) {
      throw new Error("Call must be established to place on hold");
    }

    try {
      console.log("Placing call on hold...");
      console.log("Session type:", state.currentSession.constructor.name);
      console.log("Session state:", state.currentSession.state);
      console.log("Session ID:", state.currentSession.id);

      // Log available methods
      const sessionMethods = Object.getOwnPropertyNames(
        state.currentSession
      ).filter((name) => typeof state.currentSession[name] === "function");
      console.log("Available session methods:", sessionMethods);

      // Check prototype methods as well
      const prototypeMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(state.currentSession)
      ).filter((name) => typeof state.currentSession[name] === "function");
      console.log("Available prototype methods:", prototypeMethods);

      // Prefer SIP re-INVITE to signal hold (enables MOH on Asterisk)
      if (typeof state.currentSession.hold === "function") {
        await state.currentSession.hold();
      } else if (typeof state.currentSession.invite === "function") {
        try {
          await state.currentSession.invite({
            sessionDescriptionHandlerModifiers: [
              (description) => {
                if (description?.sdp) {
                  let sdp = description.sdp;
                  // Normalize any existing direction attributes to sendonly
                  sdp = sdp.replace(/a=sendrecv/g, "a=sendonly");
                  sdp = sdp.replace(/a=recvonly/g, "a=sendonly");
                  sdp = sdp.replace(/a=inactive/g, "a=sendonly");
                  // Ensure each audio m-section has a direction line
                  sdp = sdp.replace(
                    /(m=audio [^\n]*\n)(?!a=(sendonly|recvonly|sendrecv|inactive)\n)/g,
                    "$1a=sendonly\n"
                  );
                  description.sdp = sdp;
                }
                return description;
              },
            ],
          });
        } catch (reinviteError) {
          console.warn(
            "Hold re-INVITE failed, falling back to track disable:",
            reinviteError
          );

          const sessionDescriptionHandler =
            state.currentSession.sessionDescriptionHandler;
          if (
            !sessionDescriptionHandler ||
            !sessionDescriptionHandler.peerConnection
          ) {
            throw new Error(
              "No session description handler or peer connection available"
            );
          }
          const peerConnection = sessionDescriptionHandler.peerConnection;
          const senders = peerConnection.getSenders();
          const audioSender = senders.find(
            (sender) => sender.track && sender.track.kind === "audio"
          );
          if (audioSender && audioSender.track) {
            audioSender.track.enabled = false;
            console.log("Disabled outgoing audio track for hold (fallback)");
          }
          state.currentSession._holdState = {
            audioSenderTrack: audioSender?.track,
            audioTrackEnabled: audioSender?.track?.enabled,
          };
        }
      } else {
        // Last-resort fallback: track disable
        const sessionDescriptionHandler =
          state.currentSession.sessionDescriptionHandler;
        if (
          !sessionDescriptionHandler ||
          !sessionDescriptionHandler.peerConnection
        ) {
          throw new Error(
            "No session description handler or peer connection available"
          );
        }
        const peerConnection = sessionDescriptionHandler.peerConnection;
        const senders = peerConnection.getSenders();
        const audioSender = senders.find(
          (sender) => sender.track && sender.track.kind === "audio"
        );
        if (audioSender && audioSender.track) {
          audioSender.track.enabled = false;
          console.log("Disabled outgoing audio track for hold (last-resort)");
        }
        state.currentSession._holdState = {
          audioSenderTrack: audioSender?.track,
          audioTrackEnabled: audioSender?.track?.enabled,
        };
      }

      // Mark session as on hold
      state.currentSession.isOnHold = true;

      console.log("Call placed on hold successfully");
      state.eventEmitter.emit("call:held", {
        callId: state.currentSession.id,
        remoteIdentity: state.currentSession.remoteIdentity?.uri?.user,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Error placing call on hold:", error);
      state.eventEmitter.emit("call:hold_failed", {
        error: error.message,
        callId: state.currentSession?.id,
      });
      throw new Error(`Failed to place call on hold: ${error.message}`);
    }
  },

  // Unhold functionality
  unholdCall: async () => {
    if (!state.currentSession) {
      throw new Error("No active call to unhold");
    }

    try {
      console.log("Retrieving call from hold...");

      if (typeof state.currentSession.unhold === "function") {
        await state.currentSession.unhold();
      } else if (typeof state.currentSession.invite === "function") {
        try {
          await state.currentSession.invite({
            sessionDescriptionHandlerModifiers: [
              (description) => {
                if (description?.sdp) {
                  let sdp = description.sdp;
                  // Restore to sendrecv
                  sdp = sdp.replace(/a=sendonly/g, "a=sendrecv");
                  sdp = sdp.replace(/a=recvonly/g, "a=sendrecv");
                  sdp = sdp.replace(/a=inactive/g, "a=sendrecv");
                  // Ensure each audio m-section has a direction line
                  sdp = sdp.replace(
                    /(m=audio [^\n]*\n)(?!a=(sendonly|recvonly|sendrecv|inactive)\n)/g,
                    "$1a=sendrecv\n"
                  );
                  description.sdp = sdp;
                }
                return description;
              },
            ],
          });
        } catch (reinviteError) {
          console.warn(
            "Unhold re-INVITE failed, falling back to track enable:",
            reinviteError
          );

          const sessionDescriptionHandler =
            state.currentSession.sessionDescriptionHandler;
          if (
            !sessionDescriptionHandler ||
            !sessionDescriptionHandler.peerConnection
          ) {
            throw new Error(
              "No session description handler or peer connection available"
            );
          }
          const peerConnection = sessionDescriptionHandler.peerConnection;
          if (
            state.currentSession._holdState &&
            state.currentSession._holdState.audioSenderTrack
          ) {
            state.currentSession._holdState.audioSenderTrack.enabled = true;
            console.log(
              "Re-enabled outgoing audio track for unhold (fallback)"
            );
          } else {
            const senders = peerConnection.getSenders();
            const audioSender = senders.find(
              (sender) => sender.track && sender.track.kind === "audio"
            );
            if (audioSender && audioSender.track) {
              audioSender.track.enabled = true;
              console.log(
                "Re-enabled outgoing audio track for unhold (no stored state)"
              );
            }
          }
          delete state.currentSession._holdState;
        }
      } else {
        // Last-resort fallback: enable track
        const sessionDescriptionHandler =
          state.currentSession.sessionDescriptionHandler;
        if (
          !sessionDescriptionHandler ||
          !sessionDescriptionHandler.peerConnection
        ) {
          throw new Error(
            "No session description handler or peer connection available"
          );
        }
        const peerConnection = sessionDescriptionHandler.peerConnection;
        if (
          state.currentSession._holdState &&
          state.currentSession._holdState.audioSenderTrack
        ) {
          state.currentSession._holdState.audioSenderTrack.enabled = true;
          console.log(
            "Re-enabled outgoing audio track for unhold (last-resort)"
          );
        } else {
          const senders = peerConnection.getSenders();
          const audioSender = senders.find(
            (sender) => sender.track && sender.track.kind === "audio"
          );
          if (audioSender && audioSender.track) {
            audioSender.track.enabled = true;
          }
        }
        delete state.currentSession._holdState;
      }

      // Mark session as not on hold
      state.currentSession.isOnHold = false;

      console.log("Call retrieved from hold successfully");
      state.eventEmitter.emit("call:unheld", {
        callId: state.currentSession.id,
        remoteIdentity: state.currentSession.remoteIdentity?.uri?.user,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Error retrieving call from hold:", error);
      state.eventEmitter.emit("call:unhold_failed", {
        error: error.message,
        callId: state.currentSession?.id,
      });
      throw new Error(`Failed to retrieve call from hold: ${error.message}`);
    }
  },

  // Check if call is on hold
  isCallOnHold: () => {
    if (!state.currentSession) {
      return false;
    }

    return state.currentSession.isOnHold || false;
  },

  getExtension: () => {
    return state.lastConfig?.extension || null;
  },
};

// Initialize audio element for call audio
function initializeAudio() {
  if (!state.audioElement) {
    state.audioElement = document.createElement("audio");
    state.audioElement.id = "remoteAudio";
    state.audioElement.autoplay = true;
    state.audioElement.playsInline = true;

    // Add error handling
    state.audioElement.onerror = (error) => {
      console.error("Audio element error:", error);
    };

    document.body.appendChild(state.audioElement);

    // IMPORTANT: Set volume and unmute immediately
    state.audioElement.volume = 1.0;
    state.audioElement.muted = false;
  }

  // DON'T reset srcObject or call load() here - it breaks early media
  // Only reset if there's no active session
  if (!state.currentSession) {
    state.audioElement.srcObject = null;
    state.audioElement.load();
  }

  // Log audio element state
  // console.log("Audio element initialized", {
  //   muted: state.audioElement.muted,
  //   volume: state.audioElement.volume,
  //   readyState: state.audioElement.readyState,
  // });
}

// Main function to handle call session setup and lifecycle
function setupCallSession(session) {
  const isIncoming = session.constructor.name === "Invitation";
  state.currentSession = session;

  // Initialize audio element first
  initializeAudio();

  // Set up session delegate to handle dialog creation and other events
  session.delegate = {
    ...session.delegate, // Preserve existing delegate
    onSessionDescriptionHandler: (sessionDescriptionHandler) => {
      console.log("SessionDescriptionHandler created for session");

      if (sessionDescriptionHandler.peerConnection) {
        const pc = sessionDescriptionHandler.peerConnection;

        // Set up track handling - CRITICAL for incoming audio
        pc.addEventListener("track", async (event) => {
          console.log("🎵 Received track event:", {
            kind: event.track.kind,
            id: event.track.id,
            readyState: event.track.readyState,
            enabled: event.track.enabled,
            muted: event.track.muted,
            streamCount: event.streams?.length || 0,
          });

          if (event.track.kind === "audio") {
            // Emit track added event
            state.eventEmitter.emit("track:added", event);

            try {
              console.log("🔊 Setting up incoming audio track");
              await handleAudioTrack(event);
            } catch (error) {
              console.error("❌ Error handling audio track:", error);
            }
          }
        });

        // Monitor ICE connection state
        pc.addEventListener("iceconnectionstatechange", () => {
          console.log("🧊 ICE Connection State:", pc.iceConnectionState);
          console.log("🧊 ICE Gathering State:", pc.iceGatheringState);

          // When ICE is connected, check for streams again (like chrome extension)
          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            console.log("🧊 ICE connected - checking for audio streams");

            // Check for remote streams
            const remoteStreams = pc.getRemoteStreams
              ? pc.getRemoteStreams()
              : [];
            if (remoteStreams.length > 0) {
              console.log("🧊 Found remote streams after ICE connection");
              remoteStreams.forEach((stream, index) => {
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                  console.log(`🧊 Playing audio from remote stream ${index}`);
                  playRemoteAudio(stream);
                }
              });
            }

            // Also check receivers
            const receivers = pc.getReceivers();
            const audioReceivers = receivers.filter(
              (r) =>
                r.track &&
                r.track.kind === "audio" &&
                r.track.readyState === "live"
            );

            if (audioReceivers.length > 0 && remoteStreams.length === 0) {
              console.log(
                `🧊 Creating stream from ${audioReceivers.length} audio receivers`
              );
              const stream = new MediaStream();
              audioReceivers.forEach((receiver) => {
                stream.addTrack(receiver.track);
              });
              playRemoteAudio(stream);
            }
          }

          if (pc.iceConnectionState === "failed") {
            console.error(
              "❌ ICE connection failed - this will cause call to drop"
            );
            state.eventEmitter.emit("call:iceFailure", {
              state: pc.iceConnectionState,
              gatheringState: pc.iceGatheringState,
            });
          } else if (pc.iceConnectionState === "disconnected") {
            console.warn("⚠️ ICE connection disconnected - may recover");
          }
        });

        // Monitor connection state
        pc.addEventListener("connectionstatechange", () => {
          console.log("Peer Connection State:", pc.connectionState);

          if (pc.connectionState === "failed") {
            console.error("❌ Peer connection failed");
            state.eventEmitter.emit("call:connectionFailure", {
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
            });
          }
        });

        // Log ICE candidates
        pc.addEventListener("icecandidate", (event) => {
          if (event.candidate) {
            console.log("ICE Candidate:", {
              type: event.candidate.type,
              protocol: event.candidate.protocol,
              address: event.candidate.address,
              port: event.candidate.port,
            });
          } else {
            console.log("ICE gathering complete");
          }
        });
      }
    },
    onInvite: (request) => {
      console.log("Session received re-INVITE:", request);
    },
    onRefer: (request) => {
      console.log("Session received REFER:", request);
      // Handle incoming refers (for transfer targets)
      request.accept();
    },
    onBye: (request) => {
      console.log("Session received BYE:", request);
      console.log("BYE Details:", {
        reason: request.message?.reasonPhrase,
        statusCode: request.message?.statusCode,
        headers: request.message?.headers,
        body: request.message?.body,
        sessionState: session?.state,
        sessionId: session?.id,
        callDuration: state.callStartTime
          ? Date.now() - state.callStartTime
          : 0,
      });

      // Accept the BYE request first
      if (request.accept && typeof request.accept === "function") {
        request.accept();
      }

      // Check if this is an immediate BYE (within 2 seconds of establishment)
      if (state.callStartTime && Date.now() - state.callStartTime < 2000) {
        console.error(
          "⚠️ Call dropped immediately after establishment - possible media negotiation failure"
        );
        state.eventEmitter.emit("call:mediaFailure", {
          reason: "Call dropped immediately after answer",
          duration: Date.now() - state.callStartTime,
        });
      }

      // Check if this is a BYE after successful transfer
      if (
        state.transferState === "accepted" ||
        state.transferState === "transferring"
      ) {
        console.log(
          "BYE received during transfer - transfer completed successfully"
        );
        const wasTransferring =
          state.transferState === "transferring" ||
          state.transferState === "accepted";
        state.transferState = "completed";

        // Clear session state but don't trigger normal termination
        state.currentSession = null;
        state.callState = "idle";
        state.callStartTime = null;
        state.remoteIdentity = null;

        // Stop audio
        if (state.audioElement) {
          state.audioElement.pause();
          state.audioElement.srcObject = null;
          state.audioElement.load();
        }

        events.emit("call:transfer_complete", {
          targetExtension: state.lastTransferTarget,
          transferType: "blind",
          timestamp: new Date().toISOString(),
        });

        // Emit ended event but mark as transfer completion
        events.emit("call:ended", {
          cause: "transfer_completed",
          abandoned: false,
        });

        // Reset transfer state after a delay
        setTimeout(() => {
          state.transferState = "idle";
        }, 1000);
      } else {
        // Normal BYE handling
        handleCallTermination(session, "remote_bye");
      }
    },
    onNotify: (request) => {
      console.log("Session received NOTIFY:", request);

      // Handle transfer progress notifications
      // In SIP.js, the NOTIFY body might be in different places
      let body = "";
      if (request.request && request.request.body) {
        body = request.request.body;
      } else if (request.body) {
        body = request.body;
      } else if (request.message && request.message.body) {
        body = request.message.body;
      }

      console.log("NOTIFY body:", body);

      if (body && typeof body === "string") {
        // Parse the SIP fragment in the NOTIFY body
        if (body.includes("200 OK") || body.includes("200 ok")) {
          console.log("Transfer completed successfully via NOTIFY");
          state.transferState = "completed";

          // The remote party should send BYE after successful transfer
          events.emit("call:transfer_progress", {
            status: "completed",
            timestamp: new Date().toISOString(),
          });

          // Emit transfer complete event
          events.emit("call:transfer_complete", {
            transferType: "blind",
            timestamp: new Date().toISOString(),
          });
        } else if (body.includes("100 Trying")) {
          console.log("Transfer in progress");
          events.emit("call:transfer_progress", {
            status: "trying",
            targetExtension: state.lastTransferTarget || targetExtension,
            transferType: transferType || "blind",
            timestamp: new Date().toISOString(),
          });
        } else if (
          body.includes("503") ||
          body.includes("486") ||
          body.includes("487")
        ) {
          console.log("Transfer failed based on NOTIFY");
          state.transferState = "failed";
          events.emit("call:transfer_failed", {
            error: "Transfer failed - target unavailable or rejected",
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Always accept the NOTIFY
      if (request.accept && typeof request.accept === "function") {
        request.accept();
      }
    },
  };

  // Also check if sessionDescriptionHandler already exists
  if (session.sessionDescriptionHandler?.peerConnection) {
    const pc = session.sessionDescriptionHandler.peerConnection;

    // Set up track handling - CRITICAL for incoming audio
    pc.addEventListener("track", async (event) => {
      console.log("🎵 Received track event (existing handler):", {
        kind: event.track.kind,
        id: event.track.id,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        muted: event.track.muted,
        streamCount: event.streams?.length || 0,
      });

      if (event.track.kind === "audio") {
        // Emit track added event
        state.eventEmitter.emit("track:added", event);

        try {
          console.log("🔊 Setting up incoming audio track (existing handler)");
          await handleAudioTrack(event);
        } catch (error) {
          console.error(
            "❌ Error handling audio track (existing handler):",
            error
          );
        }
      }
    });
  }

  // Set up session state monitoring
  session.stateChange.addListener((newState) => {
    console.log(`Call session state changed to: ${newState}`);
    state.eventEmitter.emit("session:stateChange", newState);

    if (newState === SessionState.Established) {
      // Log dialog availability when established
      console.log("Session established - Dialog available:", !!session.dialog);

      // Emit established event
      state.eventEmitter.emit("call:established", {
        remoteIdentity: session.remoteIdentity?.uri?.user,
        startTime: Date.now(),
        sessionId: session.id,
        hasDialog: !!session.dialog,
      });

      // Register call with AMI for monitoring and management
      const callData = {
        callId: session.id,
        extension: state.lastConfig?.extension,
        remoteNumber: session.remoteIdentity?.uri?.user,
        direction: "outbound",
        timestamp: new Date().toISOString(),
      };

      // Don't await this - let it run in background
      sipCallService
        .registerCallWithAMI(callData)
        .catch((err) =>
          console.warn("Failed to register call with AMI:", err.message)
        );

      // This is critical - explicitly set up audio for outbound calls
      setTimeout(async () => {
        try {
          // Check if session is still valid and not being transferred
          if (
            session === state.currentSession &&
            state.transferState !== "transferring" &&
            state.transferState !== "accepted" &&
            session.state === SessionState.Established
          ) {
            await setupAudioStream(session);
            console.log("Outbound call audio stream set up");
          } else {
            console.log(
              "Skipping audio setup - session is being transferred or no longer current"
            );
          }
        } catch (error) {
          console.error("Error setting up outbound audio:", error);
        }
      }, 500); // Small delay to ensure media is flowing
    }
  });
}

// Reset call state to initial values
const resetCallState = () => {
  if (state.audioElement) {
    state.audioElement.srcObject = null;
    state.audioElement.load();
  }

  state.callState = "idle";
  state.currentSession = null;
  state.callStartTime = null;
  state.remoteIdentity = null;
  state.incomingSession = null;

  // Clean up any remaining event listeners
  if (state.currentSession?.sessionDescriptionHandler?.peerConnection) {
    state.currentSession.sessionDescriptionHandler.peerConnection.removeEventListener(
      "iceconnectionstatechange",
      null
    );
    state.currentSession.sessionDescriptionHandler.peerConnection.removeEventListener(
      "icecandidate",
      null
    );
  }
};

// Centralized call termination handling
const handleCallTermination = (session, cause = "normal") => {
  // Don't terminate if we're in the middle of a transfer
  if (
    state.transferState === "transferring" ||
    state.transferState === "accepted"
  ) {
    console.log("Skipping termination - transfer in progress");
    return;
  }

  const isAbandoned = state.callState !== "connected";
  const uniqueId =
    session?.id || state.currentSession?.id || Date.now().toString();

  // Immediately stop audio
  if (state.audioElement) {
    state.audioElement.pause();
    state.audioElement.srcObject = null;
    state.audioElement.load();
  }

  // Immediately clean up WebRTC connections
  if (session?.sessionDescriptionHandler?.peerConnection) {
    const pc = session.sessionDescriptionHandler.peerConnection;
    pc.getReceivers().forEach((receiver) => {
      if (receiver.track) {
        receiver.track.stop();
      }
    });
    pc.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    // Force connection closure
    pc.close();
  }

  // Immediately clear session states
  state.currentSession = null;
  state.incomingSession = null;
  state.callState = "idle";
  state.callStartTime = null;
  state.remoteIdentity = null;
  state.transferState = "idle";

  // Emit events for UI update
  state.eventEmitter.emit("call:ended", {
    cause: cause,
    abandoned: isAbandoned,
  });

  emitCallEvent(isAbandoned ? "abandoned" : "end", {
    uniqueId: uniqueId,
    status: "ended",
    cause: cause,
    abandoned: isAbandoned,
    remoteIdentity: session?.remoteIdentity?.uri?.user || state.remoteIdentity,
    localIdentity:
      session?.localIdentity?.uri?.user || state.lastConfig?.extension,
  });

  // Force garbage collection of media resources
  if (global.gc) {
    global.gc();
  }
};

async function setupAudioStream(session) {
  if (!session?.sessionDescriptionHandler?.peerConnection) {
    throw new Error("Invalid session or no peer connection");
  }

  const peerConnection = session.sessionDescriptionHandler.peerConnection;
  const remoteStream = new MediaStream();

  // Add all remote audio tracks to the stream
  peerConnection.getReceivers().forEach((receiver) => {
    if (receiver.track && receiver.track.kind === "audio") {
      console.log("Adding remote audio track to stream:", receiver.track.id);
      remoteStream.addTrack(receiver.track);
      receiver.track.enabled = true;
    }
  });

  // Log the number of tracks for debugging
  console.log(`Remote stream has ${remoteStream.getTracks().length} tracks`);

  if (remoteStream.getTracks().length === 0) {
    console.warn("No audio tracks found in remote stream!");
  }

  // Set up the audio element
  if (!state.audioElement) {
    console.log("Creating new audio element");
    state.audioElement = new Audio();
    state.audioElement.autoplay = true;
  }

  // Force unmute and set volume
  state.audioElement.muted = false;
  state.audioElement.volume = 1.0;

  // Set the stream
  state.audioElement.srcObject = remoteStream;

  try {
    console.log("Attempting to play audio...");
    await state.audioElement.play();
    console.log("Audio playing successfully");
  } catch (error) {
    console.error("Error playing audio:", error);

    // Try recovery
    setTimeout(async () => {
      try {
        state.audioElement.muted = false;
        await state.audioElement.play().catch((e) => {
          console.error("Recovery play failed:", e);
          throw new Error("Failed to play audio stream");
        });
      } catch (e) {
        console.error("Recovery attempt failed:", e);
      }
    }, 300);
  }

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(remoteStream);
  const analyzer = audioContext.createAnalyser();
  source.connect(analyzer);

  const checkAudioLevels = setInterval(() => {
    if (!state.currentSession) {
      clearInterval(checkAudioLevels);
      return;
    }

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    if (average === 0) {
      console.warn("No audio detected!");
      state.eventEmitter.emit("audio:noSignal");
    } else {
      console.log("Audio level:", average);
    }
  }, 1000);

  return remoteStream;
}

// Attempt to play provider ringback/early media during provisional responses
function tryPlayEarlyMediaFromPeerConnection(peerConnection) {
  try {
    if (!peerConnection || state.earlyMediaSetup) return;
    if (!peerConnection.remoteDescription) {
      console.warn("No remote description for early media");
      return;
    }

    state.earlyMediaSetup = true;

    // Get the actual remote stream
    const remoteStreams = peerConnection.getRemoteStreams
      ? peerConnection.getRemoteStreams()
      : [];

    let stream = remoteStreams[0];

    if (!stream) {
      // Fallback: build from receivers
      const receivers = peerConnection.getReceivers();
      const audioTracks = receivers
        .filter(
          (r) => r.track?.kind === "audio" && r.track?.readyState === "live"
        )
        .map((r) => r.track);

      if (audioTracks.length === 0) {
        console.warn("No audio tracks for early media");
        state.earlyMediaSetup = false;
        return;
      }

      stream = new MediaStream(audioTracks);
    }

    if (!state.audioElement) {
      state.audioElement = new Audio();
      state.audioElement.autoplay = true;
      state.audioElement.playsInline = true;
      document.body.appendChild(state.audioElement);
    }

    // CRITICAL: Set these BEFORE srcObject
    state.audioElement.volume = 1.0;
    state.audioElement.muted = false;
    state.audioElement.srcObject = stream;

    console.log("✅ Early media configured");
    state.earlyMediaSetup = false;
  } catch (error) {
    console.error("Early media error:", error);
    state.earlyMediaSetup = false;
  }
}

export const sipCallService = {
  makeCall: async (number, options = {}) => {
    if (!state.userAgent || !state.isConnected) {
      throw new Error("SIP service not initialized or not connected");
    }

    try {
      const target = UserAgent.makeURI(
        `sip:${number}@${state.userAgent.configuration.uri.host}`
      );

      if (!target) {
        throw new Error("Failed to create target URI");
      }

      const inviterOptions = {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              ...options?.mediaConstraints?.audio,
            },
            video: false,
          },
          rtcConfiguration: {
            iceServers: state.userAgent?.configuration
              ?.sessionDescriptionHandlerFactoryOptions
              ?.peerConnectionConfiguration?.iceServers || [
              { urls: ["stun:stun1.l.google.com:19302"] },
              { urls: ["stun:stun2.l.google.com:19302"] },
              { urls: ["stun:stun3.l.google.com:19302"] },
              { urls: ["stun:stun4.l.google.com:19302"] },
            ],
            iceTransportPolicy: "all",
            rtcpMuxPolicy: "require",
            bundlePolicy: "balanced",
            iceCandidatePoolSize: 10,
          },
        },
        // Enable early media to hear provider tones if available
        earlyMedia: true,
        inviteWithoutSdp: false, // Set to false to ensure SDP is included in INVITE
        iceGatheringTimeout: 5000,
        sessionDescriptionHandlerModifiers: [
          // Prefer G.711 for compatibility, but never replace the entire SDP.
          (description) => {
            if (description?.sdp) {
              console.log("Original SDP:", description.sdp);

              const isInternalCall = number.length <= 4; // heuristic for extensions
              console.log("🔍 Call type detection:", {
                number,
                length: number.length,
                isInternalCall,
              });

              const reorder = (sdp) =>
                sdp.replace(
                  /m=audio (\d+) ([A-Z\/]+) (.*)/,
                  (match, port, proto, codecs) => {
                    const codecList = codecs.split(" ");
                    const preferred = codecList.filter(
                      (c) => c === "0" || c === "8" || c === "101"
                    );
                    const others = codecList.filter(
                      (c) => !preferred.includes(c)
                    );
                    const reordered = [...preferred, ...others].join(" ");
                    return `m=audio ${port} ${proto} ${reordered}`;
                  }
                );

              // For both internal and external, just reorder to prefer 0/8/101; keep everything else intact.
              description.sdp = reorder(description.sdp);
              console.log(
                isInternalCall
                  ? "Internal call - reordered codecs"
                  : "External call - reordered codecs",
                description.sdp
              );
            }
            // Always return the (possibly modified) description object
            return description;
          },
        ],
        delegate: {
          onReject: (response) => {
            console.log("Call rejected:", response);
            state.eventEmitter.emit("call:failed", {
              error: `Call rejected - ${
                response.message?.reasonPhrase || "Unknown reason"
              }`,
              statusCode: response.message?.statusCode,
              reasonPhrase: response.message?.reasonPhrase,
            });
          },
          // Add progress handler
          onProgress: (response) => {
            console.log("Call progress in delegate:", response.message);

            // Emit the progress event with the response
            state.eventEmitter.emit("progress", {
              statusCode: response.message.statusCode,
              reasonPhrase: response.message.reasonPhrase,
              message: response.message,
              session: state.currentSession,
            });

            // Attempt early media playback on provisional responses
            const code = response?.message?.statusCode;
            if (code === 180 || code === 183) {
              const pc =
                state.currentSession?.sessionDescriptionHandler?.peerConnection;
              if (pc) {
                // Small delay to allow remote description/tracks to bind
                setTimeout(() => tryPlayEarlyMediaFromPeerConnection(pc), 100);
              }
            }
          },
        },
      };

      const inviter = new Inviter(state.userAgent, target, inviterOptions);

      // Set up the session before sending INVITE
      await setupCallSession(inviter);

      // Send the INVITE request
      const inviteRequest = await inviter.invite({
        requestDelegate: {
          onProgress: (response) => {
            console.log("Call progress:", response.message);
            // Add this line to emit the progress event with the response
            state.eventEmitter.emit("progress", {
              statusCode: response.message.statusCode,
              reasonPhrase: response.message.reasonPhrase,
              message: response.message,
              session: inviter,
            });

            // Attempt early media playback on provisional responses
            const code = response?.message?.statusCode;
            if (code === 180 || code === 183) {
              const pc = inviter?.sessionDescriptionHandler?.peerConnection;
              if (pc) {
                setTimeout(() => tryPlayEarlyMediaFromPeerConnection(pc), 100);
              }
            }
          },
          onRedirect: (response) => {
            console.log("Call redirected:", response.message);
          },
          onReject: (response) => {
            console.log("Call rejected:", response.message);
            state.eventEmitter.emit("call:failed", {
              error: `Call rejected - ${
                response.message.reasonPhrase || "Unknown reason"
              }`,
              statusCode: response.message.statusCode,
              reasonPhrase: response.message.reasonPhrase,
            });
          },
        },
      });

      return inviter; // Return the session
    } catch (error) {
      console.error("Error making call:", error);
      throw error;
    }
  },

  monitorAudioLevels: (stream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    source.connect(analyzer);

    const checkAudioLevels = setInterval(() => {
      if (!state.currentSession) {
        clearInterval(checkAudioLevels);
        return;
      }

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      console.log("Audio level:", average);
      if (average === 0) {
        console.warn("No audio detected!");
        state.eventEmitter.emit("audio:noSignal");
      }
    }, 1000);
  },
  answerCall: async (options = {}) => {
    if (!state.incomingSession) {
      throw new Error("No incoming call to answer");
    }

    try {
      console.log("Current session state:", state.incomingSession.state);

      // Set up state change listener before accepting
      const stateChangePromise = new Promise((resolve) => {
        const stateHandler = (newState) => {
          console.log("Session state changed during answer:", newState);
          if (newState === SessionState.Established) {
            state.incomingSession.stateChange.removeListener(stateHandler);
            resolve();
          }
        };
        state.incomingSession.stateChange.addListener(stateHandler);
      });

      const sessionOptions = {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              ...options?.mediaConstraints?.audio,
            },
            video: false,
          },
          rtcConfiguration: {
            iceServers: state.userAgent?.configuration
              ?.sessionDescriptionHandlerFactoryOptions
              ?.peerConnectionConfiguration?.iceServers || [
              { urls: ["stun:stun1.l.google.com:19302"] },
              { urls: ["stun:stun2.l.google.com:19302"] },
              { urls: ["stun:stun3.l.google.com:19302"] },
              { urls: ["stun:stun4.l.google.com:19302"] },
            ],
            iceTransportPolicy: "all",
            rtcpMuxPolicy: "require",
            bundlePolicy: "balanced",
            iceCandidatePoolSize: 10,
          },
        },
        sessionDescriptionHandlerModifiers: [
          // Ensure codec compatibility for incoming calls
          (description) => {
            if (description.sdp) {
              console.log("Answer SDP - Original:", description.sdp);

              // Ensure we accept PCMU and PCMA
              description.sdp = description.sdp.replace(
                /m=audio (\d+) ([A-Z/]+) (.*)/,
                (match, port, proto, codecs) => {
                  // Ensure PCMU (0) and PCMA (8) are included
                  const codecList = codecs.split(" ");
                  if (!codecList.includes("0")) codecList.unshift("0");
                  if (!codecList.includes("8") && codecList.includes("0")) {
                    codecList.splice(1, 0, "8");
                  }
                  const finalCodecs = codecList.join(" ");
                  console.log("Answer SDP - Modified codecs:", finalCodecs);
                  return `m=audio ${port} ${proto} ${finalCodecs}`;
                }
              );

              console.log("Answer SDP - Modified:", description.sdp);
            }
            return description;
          },
        ],
      };

      // Accept the call and wait for establishment
      await state.incomingSession.accept(sessionOptions);
      await stateChangePromise;

      // Update state immediately
      state.callState = "connected";
      state.currentSession = state.incomingSession;
      state.callStartTime = Date.now();

      // Setup audio after call is established
      await setupAudioStream(state.incomingSession);

      // Stop ringing
      if (state.incomingSession.sessionDescriptionHandler?.peerConnection) {
        const pc =
          state.incomingSession.sessionDescriptionHandler.peerConnection;
        pc.getReceivers().forEach((receiver) => {
          if (receiver.track) {
            receiver.track.enabled = true;
          }
        });
      }

      // Emit events after successful setup
      state.eventEmitter.emit("call:answered");
      state.eventEmitter.emit("call:established", {
        remoteIdentity: state.incomingSession.remoteIdentity?.uri?.user,
        startTime: state.callStartTime,
      });

      // Register incoming call with AMI for monitoring and management
      const callData = {
        callId: state.incomingSession.id,
        extension: state.lastConfig?.extension,
        remoteNumber: state.incomingSession.remoteIdentity?.uri?.user,
        direction: "inbound",
        timestamp: new Date().toISOString(),
      };

      // Don't await this - let it run in background
      sipCallService
        .registerCallWithAMI(callData)
        .catch((err) =>
          console.warn(
            "Failed to register incoming call with AMI:",
            err.message
          )
        );
    } catch (error) {
      console.error("Error answering call:", error);
      state.eventEmitter.emit("call:failed", { error: error.message });
      throw error;
    }
  },
  rejectCall: async () => {
    // Check for incoming session first, then current session
    const sessionToReject = state.incomingSession || state.currentSession;

    if (!sessionToReject) {
      throw new Error("No incoming call to reject");
    }

    try {
      // Check if session is in a state that can be rejected
      if (
        sessionToReject.state === SessionState.Initial ||
        sessionToReject.state === SessionState.Establishing
      ) {
        await sessionToReject.reject();
      } else {
        console.log(
          "Session is in state",
          sessionToReject.state,
          "- cannot reject, terminating instead"
        );
        // For other states, try to terminate properly
        if (sessionToReject.state === SessionState.Established) {
          await sessionToReject.bye();
        } else if (sessionToReject.cancel) {
          await sessionToReject.cancel();
        }
      }

      // Clear the session references
      state.incomingSession = null;
      if (state.currentSession === sessionToReject) {
        state.currentSession = null;
      }
      state.callStartTime = null;
      state.callState = "idle";

      // Clean up audio
      if (state.audioElement) {
        state.audioElement.srcObject = null;
      }

      state.eventEmitter.emit("call:rejected");
    } catch (error) {
      console.error("Error rejecting call:", error);
      // Still clear the session to avoid stuck state
      state.incomingSession = null;
      if (state.currentSession === sessionToReject) {
        state.currentSession = null;
      }
      throw error;
    }
  },

  endCall: async () => {
    if (!state.currentSession) {
      throw new Error("No active call to end");
    }

    try {
      // Handle different session states
      switch (state.currentSession.state) {
        case SessionState.Establishing:
          // For outgoing calls that haven't connected yet
          if (state.currentSession.cancel) {
            await state.currentSession.cancel();
          }
          break;
        case SessionState.Established:
          // For connected calls
          await state.currentSession.bye();
          break;
        case SessionState.Initial:
        case SessionState.Terminating:
        case SessionState.Terminated:
          // For other states, try to reject if possible
          if (state.currentSession.reject) {
            await state.currentSession.reject();
          }
          break;
        default:
          // Default fallback
          if (state.currentSession.reject) {
            await state.currentSession.reject();
          } else if (state.currentSession.cancel) {
            await state.currentSession.cancel();
          }
      }

      state.currentSession = null;
      state.callStartTime = null;

      if (state.audioElement) {
        state.audioElement.srcObject = null;
      }

      state.eventEmitter.emit("call:ended");
    } catch (error) {
      console.error("Error ending call:", error);
      throw error;
    }
  },

  // Blind transfer (cold transfer) - using pure SIP.js REFER method
  transferCall: async (targetExtension, transferType = "blind") => {
    if (!state.currentSession) {
      throw new Error("No active call to transfer");
    }

    try {
      // Ensure call is established
      if (state.currentSession.state !== SessionState.Established) {
        throw new Error(
          "Call not established yet. Please wait until connected"
        );
      }

      console.log(
        `Initiating ${transferType} transfer to extension ${targetExtension}...`
      );

      // Store transfer state
      state.transferState = "transferring";

      // Emit transfer initiated event
      events.emit("call:transfer_initiated", {
        targetExtension,
        transferType,
        callId: state.currentSession.id,
        timestamp: new Date().toISOString(),
      });

      // Create the target SIP URI for the transfer
      const targetURI = UserAgent.makeURI(
        `sip:${targetExtension}@${state.userAgent.configuration.uri.host}`
      );

      if (!targetURI) {
        throw new Error("Failed to create target URI for transfer");
      }

      console.log("Created target URI for transfer:", targetURI.toString());
      // Store transfer target for event emissions
      state.lastTransferTarget = targetExtension;

      console.log("Transfer details🚨🚨🚨:", {
        targetExtension,
        targetURI: targetURI.toString(),
        currentSessionId: state.currentSession.id,
        currentSessionState: state.currentSession.state,
        dialogAvailable: !!state.currentSession.dialog,
        remoteURI: state.currentSession.remoteIdentity?.uri?.toString(),
      });

      // Setup transfer event handlers
      const transferPromise = new Promise((resolve, reject) => {
        const transferTimeout = setTimeout(() => {
          state.transferState = "failed";
          reject(new Error("Transfer timeout - no response received"));
        }, 30000); // 30 second timeout

        // Handle NOTIFY messages for transfer progress
        const originalOnNotify = state.currentSession.delegate?.onNotify;
        state.currentSession.delegate = {
          ...state.currentSession.delegate,
          onNotify: (request) => {
            console.log("Transfer NOTIFY received:", request);
            console.log("NOTIFY details🚨🚨🚨✅✅✅:", {
              method: request.method,
              fromURI: request.from?.uri?.toString(),
              toURI: request.to?.uri?.toString(),
              callId: request.callId,
              hasBody: !!request.body,
            });

            // Call original handler if exists
            if (originalOnNotify) {
              originalOnNotify.call(state.currentSession.delegate, request);
            }

            // Parse NOTIFY body for transfer status
            let body = "";
            if (request.body) {
              body =
                typeof request.body === "string"
                  ? request.body
                  : request.body.toString();
            }

            console.log("NOTIFY body content🔥🔥🔥✅✅✅:", body);

            if (body.includes("200 OK") || body.includes("200 ok")) {
              clearTimeout(transferTimeout);
              state.transferState = "completed";
              events.emit("call:transfer_accepted", {
                targetExtension: state.lastTransferTarget || targetExtension,
                transferType: transferType || "blind",
                timestamp: new Date().toISOString(),
              });
              resolve({ success: true, message: "Transfer completed" });
            } else if (
              body.includes("503") ||
              body.includes("404") ||
              body.includes("486") ||
              body.includes("487")
            ) {
              clearTimeout(transferTimeout);
              state.transferState = "failed";
              const errorMsg = body.includes("503")
                ? "Service Unavailable"
                : body.includes("404")
                ? "Extension Not Found"
                : body.includes("486")
                ? "Extension Busy"
                : "Transfer Cancelled";
              events.emit("call:transfer_failed", {
                error: errorMsg,
                targetExtension,
                transferType,
                timestamp: new Date().toISOString(),
              });
              reject(new Error(`Transfer failed: ${errorMsg}`));
            }
          },
        };
      });

      // Execute the REFER transfer
      try {
        console.log("🔄🐥🐥 Sending REFER request to transfer call...");
        console.log("REFER parameters:", {
          targetURI: targetURI.toString(),
          sessionId: state.currentSession.id,
          sessionState: state.currentSession.state,
        });

        await state.currentSession.refer(targetURI, {
          requestDelegate: {
            onAccept: () => {
              console.log("✅ REFER accepted by remote party");
              console.log("Transfer state changed to: accepted");
              state.transferState = "accepted";
              events.emit("call:transfer_progress", {
                status: "accepted",
                targetExtension,
                timestamp: new Date().toISOString(),
              });
            },
            onReject: (response) => {
              console.error("❌ REFER rejected:", response);
              console.error("Rejection details:", {
                statusCode: response.statusCode,
                reasonPhrase: response.reasonPhrase,
                body: response.body,
              });
              state.transferState = "failed";
              events.emit("call:transfer_failed", {
                error: `Transfer rejected: ${
                  response.reasonPhrase || "Unknown reason"
                }`,
                statusCode: response.statusCode,
                targetExtension,
                transferType,
                timestamp: new Date().toISOString(),
              });
            },
            onProgress: (response) => {
              console.log("📊 REFER progress:", response);
              console.log("Progress details:", {
                statusCode: response.statusCode,
                reasonPhrase: response.reasonPhrase,
              });
              events.emit("call:transfer_progress", {
                status: "trying",
                statusCode: response.statusCode,
                targetExtension,
                timestamp: new Date().toISOString(),
              });
            },
          },
        });

        console.log("⏳ REFER request sent, waiting for NOTIFY messages...");

        // Wait for transfer completion via NOTIFY
        const result = await transferPromise;

        console.log("Transfer completed successfully:", result);

        // For blind transfer, the call will be disconnected after successful REFER
        if (transferType === "blind") {
          state.transferState = "completed";
          events.emit("call:transfer_complete", {
            targetExtension,
            transferType,
            timestamp: new Date().toISOString(),
          });
        }

        return { success: true, data: { targetExtension, transferType } };
      } catch (transferError) {
        console.error("REFER transfer error:", transferError);
        state.transferState = "failed";

        // Check if it's a specific SIP error
        let errorMessage = transferError.message;
        if (transferError.cause) {
          errorMessage = `${errorMessage} - ${transferError.cause}`;
        }

        events.emit("call:transfer_failed", {
          error: errorMessage,
          targetExtension,
          transferType,
          callId: state.currentSession?.id,
          timestamp: new Date().toISOString(),
        });

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Transfer error:", error);
      state.transferState = "idle";
      throw error;
    }
  },

  // Attended transfer (warm transfer) - using pure SIP.js
  attendedTransfer: async (targetExtension) => {
    if (!state.currentSession) {
      throw new Error("No active call to transfer");
    }

    if (state.currentSession.state !== SessionState.Established) {
      throw new Error("Call must be established to start attended transfer");
    }

    try {
      console.log(
        `Starting attended transfer to extension ${targetExtension}...`
      );

      // Store the original session
      const originalSession = state.currentSession;

      // Set transfer state
      state.transferState = "consulting";

      // First, put the current call on hold
      console.log("Putting original call on hold...");
      await sipService.holdCall();

      // Emit attended transfer started event
      events.emit("call:attended_transfer_started", {
        targetExtension,
        callId: originalSession.id,
        timestamp: new Date().toISOString(),
      });

      // Create target URI for consultation call
      const domain = state.userAgent.configuration.uri.host;
      const targetURI = UserAgent.makeURI(`sip:${targetExtension}@${domain}`);

      if (!targetURI) {
        throw new Error("Failed to create target URI for consultation");
      }

      console.log("Creating consultation call to:", targetURI.toString());

      // Create consultation call session
      const inviter = new Inviter(state.userAgent, targetURI, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
        earlyMedia: true,
      });

      // Store consultation details
      const transferId = Date.now().toString();
      state.consultationCall = {
        transferId,
        targetExtension,
        startTime: Date.now(),
        session: null, // Will be set when consultation establishes
        originalSession: originalSession,
      };

      // Setup consultation session handlers
      inviter.stateChange.addListener((newState) => {
        console.log("Consultation call state:", newState);

        switch (newState) {
          case SessionState.Establishing:
            console.log("Consultation call establishing...");
            events.emit("transfer:consultation_ringing", {
              transferId,
              targetExtension,
            });
            break;

          case SessionState.Established:
            console.log("Consultation call established");
            state.consultationCall.session = inviter;

            // Handle audio for consultation
            const remoteStream =
              inviter.sessionDescriptionHandler?.remoteMediaStream;
            if (remoteStream && state.audioElement) {
              state.audioElement.srcObject = remoteStream;
              state.audioElement.play().catch(console.error);
            }

            events.emit("transfer:consultation_established", {
              transferId,
              targetExtension,
            });
            break;

          case SessionState.Terminated:
            console.log("Consultation call terminated");

            // If we're still in consulting state, it means the consultation failed
            if (state.transferState === "consulting") {
              // Unhold original call
              if (
                originalSession &&
                originalSession.state === SessionState.Established
              ) {
                sipService.unholdCall().catch(console.error);
              }

              state.consultationCall = null;
              state.transferState = "idle";

              events.emit("transfer:consultation_failed", {
                transferId,
                targetExtension,
              });
            }
            break;
        }
      });

      // Initiate the consultation call
      try {
        await inviter.invite({
          requestDelegate: {
            onAccept: (response) => {
              console.log("Consultation invite accepted:", response);
            },
            onReject: (response) => {
              console.error("Consultation invite rejected:", response);

              // Unhold original call
              if (
                originalSession &&
                originalSession.state === SessionState.Established
              ) {
                sipService.unholdCall().catch(console.error);
              }

              state.consultationCall = null;
              state.transferState = "idle";

              events.emit("transfer:consultation_rejected", {
                transferId,
                targetExtension,
                reason: response.reasonPhrase,
              });
            },
          },
        });

        // Update current session to consultation for UI
        state.currentSession = inviter;
        state.callState = "inCall";

        events.emit("transfer:managed_started", {
          transferId,
          targetExtension,
        });

        return {
          transferId,
          startTime: state.consultationCall.startTime,
          targetExtension,
        };
      } catch (error) {
        console.error("Failed to create consultation call:", error);

        // Unhold original call
        if (
          originalSession &&
          originalSession.state === SessionState.Established
        ) {
          await sipService.unholdCall();
        }

        state.consultationCall = null;
        state.transferState = "idle";

        throw error;
      }
    } catch (error) {
      console.error("Error starting attended transfer:", error);
      state.transferState = "idle";

      events.emit("call:attended_transfer_failed", {
        error: error.message,
        targetExtension,
        callId: state.currentSession?.id,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to start attended transfer: ${error.message}`);
    }
  },

  // Complete attended transfer - using SIP.js REFER with Replaces
  completeAttendedTransfer: async () => {
    try {
      if (
        !state.consultationCall?.session ||
        !state.consultationCall?.originalSession
      ) {
        throw new Error("No active consultation for transfer completion");
      }

      console.log("Completing attended transfer...");

      const consultationSession = state.consultationCall.session;
      const originalSession = state.consultationCall.originalSession;

      // Get the Call-ID and tags from the consultation session for Replaces header
      const consultationDialog = consultationSession.dialog;
      if (!consultationDialog) {
        throw new Error("Consultation dialog not available");
      }

      // Build the Replaces header value
      const callId = consultationDialog.id.callId;
      const fromTag = consultationDialog.id.localTag;
      const toTag = consultationDialog.id.remoteTag;
      const replacesValue = `${callId};to-tag=${toTag};from-tag=${fromTag}`;

      console.log("Replaces header value:", replacesValue);

      // Create the REFER-TO URI with Replaces parameter
      const targetExtension = state.consultationCall.targetExtension;
      const domain = state.userAgent.configuration.uri.host;
      const referToUri = `<sip:${targetExtension}@${domain}?Replaces=${encodeURIComponent(
        replacesValue
      )}>`;

      console.log("REFER-TO URI with Replaces:", referToUri);

      // Send REFER on the original session with Replaces header
      const options = {
        requestOptions: {
          extraHeaders: [
            `Refer-To: ${referToUri}`,
            "Referred-By: " + state.userAgent.configuration.uri.toString(),
          ],
        },
        requestDelegate: {
          onAccept: () => {
            console.log("Attended transfer REFER accepted");

            // End the consultation call
            if (consultationSession.state === SessionState.Established) {
              consultationSession.bye();
            }

            // Get transferId before clearing state
            const transferId = state.consultationCall?.transferId;

            // Clear state
            state.consultationCall = null;
            state.transferState = "completed";
            state.currentSession = null;
            state.callState = "idle";

            events.emit("transfer:managed_completed", {
              transferId,
              targetExtension,
            });
          },
          onReject: (response) => {
            console.error("Attended transfer REFER rejected:", response);

            // Return to original call
            state.currentSession = originalSession;
            if (originalSession.isOnHold) {
              sipService.unholdCall().catch(console.error);
            }

            // End consultation call
            if (consultationSession.state === SessionState.Established) {
              consultationSession.bye();
            }

            events.emit("call:transfer_failed", {
              error: `Transfer rejected: ${response.reasonPhrase}`,
              statusCode: response.statusCode,
            });
          },
        },
      };

      // Use the raw refer method with custom Refer-To header
      await originalSession.refer(
        UserAgent.makeURI(`sip:${targetExtension}@${domain}`),
        options
      );

      state.transferState = "completed";
      return true;
    } catch (error) {
      console.error("Error in attended transfer completion:", error);

      // Try to recover by returning to original call
      if (state.consultationCall?.originalSession) {
        state.currentSession = state.consultationCall.originalSession;
        if (state.consultationCall.originalSession.isOnHold) {
          sipService.unholdCall().catch(console.error);
        }
      }

      state.transferState = "idle";
      throw error;
    }
  },

  // Cancel attended transfer - using pure SIP.js
  cancelAttendedTransfer: async () => {
    try {
      if (!state.consultationCall) {
        throw new Error("No active managed transfer to cancel");
      }

      console.log("Cancelling attended transfer...");

      const {
        session: consultationSession,
        originalSession,
        transferId,
      } = state.consultationCall;

      // End the consultation call if active
      if (
        consultationSession &&
        consultationSession.state === SessionState.Established
      ) {
        console.log("Ending consultation call...");
        await consultationSession.bye();
      }

      // Return to the original call
      if (originalSession) {
        console.log("Returning to original call...");
        state.currentSession = originalSession;
        state.callState = "inCall";

        // Unhold the original call if it's on hold
        if (originalSession.isOnHold) {
          console.log("Unholding original call...");
          await sipService.unholdCall();
        }

        // Restore audio to original call
        const remoteStream =
          originalSession.sessionDescriptionHandler?.remoteMediaStream;
        if (remoteStream && state.audioElement) {
          state.audioElement.srcObject = remoteStream;
          state.audioElement.play().catch(console.error);
        }
      }

      // Clear consultation state
      state.consultationCall = null;
      state.transferState = "idle";

      events.emit("transfer:managed_cancelled", { transferId });

      console.log("Attended transfer cancelled successfully");
      return true;
    } catch (error) {
      console.error("Error cancelling attended transfer:", error);

      // Try to recover
      if (state.consultationCall?.originalSession) {
        state.currentSession = state.consultationCall.originalSession;
        state.callState = "inCall";
      }

      state.consultationCall = null;
      state.transferState = "idle";

      throw error;
    }
  },

  // Add method to check if transfer is supported
  isTransferSupported: () => {
    return (
      state.currentSession &&
      state.currentSession.state === SessionState.Established &&
      typeof state.currentSession.refer === "function"
    );
  },

  // Add method to get current transfer state
  getTransferState: () => {
    return {
      canTransfer:
        state.currentSession &&
        state.currentSession.state === SessionState.Established,
      currentSession: state.currentSession
        ? {
            id: state.currentSession.id,
            state: state.currentSession.state,
            remoteIdentity: state.currentSession.remoteIdentity?.uri?.user,
            hasDialog: !!state.currentSession.dialog,
          }
        : null,
    };
  },

  // Register call with AMI for monitoring and management
  // Note: The backend no longer exposes /api/ami/call-events. This is now a no-op
  // to avoid 404 errors during calls. Call monitoring is handled via WebSocket/AMI
  // services server-side.
  registerCallWithAMI: async (_callData) => {
    return true;
  },

  // Get available agents for transfer
  getAvailableAgents: async () => {
    try {
      const currentExtension = state.lastConfig?.extension;
      const apiHost =
        process.env.NODE_ENV === "development"
          ? "localhost:8004"
          : "cs.hugamara.com";
      const apiProtocol =
        process.env.NODE_ENV === "development" ? "http" : "https";

      const response = await fetch(
        `${apiProtocol}://${apiHost}/api/transfers/available-agents?currentExtension=${currentExtension}`,
        {
          headers: {
            Authorization: `Bearer ${storageService.getAuthToken() || ""}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to get available agents");
      }

      return result.data;
    } catch (error) {
      console.error("Error getting available agents:", error);
      throw error;
    }
  },
};

// Update the WebSocket handlers with better error handling
function setupWebSocketHandlers(transport) {
  let reconnectTimer = null;
  const MAX_RECONNECT_ATTEMPTS = 10;
  let reconnectAttempts = 0;

  transport.onConnect = () => {
    // console.log("✅ [SIP WebSocket] Connected successfully");
    state.isConnected = true;
    reconnectAttempts = 0;
    state.eventEmitter.emit("ws:connected");
  };

  transport.onDisconnect = (error) => {
    console.warn("❌ [SIP WebSocket] Disconnected:", error);
    console.warn("🔧 WebSocket disconnect details:", {
      error: error?.message || error,
      code: error?.code || "unknown",
      reason: error?.reason || "unknown",
      wasClean: error?.wasClean || false,
    });
    state.isConnected = false;
    state.eventEmitter.emit("ws:disconnected", error);

    // Delegate orchestration to higher-level connection logic (connectionManager/reconnect())
    // Avoid internal retry loops here for consistency with centralized reconnection
    state.eventEmitter.emit("ws:failed");
  };

  if (transport.ws) {
    transport.ws.onerror = (event) => {
      console.error("[SIP WebSocket] Error:", event);
      state.eventEmitter.emit("ws:error", event);
    };
  }

  return transport;
}

// Create a delegate handler factory that handles incoming calls
function createUserAgentDelegate() {
  return {
    onInvite: (invitation) => {
      console.log("Incoming call received", invitation);

      // Add immediate termination handler
      invitation.stateChange.addListener((newState) => {
        if (newState === SessionState.Terminated) {
          handleCallTermination(invitation, "remote_termination");
          state.incomingSession = null;
        }
      });

      // Handle BYE requests immediately
      invitation.delegate = {
        onBye: (bye) => {
          handleCallTermination(invitation, "bye");
          // Acknowledge BYE immediately
          bye.accept();
        },
      };

      setupCallSession(invitation);
      state.incomingSession = invitation;

      state.eventEmitter.emit("call:incoming", {
        remoteIdentity: invitation.remoteIdentity?.uri?.user,
        session: invitation,
      });
    },
  };
}

// Create a connection promise factory with enhanced race condition prevention
function createConnectionPromise(userAgent) {
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const connectionTimeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.error("❌ WebSocket connection timeout after 15 seconds");
        reject(new Error("WebSocket connection timeout exceeded"));
      }
    }, 15000); // Increased from 5 to 15 seconds

    userAgent.transport.onConnect = () => {
      if (!isResolved) {
        isResolved = true;
        console.log("✅ WebSocket transport connected");
        clearTimeout(connectionTimeout);
        state.isConnected = true;
        resolve(userAgent);
      }
    };

    userAgent.transport.onDisconnect = (error) => {
      if (!isResolved) {
        isResolved = true;
        console.error("❌ WebSocket transport disconnected:", error);
        clearTimeout(connectionTimeout);
        state.isConnected = false;
        reject(error);
      }
    };

    // Add error handling with race condition prevention
    if (userAgent.transport.ws) {
      userAgent.transport.ws.onerror = (event) => {
        if (!isResolved) {
          isResolved = true;
          console.error("❌ WebSocket error:", event);
          clearTimeout(connectionTimeout);
          reject(
            new Error(`WebSocket error: ${event.type || "Unknown error"}`)
          );
        }
      };
    }
  });
}

const emitCallEvent = (eventType, callData) => {
  const event = {
    action: eventType,
    data: {
      uniqueId: callData.uniqueId || Date.now().toString(),
      callerId: callData.remoteIdentity,
      extension: callData.localIdentity,
      startTime: callData.startTime || new Date().toISOString(),
      status: callData.status || "new",
      direction: callData.direction || "outbound",
    },
  };

  state.eventEmitter.emit("call:event", event);
};

async function handleAudioTrack(event) {
  // console.log("🎵 Audio Element readiness:", {
  //   muted: state.audioElement.muted,
  //   volume: state.audioElement.volume,
  //   hasStream: !!state.audioElement.srcObject,
  //   streamTracks: state.audioElement.srcObject?.getTracks().length || 0,
  //   autoplay: state.audioElement.autoplay,
  // });

  // Create stream from track event - similar to chrome extension
  let stream;
  if (event.streams && event.streams.length > 0) {
    stream = event.streams[0];
    console.log("🎵 Using stream from track event");
  } else {
    console.log("🎵 Creating new stream from track");
    stream = new MediaStream([event.track]);
  }

  console.log(
    "🎵 Setting up audio with stream tracks:",
    stream.getTracks().length
  );

  // Ensure audio element exists and is properly configured
  if (!state.audioElement) {
    // console.log("🎵 Creating new audio element");
    state.audioElement = document.createElement("audio");
    state.audioElement.id = "sipjs-remote-audio";
    state.audioElement.autoplay = true;
    state.audioElement.controls = false;
    state.audioElement.style.display = "none";
    state.audioElement.volume = 0.8; // Set reasonable volume like chrome extension
    state.audioElement.preload = "auto";
    document.body.appendChild(state.audioElement);
  }

  // Force proper audio settings
  state.audioElement.muted = false;
  state.audioElement.volume = 0.8;

  // Set the stream
  if (state.audioElement.srcObject !== stream) {
    // console.log("🎵 Setting new stream to audio element");
    state.audioElement.srcObject = stream;
  } else {
    console.log("🎵 Stream already set, ensuring tracks are enabled");
    // Make sure all tracks are enabled
    stream.getTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  try {
    const isEstablished =
      state.currentSession?.state === SessionState.Established;
    // console.log(
    //   `🎵 Playing audio (${
    //     isEstablished ? "established call" : "possibly early media"
    //   })`
    // );

    // Play immediately
    const playPromise = state.audioElement.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("✅ Remote audio playback started successfully");
          console.log("🔊 Audio element state:", {
            paused: state.audioElement.paused,
            volume: state.audioElement.volume,
            muted: state.audioElement.muted,
            readyState: state.audioElement.readyState,
            networkState: state.audioElement.networkState,
          });
          setupAudioMonitoring(stream);
        })
        .catch((error) => {
          console.error("❌ Remote audio autoplay blocked:", error.message);

          // Handle autoplay restrictions like chrome extension
          if (error.name === "NotAllowedError") {
            console.log("🔧 Setting up click handler for audio activation");

            // Create visible notification for user to enable audio
            const notification = document.createElement("div");
            notification.id = "audio-enable-notification";
            notification.innerHTML = `
              <div style="
                position: fixed; 
                top: 50px; 
                right: 20px; 
                background: #007bff; 
                color: white; 
                padding: 15px 20px; 
                border-radius: 8px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                cursor: pointer;
                max-width: 300px;
              ">
                🔊 Click here to enable call audio
                <div style="font-size: 11px; opacity: 0.9; margin-top: 5px;">
                  Browser blocked audio - click to activate
                </div>
              </div>
            `;

            const enableAudio = () => {
              state.audioElement
                .play()
                .then(() => {
                  console.log("✅ Audio enabled after user interaction");
                  notification.remove();
                })
                .catch((err) => {
                  console.error("❌ Still failed to enable audio:", err);
                });
            };

            notification.addEventListener("click", enableAudio);
            document.body.appendChild(notification);

            // Auto-remove notification after 10 seconds
            setTimeout(() => {
              if (notification.parentNode) {
                notification.remove();
              }
            }, 10000);
          }
        });
    }
  } catch (error) {
    console.error("❌ Error playing audio:", error);
  }
}

function playRemoteAudio(stream) {
  console.log("🎵 Setting up remote audio playback");

  try {
    // Find or create audio element
    let audioElement = document.getElementById("sipjs-remote-audio");

    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = "sipjs-remote-audio";
      audioElement.autoplay = true;
      audioElement.controls = false;
      audioElement.style.display = "none";
      // Important: Set volume to a reasonable level
      audioElement.volume = 0.8;
      // Ensure audio plays through default speakers
      audioElement.preload = "auto";
      document.body.appendChild(audioElement);
      // console.log("🎵 Created audio element with volume:", audioElement.volume);
    }

    if (audioElement.srcObject !== stream) {
      audioElement.srcObject = stream;
      console.log("🎵 Set new stream as audio source");

      // Force audio element to load and play
      const playPromise = audioElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ Remote audio playback started successfully");
            console.log("🔊 Audio element state:", {
              paused: audioElement.paused,
              volume: audioElement.volume,
              muted: audioElement.muted,
              readyState: audioElement.readyState,
              networkState: audioElement.networkState,
            });
          })
          .catch((error) => {
            console.error("❌ Remote audio autoplay blocked:", error.message);
          });
      }
    }

    // Monitor audio tracks with minimal logging
    const audioTracks = stream.getAudioTracks();
    // console.log(`🎵 Stream has ${audioTracks.length} audio track(s)`);

    audioTracks.forEach((track, index) => {
      // Only log track state changes, not constant state
      track.onended = () => {
        console.log(`🎵 Audio track ${index} ended`);
      };

      track.onmute = () => {
        console.log(`🔇 Audio track ${index} muted`);
      };

      track.onunmute = () => {
        console.log(`🔊 Audio track ${index} unmuted`);
      };
    });
  } catch (error) {
    console.error("❌ Error setting up remote audio:", error);
  }
}

function setupAudioMonitoring(stream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyzer = audioContext.createAnalyser();
  source.connect(analyzer);

  const monitoringInterval = setInterval(() => {
    if (!state.currentSession) {
      clearInterval(monitoringInterval);
      return;
    }

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    if (average === 0) {
      state.eventEmitter.emit("audio:noSignal");
    }
  }, 1000);
}
