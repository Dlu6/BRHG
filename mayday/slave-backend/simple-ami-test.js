#!/usr/bin/env node
// In production, we test this by running node simple-ami-test.js
import net from "net";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, "../.env");
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

const host = process.env.AMI_HOST || "127.0.0.1";
const port = process.env.AMI_PORT || 5038;
const username = process.env.ASTERISK_AMI_USERNAME || "mayday-ami-user";
const password = process.env.AMI_PASSWORD || "Maydayami@256";

console.log("=== Simple AMI Test ===");
console.log(`Host: ${host}`);
console.log(`Port: ${port}`);
console.log(`Username: ${username}`);
console.log(`Password: ${password ? "***SET***" : "NOT SET"}`);
console.log("");

console.log(`🔌 Connecting to ${host}:${port}...`);

const client = net.createConnection({ host, port }, () => {
  console.log("✅ TCP connection established");
});

client.on("data", (data) => {
  const message = data.toString();
  console.log("📨 Received:", message);

  if (message.includes("Asterisk Call Manager")) {
    console.log("✅ Connected to Asterisk AMI");

    // Send login
    const loginAction = `Action: Login\r\nUsername: ${username}\r\nSecret: ${password}\r\nEvents: system,call,all\r\n\r\n`;
    console.log("🔐 Sending login...");
    client.write(loginAction);
  }

  if (message.includes("Response: Success")) {
    console.log("✅ Login successful!");
    client.end();
    process.exit(0);
  }

  if (message.includes("Response: Error")) {
    console.log("❌ Login failed");
    client.end();
    process.exit(1);
  }
});

client.on("error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

client.on("end", () => {
  console.log("🔌 Connection ended");
});

setTimeout(() => {
  console.log("⏰ Timeout - no response");
  client.destroy();
  process.exit(1);
}, 15000);
