// models/outboundRouteModel.js
import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";
import VoiceExtension from "./voiceExtensionModel.js";

// New model for applications
const OutboundRouteApplication = sequelize.define(
  "OutboundRouteApplication",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    outboundRouteId: {
      type: DataTypes.INTEGER,
      references: {
        model: "outbound_routes",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.STRING, // 'OutboundDial' or 'Custom'
      allowNull: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    settings: {
      type: DataTypes.JSON, // Store all app settings in JSON format
      allowNull: false,
    },
  },
  {
    tableName: "outbound_route_applications",
    timestamps: true,
  }
);

const OutboundRoute = sequelize.define(
  "OutboundRoute",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    context: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "outbound-trunk",
    },
    recording: {
      type: DataTypes.ENUM("none", "wav", "gsm", "wav49"),
      allowNull: false,
      defaultValue: "none",
    },
    // cutDigits: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    // },
    alias: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "outbound_routes",
    timestamps: true,
  }
);

// Set up relationships
OutboundRoute.hasMany(VoiceExtension, {
  foreignKey: "outboundRouteId",
  as: "voiceExtensions",
  onDelete: "CASCADE",
});

VoiceExtension.belongsTo(OutboundRoute, {
  foreignKey: "outboundRouteId",
  as: "outboundRoute",
});

OutboundRoute.hasMany(OutboundRouteApplication, {
  foreignKey: "outboundRouteId",
  as: "applications",
  onDelete: "CASCADE",
});

OutboundRouteApplication.belongsTo(OutboundRoute, {
  foreignKey: "outboundRouteId",
  as: "outboundRoute",
});

export { OutboundRoute, OutboundRouteApplication };
export default OutboundRoute;
