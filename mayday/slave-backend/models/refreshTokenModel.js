// models/refreshTokenModel.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.UUID,
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
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
    indexes: [
      {
        name: "idx_refresh_token",
        fields: ["token"],
        unique: true,
      },
      {
        name: "idx_user_id",
        fields: ["userId"],
      },
      {
        name: "idx_expires_at",
        fields: ["expiresAt"],
      },
    ],
  }
);

export default RefreshToken;
