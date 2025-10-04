const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const { seedLicenseTypes } = require("./utils/seedLicenseTypes");

dotenv.config();

const seedAll = async () => {
  try {
    await connectDB();
    console.log("Database connected for seeding...");

    await seedLicenseTypes();

    console.log("All data seeded successfully! 🎉");
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
    console.log("Database connection closed.");
  }
};

seedAll();
