import { DataTypes } from "sequelize";

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "server_licenses",
      "original_license_type_id",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "license_types",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "server_licenses",
      "original_license_type_id"
    );
  },
};
