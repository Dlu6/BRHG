import fetch from "node-fetch";
import { generateFingerprint } from "../utils/serverFingerprinting.js";
import os from "os";

// State management for master server service
let isRegistered = false;
let serverId = null;
let slaveServerApiKey = process.env.SLAVE_SERVER_API_KEY || null;
let currentRetries = 0;
let lastPingTime = null;

// Configuration constants
const masterServerUrl =
  process.env.LICENSE_MGMT_API_URL ||
  "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api";

// Fix domain validation issue - use proper domain or localhost
const getSlaveServerDomain = () => {
  const envDomain = process.env.SLAVE_SERVER_DOMAIN;
  if (envDomain) {
    return envDomain;
  }

  const hostname = os.hostname();

  // Check if hostname is a valid domain (has TLD)
  if (hostname.includes(".") && !hostname.startsWith("ip-")) {
    return hostname;
  }

  // For production, we need a proper domain name
  if (process.env.NODE_ENV === "production") {
    // In production, we should have a proper domain set
    console.error(
      `[MasterServer] ❌ ERROR: No valid domain configured for production!`
    );
    console.error(`[MasterServer] Current hostname: ${hostname}`);
    console.error(
      `[MasterServer] Please set SLAVE_SERVER_DOMAIN environment variable to a valid domain name.`
    );
    console.error(
      `[MasterServer] Example: SLAVE_SERVER_DOMAIN=your-server.com`
    );

    // Use a fallback that indicates this needs to be configured
    return "unconfigured-domain.com";
  }

  // Only use localhost for development
  console.log(
    `[MasterServer] Hostname '${hostname}' is not a valid domain, using localhost for development`
  );
  return "localhost";
};

const slaveServerDomain = getSlaveServerDomain();
const slaveServerApiUrl =
  process.env.SLAVE_SERVER_API_URL || "http://localhost:8004";
const slaveServerWebSocketUrl =
  process.env.SLAVE_SERVER_WEBSOCKET_URL || "ws://localhost:8089";

// Configuration
const pingIntervalTime = 5 * 60 * 1000; // 5 minutes
const registrationRetryTime = 30 * 1000; // 30 seconds
const maxRetries = 10;

// Refs for intervals
let pingIntervalRef = null;
let registrationRetryIntervalRef = null;

/**
 * Get current server information
 */
const getServerInfo = async () => {
  const memUsage = process.memoryUsage();
  const loadAvg = os.loadavg();

  return {
    version: process.env.npm_package_version || "1.0.0",
    os: `${os.type()} ${os.release()}`,
    node_version: process.version,
    uptime: Math.floor(process.uptime()),
    memory_usage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    cpu_usage: Math.round(loadAvg[0] * 100), // Simplified CPU usage
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  };
};

/**
 * Save credentials for persistence
 */
const saveCredentials = async (credentials) => {
  // In a production environment, you would securely store these credentials
  // For now, we'll just log them (DO NOT do this in production)
  console.log("[MasterServer] 🔐 Credentials received:");
  console.log(`- Server ID: ${credentials.id}`);
  console.log(`- API Key: ${credentials.api_key?.substring(0, 8)}...`);
  console.log(`- Secret Key: ${credentials.secret_key?.substring(0, 8)}...`);
  console.log(
    "💡 Please save these credentials to your environment variables:"
  );
  console.log(`SLAVE_SERVER_API_KEY=${credentials.api_key}`);
  console.log(`SLAVE_SERVER_SECRET_KEY=${credentials.secret_key}`);
  console.log(`SLAVE_SERVER_ID=${credentials.id}`);

  // TODO: Implement secure credential storage
  // This could be:
  // - Writing to a secure config file
  // - Using a secrets management service
  // - Storing in environment variables
};

/**
 * Attempt to register with master server
 */
const attemptRegistration = async () => {
  try {
    // Skip registration - license updates work without it
    console.log(
      `[MasterServer] ℹ️ Skipping registration - license updates work via direct API calls`
    );
    console.log(`[MasterServer] ℹ️ The server will operate in standalone mode`);
    return false;

    // Original registration code commented out since it's not needed
    /*
    const fingerprint = await generateFingerprint();
    const serverInfo = await getServerInfo();

    // Check if we should skip registration in production
    if (process.env.NODE_ENV === "production" && slaveServerDomain === "unconfigured-domain.com") {
      console.log(
        `[MasterServer] ℹ️ Skipping registration in production - no valid domain configured`
      );
      console.log(
        `[MasterServer] ℹ️ The server will operate in standalone mode`
      );
      console.log(
        `[MasterServer] ℹ️ To enable master server registration, set SLAVE_SERVER_DOMAIN environment variable`
      );
      return false;
    }

    const registrationData = {
      name: process.env.SLAVE_SERVER_NAME || `Slave-${slaveServerDomain}`,
      domain: slaveServerDomain,
      description:
        process.env.SLAVE_SERVER_DESCRIPTION ||
        `Reach-mi instance for ${slaveServerDomain}`,
      api_url: slaveServerApiUrl,
      websocket_url: slaveServerWebSocketUrl,
      server_fingerprint: fingerprint,
      server_info: serverInfo,
      configuration: {
        max_licenses: parseInt(process.env.MAX_LICENSES) || 10,
        allowed_features: (
          process.env.ALLOWED_FEATURES || "webrtc_extension,call_monitoring"
        ).split(","),
        timezone: process.env.TZ || "UTC",
      },
    };
    */

    console.log(
      `[MasterServer] Attempting registration with master server: ${masterServerUrl}`
    );

    // Use the new self-registration endpoint that doesn't require authentication
    const response = await fetch(
      `${masterServerUrl}/slave-servers/register-self`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: Self-registration doesn't require authentication
          // The master server admin will approve/activate the registration
        },
        body: JSON.stringify(registrationData),
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("[MasterServer] ✅ Registration successful!");
      console.log(`[MasterServer] Server ID: ${result.data.id}`);
      console.log(
        `[MasterServer] API Key: ${result.data.api_key?.substring(0, 8)}...`
      );
      console.log(`[MasterServer] Status: ${result.data.status}`);
      console.log(`[MasterServer] Message: ${result.data.message}`);

      // Store the credentials (in production, store these securely)
      slaveServerApiKey = result.data.api_key;
      serverId = result.data.id;
      isRegistered = true;
      currentRetries = 0;

      // Save to environment or config file for persistence
      await saveCredentials(result.data);

      // Start ongoing services
      await startServices();

      return true;
    } else if (response.status === 409) {
      // Server already exists
      console.log(
        `[MasterServer] ⚠️ Server already exists for domain: ${slaveServerDomain}`
      );

      if (process.env.NODE_ENV === "development") {
        // In development, try to clear and retry
        console.log(
          "[MasterServer] Attempting to clear in development mode..."
        );
        try {
          const clearResponse = await fetch(
            `${masterServerUrl}/slave-servers/clear-registration`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ domain: slaveServerDomain }),
            }
          );

          if (clearResponse.ok) {
            console.log(
              "[MasterServer] 🧹 Cleared existing registration, retrying..."
            );
            // Retry registration after clearing
            setTimeout(() => attemptRegistration(), 2000);
            return false;
          } else {
            console.log(
              "[MasterServer] ❌ Failed to clear existing registration"
            );
          }
        } catch (clearError) {
          console.log(
            "[MasterServer] ❌ Error clearing registration:",
            clearError.message
          );
        }
      } else {
        // In production, log the issue but don't fail completely
        console.log(
          `[MasterServer] ℹ️ Server already registered in production. This is normal if the server was previously registered.`
        );
        console.log(
          `[MasterServer] ℹ️ The server will continue to operate in standalone mode.`
        );
        return false; // Don't throw error, just return false
      }

      throw new Error(
        result.message || "Registration failed - server already exists"
      );
    } else {
      // Log the actual error response for debugging
      console.error(
        `[MasterServer] Registration failed with status: ${response.status}`
      );
      console.error(`[MasterServer] Response:`, result);
      throw new Error(result.message || "Registration failed");
    }
  } catch (error) {
    console.error(`[MasterServer] ❌ Registration failed: ${error.message}`);

    // Don't retry since we're not registering
    console.log(
      `[MasterServer] ℹ️ Registration disabled - operating in standalone mode`
    );
    return false;

    /*
    currentRetries += 1;
    if (currentRetries < maxRetries) {
      console.log(
        `[MasterServer] Retrying in ${registrationRetryTime / 1000}s (${
          currentRetries + 1
        }/${maxRetries})...`
      );
      setTimeout(() => attemptRegistration(), registrationRetryTime);
    } else {
      console.error(
        `[MasterServer] Max registration retries reached. Running in standalone mode.`
      );
      console.log(
        `[MasterServer] ℹ️ The server will continue to operate without master server registration.`
      );
      console.log(
        `[MasterServer] ℹ️ License updates will still work via direct API calls.`
      );
    }

    return false;
    */
  }
};

/**
 * Validate API key with master server
 */
const validateApiKey = async () => {
  try {
    const response = await fetch(`${masterServerUrl}/slave-servers/config`, {
      method: "GET",
      headers: {
        "X-API-Key": slaveServerApiKey,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        serverId = result.data.server_id;
        isRegistered = true;
        console.log("[MasterServer] ✅ API key validated successfully");
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`[MasterServer] API key validation failed: ${error.message}`);
    return false;
  }
};

/**
 * Send ping to master server
 */
const pingMasterServer = async () => {
  if (!isRegistered || !slaveServerApiKey) {
    return;
  }

  try {
    const fingerprint = await generateFingerprint();
    const serverInfo = await getServerInfo();

    const pingData = {
      server_fingerprint: fingerprint,
      status: "active",
      server_info: serverInfo,
    };

    const response = await fetch(`${masterServerUrl}/slave-servers/ping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": slaveServerApiKey,
      },
      body: JSON.stringify(pingData),
    });

    if (response.ok) {
      console.log("[MasterServer] 📡 Ping successful");
      lastPingTime = new Date();
    } else {
      console.warn("[MasterServer] Ping failed, may need re-registration");
    }
  } catch (error) {
    console.error(`[MasterServer] Ping error: ${error.message}`);
  }
};

/**
 * Start ping service to maintain connection with master
 */
const startPingService = () => {
  if (pingIntervalRef) {
    clearInterval(pingIntervalRef);
  }

  pingIntervalRef = setInterval(async () => {
    try {
      await pingMasterServer();
    } catch (error) {
      console.error(`[MasterServer] Ping failed: ${error.message}`);
    }
  }, pingIntervalTime);

  // Send initial ping
  pingMasterServer();
};

/**
 * Sync configuration from master server
 */
const syncConfiguration = async () => {
  if (!isRegistered || !slaveServerApiKey) {
    return null;
  }

  try {
    const response = await fetch(`${masterServerUrl}/slave-servers/config`, {
      method: "GET",
      headers: {
        "X-API-Key": slaveServerApiKey,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log("[MasterServer] 🔄 Configuration synced");
        return result.data.configuration;
      }
    }

    return null;
  } catch (error) {
    console.error(`[MasterServer] Configuration sync failed: ${error.message}`);
    return null;
  }
};

/**
 * Start ongoing services (ping, config sync)
 */
const startServices = async () => {
  console.log("[MasterServer] Starting ongoing services...");

  // Start ping service
  startPingService();

  // Get initial configuration
  await syncConfiguration();
};

/**
 * Initialize the master server connection
 */
const initialize = async () => {
  console.log("[MasterServer] Initializing connection...");

  if (!slaveServerApiKey) {
    console.log("[MasterServer] No API key found, attempting registration...");
    await attemptRegistration();
  } else {
    console.log("[MasterServer] API key found, validating...");
    const isValid = await validateApiKey();

    if (isValid) {
      await startServices();
    } else {
      console.log(
        "[MasterServer] API key invalid, attempting re-registration..."
      );
      await attemptRegistration();
    }
  }
};

/**
 * Check if connected to master server
 */
const isConnectedToMaster = () => {
  return isRegistered && slaveServerApiKey;
};

/**
 * Get master server status
 */
const getMasterServerStatus = () => {
  return {
    connected: isConnectedToMaster(),
    master_url: masterServerUrl,
    server_id: serverId,
    last_ping: lastPingTime,
    registration_retries: currentRetries,
  };
};

/**
 * Shutdown services
 */
const shutdown = () => {
  console.log("[MasterServer] Shutting down services...");

  if (pingIntervalRef) {
    clearInterval(pingIntervalRef);
    pingIntervalRef = null;
  }

  if (registrationRetryIntervalRef) {
    clearInterval(registrationRetryIntervalRef);
    registrationRetryIntervalRef = null;
  }
};

/**
 * Force re-registration
 */
const forceReRegistration = async () => {
  console.log("[MasterServer] Forcing re-registration...");
  isRegistered = false;
  slaveServerApiKey = null;
  serverId = null;
  currentRetries = 0;

  await attemptRegistration();
};

// Create singleton instance for backward compatibility
const masterServerService = {
  initialize,
  getMasterServerStatus,
  syncConfigurationFromMaster: syncConfiguration,
  shutdown,
  forceReRegistration,
  isConnectedToMaster,
};

export default masterServerService;
