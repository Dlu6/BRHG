const { LicenseType } = require("./models/licenseModel");
const connectDB = require("./config/database");

async function updateEnterpriseLicenseType() {
  try {
    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Find the Enterprise license type
    const enterpriseLicense = await LicenseType.findOne({
      name: "Enterprise",
    });

    if (!enterpriseLicense) {
      console.log("❌ Enterprise license type not found");
      return;
    }

    console.log(
      "📋 Current Enterprise license features:",
      enterpriseLicense.features
    );

    // Parse current features
    let features = enterpriseLicense.features;
    if (typeof features === "string") {
      features = JSON.parse(features);
    }

    // Ensure zoho feature is enabled
    features.zoho = true;

    console.log("🔄 Updated features:", features);

    // Update the license type
    enterpriseLicense.features = features;
    await enterpriseLicense.save();

    console.log("✅ Enterprise license type updated with zoho feature");
    console.log("🔄 Please restart your servers to see the changes");
  } catch (error) {
    console.error("❌ Error updating Enterprise license type:", error);
  } finally {
    process.exit(0);
  }
}

updateEnterpriseLicenseType();
