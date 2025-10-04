import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const IntegrationDataModel = sequelize.define(
  "IntegrationData",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    integrationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "integrations",
        key: "id",
      },
    },
    dataType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Type of data (leads, contacts, deals, etc.)",
    },
    externalId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "ID from the external system",
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "The actual data from the external system",
    },
    syncStatus: {
      type: DataTypes.ENUM("synced", "pending", "failed"),
      defaultValue: "synced",
    },
    lastSync: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
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
    tableName: "integration_data",
    timestamps: true,
    indexes: [
      {
        fields: ["integrationId", "dataType"],
      },
      {
        fields: ["externalId"],
      },
    ],
  }
);

export default IntegrationDataModel;
