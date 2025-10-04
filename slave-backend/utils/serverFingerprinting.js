import os from "os";
import crypto from "crypto";
import { execSync } from "child_process";

export const getCPUInfo = async () => {
  try {
    const cpuInfo = os.cpus()[0];
    return crypto
      .createHash("sha256")
      .update(cpuInfo.model + cpuInfo.speed)
      .digest("hex")
      .substring(0, 16);
  } catch {
    return "unknown_cpu";
  }
};

export const getDiskSerial = async () => {
  try {
    let serial;
    if (process.platform === "linux") {
      try {
        serial = execSync("lsblk -no SERIAL | head -1", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
      } catch {
        serial = os.hostname() + "_disk";
      }
    } else if (process.platform === "win32") {
      try {
        serial = execSync("wmic diskdrive get serialnumber /value", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        })
          .split("\n")
          .find((line) => line.includes("SerialNumber="))
          ?.split("=")[1]
          ?.trim();
      } catch {
        serial = os.hostname() + "_disk";
      }
    } else if (process.platform === "darwin") {
      try {
        serial = execSync(
          "diskutil info / | grep 'Volume UUID' | awk '{print $3}'",
          {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        ).trim();
      } catch {
        serial = os.hostname() + "_disk";
      }
    }
    return serial || os.hostname() + "_disk";
  } catch {
    return os.hostname() + "_disk";
  }
};

export const getMacAddress = async () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.mac !== "00:00:00:00:00:00") {
        return iface.mac;
      }
    }
  }
  return "unknown_mac";
};

export const getMotherboardSerial = async () => {
  try {
    let serial;
    if (process.platform === "linux") {
      try {
        // Try dmidecode first
        serial = execSync("dmidecode -s baseboard-serial-number", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
      } catch (dmidecodeError) {
        // If dmidecode is not available, try alternative methods
        try {
          serial = execSync("cat /sys/class/dmi/id/board_serial", {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          }).trim();
        } catch (catError) {
          // If all methods fail, use hostname as fallback
          serial = os.hostname() + "_board";
        }
      }
    } else if (process.platform === "win32") {
      try {
        serial = execSync("wmic baseboard get serialnumber /value", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        })
          .split("\n")
          .find((line) => line.includes("SerialNumber="))
          ?.split("=")[1]
          ?.trim();
      } catch {
        serial = os.hostname() + "_board";
      }
    } else if (process.platform === "darwin") {
      try {
        serial = execSync(
          "system_profiler SPHardwareDataType | awk '/Serial Number/ {print $4}'",
          {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        ).trim();
      } catch {
        serial = os.hostname() + "_board";
      }
    }
    return serial || os.hostname() + "_board";
  } catch {
    return os.hostname() + "_board";
  }
};

export const generateFingerprint = async () => {
  const components = [
    await getCPUInfo(),
    await getDiskSerial(),
    await getMacAddress(),
    await getMotherboardSerial(),
    os.hostname(),
  ];

  return components.join("|");
};
