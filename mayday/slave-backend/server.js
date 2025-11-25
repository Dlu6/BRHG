// server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import { json } from "express";
import redisClient, { initializeRedis } from "./config/redis.js";
import RedisStore from "connect-redis";
import bcrypt from "bcrypt";
import sequelize, { syncDatabase } from "./config/sequelize.js";
import contextRoutes from "./routes/contextRoutes.js";
import UserModel from "./models/usersModel.js";
import authRoutes from "./routes/UsersRoute.js";
import refreshTokenService from "./services/refreshTokenService.js";
// import sipRoutes from "./routes/sipRoutes.js";
// import asteriskRoutes from "./routes/asteriskRoute.mjs";
import trunkRoutes from "./routes/trunkRoute.mjs";
import inboundRoutes from "./routes/inboundRoute.mjs";
import outboundEndpoints from "./routes/outboundEndpoints.mjs";
import voiceQueueRoutes from "./routes/voiceQueueRoute.mjs";
import { socketService } from "./services/socketService.js";
// import { initializeAsteriskServices } from "./config/asterisk.js";
// import { ariService } from "./services/ariService.js"; // Commented out ARI service
import { EventEmitter } from "events";
import amiService from "./services/amiService.js";
import chalk from "chalk";
import { setupPJSIPAssociations } from "./models/associations.js";
import { PJSIPEndpoint, PJSIPAuth, PJSIPAor } from "./models/pjsipModel.js";
import { Contact, WhatsAppMessage } from "./models/WhatsAppModel.js";
import soundFileRoutes from "./routes/soundFileRoutes.js";
import networkConfigRoutes from "./routes/networkConfigRoutes.js";
import reportsRoute from "./routes/reportsRoute.js";
import systemRoute from "./routes/systemRoute.js";
import ivrRoutes from "./routes/ivrRoutes.js";
import odbcRoutes from "./routes/odbcRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import intervalRoutes from "./routes/intervalRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import licenseRoutes from "./routes/licenseRoute.js";
import callCostRoutes from "./routes/callCostRoutes.js";
import balanceVerificationRoutes from "./routes/balanceVerificationRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import agentStatusRoutes from "./routes/agentStatusRoutes.js";
// import dataToolRoute from "../datatool_server/routes/dataToolRoute.js";
import { callMonitoringService } from "./services/callMonitoringService.js";
import agentStatusService from "./services/agentStatusService.js";
// import CallRecords from "./models/callRecordsModel.js";
import { setupWhatsAppAssociations } from "./models/whatsappAssociations.js";
// import { fastAGIService } from "./services/fastAGIService.js";
import QueueMember from "./models/queueMemberModel.js";
import { VoiceQueue } from "./models/voiceQueueModel.js";
import { setupIVRConfig } from "./utils/setupIVRConfig.js";
import setupDefaultIntervals from "./utils/setupDefaultIntervals.js";
import cdrRoutes from "./routes/CdrRoute.js";
import adminRoutes from "./routes/adminRoutes.js";
import recordingRoutes from "./routes/recordingRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import { setupAssociations } from "./models/usersModel.js";
import { setupIntegrationAssociations } from "./models/associations.js";
import IntegrationModel from "./models/integrationModel.js";
import IntegrationDataModel from "./models/integrationDataModel.js";
// import VoiceExtension from "./models/voiceExtensionModel.js"; // Removed as unused
import {
  // LicenseType,
  // ServerLicense,
  // ClientSession,
  // LicenseValidation,
  setupLicenseAssociations,
} from "./models/licenseModel.js";
import { EmailModel, setupEmailAssociations } from "./models/emailModel.js";
import seedLicenseTypes from "./utils/seedLicenseTypes.js";
import {
  startCacheCleanupService,
  stopCacheCleanupService,
} from "./services/licenseService.js";
import masterServerService from "./services/masterServerService.js";
// import fixLicenseSchema from "./utils/fixLicenseSchema.js";
// Increase EventEmitter limit
EventEmitter.defaultMaxListeners = 15;

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
let io;

// Set up CORS options
const allowedOrigins = [
  "https://cs.brhgroup.co",
  // Environment-based origins
  process.env.SLAVE_SERVER_URL,
  process.env.MASTER_SERVER_URL,
  process.env.SLAVE_WEBSOCKET_URL,
  process.env.MASTER_WEBSOCKET_URL,

  // Legacy origins for backward compatibility
  `http://${process.env.PUBLIC_IP}:${process.env.PORT}`,
  `https://${process.env.PUBLIC_IP}:${process.env.PORT}`,
  `http://${process.env.PUBLIC_IP}:8088`,
  `https://${process.env.PUBLIC_IP}:8088`,
  `http://${process.env.PUBLIC_IP}`,
  `ws://${process.env.PUBLIC_IP}:${process.env.PORT}`,
  `wss://${process.env.PUBLIC_IP}:${process.env.PORT}`,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://localhost:8004",
  "ws://localhost:8004",
  `http://43.205.91.97:8004`,
  `ws://43.205.91.97:8004`,
  // `https://cs.lusuku.shop`,
  // `wss://cs.lusuku.shop`,
  // `ws://cs.lusuku.shop`,
  // `http://cs.lusuku.shop`,
  `https://e0f2-102-216-146-198.ngrok-free.app`,
  `https://maydaycrm.netlify.app`,
  `https://maydaycrm.com`,
  `https://www.maydaycrm.com`,

  // Chrome Extension Origins
  "chrome-extension://hfgmdmebieoidjbehhodimaghipehnhm",
  "chrome-extension://*",

  // Zoho CRM Domains
  "https://one.zoho.com",
  "https://*.zoho.com",
  "https://crm.zoho.com",
  "https://*.crm.zoho.com",
  "https://*.zoho.com/*",

  // Additional CRM domains
  // "https://*.cs.lusuku.shop",
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (extensions, curl) and allow dev ORIGINS
    if (!origin) {
      callback(null, true);
      return;
    }

    // Always allow our public domain and subdomains
    const brhgroupPattern =
      /^https?:\/\/([\w-]+\.)*cs\.brhgroup\.co(?::\d+)?$/i;
    if (brhgroupPattern.test(origin)) {
      callback(null, true);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      callback(null, true);
      return;
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.includes("*")) {
        const pattern = allowedOrigin
          .replace(/\./g, "\\.")
          .replace(/\*/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-internal-api-key",
  ],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Redis setup
let redisStore = new RedisStore({
  client: redisClient,
  ttl: 86400,
});

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Trust the first proxy
app.set("trust proxy", 1);

// Configure session middleware with Redis store
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: "auto",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(json());

// Add this before your route definitions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  // Set cache-busting headers to prevent browser caching
  res.set({
    "Cache-Control": "no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mayday Server Status</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; background-color: #f4f7f6; color: #333; }
        h1 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        .status-container { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status-text { font-size: 1.5em; font-weight: bold; }
        .running { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7;}
        .unreachable { background-color: #ffebee; color: #c62828; border: 1px solid #ef9a9a;}
        .checking { background-color: #e3f2fd; color: #1565c0; border: 1px solid #90caf9;}
        .info { background: #fff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
        .endpoints { margin-top: 20px; }
        .endpoint { margin-bottom: 10px; background: #eef2ff; padding: 10px; border-radius: 5px; }
        code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
        .timestamp { color: #666; font-size: 0.9em; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Mayday Backend Server</h1>
      
      <div id="status-container" class="status-container checking">
        <p id="status-text" class="status-text">Status: CHECKING...</p>
      </div>

      <div id="info-container" class="info" style="display:none;">
        <p><strong>Server Time:</strong> <span id="server-time"></span></p>
        <p><strong>Environment:</strong> <span id="environment"></span></p>
        <p><strong>Port:</strong> <span id="port"></span></p>
        <p><strong>Uptime:</strong> <span id="uptime"></span></s</p>
        <p class="timestamp"><strong>Last Check:</strong> <span id="last-checked"></span></p>
      </div>
      
      <div class="endpoints">
        <h2>Available Endpoints:</h2>
        <div class="endpoint">
          <p><strong>GET</strong> <code>/api/status</code> - Check server status</p>
        </div>
      </div>

      <script src="/status.js"></script>
    </body>
    </html>
  `);
});

// API status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.BACKEND_PORT || 8004,
    uptime: process.uptime(),
  });
});

// Routes
app.use("/api/users", authRoutes);
// app.use("/api/users/asterisk", asteriskRoutes);
app.use("/api/users/trunk", trunkRoutes);
app.use("/api/users/inbound_route", inboundRoutes);
app.use("/api/users/outbound_routes", outboundEndpoints);
app.use("/api/users/voice_queue", voiceQueueRoutes);
app.use("/api/users/sound_files", soundFileRoutes);
app.use("/api/users/network-config", networkConfigRoutes);
app.use("/api/users/reports", reportsRoute);
app.use("/api/reports", reportsRoute);
app.use("/api/users/system", systemRoute);
app.use("/api/users/ivr", ivrRoutes);
app.use("/api/users/odbc", odbcRoutes);
app.use("/api/users/intervals", intervalRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/cdr", cdrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/call-costs", callCostRoutes);
app.use("/api/balance-verification", balanceVerificationRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/agent-status", agentStatusRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api", contextRoutes);

// app.use("/api/sip", sipRoutes);

// Move static file serving after API routes
// Serve React build files from mayday-client-dashboard
app.use(
  express.static(path.join(__dirname, "../mayday-client-dashboard/build"))
);

// Fallback to index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../mayday-client-dashboard/build/index.html")
  );
});

// Admin initialization function
async function initializeAdmin() {
  try {
    // Check if admin exists
    const adminUser = await UserModel.findOne({ where: { username: "admin" } });

    // If no admin exists, create one using .env values
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_UI_USER_PASSWORD,
        10
      );

      await UserModel.create({
        id: uuidv4(),
        username: process.env.DEFAULT_UI_USERNAME || "admin",
        name: "Administrator",
        password: hashedPassword,
        email: "admin@mayday.com",
        fullName:
          process.env.DEFAULT_UI_USER_FULLNAME || "System Administrator",
        role: process.env.DEFAULT_UI_USER_ROLE || "admin",
        extension: "1000", // Changed from '999' to '1000' to match validation
        type: "friend",
        context: "from-internal",
        internal: 1000,
      });
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Failed to initialize admin:", error);
    throw error;
  }
}

const initializeAsteriskServices = async () => {
  try {
    // Check if AMI is already connected
    if (amiService.getState().connected) {
      console.log(chalk.green("🔥 AMI Service already connected 🔥"));
      return true;
    }

    // Initialize AMI with retry logic
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await amiService.connect();
        console.log(chalk.green("🔥 AMI Service connected 🔥"));
        return true;
      } catch (error) {
        retryCount++;
        console.warn(
          chalk.yellow(`AMI connection attempt ${retryCount} failed:`),
          error.message
        );

        if (retryCount < maxRetries) {
          console.log(
            chalk.blue(
              `Retrying AMI connection in 2 seconds... (${retryCount}/${maxRetries})`
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.error(chalk.red("All AMI connection attempts failed"));
          return false;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(chalk.red("Asterisk services initialization failed:"), error);
    return false;
  }
};

// No longer seeding outbound-dial; maintained in file-based dialplan

// Server initialization with proper error handling
const initializeApp = async () => {
  console.log(chalk.green("Initializing Asterisk services..."));
  try {
    if (!redisClient.isOpen && !redisClient.isReady) {
      await redisClient.connect();
      console.log(chalk.green("Redis client connected successfully"));
    } else {
      console.log(chalk.green("Redis client already connected"));
    }

    // Clear stale license session counters on startup
    console.log(chalk.blue("Clearing stale concurrent user counts..."));
    const stream = redisClient.scanIterator({
      MATCH: "concurrent_count:*",
      COUNT: 100,
    });
    for await (const key of stream) {
      await redisClient.del(key);
    }
    console.log(chalk.green("✓ Stale counts cleared."));

    console.log(chalk.blue("Attempting to connect to database...⌛️"));
    await syncDatabase();
    // await CallRecords.sync();
    console.log(chalk.green("Database synchronized successfully"));

    // Outbound helper is managed in file dialplan (extensions_mayday_context.conf)

    // Fix license schema before proceeding
    console.log(chalk.blue("Fixing license schema..."));
    // await fixLicenseSchema(); // Temporarily disabled to prevent data loss
    console.log(chalk.yellow("License schema fix is currently disabled."));

    // Only setup IVR configuration in production
    if (process.env.NODE_ENV === "production") {
      console.log(chalk.blue("Setting up IVR configuration..."));
      try {
        await setupIVRConfig();
        console.log(chalk.green("✓ IVR configuration setup complete"));
      } catch (error) {
        console.warn(
          chalk.yellow("⚠ IVR configuration setup skipped:"),
          error.message
        );
        // Continue initialization even if IVR setup fails
      }
    } else {
      console.log(
        chalk.yellow("⚠ Skipping IVR configuration setup in development")
      );
    }

    // Setup PJSIP transport configurations
    console.log(chalk.blue("Setting up PJSIP transport configurations..."));
    try {
      const { updatePJSIPTransports } = await import(
        "./utils/asteriskConfigWriter.js"
      );
      await updatePJSIPTransports();
      console.log(
        chalk.green("✓ PJSIP transport configurations setup complete")
      );
    } catch (error) {
      console.warn(
        chalk.yellow("⚠ PJSIP transport configuration setup skipped:"),
        error.message
      );
      console.log(
        chalk.yellow(
          "⚠ Please configure an external IP in Network Settings to enable trunk creation"
        )
      );
      // Continue initialization even if transport setup fails
    }

    // Initialize Socket.IO
    io = await socketService.initialize(httpServer);
    console.log(chalk.green("✓ Socket.IO initialized"));

    // Initialize Redis connection before starting cache cleanup service
    console.log(chalk.blue("Initializing Redis connection..."));
    try {
      const redisConnected = await initializeRedis();
      if (redisConnected) {
        console.log(chalk.green("✅ Redis connection established"));
      } else {
        console.warn(
          chalk.yellow(
            "⚠️ Redis connection failed, session cleanup will use database fallback"
          )
        );
      }
    } catch (error) {
      console.warn(
        chalk.yellow("⚠️ Redis initialization failed:"),
        error.message
      );
      console.log(
        chalk.yellow("⚠️ Session cleanup will use database fallback")
      );
    }

    // Start cache cleanup service
    startCacheCleanupService();
    console.log(chalk.green("Cache cleanup service started"));

    // Start server first
    const PORT = process.env.PORT || process.env.BACKEND_PORT;
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(chalk.green("Available routes:"));
      console.log(chalk.yellow("- /api/users/login (POST)"));
    });

    // Then continue with service initialization
    setupPJSIPAssociations(
      UserModel,
      { PJSIPEndpoint, PJSIPAuth, PJSIPAor },
      QueueMember,
      VoiceQueue
    );

    // Set up WhatsApp Associations
    setupWhatsAppAssociations(UserModel, { Contact, WhatsAppMessage });

    // Set up License Associations
    setupLicenseAssociations(UserModel);

    // Set up Email Associations
    const Email = EmailModel(sequelize);
    global.EmailModel = Email; // Make Email model available globally
    setupEmailAssociations(Email, {
      UserModel,
      CustomerModel: null,
      TicketModel: null,
    });

    // Initialize admin user first (this should always succeed)
    await initializeAdmin();
    console.log("Admin initialization complete 💯✅");

    // Initialize Asterisk services (this can fail without breaking the app)
    try {
      await initializeAsteriskServices();

      // Initialize call monitoring service after AMI is connected
      console.log(chalk.blue("Initializing call monitoring service..."));
      callMonitoringService.initialize();
      console.log(chalk.green("✅ Call monitoring service initialized"));

      // Initialize agent status service
      console.log(chalk.blue("Initializing agent status service..."));
      const agentStatusInitialized = await agentStatusService.initialize();
      if (agentStatusInitialized) {
        agentStatusService.start();
        console.log(
          chalk.green("✅ Agent status service initialized and started")
        );
      } else {
        console.warn(
          chalk.yellow("⚠️  Agent status service initialization failed")
        );
      }
    } catch (error) {
      console.warn(
        chalk.yellow("⚠ Asterisk services initialization failed:"),
        error.message
      );
      console.log(
        chalk.yellow("⚠ Application will continue without AMI connection")
      );
    }

    // Seed license types
    await seedLicenseTypes();

    // Initialize master server connection
    console.log(chalk.blue("Initializing master server connection..."));
    try {
      await masterServerService.initialize();
      console.log(chalk.green("✅ Master server connection initialized"));
    } catch (error) {
      console.warn(
        chalk.yellow("⚠ Master server connection failed:"),
        error.message
      );
      console.log(chalk.yellow("⚠ Running in standalone mode"));
    }

    // Initialize default intervals
    await setupDefaultIntervals();
    console.log("Default intervals setup complete ⏰✅");

    // WebSocket transports are now handled by socketService.js
    console.log(
      chalk.green("✅ WebSocket server initialized via socketService")
    );

    // Comment out ARI-related initialization
    // let asteriskInitialized = false;
    // let retryCount = 0;
    // const maxRetries = 3;

    // const checkAsteriskAvailability = async () => {
    //   const ariUrl = process.env.ARI_URL.replace(/\/$/, "");

    //   try {
    //     const auth = Buffer.from(
    //       `${process.env.ARI_USERNAME}:${process.env.ARI_PASSWORD}`
    //     ).toString("base64");

    //     // Test ARI applications endpoint directly
    //     console.log("Testing ARI availability...");
    //     const appsResponse = await fetch(`${ariUrl}/ari/applications`, {
    //       method: "GET",
    //       headers: {
    //         Authorization: `Basic ${auth}`,
    //         Accept: "application/json",
    //       },
    //     });

    //     // Even if we get a 404, it means ARI is working
    //     if (appsResponse.ok || appsResponse.status === 404) {
    //       console.log("ARI applications endpoint accessible");
    //       return true;
    //     }

    //     console.error("Failed to validate ARI connection");
    //     return false;
    //   } catch (error) {
    //     console.error("ARI connection error:", {
    //       message: error.message,
    //       code: error.code,
    //     });
    //     return false;
    //   }
    // };

    // Comment out the ARI initialization retry logic
    // while (!asteriskInitialized && retryCount < maxRetries) {
    //   try {
    //     console.log(
    //       `\nAttempting Asterisk initialization (attempt ${
    //         retryCount + 1
    //       }/${maxRetries})`
    //     );

    //     const isAvailable = await checkAsteriskAvailability();
    //     if (isAvailable) {
    //       // Initialize ARI service
    //       const ariInitialized = await ariService.initialize();
    //       if (!ariInitialized) {
    //         throw new Error("Failed to initialize ARI service");
    //       }
    //       asteriskInitialized = true;
    //       console.log(
    //         chalk.bgCyanBright("Asterisk services initialized successfully")
    //       );
    //     }
    //   } catch (error) {
    //     retryCount++;
    //     console.error(
    //       chalk.redBright(
    //         `Asterisk initialization attempt ${retryCount} failed:`
    //       ),
    //       error.message
    //     );

    //     if (retryCount < maxRetries) {
    //       const delay = 5000 * retryCount;
    //       console.log(`Retrying in ${delay / 1000} seconds...`);
    //       await new Promise((resolve) => setTimeout(resolve, delay));
    //     } else {
    //       console.warn(
    //         "Could not initialize Asterisk services. Continuing without Asterisk integration."
    //       );
    //       break;
    //     }
    //   }
    // }

    // Setup WebSocket handlers - Modify to remove ARI-dependent parts
    io.on("connection", async (socket) => {
      console.log("Client connected:", socket.id);

      // Authenticate the socket connection
      socket.on("authenticate", async (data) => {
        try {
          const { extension } = data;
          socket.extension = extension;
          socket.join(`extension_${extension}`);
          // Comment out ARI-dependent status check
          // const status = await ariService.checkPeerAvailability(extension);
          // socket.emit("initial_status", status);

          // Instead, send a default status
          socket.emit("initial_status", { state: "unknown", online: false });
        } catch (error) {
          console.error("Socket authentication error:", error);
          socket.emit("auth_error", { message: "Authentication failed" });
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    // try {
    //   console.log(chalk.blue("Starting FastAGI Server..."));
    //   await fastAGIService.start();
    //   console.log(
    //     chalk.green("✓ FastAGI Server started on port", fastAGIService.PORT)
    //   );
    // } catch (error) {
    //   console.error(chalk.red("✗ Failed to start FastAGI Server:"), error);
    //   console.error(chalk.red("Stack trace:"), error.stack);
    // }

    // Schedule refresh token cleanup job (runs every 24 hours)
    const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    console.log(chalk.blue("🔄 Scheduling refresh token cleanup job..."));

    // Run cleanup immediately on startup
    try {
      const cleanedCount = await refreshTokenService.cleanupExpiredTokens();
      console.log(
        chalk.green(
          `✓ Initial cleanup: Removed ${cleanedCount} expired refresh tokens`
        )
      );
    } catch (error) {
      console.error(chalk.red("✗ Initial cleanup failed:"), error);
    }

    // Schedule recurring cleanup
    const cleanupInterval = setInterval(async () => {
      try {
        console.log(
          chalk.blue("🔄 Running scheduled refresh token cleanup...")
        );
        const cleanedCount = await refreshTokenService.cleanupExpiredTokens();
        console.log(
          chalk.green(
            `✓ Cleanup complete: Removed ${cleanedCount} expired refresh tokens`
          )
        );
      } catch (error) {
        console.error(chalk.red("✗ Scheduled cleanup failed:"), error);
      }
    }, CLEANUP_INTERVAL);

    // Store cleanup interval for graceful shutdown
    global.refreshTokenCleanupInterval = cleanupInterval;
    console.log(
      chalk.green(`✓ Refresh token cleanup scheduled (every 24 hours)`)
    );
  } catch (error) {
    console.error(chalk.red("✗ Failed to initialize app:"), error);
    process.exit(1);
  }
};

async function cleanup() {
  console.log("Starting server cleanup...");

  try {
    // Clear refresh token cleanup interval
    if (global.refreshTokenCleanupInterval) {
      clearInterval(global.refreshTokenCleanupInterval);
      console.log("Refresh token cleanup interval cleared");
    }

    // Stop cache cleanup service
    stopCacheCleanupService();
    console.log("Cache cleanup service stopped");

    // Shutdown master server connection
    masterServerService.shutdown();
    console.log("Master server connection shutdown");

    // Cleanup Redis connection
    if (redisClient?.isReady) {
      try {
        await redisClient.quit();
        console.log("Redis connection closed");
      } catch (redisError) {
        console.warn("Redis cleanup warning:", redisError.message);
      }
    }

    // Cleanup socket connections
    // Comment out ARI-dependent cleanup
    await callMonitoringService.cleanup();
    await socketService.cleanup();

    // Comment out ARI cleanup
    // await ariService.cleanup();

    // Close HTTP server
    await new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("Cleanup completed successfully");

    // await new Promise((resolve) => {
    //   fastAGIService.stop();
    //   resolve();
    // });
  } catch (error) {
    console.error("Cleanup error:", error);
    throw error;
  }
}

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Starting graceful shutdown...");
  try {
    await cleanup();
    // Comment out ARI-related cleanup
    // await initializeAsteriskServices.cleanup();
    httpServer.close(() => {
      console.log("Server shut down successfully");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Add this logic after imports and before the main application logic
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Don't exit immediately
  setTimeout(() => {
    console.error("Shutting down due to uncaught exception");
    process.exit(1);
  }, 1000);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit immediately
  setTimeout(() => {
    console.error("Shutting down due to unhandled rejection");
    process.exit(1);
  }, 1000);
});

// Call the setupAssociations function after models are imported
setupAssociations();

// Setup integration associations
setupIntegrationAssociations(IntegrationModel, IntegrationDataModel);

initializeApp();

export { app, httpServer };
