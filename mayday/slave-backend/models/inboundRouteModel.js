// models/RouteModel.js
import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const InboundRoute = sequelize.define(
  "inbound_routes",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    phone_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "DID or phone number for routing",
    },
    pattern: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Matching pattern for the route (e.g., _X. for any number)",
    },
    context: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "from-voip-provider",
      comment: "Asterisk context for call handling",
    },
    alias: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "User-friendly name for the route",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("inbound", "outbound"),
      allowNull: false,
      comment: "Route type identifier",
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    destination: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "default-extension",
    },
    destination_type: {
      type: DataTypes.ENUM("queue", "extension", "ivr", "voicemail"),
      allowNull: false,
      defaultValue: "extension",
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    business_hours_only: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fallback_destination: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    applications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Configured applications and their settings for this route",
    },
  },
  {
    tableName: "inbound_routes",
    timestamps: true,
    freezeTableName: true,
  }
);

export default InboundRoute;
