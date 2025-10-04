//electron-softphone/src/hooks/useCallState.js
import { SessionState } from "sip.js";
import { useState, useEffect, useCallback, useRef } from "react";
import ringtoneMp3 from "../assets/sounds/promise.mp3";
// import ringbackMp3 from "../assets/sounds/ringback.mp3";
import { storageService, isLoggingOut } from "../services/storageService";
// Centralized call states
export const CALL_STATES = {
  IDLE: "idle",
  INCOMING: "incoming",
  CONNECTING: "connecting",
  RINGING: "ringing",
  ESTABLISHED: "established",
  TERMINATING: "terminating",
  TERMINATED: "terminated",
};

export const useCallState = (sipService, sipCallService) => {
  const [callState, setCallState] = useState({
    state: CALL_STATES.IDLE,
    direction: null,
    remoteIdentity: null,
    startTime: null,
    duration: 0,
    muted: false,
    onHold: false,
    session: null,
    isRinging: false,
  });

  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const maxRetries = 3;

  const [connectionState, setConnectionState] = useState({
    status: "disconnected", // 'disconnected' | 'connecting' | 'connected' | 'failed'
    lastAttempt: null,
    failureReason: null,
    retryCount: 0,
    maxRetries: 10,
    backoffDelay: 1000, // Base delay in ms
  });

  // Add ringtone ref
  const ringToneRef = useRef(new Audio());
  // Centralized playback controller to avoid play/pause race conditions
  const playbackRef = useRef({ desired: false, playing: false, requestId: 0 });

  // Add a safe audio play function to avoid race conditions
  const safePlayAudio = useCallback((audioSrc, volume = 0.5) => {
    // Prevent audio playback during logout
    if (isLoggingOut()) {
      return;
    }

    if (!ringToneRef.current) {
      console.error("No audio element available");
      return;
    }
    const audio = ringToneRef.current;
    const requestId = ++playbackRef.current.requestId;
    playbackRef.current.desired = true;

    // Set the new properties (avoid unnecessary load to reduce races)
    if (audio.src !== audioSrc) {
      audio.src = audioSrc;
    }
    audio.volume = volume;
    audio.loop = true;

    // If already playing and we still desire playback, do nothing
    if (!audio.paused) {
      playbackRef.current.playing = true;
      return;
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          // If a newer request superseded this one or playback no longer desired, stop
          if (
            requestId !== playbackRef.current.requestId ||
            playbackRef.current.desired === false
          ) {
            if (!audio.paused) audio.pause();
            audio.currentTime = 0;
            playbackRef.current.playing = false;
          } else {
            playbackRef.current.playing = true;
          }
        })
        .catch((error) => {
          // Ignore expected interruption errors caused by quick pause/stop
          const msg = String(error?.message || "");
          const name = String(error?.name || "");
          if (
            name === "AbortError" ||
            /interrupted by a call to pause\(\)/i.test(msg)
          ) {
            return;
          }
          console.error("Error playing audio:", msg);
        });
    }
  }, []);

  // Add a safe stop function
  const safeStopAudio = useCallback(() => {
    // Prevent audio stop during logout to avoid unnecessary cleanup
    if (isLoggingOut()) {
      return;
    }

    if (ringToneRef.current) {
      playbackRef.current.desired = false;

      if (!ringToneRef.current.paused) {
        ringToneRef.current.pause();
      }
      ringToneRef.current.currentTime = 0;
      playbackRef.current.playing = false;
    }
  }, []);

  // Add connection state handler
  // const handleConnectionStateChange = useCallback((state) => {
  //   setConnectionState((prev) => {
  //     const now = Date.now();

  //     switch (state) {
  //       case "connected":
  //         return {
  //           ...prev,
  //           status: "connected",
  //           retryCount: 0,
  //           lastAttempt: now,
  //           failureReason: null,
  //         };
  //       case "disconnected":
  //         return {
  //           ...prev,
  //           status: "disconnected",
  //           lastAttempt: now,
  //         };
  //       case "failed":
  //         const retryCount = prev.retryCount + 1;
  //         return {
  //           ...prev,
  //           status: "failed",
  //           retryCount,
  //           lastAttempt: now,
  //           failureReason: state.reason,
  //         };
  //       default:
  //         return prev;
  //     }
  //   });
  // }, []);

  // Add initialization and reconnection logic
  const isServiceReady = useCallback(() => {
    return (
      sipService &&
      sipService.getState().isConnected &&
      sipService.getState().registrationState === "Registered"
    );
  }, [sipService]);

  const initializeService = useCallback(async () => {
    if (initializationAttempts >= maxRetries) {
      console.error("Max initialization attempts reached");
      return false;
    }

    try {
      if (!isServiceReady()) {
        const userData = storageService.getUserData();
        if (!userData?.pjsip) {
          throw new Error("Missing SIP configuration");
        }

        await sipService.initialize({
          extension: userData.extension,
          pjsip: userData.pjsip,
        });
      }
      return true;
    } catch (error) {
      console.error("SIP initialization failed:", error);
      setInitializationAttempts((prev) => prev + 1);
      return false;
    }
  }, [initializationAttempts, sipService, isServiceReady]);

  // Add reconnection logic
  const handleReconnection = useCallback(async () => {
    if (connectionState.retryCount >= connectionState.maxRetries) {
      console.error("Max reconnection attempts reached");
      return false;
    }

    try {
      setConnectionState((prev) => ({
        ...prev,
        status: "connecting",
      }));

      const userData = storageService.getUserData();
      if (!userData?.pjsip) {
        throw new Error("Missing phone system configuration");
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        connectionState.backoffDelay * Math.pow(2, connectionState.retryCount),
        10000
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));

      await sipService.initialize({
        extension: userData.extension,
        pjsip: {
          server: userData.pjsip.server,
          password: userData.pjsip.password,
          ice_servers: userData.pjsip.ice_servers,
        },
        apiUrl: userData.apiUrl,
      });

      setServiceInitialized(true);
      return true;
    } catch (error) {
      setConnectionState((prev) => ({
        ...prev,
        status: "failed",
        retryCount: prev.retryCount + 1,
        failureReason: error.message,
      }));
      return false;
    }
  }, [connectionState, sipService]);

  // Add automatic reconnection on connection loss
  useEffect(() => {
    let reconnectionTimeout;

    const attemptReconnection = async () => {
      if (
        connectionState.status === "disconnected" ||
        connectionState.status === "failed"
      ) {
        await handleReconnection();
      }
    };

    if (!serviceInitialized && connectionState.status !== "connecting") {
      reconnectionTimeout = setTimeout(
        attemptReconnection,
        connectionState.backoffDelay * Math.pow(2, connectionState.retryCount)
      );
    }

    return () => {
      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
      }
    };
  }, [serviceInitialized, connectionState, handleReconnection]);

  // Initialize ringtone settings
  useEffect(() => {
    if (ringToneRef.current) {
      ringToneRef.current.loop = true;
      ringToneRef.current.volume = 0.8;
      ringToneRef.current.src = ringtoneMp3; // Default to ringtone
      ringToneRef.current.load(); // Preload the audio
    }

    // Cleanup
    return () => {
      if (ringToneRef.current) {
        ringToneRef.current.pause();
        ringToneRef.current.currentTime = 0;
      }
    };
  }, []);

  // Add connection state monitoring
  useEffect(() => {
    const handleRegistered = () => {
      console.log("SIP Service registered and ready");
      setServiceInitialized(true);
    };

    const handleUnregistered = () => {
      console.log("SIP Service unregistered");
      setServiceInitialized(false);
    };

    const handleRegistrationFailed = (error) => {
      console.error("SIP registration failed:", error);
      setServiceInitialized(false);
    };

    sipService.events.on("registered", handleRegistered);
    sipService.events.on("unregistered", handleUnregistered);
    sipService.events.on("registration_failed", handleRegistrationFailed);

    // Check initial state based on sipService's registration status
    setServiceInitialized(!!sipService?.userAgent?.isRegistered());

    return () => {
      sipService.events.off("registered", handleRegistered);
      sipService.events.off("unregistered", handleUnregistered);
      sipService.events.off("registration_failed", handleRegistrationFailed);
    };
  }, [sipService]);

  const updateCallState = useCallback((newState) => {
    // Prevent call state updates during logout
    if (isLoggingOut()) {
      console.log("Ignoring call state update during logout:", newState);
      return;
    }

    setCallState((prev) => ({
      ...prev,
      ...newState,
      session: newState.session !== undefined ? newState.session : prev.session,
    }));
  }, []);

  // Handle SIP session state changes
  useEffect(() => {
    const handleSessionStateChange = (newState) => {
      // Prevent session state changes during logout
      if (isLoggingOut()) {
        console.log("Ignoring session state change during logout:", newState);
        return;
      }

      // console.log("SIP Session state changed:", newState);

      switch (newState) {
        case SessionState.Initial:
          console.log("Call initializing, setting direction to outbound");

          // Only update the call state, don't play audio here
          updateCallState({
            state: CALL_STATES.CONNECTING,
            direction: "outbound", // Explicitly set direction to outbound
          });
          break;

        case SessionState.Establishing:
          // First check if direction is set, if not set it based on session type
          const currentDirection =
            callState.direction ||
            (callState.session?.constructor.name === "Invitation"
              ? "inbound"
              : "outbound");

          updateCallState({
            state: CALL_STATES.RINGING,
            isRinging: true,
            direction: currentDirection, // Ensure direction is set
          });

          // For inbound calls, ringtone should already be playing from call:incoming event
          // Only start it if it's not playing yet (safety check)
          if (currentDirection === "inbound") {
            // Check if audio is already playing (desired state is true)
            if (!playbackRef.current.desired || !playbackRef.current.playing) {
              safePlayAudio(ringtoneMp3, 0.8);
            }
          }
          // For outbound calls, we'll play ringback when we get 180/183 response
          // This is now handled in the progress event
          break;

        case SessionState.Established:
          // Stop tones when call is established (answered)
          if (!isLoggingOut()) {
            safeStopAudio();
          }

          updateCallState({
            state: CALL_STATES.ESTABLISHED,
            startTime: Date.now(),
            isRinging: false,
          });
          break;

        case SessionState.Terminating:
          console.log("Call terminating, stopping all tones");
          // Stop tones when call is terminating
          if (!isLoggingOut()) {
            safeStopAudio();
          }

          updateCallState({
            state: CALL_STATES.TERMINATING,
          });
          break;

        case SessionState.Terminated:
          console.log("Call terminated, stopping all tones");
          // Stop tones when call is terminated
          if (!isLoggingOut()) {
            safeStopAudio();
          }

          // Reset call state completely
          updateCallState({
            state: CALL_STATES.IDLE,
            direction: null,
            remoteIdentity: null,
            startTime: null,
            duration: 0,
            muted: false,
            session: null,
            isRinging: false,
          });
          break;
      }
    };

    sipService.events.on("session:stateChange", handleSessionStateChange);
    return () => {
      sipService.events.off("session:stateChange", handleSessionStateChange);
    };
    // CRITICAL: Removed callState.direction and callState.session from dependencies
    // These changing should NOT cause the session state listener to be re-registered
  }, [sipService, updateCallState, safePlayAudio, safeStopAudio]);

  // Handle call events
  useEffect(() => {
    const handleCallEvents = {
      "call:incoming": (data) => {
        // Prevent call events during logout
        if (isLoggingOut()) {
          return;
        }

        // Set call state first
        updateCallState({
          state: CALL_STATES.RINGING,
          direction: "inbound",
          remoteIdentity: data.remoteIdentity,
          isRinging: true,
          session: data.session,
        });

        // Play ringtone immediately for inbound calls
        safePlayAudio(ringtoneMp3, 0.8);
      },
      progress: (response) => {
        // Prevent call progress during logout
        if (isLoggingOut()) {
          console.log("Ignoring call progress during logout:", response);
          return;
        }

        console.log("Received progress update:", response);

        // Make sure we have the session in our state
        if (response.session && !callState.session) {
          console.log("Updating session from progress event");
          updateCallState({
            session: response.session,
          });
        }

        // Check if outbound call is ringing
        const isOutbound =
          callState.direction === "outbound" ||
          callState.session?.constructor.name !== "Invitation";

        if (isOutbound) {
          // console.log(
          //   `Progress for outbound call: ${response.statusCode} ${response.message?.reasonPhrase}`
          // );

          // Handle different response codes
          if (response.statusCode === 180 || response.statusCode === 183) {
            // 180 Ringing or 183 Session Progress - call is ringing
            // console.log(
            //   "Call is ringing on receiver's side, playing local ringback"
            // );

            // Do not play local ringback for outbound calls; provider tone handled by early media
            // safeStopAudio(ringtoneMp3, 0.5);

            // Update call state to ringing if not already
            if (callState.state !== CALL_STATES.RINGING) {
              updateCallState({
                state: CALL_STATES.RINGING,
                isRinging: true,
              });
            }
          } else if (response.statusCode >= 400) {
            // Error responses - call failed
            console.error(
              `Call failed with status ${response.statusCode}: ${response.message?.reasonPhrase}`
            );
            safeStopAudio();

            // Emit call failed event
            sipService.events.emit("call:failed", {
              error: `Call failed: ${response.message?.reasonPhrase}`,
              statusCode: response.statusCode,
              reasonPhrase: response.message?.reasonPhrase,
            });
          }
        }
      },
      "call:failed": (error) => {
        // Prevent call failed events during logout
        if (isLoggingOut()) {
          console.log("Ignoring call failed during logout:", error);
          return;
        }

        console.error("Call failed, disconnecting:", error);

        // Stop any playing audio
        if (!isLoggingOut()) {
          safeStopAudio();
        }

        // Show appropriate message based on status code
        let failureMessage = "Call failed";

        if (error.statusCode) {
          switch (error.statusCode) {
            case 480:
              failureMessage = "Number temporarily unavailable";
              break;
            case 486:
              failureMessage = "Busy Here";
              break;
            case 404:
              failureMessage = "Number not found";
              break;
            case 603:
              failureMessage = "Call declined";
              break;
            default:
              failureMessage =
                error.reasonPhrase || `Call failed (${error.statusCode})`;
          }
        }

        console.log(`Call failure reason: ${failureMessage}`);

        updateCallState({
          state: CALL_STATES.IDLE,
          direction: null,
          remoteIdentity: null,
          startTime: null,
          duration: 0,
          muted: false,
          session: null,
          isRinging: false,
        });
      },
      "call:ended": () => {
        console.log("Call ended");

        // Stop any playing audio
        safeStopAudio();

        updateCallState({
          state: CALL_STATES.IDLE,
          direction: null,
          remoteIdentity: null,
          startTime: null,
          duration: 0,
          muted: false,
          session: null,
          isRinging: false,
        });
      },
    };

    Object.entries(handleCallEvents).forEach(([event, handler]) => {
      sipService.events.on(event, handler);
    });

    return () => {
      Object.entries(handleCallEvents).forEach(([event, handler]) => {
        sipService.events.off(event, handler);
      });
    };
    // CRITICAL: Removed callState.direction and callState.state from dependencies
    // Those values changing should NOT cause event listeners to be re-registered
    // The handlers access these values from the event data or closures
  }, [
    sipService,
    safePlayAudio,
    safeStopAudio,
    updateCallState,
    callState.session,
  ]);

  // Call control methods
  const makeCall = useCallback(
    async (number, options = {}) => {
      if (!serviceInitialized) {
        await handleReconnection();
        if (!serviceInitialized) {
          throw new Error("SIP service not initialized or not connected");
        }
      }

      try {
        console.log("Starting outbound call to:", number);

        // First, stop any currently playing audio
        safeStopAudio();

        // Explicitly set call direction before making the call
        updateCallState({
          state: CALL_STATES.CONNECTING,
          direction: "outbound",
          remoteIdentity: number,
        });

        // Make the call
        console.log("Making SIP call to:", number);
        await sipCallService.makeCall(number, options);
      } catch (error) {
        console.error("Error making call:", error);

        // Stop audio on error
        safeStopAudio();

        updateCallState({
          state: CALL_STATES.IDLE,
          direction: null,
          remoteIdentity: null,
        });
        throw error;
      }
    },
    [
      serviceInitialized,
      sipCallService,
      updateCallState,
      handleReconnection,
      safePlayAudio,
      safeStopAudio,
    ]
  );

  // Add duration timer effect
  useEffect(() => {
    let intervalId;

    if (callState.state === CALL_STATES.ESTABLISHED && callState.startTime) {
      intervalId = setInterval(() => {
        const now = Date.now();
        const duration = Math.floor((now - callState.startTime) / 1000);
        setCallState((prev) => ({ ...prev, duration }));
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [callState.state, callState.startTime]);

  // Add automatic reconnection attempt on registration failure
  useEffect(() => {
    const handleRegistrationFailed = async (error) => {
      console.error("SIP registration failed:", error);
      setServiceInitialized(false);
      await handleReconnection();
    };

    sipService.events.on("registration_failed", handleRegistrationFailed);

    return () => {
      sipService.events.off("registration_failed", handleRegistrationFailed);
    };
  }, [sipService, handleReconnection]);

  // Add toggleMute handler
  const toggleMute = useCallback(async () => {
    try {
      const isMuted = await sipService.toggleMute();
      setCallState((prev) => ({
        ...prev,
        muted: isMuted,
      }));
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }, [sipService]);

  // Add hold handler
  const holdCall = useCallback(async () => {
    try {
      await sipService.holdCall();
      setCallState((prev) => ({
        ...prev,
        onHold: true,
      }));
    } catch (error) {
      console.error("Failed to hold call:", error);
      throw error;
    }
  }, [sipService]);

  // Add unhold handler
  const unholdCall = useCallback(async () => {
    try {
      await sipService.unholdCall();
      setCallState((prev) => ({
        ...prev,
        onHold: false,
      }));
    } catch (error) {
      console.error("Failed to unhold call:", error);
      throw error;
    }
  }, [sipService]);

  // Add transferCall to the returned object
  const transferCall = useCallback(
    async (targetExtension) => {
      if (callState.state !== CALL_STATES.ESTABLISHED) {
        throw new Error("Cannot transfer: No active call");
      }

      try {
        await sipCallService.transferCall(targetExtension);
        // The call state will be updated by the event handlers when the transfer completes
        return true;
      } catch (error) {
        console.error("Error in transferCall:", error);
        throw error;
      }
    },
    [callState.state, sipCallService]
  );

  // Add event listener for transfer and hold events
  useEffect(() => {
    const handleTransferInitiated = () => {
      // Update call state to show transfer in progress
      setCallState((prev) => ({
        ...prev,
        transferInProgress: true,
      }));
    };

    const handleTransferComplete = () => {
      // Reset call state when transfer is complete
      setCallState({
        state: CALL_STATES.IDLE,
        direction: null,
        remoteIdentity: null,
        startTime: null,
        duration: 0,
        muted: false,
        onHold: false,
        transferInProgress: false,
      });
    };

    const handleTransferFailed = (data) => {
      // Update call state to show transfer failed
      setCallState((prev) => ({
        ...prev,
        transferInProgress: false,
        transferError: data.error,
      }));

      // Clear transfer error after a delay
      setTimeout(() => {
        setCallState((prev) => ({
          ...prev,
          transferError: null,
        }));
      }, 5000);
    };

    const handleCallHeld = () => {
      setCallState((prev) => ({
        ...prev,
        onHold: true,
      }));
    };

    const handleCallUnheld = () => {
      setCallState((prev) => ({
        ...prev,
        onHold: false,
      }));
    };

    const handleHoldFailed = (data) => {
      console.error("Hold operation failed:", data.error);
    };

    const handleUnholdFailed = (data) => {
      console.error("Unhold operation failed:", data.error);
    };

    // Register event handlers
    sipService.events.on("call:transfer_initiated", handleTransferInitiated);
    sipService.events.on("call:transfer_complete", handleTransferComplete);
    sipService.events.on("call:transfer_failed", handleTransferFailed);
    sipService.events.on("call:held", handleCallHeld);
    sipService.events.on("call:unheld", handleCallUnheld);
    sipService.events.on("call:hold_failed", handleHoldFailed);
    sipService.events.on("call:unhold_failed", handleUnholdFailed);

    return () => {
      // Clean up event handlers
      sipService.events.off("call:transfer_initiated", handleTransferInitiated);
      sipService.events.off("call:transfer_complete", handleTransferComplete);
      sipService.events.off("call:transfer_failed", handleTransferFailed);
      sipService.events.off("call:held", handleCallHeld);
      sipService.events.off("call:unheld", handleCallUnheld);
      sipService.events.off("call:hold_failed", handleHoldFailed);
      sipService.events.off("call:unhold_failed", handleUnholdFailed);
    };
  }, [sipService.events]);

  return {
    callState,
    setCallState,
    makeCall,
    answerCall: useCallback(
      async (options = {}) => {
        if (callState.state !== CALL_STATES.RINGING) {
          throw new Error("No incoming call to answer");
        }
        try {
          await sipCallService.answerCall(options);
        } catch (error) {
          updateCallState({
            state: CALL_STATES.IDLE,
            isRinging: false,
          });
          throw error;
        }
      },
      [callState.state, sipCallService, updateCallState]
    ),
    endCall: useCallback(async () => {
      try {
        await sipCallService.endCall();
      } catch (error) {
        updateCallState({
          state: CALL_STATES.IDLE,
        });
        throw error;
      }
    }, [sipCallService, updateCallState]),
    toggleMute,
    holdCall,
    unholdCall,
    transferCall,
    CALL_STATES,
    serviceInitialized,
    initializeService,
    handleReconnection,
    isServiceReady,
    safePlayAudio,
    safeStopAudio,
  };
};
