// models/networkConfigModel.js
import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

export const ExternIp = sequelize.define(
  "ExternIp",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIP: true,
      },
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "extern_ips",
  }
);

export const Stun = sequelize.define(
  "Stun",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    server: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidServer(value) {
          // Allow domain names, IP addresses, and stun/turn prefixes
          const domainRegex =
            /^(?:(?:stun|turn|turns)\.|[a-zA-Z0-9][a-zA-Z0-9.-]*\.)[a-zA-Z]{2,}$/;
          const ipRegex =
            /^(?:(?:stun|turn|turns):\/\/)?(\d{1,3}\.){3}\d{1,3}$/;

          if (!domainRegex.test(value) && !ipRegex.test(value)) {
            throw new Error("Server must be a valid STUN/TURN server address");
          }
        },
      },
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 65535,
      },
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "stun_servers",
  }
);

export const Turn = sequelize.define(
  "Turn",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    server: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 65535,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "turn_servers",
  }
);

export const LocalNet = sequelize.define(
  "LocalNet",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    network: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/, // Validates CIDR notation
      },
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "local_networks",
  }
);
