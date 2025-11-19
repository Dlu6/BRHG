import sequelize from "../config/sequelize.js";
import {
  ExternIp,
  Stun,
  Turn,
  LocalNet,
} from "../models/networkConfigModel.js";
import {
  updateAsteriskConfig,
  updateRTPConfig,
  forceUpdatePJSIPTransports,
  updatePJSIPTransports,
} from "../utils/asteriskConfigWriter.js";

// ExternIp Controllers
export const createExternIp = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Validate the request body
    if (!req.body.address) {
      return res.status(400).json({
        success: false,
        error: "Address field is required",
      });
    }

    // Check if the external IP already exists
    const existingIp = await ExternIp.findOne({
      where: { address: req.body.address },
    });

    if (existingIp) {
      return res.status(409).json({
        success: false,
        error: "External IP configuration already exists",
      });
    }

    // Create the external IP record
    const externIp = await ExternIp.create(req.body, { transaction });

    // Commit the transaction first
    await transaction.commit();

    // Update Asterisk configuration with fresh data
    try {
      console.log(
        "🔄 Updating Asterisk configuration after ExternIp creation..."
      );
      await updateAsteriskConfig();
      // Force update PJSIP transport configurations with new external IP
      await forceUpdatePJSIPTransports();
      console.log("✅ Asterisk configuration updated successfully");
    } catch (configError) {
      console.error("❌ Asterisk config update failed:", configError);
      // Don't rollback for config errors, just log them
    }

    return res.status(201).json({
      success: true,
      data: externIp,
    });
  } catch (error) {
    await transaction.rollback();

    // Handle validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        error: "External IP configuration already exists",
      });
    }

    if (error.name === "SequelizeDatabaseError") {
      return res.status(500).json({
        success: false,
        error: "Database error",
        details: error.message,
      });
    }

    console.error("ExternIp creation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getExternIps = async (req, res) => {
  try {
    const externIps = await ExternIp.findAll();
    res.status(200).json({ success: true, data: externIps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateExternIp = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const externIp = await ExternIp.findByPk(req.params.id);
    if (!externIp) {
      return res
        .status(404)
        .json({ success: false, error: "ExternIp not found" });
    }
    await externIp.update(req.body, { transaction });

    // Commit the transaction first
    await transaction.commit();

    // Update Asterisk configuration with fresh data
    try {
      console.log(
        "🔄 Updating Asterisk configuration after ExternIp update..."
      );
      await updateAsteriskConfig();
      // Force update PJSIP transport configurations with new external IP
      await forceUpdatePJSIPTransports();
      console.log("✅ Asterisk configuration updated successfully");
    } catch (configError) {
      console.error("❌ Asterisk config update failed:", configError);
    }

    res.status(200).json({ success: true, data: externIp });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteExternIp = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const externIp = await ExternIp.findByPk(req.params.id);
    if (!externIp) {
      return res
        .status(404)
        .json({ success: false, error: "ExternIp not found" });
    }
    
    // Delete from database first
    await externIp.destroy({ transaction });
    await transaction.commit();
    
    // Update config files after successful database deletion
    // These operations should not block the response if they fail
    try {
      await updateAsteriskConfig();
      await forceUpdatePJSIPTransports();
      console.log("✅ Asterisk config updated after ExternIp deletion");
    } catch (configError) {
      console.error("⚠️ Asterisk config update failed after ExternIp deletion:", configError);
      // Don't fail the request - database deletion was successful
      // The config files can be regenerated later or manually
    }
    
    res
      .status(200)
      .json({ success: true, message: "ExternIp deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("ExternIp deletion error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to delete ExternIp"
    });
  }
};

// Stun Controllers
export const createStun = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const stun = await Stun.create(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(201).json({ success: true, data: stun });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStuns = async (req, res) => {
  try {
    const stuns = await Stun.findAll();
    res.status(200).json({ success: true, data: stuns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStun = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const stun = await Stun.findByPk(req.params.id);
    if (!stun) {
      return res
        .status(404)
        .json({ success: false, error: "Stun server not found" });
    }
    await stun.update(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(200).json({ success: true, data: stun });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteStun = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const stun = await Stun.findByPk(req.params.id);
    if (!stun) {
      return res
        .status(404)
        .json({ success: false, error: "Stun server not found" });
    }
    
    // Delete from database first
    await stun.destroy({ transaction });
    await transaction.commit();
    
    // Update config files after successful database deletion
    try {
      await updateRTPConfig();
      console.log("✅ RTP config updated after STUN deletion");
    } catch (configError) {
      console.error("⚠️ RTP config update failed after STUN deletion:", configError);
      // Don't fail the request - database deletion was successful
    }
    
    res
      .status(200)
      .json({ success: true, message: "Stun server deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// Turn Controllers
export const createTurn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const turn = await Turn.create(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(201).json({ success: true, data: turn });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTurns = async (req, res) => {
  try {
    const turns = await Turn.findAll();
    res.status(200).json({ success: true, data: turns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTurn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const turn = await Turn.findByPk(req.params.id);
    if (!turn) {
      return res
        .status(404)
        .json({ success: false, error: "Turn server not found" });
    }
    await turn.update(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(200).json({ success: true, data: turn });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTurn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const turn = await Turn.findByPk(req.params.id);
    if (!turn) {
      return res
        .status(404)
        .json({ success: false, error: "Turn server not found" });
    }
    
    // Delete from database first
    await turn.destroy({ transaction });
    await transaction.commit();
    
    // Update config files after successful database deletion
    try {
      await updateRTPConfig();
      console.log("✅ RTP config updated after TURN deletion");
    } catch (configError) {
      console.error("⚠️ RTP config update failed after TURN deletion:", configError);
      // Don't fail the request - database deletion was successful
    }
    
    res
      .status(200)
      .json({ success: true, message: "Turn server deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// LocalNet Controllers
export const createLocalNet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Validate the request body
    if (!req.body.network) {
      return res.status(400).json({
        success: false,
        error: "Network field is required",
      });
    }

    // Check if the network already exists
    const existingNetwork = await LocalNet.findOne({
      where: { network: req.body.network },
    });

    if (existingNetwork) {
      return res.status(409).json({
        success: false,
        error: "Network configuration already exists",
      });
    }

    const localNet = await LocalNet.create(req.body, { transaction });

    // Commit the transaction first
    await transaction.commit();

    // Update Asterisk configuration with fresh data
    try {
      console.log(
        "🔄 Updating Asterisk configuration after LocalNet creation..."
      );
      await updateAsteriskConfig();
      console.log("✅ Asterisk configuration updated successfully");
    } catch (configError) {
      console.error("❌ Asterisk config update failed:", configError);
      // Don't rollback for config errors, just log them
    }

    res.status(201).json({ success: true, data: localNet });
  } catch (error) {
    await transaction.rollback();

    // Handle specific database errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        error: "Network configuration already exists",
      });
    }

    if (error.name === "SequelizeDatabaseError") {
      return res.status(500).json({
        success: false,
        error: "Database error",
        details: error.message,
      });
    }

    console.error("LocalNet creation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getLocalNets = async (req, res) => {
  try {
    const localNets = await LocalNet.findAll();
    res.status(200).json({ success: true, data: localNets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLocalNet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const localNet = await LocalNet.findByPk(req.params.id);
    if (!localNet) {
      return res
        .status(404)
        .json({ success: false, error: "Local network not found" });
    }
    await localNet.update(req.body, { transaction });

    // Commit the transaction first
    await transaction.commit();

    // Update Asterisk configuration with fresh data
    try {
      console.log(
        "🔄 Updating Asterisk configuration after LocalNet update..."
      );
      await updateAsteriskConfig();
      console.log("✅ Asterisk configuration updated successfully");
    } catch (configError) {
      console.error("❌ Asterisk config update failed:", configError);
    }

    res.status(200).json({ success: true, data: localNet });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteLocalNet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const localNet = await LocalNet.findByPk(req.params.id);
    if (!localNet) {
      return res
        .status(404)
        .json({ success: false, error: "Local network not found" });
    }
    
    // Delete from database first
    await localNet.destroy({ transaction });
    await transaction.commit();
    
    // Update config files after successful database deletion
    try {
      await updateAsteriskConfig();
      console.log("✅ Asterisk config updated after LocalNet deletion");
    } catch (configError) {
      console.error("⚠️ Asterisk config update failed after LocalNet deletion:", configError);
      // Don't fail the request - database deletion was successful
    }
    
    res
      .status(200)
      .json({ success: true, message: "Local network deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// Manual transport creation endpoint
export const createPJSIPTransports = async (req, res) => {
  try {
    await updatePJSIPTransports();
    res.status(200).json({
      success: true,
      message: "PJSIP transport configurations created successfully",
    });
  } catch (error) {
    console.error("Failed to create PJSIP transports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create PJSIP transport configurations",
      details: error.message,
    });
  }
};
