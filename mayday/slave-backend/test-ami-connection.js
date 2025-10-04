#!/usr/bin/env node
// In production, we test this by running node test-ami-connection.js
import net from "net";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, "../.env");
console.log("Loading .env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("Error loading .env:", result.error);
  process.exit(1);
}

const host = process.env.AMI_HOST;
const port = process.env.AMI_PORT;
const username = process.env.ASTERISK_AMI_USERNAME;
const password = process.env.AMI_PASSWORD;

console.log("=== AMI Connection Test ===");
console.log("Environment variables:");
console.log(`AMI_HOST: ${host}`);
console.log(`AMI_PORT: ${port}`);
console.log(`ASTERISK_AMI_USERNAME: ${username}`);
console.log(`AMI_PASSWORD: ${password ? "***SET***" : "NOT SET"}`);
console.log("");

if (!host || !port || !username || !password) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

console.log(`🔌 Attempting to connect to ${host}:${port}...`);

const client = net.createConnection({ host, port }, () => {
  console.log("✅ TCP connection established");

  // Send login action
  const loginAction = `Action: Login\r\nUsername: ${username}\r\nSecret: ${password}\r\nEvents: system,call,all\r\n\r\n`;
  console.log("🔐 Sending login credentials...");
  client.write(loginAction);
});

client.on("data", (data) => {
  const message = data.toString();
  console.log("📨 Received data:");
  console.log(message);

  if (message.includes("Response: Success")) {
    console.log("✅ AMI authentication successful!");
    client.end();
    process.exit(0);
  } else if (message.includes("Response: Error")) {
    console.log("❌ AMI authentication failed");
    client.end();
    process.exit(1);
  } else if (message.includes("Asterisk Call Manager")) {
    console.log("✅ Connected to Asterisk AMI");
  }
});

client.on("error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

client.on("end", () => {
  console.log("🔌 Connection ended");
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log("⏰ Connection timeout");
  client.destroy();
  process.exit(1);
}, 10000);
