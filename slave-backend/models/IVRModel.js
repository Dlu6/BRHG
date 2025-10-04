import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const IVRFlow = sequelize.define(
  "ivr_flow",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    blocks: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        return JSON.parse(this.getDataValue("blocks"));
      },
      set(value) {
        this.setDataValue("blocks", JSON.stringify(value));
      },
    },
    connections: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        return JSON.parse(this.getDataValue("connections"));
      },
      set(value) {
        this.setDataValue("connections", JSON.stringify(value));
      },
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue("metadata");
        return raw ? JSON.parse(raw) : null;
      },
      set(value) {
        this.setDataValue("metadata", JSON.stringify(value));
      },
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("draft", "published"),
      defaultValue: "draft",
    },
  },
  {
    timestamps: true,
  }
);

export default IVRFlow;
