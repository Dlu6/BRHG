import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const OdbcConnection = sequelize.define(
  "odbc_connection",
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
    dsn: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    indexes: [
      {
        name: "ux_odbc_connection_name",
        unique: true,
        fields: ["name"],
      },
    ],
  }
);

export default OdbcConnection;
