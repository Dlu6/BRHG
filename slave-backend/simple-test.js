import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Testing .env loading...");

// Load .env
const envPath = path.join(__dirname, ".env");
console.log("Loading .env from:", envPath);

const result = dotenv.config({ path: envPath });
console.log("Dotenv result:", result);

console.log("Environment variables:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("HAS_DB_PASSWORD:", !!process.env.DB_PASSWORD);

console.log("Test completed successfully!");