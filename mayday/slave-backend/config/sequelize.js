// config/sequelize.js
import Sequelize from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check different possible .env locations with slave-backend .env as priority
const possiblePaths = [
  path.join(__dirname, "../.env"), // slave-backend/.env (primary)
  path.join(process.cwd(), ".env"), // current directory .env
  path.join(__dirname, ".env"), // config/.env
  path.join(__dirname, "../../.env"), // project root .env (fallback)
  path.join(process.cwd(), "../.env"), // project root .env (alternate path)
];

// Load .env from the first existing path
let envFound = false;
let envPath;

for (const path of possiblePaths) {
  const exists = fs.existsSync(path);
  if (exists && !envFound) {
    envFound = true;
    envPath = path;
  }
}

if (!envFound) {
  throw new Error("No .env file found in any of the possible locations");
}

const result = dotenv.config({ path: envPath });

if (result.error) {
  throw new Error(`Could not load .env file from ${envPath}`);
}

// Validate required environment variables
const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  // DB_PASSWORD intentionally not required to support passwordless local/root
  "DB_NAME",
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const { Op } = Sequelize;

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false, // Disable SQL logging
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  }
);

export { sequelize, Op };

export const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Import models
    const UserModel = (await import("../models/usersModel.js")).default;
    const {
      PJSIPEndpoint,
      PJSIPAuth,
      PJSIPAor,
      PJSIPContact,
      PJSIPTransport,
      PJSIPIdentify,
    } = await import("../models/pjsipModel.js");
    const { VoiceQueue } = await import("../models/voiceQueueModel.js");
    const QueueMember = (await import("../models/queueMemberModel.js")).default;
    const InboundRoute = (await import("../models/inboundRouteModel.js"))
      .default;
    const OutboundRouteModule = await import("../models/outboundRouteModel.js");
    const OutboundRoute =
      OutboundRouteModule.default || OutboundRouteModule.OutboundRoute;
    const OutboundRouteApplication =
      OutboundRouteModule.OutboundRouteApplication;
    const Interval = (await import("../models/intervalModel.js")).default;
    const VoiceExtension = (await import("../models/voiceExtensionModel.js"))
      .default;
    const CDR = (await import("../models/cdr.js")).default;
    const CallCost = (await import("../models/callCostModel.js")).default;
    const SoundFile = (await import("../models/soundFileModel.js")).default;
    const OdbcConnection = (await import("../models/odbcModel.js")).default;
    const { Contact, WhatsAppMessage, WhatsAppConfig, Conversation } =
      await import("../models/WhatsAppModel.js");
    const IVRFlow = (await import("../models/IVRModel.js")).default;
    const IntegrationModel = (await import("../models/integrationModel.js"))
      .default;
    const IntegrationDataModel = (
      await import("../models/integrationDataModel.js")
    ).default;
    const DialplanContext = (await import("../models/dialplanContextModel.js"))
      .default;
    const {
      LicenseCache,
      LicenseValidation,
      FingerprintHistory,
      ClientSession,
    } = await import("../models/licenseModel.js");
    const SmsMessage = (await import("../models/SmsMessage.js")).default;
    const { ExternIp, Stun, Turn, LocalNet } = await import(
      "../models/networkConfigModel.js"
    );
    const { EmailModel } = await import("../models/emailModel.js");
    const RefreshToken = (await import("../models/refreshTokenModel.js")).default;

    // Single transaction for all DDL
    const tx = await sequelize.transaction();
    try {
      // Base tables
      await UserModel.sync({ force: false, transaction: tx });
      await RefreshToken.sync({ force: false, transaction: tx });
      await PJSIPAuth.sync({ force: false, transaction: tx });
      await PJSIPAor.sync({ force: false, transaction: tx });
      await PJSIPTransport.sync({ force: false, transaction: tx });

      // Dependent PJSIP tables
      await PJSIPEndpoint.sync({ force: false, transaction: tx });
      await PJSIPContact.sync({ force: false, transaction: tx });

      // Queues
      await VoiceQueue.sync({ force: false, transaction: tx });
      await QueueMember.sync({ force: false, transaction: tx });

      // Routes and dialplan
      await Interval.sync({ force: false, transaction: tx });
      await OutboundRoute.sync({ force: false, transaction: tx });
      if (OutboundRouteApplication) {
        await OutboundRouteApplication.sync({ force: false, transaction: tx });
      }
      await VoiceExtension.sync({ force: false, transaction: tx });
      await InboundRoute.sync({ force: false, transaction: tx });

      // Dialplan Contexts (new)
      await DialplanContext.sync({ force: false, transaction: tx });

      // Integrations
      await IntegrationModel.sync({ force: false, transaction: tx });
      await IntegrationDataModel.sync({ force: false, transaction: tx });

      // WhatsApp
      // Ensure base tables are created before FKs
      await Contact.sync({ force: false, transaction: tx });
      await WhatsAppConfig.sync({ force: false, transaction: tx });
      // Messages reference Contact and Conversation, create Conversation first
      await Conversation.sync({ force: false, transaction: tx });
      await WhatsAppMessage.sync({ force: false, transaction: tx });

      // Licensing
      await LicenseCache.sync({ force: false, transaction: tx });
      await ClientSession.sync({ force: false, transaction: tx });
      await LicenseValidation.sync({ force: false, transaction: tx });
      await FingerprintHistory.sync({ force: false, transaction: tx });

      // Misc
      await CDR.sync({ force: false, transaction: tx });
      await CallCost.sync({ force: false, transaction: tx });
      await SoundFile.sync({ force: false, transaction: tx });
      await OdbcConnection.sync({ force: false, transaction: tx });
      await IVRFlow.sync({ force: false, transaction: tx });

      // SMS
      await SmsMessage.sync({ force: false, transaction: tx }); // Sync the new model

      // Network Configuration models
      await ExternIp.sync({ force: false, transaction: tx });
      await Stun.sync({ force: false, transaction: tx });
      await Turn.sync({ force: false, transaction: tx });
      await LocalNet.sync({ force: false, transaction: tx });

      // Email model - note: uses constraints: false for associations
      const Email = EmailModel(sequelize);
      await Email.sync({ force: false, transaction: tx });

      await tx.commit();
      console.log("Database synchronized successfully");
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Error synchronizing database:", error);
    // Sync with alter: true to apply changes without dropping tables
    try {
      await sequelize.sync({ alter: true });
      console.log("Database synchronized with alter: true");
    } catch (alterError) {
      console.error("Error synchronizing with alter:", alterError);
      throw alterError; // Re-throw the error to indicate failure
    }
  }
};

export default sequelize;
