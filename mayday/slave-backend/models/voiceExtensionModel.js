// models/voiceExtensionModel.js
import sequelizePkg from "sequelize";
import sequelize from "../config/sequelize.js";
import Interval from "./intervalModel.js";
const { DataTypes } = sequelizePkg;

const VoiceExtension = sequelize.define(
  "VoiceExtension",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    context: DataTypes.STRING,
    exten: DataTypes.STRING,
    extension: DataTypes.STRING,
    priority: DataTypes.INTEGER,
    appType: DataTypes.STRING,
    app: DataTypes.STRING,
    appdata: DataTypes.STRING,
    type: DataTypes.ENUM("inbound", "outbound", "internal", "system", "any"),
    description: DataTypes.STRING,
    interval: DataTypes.STRING,
    intervalId: {
      type: DataTypes.UUID,
      references: {
        model: "intervals",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      allowNull: true,
    },
    isApp: DataTypes.BOOLEAN,
    callerID: DataTypes.STRING,
    tag: DataTypes.STRING,
    record: DataTypes.BOOLEAN,
    // cutdigits: DataTypes.INTEGER,
    recordingFormat: DataTypes.STRING,
    answer: DataTypes.BOOLEAN,
    alias: DataTypes.STRING,
    CmCompanyId: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    UserId: DataTypes.INTEGER,
    ChanSpyId: DataTypes.INTEGER,
    VoiceContextId: DataTypes.INTEGER,
    VoiceExtensionId: DataTypes.INTEGER,
    VoicePrefixId: DataTypes.INTEGER,
    outboundRouteId: {
      type: DataTypes.INTEGER,
      references: {
        model: "outbound_routes",
        key: "id",
      },
      onDelete: "CASCADE",
      allowNull: true,
    },
    // New field to distinguish manual vs generated extensions
    isGenerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Reference to the application that generated this extension
    generatedByAppId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "outbound_route_applications",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    // Additional fields that might be needed
    authUser: DataTypes.STRING,
    authPassword: DataTypes.STRING,
    outboundRouteApplicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "outbound_route_applications",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "voice_extensions",
    timestamps: true,
  }
);

// Set up the association with Interval model
VoiceExtension.belongsTo(Interval, {
  foreignKey: "intervalId",
  as: "intervalObj",
});

export default VoiceExtension;
