import JsSIP from "jssip";
import { EventEmitter } from "events";
import { requestAudioPermission } from "./webrtc";

// Singleton state for the SIP User Agent and session
const state = {
  ua: null,
  session: null,
  isConnected: false,
  eventEmitter: new EventEmitter(),
  lastConfig: null,
};

// --- Core SIP Service Logic (adapted from chrome-softphone-extension) ---

async function connect(config) {
  console.log("[SIP] Starting SIP connection with config:", config);
  const { server, extension, password, wsServers = [] } = config;

  if (!server || !extension || !password) {
    throw new Error("SIP connection requires server, extension, and password.");
  }

  // Use the first ws_server URI if available, otherwise construct one.
  const wsUri =
    wsServers.length > 0 && wsServers[0].uri
      ? wsServers[0].uri
      : `wss://${server}:8089/ws`;

  console.log("[SIP] Using WebSocket URI:", wsUri);
  const socket = new JsSIP.WebSocketInterface(wsUri);

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
    register_expires: 600,
    no_answer_timeout: 60000,
    use_preloaded_route: false,
  };

  const ua = new JsSIP.UA(configuration);
  state.ua = ua;

  // --- Event Handlers ---
  ua.on("connected", () => {
    console.log("[SIP] WebSocket connected");
    state.isConnected = true;
    state.eventEmitter.emit("ws:connected");
  });

  ua.on("disconnected", () => {
    console.log("[SIP] WebSocket disconnected");
    state.isConnected = false;
    state.eventEmitter.emit("ws:disconnected");
  });

  ua.on("registered", () => {
    console.log("[SIP] ✅ Registered successfully");
    state.eventEmitter.emit("registered");
  });

  ua.on("unregistered", (e) => {
    console.log("[SIP] ❌ Unregistered", e?.cause || "");
    state.eventEmitter.emit("unregistered");
  });

  ua.on("registrationFailed", (e) => {
    console.log("[SIP] ❌ Registration Failed", e?.cause || "");
    state.eventEmitter.emit("registrationFailed", e);
  });

  ua.on("newRTCSession", (e) => {
    console.log("[SIP] New call session:", e.originator);
    state.session = e.session;

    if (e.originator === "remote") {
      state.eventEmitter.emit("incoming_call", e.session);
    } else if (e.originator === "local") {
      state.eventEmitter.emit("outgoing_call", e.session);
    }

    // --- In-Call Event Handlers ---
    e.session.on("ended", () => {
      state.session = null;
      state.eventEmitter.emit("call_ended");
    });
    e.session.on("failed", () => {
      state.session = null;
      state.eventEmitter.emit("call_failed");
    });
    e.session.on("accepted", () => state.eventEmitter.emit("call_accepted"));
    e.session.on("confirmed", () => state.eventEmitter.emit("call_confirmed"));
    e.session.on("hold", () => state.eventEmitter.emit("hold", true));
    e.session.on("unhold", () => state.eventEmitter.emit("hold", false));
    e.session.on("muted", () => state.eventEmitter.emit("mute", true));
    e.session.on("unmuted", () => state.eventEmitter.emit("mute", false));
  });

  console.log("[SIP] Starting User Agent...");
  ua.start();
}

// --- Public API ---

export async function initializeSIP(config) {
  console.log("[SIP] Initializing SIP client...");
  if (state.ua) {
    console.log(
      "[SIP] Disconnecting existing UA before initializing a new one."
    );
    await disconnect();
  }

  try {
    // For mobile, we need to request audio permissions upfront.
    await requestAudioPermission();
    state.lastConfig = config;
    await connect(config);
    return true;
  } catch (err) {
    console.error("[SIP] Initialization failed:", err);
    state.ua = null;
    return false;
  }
}

export async function disconnect() {
  if (state.ua) {
    console.log("[SIP] Disconnecting...");
    state.ua.stop();
    state.ua = null;
    state.isConnected = false;
  }
}

export function makeCall(number) {
  if (!state.ua || !state.lastConfig) {
    console.error("[SIP] Cannot make call: UA not initialized.");
    return;
  }
  const target = `sip:${number}@${state.lastConfig.server}`;
  const options = {
    mediaConstraints: { audio: true, video: false },
    pcConfig: {
      iceServers: state.lastConfig.iceServers || [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    },
  };
  state.ua.call(target, options);
}

export function answerCall() {
  if (state.session) {
    state.session.answer({
      pcConfig: {
        iceServers: state.lastConfig.iceServers || [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      },
    });
  }
}

export function hangupCall() {
  if (state.session) {
    state.session.terminate();
  }
}

export function toggleMute() {
  if (state.session) {
    if (state.session.isMuted().audio) {
      state.session.unmute({ audio: true });
    } else {
      state.session.mute({ audio: true });
    }
  }
}

export function toggleHold() {
  if (state.session) {
    if (state.session.isOnHold().local) {
      state.session.unhold();
    } else {
      state.session.hold();
    }
  }
}

export const sipEvents = state.eventEmitter;
