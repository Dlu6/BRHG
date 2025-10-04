import sequelizePkg from "sequelize";
const { DataTypes, Op } = sequelizePkg;
import sequelize from "../config/sequelize.js";
import {
  PJSIPAor,
  PJSIPAuth,
  PJSIPEndpoint,
  // PJSIPEndpointIdentifier,
} from "./pjsipModel.js";

const UserModel = sequelize.define(
  "users",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
    },
    name: { type: DataTypes.STRING, allowNull: true },
    password: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      validate: { isEmail: true },
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "John Doe",
    },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "user",
      validate: {
        isIn: [["admin", "user", "agent", "manager"]],
      },
    },
    typology: DataTypes.STRING,
    voicemail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    extension: {
      type: DataTypes.STRING,
      validate: {
        is: {
          args: /^(999|10\d{2})$/, // Allows '999' or numbers starting with '10'
          msg: "Extension must be '999' for admin or start with '10' followed by 2 digits",
        },
      },
    },
    sipRegistered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    internal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "friend", // Explicitly marked as required
    },
    context: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "from-internal",
    },
    recordingToUserExtension: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "inactive",
    },
    phone: {
      type: DataTypes.STRING,
      // validate: { isNumeric: true }
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      // validate: { isNumeric: true }
      allowNull: true,
    },
    transport: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "transport-wss",
    },
    websocket_protocol: {
      type: DataTypes.VIRTUAL,
      get() {
        return "sip"; // Default protocol for SIP over WebSocket
      },
    },
    ice_servers: {
      type: DataTypes.VIRTUAL,
      get() {
        return [
          // { urls: "stun:stun.l.google.com:19302" },
          {
            urls: process.env.TURN_SERVER || "turn:65.0.108.79:5349",
            username: process.env.TURN_USERNAME || "Reach-Miwebrtc",
            credential: process.env.TURN_PASSWORD || "Pasword@256",
          },
        ];
      },
    },
    dtmfMode: {
      type: DataTypes.ENUM,
      values: ["rfc2833", "info", "shortinfo", "inband", "auto"],
      allowNull: true,
      defaultValue: "rfc2833",
      comment:
        "Determines the method used for sending DTMF tones in SIP communications",
    },
    directMedia: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    trustrpid: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    trust_id_outbound: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    callerid: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '"" <>', // Set the default caller ID format
    },
    callcounter: {
      type: DataTypes.ENUM,
      values: ["yes", "no"],
      allowNull: true,
      defaultValue: "yes", // Default is 'yes'
    },
    online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true, // Allows the field to be null if no login has occurred
    },
    pauseType: {
      type: DataTypes.STRING,
      allowNull: true, // Allows the field to be null if the user is not on pause
      defaultValue: "DEFAULT PAUSE", // Default pause type if not specified
    },
    mailCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    chatCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    smsCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    openchannelCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    whatsappCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    phoneBarAutoAnswer: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // Allows the field to be null if not specified
      defaultValue: false, // Auto-answer is off by default
    },
    phoneBarEnableSettings: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // Allows the field to be null if not specified
      defaultValue: true,
    },
    phoneBarListenPort: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allows the field to be null if not specified
      defaultValue: 5160, // Default SIP port for phone bar applications
    },
    phoneBarExpires: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 120,
    },
    phoneBarRemoteControl: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // Allows the field to be null if not specified
      defaultValue: false, // Default to false, indicating remote control is not enabled by default
    },
    phoneBarRemoteControlPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 9888,
    },
    phoneBarChromeExtensionHost: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      validate: {
        isUrl: {
          args: true,
          msg: "Chrome Extension Host must be a valid URL",
        },
      },
    },
    phoneBarEnableRecording: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // Allows the field to be null if not specified
      defaultValue: false, // Default to false, indicating that recording is not enabled by default
    },

    phoneBarRingInUse: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    chanSpy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    host: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "dynamic",
    },
    ipaddr: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deny: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    permit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    md5secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remotesecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    directmediapermit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nat: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "force_rport,comedia", // Default settings to assist with NAT traversal
    },
    directmediadeny: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callGroup: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickupGroup: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "en", // Default settings to assist with NAT traversal
    },
    disallow: {
      type: DataTypes.STRING,
      allowNull: true, // Allows the field to be null if not specified
      defaultValue: "all", // Disallow all codecs by default
    },
    allow: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "ulaw,alaw", // Specifies default allowed codecs
    },
    insecure: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    allowtransfer: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    videosupport: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    encryption: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    avpf: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    ice_support: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "Enable support for ICE (Interactive Connectivity Establishment)",
    },
    dtlsenable: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    dtlsverify: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    dtls_setup: {
      type: DataTypes.ENUM("active", "passive", "actpass"),
      defaultValue: "actpass",
      comment: "DTLS setup behavior",
    },
    useragentphone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    force_avp: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    canreinvite: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
      validate: {
        isIn: [["yes", "no"]],
      },
    },
    loginInPause: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment:
        "Indicates if the agent can log in already set to a paused state",
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "Timestamp of the last password reset to track password changes",
    },
    previousPasswords: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    showWebBar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    permissions: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneBarUnconditional: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment:
        "Flag to indicate if phone bar settings should be applied unconditionally",
    },
    phoneBarNoReply: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "",
    },
    phoneBarBusy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "",
    },
    phoneBarDnd: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      comment:
        "Flag to indicate if the phone bar is set to Do Not Disturb mode by default",
    },
    phoneBarUnansweredCallBadge: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      comment: "",
    },
    phoneBarEnableDtmfTone: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "",
    },
    phoneBarAutoAnswerDelay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Auto Answer delay!",
    },
    extensionMonitor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
      comment:
        "Monitors the status of the specified extension for presence information",
    },
    crudPermissions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Bitwise flag or level of CRUD permissions assigned to the user",
    },
    rtcp_mux: {
      type: DataTypes.ENUM,
      values: ["yes", "no"],
      allowNull: true,
      defaultValue: "no",
      comment:
        "Indicates whether RTCP is multiplexed with RTP on the same transport address and port",
    },
    allowmessenger: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    phoneBarOutboundProxy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneBarEnableJaws: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    hotdesk: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment:
        "Allows the agent to log in from any workstation, enabling flexible seating arrangements",
    },
    interface: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment:
        "Specifies the network interface or method used for communication",
    },
    privacyEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    apiKeyNonce: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Stores a nonce value for the API key to enhance security",
    },
    apiKeyIat: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "Timestamp indicating when the API key was issued, stored as a string",
    },
    blocked: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment:
        "Indicates whether the user is blocked from certain actions or functionalities",
    },
    blockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: "Time when block was applied",
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment:
        "Flag to indicate if the entity is disabled (true) or active (false)",
    },
    settingsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    wssPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 8089,
    },
    downloadAttachments: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    downloadOmnichannelInteractions: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    downloadVoiceRecordings: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    adSsoEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment:
        "Indicates if Active Directory Single Sign-On (SSO) is enabled for this entity",
    },
    chatAutoanswer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    chatAutoanswerDelay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    emailAutoanswer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    emailAutoanswerDelay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    smsAutoanswer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    smsAutoanswerDelay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    openchannelAutoanswer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    openchannelAutoanswerDelay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    whatsappAutoanswer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    whatsappAutoanswerDelay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    messengerSoundNotification: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    ProfileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    serviceLogin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "Indicates if the user can log in as a service account",
    },
    userProfileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment:
        "Foreign key identifier for user profile, linking to the user profile table",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        name: 'ux_users_username',
        unique: true,
        fields: ['username'],
      },
      {
        name: 'ux_users_email',
        unique: true,
        fields: ['email'],
      },
      {
        name: 'ux_users_extension',
        unique: true,
        fields: ['extension'],
      },
    ],
  }
);

// Move association logic to a separate function
export function setupAssociations() {
  UserModel.hasOne(PJSIPEndpoint, {
    foreignKey: "user_id",
    sourceKey: "id",
    as: "ps_endpoint",
    onDelete: "CASCADE",
  });

  UserModel.hasOne(PJSIPAuth, {
    foreignKey: "user_id",
    sourceKey: "id",
    as: "ps_auth",
    onDelete: "CASCADE",
  });

  UserModel.hasOne(PJSIPAor, {
    foreignKey: "id",
    sourceKey: "extension",
    as: "ps_aor",
    onDelete: "CASCADE",
  });
}

UserModel.generateUniqueExtension = async function () {
  const highestExtensionUser = await this.findOne({
    where: {
      extension: {
        [Op.ne]: null,
        [Op.notIn]: ["999"], // Exclude admin extension
      },
    },
    order: [["extension", "DESC"]],
  });

  if (highestExtensionUser && highestExtensionUser.extension) {
    const highestExtension = parseInt(highestExtensionUser.extension, 10);
    return !isNaN(highestExtension) ? String(highestExtension + 1) : "1000";
  }

  return "1000"; // Starting extension
};
// Find extension by email
UserModel.findExtensionByEmail = async function (email) {
  // console.log("Looking up extension for email:", email);

  const user = await this.findOne({
    where: { email },
    include: [
      {
        model: PJSIPEndpoint,
        as: "ps_endpoint",
        required: false,
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
        ],
      },
      {
        model: PJSIPAuth,
        as: "ps_auth",
        required: false,
        attributes: ["id", "password", "username", "auth_type"],
      },
      {
        model: PJSIPAor,
        as: "ps_aor",
        required: false,
        attributes: [
          "id",
          "contact",
          "qualify_frequency",
          "max_contacts",
          "remove_existing",
        ],
      },
    ],
  });

  if (!user) {
    console.log("No user found for email:", email);
    throw new Error("User not found");
  }

  // Debug log the found data
  console.log("Found user data>>>:", {
    id: user.id,
    email: user.email,
    extension: user.extension,
    hasEndpoint: !!user.ps_endpoint,
    hasAuth: !!user.ps_auth,
    hasAor: !!user.ps_aor,
  });

  // Return formatted data
  return {
    extension: user.extension,
    password: user.ps_auth?.password || user.password,
    user_id: user.id,
    endpoint: user.ps_endpoint,
    auth: user.ps_auth,
    aor: user.ps_aor,
  };
};

export default UserModel;
