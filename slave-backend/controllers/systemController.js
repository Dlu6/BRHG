import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { createClient } from "redis";
import mysql from "mysql2/promise";
import { hostname, platform, release, arch, cpus } from "os";
import { execSync } from "child_process";
import { getAmiState } from "../config/amiClient.js";
// import amiService from "../services/amiService.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getDiskSpace = async () => {
  try {
    const { stdout } = await execAsync("df -h / | tail -1");
    const [, total, used, free] = stdout.trim().split(/\s+/);
    return {
      total: total.replace("G", ""),
      used: used.replace("G", ""),
      free: free.replace("G", ""),
    };
  } catch (error) {
    console.error("Disk space check failed:", error);
    return null;
  }
};

export const getSystemInfo = async (req, res) => {
  // Check if we're in development environment
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  console.log("System Info Check - Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    isDev: isDev,
    AMI_HOST: process.env.AMI_HOST,
    AMI_PORT: process.env.AMI_PORT,
    ASTERISK_AMI_USERNAME: process.env.ASTERISK_AMI_USERNAME,
  });

  try {
    let cpu = {
      total: "0.0",
      user: "0.0",
      system: "0.0",
    };
    let memoryUsage = "0.0";
    let diskSpace = null;
    let services = {
      asterisk: false,
      redis: false,
      mysql: false,
      pm2: false,
      ami: false,
      ari: false,
    };
    let updateHistory = [];
    let systemDetails = {
      hostname: hostname(),
      platform: platform(),
      release: release(),
      architecture: arch(),
      cpuModel: cpus()[0].model,
      cpuCores: cpus().length,
    };

    if (!isDev) {
      // Production environment - check real services
      try {
        // Get CPU usage using vmstat
        const { stdout: vmstatOut } = await execAsync("vmstat 1 2 | tail -1");
        const vmstatParts = vmstatOut.trim().split(/\s+/);

        // Calculate CPU usage: 100 - idle%
        const idlePercent = parseInt(vmstatParts[14], 10);
        const userPercent = parseInt(vmstatParts[12], 10);
        const systemPercent = parseInt(vmstatParts[13], 10);

        // Total CPU usage = user + system
        cpu = {
          total: (userPercent + systemPercent).toFixed(1),
          user: userPercent.toFixed(1),
          system: systemPercent.toFixed(1),
        };

        // Log for debugging
        console.log("CPU Stats:", {
          idle: idlePercent,
          user: userPercent,
          system: systemPercent,
          total: cpu.total,
        });
      } catch (e) {
        console.error("CPU check failed:", e);
        cpu = {
          total: "0.0",
          user: "0.0",
          system: "0.0",
        };
      }

      // Check services only in production
      try {
        if (process.env.REDIS_ENABLED === "true") {
          const redisClient = createClient({
            url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
            socket: {
              host: process.env.REDIS_HOST || "127.0.0.1",
              port: parseInt(process.env.REDIS_PORT || "6379"),
              connectTimeout: 1000,
              family: 4, // Force IPv4
            },
          });
          await redisClient.connect();
          const pong = await redisClient.ping();
          services.redis = pong === "PONG";
          await redisClient.quit();
        } else {
          services.redis = true; // Mark as true if Redis is not required
        }
      } catch (e) {
        console.error("Redis check failed:", e);
        services.redis = false;
      }

      try {
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        });
        await connection.ping();
        services.mysql = true;
        await connection.end();
      } catch (e) {
        console.error("MySQL check failed:", e);
      }

      // Check Asterisk status using AMI connection as proxy
      try {
        const amiState = getAmiState();
        services.asterisk = amiState.connected;
        console.log("Asterisk status (via AMI):", amiState.connected);
      } catch (e) {
        console.error("Asterisk check failed:", e);
        services.asterisk = false;
      }

      try {
        const { stdout } = await execAsync("pm2 list");
        services.pm2 = stdout.includes("mayday");
      } catch (e) {
        console.error("PM2 check failed:", e);
      }

      try {
        const { stdout: logContent } = await execAsync(
          "tail -n 10 /var/log/mayday-deployment.log"
        );
        updateHistory = logContent
          .split("\n")
          .filter((line) =>
            line.includes("System update completed successfully")
          )
          .map((line) => ({
            date: line.split(" - ")[0],
            version: "2.0.0",
          }));
      } catch (e) {
        console.error("Update history check failed:", e);
      }

      // Add disk space check
      try {
        diskSpace = await getDiskSpace();
      } catch (e) {
        console.error("Disk space check failed:", e);
      }

      // Check AMI status using the same method as health endpoint
      try {
        const amiState = getAmiState();
        services.ami = amiState.connected;
        console.log("AMI Status from client:", amiState);
      } catch (e) {
        console.error("AMI check failed:", e);
        services.ami = false;
      }

      // Check ARI status
      try {
        const { stdout: ariStatus } = await execAsync(
          'asterisk -rx "ari show status"'
        );
        services.ari = ariStatus.includes("Enabled");
      } catch (e) {
        console.error("ARI check failed:", e);
      }
    } else {
      // Development environment - return mock data
      cpu = {
        total: "25.0",
        user: "25.0",
        system: "25.0",
      };
      memoryUsage = "40.0";
      services = {
        asterisk: true,
        redis: true,
        mysql: true,
        pm2: true,
        ami: true,
        ari: true,
      };
      updateHistory = [
        {
          date: new Date().toISOString(),
          version: "2.0.0",
        },
        {
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          version: "0.9.9",
        },
      ];
      diskSpace = {
        total: "500.00",
        free: "250.00",
        used: "250.00",
      };
      systemDetails = {
        hostname: "dev-machine",
        platform: "darwin",
        release: "20.0.0",
        architecture: "x64",
        cpuModel: "Intel(R) Core(TM) i7",
        cpuCores: 8,
      };
    }

    // Get memory usage (works in both environments)
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    memoryUsage = isDev
      ? "40.0"
      : (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

    let gitInfo = {
      lastCommit: "",
      branch: "",
      commitDate: "",
    };

    try {
      gitInfo = {
        lastCommit: execSync('git log -1 --format="%h - %s"').toString().trim(),
        branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
        commitDate: execSync('git log -1 --format="%cd" --date=iso')
          .toString()
          .trim(),
      };
    } catch (e) {
      console.error("Git info check failed:", e);
    }

    res.json({
      version: "2.0.0",
      uptime: os.uptime(),
      systemHealth: {
        cpu,
        memory: memoryUsage,
        disk: diskSpace,
      },
      systemDetails,
      services,
      updateHistory,
      gitInfo,
    });
  } catch (error) {
    console.error("Error getting system info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get system info",
      error: error.message,
    });
  }
};

export const updateSystem = async (req, res) => {
  try {
    const scriptPath = path
      .join(__dirname, "../../update_and_restart_after_gitpull.sh")
      .replace("Scratch", "Scracth");

    await execAsync(`chmod +x ${scriptPath}`);

    try {
      const { stdout, stderr } = await execAsync(
        `REDIS_ENABLED=${process.env.REDIS_ENABLED || "false"} ` +
          `DB_HOST=${process.env.DB_HOST} ` +
          `DB_USER=${process.env.DB_USER} ` +
          `DB_PASSWORD=${process.env.DB_PASSWORD} ` +
          `REDIS_HOST=${process.env.REDIS_HOST} ` +
          `GH_TOKEN=${process.env.GH_PAT} ` +
          `GH_REPO=${process.env.GH_REPO} bash ${scriptPath}`
      );

      if (
        stderr &&
        !stderr.includes("Receiving objects") &&
        !stderr.includes("Resolving deltas")
      ) {
        throw new Error(stderr);
      }

      res.json({
        success: true,
        message: "System update completed successfully",
        details: stdout,
      });
    } catch (execError) {
      throw new Error(`Update failed: ${execError.message}`);
    }
  } catch (error) {
    console.error("Error updating system:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update system",
      error: error.message,
      rollbackStatus: error.message.includes("Rollback completed successfully")
        ? "success"
        : "failed",
    });
  }
};

// Public, non-sensitive server configuration for UI defaults/placeholders
export const getPublicConfig = async (req, res) => {
  try {
    const slaveUrl = process.env.SLAVE_SERVER_URL || "";
    const slaveApiRoot = (process.env.SLAVE_SERVER_API_URL || "").replace(
      /\/$/,
      ""
    );
    const publicApiBase = slaveApiRoot ? `${slaveApiRoot}/api` : "";
    const wsUrl = process.env.SLAVE_WEBSOCKET_URL || "";
    const domain =
      process.env.SLAVE_SERVER_DOMAIN || process.env.ASTERISK_HOST || "";

    res.json({
      success: true,
      server: {
        url: slaveUrl,
        apiRoot: slaveApiRoot,
        publicApiBase,
        websocketUrl: wsUrl,
        domain,
        asteriskHost: process.env.ASTERISK_HOST || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to read config",
    });
  }
};
