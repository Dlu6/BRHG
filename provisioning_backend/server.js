const http = require("http");
const app = require("./app");
const connectDB = require("./config/database");
const { initializeSocket } = require("./services/socketService");

// Load environment variables
require("dotenv").config();

const PORT = process.env.PORT || 8001;
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Connect to MongoDB
connectDB();

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});
