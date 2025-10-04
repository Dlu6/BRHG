import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const SoundFile = sequelize.define(
  "sound_files",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    format: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "ux_sound_files_filename",
        unique: true,
        fields: ["filename"],
      },
    ],
  }
);

export default SoundFile;
