// utils/asteriskConfigWriter.js
import fs from "fs/promises";
import amiService from "../services/amiService.js";
import sequelize from "../config/sequelize.js";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

// Function to create or update PJSIP transport configurations
export const updatePJSIPTransports = async () => {
  try {
    const pjsipPath = "/etc/asterisk/pjsip.conf";

    // Check if we're using a remote Asterisk server
    const isRemoteAsterisk =
      process.env.AMI_HOST &&
      process.env.AMI_HOST !== "localhost" &&
      process.env.AMI_HOST !== "127.0.0.1" &&
      !process.env.AMI_HOST.startsWith("192.168.") &&
      !process.env.AMI_HOST.startsWith("10.") &&
      !process.env.AMI_HOST.startsWith("172.");

    if (isRemoteAsterisk) {
      console.log(
        "✅ Using remote Asterisk server - PJSIP configuration managed remotely"
      );
      console.log(
        `💡 Remote AMI: ${process.env.AMI_HOST}:${process.env.AMI_PORT}`
      );
      console.log(
        "💡 PJSIP configuration should be managed on the remote Asterisk server"
      );
      return;
    }

    // Check if we're in development mode with local Asterisk
    if (process.env.NODE_ENV === "development") {
      console.log("⚠ Skipping PJSIP transport setup in development mode");
      console.log(
        "💡 PJSIP configuration is only needed for local Asterisk installations"
      );
      return;
    }

    // Check if pjsip.conf exists (only for local Asterisk)
    try {
      await fs.access(pjsipPath);
    } catch (error) {
      console.warn("⚠ PJSIP config file not found, skipping transport setup");
      console.log("💡 This is normal when using remote Asterisk servers");
      return;
    }

    // Read existing config
    let existingConfig = await fs.readFile(pjsipPath, "utf8");

    // Check if transport configurations already exist
    const hasTransportUdp = existingConfig.includes("[transport-udp]");
    const hasTransportTcp = existingConfig.includes("[transport-tcp]");
    const hasTransportWs = existingConfig.includes("[transport-ws]");
    const hasTransportWss = existingConfig.includes("[transport-wss]");

    // Get external IP from network config database
    let externalIp = null;
    try {
      const { ExternIp } = await import("../models/networkConfigModel.js");
      const externIp = await ExternIp.findOne({
        where: { active: true },
        order: [["id", "ASC"]], // Get the first active external IP
      });

      if (externIp && externIp.address) {
        externalIp = externIp.address;
        console.log(`Using external IP from database: ${externalIp}`);
      } else {
        console.warn("No active external IP found in database");
        throw new Error("No active external IP configured");
      }
    } catch (error) {
      console.warn("Could not get external IP from database:", error.message);
      throw new Error(
        "External IP configuration required for PJSIP transports"
      );
    }

    // Build transport configurations
    let transportConfigs = "";

    // UDP Transport (most common)
    if (!hasTransportUdp) {
      transportConfigs += `
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=${externalIp}
external_signaling_address=${externalIp}
local_net=0.0.0.0/0
symmetric_transport=yes
allow_reload=yes
`;
    }

    // TCP Transport
    if (!hasTransportTcp) {
      transportConfigs += `
[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:5060
external_media_address=${externalIp}
external_signaling_address=${externalIp}
local_net=0.0.0.0/0
symmetric_transport=yes
allow_reload=yes
`;
    }

    // WebSocket Transport (for WebRTC)
    if (!hasTransportWs) {
      transportConfigs += `
[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8088
external_media_address=${externalIp}
external_signaling_address=${externalIp}
websocket_write_timeout=10000
allow_reload=yes
`;
    }

    // Secure WebSocket Transport (for WebRTC)
    if (!hasTransportWss) {
      transportConfigs += `
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=${externalIp}
external_signaling_address=${externalIp}
websocket_write_timeout=10000
method=tlsv1_2
require_client_cert=no
verify_client=no
local_net=0.0.0.0/0
symmetric_transport=yes
allow_reload=yes
cert_file=/etc/letsencrypt/live/cs.brhgroup.co/fullchain.pem
priv_key_file=/etc/letsencrypt/live/cs.brhgroup.co/privkey.pem
`;
    }

    // If we have new transport configs to add
    if (transportConfigs) {
      // Find the right place to insert (after [general] section if it exists)
      let insertPosition = 0;
      const generalIndex = existingConfig.indexOf("[general]");
      if (generalIndex !== -1) {
        // Find the end of the [general] section
        const nextSectionIndex = existingConfig.indexOf("[", generalIndex + 1);
        insertPosition =
          nextSectionIndex !== -1 ? nextSectionIndex : existingConfig.length;
      } else {
        // If no [general] section, insert at the beginning
        insertPosition = 0;
      }

      // Insert transport configurations
      const beforeInsert = existingConfig.slice(0, insertPosition);
      const afterInsert = existingConfig.slice(insertPosition);
      existingConfig = beforeInsert + transportConfigs + afterInsert;

      // Write to temp file and move
      const tempFile = `/tmp/pjsip_${Date.now()}.conf`;
      await fs.writeFile(tempFile, existingConfig);
      await execAsync(`sudo mv ${tempFile} ${pjsipPath}`);
      await execAsync(`sudo chown asterisk:asterisk ${pjsipPath}`);
      await execAsync(`sudo chmod 644 ${pjsipPath}`);

      console.log("PJSIP transport configurations updated successfully");
    }

    return true;
  } catch (error) {
    console.error("Error updating PJSIP transports:", error);
    throw error;
  }
};

// Function to check if transport configurations exist
export const checkPJSIPTransports = async () => {
  try {
    const pjsipPath = "/etc/asterisk/pjsip.conf";
    const existingConfig = await fs.readFile(pjsipPath, "utf8");

    const hasTransportUdp = existingConfig.includes("[transport-udp]");
    const hasTransportTcp = existingConfig.includes("[transport-tcp]");
    const hasTransportWs = existingConfig.includes("[transport-ws]");
    const hasTransportWss = existingConfig.includes("[transport-wss]");

    return {
      exists:
        hasTransportUdp || hasTransportTcp || hasTransportWs || hasTransportWss,
      hasTransportUdp,
      hasTransportTcp,
      hasTransportWs,
      hasTransportWss,
    };
  } catch (error) {
    console.error("Error checking PJSIP transports:", error);
    return { exists: false };
  }
};

// Function to force update transport configurations (used when network settings change)
export const forceUpdatePJSIPTransports = async () => {
  try {
    const pjsipPath = "/etc/asterisk/pjsip.conf";

    // Read existing config
    let existingConfig = await fs.readFile(pjsipPath, "utf8");

    // Get external IP from network config
    const { ExternIp } = await import("../models/networkConfigModel.js");
    const externIp = await ExternIp.findOne({
      where: { active: true },
      order: [["id", "ASC"]],
    });

    if (!externIp || !externIp.address) {
      throw new Error("No active external IP configured");
    }

    const externalIp = externIp.address;
    console.log(
      `Updating transport configurations with external IP: ${externalIp}`
    );

    // Remove existing transport configurations
    const transportSections = [
      "[transport-udp]",
      "[transport-tcp]",
      "[transport-ws]",
      "[transport-wss]",
    ];

    transportSections.forEach((section) => {
      const regex = new RegExp(`${section}[^[]*(?=\\[|$)`, "gs");
      existingConfig = existingConfig.replace(regex, "");
    });

    // Add new transport configurations
    const transportConfigs = `
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=${externalIp}
external_signaling_address=${externalIp}
local_net=0.0.0.0/0
symmetric_transport=yes
allow_reload=yes

[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:5060
external_media_address=${externalIp}
external_signaling_address=${externalIp}
local_net=0.0.0.0/0
symmetric_transport=yes
allow_reload=yes

[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8088
external_media_address=${externalIp}
external_signaling_address=${externalIp}
websocket_write_timeout=10000
allow_reload=yes

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=${externalIp}
external_signaling_address=${externalIp}
websocket_write_timeout=10000
method=tlsv1_2
require_client_cert=no
verify_client=no
local_net=0.0.0.0/0
symmetric_transport=yes
allow_reload=yes
cert_file=/etc/letsencrypt/live/cs.brhgroup.co/fullchain.pem
priv_key_file=/etc/letsencrypt/live/cs.brhgroup.co/privkey.pem
`;

    // Find the right place to insert (after [general] section if it exists)
    let insertPosition = 0;
    const generalIndex = existingConfig.indexOf("[general]");
    if (generalIndex !== -1) {
      // Find the end of the [general] section
      const nextSectionIndex = existingConfig.indexOf("[", generalIndex + 1);
      insertPosition =
        nextSectionIndex !== -1 ? nextSectionIndex : existingConfig.length;
    } else {
      // If no [general] section, insert at the beginning
      insertPosition = 0;
    }

    // Insert transport configurations
    const beforeInsert = existingConfig.slice(0, insertPosition);
    const afterInsert = existingConfig.slice(insertPosition);
    existingConfig = beforeInsert + transportConfigs + afterInsert;

    // Write to temp file and move
    const tempFile = `/tmp/pjsip_${Date.now()}.conf`;
    await fs.writeFile(tempFile, existingConfig);
    await execAsync(`sudo mv ${tempFile} ${pjsipPath}`);
    await execAsync(`sudo chown asterisk:asterisk ${pjsipPath}`);
    await execAsync(`sudo chmod 644 ${pjsipPath}`);

    console.log("PJSIP transport configurations force updated successfully");
    return true;
  } catch (error) {
    console.error("Error force updating PJSIP transports:", error);
    throw error;
  }
};

export const updatePJSIPConfig = async (trunkData) => {
  try {
    // First, ensure transport configurations exist
    try {
      await updatePJSIPTransports();
    } catch (error) {
      console.error("Failed to update PJSIP transports:", error.message);
      throw new Error(
        `Cannot create trunk: ${error.message}. Please configure an external IP in Network Settings first.`
      );
    }

    // Validate that transport configurations exist in pjsip.conf
    const pjsipPath = "/etc/asterisk/pjsip.conf";
    let existingConfig;
    try {
      existingConfig = await fs.readFile(pjsipPath, "utf8");
    } catch (readError) {
      throw new Error("Cannot read pjsip.conf file");
    }

    // Check if transport configurations exist
    const hasTransportUdp = existingConfig.includes("[transport-udp]");
    const hasTransportTcp = existingConfig.includes("[transport-tcp]");
    const hasTransportWs = existingConfig.includes("[transport-ws]");
    const hasTransportWss = existingConfig.includes("[transport-wss]");

    if (
      !hasTransportUdp &&
      !hasTransportTcp &&
      !hasTransportWs &&
      !hasTransportWss
    ) {
      throw new Error(
        "No PJSIP transport configurations found. Please configure an external IP in Network Settings first."
      );
    }

    console.log("PJSIP transport configurations validated:", {
      hasTransportUdp,
      hasTransportTcp,
      hasTransportWs,
      hasTransportWss,
    });

    // Read existing config (reuse the already read config)

    if (trunkData.delete) {
      console.log(`Deleting PJSIP configurations for trunk: ${trunkData.name}`);

      // Enhanced regex pattern to match all trunk-related sections
      const sections = [
        trunkData.name, // base endpoint
        `${trunkData.name}_auth`, // auth section
        `${trunkData.name}_aor`, // aor section
        `${trunkData.name}_reg`, // registration section
        `${trunkData.name}_identify`, // identify section
      ].join("|");

      console.log(`Looking for sections: ${sections}`);

      const regexPattern = new RegExp(
        `\\[(${sections})\\][^[]*(?=\\[|$)`,
        "gs"
      );

      // Remove all matching sections
      const beforeCount = (existingConfig.match(/\[/g) || []).length;
      existingConfig = existingConfig.replace(regexPattern, "");
      const afterCount = (existingConfig.match(/\[/g) || []).length;

      console.log(
        `Removed ${beforeCount - afterCount} sections from pjsip.conf`
      );

      // Clean up any multiple blank lines
      existingConfig = existingConfig.replace(/\n{3,}/g, "\n\n");

      // Write the cleaned config back
      const tempFile = `/tmp/pjsip_${Date.now()}.conf`;
      await fs.writeFile(tempFile, existingConfig);
      await execAsync(`sudo mv ${tempFile} ${pjsipPath}`);
      await execAsync(`sudo chown asterisk:asterisk ${pjsipPath}`);
      await execAsync(`sudo chmod 644 ${pjsipPath}`);

      console.log(
        `Successfully deleted PJSIP configurations for trunk: ${trunkData.name}`
      );
      return true;
    }

    // If not deleting, continue with the existing create/update logic
    // Remove any existing configuration for this trunk
    const regexPattern = new RegExp(
      `\\[${trunkData.name}[^\\[]*\\]([^\\[]*\\n)*`,
      "g"
    );
    existingConfig = existingConfig.replace(regexPattern, "");

    const hostSanitized = (trunkData.host || "")
      .replace(/^sip:/, "")
      .replace(/:5060$/, "");

    let newConfig = `
[${trunkData.name}]
type=endpoint
context=${trunkData.context}
disallow=all
allow=${trunkData.codecs}
transport=${trunkData.transport}
auth=${trunkData.name}_auth
aors=${trunkData.name}_aor
send_pai=yes
send_rpid=yes
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
identify_by=ip,username,auth_username

[${trunkData.name}_identify]
type=identify
endpoint=${trunkData.name}
match=${hostSanitized}
match_header=To: .*<sip:.*@${hostSanitized}>.*
`;

    if (!trunkData.isP2P) {
      newConfig += `
[${trunkData.name}_auth]
type=auth
auth_type=userpass
username=${trunkData.username}
password=${trunkData.password}

[${trunkData.name}_aor]
type=aor
contact=sip:${hostSanitized}:5060
qualify_frequency=60
max_contacts=1
remove_existing=yes
`;
      if (trunkData.useRegistration && trunkData.username && hostSanitized) {
        newConfig += `
[${trunkData.name}_reg]
type=registration
outbound_auth=${trunkData.name}_auth
server_uri=sip:${hostSanitized}
client_uri=sip:${trunkData.username}@${hostSanitized}
contact_user=${trunkData.username}
transport=${trunkData.transport}
retry_interval=60
expiration=3600
max_retries=10000
auth_rejection_permanent=no
line=yes
endpoint=${trunkData.name}
`;
      }
    }

    // Write to a temporary file first
    const tempFile = `/tmp/pjsip_${Date.now()}.conf`;
    await fs.writeFile(tempFile, existingConfig + newConfig);

    // Use sudo to move the file and set proper permissions
    await execAsync(`sudo mv ${tempFile} ${pjsipPath}`);
    await execAsync(`sudo chown asterisk:asterisk ${pjsipPath}`);
    await execAsync(`sudo chmod 644 ${pjsipPath}`);

    return true;
  } catch (error) {
    console.error("Error writing PJSIP config:", error);
    throw error;
  }
};

export const updateDialplanConfig = async (routeData) => {
  try {
    // If this is a delete operation, handle differently
    if (routeData.delete) {
      await amiService.executeAction({
        Action: "Command",
        Command: `dialplan remove context outbound-route-${routeData.id}`,
      });
      return true;
    }

    // Validate pattern
    if (!routeData.pattern) {
      throw new Error("Pattern is required for outbound route");
    }

    // Ensure pattern starts with underscore for pattern matching
    const pattern = routeData.pattern.startsWith("_")
      ? routeData.pattern
      : `_${routeData.pattern}`;

    // Create a unique context for this route
    const dialplanConfig = `
[outbound-route-${routeData.id}]
exten => ${pattern},1,NoOp(Outbound Route: ${routeData.name})
same => n,Set(OUTBOUND_ROUTE_ID=${routeData.id})
same => n,Set(OUTBOUND_TRUNK=${routeData.primaryTrunkId})
same => n,Set(CALLERID(num)=${routeData.callerIdNumber || "${CALLERID(num)}"})
same => n,Dial(PJSIP/\${EXTEN}@${routeData.primaryTrunkId}-endpoint)
same => n,Hangup()

[from-internal]
include => outbound-route-${routeData.id}
`;

    // Write to a separate file for this route
    const routeConfigPath = `/etc/asterisk/outbound-route-${routeData.id}.conf`;
    await fs.writeFile(routeConfigPath, dialplanConfig);

    // Include the route config in extensions.conf if not already included
    const extensionsPath = "/etc/asterisk/extensions.conf";
    const includeStatement = `#include outbound-route-${routeData.id}.conf\n`;

    try {
      let extensionsContent = await fs.readFile(extensionsPath, "utf8");
      if (!extensionsContent.includes(includeStatement)) {
        await fs.appendFile(extensionsPath, includeStatement);
      }
    } catch (error) {
      console.error("Error managing extensions.conf:", error);
      throw error;
    }

    // Reload dialplan
    await amiService.executeAction({
      Action: "Command",
      Command: "dialplan reload",
    });

    return true;
  } catch (error) {
    console.error("Error updating dialplan config:", error);
    throw error;
  }
};

export const updateRTPConfig = async () => {
  try {
    const { Stun, Turn, ExternIp } = await import(
      "../models/networkConfigModel.js"
    );

    // Force sync with database to ensure we have latest data
    await sequelize.sync();

    // Get active STUN and TURN servers
    const stuns = await Stun.findAll({
      where: { active: true },
      raw: true,
    });

    const turns = await Turn.findAll({
      where: { active: true },
      raw: true,
    });

    // Get external IPs for NAT traversal
    const externIps = await ExternIp.findAll({
      where: { active: true },
      raw: true,
    });

    // Build RTP configuration
    let rtpContent = `[general]
; RTP Configuration for NAT traversal
rtpstart=10000
rtpend=20000
ice_support=yes
strictrtp=no
rtpchecksums=no
rtp_timeout=60
rtp_hold_timeout=600
rtp_keepalive=15
`;

    // Add external media address for NAT traversal
    if (externIps.length > 0) {
      rtpContent += `; External media address for NAT traversal\n`;
      externIps.forEach((ip) => {
        rtpContent += `external_media_address=${ip.address}\n`;
      });
      rtpContent += `\n`;
    }

    // Add STUN configurations
    if (stuns.length > 0) {
      rtpContent += `; STUN server configurations\n`;
      stuns.forEach((stun) => {
        rtpContent += `stunaddr=${stun.server}:${stun.port}\n`;
      });
      rtpContent += `\n`;
    }

    // Add TURN configurations if available
    if (turns.length > 0) {
      rtpContent += `; TURN server configurations\n`;
      turns.forEach((turn) => {
        let turnConfig = `turnaddr=${turn.server}:${turn.port}`;
        if (turn.username && turn.password) {
          turnConfig += `?transport=udp&username=${turn.username}&password=${turn.password}`;
        }
        turnConfig += "\n";
        rtpContent += turnConfig;
      });
      rtpContent += `\n`;
    }

    // Write to rtp.conf
    await fs.writeFile("/etc/asterisk/rtp.conf", rtpContent);

    return true;
  } catch (error) {
    console.error("Error updating RTP configuration:", error);
    throw error;
  }
};

export const updateAsteriskConfig = async () => {
  try {
    const networkConfigPath = "/etc/asterisk/mayday.d/pjsip_network.conf";
    const tempFile = "/tmp/mayday.conf";

    // Get all active configurations
    const { ExternIp, LocalNet } = await import(
      "../models/networkConfigModel.js"
    );

    // Note: No need for sequelize.sync() here - tables already exist from startup
    // This function only reads data and writes config files, no schema changes needed

    // Clear any potential caches and force fresh queries
    const externIps = await ExternIp.findAll({
      where: { active: true },
      raw: true, // Use raw queries to avoid caching
      logging: console.log, // Add logging to debug
    });

    const localNets = await LocalNet.findAll({
      where: { active: true },
      raw: true, // Use raw queries to avoid caching
      logging: console.log, // Add logging to debug
    });

    // console.log("🔍 Fresh database query results:");
    // console.log(
    //   "External IPs:",
    //   externIps.map((ip) => ({
    //     id: ip.id,
    //     address: ip.address,
    //     active: ip.active,
    //   }))
    // );
    // console.log(
    //   "Local Networks:",
    //   localNets.map((net) => ({
    //     id: net.id,
    //     network: net.network,
    //     active: net.active,
    //   }))
    // );

    // Build configuration content
    let configContent = `;==========================================
; Mayday Network Configuration
; Auto-generated - Do not edit manually
; Generated at: ${new Date().toISOString()}
;==========================================\n\n`;

    // Add External IP configurations for RTP media
    if (externIps.length > 0) {
      configContent += `[external_media_address]\n`;
      externIps.forEach((ip) => {
        configContent += `external_media_address=${ip.address}\n`;
      });
      configContent += `\n`;
    }

    // Add Local Network configurations
    if (localNets.length > 0) {
      configContent += `[local_nets]
; Local network definitions for NAT traversal
`;
      localNets.forEach((net) => {
        configContent += `local_net=${net.network}\n`;
      });
      configContent += `\n`;
    }

    console.log("📝 Generated config content:");
    console.log(configContent);

    // Write to temp file
    await fs.writeFile(tempFile, configContent);

    // Create directory if it doesn't exist
    await execAsync(`sudo mkdir -p /etc/asterisk/mayday.d`);

    // Move file using sudo
    await execAsync(`sudo mv ${tempFile} ${networkConfigPath}`);

    // Try to set ownership, but don't fail if asterisk user/group doesn't exist
    try {
      await execAsync(`sudo chown asterisk:asterisk ${networkConfigPath}`);
    } catch (error) {
      console.warn(
        "Could not set asterisk ownership (asterisk user/group may not exist):",
        error.message
      );
      // Try alternative ownership
      try {
        await execAsync(`sudo chown root:root ${networkConfigPath}`);
      } catch (chownError) {
        console.warn("Could not set file ownership:", chownError.message);
      }
    }

    try {
      await execAsync(`sudo chmod 644 ${networkConfigPath}`);
    } catch (error) {
      console.warn("Could not set file permissions:", error.message);
    }

    // console.log("✅ Configuration file updated:", networkConfigPath);

    // Update PJSIP transport configurations with new external IP
    try {
      await updatePJSIPTransports();
      console.log(
        "PJSIP transport configurations updated with new external IP"
      );
    } catch (error) {
      console.warn("Could not update PJSIP transports:", error.message);
      // Continue with network config update even if transport update fails
    }

    // Update RTP configuration for NAT traversal
    try {
      await updateRTPConfig();
      console.log("RTP configuration updated for NAT traversal");
    } catch (error) {
      console.warn("Could not update RTP config:", error.message);
    }

    // Reload PJSIP and RTP modules
    const reloadResult = await amiService.executeAction({
      Action: "Command",
      Command: "module reload res_pjsip.so",
    });

    if (!reloadResult || reloadResult.response === "Error") {
      throw new Error(reloadResult?.message || "Failed to reload PJSIP module");
    }

    // Also reload RTP module
    const rtpReloadResult = await amiService.executeAction({
      Action: "Command",
      Command: "module reload res_rtp_asterisk.so",
    });

    if (!rtpReloadResult || rtpReloadResult.response === "Error") {
      console.warn("Could not reload RTP module:", rtpReloadResult?.message);
    }

    return true;
  } catch (error) {
    console.error("Error updating Asterisk configurations:", error);
    throw new Error(
      "Failed to update Asterisk configuration: " + error.message
    );
  }
};

export const updateIVRConfig = async (ivrData) => {
  try {
    const { id, name } = ivrData;

    const dialplanConfig = `
[ivr-${id}]
exten => s,1,NoOp(IVR Flow: ${name})
 same => n,Answer()
 same => n,Set(ivrId=${id})
 same => n,AGI(agi://localhost:4574)
 same => n,Hangup()
`;
    await fs.appendFile("/etc/asterisk/extensions.conf", dialplanConfig);

    // Reload configurations
    await amiService.executeAction({
      Action: "Command",
      Command: "dialplan reload",
    });

    return true;
  } catch (error) {
    console.error("Error updating IVR configuration:", error);
    throw error;
  }
};

// Runs automatically when the server starts to configure Asterisk Contexts and RTP
export const updateContextsConfig = async () => {
  try {
    const extensionsContextsPath =
      "/etc/asterisk/mayday.d/extensions_mayday_contexts.conf";
    const tempFile = "/tmp/extensions_append.conf";

    // Load dynamic contexts from DB
    let dynamicContexts = [];
    try {
      const DialplanContext = (
        await import("../models/dialplanContextModel.js")
      ).default;
      dynamicContexts = await DialplanContext.findAll({
        where: { active: true },
        raw: true,
      });
    } catch (e) {
      console.warn("Could not load dialplan contexts from DB:", e.message);
    }

    // Base contexts
    let contextsContent = `
[from-sip]
include => from-sip-custom
switch => Realtime

[from-voip-provider]
include => from-voip-provider-custom
switch => Realtime

[from-internal]
include => from-internal-custom
switch => Realtime

[mayday-mixmonitor-context]
switch => Realtime
`;

    // Append dynamic contexts: each includes optional include and switches to realtime key
    if (dynamicContexts && dynamicContexts.length > 0) {
      const rendered = dynamicContexts
        .map((c) => {
          const name = c.name?.trim();
          if (!name) return null;
          const include = c.include?.trim();
          const rt = (c.realtimeKey || name).trim();
          return `\n[${name}]\n${
            include ? `include => ${include}\n` : ""
          }switch => Realtime/${rt}@voice_extensions\n`;
        })
        .filter(Boolean)
        .join("");
      contextsContent += rendered;
    }

    // Write to temp file
    await fs.writeFile(tempFile, contextsContent);

    // Move file using sudo
    await execAsync(`sudo mv ${tempFile} ${extensionsContextsPath}`);
    await execAsync(`sudo chown asterisk:asterisk ${extensionsContextsPath}`);
    await execAsync(`sudo chmod 644 ${extensionsContextsPath}`);

    // Append include directive to extensions.conf only if not already present
    const includeLine = "#include mayday.d/extensions_mayday_contexts.conf";
    try {
      const { stdout } = await execAsync(
        `sudo bash -lc 'grep -Fxq "${includeLine}" /etc/asterisk/extensions.conf && echo present || echo missing'`
      );
      if (!stdout || !stdout.toString().includes("present")) {
        await execAsync(
          `echo "${includeLine}" | sudo tee -a /etc/asterisk/extensions.conf`
        );
      }
    } catch (e) {
      // As a safe fallback, attempt an idempotent append using sed guard
      await execAsync(
        `sudo bash -lc 'grep -Fxq "${includeLine}" /etc/asterisk/extensions.conf || echo "${includeLine}" >> /etc/asterisk/extensions.conf'`
      );
    }

    // Reload dialplan
    await amiService.executeAction({
      Action: "Command",
      Command: "dialplan reload",
    });

    return true;
  } catch (error) {
    console.error("Error updating contexts configuration:", error);
    throw error;
  }
};
