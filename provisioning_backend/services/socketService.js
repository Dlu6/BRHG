const { Server } = require("socket.io");

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins for simplicity, tighten in production
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
  });

  io.on("connection", (socket) => {
    console.log("A client connected to the master license server");

    // Handle slave server connections
    socket.on("slave_connected", (data) => {
      console.log("Slave server connected:", data.serverFingerprint);
      socket.serverFingerprint = data.serverFingerprint;
    });
  });

  return io;
};

const emitLicenseUpdate = (fingerprint) => {
  if (io) {
    console.log(`📡 Emitting license:updated for fingerprint: ${fingerprint}`);
    io.emit("license:updated", {
      serverFingerprint: fingerprint,
      timestamp: new Date().toISOString(),
      message: "License has been updated on master server",
    });
  } else {
    console.warn("⚠️ Socket.IO not initialized, cannot emit license update");
  }
};

module.exports = { initializeSocket, emitLicenseUpdate };
