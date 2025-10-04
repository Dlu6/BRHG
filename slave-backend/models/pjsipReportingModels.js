import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;

import sequelize from "../config/sequelize.js";
import { PJSIPEndpoint } from "./pjsipModel.js";

export const CallReport = sequelize.define(
  "call_report",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Core Call Identification
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    call_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      index: true,
    },
    uniqueid: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    linked_call_id: {
      type: DataTypes.STRING(255),
      comment: "Related call ID for transferred or forwarded calls",
    },
    correlation_id: {
      type: DataTypes.STRING(255),
      comment: "ID for tracking related call segments",
    },

    // Participant Information
    endpoint_id: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    account_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(100),
    },
    user_group: {
      type: DataTypes.STRING(100),
    },

    // Call Classification
    direction: {
      type: DataTypes.ENUM("inbound", "outbound", "internal"),
      allowNull: false,
    },
    call_type: {
      type: DataTypes.ENUM(
        "direct",
        "forwarded",
        "transfer",
        "conference",
        "callback",
        "queue",
        "ivr",
        "voicemail"
      ),
    },
    call_category: {
      type: DataTypes.STRING(100),
      comment: "Business classification of call (sales, support, etc.)",
    },
    priority: {
      type: DataTypes.INTEGER,
      comment: "Call priority level",
    },

    // Contact Information
    from_uri: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    to_uri: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    source_number: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    destination_number: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    caller_id: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    caller_name: {
      type: DataTypes.STRING(255),
    },
    diversion_info: {
      type: DataTypes.STRING(255),
      comment: "Call forwarding/diversion information",
    },

    // Detailed Timing Metrics
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ringing_start_time: {
      type: DataTypes.DATE,
    },
    answer_time: {
      type: DataTypes.DATE,
    },
    end_time: {
      type: DataTypes.DATE,
    },
    duration: {
      type: DataTypes.INTEGER,
      comment: "Total duration in seconds",
    },
    billable_duration: {
      type: DataTypes.INTEGER,
      comment: "Billable duration in seconds",
    },
    setup_time: {
      type: DataTypes.INTEGER,
      comment: "Time in milliseconds from INVITE to 200 OK",
    },
    post_dial_delay: {
      type: DataTypes.INTEGER,
      comment: "Time from dialing to ringing in milliseconds",
    },
    time_to_answer: {
      type: DataTypes.INTEGER,
      comment: "Time from ringing to answer in milliseconds",
    },

    // Call Progress and Status
    disposition: {
      type: DataTypes.ENUM(
        "NO ANSWER",
        "FAILED",
        "BUSY",
        "ANSWERED",
        "CONGESTION",
        "CANCELLED",
        "TRANSFERRED"
      ),
      allowNull: false,
    },
    disconnect_cause: {
      type: DataTypes.STRING(40),
    },
    disconnect_cause_code: {
      type: DataTypes.INTEGER,
    },
    disconnect_source: {
      type: DataTypes.ENUM("caller", "callee", "system"),
    },
    release_reason: {
      type: DataTypes.STRING(255),
    },

    // Media Quality Metrics
    codec_audio: {
      type: DataTypes.STRING(40),
    },
    codec_video: {
      type: DataTypes.STRING(40),
    },
    packet_loss_percentage: {
      type: DataTypes.FLOAT,
    },
    jitter_ms: {
      type: DataTypes.FLOAT,
    },
    jitter_buffer_ms: {
      type: DataTypes.FLOAT,
    },
    rtt_ms: {
      type: DataTypes.FLOAT,
    },
    rtt_variance_ms: {
      type: DataTypes.FLOAT,
    },
    mos_score: {
      type: DataTypes.FLOAT,
    },
    r_factor: {
      type: DataTypes.FLOAT,
      comment: "R-Factor voice quality metric",
    },
    audio_level_in: {
      type: DataTypes.FLOAT,
    },
    audio_level_out: {
      type: DataTypes.FLOAT,
    },
    echo_return_loss: {
      type: DataTypes.FLOAT,
    },
    echo_delay_ms: {
      type: DataTypes.FLOAT,
    },

    // Network and Protocol Information
    transport_type: {
      type: DataTypes.STRING(20),
    },
    protocol_variant: {
      type: DataTypes.STRING(20),
      comment: "Specific protocol version or variant",
    },
    local_media_address: {
      type: DataTypes.STRING(45),
    },
    remote_media_address: {
      type: DataTypes.STRING(45),
    },
    local_control_address: {
      type: DataTypes.STRING(45),
    },
    remote_control_address: {
      type: DataTypes.STRING(45),
    },
    media_encryption: {
      type: DataTypes.STRING(40),
      comment: "Type of media encryption used (SRTP, etc.)",
    },
    selected_outbound_proxy: {
      type: DataTypes.STRING(255),
    },
    ice_status: {
      type: DataTypes.STRING(40),
    },
    nat_type: {
      type: DataTypes.STRING(40),
    },

    // Routing and Contact Center
    outbound_trunk: {
      type: DataTypes.STRING(80),
    },
    routing_pattern: {
      type: DataTypes.STRING(80),
    },
    routing_table_version: {
      type: DataTypes.STRING(40),
    },
    queue_name: {
      type: DataTypes.STRING(80),
    },
    queue_position: {
      type: DataTypes.INTEGER,
    },
    queue_size: {
      type: DataTypes.INTEGER,
    },
    queue_time: {
      type: DataTypes.INTEGER,
    },
    agent_id: {
      type: DataTypes.STRING(80),
    },
    agent_group: {
      type: DataTypes.STRING(80),
    },
    skill_matched: {
      type: DataTypes.STRING(80),
    },

    // Billing and Business Metrics
    cost: {
      type: DataTypes.DECIMAL(10, 4),
    },
    rate: {
      type: DataTypes.DECIMAL(10, 4),
    },
    billing_type: {
      type: DataTypes.STRING(40),
    },
    currency: {
      type: DataTypes.STRING(3),
    },
    revenue: {
      type: DataTypes.DECIMAL(10, 4),
    },
    margin: {
      type: DataTypes.DECIMAL(10, 4),
    },

    // Feature Usage
    recording_filename: {
      type: DataTypes.STRING(255),
    },
    recording_retention: {
      type: DataTypes.INTEGER,
      comment: "Recording retention period in days",
    },
    recording_status: {
      type: DataTypes.ENUM("success", "failed", "partial", "disabled"),
    },
    transcription_status: {
      type: DataTypes.ENUM("pending", "completed", "failed", "disabled"),
    },
    transfer_count: {
      type: DataTypes.INTEGER,
    },
    transfer_status: {
      type: DataTypes.STRING(20),
    },
    hold_count: {
      type: DataTypes.INTEGER,
    },
    total_hold_time: {
      type: DataTypes.INTEGER,
    },
    features_used: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("features_used");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("features_used", JSON.stringify(value));
      },
    },

    // Security and Compliance
    security_level: {
      type: DataTypes.STRING(20),
    },
    encryption_status: {
      type: DataTypes.BOOLEAN,
    },
    compliance_status: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("compliance_status");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("compliance_status", JSON.stringify(value));
      },
    },
    recording_consent: {
      type: DataTypes.BOOLEAN,
    },
    sensitive_data_present: {
      type: DataTypes.BOOLEAN,
    },

    // Custom and Extended Data
    custom_data: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("custom_data");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("custom_data", JSON.stringify(value));
      },
    },
    tags: {
      type: DataTypes.STRING(1000),
      get() {
        const rawValue = this.getDataValue("tags");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("tags", JSON.stringify(value));
      },
    },
    notes: {
      type: DataTypes.TEXT,
    },
    external_reference: {
      type: DataTypes.STRING(255),
      comment: "External system reference (CRM, ticket, etc.)",
    },
  },
  {
    tableName: "call_reports",
    indexes: [
      {
        name: "idx_endpoint_id",
        fields: ["endpoint_id"],
      },
      {
        name: "idx_user_id",
        fields: ["user_id"],
      },
      {
        name: "idx_call_id",
        fields: ["call_id"],
      },
      {
        name: "idx_timestamp",
        fields: ["timestamp"],
      },
    ],
    // Disable automatic pluralization
    freezeTableName: true,
  }
);

// Define associations
CallReport.belongsTo(PJSIPEndpoint, {
  foreignKey: "endpoint_id",
  targetKey: "id",
  constraints: false, // Disable foreign key constraint
});

export default CallReport;
