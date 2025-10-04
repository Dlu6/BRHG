module.exports = {
  apps: [
    {
      name: "hugamara-backend",
      script: "./backend/server.js",
      cwd: "/home/admin/hugamara-portal",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DB_HOST: "127.0.0.1",
        DB_PORT: 3306,
        DB_NAME: "hugamara_db",
        DB_USER: "hugamara_user",
        DB_PASSWORD: "Pasword@256",
        DB_SSL: "false",
      },
      error_file: "./logs/hugamara-backend-error.log",
      out_file: "./logs/hugamara-backend-out.log",
      log_file: "./logs/hugamara-backend-combined.log",
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
    {
      name: "mayday-callcenter-backend",
      script: "./mayday/slave-backend/server.js",
      cwd: "/home/admin/hugamara-portal",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5001, // Changed from 3002 to 5001
        BACKEND_PORT: 5001, // Explicit for status endpoints and logs
        DB_HOST: "127.0.0.1",
        DB_PORT: 3306,
        DB_NAME: "asterisk",
        DB_USER: "asterisk",
        DB_PASSWORD: "",
        // DB_PASSWORD: "", // No password for root user on localhost
        DB_SSL: "false",
        // Recording files base directory (Asterisk monitor path)
        RECORDING_BASE_DIR: "/var/spool/asterisk/monitor",

        // SLAVE SERVER CONFIGURATION (THIS SERVER)
        SLAVE_SERVER_URL: "https://cs.hugamara.com",
        SLAVE_SERVER_API_URL: "https://cs.hugamara.com/mayday-api",
        SLAVE_WEBSOCKET_URL: "wss://cs.hugamara.com",
        SLAVE_SERVER_DOMAIN: "cs.hugamara.com",
        // WebRTC/SIP hostnames for WSS registration
        PUBLIC_IP: "cs.hugamara.com",
        ASTERISK_HOST: "cs.hugamara.com",
        ASTERISK_SIP_PORT: "8088",

        // Redis Configuration
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6379",
        // REDIS_PASSWORD: "RedLotuskm@1759",

        // AMI Configuration
        AMI_HOST: "127.0.0.1",
        AMI_PORT: "5038",
        ASTERISK_AMI_USERNAME: "mayday_ami_user",
        AMI_PASSWORD: "Maydayami@256",

        // Security
        JWT_SECRET: "Mayday-Produjwt-secret-key-1759",
        SESSION_SECRET: "Lotuskm@1759mayday_secure_session_secret_production",

        // License Keys (Production)
        LICENSE_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDY+9b/qT5zDR47\nKxLJzU2xpICisakAE/9Xefaz9vtHmKfS9Edw9waCX4L0lZUN5qenN2T2fZVwOyex\nrnFHy2uoxhkA54dPe3mvf6amf4wM2+qltcsfkOBpxyXZhBe/FwE73a7t/chKaKVF\nuOnqY/Y7WL7lvuTitqiQMu+i3ahCPJs+R7LlKEZBvt/fy+WGgJX2gDgJdL2yKyPq\nUgNb4lTY3/CPJOg+eY/9IfTtxSFa4Rv7qM5cYcpeMLX07IaBcpXy/NodVA1Lm9py\nmjyqA269OHBD7G2nmhga3ixrDYA9ac01o79yVdEdYIepTRqD6XcpfNXlNpuYuOAJ\nlTRqP8bBAgMBAAECggEAEdr/gUBbHDqbH0FXJXYYi6K+1ySJhLEglQE7VOnhGa4t\nOUXSzy/0wCu96gSZJHCzoSYEz+fbsUWc6ZkyRzctH9FVY2aqEtdVVyTJAPCEBNbg\nA0znbyyL2wiBS9n73kS1XEjMyVbV8ZGU8BzcWuZo789Ivj0sNp/TVTJr19onq3OM\naNbJ0IsQXXa1G5GR1GblIePcbyZ/5jXiD8kEsuUqqaRT49f0PpQjl4/JdUC5B077\ncXfCuy8kfOpzPDLXt+UWn7lj4XQrkZCTYtW6BpRbhhUPPg+eCtUxXTP2WSt2omSm\nHbOJMS2rJwqlQHfQcGqY/coWKvSfHDg7kN14WTiUBQKBgQD+CPyHPCyfOHOB5PfV\nAtesnjT5sDTOyE6amhjH8RG2c4TkbVhlswsk07hLn030+mf7IGjw70V2SeWfUuHD\nRNC7pTsAegIIGhJcg3IFJY4NJR2h5wHdTJIwNV6nN6QDTTy/jos2AwhxfoNuthSJ\nvvb7Mg/Vo+fb5CLzs/eTGCs0pwKBgQDaqXz7XlH0k1Sk1nuEGj6OQx+CXv8iw2wF\npniIXlZDyWuvCYy1Hwqhev5tlrRlGcqYygIxfw9WZwjcsKil9gHz5f1MzhZl8qJF\n5r/vKQPgykBu/fwrgpvbcNn4ToaYhkJj4xz03txhuRN7ofN0g6z4aWUfiP7nKN5G\nqcbGjQpOVwKBgC1VDzNW0qOrIDmq0WsKsdAU/2EbR6Eq75P5MbjkVQPZA3r75E1p\nsPBmc7nS+MdhtBKFSxTLrfqY30gaMz10V0dVCf1gyGIHvQUTU9KFTB8eY3ZT0epa\n0q+VpolyjWslalTIrCD8U5JlQDEOfwXBtTNIULkQIb0ErhQNJn3yTyt7AoGAUua1\nYtwUuGRvT/udYq1MkEU0mgoIMxbiSpYd1p3lmNexwvAc78JwFl76PXRIupf3rsvP\n3xIsL3bq7jjwB9PoU58b1NXBui8uhNACbtsfBEfJ/ArBY4GmM6FqknC7KPKmExbV\nMKWZ6lbv4wy4r7EIkDntQ/J9qghdlW7i1P4+LQsCgYAJ8yog6C4XCDneMoopxTKb\nv5CrEkig8nAsUPwzUX+dA/TyfdF9PJgY4ofXCZ/imf2zUTQ3Zj0Sxwzr/DKBH8K5\nI+eTJinmY++zcyNSoYG6oujyG/UzmXoWGhtCkL41wUsZ8vWK65ecx2X25OkA5itH\nCjN1VYwkvVsPXmWmupfw7w==\n-----END PRIVATE KEY-----\n",
        LICENSE_PUBLIC_KEY:
          "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2PvW/6k+cw0eOysSyc1N\nsaSAorGpABP/V3n2s/b7R5in0vRHcPcGgl+C9JWVDeanpzdk9n2VcDsnsa5xR8tr\nqMYZAOeHT3t5r3+mpn+MDNvqpbXLH5Dgaccl2YQXvxcBO92u7f3ISmilRbjp6mP2\nO1i+5b7k4raokDLvot2oQjybPkey5ShGQb7f38vlhoCV9oA4CXS9sisj6lIDW+JU\n2N/wjyToPnmP/SH07cUhWuEb+6jOXGHKXjC19OyGgXKV8vzaHVQNS5vacpo8qgNu\nvThwQ+xtp5oYGt4saw2APWnNNaO/clXRHWCHqU0ag+l3KXzV5TabmLjgCZU0aj/G\nwQIDAQAB\n-----END PUBLIC KEY-----\n",
        SECRET_INTERNAL_API_KEY:
          "aVeryLongAndRandomSecretStringForInternalComms_987654321_production",

        // Master Server Configuration (Production License Management)
        MASTER_SERVER_URL:
          "https://mayday-website-backend-c2abb923fa80.herokuapp.com",
        MASTER_SERVER_API_URL:
          "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api",
        MASTER_WEBSOCKET_URL:
          "wss://mayday-website-backend-c2abb923fa80.herokuapp.com",

        // License Management API
        LICENSE_MGMT_API_URL:
          "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api",
        LICENSE_MGMT_API_KEY: "maydayLicMgmtApiKey1759_production",

        // License Configuration
        LICENSE_CACHE_TTL: "1800000",
        STALE_GRACE_PERIOD: "7200000",
        BACKGROUND_SYNC_INTERVAL: "900000",
        MAX_SYNC_RETRIES: "3",
        SYNC_RETRY_DELAY: "5000",
        CLEANUP_INTERVAL: "3600000",
        FAILED_CACHE_MAX_AGE: "86400000",
        SYNC_TIMEOUT: "10000",

        // Feature flags
        ENABLE_CACHE: "true",
        ENABLE_BACKGROUND_SYNC: "true",
        ENABLE_CACHE_CLEANUP: "true",

        // Default Admin User
        DEFAULT_UI_USERNAME: "admin",
        DEFAULT_UI_USER_PASSWORD: "Pasword@256",
        DEFAULT_UI_USER_FULLNAME: "System Administrator",
        DEFAULT_UI_USER_ROLE: "admin",
        DEFAULT_ADMIN_EMAIL: "medhi.matovu@gmail.com",
        DEFAULT_ADMIN_EXTENSION: "999",

        // Session Management
        SESSION_CLEANUP_INTERVAL: "900000",
        SESSION_TTL: "86400",
        SESSION_HEARTBEAT_INTERVAL: "30000",
        SESSION_EXPIRY_THRESHOLD: "1800000",
        SESSION_HEARTBEAT_FAILURE_THRESHOLD: "90000",
        REDIS_SESSION_TTL: "1800000",
        REDIS_SESSION_CLEANUP_INTERVAL: "300000",

        // ========== WHATSAPP PROVIDER CONFIGURATION ==========
        // Choose your WhatsApp provider: "facebook" or "lipachat"
        WHATSAPP_PROVIDER: "facebook",

        // ========== FACEBOOK WHATSAPP BUSINESS API ==========
        // Facebook WhatsApp Business API configuration (Recommended)
        WHATSAPP_API_URL: "https://graph.facebook.com/v18.0",
        WHATSAPP_ACCESS_TOKEN: "your_facebook_access_token",
        WHATSAPP_PHONE_NUMBER_ID: "your_phone_number_id",
        WHATSAPP_BUSINESS_ACCOUNT_ID: "your_business_account_id",
        WHATSAPP_VERIFY_TOKEN: "your_verify_token",

        // ========== LIPACHAT WHATSAPP CONFIGURATION ==========
        // Lipachat API configuration for WhatsApp Business (Alternative)
        LIPACHAT_API_KEY:
          "55d6305cf8e27aee1783b9e4f8b6ba7c-2f57ab67-4353-46f1-85cf-88ec6c7f75d6",
        LIPACHAT_PHONE_NUMBER: "+15557612891",
        LIPACHAT_GATEWAY_URL: "https://gateway.lipachat.com/api/v1/whatsapp",
        LIPACHAT_WEBHOOK_SECRET: "your_webhook_secret",

        // ========== RATE LIMITING ==========
        // Rate limiting configuration for WhatsApp API calls
        RATE_LIMIT_WINDOW_MS: "900000",
        RATE_LIMIT_MAX_REQUESTS: "100",

        // ========== WHATSAPP WEBHOOK CONFIGURATION ==========
        // Webhook endpoints for receiving WhatsApp messages
        WHATSAPP_WEBHOOK_URL: "https://cs.hugamara.com/api/whatsapp/webhook",
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: "your_webhook_verify_token",

        // ========== WHATSAPP MESSAGE CONFIGURATION ==========
        // Message handling and template configuration
        WHATSAPP_MESSAGE_TIMEOUT: "30000",
        WHATSAPP_TEMPLATE_APPROVAL_REQUIRED: "true",
        WHATSAPP_MEDIA_UPLOAD_TIMEOUT: "60000",
        WHATSAPP_MAX_MESSAGE_LENGTH: "4096",
        WHATSAPP_MAX_MEDIA_SIZE_MB: "16",

        // ========== WHATSAPP CONVERSATION MANAGEMENT ==========
        // Conversation and agent management settings
        WHATSAPP_CONVERSATION_TIMEOUT: "1800000", // 30 minutes
        WHATSAPP_AGENT_RESPONSE_TIMEOUT: "300000", // 5 minutes
        WHATSAPP_AUTO_ASSIGN_ENABLED: "true",
        WHATSAPP_QUEUE_MAX_SIZE: "100",
        WHATSAPP_CONVERSATION_CLEANUP_INTERVAL: "3600000", // 1 hour

        // ========== WHATSAPP NOTIFICATION CONFIGURATION ==========
        // Real-time notification settings
        WHATSAPP_NOTIFICATION_ENABLED: "true",
        WHATSAPP_SOUND_NOTIFICATIONS: "true",
        WHATSAPP_EMAIL_NOTIFICATIONS: "false",
        WHATSAPP_SLACK_NOTIFICATIONS: "false",

        // ========== WHATSAPP ANALYTICS ==========
        // Analytics and reporting configuration
        WHATSAPP_ANALYTICS_ENABLED: "true",
        WHATSAPP_METRICS_RETENTION_DAYS: "90",
        WHATSAPP_PERFORMANCE_TRACKING: "true",

        // Trunk Provider Configuration
        TRUNK_PROVIDER_AUTH_HEADER: "MDMyMDAwMDAwODoxMy4yMzQuMTguMg==",
        TRUNK_PROVIDER_VALIDATE_URL:
          "https://ug.cyber-innovative.com:444/cyber-api/cyber_validate.php",

        // SMS Provider Configuration
        SMS_PROVIDER_BASE_URL: "https://sms.cyber-innovative.com/secure",
        SMS_PROVIDER_OVERRIDE_IP: "41.77.78.156", // optional; for DNS issues
        SMS_PROVIDER_STRICT_TLS: "false", // "true" if not using override IP
        // Use either USER/PASS or AUTH header (prefer user/pass)
        SMS_PROVIDER_USERNAME: "medhi",
        SMS_PROVIDER_PASSWORD: "Mayday@#1759!",
        // SMS_PROVIDER_AUTH: "Basic bWVkaGk6THVzdWt1QCMyMDI1IQ==",
        SMS_DEFAULT_SENDER: "Hugamara",
        SMS_DLR_URL: "https://cs.hugamara.com/api/sms/dlr",
      },
      error_file: "./logs/mayday-backend-error.log",
      out_file: "./logs/mayday-backend-out.log",
      log_file: "./logs/mayday-backend-combined.log",
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
    // Removed the mayday-callcenter-frontend since nginx will serve static files
  ],
};
