import sequelizePkg from "sequelize";
import sequelize from "../config/sequelize.js";
const { DataTypes } = sequelizePkg;

const QueueMember = sequelize.define(
  "queue_members",
  {
    uniqueid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    queue_name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    queue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "voice_queues",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    interface: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: "The technology/device interface (e.g., PJSIP/1001)",
    },
    membername: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "Display name of the queue member",
    },
    state_interface: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "Interface to watch for state changes",
    },
    penalty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Queue member penalty",
    },
    paused: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether the member is paused",
    },
    endpoint_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: "ps_endpoints",
        key: "id",
      },
      onDelete: "SET NULL",
    },
  },
  {
    tableName: "queue_members",
    timestamps: false,
    freezeTableName: true,
  }
);

export default QueueMember;
