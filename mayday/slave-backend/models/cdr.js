import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const CDR = sequelize.define(
  "CDR",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    answer: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    clid: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    src: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    dst: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    dcontext: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    channel: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    dstchannel: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    lastapp: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    lastdata: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    billsec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    disposition: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "",
    },
    amaflags: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    accountcode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "",
    },
    uniqueid: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "",
    },
    userfield: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "cdr",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["start"],
      },
      {
        fields: ["src"],
      },
      {
        fields: ["dst"],
      },
      {
        fields: ["dcontext"],
      },
      {
        fields: ["clid"],
      },
    ],
  }
);

export default CDR;
