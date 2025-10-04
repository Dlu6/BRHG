import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const DialplanContext = sequelize.define(
  "dialplan_contexts",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      // Asterisk context name, e.g. from-internal-villa
      type: DataTypes.STRING(80),
      allowNull: false,
      // Unique constraint is defined via a named index below to avoid duplicate auto indexes
    },
    include: {
      // Optional context to include (e.g. internal or from-internal-custom)
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    realtimeKey: {
      // Realtime dialplan key (defaults to name)
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: "ux_dialplan_contexts_name",
        unique: true,
        fields: ["name"],
      },
    ],
  }
);

export default DialplanContext;
