import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const DidInventory = sequelize.define(
  "did_inventory",
  {
    did: { type: DataTypes.STRING(32), primaryKey: true },
    outlet: { type: DataTypes.STRING(128), allowNull: true },
    trunk: { type: DataTypes.STRING(128), allowNull: true },
    route_type: { type: DataTypes.STRING(32), allowNull: true },
    route_value: { type: DataTypes.STRING(128), allowNull: true },
    callerid_name: { type: DataTypes.STRING(128), allowNull: true },
    last2: { type: DataTypes.STRING(2), allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    allow_outbound: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    allow_inbound: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "did_inventory",
    timestamps: false,
    freezeTableName: true,
  }
);

export default DidInventory;
