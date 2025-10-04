import JsSIP from "jssip";
import { EventEmitter } from "events";

const state = {
  ua: null,
  session: null,
  isConnected: false,
  eventEmitter: new EventEmitter(),
  lastConfig: null,
  isDisconnecting: false,
  isInitializing: false,
};

function debugLog(message, data = null) {
  // Only log important audio and call events
  const importantPrefixes = [
    "🎵",
    "🔊",
    "🔇",
    "📞",
    "🔔",
    "✅",
    "❌",
    "🎤",
    "🔧",
  ];

  const isImportant = importantPrefixes.some((prefix) =>
    message.includes(prefix)
  );

  if (isImportant) {
    console.log(`[SIP] ${message}`, data || "");
  }
}

// Audio stream setup functions
function setupAudioStreams(session) {
  debugLog("🔊 Setting up audio streams for session");

  try {
    if (session && session.connection && session.connection.getRemoteStreams) {
      const remoteStreams = session.connection.getRemoteStreams();
      debugLog("🔊 Remote streams found:", remoteStreams.length);

      if (remoteStreams.length > 0) {
        const remoteStream = remoteStreams[0];
        playRemoteAudio(remoteStream);
      }
    } else {
      debugLog("⚠️ No remote streams available on session connection");
    }
  } catch (error) {
    debugLog("❌ Error setting up audio streams:", error);
  }
}

function setupPeerConnectionAudio(peerConnection) {
  debugLog("🔗 Setting up peer connection audio handlers");

  try {
    // Handle incoming tracks (remote audio)
    peerConnection.ontrack = (event) => {
      debugLog("🎵 Received remote track:", {
        kind: event.track.kind,
        id: event.track.id,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        muted: event.track.muted,
        streamCount: event.streams?.length || 0,
      });

      if (event.track.kind === "audio") {
        debugLog("🔊 Setting up remote audio track");

        // Use the stream from the event if available, otherwise create one
        let stream;
        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
          debugLog("🔊 Using stream from track event");
        } else {
          stream = new MediaStream([event.track]);
          debugLog("🔊 Created new stream from track");
        }

        // Set up the audio playback
        playRemoteAudio(stream);

        // Monitor track state changes
        event.track.onended = () => {
          debugLog("🔊 Remote audio track ended");
        };

        event.track.onmute = () => {
          debugLog("🔇 Remote audio track muted");
        };

        event.track.onunmute = () => {
          debugLog("🔊 Remote audio track unmuted");
        };
      }
    };

    // Monitor connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      debugLog("🧊 ICE Connection State:", peerConnection.iceConnectionState);

      // When ICE is connected, check for streams again
      if (
        peerConnection.iceConnectionState === "connected" ||
        peerConnection.iceConnectionState === "completed"
      ) {
        debugLog("🧊 ICE connected - checking for audio streams");

        // Check for remote streams
        const remoteStreams = peerConnection.getRemoteStreams
          ? peerConnection.getRemoteStreams()
          : [];
        if (remoteStreams.length > 0) {
          debugLog("🧊 Found remote streams after ICE connection");
          remoteStreams.forEach((stream, index) => {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
              debugLog(`🧊 Playing audio from remote stream ${index}`);
              playRemoteAudio(stream);
            }
          });
        }

        // Also check receivers
        const receivers = peerConnection.getReceivers();
        const audioReceivers = receivers.filter(
          (r) =>
            r.track && r.track.kind === "audio" && r.track.readyState === "live"
        );

        if (audioReceivers.length > 0 && remoteStreams.length === 0) {
          debugLog(
            `🧊 Creating stream from ${audioReceivers.length} audio receivers`
          );
          const stream = new MediaStream();
          audioReceivers.forEach((receiver) => {
            stream.addTrack(receiver.track);
          });
          playRemoteAudio(stream);
        }
      }
    };

    peerConnection.onconnectionstatechange = () => {
      debugLog("🔗 Connection State:", peerConnection.connectionState);
    };

    peerConnection.onicegatheringstatechange = () => {
      debugLog("🧊 ICE Gathering State:", peerConnection.iceGatheringState);
    };

    // Handle data channel events (if any)
    peerConnection.ondatachannel = (event) => {
      debugLog("📡 Data channel received:", event.channel.label);
    };

    // Check if there are already streams available
    const existingStreams = peerConnection.getRemoteStreams
      ? peerConnection.getRemoteStreams()
      : [];
    if (existingStreams.length > 0) {
      debugLog("🔗 Found existing remote streams during setup");
      existingStreams.forEach((stream, index) => {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          debugLog(`🔗 Setting up audio from existing stream ${index}`);
          playRemoteAudio(stream);
        }
      });
    }
  } catch (error) {
    debugLog("❌ Error setting up peer connection audio:", error);
  }
}

function playRemoteAudio(stream) {
  debugLog("🎵 Setting up remote audio playback");

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
      debugLog("🎵 Created audio element with volume:", audioElement.volume);
    }

    if (audioElement.srcObject !== stream) {
      audioElement.srcObject = stream;
      debugLog("🎵 Set new stream as audio source");

      // Force audio element to load and play
      const playPromise = audioElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            debugLog("✅ Remote audio playback started successfully");
            debugLog("🔊 Audio element state:", {
              paused: audioElement.paused,
              volume: audioElement.volume,
              muted: audioElement.muted,
              readyState: audioElement.readyState,
              networkState: audioElement.networkState,
            });
          })
          .catch((error) => {
            debugLog("❌ Remote audio autoplay blocked:", error.message);

            // Handle autoplay restrictions
            if (error.name === "NotAllowedError") {
              debugLog("🔧 Setting up click handler for audio activation");

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
                audioElement
                  .play()
                  .then(() => {
                    debugLog("✅ Audio enabled after user interaction");
                    notification.remove();
                  })
                  .catch((err) => {
                    debugLog("❌ Still failed to enable audio:", err);
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
    }

    // Monitor audio tracks with minimal logging
    const audioTracks = stream.getAudioTracks();
    debugLog(`🎵 Stream has ${audioTracks.length} audio track(s)`);

    audioTracks.forEach((track, index) => {
      // Only log track state changes, not constant state
      track.onended = () => {
        debugLog(`🎵 Audio track ${index} ended`);
      };

      track.onmute = () => {
        debugLog(`🔇 Audio track ${index} muted`);
      };

      track.onunmute = () => {
        debugLog(`🔊 Audio track ${index} unmuted`);
      };
    });
  } catch (error) {
    debugLog("❌ Error setting up remote audio:", error);
  }
}

function createConnectionPromise(ua) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      debugLog("Connection timed out");
      reject(new Error("Connection timed out"));
    }, 10000);

    ua.on("connected", () => {
      clearTimeout(timeout);
      debugLog("Connected to WebSocket");
      state.isConnected = true;
      state.eventEmitter.emit("ws:connected");
    });

    ua.on("disconnected", (e) => {
      clearTimeout(timeout);
      state.isConnected = false;
      debugLog("Disconnected from WebSocket");
      state.eventEmitter.emit("ws:disconnected");
      reject(
        new Error(`WebSocket disconnected: ${e?.cause || "Unknown reason"}`)
      );
    });

    ua.on("registered", (e) => {
      clearTimeout(timeout);
      debugLog("✅ Successfully registered with Asterisk");
      state.eventEmitter.emit("registered");
      resolve(ua);
    });

    ua.on("unregistered", (e) => {
      debugLog("❌ Unregistered from Asterisk");
      state.eventEmitter.emit("unregistered");
      if (e && e.cause) {
        debugLog("Unregistration cause:", e.cause);
        reject(new Error(`Unregistered: ${e.cause}`));
      }
    });

    ua.on("registrationFailed", (e) => {
      clearTimeout(timeout);
      debugLog("❌ Registration failed", {
        cause: e?.cause,
        statusCode: e?.response?.status_code,
        reasonPhrase: e?.response?.reason_phrase,
      });
      state.eventEmitter.emit("registrationFailed", e);
      const errorMessage =
        e?.cause || e?.response?.status_code || "Unknown error";
      reject(new Error(`Registration failed: ${errorMessage}`));
    });
  });
}

async function connect(config) {
  debugLog("Starting SIP connection");

  const { server, extension, password, transport, ws_servers } = config;

  try {
    // Determine WebSocket URL based on transport and environment
    let wsUrl;
    if (ws_servers && ws_servers.length > 0) {
      // Use the WebSocket URI provided by the backend
      wsUrl = ws_servers[0].uri;
      debugLog("Using WebSocket URI from backend:", wsUrl);
    } else {
      // Fallback to manual construction
      if (transport === "wss") {
        wsUrl = `wss://${server}:8089/ws`;
      } else {
        wsUrl = `ws://${server}:8088/ws`;
      }
      debugLog("Using manually constructed WebSocket URL:", wsUrl);
    }

    // Explicitly request the 'sip' subprotocol so Asterisk accepts the WS handshake
    const socket = new JsSIP.WebSocketInterface(wsUrl, 'sip');

    // Add WebSocket event listeners for debugging
    socket.onopen = () => {
      debugLog("WebSocket connection opened");
    };

    socket.onclose = (event) => {
      debugLog("WebSocket connection closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    };

    socket.onerror = (error) => {
      debugLog("WebSocket error occurred", error);
    };

    const configuration = {
      sockets: [socket],
      uri: `sip:${extension}@${server}`,
      password: password,
      register: true,
      session_timers: false,
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      registrar_server: `sip:${server}`,
      contact_uri: `sip:${extension}@${server}`,
      authorization_user: extension,
      realm: server,
      ha1: null,
      register_expires: 600,
      no_answer_timeout: 60000,
      use_preloaded_route: false,
      // WebRTC-specific configuration
      media_encryption: "sdes",
      ice_support: true,
      rtcp_mux: true,
      use_avpf: true,
      media_use_received_transport: true,
      force_rport: true,
      rewrite_contact: true,
      rtp_symmetric: true,
      dtls_verify: "fingerprint",
      dtls_setup: "actpass",
    };

    const ua = new JsSIP.UA(configuration);
    state.ua = ua;

    // Set up event handlers for the UA
    ua.on("newRTCSession", (e) => {
      debugLog("New call session:", {
        originator: e.originator,
        from: e.session.remote_identity.uri.toString(),
      });
      state.session = e.session;

      // Set up audio for BOTH incoming and outgoing calls
      const setupSessionAudio = (session) => {
        // Set up peer connection audio when available
        session.on("peerconnection", (event) => {
          if (event.peerconnection) {
            setupPeerConnectionAudio(event.peerconnection);
          }
        });

        // Set up audio when call is confirmed/accepted
        session.on("confirmed", () => {
          setupAudioStreams(session);
          if (session.sessionDescriptionHandler?.peerConnection) {
            setupPeerConnectionAudio(
              session.sessionDescriptionHandler.peerConnection
            );
          }
        });

        session.on("accepted", () => {
          setupAudioStreams(session);
          if (session.sessionDescriptionHandler?.peerConnection) {
            setupPeerConnectionAudio(
              session.sessionDescriptionHandler.peerConnection
            );
          }
        });

        // For incoming calls, also set up audio on progress events
        if (e.originator === "remote") {
          session.on("progress", (progressEvent) => {
            // Set up audio on any progress event for incoming calls
            if (session.sessionDescriptionHandler?.peerConnection) {
              setupPeerConnectionAudio(
                session.sessionDescriptionHandler.peerConnection
              );
            }
          });
        }

        // Monitor session description handler creation
        session.on("SessionDescriptionHandler-created", () => {
          if (session.sessionDescriptionHandler?.peerConnection) {
            setupPeerConnectionAudio(
              session.sessionDescriptionHandler.peerConnection
            );
          }
        });
      };

      // Set up audio for this session
      setupSessionAudio(e.session);

      if (e.originator === "remote") {
        // Extract just the caller's number from the SIP URI
        const fullUri = e.session.remote_identity.uri.toString();
        let callerNumber = fullUri;

        // Parse SIP URI to extract just the number
        // Format: sip:number@domain or sip:number
        if (fullUri.startsWith("sip:")) {
          const uriWithoutSip = fullUri.substring(4); // Remove "sip:"
          const atIndex = uriWithoutSip.indexOf("@");
          if (atIndex !== -1) {
            callerNumber = uriWithoutSip.substring(0, atIndex);
          } else {
            callerNumber = uriWithoutSip;
          }
        }

        debugLog("📞 Incoming call from:", {
          fullUri: fullUri,
          callerNumber: callerNumber,
        });

        state.eventEmitter.emit("incoming_call", {
          detail: {
            from: callerNumber, // Use just the number
            fullUri: fullUri, // Keep full URI for debugging
          },
        });
      }
      e.session.on("accepted", () => state.eventEmitter.emit("call_accepted"));
      e.session.on("ended", () => {
        state.eventEmitter.emit("call_terminated");
        state.session = null;
      });
      e.session.on("failed", (data) => {
        debugLog("❌ Session failed event:", data);
        state.eventEmitter.emit("call_failed", {
          cause: data.cause,
          originator: data.originator,
          message: data.message,
        });
        state.session = null;
      });
      e.session.on("hold", () =>
        state.eventEmitter.emit("hold_state_change", {
          detail: { onHold: true },
        })
      );
      e.session.on("unhold", () =>
        state.eventEmitter.emit("hold_state_change", {
          detail: { onHold: false },
        })
      );
      e.session.on("muted", () =>
        state.eventEmitter.emit("mute_state_change", {
          detail: { isMuted: true },
        })
      );
      e.session.on("unmuted", () =>
        state.eventEmitter.emit("mute_state_change", {
          detail: { isMuted: false },
        })
      );
    });

    debugLog("Starting SIP UserAgent...");
    ua.start();

    return createConnectionPromise(ua);
  } catch (error) {
    debugLog("Error during SIP connection setup:", error);
    throw error;
  }
}

async function disconnect() {
  debugLog("Starting SIP disconnect");
  state.isDisconnecting = true;

  try {
    if (state.ua) {
      if (state.ua.isRegistered()) {
        debugLog("Unregistering from SIP server...");
        state.ua.unregister();
        // Wait a moment for unregister to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      debugLog("Stopping SIP UserAgent...");
      state.ua.stop();
      state.ua = null;
      state.isConnected = false;
    }

    if (state.session) {
      state.session.terminate();
      state.session = null;
    }

    debugLog("SIP service disconnected successfully");
  } catch (error) {
    debugLog("Error during disconnect:", error);
  } finally {
    state.isDisconnecting = false;
  }
}

// Add dedicated unregister function
async function unregister() {
  debugLog("=== Starting manual unregister process ===");
  if (state.ua) {
    debugLog("UA exists, checking current status");
    debugLog("UA is registered:", state.ua.isRegistered());
    debugLog("UA is connected:", state.ua.isConnected());

    debugLog("Manually unregistering from SIP server...");
    state.ua.unregister({
      all: true, // Unregister all contacts
    });

    // Update state to reflect unregistered status
    // Note: We don't set state.isConnected = false because UA is still connected to websocket

    debugLog("Unregister method called on UA");
    state.eventEmitter.emit("unregistered");
  } else {
    debugLog("No UA available for unregistration");
  }
}

// Add re-register function
async function reregister() {
  debugLog("=== Starting re-register process ===");
  debugLog("UA exists:", !!state.ua);
  debugLog("Is connected:", state.isConnected);

  if (state.ua) {
    debugLog("UA exists, checking current status before re-register");
    debugLog("UA is registered:", state.ua.isRegistered());
    debugLog("UA is connected:", state.ua.isConnected());

    debugLog("Re-registering to SIP server...");
    try {
      state.ua.register();
      debugLog("Register method called on UA successfully");
    } catch (error) {
      debugLog("Error calling register:", error);
      throw error;
    }
  } else {
    debugLog("No SIP UA available for re-registration");
    throw new Error("No SIP UserAgent available for re-registration");
  }
}

let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

async function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    debugLog("Max reconnection attempts reached.");
    return;
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);

  const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectTimer = setTimeout(async () => {
    debugLog(
      `Attempting reconnection... (${
        reconnectAttempts + 1
      }/${MAX_RECONNECT_ATTEMPTS})`
    );
    reconnectAttempts++;
    try {
      await disconnect();
      if (state.lastConfig) {
        await connect(state.lastConfig);
        reconnectAttempts = 0; // Reset on success
      }
    } catch (error) {
      debugLog("Reconnection failed.", error);
      reconnect(); // Schedule next attempt
    }
  }, delay);
}

export const sipService = {
  initialize: async (config) => {
    debugLog("Initializing SIP service");
    if (state.isInitializing) {
      debugLog("Initialization already in progress");
      return;
    }
    state.isInitializing = true;

    try {
      if (state.ua) {
        debugLog("Disconnecting existing SIP UA");
        await disconnect();
      }

      state.lastConfig = config;
      await connect(config);
      debugLog("SIP service initialized successfully");
    } catch (error) {
      debugLog("Error during SIP initialization:", error);
      throw error;
    } finally {
      state.isInitializing = false;
    }
  },
  disconnect,
  unregister, // Add unregister to the public interface
  reregister, // Add reregister to the public interface
  reconnect,
  events: state.eventEmitter,
  getRegistrationStatus: () => {
    if (!state.ua) {
      return "No UA";
    }
    if (state.ua.isRegistered()) {
      return "Registered";
    }
    if (state.ua.isConnected()) {
      return "Connected but not registered";
    }
    return "Disconnected";
  },
  answerCall: () => {
    if (state.session) {
      // Answer with proper media constraints
      state.session.answer({
        mediaConstraints: { audio: true, video: false },
        // Add ICE servers for better connectivity
        pcConfig: {
          iceServers: state.lastConfig?.iceServers || [
            { urls: "stun:stun.l.google.com:19302" },
          ],
          iceTransportPolicy: "all",
          bundlePolicy: "balanced",
          rtcpMuxPolicy: "require",
        },
      });

      // Ensure audio setup after answering
      setTimeout(() => {
        if (state.session) {
          setupAudioStreams(state.session);
          if (state.session.sessionDescriptionHandler?.peerConnection) {
            setupPeerConnectionAudio(
              state.session.sessionDescriptionHandler.peerConnection
            );
          }
        }
      }, 100);
    }
  },
  makeCall: (number) => {
    debugLog("🚀 makeCall function called");
    debugLog("Call parameters:", {
      number: number,
      hasUA: !!state.ua,
      hasConfig: !!state.lastConfig,
      isConnected: state.isConnected,
      isRegistered: state.ua ? state.ua.isRegistered() : false,
      isConnectedToWebSocket: state.ua ? state.ua.isConnected() : false,
    });

    if (!state.ua) {
      debugLog("❌ Call failed: No SIP UserAgent available");
      return;
    }

    if (!state.ua.isRegistered()) {
      debugLog("❌ Call failed: SIP UserAgent not registered");
      return;
    }

    if (!state.lastConfig || !state.lastConfig.server) {
      debugLog("❌ Call failed: No server configuration available");
      return;
    }

    if (!number || number.trim() === "") {
      debugLog("❌ Call failed: No phone number provided");
      return;
    }

    try {
      const targetUri = `sip:${number}@${state.lastConfig.server}`;
      debugLog("📞 Initiating call to:", targetUri);

      const options = {
        eventHandlers: {
          progress: (e) => {
            debugLog("📞 Call progress event:", {
              originator: e.originator,
              hasResponse: !!e.response,
              responseStatus: e.response?.status_code,
              responseReason: e.response?.reason_phrase,
            });

            state.eventEmitter.emit("call_progress", e);

            // Handle early media for all progress responses (180 Ringing, 183 Session Progress)
            if (
              e.response &&
              (e.response.status_code === 180 || e.response.status_code === 183)
            ) {
              debugLog(
                `🔔 Early media opportunity: ${e.response.status_code} ${e.response.reason_phrase}`
              );

              // For 183 Session Progress, there should be SDP with media info
              if (e.response.status_code === 183) {
                debugLog(
                  "🔔 Session Progress received - setting up early media"
                );

                // Try to get early media streams immediately
                setTimeout(() => {
                  if (
                    state.session?.sessionDescriptionHandler?.peerConnection
                  ) {
                    const pc =
                      state.session.sessionDescriptionHandler.peerConnection;
                    debugLog("🔔 Checking for early media streams...");

                    // Check remote streams
                    const remoteStreams = pc.getRemoteStreams
                      ? pc.getRemoteStreams()
                      : [];
                    debugLog(`🔔 Found ${remoteStreams.length} remote streams`);

                    if (remoteStreams.length > 0) {
                      debugLog("🔔 Playing early media from remote streams");
                      playRemoteAudio(remoteStreams[0]);
                    } else {
                      // Check receivers for tracks
                      const receivers = pc.getReceivers();
                      debugLog(`🔔 Found ${receivers.length} receivers`);

                      const audioReceivers = receivers.filter(
                        (r) =>
                          r.track &&
                          r.track.kind === "audio" &&
                          r.track.readyState === "live"
                      );

                      if (audioReceivers.length > 0) {
                        debugLog(
                          `🔔 Creating early media stream from ${audioReceivers.length} audio receivers`
                        );
                        const earlyStream = new MediaStream();
                        audioReceivers.forEach((receiver) => {
                          earlyStream.addTrack(receiver.track);
                        });
                        playRemoteAudio(earlyStream);
                      } else {
                        debugLog(
                          "🔔 No audio receivers available yet for early media"
                        );
                      }
                    }
                  }
                }, 100); // Small delay to ensure streams are available
              }
            }
          },
          failed: (e) => {
            debugLog("❌ Call failed:", e);
            debugLog("❌ Call failed details:", {
              cause: e.cause,
              originator: e.originator,
              message: e.message,
            });
            state.session = null;
            state.eventEmitter.emit("call_failed", {
              cause: e.cause,
              originator: e.originator,
              message: e.message,
            });
          },
          ended: (e) => {
            debugLog("📞 Call ended:", e);
            state.session = null;
            state.eventEmitter.emit("call_ended", e);
          },
          confirmed: (e) => {
            debugLog("✅ Call confirmed:", e);
            state.eventEmitter.emit("call_confirmed", e);

            // Set up audio streams when call is confirmed
            if (state.session && state.session.connection) {
              setupAudioStreams(state.session);
            }
          },
          peerconnection: (e) => {
            debugLog("🔗 Peer connection event:", e);

            // Set up audio handling on peer connection
            if (e.peerconnection) {
              setupPeerConnectionAudio(e.peerconnection);
            }
          },
        },
        extraHeaders: [],
        mediaConstraints: {
          audio: true,
          video: false,
        },
        // Add ICE servers for better connectivity
        pcConfig: {
          iceServers: state.lastConfig.iceServers || [
            { urls: "stun:stun.l.google.com:19302" },
          ],
          iceTransportPolicy: "all",
          bundlePolicy: "balanced",
          rtcpMuxPolicy: "require",
        },
      };

      debugLog("📞 Call options:", {
        hasEventHandlers: !!options.eventHandlers,
        mediaConstraints: options.mediaConstraints,
        extraHeaders: options.extraHeaders,
        iceServers: options.pcConfig?.iceServers?.length || 0,
      });

      // Create the call session
      const session = state.ua.call(targetUri, options);

      if (session) {
        // Store the session for later use
        state.session = session;

        debugLog("✅ Call session created and stored:", {
          sessionId: session?.id,
          direction: session?.direction,
          localIdentity: session?.local_identity?.uri?.toString(),
          remoteIdentity: session?.remote_identity?.uri?.toString(),
        });

        // Set up additional session event handlers
        session.on("peerconnection", (e) => {
          debugLog("🔗 Session peer connection event:", e);
          setupPeerConnectionAudio(e.peerconnection);
        });

        session.on("confirmed", () => {
          debugLog("✅ Session confirmed - setting up audio");
          setupAudioStreams(session);
        });

        session.on("progress", (e) => {
          debugLog("📞 Session progress event:", {
            originator: e.originator,
            hasResponse: !!e.response,
            responseStatus: e.response?.status_code,
          });

          // Additional check for early media on session progress
          if (e.response && e.response.status_code === 183) {
            debugLog(
              "🔔 Session-level 183 progress - checking for early media"
            );
            setTimeout(() => {
              if (session.sessionDescriptionHandler?.peerConnection) {
                setupPeerConnectionAudio(
                  session.sessionDescriptionHandler.peerConnection
                );
              }
            }, 50);
          }
        });

        session.on("accepted", () => {
          debugLog("✅ Session accepted - ensuring audio setup");
          if (session.sessionDescriptionHandler?.peerConnection) {
            setupPeerConnectionAudio(
              session.sessionDescriptionHandler.peerConnection
            );
          }
        });

        // Add failed event handler for the session
        session.on("failed", (data) => {
          debugLog("❌ Session-level failed event:", data);
          state.eventEmitter.emit("call_failed", {
            cause: data.cause,
            originator: data.originator,
            message: data.message,
          });
          state.session = null;
        });

        // Monitor session description handler
        session.on("SessionDescriptionHandler-created", () => {
          debugLog("📋 SessionDescriptionHandler created");
          if (session.sessionDescriptionHandler?.peerConnection) {
            debugLog("📋 Setting up peer connection from SDH");
            setupPeerConnectionAudio(
              session.sessionDescriptionHandler.peerConnection
            );
          }
        });

        // Emit call initiated event
        state.eventEmitter.emit("call_initiated", {
          number: number,
          session: session,
          direction: "outgoing",
        });
      } else {
        debugLog("❌ Failed to create call session");
      }
    } catch (error) {
      debugLog("❌ Error during call initiation:", error);
      debugLog("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      state.eventEmitter.emit("call_failed", { error: error.message });
    }
  },
  hangupCall: () => {
    if (state.session) {
      state.session.terminate();
    }
  },
  toggleMute: () => {
    if (state.session) {
      if (state.session.isMuted().audio) {
        state.session.unmute({ audio: true });
      } else {
        state.session.mute({ audio: true });
      }
    }
  },
  hold: () => {
    if (state.session) {
      if (state.session.isOnHold().local) {
        state.session.unhold();
      } else {
        state.session.hold();
      }
    }
  },
  transfer: (number) => {
    if (state.session) {
      state.session.refer(`sip:${number}@${state.lastConfig.server}`);
    }
  },
};

// Clean up any timeouts when module is unloaded
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  });
}
