import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

// Minimal License Cache - only essential data for slave server operations
export const LicenseCache = sequelize.define(
  "license_cache",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    master_license_id: { type: DataTypes.STRING, allowNull: false }, // Reference to master license (MongoDB ObjectId)
    server_fingerprint: { type: DataTypes.STRING, allowNull: false },
    license_key: { type: DataTypes.TEXT, allowNull: true }, // For JWT validation
    organization_name: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "suspended", "expired", "invalid"),
      defaultValue: "invalid",
    },
    max_users: { type: DataTypes.INTEGER, defaultValue: 1 },
    webrtc_max_users: { type: DataTypes.INTEGER, defaultValue: 0 },
    issued_at: DataTypes.DATE,
    expires_at: DataTypes.DATE,
    features: DataTypes.JSON, // Cached features from master
    license_type_name: { type: DataTypes.STRING }, // Cache license type name
    last_sync: { type: DataTypes.DATE }, // When was this last synced from master
    sync_status: {
      type: DataTypes.ENUM("synced", "stale", "failed"),
      defaultValue: "stale",
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["server_fingerprint", "status"],
        name: "license_cache_fingerprint_status_idx",
      },
      {
        fields: ["master_license_id"],
        name: "license_cache_master_id_idx",
      },
    ],
  }
);

// Client Sessions - local session management for WebRTC extensions
export const ClientSession = sequelize.define(
  "client_session",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_token: { type: DataTypes.TEXT, allowNull: false },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    license_cache_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "license_cache",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    server_license_id: {
      type: DataTypes.STRING(50), // Ensure sufficient size for MongoDB ObjectIds (24 chars) and future formats
      allowNull: true, // Allow null since it may not always be available
      comment: "Reference to master server license ID",
    },
    client_fingerprint: DataTypes.STRING,
    sip_username: DataTypes.STRING(100),
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.TEXT,
    feature: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "webrtc_extension",
    },
    status: {
      type: DataTypes.ENUM("active", "disconnected", "expired"),
      defaultValue: "active",
    },
    last_heartbeat: DataTypes.DATE,
    expires_at: DataTypes.DATE,
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        fields: ["user_id", "status"],
        name: "client_session_user_status_idx",
      },
      {
        fields: ["license_cache_id", "status", "feature"],
        name: "client_session_license_status_feature_idx",
      },
      {
        fields: ["sip_username", "status"],
        name: "client_session_sip_status_idx",
      },
      {
        name: "ux_client_session_session_token",
        unique: true,
        fields: [{ name: "session_token", length: 255 }],
      },
    ],
  }
);

// License Validation Log - track validation attempts
export const LicenseValidation = sequelize.define(
  "license_validation",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    license_cache_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "license_cache",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    validation_type: DataTypes.ENUM(
      "server_startup",
      "client_connect",
      "periodic_check",
      "master_sync"
    ),
    client_fingerprint: DataTypes.STRING,
    ip_address: DataTypes.STRING(45),
    success: DataTypes.BOOLEAN,
    error_message: DataTypes.TEXT,
    master_response: DataTypes.JSON, // Store response from master server
  },
  { timestamps: true, createdAt: "timestamp", updatedAt: false }
);

// Fingerprint History - track fingerprint changes for license updates
export const FingerprintHistory = sequelize.define(
  "fingerprint_history",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    old_fingerprint: { type: DataTypes.STRING, allowNull: false },
    new_fingerprint: { type: DataTypes.STRING, allowNull: false },
    change_reason: {
      type: DataTypes.ENUM("network_change", "hardware_change", "manual"),
      defaultValue: "network_change",
    },
    license_cache_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "license_cache",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    action_taken: {
      type: DataTypes.ENUM(
        "license_invalidated",
        "license_updated",
        "new_license_requested"
      ),
      allowNull: true,
    },
  },
  { timestamps: true, createdAt: "changed_at", updatedAt: false }
);

// Define associations
export const setupLicenseAssociations = (UserModel) => {
  // License Cache to Client Session
  ClientSession.belongsTo(LicenseCache, {
    foreignKey: "license_cache_id",
    as: "license_cache",
  });
  LicenseCache.hasMany(ClientSession, { foreignKey: "license_cache_id" });

  // License Cache to License Validation
  LicenseValidation.belongsTo(LicenseCache, {
    foreignKey: "license_cache_id",
    as: "license_cache",
  });
  LicenseCache.hasMany(LicenseValidation, { foreignKey: "license_cache_id" });

  // License Cache to Fingerprint History
  FingerprintHistory.belongsTo(LicenseCache, {
    foreignKey: "license_cache_id",
    as: "license_cache",
  });
  LicenseCache.hasMany(FingerprintHistory, { foreignKey: "license_cache_id" });

  // User to Client Session - only if UserModel is provided
  if (UserModel) {
    ClientSession.belongsTo(UserModel, {
      foreignKey: "user_id",
      constraints: false,
    });
    UserModel.hasMany(ClientSession, {
      foreignKey: "user_id",
      as: "license_sessions",
      constraints: false,
    });
  }
};

// Legacy exports for backward compatibility (will be removed in future)
export const LicenseType = null; // Deprecated - use master server
export const ServerLicense = LicenseCache; // Alias for backward compatibility
