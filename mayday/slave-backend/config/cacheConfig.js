// Production cache configuration for license management
export const CACHE_CONFIG = {
  // License cache TTL (Time To Live) in milliseconds
  LICENSE_CACHE_TTL: process.env.LICENSE_CACHE_TTL || 30 * 60 * 1000, // 30 minutes default

  // Stale cache grace period (how long to use stale cache)
  STALE_GRACE_PERIOD: process.env.STALE_GRACE_PERIOD || 2 * 60 * 60 * 1000, // 2 hours

  // Background sync interval
  BACKGROUND_SYNC_INTERVAL:
    process.env.BACKGROUND_SYNC_INTERVAL || 15 * 60 * 1000, // 15 minutes

  // Maximum retry attempts for sync
  MAX_SYNC_RETRIES: process.env.MAX_SYNC_RETRIES || 3,

  // Retry delay in milliseconds
  SYNC_RETRY_DELAY: process.env.SYNC_RETRY_DELAY || 5000, // 5 seconds

  // Cache cleanup interval
  CLEANUP_INTERVAL: process.env.CLEANUP_INTERVAL || 60 * 60 * 1000, // 1 hour

  // Maximum age for failed cache entries before deletion
  FAILED_CACHE_MAX_AGE: process.env.FAILED_CACHE_MAX_AGE || 24 * 60 * 60 * 1000, // 24 hours

  // Network timeout for sync requests
  SYNC_TIMEOUT: process.env.SYNC_TIMEOUT || 10000, // 10 seconds

  // Enable/disable cache features
  ENABLE_CACHE: process.env.ENABLE_CACHE !== "false", // true by default
  ENABLE_BACKGROUND_SYNC: process.env.ENABLE_BACKGROUND_SYNC !== "false", // true by default
  ENABLE_CACHE_CLEANUP: process.env.ENABLE_CACHE_CLEANUP !== "false", // true by default
};

// Environment-specific overrides
export const getCacheConfig = () => {
  const config = { ...CACHE_CONFIG };

  if (process.env.NODE_ENV === "development") {
    // Shorter TTLs for development
    config.LICENSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    config.STALE_GRACE_PERIOD = 30 * 60 * 1000; // 30 minutes
    config.BACKGROUND_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    config.CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
  }

  if (process.env.NODE_ENV === "production") {
    // Longer TTLs for production stability
    config.LICENSE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
    config.STALE_GRACE_PERIOD = 4 * 60 * 60 * 1000; // 4 hours
    config.BACKGROUND_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
    config.CLEANUP_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
  }

  return config;
};

export default getCacheConfig;
