import IVRFlow from "../models/IVRModel.js";
import fs from "fs/promises";
import amiService from "../services/amiService.js";
import { EventBusService } from "../services/eventBus.js";
// import { fastAGIService } from "../services/fastAGIService.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

export const saveIVRFlow = async (req, res) => {
  try {
    const { name, description, blocks, connections, created_by, metadata } =
      req.body;

    if (!name || !blocks || !connections || !created_by) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newFlow = await IVRFlow.create({
      name,
      description,
      blocks,
      connections,
      metadata,
      created_by,
      status: "draft",
    });

    res.status(201).json({
      success: true,
      message: "IVR flow saved successfully",
      data: newFlow,
    });
  } catch (error) {
    console.error("Error saving IVR flow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save IVR flow",
      error: error.message,
    });
  }
};

export const getIVRFlow = async (req, res) => {
  try {
    const flow = await IVRFlow.findByPk(req.params.id);
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: "IVR flow not found!",
      });
    }

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    console.error("Error retrieving IVR flow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve IVR flow",
      error: error.message,
    });
  }
};

export const getAllIVRFlows = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const flows = await IVRFlow.findAll({
      where: { created_by: userId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: flows,
    });
  } catch (error) {
    console.error("Error retrieving IVR flows:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve IVR flows",
      error: error.message,
    });
  }
};

export const updateIVRFlow = async (req, res) => {
  try {
    const { name, description, blocks, connections } = req.body;
    const flow = await IVRFlow.findByPk(req.params.id);

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: "IVR flow not found",
      });
    }

    await flow.update({
      name,
      description,
      blocks,
      connections,
    });

    res.json({
      success: true,
      message: "IVR flow updated successfully",
      data: flow,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update IVR flow",
      error: error.message,
    });
  }
};

export const deleteIVRFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const flow = await IVRFlow.findOne({
      where: {
        id,
        created_by: userId,
      },
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: "IVR flow not found or you don't have permission to delete it",
      });
    }

    await flow.destroy();

    res.json({
      success: true,
      message: "IVR flow deleted successfully",
      id: id,
    });
  } catch (error) {
    console.error("Error deleting IVR flow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete IVR flow",
      error: error.message,
    });
  }
};

export const publishIVRFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const flow = await IVRFlow.findByPk(id);

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: "IVR flow not found",
      });
    }

    // Parse if string, or use directly if already object
    const blocks =
      typeof flow.blocks === "string" ? JSON.parse(flow.blocks) : flow.blocks;
    const connections =
      typeof flow.connections === "string"
        ? JSON.parse(flow.connections)
        : flow.connections;
    const metadata =
      typeof flow.metadata === "string"
        ? JSON.parse(flow.metadata)
        : flow.metadata;

    // Basic validation
    if (!blocks.find((b) => b.type === "Start")) {
      return res.status(400).json({
        success: false,
        message: "Flow must have a Start block",
      });
    }

    if (!blocks.find((b) => b.type === "End")) {
      return res.status(400).json({
        success: false,
        message: "Flow must have an End block",
      });
    }

    // Validate connections
    const validationErrors = [];

    // Check if all blocks (except End) have outgoing connections
    blocks.forEach((block) => {
      if (block.type !== "End") {
        const hasOutgoing = connections.some((c) => c.from === block.id);
        if (!hasOutgoing) {
          validationErrors.push(
            `Block "${block.type}" has no outgoing connection`
          );
        }
      }
    });

    // Check if all connections reference valid blocks
    connections.forEach((conn) => {
      const fromBlock = blocks.find((b) => b.id === conn.from);
      const toBlock = blocks.find((b) => b.id === conn.to);

      if (!fromBlock) {
        validationErrors.push(
          `Connection references non-existent source block: ${conn.from}`
        );
      }
      if (!toBlock) {
        validationErrors.push(
          `Connection references non-existent target block: ${conn.to}`
        );
      }
    });

    // Validate block configurations for asteriskagi compatibility
    blocks.forEach((block) => {
      switch (block.type) {
        case "Menu":
          if (!block.data?.prompt)
            validationErrors.push("Menu block missing prompt");
          if (!block.data?.timeout)
            validationErrors.push("Menu block missing timeout");
          if (!block.data?.maxDigits)
            validationErrors.push("Menu block missing maxDigits");
          break;

        case "InternalDial":
          if (!block.data?.extension)
            validationErrors.push("InternalDial block missing extension");
          if (!block.data?.timeout)
            validationErrors.push("InternalDial block missing timeout");
          break;

        case "Queue":
          if (!block.data?.queueName)
            validationErrors.push("Queue block missing queue name");
          if (!block.data?.timeout)
            validationErrors.push("Queue block missing timeout");
          if (!block.data?.announceFrequency)
            validationErrors.push("Queue block missing announce frequency");
          // Optional validations
          if (block.data?.agi && typeof block.data.agi !== "string")
            validationErrors.push("Queue block AGI must be a string");
          if (block.data?.macro && typeof block.data.macro !== "string")
            validationErrors.push("Queue block macro must be a string");
          break;

        case "ExternalDial":
          if (!block.data?.trunk)
            validationErrors.push("ExternalDial block missing trunk");
          if (!block.data?.number)
            validationErrors.push("ExternalDial block missing number");
          if (!block.data?.timeout)
            validationErrors.push("ExternalDial block missing timeout");
          break;

        case "PlayAudio":
          if (!block.data?.audioFile)
            validationErrors.push("PlayAudio block missing audioFile");
          break;

        case "SetVariable":
          if (!block.data?.varName)
            validationErrors.push("SetVariable block missing varName");
          if (!block.data?.varValue)
            validationErrors.push("SetVariable block missing varValue");
          break;

        case "GotoIfTime":
          if (!block.data?.timeString)
            validationErrors.push("GotoIfTime block missing timeString");
          break;

        case "CheckList":
          if (!block.data?.listName)
            validationErrors.push("CheckList block missing listName");
          if (!block.data?.fieldToCheck)
            validationErrors.push("CheckList block missing fieldToCheck");
          break;

        case "Goto":
          if (!block.data?.context)
            validationErrors.push("Goto block missing context");
          if (!block.data?.extension)
            validationErrors.push("Goto block missing extension");
          if (!block.data?.priority)
            validationErrors.push("Goto block missing priority");
          break;
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid flow configuration",
        errors: validationErrors,
      });
    }

    // Update status to published with dialplan
    await flow.update({
      status: "published",
      metadata: {
        ...metadata,
        lastPublished: new Date().toISOString(),
        publishedVersion: metadata?.version || "1.0",
      },
    });

    // Write dialplan to Asterisk using the existing utility
    try {
      await writeAsteriskConfig(flow.id);
    } catch (configError) {
      console.error("Error writing Asterisk config:", configError);
      return res.status(500).json({
        success: false,
        message: "Failed to write Asterisk configuration",
        error: configError.message,
      });
    }

    res.json({
      success: true,
      message: "IVR flow published successfully",
      data: {
        id: flow.id,
        name: flow.name,
        status: "published",
        metadata: metadata,
      },
    });
  } catch (error) {
    console.error("Error publishing IVR flow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish IVR flow",
      error: error.message,
    });
  }
};

const writeAsteriskConfig = async (flowId) => {
  // Skip actual file operations in development
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `Development: Would write IVR flow ${flowId} to Asterisk config`
    );
    EventBusService.emit("ivr:published", {
      flowId,
      status: "success",
      environment: "development",
    });
    return true;
  }

  try {
    const ivrPath = `/etc/asterisk/mayday.d/ivr/flow-${flowId}.conf`;

    const dialplanContent = `
[ivr-flow-${flowId}]
exten => s,1,NoOp(IVR Flow ${flowId})
 same => n,Answer()
 same => n,Set(ivrId=${flowId})
 same => n,AGI(agi://localhost:4574)
 same => n,Hangup()
`;

    // Write content to temporary file first
    const tempPath = `/tmp/ivr-flow-${flowId}.conf`;
    await fs.writeFile(tempPath, dialplanContent);

    // Move file to final location and set permissions using sudo
    await execSudo(`mv ${tempPath} ${ivrPath}`);
    await execSudo(`chown asterisk:asterisk ${ivrPath}`);
    await execSudo(`chmod 644 ${ivrPath}`);

    // Reload dialplan via AMI
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "dialplan reload",
      });
    } catch (error) {
      console.warn("Warning: Failed to reload dialplan:", error);
      // Continue execution as AMI might not be ready yet
    }

    EventBusService.emit("ivr:published", { flowId, status: "success" });
    return true;
  } catch (error) {
    EventBusService.emit("ivr:published", { flowId, status: "error", error });
    throw error;
  }
};
