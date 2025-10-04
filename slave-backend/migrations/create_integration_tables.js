import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  // Create integrations table
  await queryInterface.createTable("integrations", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
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
      type: DataTypes.INTEGER,
      defaultValue: 60,
      comment: "Sync interval in minutes",
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
  });

  // Create integration_data table
  await queryInterface.createTable("integration_data", {
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
      onDelete: "CASCADE",
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
  });

  // Create indexes for better performance
  await queryInterface.addIndex("integration_data", [
    "integrationId",
    "dataType",
  ]);
  await queryInterface.addIndex("integration_data", ["externalId"]);
  await queryInterface.addIndex("integration_data", ["syncStatus"]);
  await queryInterface.addIndex("integrations", ["type"]);
  await queryInterface.addIndex("integrations", ["status"]);
}

export async function down(queryInterface, Sequelize) {
  // Drop tables in reverse order
  await queryInterface.dropTable("integration_data");
  await queryInterface.dropTable("integrations");
}
