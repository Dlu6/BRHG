import sequelizePkg from "sequelize";
import sequelize from "../config/sequelize.js";
const { DataTypes } = sequelizePkg;

export const VoiceQueue = sequelize.define(
  "voice_queues",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(128),
      //   allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("inbound", "outbound"),
      allowNull: false,
      defaultValue: "inbound",
    },
    musiconhold: {
      // Changed to match Asterisk's exact parameter name
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: "default",
    },
    strategy: {
      type: DataTypes.ENUM(
        "ringall",
        "leastrecent",
        "fewestcalls",
        "random",
        "rrmemory",
        "linear",
        "wrandom"
      ),
      allowNull: false,
      defaultValue: "rrmemory",
    },
    servicelevel: {
      // Changed to match Asterisk's exact parameter name
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
    },
    context: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: "from-queue",
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 15,
    },
    retry: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2,
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    wrapuptime: {
      // Changed to match Asterisk's exact parameter name
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2,
    },
    maxlen: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    autopause: {
      // Changed to match Asterisk's exact parameter name
      type: DataTypes.ENUM("yes", "no", "all"),
      allowNull: true,
      defaultValue: "no",
    },
    autofill: {
      // Changed to match Asterisk's exact parameter name
      type: DataTypes.ENUM("yes", "no"),
      allowNull: true,
      defaultValue: "yes",
    },
    setinterfacevar: {
      // Changed to match Asterisk's exact parameter name
      type: DataTypes.ENUM("yes", "no"),
      allowNull: true,
      defaultValue: "no",
    },
    setqueuevar: {
      type: DataTypes.ENUM("yes", "no"),
      allowNull: true,
      defaultValue: "no",
    },
    announce_frequency: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    periodic_announce_frequency: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    announce_holdtime: {
      type: DataTypes.ENUM("yes", "no", "once"),
      allowNull: true,
      defaultValue: "no",
    },
    announce_position: {
      type: DataTypes.ENUM("yes", "no", "limit", "more"),
      allowNull: true,
      defaultValue: "no",
    },
    joinempty: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: "yes",
    },
    leavewhenempty: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: "no",
    },
    ringinuse: {
      type: DataTypes.ENUM("yes", "no"),
      allowNull: true,
      defaultValue: "no",
    },
    reportholdtime: {
      type: DataTypes.ENUM("yes", "no"),
      allowNull: true,
      defaultValue: "no",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "voice_queues",
    timestamps: true,
    freezeTableName: true, // This prevents Sequelize from pluralizing the table name
    indexes: [
      {
        name: "ux_voice_queues_name",
        unique: true,
        fields: ["name"],
      },
    ],
  }
);
