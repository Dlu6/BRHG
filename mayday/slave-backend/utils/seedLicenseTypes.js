// seedLicenseTypes.js - Slave Server Version
// This file is now a no-op since license types are managed by the master server

const seedLicenseTypes = async () => {
  console.log(
    "[License Types] Slave server - license types managed by master server"
  );
  console.log("[License Types] ✅ No seeding required on slave server");
  return;
};

// Helper function to check if a feature is enabled for a license type
export const hasFeature = (licenseType, featureName) => {
  if (!licenseType || !licenseType.features) return false;

  const features =
    typeof licenseType.features === "string"
      ? JSON.parse(licenseType.features)
      : licenseType.features;

  return Boolean(features[featureName]);
};

// Helper function to get all enabled features for a license type
export const getEnabledFeatures = (licenseType) => {
  if (!licenseType || !licenseType.features) return [];

  const features =
    typeof licenseType.features === "string"
      ? JSON.parse(licenseType.features)
      : licenseType.features;

  return Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
};

// Feature definitions - kept for reference
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

// Helper function to get feature description
export const getFeatureDescription = (featureName) => {
  return ALL_FEATURES[featureName] || `${featureName} feature`;
};

export const AllFeatures = ALL_FEATURES;
export default seedLicenseTypes;
