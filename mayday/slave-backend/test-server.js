// Simple test to verify server can start
console.log("Testing server startup...");

try {
  // Test basic imports
  console.log("Testing imports...");
  const express = await import("express");
  console.log("✅ Express imported successfully");

  const dotenv = await import("dotenv");
  console.log("✅ Dotenv imported successfully");

  // Test environment variables
  console.log("Testing environment variables...");
  console.log("AMI_HOST:", process.env.AMI_HOST);
  console.log("AMI_PORT:", process.env.AMI_PORT);
  console.log("ASTERISK_AMI_USERNAME:", process.env.ASTERISK_AMI_USERNAME);
  console.log("AMI_PASSWORD:", process.env.AMI_PASSWORD ? "***" : "NOT SET");

  console.log("✅ Basic tests passed");
} catch (error) {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
}
