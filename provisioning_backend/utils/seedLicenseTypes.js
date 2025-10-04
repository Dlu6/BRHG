const { LicenseType } = require("../models/licenseModel");

// Feature definitions - aligned with external license management server
const ALL_FEATURES = {
  calls: "Core SIP calling functionalities",
  recording: "Call recording & review",
  voicemail: "Voicemail management",
  video: "Video calling",
  sms: "SMS messaging",
  transfers: "Attended and blind call transfers",
  conferences: "Multi-party conference calls",
  reports: "Analytics & reporting dashboard",
  crm: "Contact management & CRM integration",
  whatsapp: "WhatsApp messaging integration",
  salesforce: "Salesforce CRM integration",
  zoho: "Zoho CRM integration",
  twilio: "Twilio service integration",
  email: "Email integration",
  facebook: "Facebook Messenger integration",
  third_party_integrations: "Third-party system integrations",
  webrtc_extension: "WebRTC browser extension for softphone capabilities",
};

const seedLicenseTypes = async () => {
  // License types aligned with external license management server
  const licenseTypes = [
    {
      name: "Basic",
      description: "Essential features for small teams and individuals.",
      max_concurrent_users: 2,
      price_monthly: 29.99,
      external_managed: true,
      features: {
        calls: true,
        recording: true,
        transfers: true,
        conferences: true,
        reports: true,
        crm: true,
        voicemail: false,
        video: false,
        sms: false,
        whatsapp: false,
        salesforce: false,
        zoho: false,
        facebook: false,
        email: false,
        twilio: false,
        third_party_integrations: false,
        webrtc_extension: false, // Not included in Basic plan
      },
    },
    {
      name: "Professional",
      description:
        "Advanced features for growing businesses, including WebRTC extensions.",
      max_concurrent_users: 5,
      price_monthly: 79.99,
      external_managed: true,
      features: {
        calls: true,
        recording: true,
        transfers: true,
        conferences: true,
        reports: true,
        crm: true,
        whatsapp: true,
        sms: true,
        video: true,
        voicemail: true,
        email: true,
        salesforce: false,
        zoho: true,
        facebook: false,
        twilio: false,
        third_party_integrations: false,
        webrtc_extension: true, // WebRTC Extension enabled
      },
    },
    {
      name: "Enterprise",
      description:
        "Complete feature set for large-scale operations with full integrations.",
      max_concurrent_users: 25,
      price_monthly: 199.99,
      external_managed: true,
      features: {
        calls: true,
        recording: true,
        transfers: true,
        conferences: true,
        reports: true,
        crm: true,
        whatsapp: true,
        salesforce: true,
        zoho: true,
        twilio: true,
        third_party_integrations: true,
        sms: true,
        video: true,
        voicemail: true,
        facebook: true,
        email: true,
        webrtc_extension: true, // WebRTC Extension enabled
      },
    },
    {
      name: "Developer",
      description: "Default license with basic features for system operation.",
      max_concurrent_users: 1,
      price_monthly: 0.0,
      external_managed: false, // Local management for development
      features: {
        calls: true,
        recording: false,
        transfers: false,
        conferences: false,
        reports: true,
        crm: true,
        whatsapp: false,
        salesforce: false,
        zoho: true,
        twilio: false,
        third_party_integrations: true,
        sms: false,
        video: false,
        voicemail: false,
        facebook: false,
        email: false,
        webrtc_extension: true, // WebRTC Extension enabled for development
      },
    },
  ];

  try {
    console.log("[License Types] Seeding license types...");

    for (const typeData of licenseTypes) {
      // Check if license type already exists
      let existingType = await LicenseType.findOne({ name: typeData.name });

      if (!existingType) {
        // Create new license type
        const newType = new LicenseType(typeData);
        await newType.save();
        console.log(
          `✓ Created license type: ${newType.name} (WebRTC: ${
            typeData.features.webrtc_extension ? "Yes" : "No"
          })`
        );
      } else {
        // Update existing license type
        Object.assign(existingType, typeData);
        await existingType.save();
        console.log(
          `✓ Updated license type: ${existingType.name} (WebRTC: ${
            typeData.features.webrtc_extension ? "Yes" : "No"
          })`
        );
      }
    }

    console.log("[License Types] ✅ License type seeding completed");
  } catch (error) {
    console.error("❌ Error seeding license types:", error);
  }
};

// Helper function to check if a feature is enabled for a license type
const hasFeature = (licenseType, featureName) => {
  if (!licenseType || !licenseType.features) return false;

  const features =
    typeof licenseType.features === "string"
      ? JSON.parse(licenseType.features)
      : licenseType.features;

  return Boolean(features[featureName]);
};

// Helper function to get all enabled features for a license type
const getEnabledFeatures = (licenseType) => {
  if (!licenseType || !licenseType.features) return [];

  const features =
    typeof licenseType.features === "string"
      ? JSON.parse(licenseType.features)
      : licenseType.features;

  return Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
};

// Helper function to get feature description
const getFeatureDescription = (featureName) => {
  return ALL_FEATURES[featureName] || `${featureName} feature`;
};

module.exports = {
  seedLicenseTypes,
  hasFeature,
  getEnabledFeatures,
  getFeatureDescription,
  AllFeatures: ALL_FEATURES,
};
