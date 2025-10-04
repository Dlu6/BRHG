import { getAmiClient } from "../config/ami.js";
import UserModel from "../models/usersModel.js";
import { PJSIPEndpoint, PJSIPAuth } from "../models/pjsipModel.js";
import { ClientSession } from "../models/licenseModel.js";
import { emitToUser, broadcast } from "./socketService.js";
import sequelize from "../config/sequelize.js";

/**
 * Agent Status Service (Function-based)
 *
 * This service provides real-time agent availability status by:
 * 1. Polling PJSIP endpoints via AMI
 * 2. Matching extensions with agent database records
 * 3. Checking active client sessions for real status
 * 4. Broadcasting status updates via WebSocket
 * 5. Providing REST API for current status
 */

// Service state
let amiClient = null;
let agents = new Map(); // Map of extension -> agent details
let statusCache = new Map(); // Map of extension -> status
let pollInterval = null;
let isRunning = false;
const pollFrequency = 15000; // Poll every 15 seconds

/**
 * Initialize the agent status service
 */
const initialize = async () => {
  try {
    console.log("🟡 Initializing Agent Status Service...");

    // Load agents from database
    await loadAgents();

    // Connect to AMI
    const amiConnected = await connectAMI();

    if (!amiConnected) {
      console.warn(
        "⚠️ AMI connection failed, service will work in limited mode"
      );
    }

    console.log("✅ Agent Status Service initialized successfully");
    return true;
  } catch (error) {
    console.error(
      "❌ Failed to initialize Agent Status Service:",
      error.message
    );
    return false;
  }
};

/**
 * Load agents from database
 */
const loadAgents = async () => {
  try {
    const dbAgents = await UserModel.findAll({
      where: {
        extension: { [sequelize.Sequelize.Op.ne]: null },
        role: { [sequelize.Sequelize.Op.in]: ["agent", "user"] },
        disabled: { [sequelize.Sequelize.Op.or]: [false, null] },
      },
      attributes: [
        "id",
        "username",
        "fullName",
        "extension",
        "typology",
        "email",
        "role",
        "transport",
        "phone",
        "mobile",
        "context",
        "createdAt",
        "updatedAt",
      ],
    });

    // Clear existing agents map
    agents.clear();

    // Populate agents map
    dbAgents.forEach((agent) => {
      const agentData = {
        id: agent.id,
        username: agent.username,
        fullName: agent.fullName,
        extension: agent.extension,
        typology: agent.typology || "external",
        email: agent.email,
        role: agent.role,
        transport: agent.transport || "transport-ws",
        webrtcEnabled: [
          "webRTC",
          "chrome_softphone",
          "electron_softphone",
        ].includes(agent.typology),
        phone: agent.phone,
        mobile: agent.mobile,
        context: agent.context || "from-internal",
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      };

      agents.set(agent.extension, agentData);
    });

    console.log(`📥 Loaded ${agents.size} agents from database`);
  } catch (error) {
    console.error("❌ Error loading agents:", error.message);
    throw error;
  }
};

/**
 * Attach AMI event listeners for real-time updates
 */
const setupAmiEventListeners = () => {
  if (!amiClient || !amiClient.on) return;

  const updateFromContactEvent = (evt) => {
    try {
      const endpoint =
        evt.EndpointName || evt.AOR || evt.Endpoint || evt.ObjectName;
      if (!endpoint) return;
      const extension = String(endpoint).match(/\d{3,}/)?.[0];
      if (!extension || !agents.has(extension)) return;

      // Parse URI/IP if present
      let ip = null;
      let port = null;
      const uri = evt.Uri || evt.Contact || evt.URI || evt.ContactURI;
      if (uri) {
        const m = String(uri).match(/sip:[^@]+@([^:;]+):(\d+)/);
        if (m) {
          ip = m[1];
          port = Number(m[2]);
        }
      }

      // Determine status
      const statusText = (
        evt.Status ||
        evt.ContactStatus ||
        evt.Reason ||
        ""
      ).toLowerCase();
      const reachable = /(avail|reachable|created|ok)/.test(statusText);
      const newStatus = {
        status: reachable ? "online" : "offline",
        ip,
        port,
        transport:
          uri && uri.includes("transport=ws")
            ? "websocket"
            : agents.get(extension)?.transport,
        lastSeen: new Date().toISOString(),
        configured: true,
        asteriskStatus: evt.Status || evt.ContactStatus || "event",
        typology: agents.get(extension)?.typology,
        sessionActive: false,
        clientType: null,
      };

      const current = statusCache.get(extension);
      const changed =
        !current ||
        current.status !== newStatus.status ||
        current.ip !== newStatus.ip;

      statusCache.set(extension, newStatus);
      if (changed) {
        broadcast("agent_status_update", {
          type: "agent_status_update",
          timestamp: new Date().toISOString(),
          agents: [{ ...agents.get(extension), ...newStatus, changed: true }],
        });
      }
    } catch (_) {}
  };

  // PJSIP contact status events
  amiClient.on("ContactStatus", updateFromContactEvent);
  amiClient.on("ContactStatusDetail", updateFromContactEvent);

  // Queue member status events for agent availability
  amiClient.on("QueueMemberStatus", (evt) => {
    try {
      const memberInterface = evt.Interface || evt.MemberName;
      if (!memberInterface) return;

      const extension = String(memberInterface).match(/\d{3,}/)?.[0];
      if (!extension || !agents.has(extension)) return;

      const isPaused = evt.Paused === "1" || evt.Paused === true;
      const callsTaken = parseInt(evt.CallsTaken || 0);
      const lastCall = evt.LastCall || 0;

      // Map Asterisk status codes to readable status
      const statusMap = {
        1: "available", // AST_DEVICE_NOT_INUSE
        2: "in_use", // AST_DEVICE_INUSE
        3: "busy", // AST_DEVICE_BUSY
        4: "invalid", // AST_DEVICE_INVALID
        5: "unavailable", // AST_DEVICE_UNAVAILABLE
        6: "ringing", // AST_DEVICE_RINGING
        7: "on_hold", // AST_DEVICE_ONHOLD
      };

      const deviceStatus = statusMap[evt.Status] || "unknown";

      const current = statusCache.get(extension) || {};
      statusCache.set(extension, {
        ...current,
        queueStatus: deviceStatus,
        paused: isPaused,
        pauseReason: isPaused ? evt.PausedReason || "Break" : null,
        callsTaken: callsTaken,
        lastCall: lastCall > 0 ? new Date(lastCall * 1000).toISOString() : null,
        queues: evt.Queue ? [evt.Queue] : current.queues || [],
        lastSeen: new Date().toISOString(),
      });

      broadcast("agent_status_update", {
        type: "agent_queue_status",
        timestamp: new Date().toISOString(),
        agents: [
          {
            ...agents.get(extension),
            ...statusCache.get(extension),
            changed: true,
          },
        ],
      });
    } catch (err) {
      console.error("Error handling QueueMemberStatus:", err);
    }
  });

  // Queue member pause/unpause events
  amiClient.on("QueueMemberPause", (evt) => {
    try {
      const memberInterface = evt.Interface || evt.MemberName;
      if (!memberInterface) return;

      const extension = String(memberInterface).match(/\d{3,}/)?.[0];
      if (!extension || !agents.has(extension)) return;

      const isPaused = evt.Paused === "1" || evt.Paused === true;
      const pauseReason =
        evt.Reason || evt.PausedReason || (isPaused ? "Break" : null);

      const current = statusCache.get(extension) || {};
      statusCache.set(extension, {
        ...current,
        paused: isPaused,
        pauseReason: pauseReason,
        lastSeen: new Date().toISOString(),
      });

      broadcast("agent_status_update", {
        type: "agent_pause_status",
        timestamp: new Date().toISOString(),
        agents: [
          {
            ...agents.get(extension),
            ...statusCache.get(extension),
            changed: true,
          },
        ],
      });
    } catch (err) {
      console.error("Error handling QueueMemberPause:", err);
    }
  });

  // Queue member added event
  amiClient.on("QueueMemberAdded", (evt) => {
    try {
      const memberInterface = evt.Interface || evt.MemberName;
      if (!memberInterface) return;

      const extension = String(memberInterface).match(/\d{3,}/)?.[0];
      if (!extension || !agents.has(extension)) return;

      const current = statusCache.get(extension) || {};
      const queues = current.queues || [];
      if (evt.Queue && !queues.includes(evt.Queue)) {
        queues.push(evt.Queue);
      }

      statusCache.set(extension, {
        ...current,
        queues: queues,
        lastSeen: new Date().toISOString(),
      });

      broadcast("agent_status_update", {
        type: "agent_queue_added",
        timestamp: new Date().toISOString(),
        agents: [
          {
            ...agents.get(extension),
            ...statusCache.get(extension),
            changed: true,
          },
        ],
      });
    } catch (err) {
      console.error("Error handling QueueMemberAdded:", err);
    }
  });

  // Queue member removed event
  amiClient.on("QueueMemberRemoved", (evt) => {
    try {
      const memberInterface = evt.Interface || evt.MemberName;
      if (!memberInterface) return;

      const extension = String(memberInterface).match(/\d{3,}/)?.[0];
      if (!extension || !agents.has(extension)) return;

      const current = statusCache.get(extension) || {};
      const queues = (current.queues || []).filter((q) => q !== evt.Queue);

      statusCache.set(extension, {
        ...current,
        queues: queues,
        lastSeen: new Date().toISOString(),
      });

      broadcast("agent_status_update", {
        type: "agent_queue_removed",
        timestamp: new Date().toISOString(),
        agents: [
          {
            ...agents.get(extension),
            ...statusCache.get(extension),
            changed: true,
          },
        ],
      });
    } catch (err) {
      console.error("Error handling QueueMemberRemoved:", err);
    }
  });

  // Registry events (useful for trunks)
  amiClient.on("Registry", (evt) => {
    // ignore user endpoints; mostly for trunks
  });
};

/**
 * Connect to AMI
 */
const connectAMI = async () => {
  try {
    amiClient = getAmiClient();

    if (!amiClient) {
      console.warn("⚠️ AMI client not available");
      return false;
    }

    await amiClient.connect();
    console.log("✅ AMI connected for agent status monitoring");
    // Attach real-time listeners
    setupAmiEventListeners();
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to AMI:", error.message);
    amiClient = null;
    return false;
  }
};

/**
 * Start the polling service
 */
const start = () => {
  if (isRunning) {
    console.warn("⚠️ Agent Status Service is already running");
    return;
  }

  isRunning = true;

  // Start immediate poll
  pollAgentStatus();

  // Set up interval polling
  pollInterval = setInterval(pollAgentStatus, pollFrequency);

  console.log(
    `🟢 Agent Status Service started (polling every ${pollFrequency / 1000}s)`
  );
};

/**
 * Stop the polling service
 */
const stop = () => {
  if (!isRunning) {
    return;
  }

  isRunning = false;

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  if (amiClient) {
    try {
      amiClient.disconnect();
    } catch (error) {
      console.warn("Warning disconnecting AMI:", error.message);
    }
    amiClient = null;
  }

  console.log("🔴 Agent Status Service stopped");
};

/**
 * Poll agent status from AMI
 */
const pollAgentStatus = async () => {
  try {
    if (!amiClient || !amiClient.isConnected()) {
      console.warn("⚠️  AMI not connected, attempting reconnection...");
      await connectAMI();
    }

    // 1) Try database realtime contacts (most reliable if enabled)
    let contactsData = await getPJSIPContactsFromDB();

    // 2) If DB has no contacts, try precise per-endpoint AMI query
    if (Object.keys(contactsData).length === 0) {
      contactsData = await getContactsByEndpoints();
    }

    // 3) Fallback to bulk AMI contacts
    if (Object.keys(contactsData).length === 0) {
      contactsData = await getPJSIPContacts();
    }

    // Endpoints configuration (optional, for configured flag and status text)
    const endpointsData = await getPJSIPEndpoints();

    // Active client sessions (application-side)
    const sessionsData = await getActiveSessions();

    const statusUpdate = processStatusData(
      contactsData,
      endpointsData,
      sessionsData
    );

    if (statusUpdate.hasChanges) {
      broadcastStatusUpdate(statusUpdate.agents);
    }

    console.log(
      `📊 Agent status poll completed: ${statusUpdate.totalAgents} agents, ${statusUpdate.onlineAgents} online`
    );
  } catch (error) {
    console.error("❌ Error polling agent status:", error.message);
    if (amiClient) {
      try {
        amiClient.disconnect();
      } catch {}
    }
  }
};

/**
 * Fetch contacts by inspecting each endpoint explicitly
 * More robust against table formatting differences
 */
const getContactsByEndpoints = async () => {
  const contacts = {};
  if (!amiClient || !amiClient.isConnected()) return contacts;

  const extensions = Array.from(agents.keys());

  for (const ext of extensions) {
    try {
      const resp = await amiClient.sendAction({
        Action: "Command",
        Command: `pjsip show endpoint ${ext}`,
      });
      if (resp && resp.Output) {
        // Reuse the contact parser on the single-endpoint output
        const parsed = parsePJSIPContacts(resp.Output);
        if (parsed[ext]) {
          contacts[ext] = parsed[ext];
        }
      }
    } catch (e) {
      // Ignore individual failures, continue others
    }
  }

  return contacts;
};

/**
 * Get PJSIP contacts via AMI
 */
const getPJSIPContacts = async () => {
  try {
    const response = await amiClient.sendAction({
      Action: "Command",
      Command: "pjsip show contacts",
    });

    if (response.Response === "Success" && response.Output) {
      return parsePJSIPContacts(response.Output);
    }

    return {};
  } catch (error) {
    console.error("❌ Error getting PJSIP contacts:", error.message);
    return {};
  }
};

/**
 * Fetch contacts from ps_contacts realtime table (if available)
 */
const getPJSIPContactsFromDB = async () => {
  try {
    const extensions = Array.from(agents.keys());
    if (extensions.length === 0) return {};

    const placeholders = extensions.map(() => "?").join(",");
    const [rows] = await sequelize.query(
      `SELECT endpoint, uri FROM ps_contacts WHERE endpoint IN (${placeholders})`,
      { replacements: extensions }
    );

    const contacts = {};
    for (const row of rows) {
      const ext = String(row.endpoint);
      // Parse uri: sip:1005@102.214.151.191:57467;transport=ws
      const m = String(row.uri || "").match(/sip:[^@]+@([^:;]+):(\d+)/);
      if (m) {
        contacts[ext] = {
          extension: ext,
          ip: m[1],
          port: Number(m[2]),
          status: "registered",
          lastSeen: new Date().toISOString(),
          transport: row.uri.includes("transport=ws") ? "websocket" : undefined,
        };
      }
    }
    return contacts;
  } catch (e) {
    // Table may not exist or realtime not enabled for contacts; ignore
    return {};
  }
};

/**
 * Get PJSIP endpoints via AMI
 */
const getPJSIPEndpoints = async () => {
  try {
    const response = await amiClient.sendAction({
      Action: "Command",
      Command: "pjsip show endpoints",
    });

    if (response.Response === "Success" && response.Output) {
      return parsePJSIPEndpoints(response.Output);
    }

    return {};
  } catch (error) {
    console.error("❌ Error getting PJSIP endpoints:", error.message);
    return {};
  }
};

/**
 * Get active client sessions from database
 */
const getActiveSessions = async () => {
  try {
    const activeSessions = await ClientSession.findAll({
      where: {
        status: "active",
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date(),
        },
      },
      attributes: [
        "sip_username",
        "user_id",
        "client_fingerprint",
        "ip_address",
        "user_agent",
        "feature",
        "last_heartbeat",
        "created_at",
      ],
    });

    // Convert to map for easy lookup by extension
    const sessionsMap = new Map();

    activeSessions.forEach((session) => {
      const extension = session.sip_username;
      if (extension) {
        // Determine typology from session data
        const typology = determineSessionTypology(
          session.user_agent,
          session.feature
        );

        sessionsMap.set(extension, {
          userId: session.user_id,
          clientFingerprint: session.client_fingerprint,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          feature: session.feature,
          lastHeartbeat: session.last_heartbeat,
          createdAt: session.created_at,
          typology: typology,
          isActive: true,
        });
      }
    });

    // console.log(`📱 Found ${sessionsMap.size} active client sessions`);
    return sessionsMap;
  } catch (error) {
    console.error("❌ Error getting active sessions:", error.message);
    return new Map();
  }
};

/**
 * Determine typology based on session data
 */
const determineSessionTypology = (userAgent, feature) => {
  if (!userAgent && !feature) return null;

  const ua = (userAgent || "").toLowerCase();
  const feat = (feature || "").toLowerCase();

  // Chrome extension detection
  if (
    ua.includes("chrome") ||
    feat.includes("chrome") ||
    ua.includes("extension")
  ) {
    return "chrome_softphone";
  }

  // Electron app detection
  if (
    ua.includes("electron") ||
    feat.includes("electron") ||
    ua.includes("desktop")
  ) {
    return "electron_softphone";
  }

  // WebRTC browser detection
  if (
    ua.includes("webrtc") ||
    feat.includes("webrtc") ||
    ua.includes("browser")
  ) {
    return "webRTC";
  }

  // SIP.js detection (common in web-based softphones)
  if (ua.includes("sip.js") || ua.includes("sipjs")) {
    return "webRTC";
  }

  // Default based on feature
  if (feat.includes("softphone")) {
    return "chrome_softphone";
  }

  return null;
};

/**
 * Parse PJSIP contacts output
 */
const parsePJSIPContacts = (output) => {
  const contacts = {};
  const lines = output.split("\n");

  // Example line formats (from Asterisk CLI):
  // Contact:  1005/sip:1005@102.214.151.191:57467;transp e1cc5bbaca Avail       274.767
  // Contact:  1001/sip:1001@192.168.1.10:5060                2c2c1b5f7a NonQual    0.000

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("Contact:")) continue;

    // Capture: extension, ip, port, status, rtt
    const m = line.match(
      /Contact:\s+(\d+)\/sip:[^@]+@([^\s:;]+):(\d+).*?\s([A-Za-z]+)\s+([\d.]+)?/
    );
    if (m) {
      const [, extension, ip, port, statusWord, rtt] = m;
      contacts[extension] = {
        extension,
        ip,
        port: Number(port),
        status:
          statusWord.toLowerCase() === "avail"
            ? "registered"
            : statusWord.toLowerCase(),
        lastSeen: new Date().toISOString(),
        transport:
          line.includes("transport=ws") || line.includes(";transp")
            ? "websocket"
            : undefined,
        rtt: rtt ? Number(rtt) : undefined,
      };
    }
  }

  return contacts;
};

/**
 * Parse PJSIP endpoints output
 */
const parsePJSIPEndpoints = (output) => {
  const endpoints = {};
  const lines = output.split("\n");

  // Example line:
  // Endpoint:  1005                                                 Not in use    0 of inf

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("Endpoint:")) continue;

    const m = line.match(/Endpoint:\s+(\d+)\s+(.+?)\s{2,}\d+\s+of\s+/);
    if (m) {
      const [, extension, statusText] = m;
      endpoints[extension] = {
        extension,
        configured: true,
        asteriskStatus: statusText.trim(),
      };
    }
  }

  return endpoints;
};

/**
 * Process status data and detect changes
 */
const processStatusData = (contacts, endpoints, sessions) => {
  const statusUpdate = {
    agents: [],
    hasChanges: false,
    totalAgents: agents.size,
    onlineAgents: 0,
    timestamp: new Date().toISOString(),
  };

  for (const [extension, agent] of agents) {
    const contact = contacts[extension];
    const endpoint = endpoints[extension];
    const session = sessions.get(extension);

    // Determine agent status
    const newStatus = determineAgentStatus(agent, contact, endpoint, session);

    // Check for changes
    const currentStatus = statusCache.get(extension);
    const hasChanged =
      !currentStatus ||
      currentStatus.status !== newStatus.status ||
      currentStatus.ip !== newStatus.ip ||
      currentStatus.sessionActive !== newStatus.sessionActive ||
      currentStatus.typology !== newStatus.typology;

    if (hasChanged) {
      statusUpdate.hasChanges = true;
    }

    // Update cache
    statusCache.set(extension, newStatus);

    // Count online agents
    if (newStatus.status === "online" || newStatus.sessionActive) {
      statusUpdate.onlineAgents++;
    }

    // Add to status update
    statusUpdate.agents.push({
      ...agent,
      ...newStatus,
    });
  }

  return statusUpdate;
};

/**
 * Determine agent status based on available data
 */
const determineAgentStatus = (agent, contact, endpoint, session) => {
  const status = {
    status: "offline",
    ip: null,
    port: null,
    transport: agent.transport,
    lastSeen: null,
    configured: !!endpoint?.configured,
    asteriskStatus: endpoint?.asteriskStatus || "unknown",
    typology: agent.typology,
    sessionActive: false,
    clientType: null,
  };

  // Priority 1: Check active client session (most reliable)
  if (session && session.isActive) {
    status.status = "online";
    status.sessionActive = true;
    status.ip = session.ipAddress;
    status.lastSeen = session.lastHeartbeat || session.createdAt;
    status.clientType = session.typology || "unknown";

    // Update typology from session if it's more specific
    if (session.typology && session.typology !== agent.typology) {
      status.typology = session.typology;
    }
  }

  // Priority 2: Check PJSIP contact (SIP registration)
  else if (contact) {
    status.status = "online";
    status.ip = contact.ip;
    status.port = contact.port;
    status.lastSeen = contact.lastSeen;
    status.transport = contact.transport;
  }

  // Priority 3: Check if endpoint is configured
  else if (endpoint?.configured) {
    status.status = "registered"; // Configured but no active contact
  }

  return status;
};

/**
 * Broadcast status update via WebSocket
 */
const broadcastStatusUpdate = (agents) => {
  try {
    const updatePayload = {
      type: "agent_status_update",
      timestamp: new Date().toISOString(),
      agents: agents,
    };

    // Broadcast to all connected clients
    broadcast("agent_status", updatePayload);

    console.log(`📡 Broadcasted status update for ${agents.length} agents`);
  } catch (error) {
    console.error("❌ Error broadcasting status update:", error.message);
  }
};

/**
 * Get current status for all agents
 */
const getCurrentStatus = async () => {
  // If statusCache is empty and service is running, trigger a poll
  if (statusCache.size === 0 && isRunning) {
    console.log("🔄 StatusCache empty, triggering immediate poll...");
    await pollAgentStatus();
  }

  const agentsList = [];
  const summary = {
    total: 0,
    online: 0,
    offline: 0,
    registered: 0,
  };

  for (const [extension, agent] of agents) {
    const status = statusCache.get(extension) || {
      status: "unknown",
      ip: null,
      port: null,
      transport: agent.transport,
      lastSeen: null,
      configured: false,
      asteriskStatus: "unknown",
      typology: agent.typology,
      sessionActive: false,
      clientType: null,
    };

    const agentWithStatus = {
      ...agent,
      ...status,
    };

    agentsList.push(agentWithStatus);

    // Update summary
    summary.total++;
    switch (status.status) {
      case "online":
        summary.online++;
        break;
      case "registered":
        summary.registered++;
        break;
      default:
        summary.offline++;
    }
  }

  return {
    agents: agentsList,
    summary,
    timestamp: new Date().toISOString(),
    isRunning,
  };
};

/**
 * Manually refresh agents from database
 */
const refreshAgents = async () => {
  try {
    console.log("🔄 Manually refreshing agent list...");
    await loadAgents();
    console.log("✅ Agent list refreshed successfully");
    return true;
  } catch (error) {
    console.error("❌ Error refreshing agents:", error.message);
    return false;
  }
};

// Export the service functions
export default {
  initialize,
  start,
  stop,
  getCurrentStatus,
  refreshAgents,
  loadAgents,
  pollAgentStatus,
};
