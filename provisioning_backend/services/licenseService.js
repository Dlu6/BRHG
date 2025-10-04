const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const {
  LicenseType,
  ServerLicense,
  ClientSession,
  LicenseValidation,
} = require("../models/licenseModel");
const { emitLicenseUpdate } = require("./socketService");

const createLicenseService = () => {
  const privateKey = process.env.LICENSE_PRIVATE_KEY;
  const publicKey = process.env.LICENSE_PUBLIC_KEY;

  const generateServerLicense = async (
    organizationName,
    licenseTypeId,
    serverFingerprint,
    issued_at,
    expires_at
  ) => {
    const issuedAtDate = new Date(issued_at);
    const expirationDate = new Date(expires_at);

    const issuedAtTimestamp = Math.floor(issuedAtDate.getTime() / 1000);
    const expTimestamp = Math.floor(expirationDate.getTime() / 1000);

    const licenseData = {
      orgName: organizationName,
      typeId: licenseTypeId,
      serverFp: serverFingerprint,
      iat: issuedAtTimestamp,
      exp: expTimestamp,
    };

    const licenseKey = jwt.sign(licenseData, privateKey, {
      algorithm: "RS256",
    });

    const license = new ServerLicense({
      license_key: licenseKey,
      server_fingerprint: serverFingerprint,
      license_type_id: licenseTypeId,
      organization_name: organizationName,
      issued_at: issuedAtDate,
      expires_at: expirationDate,
      external_managed: false, // Locally generated license
      status: "active",
    });

    await license.save();

    return licenseKey;
  };

  const validateFingerprint = (stored, current) => {
    const storedComponents = stored.split("|");
    const currentComponents = current.split("|");

    let matches = 0;
    const minMatches = Math.ceil(storedComponents.length * 0.7); // 70% match threshold

    for (let i = 0; i < storedComponents.length; i++) {
      if (storedComponents[i] === currentComponents[i]) {
        matches++;
      }
    }

    return matches >= minMatches;
  };

  const logValidation = async (
    serverLicenseId,
    validationType,
    clientFingerprint,
    success,
    errorMessage
  ) => {
    const validation = new LicenseValidation({
      server_license_id: serverLicenseId,
      validation_type: validationType,
      client_fingerprint: clientFingerprint,
      success: success,
      error_message: errorMessage,
    });
    await validation.save();
  };

  const validateServerLicense = async (licenseKey, currentFingerprint) => {
    try {
      jwt.verify(licenseKey, publicKey, { algorithm: "RS256" });

      const license = await ServerLicense.findOne({
        license_key: licenseKey,
        status: "active",
      }).populate("license_type_id");

      if (!license) {
        throw new Error("License not found or inactive");
      }

      if (
        !validateFingerprint(license.server_fingerprint, currentFingerprint)
      ) {
        throw new Error("Hardware fingerprint mismatch");
      }

      license.last_validated = new Date();
      license.validation_count = license.validation_count + 1;
      await license.save();

      return {
        valid: true,
        licenseId: license._id,
        maxConcurrentUsers: license.license_type_id.max_concurrent_users,
        features: license.license_type_id.features,
      };
    } catch (error) {
      await logValidation(null, "server_startup", null, false, error.message);
      return { valid: false, error: error.message };
    }
  };

  const validateClientSession = async (sessionToken) => {
    console.log("🚀 Entered validateClientSession");
    try {
      console.log(
        "Verifying session token:",
        sessionToken.substring(0, 20) + "..."
      );
      const decoded = jwt.verify(sessionToken, publicKey, {
        algorithm: "RS256",
      });
      console.log("Decoded session token:", decoded);

      console.log("Finding active client session in DB...");
      const session = await ClientSession.findOne({
        session_token: sessionToken,
        status: "active",
      }).populate({
        path: "server_license_id",
        populate: {
          path: "license_type_id",
        },
      });

      if (!session) {
        console.error("Client session not found in DB or is inactive.");
        throw new Error("Client session not found or inactive");
      }
      console.log(
        "✅ Found active client session:",
        JSON.stringify(session, null, 2)
      );

      // Optional: check fingerprint
      // if (clientFingerprint && session.client_fingerprint !== clientFingerprint) {
      //     throw new Error('Client fingerprint mismatch');
      // }

      const validationResult = {
        valid: true,
        serverLicenseId: session.server_license_id._id,
        userId: session.user_id,
        maxConcurrentUsers:
          session.server_license_id.license_type_id.max_concurrent_users,
        features: session.server_license_id.license_type_id.features,
        license: session.server_license_id,
      };
      //   console.log(
      //     "✅ Session validation successful. Result:",
      //     JSON.stringify(validationResult, null, 2)
      //   );
      return validationResult;
    } catch (error) {
      console.error("❌ Client session validation failed:", error.message);
      return { valid: false, error: error.message };
    }
  };

  const generateClientToken = async (
    serverLicenseId,
    userId,
    clientFingerprint,
    sipUsername
  ) => {
    console.log("🚀 Entered generateClientToken with params:", {
      serverLicenseId,
      userId,
      clientFingerprint,
      sipUsername,
    });
    const sessionData = {
      serverLicenseId,
      userId,
      clientFp: clientFingerprint,
      sipUser: sipUsername,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };
    console.log("Client session data to be signed:", sessionData);

    const sessionToken = jwt.sign(sessionData, privateKey, {
      algorithm: "RS256",
    });
    console.log(
      "Generated client session token (first 20 chars):",
      sessionToken.substring(0, 20) + "..."
    );

    const clientSession = new ClientSession({
      session_token: sessionToken,
      server_license_id: serverLicenseId,
      user_id: userId,
      client_fingerprint: clientFingerprint,
      sip_username: sipUsername,
      expires_at: new Date(sessionData.exp * 1000),
    });
    await clientSession.save();

    console.log("✅ Client session saved to database.", clientSession);

    await redisClient.set(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      "EX",
      86400
    );
    console.log("✅ Client session saved to Redis.");

    return sessionToken;
  };

  const getSessionTokenForSipUser = async (sipUsername) => {
    const session = await ClientSession.findOne({
      sip_username: sipUsername,
      status: "active",
    }).sort({ created_at: -1 });
    return session ? session.session_token : null;
  };

  const getConcurrentUsers = async (serverLicenseId) => {
    const count = await redisClient.get(`concurrent_count:${serverLicenseId}`);
    return parseInt(count) || 0;
  };

  const incrementConcurrentUsers = (serverLicenseId) => {
    return redisClient.incr(`concurrent_count:${serverLicenseId}`);
  };

  const decrementConcurrentUsers = async (serverLicenseId) => {
    const current = await redisClient.decr(
      `concurrent_count:${serverLicenseId}`
    );
    if (current < 0) {
      await redisClient.set(`concurrent_count:${serverLicenseId}`, 0);
    }
    return Math.max(current, 0);
  };

  const generateServerFingerprint = async () => {
    // Server fingerprinting should be handled by the slave server
    // This is just a placeholder for the master server
    const crypto = require("crypto");
    return crypto.randomBytes(16).toString("hex");
  };

  const getOrCreateDefaultServerLicense = async (organizationName = null) => {
    console.log("🚀 Entered getOrCreateDefaultServerLicense");
    // Try to find an existing active server license
    let serverLicense = await ServerLicense.findOne({
      status: "active",
    })
      .populate("license_type_id")
      .sort({ _id: 1 });

    if (serverLicense) {
      console.log("Found existing active server license:", serverLicense._id);
    }

    if (!serverLicense) {
      // If no server license exists, create a default one
      console.log("No server license found, creating default license...");

      // First ensure we have a license type
      let licenseType = await LicenseType.findOne({
        name: "Developer",
      });

      if (!licenseType) {
        console.log(
          "'Developer' license type not found. Please seed the database first."
        );
        // As a fallback, create a very basic development type, though seeding is preferred.
        licenseType = new LicenseType({
          name: "Development (Fallback)",
          description: "Fallback license for testing",
          max_concurrent_users: 2,
          features: {
            calls: true,
            recording: true,
            transfers: true,
            conferences: true,
          },
          price_monthly: 0.0,
        });
        await licenseType.save();
      } else {
        console.log("Using 'Developer' license type for default generation.");
      }

      // Server fingerprint should be provided by the slave server
      // For now, use a placeholder that will be updated by the slave server
      const serverFingerprint = "placeholder_fingerprint_from_slave_server";
      const orgName = organizationName || "Trial License";
      console.log(
        `Generating new server license for '${orgName}' with placeholder fingerprint`
      );

      // Calculate 14-day trial dates
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + 14);

      const licenseKey = await generateServerLicense(
        orgName,
        licenseType._id,
        serverFingerprint,
        now.toISOString(), // issued_at
        expirationDate.toISOString() // expires_at (14-day trial)
      );
      console.log("Generated new license key.");

      // Fetch the newly created license
      serverLicense = await ServerLicense.findOne({
        license_key: licenseKey,
      }).populate("license_type_id");

      console.log(`Created default server license for: ${orgName}`);
    }
    // console.log(
    //   "Returning serverLicense:",
    //   JSON.stringify(serverLicense, null, 2)
    // );

    return serverLicense;
  };

  const manualSyncLicense = async () => {
    try {
      // In the new master/slave architecture, the slave server
      // doesn't sync from external sources. It only maintains
      // local license data and validates against it.
      const result = await getOrCreateDefaultServerLicense();
      if (result) {
        console.log("Local license retrieved successfully");
        emitLicenseUpdate({ type: "sync_success", license: result });
        return { success: true, license: result };
      } else {
        console.log("No local license found");
        return { success: false, message: "No license found" };
      }
    } catch (error) {
      console.error("Manual sync error:", error);
      return { success: false, error: error.message };
    }
  };

  return {
    generateServerLicense,
    validateServerLicense,
    generateClientToken,
    validateClientSession,
    validateFingerprint,
    logValidation,
    getSessionTokenForSipUser,
    getConcurrentUsers,
    incrementConcurrentUsers,
    decrementConcurrentUsers,
    getOrCreateDefaultServerLicense,
    generateServerFingerprint,
    manualSyncLicense,
  };
};

module.exports = createLicenseService;
