import sequelize from "../config/sequelize.js";

const addOriginalLicenseTypeColumn = async () => {
  try {
    console.log(
      "Adding original_license_type_id column to server_licenses table..."
    );

    // Add the column using raw SQL
    await sequelize.query(`
      ALTER TABLE server_licenses 
      ADD COLUMN original_license_type_id INT NULL,
      ADD CONSTRAINT fk_original_license_type 
      FOREIGN KEY (original_license_type_id) REFERENCES license_types(id) 
      ON UPDATE CASCADE ON DELETE SET NULL
    `);

    console.log("✅ Successfully added original_license_type_id column");
  } catch (error) {
    if (error.message.includes("Duplicate column name")) {
      console.log("✅ Column already exists, skipping...");
    } else {
      console.error("❌ Error adding column:", error.message);
      throw error;
    }
  }
};

// Run the script - always execute when file is run directly
console.log("Running addOriginalLicenseTypeColumn script...");
addOriginalLicenseTypeColumn()
  .then(() => {
    console.log("Column addition completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to add column:", error);
    process.exit(1);
  });

export default addOriginalLicenseTypeColumn;
