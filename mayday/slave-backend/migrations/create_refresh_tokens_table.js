import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  // Create refresh_tokens table
  await queryInterface.createTable("refresh_tokens", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    clientFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Client device/browser fingerprint for additional security",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create indexes for better performance
  await queryInterface.addIndex("refresh_tokens", ["token"], {
    name: "idx_refresh_token",
    unique: true,
  });
  await queryInterface.addIndex("refresh_tokens", ["userId"], {
    name: "idx_user_id",
  });
  await queryInterface.addIndex("refresh_tokens", ["expiresAt"], {
    name: "idx_expires_at",
  });
}

export async function down(queryInterface, Sequelize) {
  // Drop table
  await queryInterface.dropTable("refresh_tokens");
}


