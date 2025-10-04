// intervalModel.js
import { DataTypes } from "sequelize";
import sequelize from "../config/sequelize.js";

const Interval = sequelize.define(
  "interval",
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "fixed",
    },
    timeRange: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: { from: "00:00", to: "23:59" },
    },
    weekDays: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    monthDays: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    months: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "intervals",
    timestamps: true,
  }
);

export default Interval;
