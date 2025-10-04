import sequelize from "../config/sequelize.js";
import { LicenseCache, ClientSession } from "../models/licenseModel.js";

const fixLicenseSchema = async () => {
  try {
    console.log("🔧 Checking license schema...");

    // Check if tables exist and have the correct structure
    const tablesToCheck = [
      { name: "license_caches", model: LicenseCache },
      { name: "client_sessions", model: ClientSession },
    ];

    for (const { name, model } of tablesToCheck) {
      try {
        // Check if table exists
        const tableExists = await sequelize.query(
          `SHOW TABLES LIKE '${name}'`,
          { type: sequelize.QueryTypes.SHOWTABLES }
        );

        if (tableExists.length === 0) {
          console.log(`⚠ Table ${name} does not exist, creating...`);
          await model.sync({ force: false });
          console.log(`✅ Created table: ${name}`);
        } else {
          console.log(`✅ Table ${name} exists`);

          // Check for missing columns by attempting to sync with alter
          try {
            await model.sync({ alter: true });
            console.log(`✅ Table ${name} schema is up to date`);
          } catch (syncError) {
            console.warn(`⚠ Could not sync table ${name}:`, syncError.message);
          }
        }
      } catch (error) {
        console.warn(`⚠ Error checking table ${name}:`, error.message);
      }
    }

    console.log("🎉 License schema check completed!");
  } catch (error) {
    console.error("❌ Error checking license schema:", error);
    // Don't throw error, just log it
    console.log("💡 Schema check failed, but continuing with startup...");
  }
};

export default fixLicenseSchema;
