import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const CallCost = sequelize.define(
  "CallCost",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uniqueid: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: "Unique call identifier from CDR",
    },
    trunk_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID of the trunk used for the call",
    },
    account_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Provider account number",
    },
    phone_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "SIP trunk phone number",
    },
    src: {
      type: DataTypes.STRING(80),
      allowNull: true,
      comment: "Source number",
    },
    dst: {
      type: DataTypes.STRING(80),
      allowNull: true,
      comment: "Destination number",
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Call duration in seconds",
    },
    billsec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Billed duration in seconds",
    },
    cost_per_minute: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.01,
      comment: "Cost per minute in USD",
    },
    total_cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Total call cost in USD",
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "USD",
      comment: "Currency code",
    },
    call_type: {
      type: DataTypes.ENUM("inbound", "outbound", "internal"),
      allowNull: false,
      defaultValue: "outbound",
      comment: "Type of call",
    },
    disposition: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: "Call disposition (ANSWERED, NO ANSWER, etc.)",
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Call start time",
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Call end time",
    },
    provider_cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: "Actual cost from provider (if available)",
    },
    cost_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether cost was verified with provider",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Additional notes about the call cost",
    },
  },
  {
    tableName: "call_costs",
    timestamps: true,
    indexes: [
      {
        name: "ux_call_costs_uniqueid",
        fields: ["uniqueid"],
        unique: true,
      },
      {
        fields: ["trunk_id"],
      },
      {
        fields: ["account_number"],
      },
      {
        fields: ["start_time"],
      },
      {
        fields: ["call_type"],
      },
      {
        fields: ["disposition"],
      },
    ],
  }
);

export default CallCost;
