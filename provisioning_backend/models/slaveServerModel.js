const mongoose = require("mongoose");

const slaveServerSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    domain: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          // Allow localhost and domains with TLD
          return /^(localhost|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}))$/.test(
            v
          );
        },
        message:
          "Please enter a valid domain name (localhost or domain with TLD)",
      },
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },

    // Connection Details
    api_url: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "API URL must be a valid HTTP/HTTPS URL",
      },
    },
    websocket_url: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^wss?:\/\/.+/.test(v);
        },
        message: "WebSocket URL must be a valid WS/WSS URL",
      },
    },

    // Status and Health
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance", "error"],
      default: "inactive",
    },
    health_status: {
      type: String,
      enum: ["healthy", "unhealthy", "unknown"],
      default: "unknown",
    },
    last_ping: {
      type: Date,
      default: null,
    },
    last_health_check: {
      type: Date,
      default: null,
    },

    // Registration and Authentication
    registration_token: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    api_key: {
      type: String,
      unique: true,
      sparse: true,
    },
    secret_key: {
      type: String, // For webhook validation
    },

    // Server Information
    server_fingerprint: {
      type: String,
      default: null,
    },
    server_info: {
      version: String,
      os: String,
      node_version: String,
      uptime: Number,
      memory_usage: Number,
      cpu_usage: Number,
    },

    // Configuration
    configuration: {
      max_licenses: {
        type: Number,
        default: 10,
      },
      allowed_features: [
        {
          type: String,
        },
      ],
      webhook_url: String,
      notification_email: String,
      timezone: {
        type: String,
        default: "UTC",
      },
    },

    // Metadata
    registered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    registered_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance (avoid duplicates with unique field indexes)
slaveServerSchema.index({ status: 1 });
slaveServerSchema.index({ health_status: 1 });

// Virtual for license count
slaveServerSchema.virtual("license_count", {
  ref: "License",
  localField: "_id",
  foreignField: "slave_server_id",
  count: true,
});

// Virtual for active license count
slaveServerSchema.virtual("active_license_count", {
  ref: "License",
  localField: "_id",
  foreignField: "slave_server_id",
  count: true,
  match: { status: "active" },
});

// Pre-save middleware to update timestamps
slaveServerSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Instance methods
slaveServerSchema.methods.generateRegistrationToken = function () {
  const crypto = require("crypto");
  this.registration_token = crypto.randomBytes(32).toString("hex");
  return this.registration_token;
};

slaveServerSchema.methods.generateApiKey = function () {
  const crypto = require("crypto");
  this.api_key = crypto.randomBytes(32).toString("hex");
  return this.api_key;
};

slaveServerSchema.methods.generateSecretKey = function () {
  const crypto = require("crypto");
  this.secret_key = crypto.randomBytes(64).toString("hex");
  return this.secret_key;
};

slaveServerSchema.methods.updateHealthStatus = function (
  status,
  serverInfo = null
) {
  this.health_status = status;
  this.last_health_check = new Date();
  if (serverInfo) {
    this.server_info = { ...this.server_info, ...serverInfo };
  }
  return this.save();
};

slaveServerSchema.methods.ping = function () {
  this.last_ping = new Date();
  return this.save();
};

// Static methods
slaveServerSchema.statics.findByDomain = function (domain) {
  return this.findOne({ domain: domain.toLowerCase() });
};

slaveServerSchema.statics.findByApiKey = function (apiKey) {
  return this.findOne({ api_key: apiKey });
};

slaveServerSchema.statics.getActiveServers = function () {
  return this.find({ status: "active" });
};

slaveServerSchema.statics.getHealthyServers = function () {
  return this.find({
    status: "active",
    health_status: "healthy",
  });
};

module.exports = mongoose.model("SlaveServer", slaveServerSchema);
