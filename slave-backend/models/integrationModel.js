import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const IntegrationModel = sequelize.define(
  "Integration",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "zoho",
        "salesforce",
        "hubspot",
        "custom_api",
        "database"
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "error"),
      defaultValue: "inactive",
    },
    config: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "Integration configuration (API keys, endpoints, etc.)",
    },
    lastSync: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    syncInterval: {
      type: DataTypes.INTEGER, // minutes
      defaultValue: 60,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "integrations",
    timestamps: true,
    indexes: [
      {
        name: "ux_integrations_name",
        unique: true,
        fields: ["name"],
      },
    ],
  }
);

export default IntegrationModel;
