const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const adminRoutes = require("./routes/adminRoutes");
const licenseRoutes = require("./routes/licenseRoutes");
const slaveServerRoutes = require("./routes/slaveServerRoutes");

const app = express();

// Security middleware
app.use(helmet());
// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:8001",
  "https://maydaycrm.netlify.app",
  "https://www.maydaycrm.com",
  "https://maydaycrm.com",
  "https://mayday-website-backend-c2abb923fa80.herokuapp.com",
].filter(Boolean); // Removes any falsy values if env vars are not set

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked for origin 🔥🔥🔥: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-internal-api-key"],
  })
);

// Logging middleware
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/admin", adminRoutes);

// Landing page route
app.get("/", (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  const env = process.env.NODE_ENV || "development";
  const port = process.env.PORT || 8001;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Mayday Provisioning Backend API</title>
      <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Roboto', Arial, sans-serif;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: #fff;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(0,0,0,0.6);
          border-radius: 16px;
          padding: 40px 32px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          max-width: 420px;
          text-align: center;
        }
        h1 {
          font-size: 2.2rem;
          margin-bottom: 0.5em;
          letter-spacing: 1px;
        }
        .info {
          margin: 1.5em 0;
          font-size: 1.1rem;
        }
        .badge {
          display: inline-block;
          background: #4fd1c5;
          color: #222;
          border-radius: 12px;
          padding: 0.3em 1em;
          margin: 0.2em;
          font-weight: bold;
          font-size: 0.95em;
        }
        .footer {
          margin-top: 2em;
          font-size: 0.95em;
          color: #b2f5ea;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Mayday Provisioning Backend API</h1>
        <div class="info">
          <span class="badge">Uptime: ${hours}h ${minutes}m ${seconds}s</span><br/>
          <span class="badge">Environment: ${env}</span><br/>
          <span class="badge">Port: ${port}</span>
        </div>
        <p>Welcome to the <strong>Mayday Backend API</strong>.<br/>
        This server powers the Mayday platform.<br/>
        <a href="/api/health" style="color:#4fd1c5;text-decoration:underline;">Check API Health</a></p>
        <div class="footer">&copy; ${new Date().getFullYear()} Mayday CRM 2025.</div>
      </div>
    </body>
    </html>
  `);
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Mayday Backend API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || 8001,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/slave-servers", slaveServerRoutes);

// Custom error handler middleware
app.use(errorHandler);

module.exports = app;
