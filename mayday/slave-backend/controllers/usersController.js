// controllers/usersController.js
import UserModel from "../models/usersModel.js";
import {
  createPJSIPConfigs,
  PJSIPAor,
  PJSIPAuth,
  PJSIPEndpoint,
} from "../models/pjsipModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/sequelize.js";
import agentStatusService from "../services/agentStatusService.js";
import VoiceExtension from "../models/voiceExtensionModel.js";
import QueueMember from "../models/queueMemberModel.js";
import { deletePjsipUser } from "../services/userService.js";
import amiService from "../services/amiService.js";
import chalk from "chalk";
import amiClient from "../config/ami.js";
import dotenv from "dotenv";
import createLicenseService from "../services/licenseService.js";
import refreshTokenService from "../services/refreshTokenService.js";
import { generateTokenPair } from "../utils/auth.js";

const licenseService = createLicenseService();

// Load env without overriding already set values
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV;
const WS_URI_SECURE = process.env.WS_URI_SECURE;
const STUN_SERVER01 = process.env.STUN_SERVER01;

// Resolve runtime env values reliably (handles PM2 env and .env fallbacks)
const getEnv = (key, fallback = undefined) =>
  typeof process !== "undefined" && process.env && process.env[key]
    ? process.env[key]
    : fallback;
const getAsteriskHost = () =>
  getEnv("ASTERISK_HOST", getEnv("SLAVE_SERVER_DOMAIN", "cs.brhgroup.co"));
export const superUserLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserModel.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Generate access token (8h) and refresh token (7d)
    const { accessToken, refreshToken: refreshTokenJWT } =
      generateTokenPair(user);

    // Generate License Session Token
    const serverLicense =
      await licenseService.getOrCreateDefaultServerLicense();
    const clientFingerprint = req.body.fingerprint || "dashboard-login";
    const licenseSessionToken = await licenseService.generateClientToken(
      serverLicense.id,
      user.id,
      clientFingerprint,
      user.extension
    );

    // Store refresh token in database
    const { token: refreshToken } =
      await refreshTokenService.createRefreshToken(user.id, clientFingerprint);

    res.status(200).json({
      token: accessToken,
      refreshToken: refreshToken,
      licenseSessionToken: licenseSessionToken,
      user,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const registerAgent = async (req, res) => {
  // console.log("ASTERISK_HOST PROCESS env🔥🔥🔥:", process.env);

  const { email, password, isSoftphone, name } = req.body;

  const sqlTransaction = await sequelize.transaction();

  try {
    // If email is not in body but is in req.user (from middleware)
    const userEmail = email || req.user?.email;

    if (!userEmail) {
      throw { status: 400, message: "Email is required" };
    }

    // Fetch user once from SQL
    const user = await UserModel.findOne({
      where: { email: userEmail, disabled: false },
      include: [
        {
          model: PJSIPEndpoint,
          as: "ps_endpoint",
          attributes: [
            "id",
            "transport",
            "auth",
            "aors",
            "context",
            "disallow",
            "allow",
            "direct_media",
            "rewrite_contact",
            "force_rport",
            "rtp_symmetric",
            "ice_support",
            "webrtc",
            "endpoint_type",
            "enabled",
            "active",
          ], // Only include columns that exist in your database
        },
        {
          model: PJSIPAuth,
          as: "ps_auth",
          attributes: ["id", "password", "username", "auth_type"],
        },
        {
          model: PJSIPAor,
          as: "ps_aor",
          attributes: [
            "id",
            "contact",
            "qualify_frequency",
            "max_contacts",
            "remove_existing",
          ],
        },
      ],
      attributes: [
        "id",
        "username",
        "email",
        "password",
        "role",
        "extension",
        "typology",
        "ice_support",
        "rtcp_mux",
      ],
      transaction: sqlTransaction,
    });

    if (!user) {
      throw { status: 401, message: "User not found" };
    }

    // If password was provided, verify it
    if (password && !(await bcrypt.compare(password, user.password))) {
      throw { status: 401, message: "Invalid credentials" };
    }

    if (isSoftphone && user.role !== "agent") {
      throw { status: 403, message: "Only agents can use the softphone" };
    }

    if (!user.extension) {
      user.extension = await UserModel.generateUniqueExtension();
      await user.save({ transaction: sqlTransaction });
    }

    await Promise.all([
      PJSIPEndpoint.upsert(
        {
          id: user.extension,
          transport: "transport-wss",
          webrtc: ["webRTC", "chrome_softphone"].includes(user.typology)
            ? "yes"
            : "no",
          auth: user.extension,
          aors: user.extension,
          outbound_auth: user.extension,
          context: user.context || "from-internal",
          disallow: "all",
          allow: "ulaw,alaw,opus,vp8,vp9,g729",
          endpoint_type: "user",
          direct_media: "no",
          force_rport: "yes",
          rewrite_contact: "yes",
          ice_support: "yes",
          rtcp_mux: "yes",
          dtls_verify: "fingerprint",
          dtls_setup: "actpass",
          dtls_enabled: "yes",
          dtls_auto_generate_cert: "no",
          use_avpf: "yes",
          media_encryption: "sdes",
          media_use_received_transport: "yes",
          identify_by: "auth_username,username",
          rtp_symmetric: "yes",
          send_pai: "no",
          allow_subscribe: "yes",
          timers: "yes",
          timers_min_se: "90",
          timers_sess_expires: "1800",
          // Additional WebSocket-specific settings
          trust_remote_party_id: "no",
          send_remote_party_id_header: "no",
          allow_overlap: "yes",
          notify_early_inuse_ringing: "yes",
          refer_blind_progress: "yes",
        },
        { transaction: sqlTransaction }
      ),
      PJSIPAuth.upsert(
        {
          id: user.extension,
          auth_type: "userpass",
          password: user.ps_auth?.password || password || "defaultPassword",
          username: user.extension,
          realm: getAsteriskHost(),
        },
        { transaction: sqlTransaction }
      ),
      PJSIPAor.upsert(
        {
          id: user.extension,
          contact: "", // Empty contact allows dynamic registration
          max_contacts: 1,
          remove_existing: "yes",
          default_expiration: 600, // Shorter expiration for WebSocket
          qualify_frequency: 60, // Less frequent qualify for WebSocket
          support_path: "yes",
          authenticate_qualify: "yes",
          maximum_expiration: 7200,
          minimum_expiration: 60,
          outbound_proxy: null, // No proxy for WebSocket connections
          rewrite_contact: "yes", // Important for WebSocket connections
          websocket_enabled: "yes", // Enable WebSocket for this AOR
          media_websocket: "yes", // Enable media over WebSocket
        },
        { transaction: sqlTransaction }
      ),
    ]);

    // Get or create default server license
    console.log("Attempting to get or create default server license...");
    const serverLicense =
      await licenseService.getOrCreateDefaultServerLicense();

    // For chrome_softphone agents, ensure WebRTC feature is enabled in license
    if (["webRTC", "chrome_softphone"].includes(user.typology)) {
      console.log(
        `🔧 Configuring WebRTC for ${user.typology} agent: ${user.username}`
      );

      // Ensure license has webrtc_extension feature
      let features = serverLicense.features || {};
      if (typeof features === "string") {
        try {
          features = JSON.parse(features);
        } catch (error) {
          features = {};
        }
      }

      // Enable WebRTC extension feature if not already enabled
      if (!features.webrtc_extension) {
        features.webrtc_extension = true;
        console.log(
          `✅ Enabled webrtc_extension feature for license: ${serverLicense.organization_name}`
        );

        // Update license features (this will be synced to master)
        await licenseService.updateLicenseFeatures(serverLicense.id, features);
      }

      // Set reasonable WebRTC allocation if not set
      if (
        !serverLicense.webrtc_max_users ||
        serverLicense.webrtc_max_users === 0
      ) {
        // Default to 25% of max users or 2, whichever is larger, but not more than max_users
        const webrtcAllocation = Math.min(
          Math.max(2, Math.floor(serverLicense.max_users * 0.25)),
          serverLicense.max_users || 2
        );
        await licenseService.updateWebRTCAllocation(
          serverLicense.id,
          webrtcAllocation
        );
        console.log(
          `✅ Set WebRTC allocation to ${webrtcAllocation} users for license: ${serverLicense.organization_name}`
        );
      }
    }

    // Generate tokens concurrently
    // console.log("Generating SIP and License session tokens...");
    const { accessToken: sipToken, refreshToken: refreshTokenJWT } =
      generateTokenPair({
        id: user.id,
        username: user.username,
        role: user.role,
        extension: user.extension,
      });

    const [licenseSessionToken, refreshTokenData] = await Promise.all([
      licenseService.generateClientToken(
        serverLicense.id,
        user.id,
        req.body.fingerprint || "softphone-login",
        user.extension
      ),
      refreshTokenService.createRefreshToken(
        user.id,
        req.body.fingerprint || "softphone-login"
      ),
    ]);
    console.log("✅ SIP Token generated.");
    console.log("✅ License Session Token generated:", licenseSessionToken);
    console.log("✅ Refresh Token generated.");

    await Promise.all([sqlTransaction.commit()]);

    const responsePayload = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          extension: user.extension,
          typology: user.typology,
          wss_port: user.wss_port || 8089,
          phoneBarChromeExtensionHost: user.phoneBarChromeExtensionHost,
          pjsip: {
            type: user.ps_endpoint?.type,
            extension: user.extension,
            password: password || user.extension, // Use original password for SIP auth
            server: getAsteriskHost(),
            transport: ["webRTC", "chrome_softphone"].includes(user.typology)
              ? "wss"
              : "udp",
            wsPort: "8089", // Use port 8089 consistently for WebSocket connections
            rtp_symmetric: user.ps_endpoint?.rtp_symmetric === "yes" || true,
            media_use_received_transport:
              user.ps_endpoint?.mediaUseReceivedTransport === "yes" ||
              user.ps_endpoint?.media_use_received_transport === "yes" ||
              true,
            rewrite_contact:
              user.ps_endpoint?.rewrite_contact === "yes" || true,
            force_rport: user.ps_endpoint?.force_rport === "yes" || true,
            dtls_enabled: user.dtlsenable === "yes" || true,
            ice_support:
              user.ice_support === "yes" ||
              user.ps_endpoint?.ice_support === "yes" ||
              true,
            rtcp_mux:
              user.rtcp_mux === "yes" ||
              user.ps_endpoint?.rtcpMux === "yes" ||
              true,
            avpf:
              user.avpf === "yes" ||
              user.ps_endpoint?.useAvpf === "yes" ||
              true,
            dtls_setup:
              user.dtls_setup || user.ps_endpoint?.dtlsSetup || "actpass",
            dtls_verify:
              user.dtlsverify === "yes" ||
              user.ps_endpoint?.dtlsVerify === "yes" ||
              "fingerprint",
            media_encryption: user.ps_endpoint?.mediaEncryption || "sdes",
            force_avp:
              user.force_avp === "yes" ||
              user.ps_endpoint?.forceAvp === "yes" ||
              false,
            webrtc: ["webRTC", "chrome_softphone"].includes(user.typology),
            // WebSocket server configuration
            ws_servers: [
              {
                uri: `wss://${getAsteriskHost()}:8089/ws`,
                sip_transport: "wss",
                protocols: ["sip"],
              },
            ],
            ice_servers: [
              { urls: STUN_SERVER01 || "stun:stun.l.google.com:19302" },
              ...(process.env.TURN_SERVER
                ? [
                    {
                      urls: process.env.TURN_SERVER,
                      username: process.env.TURN_USERNAME || "webrtc",
                      credential: process.env.TURN_PASSWORD || "webrtc123",
                    },
                  ]
                : []),
            ],
          },
        },
        tokens: {
          sip: `Bearer ${sipToken}`,
          refreshToken: refreshTokenData.token,
          license: licenseSessionToken,
        },
      },
    };

    console.log(
      "Sending response payload to client:",
      JSON.stringify(responsePayload, null, 2)
    );

    return res.json(responsePayload);
  } catch (error) {
    await Promise.all([sqlTransaction.rollback()]);
    console.error("❌ Register Agent Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

export const agentLogout = async (req, res) => {
  const { extension, refreshToken } = req.body;
  try {
    // Update agent status
    await UserModel.update(
      { sipRegistered: false, online: false },
      { where: { extension } }
    );

    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        await refreshTokenService.revokeRefreshToken(refreshToken);
        console.log(
          `✅ [UsersController] Revoked refresh token for extension ${extension}`
        );
      } catch (error) {
        console.error("[UsersController] Error revoking refresh token:", error);
        // Continue with logout even if token revocation fails
      }
    }

    // Optionally, revoke all user tokens for the extension
    // Find user by extension and revoke all their tokens
    const user = await UserModel.findOne({ where: { extension } });
    if (user) {
      try {
        const revokedCount = await refreshTokenService.revokeAllUserTokens(
          user.id
        );
        console.log(
          `✅ [UsersController] Revoked ${revokedCount} tokens for user ${user.id}`
        );
      } catch (error) {
        console.error(
          "[UsersController] Error revoking all user tokens:",
          error
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Agent ${extension} logged out successfully.`,
    });
  } catch (err) {
    console.error("[UsersController] Error during agent logout:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const createPJSIPUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const requiredFields = ["username", "password", "email", "fullName"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      throw {
        status: 400,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      };
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const extension = await UserModel.generateUniqueExtension();

    const user = await UserModel.create(
      {
        ...req.body,
        password: hashedPassword,
        extension,
        role: req.body.role || "agent",
        type: "friend",
        // context: "from-internal",
      },
      { transaction }
    );

    const pjsipConfigs = await createPJSIPConfigs(
      extension,
      req.body.password,
      user.id,
      transaction,
      {
        isWebRTC: true,
        maxContacts: req.body.maxContacts || 1,
        endpoint: {
          transport: "transport-wss",
          webrtc: "yes",
          dtls_auto_generate_cert: "no",

          direct_media: "no",
          force_rport: "yes",
          ice_support: "yes",
          rtcp_mux: "yes",
          context: "from-internal",
          // context: "from-sip",
          disallow: "all",
          allow: "ulaw,alaw",
          dtls_verify: "fingerprint",
          dtls_setup: "actpass",
          use_avpf: "yes",
          media_encryption: "sdes", // ✅ Use SDES for WebRTC
          media_use_received_transport: "yes",
          identify_by: "auth_username,username",
          endpoint_type: "user",
        },
      }
    );

    // ✅ Step 3: Create `voice_extensions` Entry
    await VoiceExtension.bulkCreate(
      [
        // ✅ 1️⃣ Set Caller ID
        {
          context: "from-internal",
          extension: extension,
          priority: 1,
          app: "Set",
          appdata: `CALLERID(num)=${extension}`, // ✅ Set Caller ID
          type: "system",
        },
        // ✅ 2️⃣ Set Channel Language
        {
          context: "from-internal",
          extension: extension,
          priority: 2,
          app: "Set",
          appdata: `CHANNEL(language)=en`, // ✅ Set Language
          type: "system",
        },
        // ✅ 3️⃣ Set CDR Account Code (for billing, tracking, and logs)
        {
          context: "from-internal",
          extension: extension,
          priority: 3,
          app: "Set",
          appdata: `CDR(accountcode)=agent-${extension}`, // ✅ Useful for tracking
          type: "system",
        },
        // ✅ 4️⃣ Set Call Timeout
        {
          context: "from-internal",
          extension: extension,
          priority: 4,
          app: "Set",
          appdata: `CALL_TIMEOUT=15`, // ✅ Call timeout before redirecting
          type: "system",
        },
        // ✅ 5️⃣ Set Dial Command
        {
          context: "from-internal",
          extension: extension,
          priority: 5,
          app: "Dial",
          appdata: `PJSIP/${extension},15,TtG(from-sip^hangup-${extension}^1)`, // ✅ 15 seconds ring time, with transfer options
        },
        // ✅ 6️⃣ Set Hangup Command
        {
          context: "from-internal",
          extension: extension,
          priority: 6,
          app: "Hangup",
          appdata: "",
          type: "system",
        },
        // ✅ 7️⃣ Handle Call Hangup (if needed for IVR or CDR tracking)
        {
          context: "from-internal",
          extension: `hangup-${extension}`,
          priority: 1,
          app: "NoOp",
          appdata: `Call ended for ${extension}`,
          type: "system",
        },
        {
          context: "from-internal",
          extension: `hangup-${extension}`,
          priority: 2,
          app: "Hangup",
          appdata: "",
          type: "system",
        },
      ],
      { transaction }
    );

    // ✅ Step 4: Reload Asterisk Dialplan
    // await amiService.executeAction({
    //   Action: "Command",
    //   Command: "dialplan reload",
    // });

    await transaction.commit();

    // ✅ Dialplan Reload is Asynchronous (Non-blocking)
    setTimeout(async () => {
      try {
        const reloadResponse = await amiService.executeAction({
          Action: "Command",
          Command: "dialplan reload",
        });
        console.log("✅ Dialplan Reloaded Successfully:", reloadResponse);
      } catch (err) {
        console.error("❌ Failed to reload dialplan:", err);
      }
    }, 2000); // Allow DB commit to complete before AMI request

    // Trigger agent-status service to refresh its in-memory list (non-blocking)
    try {
      setImmediate(() => agentStatusService.refreshAgents());
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: "Agent created successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          extension: user.extension,
          role: user.role,
        },
        pjsip: pjsipConfigs,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating agent:", error);
    // Normalize Sequelize/MySQL errors into friendly, actionable responses
    const isDev = NODE_ENV === "development";
    const errName = error?.name || "";
    const sqlMsg =
      error?.original?.sqlMessage ||
      error?.parent?.sqlMessage ||
      error?.message ||
      "";

    let statusCode = error.status || 500;
    let message = error.message || "Failed to create agent";
    let field = null;
    let code = null;

    // Duplicate entry (unique constraint)
    if (
      /SequelizeUniqueConstraintError/i.test(errName) ||
      /ER_DUP_ENTRY/i.test(error?.original?.code || "") ||
      /Duplicate entry/i.test(sqlMsg)
    ) {
      statusCode = 409;
      code = "DUPLICATE";
      const lower = sqlMsg.toLowerCase();
      if (lower.includes("email") || lower.includes("ux_users_email")) {
        field = "email";
        message = "Email already exists. Use a different email.";
      } else if (
        lower.includes("username") ||
        lower.includes("ux_users_username")
      ) {
        field = "username";
        message = "Username already exists. Choose another username.";
      } else if (lower.includes("extension") || lower.includes("internal")) {
        field = "extension";
        message = "Internal number already in use. Try a different one.";
      } else {
        message = "Duplicate value for a unique field.";
      }
    }

    // Validation errors
    if (/SequelizeValidationError/i.test(errName)) {
      statusCode = 400;
      code = code || "VALIDATION";
      const first = Array.isArray(error?.errors) ? error.errors[0] : null;
      if (first?.message) message = first.message;
      if (first?.path) field = first.path;
      // Reasonable fallback
      if (!message) message = "Invalid data provided.";
    }

    res.status(statusCode).json({
      success: false,
      message,
      field,
      code,
      error: isDev ? sqlMsg : undefined,
    });
  }
};

export const getAgentDetailsByExtension = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await UserModel.findOne({ where: { id: id } });
    if (!user) return res.status(404).json({ error: "Agent not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.findAll({
      // Exclude admin user
      where: {
        role: {
          [Op.ne]: "admin",
        },
      },
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAgentDetails = async (req, res) => {
  const { id } = req.params; // This is the user UUID in our routes
  const transaction = await sequelize.transaction();

  try {
    const user = await UserModel.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { userData = {}, pjsipData = {} } = req.body || {};

    // Update core user fields
    if (userData && Object.keys(userData).length > 0) {
      await UserModel.update(userData, { where: { id }, transaction });
    }

    // Prepare PJSIP endpoint updates if provided
    if (pjsipData && Object.keys(pjsipData).length > 0 && user.extension) {
      // Normalize booleans to 'yes'/'no' where Asterisk expects strings
      const yn = (v) =>
        v === true || v === "yes"
          ? "yes"
          : v === false || v === "no"
          ? "no"
          : v;

      const endpointUpdates = {
        transport: pjsipData.transport,
        nat: Array.isArray(pjsipData.nat)
          ? pjsipData.nat.join(",")
          : pjsipData.nat,
        allow: Array.isArray(pjsipData.allow)
          ? pjsipData.allow.join(",")
          : pjsipData.allow,
        direct_media: pjsipData.direct_media,
        force_rport: yn(pjsipData.force_rport),
        rewrite_contact: yn(pjsipData.rewrite_contact),
        ice_support: yn(pjsipData.ice_support),
        rtcp_mux: yn(pjsipData.rtcp_mux),
        dtls_verify: pjsipData.dtls_verify,
        dtls_setup: pjsipData.dtls_setup,
        use_avpf: yn(pjsipData.use_avpf || pjsipData.avpf),
        force_avp: yn(pjsipData.force_avp),
        media_encryption: pjsipData.media_encryption,
        media_use_received_transport: yn(
          pjsipData.media_use_received_transport
        ),
        webrtc: yn(pjsipData.webrtc),
      };

      // Remove undefined values to avoid overwriting with nulls
      Object.keys(endpointUpdates).forEach(
        (k) => endpointUpdates[k] === undefined && delete endpointUpdates[k]
      );

      await PJSIPEndpoint.update(endpointUpdates, {
        where: { id: user.extension },
        transaction,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `Agent ${user.username} updated`,
      data: { userId: id, extension: user.extension },
    });
  } catch (err) {
    await transaction.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const resetAgentPassword = async (req, res) => {
  const { id } = req.params; // Agent UUID
  const { newPassword } = req.body;
  const transaction = await sequelize.transaction();

  try {
    // Validate input
    if (!newPassword || newPassword.length < 6) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find the user
    const user = await UserModel.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password in UserModel
    await UserModel.update(
      { password: hashedPassword },
      { where: { id }, transaction }
    );

    // Update SIP password in PJSIPAuth if extension exists
    // NOTE: Asterisk realtime expects plain text passwords for SIP authentication
    // Asterisk handles its own authentication and hashing internally
    if (user.extension) {
      await PJSIPAuth.update(
        { password: newPassword },
        { where: { id: user.extension }, transaction }
      );
    }

    await transaction.commit();

    console.log(
      `Password reset successfully for user ${user.username} (${user.email})`
    );

    return res.status(200).json({
      success: true,
      message: `Password reset successfully for ${user.username}`,
      data: { userId: id, username: user.username },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error resetting password:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: err.message,
    });
  }
};

export const deleteAgent = async (req, res) => {
  const { id } = req.params;
  console.log("🔴 Deleting Agent ID:", id);

  const transaction = await sequelize.transaction();

  try {
    const user = await UserModel.findOne({
      where: { id, role: { [Op.in]: ["agent", "user"] } },
      transaction,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Agent not found or user is not an agent",
      });
    }

    const extension = user.extension;

    // ✅ 1. Get Agent's Assigned Queues
    const assignedQueues = await QueueMember.findAll({
      where: { interface: `PJSIP/${extension}` },
      attributes: ["queue_name"], // Get only queue names
      raw: true,
      transaction,
    });

    // ✅ 2. Remove Agent from DB Queues First

    await QueueMember.destroy({
      where: { interface: `PJSIP/${extension}` },
      transaction,
    });

    // ✅ 3. Remove PJSIP User from Database
    await deletePjsipUser(id, transaction);

    // ✅ 4. Commit Transaction First (before AMI)
    await transaction.commit();
    console.log(
      "✅ Database transaction committed. Now executing AMI actions..."
    );

    // ✅ 5. Run AMI Actions Separately (Non-blocking) // Dynamically
    setTimeout(async () => {
      try {
        console.log("⚡ Executing AMI Queue Removal...");

        // Verify AMI connection is active before proceeding
        if (!amiClient.isConnected()) {
          console.log(
            chalk.yellow(
              "[Delete Agent] AMI not connected, attempting to reconnect..."
            )
          );
          try {
            await amiClient.connect();
            console.log(
              chalk.green("[Delete Agent] AMI reconnected successfully")
            );
          } catch (reconnectError) {
            console.error(
              chalk.red("[Delete Agent] Failed to reconnect to AMI:"),
              reconnectError
            );
            // Continue with operation as amiService.executeAction will attempt reconnection again
          }
        }

        if (assignedQueues.length > 0) {
          // Remove from all assigned queues
          await Promise.all(
            assignedQueues.map(async (queue) => {
              try {
                return await amiService.executeAction({
                  Action: "QueueRemove",
                  Queue: queue.queue_name,
                  Interface: `PJSIP/${extension}`,
                });
              } catch (queueError) {
                console.error(
                  `❌ Failed to remove from queue ${queue.queue_name}:`,
                  queueError.message
                );
                return null; // Continue with other queues
              }
            })
          );
        }

        console.log("✅ Queue Member Removed from AMI.");

        // ✅ 5. Final Queue Reload (Only if QueueRemove is successful)
        try {
          await amiService.executeAction({
            Action: "Command",
            Command: "queue reload all",
          });
          console.log("✅ Queue Reloaded Successfully.");
        } catch (reloadError) {
          console.error("❌ Failed to reload queue:", reloadError.message);
        }
      } catch (amiError) {
        console.error("❌ AMI Error Removing Queue Member:", amiError.message);
      }
    }, 2000); // Delay ensures DB changes are reflected before AMI execution.

    res.json({
      success: true,
      message: `Agent ${extension} deleted successfully.`,
      data: { userId: id, extension },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Delete Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete agent",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserModel.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Agent pause/unpause functionality
export const pauseAgent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pauseReason = "Manual Pause" } = req.body;

    console.log(
      `[UsersController] Pausing agent ${userId} with reason: ${pauseReason}`
    );

    // Get user details
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.extension) {
      return res.status(400).json({
        success: false,
        message: "User has no extension assigned",
      });
    }

    // Get all queues the agent is a member of
    const queueMembers = await QueueMember.findAll({
      where: {
        interface: `PJSIP/${user.extension}`,
      },
    });

    console.log(
      `[UsersController] Found ${queueMembers.length} queue memberships for extension ${user.extension}`
    );

    // Pause agent in all queues using AMI
    const pausePromises = queueMembers.map(async (member) => {
      try {
        console.log(
          `[UsersController] Pausing ${user.extension} in queue ${member.queue_name}`
        );

        const result = await amiService.executeAMIAction({
          Action: "QueuePause",
          Interface: `PJSIP/${user.extension}`,
          Queue: member.queue_name,
          Paused: "true",
          Reason: pauseReason,
        });

        console.log(
          `[UsersController] Pause result for queue ${member.queue_name}:`,
          result
        );

        // Update database record
        await QueueMember.update(
          { paused: true },
          {
            where: {
              interface: `PJSIP/${user.extension}`,
              queue_name: member.queue_name,
            },
          }
        );

        return { queue: member.queue_name, success: true };
      } catch (error) {
        console.error(
          `[UsersController] Error pausing ${user.extension} in queue ${member.queue_name}:`,
          error
        );
        return {
          queue: member.queue_name,
          success: false,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(pausePromises);
    const successCount = results.filter((r) => r.success).length;

    // Update user pause status in database
    await UserModel.update(
      {
        pauseType: pauseReason,
        // We could add a paused boolean field if needed
      },
      { where: { id: userId } }
    );

    console.log(
      `[UsersController] Pause operation completed: ${successCount}/${queueMembers.length} queues`
    );

    res.json({
      success: true,
      message: `Agent paused in ${successCount} out of ${queueMembers.length} queues`,
      data: {
        extension: user.extension,
        pauseReason: pauseReason,
        queueResults: results,
        successCount,
        totalQueues: queueMembers.length,
      },
    });
  } catch (error) {
    console.error("[UsersController] Error pausing agent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to pause agent",
      error: error.message,
    });
  }
};

export const unpauseAgent = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[UsersController] Unpausing agent ${userId}`);

    // Get user details
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.extension) {
      return res.status(400).json({
        success: false,
        message: "User has no extension assigned",
      });
    }

    // Get all queues the agent is a member of
    const queueMembers = await QueueMember.findAll({
      where: {
        interface: `PJSIP/${user.extension}`,
      },
    });

    console.log(
      `[UsersController] Found ${queueMembers.length} queue memberships for extension ${user.extension}`
    );

    // Unpause agent in all queues using AMI
    const unpausePromises = queueMembers.map(async (member) => {
      try {
        console.log(
          `[UsersController] Unpausing ${user.extension} in queue ${member.queue_name}`
        );

        const result = await amiService.executeAMIAction({
          Action: "QueuePause",
          Interface: `PJSIP/${user.extension}`,
          Queue: member.queue_name,
          Paused: "false",
        });

        console.log(
          `[UsersController] Unpause result for queue ${member.queue_name}:`,
          result
        );

        // Update database record
        await QueueMember.update(
          { paused: false },
          {
            where: {
              interface: `PJSIP/${user.extension}`,
              queue_name: member.queue_name,
            },
          }
        );

        return { queue: member.queue_name, success: true };
      } catch (error) {
        console.error(
          `[UsersController] Error unpausing ${user.extension} in queue ${member.queue_name}:`,
          error
        );
        return {
          queue: member.queue_name,
          success: false,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(unpausePromises);
    const successCount = results.filter((r) => r.success).length;

    // Update user pause status in database
    await UserModel.update(
      {
        pauseType: null, // Clear pause reason
      },
      { where: { id: userId } }
    );

    console.log(
      `[UsersController] Unpause operation completed: ${successCount}/${queueMembers.length} queues`
    );

    res.json({
      success: true,
      message: `Agent unpaused in ${successCount} out of ${queueMembers.length} queues`,
      data: {
        extension: user.extension,
        queueResults: results,
        successCount,
        totalQueues: queueMembers.length,
      },
    });
  } catch (error) {
    console.error("[UsersController] Error unpausing agent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpause agent",
      error: error.message,
    });
  }
};

export const getAgentPauseStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const user = await UserModel.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.extension) {
      return res.status(400).json({
        success: false,
        message: "User has no extension assigned",
      });
    }

    // Get queue member status
    const queueMembers = await QueueMember.findAll({
      where: {
        interface: `PJSIP/${user.extension}`,
      },
      attributes: ["queue_name", "paused"],
    });

    const isPaused =
      queueMembers.length > 0 && queueMembers.every((member) => member.paused);
    const pausedQueues = queueMembers
      .filter((member) => member.paused)
      .map((member) => member.queue_name);
    const unpausedQueues = queueMembers
      .filter((member) => !member.paused)
      .map((member) => member.queue_name);

    res.json({
      success: true,
      data: {
        extension: user.extension,
        isPaused,
        pauseReason: user.pauseType,
        totalQueues: queueMembers.length,
        pausedQueues,
        unpausedQueues,
      },
    });
  } catch (error) {
    console.error("[UsersController] Error getting agent pause status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get agent pause status",
      error: error.message,
    });
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    // Validate refresh token
    const validation = await refreshTokenService.validateRefreshToken(
      refreshToken
    );

    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        error: validation.error || "Invalid or expired refresh token",
        requiresReLogin: true,
      });
    }

    // Get user from database
    const user = await UserModel.findOne({
      where: { id: validation.userId },
      attributes: ["id", "username", "role", "extension", "email"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        requiresReLogin: true,
      });
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshTokenJWT } =
      generateTokenPair(user);

    // Optional: Rotate refresh token (create new one and revoke old)
    const clientFingerprint =
      req.body.fingerprint || req.get("User-Agent") || "unknown";
    const newRefreshToken = await refreshTokenService.rotateRefreshToken(
      refreshToken,
      clientFingerprint
    );

    console.log(
      `✅ [UsersController] Refreshed tokens for user ${user.username}`
    );

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken.token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        extension: user.extension,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[UsersController] Error refreshing access token:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to refresh token",
    });
  }
};
