const mongoose = require("mongoose");
const { Schema } = mongoose;

// License Types - maintained locally for reference but synced from external server
const licenseTypeSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 50 },
    description: String,
    max_concurrent_users: Number,
    features: Schema.Types.Mixed, // Store as Mixed for both string and object compatibility
    price_monthly: { type: Number, min: 0 },
    external_managed: { type: Boolean, default: false }, // Flag for external management
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Server Licenses - can be synced from external server or managed locally
const serverLicenseSchema = new Schema(
  {
    license_key: { type: String, required: true, unique: true },
    server_fingerprint: { type: String, required: true },
    organization_name: { type: String, required: true },
    max_users: { type: Number, default: 2 },
    webrtc_max_users: { type: Number, default: 0 }, // WebRTC specific allocation
    license_type_id: {
      type: Schema.Types.ObjectId,
      ref: "LicenseType",
      required: true,
    },
    // Slave Server Reference - links license to specific slave server
    slave_server_id: {
      type: Schema.Types.ObjectId,
      ref: "SlaveServer",
      required: false, // Optional for backward compatibility
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "expired"],
      default: "active",
    },
    issued_at: { type: Date, default: Date.now },
    expires_at: Date,
    last_validated: Date,
    validation_count: { type: Number, default: 0 },
    external_managed: { type: Boolean, default: false }, // Flag for external management
    external_license_id: Number, // Reference to external license ID
    sync_timestamp: Date, // Last sync from external server
    original_license_type_id: {
      type: Schema.Types.ObjectId,
      ref: "LicenseType",
    }, // Store original license type when suspended
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Client Sessions - local session management for WebRTC extensions
const clientSessionSchema = new Schema(
  {
    session_token: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, maxlength: 36 },
    server_license_id: {
      type: Schema.Types.ObjectId,
      ref: "ServerLicense",
      required: true,
    },
    client_fingerprint: String,
    sip_username: { type: String, maxlength: 100 },
    ip_address: { type: String, maxlength: 45 },
    user_agent: String,
    feature: {
      type: String,
      required: true,
      default: "webrtc_extension",
      maxlength: 50,
    }, // Track which feature is being used
    status: {
      type: String,
      enum: ["active", "disconnected", "expired"],
      default: "active",
    },
    last_heartbeat: Date,
    expires_at: Date,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

// License Validation Log - track validation attempts
const licenseValidationSchema = new Schema(
  {
    server_license_id: {
      type: Schema.Types.ObjectId,
      ref: "ServerLicense",
      required: true,
    },
    validation_type: {
      type: String,
      enum: [
        "server_startup",
        "client_connect",
        "periodic_check",
        "external_sync",
      ],
    },
    client_fingerprint: String,
    ip_address: { type: String, maxlength: 45 },
    success: Boolean,
    error_message: String,
    external_response: Schema.Types.Mixed, // Store response from external license server
  },
  {
    timestamps: { createdAt: "timestamp", updatedAt: false },
  }
);

// External License Sync Log - track synchronization with external server
const externalLicenseSyncSchema = new Schema(
  {
    server_fingerprint: { type: String, required: true },
    sync_type: {
      type: String,
      enum: ["full_sync", "license_check", "feature_check", "allocation_check"],
    },
    external_license_id: Number,
    success: Boolean,
    response_data: Schema.Types.Mixed,
    error_message: String,
    sync_duration_ms: Number,
  },
  {
    timestamps: { createdAt: "sync_timestamp", updatedAt: false },
  }
);

// Create indexes
serverLicenseSchema.index({ server_fingerprint: 1, status: 1 });
serverLicenseSchema.index({ external_license_id: 1 });

clientSessionSchema.index({ user_id: 1, status: 1 });
clientSessionSchema.index({ server_license_id: 1, status: 1, feature: 1 });
clientSessionSchema.index({ sip_username: 1, status: 1 });

// Create models
const LicenseType = mongoose.model("LicenseType", licenseTypeSchema);
const ServerLicense = mongoose.model("ServerLicense", serverLicenseSchema);
const ClientSession = mongoose.model("ClientSession", clientSessionSchema);
const LicenseValidation = mongoose.model(
  "LicenseValidation",
  licenseValidationSchema
);
const ExternalLicenseSync = mongoose.model(
  "ExternalLicenseSync",
  externalLicenseSyncSchema
);

// Define associations function to be called after all models are loaded
const setupLicenseAssociations = (UserModel) => {
  // In Mongoose, associations are handled through refs and population
  // The associations are already defined in the schemas above using ref

  // If UserModel is provided, we can add virtual population
  if (UserModel) {
    // Add virtual for user sessions
    UserModel.virtual("license_sessions", {
      ref: "ClientSession",
      localField: "_id",
      foreignField: "user_id",
      justOne: false,
    });

    // Add virtual for client session user
    ClientSession.virtual("user", {
      ref: UserModel.modelName,
      localField: "user_id",
      foreignField: "_id",
      justOne: true,
    });
  }

  // Add virtuals for better population
  ServerLicense.virtual("license_type", {
    ref: "LicenseType",
    localField: "license_type_id",
    foreignField: "_id",
    justOne: true,
  });

  ServerLicense.virtual("original_license_type", {
    ref: "LicenseType",
    localField: "original_license_type_id",
    foreignField: "_id",
    justOne: true,
  });

  ServerLicense.virtual("client_sessions", {
    ref: "ClientSession",
    localField: "_id",
    foreignField: "server_license_id",
    justOne: false,
  });

  ServerLicense.virtual("license_validations", {
    ref: "LicenseValidation",
    localField: "_id",
    foreignField: "server_license_id",
    justOne: false,
  });

  ClientSession.virtual("server_license", {
    ref: "ServerLicense",
    localField: "server_license_id",
    foreignField: "_id",
    justOne: true,
  });

  LicenseValidation.virtual("server_license", {
    ref: "ServerLicense",
    localField: "server_license_id",
    foreignField: "_id",
    justOne: true,
  });

  LicenseType.virtual("server_licenses", {
    ref: "ServerLicense",
    localField: "_id",
    foreignField: "license_type_id",
    justOne: false,
  });

  LicenseType.virtual("original_licenses", {
    ref: "ServerLicense",
    localField: "_id",
    foreignField: "original_license_type_id",
    justOne: false,
  });

  // Slave Server associations
  ServerLicense.virtual("slave_server", {
    ref: "SlaveServer",
    localField: "slave_server_id",
    foreignField: "_id",
    justOne: true,
  });
};

module.exports = {
  LicenseType,
  ServerLicense,
  ClientSession,
  LicenseValidation,
  ExternalLicenseSync,
  setupLicenseAssociations,
};
