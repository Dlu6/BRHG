import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Client Connected"));
redisClient.on("ready", () => console.log("Redis Client Ready"));
redisClient.on("end", () => console.log("Redis Client Disconnected"));

// Initialize Redis connection
const initializeRedis = async () => {
  try {
    // Avoid double-connecting
    if (redisClient.isOpen || redisClient.isReady) {
      console.log("ℹ️ Redis already connected");
      return true;
    }
    await redisClient.connect();
    console.log("✅ Redis connection established");
    return true;
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    return false;
  }
};

export { initializeRedis };
export default redisClient;
