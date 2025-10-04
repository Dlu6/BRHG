export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("recording_ratings", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    filename: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    path: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    rating: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  // Create a unique index to prevent duplicate ratings for the same file
  await queryInterface.addIndex("recording_ratings", ["path", "filename"], {
    unique: true,
    name: "recording_ratings_path_filename_unique",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("recording_ratings");
};
