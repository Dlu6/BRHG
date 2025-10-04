import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import amiService from "../services/amiService.js";

const execAsync = promisify(exec);
const ASTERISK_DIR = "/etc/asterisk";
const MAYDAY_DIR = `${ASTERISK_DIR}/mayday.d`;

const execSudo = async (command) => {
  try {
    const { stdout, stderr } = await execAsync(`sudo ${command}`);
    if (stderr) console.error(`Command warning: ${stderr}`);
    return stdout;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    throw error;
  }
};

export const setupIVRConfig = async () => {
  try {
    // 1. Create directory structure using sudo
    const directories = [
      `${MAYDAY_DIR}`,
      `${MAYDAY_DIR}/ivr`,
      `${MAYDAY_DIR}/includes`,
      `${MAYDAY_DIR}/contexts`,
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
        console.log(`Directory ${dir} exists`);
      } catch {
        console.log(`Creating directory ${dir}...`);
        await execSudo(`mkdir -p ${dir}`);
        await execSudo(`chown asterisk:asterisk ${dir}`);
        await execSudo(`chmod 755 ${dir}`);
      }
    }

    // 2. Create includes file.
    const includesContent = `; Mayday IVR Includes - Auto-generated
; Last updated: ${new Date().toISOString()}

#include mayday.d/ivr/*.conf
`;

    // Write to temp file first
    const tempIncludesPath = "/tmp/ivr_includes.conf";
    await fs.writeFile(tempIncludesPath, includesContent);
    await execSudo(`mv ${tempIncludesPath} ${MAYDAY_DIR}/includes/ivr.conf`);
    await execSudo(`chown asterisk:asterisk ${MAYDAY_DIR}/includes/ivr.conf`);
    await execSudo(`chmod 644 ${MAYDAY_DIR}/includes/ivr.conf`);

    // 3. Create main IVR context
    const contextContent = `; Mayday IVR Contexts - Auto-generated
; Last updated: ${new Date().toISOString()}

[mayday-ivr]
include => mayday-ivr-flows

[mayday-ivr-flows]
#include mayday.d/includes/ivr.conf
`;

    // Write to temp file first
    const tempContextPath = "/tmp/ivr_context.conf";
    await fs.writeFile(tempContextPath, contextContent);
    await execSudo(`mv ${tempContextPath} ${MAYDAY_DIR}/contexts/ivr.conf`);
    await execSudo(`chown asterisk:asterisk ${MAYDAY_DIR}/contexts/ivr.conf`);
    await execSudo(`chmod 644 ${MAYDAY_DIR}/contexts/ivr.conf`);

    // 4. Create main include file
    const mainIncludeContent = `; Mayday Main Configuration - Auto-generated
; Last updated: ${new Date().toISOString()}

#include "mayday.d/contexts/ivr.conf"
`;

    const tempMainPath = "/tmp/mayday.conf";
    await fs.writeFile(tempMainPath, mainIncludeContent);
    await execSudo(`mv ${tempMainPath} ${ASTERISK_DIR}/mayday.conf`);
    await execSudo(`chown asterisk:asterisk ${ASTERISK_DIR}/mayday.conf`);
    await execSudo(`chmod 644 ${ASTERISK_DIR}/mayday.conf`);

    // 5. Update extensions.conf
    const extensionsPath = `${ASTERISK_DIR}/extensions.conf`;
    try {
      const extensionsContent = await fs.readFile(extensionsPath, "utf8");
      if (!extensionsContent.includes("#include mayday.d/ivr/*.conf")) {
        const tempExtPath = "/tmp/extensions_append.conf";
        await fs.writeFile(tempExtPath, "\n#include mayday.d/ivr/*.conf\n");
        await execSudo(`cat ${tempExtPath} | sudo tee -a ${extensionsPath}`);
        await execSudo(`rm ${tempExtPath}`);
        await execSudo(`chown asterisk:asterisk ${extensionsPath}`);
      }
    } catch (error) {
      console.error("Error updating extensions.conf:", error);
    }

    // 6. Reload Asterisk dialplan
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "dialplan reload",
      });
    } catch (error) {
      console.error("Warning: Failed to reload dialplan:", error);
      // Continue execution as AMI might not be ready yet
    }

    console.log("IVR configuration setup completed successfully");
    return true;
  } catch (error) {
    console.error("Error setting up IVR configuration:", error);
    throw error;
  }
};
