import { syncDatabase } from "../config/sequelize.js";

(async () => {
  try {
    await syncDatabase();
    console.log("✓ All tables synced successfully");
    process.exit(0);
  } catch (err) {
    console.error("✗ Sync failed:", err);
    process.exit(1);
  }
})();