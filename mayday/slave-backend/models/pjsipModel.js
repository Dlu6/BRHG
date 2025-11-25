// models/pjsipModel.js
import sequelizePkg from "sequelize";
import sequelize from "../config/sequelize.js";
import UserModel from "./usersModel.js";

const { DataTypes, Op } = sequelizePkg;

// Common PJSIP data types
const PJSIP_STRING = (length = 40) => ({
  type: DataTypes.STRING(length),
  allowNull: true,
});

const PJSIP_BOOL = {
  type: DataTypes.ENUM("yes", "no"),
  defaultValue: "no",
  allowNull: true,
};

// Export all necessary items
export { sequelize, Op, PJSIP_STRING, PJSIP_BOOL };

export const PJSIPEndpoint = sequelize.define(
  "ps_endpoints",
  {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
    },
    trunk_id: {
      type: DataTypes.STRING(40),
      unique: true,
      allowNull: true,
      comment: "Unique identifier for trunk endpoints",
    },
    transport: {
      type: DataTypes.STRING(40),
      defaultValue: "transport-udp",
      allowNull: false,
      comment: "Transport configuration name (e.g., transport-udp)",
    },
    aors: {
      type: DataTypes.STRING(200),
      allowNull: true,
      references: {
        model: "ps_aors",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    // Identity headers
    send_pai: PJSIP_BOOL, // P-Asserted-Identity
    direct_media: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    auth: {
      type: DataTypes.STRING(40),
      allowNull: true,
      references: {
        model: "ps_auths",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    context: { type: DataTypes.STRING(40), allowNull: false },
    disallow: { type: DataTypes.STRING(255), defaultValue: "all" }, // Disables all codecs before allowing specific ones.
    allow: { type: DataTypes.STRING(255), defaultValue: "ulaw" }, // Enables ulaw and alaw codecs for audio.
    //Default to yes
    rewrite_contact: {
      type: DataTypes.ENUM("yes", "no"), // Allows Asterisk to update contact info dynamically.
      defaultValue: "yes",
      allowNull: false,
    },
    force_rport: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
    },
    directMedia: PJSIP_BOOL,
    connectedLineMethod: {
      ...PJSIP_STRING(),
      defaultValue: "invite",
      comment:
        "Method used for connected line updates (invite, notify, update)",
    },
    direct_media_method: {
      ...PJSIP_STRING(),
      defaultValue: "invite",
      comment: "Method used to switch to direct media mode",
    },
    forceRport: PJSIP_BOOL,
    ice_support: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
      comment:
        "Enable support for ICE (Interactive Connectivity Establishment)",
    },
    identifyBy: PJSIP_STRING(),
    mailboxes: {
      type: DataTypes.STRING(40),
      allowNull: true,
      defaultValue: null,
    },
    mohSuggest: PJSIP_STRING(),
    outbound_auth: PJSIP_STRING(),
    outbound_proxy: PJSIP_STRING(),
    rewriteContact: PJSIP_BOOL,
    // rtpSymmetric: PJSIP_BOOL,
    rtp_symmetric: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
    },
    dtlsVerify: PJSIP_BOOL,
    dtlsCertFile: PJSIP_STRING(),
    dtlsPrivateKey: PJSIP_STRING(),
    dtlsCipher: PJSIP_STRING(),
    dtlsCaFile: PJSIP_STRING(),
    dtlsCaPath: PJSIP_STRING(),
    dtlsSetup: {
      type: DataTypes.ENUM("active", "passive", "actpass"),
      defaultValue: "actpass",
      allowNull: true,
    },
    dtlsFingerprint: PJSIP_STRING(),
    srtpTag32: PJSIP_BOOL,
    mediaEncryption: PJSIP_STRING(),
    useAvpf: PJSIP_BOOL,
    forceAvp: PJSIP_BOOL,
    mediaUseReceivedTransport: PJSIP_BOOL,
    mediaEncryptionOptimistic: PJSIP_BOOL,
    rtcpMux: PJSIP_BOOL,
    allowOverlap: PJSIP_BOOL,
    referBlindProgress: PJSIP_BOOL,
    notifyEarlyInuseRinging: PJSIP_BOOL,
    maxAudioStreams: DataTypes.INTEGER,
    maxVideoStreams: DataTypes.INTEGER,
    bundle: PJSIP_BOOL,
    webrtc: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
      field: "webrtc", // Explicitly specify the field name
    },
    dtlsAutoGenerateCert: PJSIP_BOOL,
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    endpoint_type: {
      type: DataTypes.ENUM("user", "trunk"),
      allowNull: false,
      defaultValue: "user",
      comment: "Specifies whether this endpoint is a user or trunk",
    },

    enabled: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      allowNull: false,
    },
    active: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    from_user: PJSIP_STRING(),
    from_domain: PJSIP_STRING(),
    // registry: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    //   comment: "Registry string in format defaultuser:password@host",
    // },
    call_counter: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
    },
    phone_url: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    trust_remote_party_id: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    send_remote_party_id_header: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    encryption: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    // Add default port
    // port: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: 5060,
    //   allowNull: false,
    // },
    t38pt_udptl: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    video_support: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: false,
    },
    // Balance-related fields for trunk accounts
    account_number: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: "Provider account number for balance checking",
    },
    phone_number: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: "SIP trunk phone number",
    },
    current_balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Current account balance",
    },
    balance_currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "USHS",
      comment: "Currency for balance",
    },
    balance_last_updated: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time balance was updated",
    },
    balance_error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Error message from last balance check",
    },
  },
  {
    tableName: "ps_endpoints",
    timestamps: false,
    underscored: true,
  }
);

export const PJSIPAuth = sequelize.define(
  "ps_auths",
  {
    id: {
      type: DataTypes.STRING(40),
      primaryKey: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    realm: PJSIP_STRING(40),
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    auth_type: {
      type: DataTypes.ENUM("userpass", "md5", "google_oauth"),
      allowNull: false,
      defaultValue: "userpass",
    },
  },
  {
    tableName: "ps_auths",
    timestamps: false,
    underscored: true,
  }
);

export const PJSIPAor = sequelize.define(
  "ps_aors",
  {
    id: {
      type: DataTypes.STRING(40),
      primaryKey: true,
    },
    contact: PJSIP_STRING(255),

    qualify_frequency: {
      type: DataTypes.INTEGER,
      defaultValue: 30, // 30 seconds Enables Asterisk to send periodic SIP OPTIONS to check the device's availability.
    },
    support_path: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
    },
    default_expiration: {
      type: DataTypes.INTEGER,
      defaultValue: 3600,
    },
    remove_existing: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
    },
    max_contacts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    // CRITICAL: Missing fields required by Asterisk 20
    minimum_expiration: {
      type: DataTypes.INTEGER,
      defaultValue: 60, // 1 minute minimum
      allowNull: false,
    },
    maximum_expiration: {
      type: DataTypes.INTEGER,
      defaultValue: 7200, // 2 hours maximum
      allowNull: false,
    },
    authenticate_qualify: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
    },
    outbound_proxy: PJSIP_STRING(255),
    rewrite_contact: {
      type: DataTypes.STRING(10),
      defaultValue: "yes",
      allowNull: true,
    },
    // WebSocket-specific AOR settings
    websocket_enabled: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
    },
    media_websocket: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: false,
    },
  },
  {
    tableName: "ps_aors",
    timestamps: false,
  }
);

export const PJSIPContact = sequelize.define(
  "ps_contacts",
  {
    id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
    },
    uri: {
      type: DataTypes.STRING(511),
      allowNull: true,
    },
    expiration_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualify_frequency: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualify_timeout: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    qualify_2xx_only: {
      type: DataTypes.ENUM("0", "1", "off", "on", "false", "true", "no", "yes"),
      allowNull: true,
      comment: "Consider 2xx responses to qualify as successful",
    },
    prune_on_boot: {
      type: DataTypes.ENUM("0", "1", "off", "on", "false", "true", "no", "yes"),
      allowNull: true,
      comment: "Prune this contact on Asterisk boot",
    },
    authenticate_qualify: {
      type: DataTypes.ENUM("0", "1", "off", "on", "false", "true", "no", "yes"),
      allowNull: true,
    },
    outbound_proxy: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    via_addr: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    via_port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    call_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reg_server: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "ps_contacts",
    timestamps: false,
  }
);

// Removed legacy model that used non-standard "ip_match"; use PJSIPEndpointIdentifier below (with standard "match")

export const PJSIPTransport = sequelize.define(
  "ps_transports",
  {
    id: {
      type: DataTypes.STRING(40),
      primaryKey: true,
      allowNull: false,
    },
    async_operations: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    bind: {
      ...PJSIP_STRING(),
      defaultValue: "0.0.0.0:5060",
      comment: "Network interface and port to bind to",
    },
    protocol: {
      type: DataTypes.ENUM("udp", "tcp", "ws", "wss", "tls"),
      allowNull: false,
      defaultValue: "udp",
      comment: "Transport protocol (udp, tcp, ws, wss, tls)",
      protocols: ["sip"],
    },
    ca_list_file: DataTypes.STRING(255),
    cert_file: DataTypes.STRING(255),
    cipher: DataTypes.STRING(255),
    domain: DataTypes.STRING(255),
    external_media_address: PJSIP_STRING(),
    external_signaling_address: PJSIP_STRING(),
    method: {
      ...PJSIP_STRING(),
      defaultValue: "unspecified",
      comment: "Method for choosing outbound transport",
    },
    local_net: PJSIP_STRING(),
    password: PJSIP_STRING(),
    priv_key_file: DataTypes.STRING(255),
    require_client_cert: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
      comment: "Require client certificate for TLS connections",
    },
    verify_client: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
      comment: "Verify client certificate if provided",
    },
    verify_server: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
      comment: "Verify server certificate (for WSS/TLS)",
    },
    tos: {
      type: DataTypes.STRING(10),
      defaultValue: "0",
      comment: "Type of Service for QoS",
    },
    cos: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Class of Service for QoS",
    },
    allow_reload: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "yes",
      allowNull: true,
      comment: "Allow transport reload via AMI/CLI",
    },
    symmetric_transport: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
      comment: "Use same transport for requests as received responses",
    },
    websocket_write_timeout: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      comment: "WebSocket write timeout in milliseconds",
    },
    websocket_ping_interval: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: "WebSocket ping interval in seconds",
    },
    websocket_protocol: {
      type: DataTypes.STRING(40),
      allowNull: true,
      defaultValue: "sip",
      comment: "WebSocket subprotocol for WebSocket transports (ws/wss)",
    },
  },
  {
    tableName: "ps_transports",
    timestamps: false,
    underscored: true,
  }
);

// Create SIP Registration URI
export const createSIPRegistrationURI = (email, domain) => ({
  // This will be used by the client
  registrationUri: `sip:${email}@${domain}`,
  // This gets mapped internally to the extension
  internalUri: async () => {
    const user = await UserModel.findExtensionByEmail(email);
    return `sip:${user.extension}@${domain}`;
  },
});

// Create SIP Registration URI
export const PJSIPEndpointIdentifier = sequelize.define(
  "ps_endpoint_id_ips",
  {
    id: {
      type: DataTypes.STRING(40),
      primaryKey: true,
    },
    endpoint: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    match: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    srv_lookups: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
    },
    match_header: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    match_request_uri: {
      type: DataTypes.ENUM("yes", "no"),
      defaultValue: "no",
      allowNull: true,
    },
  },
  {
    tableName: "ps_endpoint_id_ips",
    timestamps: false,
    underscored: true,
  }
);

// Utility function to generate PJSIP configuration
export const generatePJSIPConfig = (
  extension,
  password,
  email,
  options = {}
) => {
  const { isWebRTC = false, maxContacts = 1 } = options;

  // Base endpoint config
  const endpointConfig = {
    id: extension,
    identify_by: "auth_username,username",
    // identify_by: "auth_username,username,ip",
    transport: "transport-wss",
    aors: extension,
    auth: extension,
    context: "from-internal",
    disallow: "all",
    allow: "ulaw,alaw,opus",
    direct_media: "no",
    force_rport: "yes",
    rewrite_contact: "yes",
    rtp_symmetric: "yes",
    dtls_verify: "no",
    dtls_setup: "actpass",
    media_encryption: "dtls",
    ice_support: "yes",
    use_avpf: "yes",
    force_avp: "no",
    media_use_received_transport: "yes",
    rtcp_mux: "yes",
    bundle: "yes",
    webrtc: "yes",
    outbound_auth: extension,
    dtls_cert_file: "/etc/letsencrypt/live/cs.brhgroup.co/fullchain.pem",
    dtls_private_key: "/etc/letsencrypt/live/cs.brhgroup.co/privkey.pem",
    dtls_auto_generate_cert: "no",
  };

  // WebRTC-specific overrides
  if (isWebRTC) {
    Object.assign(endpointConfig, {
      dtls_verify: "fingerprint",
      media_encryption: "dtls",
      ice_support: "yes",
      use_avpf: "yes",
      media_use_received_transport: "yes",
      rtcp_mux: "yes",
      bundle: "yes",
      webrtc: "yes",
      dtls_auto_generate_cert: "no",
      tls_cert_file: "/etc/letsencrypt/live/cs.brhgroup.co/fullchain.pem",
      dtls_private_key: "/etc/letsencrypt/live/cs.brhgroup.co/privkey.pem",
    });
  }

  return {
    endpoint: endpointConfig,
    auth: {
      id: extension,
      auth_type: "userpass",
      password,
      username: extension, //This could be the extension or email. I'll verify || confirm
      nonce_lifetime: 86400,
    },
    aor: {
      id: extension,
      contact: "", // Empty contact allows dynamic registration
      max_contacts: maxContacts || 1,
      remove_existing: "yes",
      qualify_frequency: 60,
      qualify_timeout: 3,
      authenticate_qualify: "yes",
      maximum_expiration: 7200,
      minimum_expiration: 60,
      default_expiration: 3600,
      support_path: "yes", // Keep yes for WebSocket
      rewrite_contact: "yes", // Important for WebSocket connections
      outbound_proxy: null, // No proxy for WebSocket connections
      websocket_enabled: "yes", // Enable WebSocket for this AOR
      media_websocket: "yes", // Enable media over WebSocket
    },
  };
};

export async function createPJSIPConfigs(
  extension,
  password,
  userId,
  transaction,
  options = {}
) {
  const { maxContacts = 1, endpoint: endpointOverrides = {} } = options;

  // Base configurations for WebRTC user endpoint
  const config = {
    endpoint: {
      id: extension,
      identify_by: "auth_username,username",
      transport: "transport-wss",
      aors: extension,
      auth: extension,
      context: "from-sip",
      disallow: "all",
      allow: "ulaw,alaw",
      direct_media: "no",
      rewrite_contact: "yes",
      force_rport: "yes",
      rtp_symmetric: "yes",
      ice_support: "yes",
      use_avpf: "yes",
      media_use_received_transport: "yes",
      rtcp_mux: "yes",
      webrtc: "yes",
      dtls_verify: "fingerprint",
      media_encryption: "dtls",
      dtls_setup: "actpass",
      bundle: "yes",
      user_id: userId,
      enabled: "1",
      active: "1",
      endpoint_type: "user",
      call_counter: "yes",
      t38pt_udptl: "no",
      trust_remote_party_id: "no",
      send_remote_party_id_header: "no",
      encryption: "no",
      video_support: "no",
      send_rpid: "no",
      send_pai: "no",
      allow_subscribe: "no",
      ...endpointOverrides, // Allow overriding any endpoint settings
    },
    auth: {
      id: extension,
      auth_type: "userpass",
      password: password,
      username: extension,
      user_id: userId,
    },
    aor: {
      id: extension,
      max_contacts: maxContacts,
      remove_existing: "yes",
      qualify_frequency: 60,
      user_id: userId,
      maximum_expiration: 7200, // 2 hours maximum
      minimum_expiration: 60, // 1 minute minimum
      default_expiration: 300, // 5 minutes default
      support_path: "yes", // Critical for WebSocket/WebRTC Contact header handling
      authenticate_qualify: "yes", // Required for WebSocket registrations
      rewrite_contact: "yes", // Essential for WebSocket transport
      outbound_proxy: null, // Will be set by Asterisk if needed
    },
  };

  try {
    // Create dependent records first to satisfy FK constraints
    const aor = await PJSIPAor.create(config.aor, { transaction });
    const auth = await PJSIPAuth.create(config.auth, { transaction });

    // Force endpoint to reference the exact newly created IDs to avoid race conditions
    config.endpoint.aors = aor.id;
    config.endpoint.auth = auth.id;
    config.endpoint.identify_by = "auth_username,username";

    const endpoint = await PJSIPEndpoint.create(config.endpoint, {
      transaction,
    });

    return { endpoint, auth, aor };
  } catch (error) {
    console.error("PJSIP Config Creation Error:", error);
    throw error;
  }
}

export async function updatePJSIPConfigs(extension, updates, transaction) {
  const promises = [];

  if (updates.endpoint) {
    promises.push(
      PJSIPEndpoint.update(updates.endpoint, {
        where: { id: extension },
        transaction,
      })
    );
  }

  if (updates.auth) {
    promises.push(
      PJSIPAuth.update(updates.auth, {
        where: { id: extension },
        transaction,
      })
    );
  }

  if (updates.aor) {
    promises.push(
      PJSIPAor.update(updates.aor, {
        where: { id: extension },
        transaction,
      })
    );
  }

  return Promise.all(promises);
}

export async function deletePJSIPConfigs(extension, transaction) {
  return Promise.all([
    PJSIPEndpoint.destroy({ where: { id: extension }, transaction }),
    PJSIPAuth.destroy({ where: { id: extension }, transaction }),
    PJSIPAor.destroy({ where: { id: extension }, transaction }),
    PJSIPEndpointIdentifier.destroy({
      where: { endpoint: extension },
      transaction,
    }),
  ]);
}

PJSIPAor.hasOne(PJSIPEndpoint, {
  foreignKey: "aors",
  sourceKey: "id",
  as: "aorLinkedEndpoint",
});

PJSIPAuth.hasOne(PJSIPEndpoint, {
  foreignKey: "auth",
  sourceKey: "id",
  as: "authLinkedEndpoint",
});

// Add association
PJSIPEndpoint.hasMany(PJSIPEndpointIdentifier, {
  foreignKey: "endpoint",
  sourceKey: "id",
  as: "identifies",
});

// Utility Functions
export async function createPJSIPTrunk(trunkData, transaction) {
  try {
    const { endpointData } = trunkData;
    const endpoint = await PJSIPEndpoint.create(endpointData, { transaction });
    return { endpoint };
  } catch (error) {
    console.error("Error creating PJSIP trunk:", error);
    throw error;
  }
}

export async function updatePJSIPTrunk(endpointId, updates, transaction) {
  try {
    if (updates.endpoint) {
      await PJSIPEndpoint.update(updates.endpoint, {
        where: { id: endpointId },
        transaction,
      });
    }
  } catch (error) {
    console.error("Error updating PJSIP trunk:", error);
    throw error;
  }
}

export async function deletePJSIPTrunk(endpointId, transaction) {
  try {
    const baseId = endpointId.includes("-endpoint")
      ? endpointId.replace("-endpoint", "")
      : endpointId;

    await Promise.all([
      PJSIPEndpoint.destroy({
        where: {
          [Op.or]: [{ id: endpointId }, { trunk_id: baseId }, { id: baseId }],
        },
        transaction,
      }),
      PJSIPAuth.destroy({
        where: {
          [Op.or]: [{ id: `${baseId}-auth` }, { id: baseId }],
        },
        transaction,
      }),
      PJSIPAor.destroy({
        where: { id: baseId },
        transaction,
      }),
    ]);
  } catch (error) {
    console.error("Error deleting PJSIP trunk:", error);
    throw error;
  }
}

// Associations to link PJSIP models back to the Endpoint
PJSIPEndpoint.belongsTo(PJSIPAor, {
  foreignKey: "aors",
  targetKey: "id",
  as: "aorConfig",
});

PJSIPEndpoint.belongsTo(PJSIPAuth, {
  foreignKey: "auth",
  targetKey: "id",
  as: "authConfig",
});
