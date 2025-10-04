import { getAmiClient } from "../config/amiClient.js";
import { EventEmitter } from "events";
import chalk from "chalk";
import createLicenseService from "./licenseService.js";
import sequelize from "../config/sequelize.js";
import redisClient from "../config/redis.js";

const DEBUG_MODE = false;

const licenseService = createLicenseService();

const createAmiService = () => {
  const state = {
    client: getAmiClient(),
    registeredPeers: new Map(),
    queueMemberStates: new Map(),
    connected: false,
    connectionAttempts: 0,
    activeExtensions: new Set(),
    extensionLastSeen: new Map(),
  };

  const emitter = new EventEmitter();

  // 📞 CALL EVENT HANDLERS
  const handleCallEvents = {
    Newchannel: (event) => emitEvent("call:new", event),
    Bridge: (event) => emitEvent("call:bridged", event),
    Hangup: (event) => emitEvent("call:hangup", event),
    Newstate: (event) => emitEvent("call:state", event),
    BridgeEnter: (event) => emitEvent("call:bridge:enter", event),
    BridgeLeave: (event) => emitEvent("call:bridge:leave", event),
  };

  // ☎️ QUEUE EVENT HANDLERS
  const handleQueueEvents = {
    QueueParams: (event) => emitEvent("queue:update", event),
    QueueCallerJoin: (event) => emitEvent("queue:caller:join", event),
    QueueCallerLeave: (event) => emitEvent("queue:caller:leave", event),
    QueueMemberStatus: (event) => emitEvent("queue:member:update", event),
  };

  // 📡 EXTENSION EVENT HANDLERS
  const handleExtensionEvents = {
    PeerStatus: (event) => {
      // console.log("📞 PeerStatus event received:", event);
      const extension = event.Peer.includes("/")
        ? event.Peer.split("/")[1]
        : event.Peer;
      state.registeredPeers.set(event.Peer, event.PeerStatus);

      if (extension) {
        const now = new Date().toISOString();
        state.extensionLastSeen.set(extension, now);

        if (
          event.PeerStatus === "Registered" ||
          event.PeerStatus === "Reachable"
        ) {
          state.activeExtensions.add(extension);
          console.log(
            `✅ Extension ${extension} marked as active (${event.PeerStatus})`
          );
        } else {
          state.activeExtensions.delete(extension);
          console.log(
            `❌ Extension ${extension} marked as inactive (${event.PeerStatus})`
          );
        }
      }

      emitEvent("extension:status", {
        ...event,
        extension,
        lastSeen: state.extensionLastSeen.get(extension),
      });
    },
    DeviceStateChange: (event) => {
      let extension = null;
      if (event.Device && event.Device.includes(":")) {
        extension = event.Device.split(":")[1];
      } else if (event.Device && event.Device.includes("/")) {
        extension = event.Device.split("/")[1];
      }

      if (extension) {
        state.extensionLastSeen.set(extension, new Date().toISOString());
      }

      emitEvent("extension:deviceStateChange", {
        ...event,
        extension,
        lastSeen: extension ? state.extensionLastSeen.get(extension) : null,
      });
    },
    Registry: async (event) => {
      console.log("📞 Registry event received:", event);
      const sipUsername = event.Username;

      if (event.Status === "Registered") {
        const sessionToken = await licenseService.getSessionTokenForSipUser(
          sipUsername
        );
        if (!sessionToken) {
          console.error(
            `[License] No session token for ${sipUsername}. Rejecting.`
          );
          // Proactively unregister the peer
          state.client.sendAction({
            Action: "PJSIPUnregister",
            Endpoint: sipUsername,
          });
          return;
        }

        const validation = await licenseService.validateClientSession(
          sessionToken
        );
        if (!validation.valid) {
          console.error(
            `[License] Invalid session for ${sipUsername}: ${validation.error}. Rejecting.`
          );
          state.client.sendAction({
            Action: "PJSIPUnregister",
            Endpoint: sipUsername,
          });
          return;
        }

        const currentCount = await licenseService.getConcurrentUsers(
          validation.serverLicenseId
        );
        if (currentCount >= validation.maxConcurrentUsers) {
          console.error(
            `[License] Concurrent user limit exceeded for ${sipUsername}. Rejecting.`
          );
          state.client.sendAction({
            Action: "PJSIPUnregister",
            Endpoint: sipUsername,
          });
          return;
        }

        // If valid, proceed with existing logic
        const now = new Date().toISOString();
        state.activeExtensions.add(sipUsername);
        state.extensionLastSeen.set(sipUsername, now);
        console.log(
          `✅ SIP user ${sipUsername} registered and added to active extensions`
        );
      } else if (event.Status === "Unregistered") {
        const now = new Date().toISOString();
        state.activeExtensions.delete(sipUsername);
        state.extensionLastSeen.set(sipUsername, now);
        console.log(
          `❌ SIP user ${sipUsername} unregistered and removed from active extensions`
        );
      }

      emitEvent("extension:registration", {
        ...event,
        lastSeen: state.extensionLastSeen.get(event.Username),
      });
    },
  };

  async function initializeExtensionStatus() {
    try {
      console.log(chalk.blue("[AMI] Initializing extension statuses..."));

      const sipPeersResult = await state.client.sendAction({
        Action: "SIPpeers",
      });

      const pjsipEndpointsResult = await state.client.sendAction({
        Action: "PJSIPShowEndpoints",
      });

      const now = new Date().toISOString();

      if (sipPeersResult && sipPeersResult.events) {
        sipPeersResult.events.forEach((event) => {
          if (event.Event === "PeerEntry") {
            const extension = event.ObjectName;
            if (extension) {
              state.extensionLastSeen.set(extension, now);
              if (event.Status.includes("OK")) {
                state.activeExtensions.add(extension);
                state.registeredPeers.set(`SIP/${extension}`, "Registered");
              }
            }
          }
        });
      }

      if (pjsipEndpointsResult && pjsipEndpointsResult.events) {
        pjsipEndpointsResult.events.forEach((event) => {
          if (event.Event === "EndpointList") {
            const extension = event.ObjectName;
            if (extension) {
              state.extensionLastSeen.set(extension, now);
              if (
                event.DeviceState === "ONLINE" ||
                event.DeviceState === "Available"
              ) {
                state.activeExtensions.add(extension);
                state.registeredPeers.set(`PJSIP/${extension}`, "Registered");
              }
            }
          }
        });
      }

      console.log(
        chalk.green(
          `[AMI] Initialized status for ${state.extensionLastSeen.size} extensions`
        )
      );
    } catch (error) {
      console.error("[AMI] Error initializing extension status:", error);
    }
  }

  async function cleanupExtension(extension) {
    try {
      const contacts = await state.client.sendAction({
        Action: "PJSIPShowContacts",
        Endpoint: extension,
      });

      if (contacts.events) {
        for (const event of contacts.events) {
          if (event.AOR === extension) {
            await state.client.sendAction({
              Action: "PJSIPSendContactStatus",
              Endpoint: extension,
              Status: "terminated",
            });
          }
        }
      }

      await state.client.sendAction({
        Action: "PJSIPUnregister",
        Endpoint: extension,
      });

      state.activeExtensions.delete(extension);
      state.registeredPeers.delete(extension);

      state.extensionLastSeen.set(extension, new Date().toISOString());

      emitEvent("extension:cleanup", {
        extension,
        status: "success",
        lastSeen: state.extensionLastSeen.get(extension),
      });
      return true;
    } catch (error) {
      console.error(`AMI Extension cleanup error (${extension}):`, error);
      emitEvent("extension:cleanup", { extension, status: "error", error });
      return false;
    }
  }

  function emitEvent(eventName, event) {
    if (DEBUG_MODE) {
      console.log(chalk.blue(`[AMI] ${eventName}:`), event);
    }
    emitter.emit(eventName, event);
  }

  const setupEventListeners = () => {
    if (!state.client) return;

    state.client.on("connect", () => {
      console.log(chalk.green("Connected to Asterisk AMI"));
      state.connected = true;
      emitter.emit("connected");

      initializeExtensionStatus();
    });

    state.client.on("event", (event) => {
      if (handleCallEvents[event.Event]) handleCallEvents[event.Event](event);
      if (handleQueueEvents[event.Event]) handleQueueEvents[event.Event](event);
      if (handleExtensionEvents[event.Event])
        handleExtensionEvents[event.Event](event);
    });

    state.client.on("disconnect", () => {
      console.warn(chalk.yellow("[AMI] Connection lost, reconnecting..."));
      state.connected = false;
      emitter.emit("disconnected");
    });
  };

  return {
    connect: async () => {
      if (state.connected) {
        console.log(chalk.yellow("AMI already connected"));
        return true;
      }

      try {
        await state.client.connect();
        setupEventListeners();
        state.connected = true;
        return true;
      } catch (error) {
        console.error("AMI connection error:", error.message);
        throw error;
      }
    },
    cleanup: async (extension) => {
      if (extension) {
        await cleanupExtension(extension);
      }
      if (state.client) {
        await state.client.disconnect();
      }
      state.activeExtensions.clear();
      state.registeredPeers.clear();
      state.queueMemberStates.clear();
    },
    getState: () => ({
      connected: state.connected,
      registeredPeersCount: state.registeredPeers.size,
    }),
    executeAMIAction: async (action) => {
      if (!state.client?.isConnected()) {
        throw new Error("AMI not connected");
      }
      return state.client.sendAction(action);
    },
    cleanupExtension,
    getExtensionStatus: (extension) => ({
      isRegistered: state.activeExtensions.has(extension),
      peerStatus:
        state.registeredPeers.get(`PJSIP/${extension}`) ||
        state.registeredPeers.get(`SIP/${extension}`),
      lastSeen: state.extensionLastSeen.get(extension) || null,
    }),
    getAllExtensionStatuses: () => {
      const result = {};
      const allExtensions = new Set([
        ...state.activeExtensions,
        ...state.extensionLastSeen.keys(),
      ]);

      if (DEBUG_MODE) {
        console.log("🔍 Getting extension statuses:");
        console.log("  Active extensions:", Array.from(state.activeExtensions));
        console.log(
          "  Extension last seen keys:",
          Array.from(state.extensionLastSeen.keys())
        );
        console.log("  All extensions to process:", Array.from(allExtensions));
      }

      for (const extension of allExtensions) {
        const isRegistered = state.activeExtensions.has(extension);
        const peerStatus =
          state.registeredPeers.get(`PJSIP/${extension}`) ||
          state.registeredPeers.get(`SIP/${extension}`);

        result[extension] = {
          isRegistered: isRegistered,
          peerStatus: peerStatus,
          lastSeen:
            state.extensionLastSeen.get(extension) || new Date().toISOString(),
          status: isRegistered ? "online" : "offline",
        };

        if (DEBUG_MODE) {
          console.log(`  Extension ${extension}:`, {
            isRegistered,
            peerStatus,
            status: result[extension].status,
          });
        }
      }
      return result;
    },
    initializeExtensionStatus,
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    once: (event, listener) => emitter.once(event, listener),
    removeAllListeners: (event) => emitter.removeAllListeners(event),
    client: state.client,
    executeAction: async (action) => {
      if (!state.client?.isConnected()) {
        console.log(
          chalk.yellow(
            "[AMI] Not connected, attempting to reconnect before executing action"
          )
        );
        try {
          // Try to reconnect before executing the action
          await state.client.connect();
          console.log(chalk.green("[AMI] Reconnected successfully"));
        } catch (reconnectError) {
          console.error(
            chalk.red("[AMI] Reconnection failed: ", reconnectError.message)
          );
          throw new Error("AMI not connected and reconnection failed");
        }
      }
      return state.client.sendAction(action);
    },
  };
};

const amiService = createAmiService();
export default amiService;
