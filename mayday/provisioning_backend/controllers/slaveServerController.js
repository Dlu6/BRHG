const SlaveServer = require("../models/slaveServerModel.js");
const { ServerLicense } = require("../models/licenseModel.js");
const crypto = require("crypto");
const axios = require("axios");

// Get all slave servers
const getAllSlaveServers = async (req, res) => {
  try {
    const { status, health_status, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (health_status) filter.health_status = health_status;

    // Calculate pagination
    const skip = (page - 1) * limit;

    const slaveServers = await SlaveServer.find(filter)
      .populate("license_count")
      .populate("active_license_count")
      .sort({ updated_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SlaveServer.countDocuments(filter);

    res.json({
      success: true,
      data: slaveServers,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching slave servers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slave servers",
      error: error.message,
    });
  }
};

// Get single slave server
const getSlaveServer = async (req, res) => {
  try {
    const { id } = req.params;

    const slaveServer = await SlaveServer.findById(id)
      .populate("license_count")
      .populate("active_license_count");

    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    // Get recent licenses for this server
    const licenses = await ServerLicense.find({ slave_server_id: id })
      .populate("license_type_id")
      .sort({ created_at: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        ...slaveServer.toObject(),
        recent_licenses: licenses,
      },
    });
  } catch (error) {
    console.error("Error fetching slave server:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slave server",
      error: error.message,
    });
  }
};

// Register new slave server
const registerSlaveServer = async (req, res) => {
  try {
    const { name, domain, description, api_url, websocket_url, configuration } =
      req.body;

    // Validate required fields
    if (!name || !domain || !api_url) {
      return res.status(400).json({
        success: false,
        message: "Name, domain, and API URL are required",
      });
    }

    // Check if domain already exists
    const existingServer = await SlaveServer.findByDomain(domain);
    if (existingServer) {
      return res.status(409).json({
        success: false,
        message: "A server with this domain already exists",
      });
    }

    // Create new slave server
    const slaveServer = new SlaveServer({
      name,
      domain: domain.toLowerCase(),
      description,
      api_url,
      websocket_url,
      configuration: {
        max_licenses: configuration?.max_licenses || 10,
        allowed_features: configuration?.allowed_features || [],
        webhook_url: configuration?.webhook_url,
        notification_email: configuration?.notification_email,
        timezone: configuration?.timezone || "UTC",
      },
      registered_by: req.user?._id,
    });

    // Generate authentication tokens
    slaveServer.generateRegistrationToken();
    slaveServer.generateApiKey();
    slaveServer.generateSecretKey();

    await slaveServer.save();

    res.status(201).json({
      success: true,
      message: "Slave server registered successfully",
      data: {
        id: slaveServer._id,
        name: slaveServer.name,
        domain: slaveServer.domain,
        api_url: slaveServer.api_url,
        registration_token: slaveServer.registration_token,
        api_key: slaveServer.api_key,
        secret_key: slaveServer.secret_key,
        status: slaveServer.status,
      },
    });
  } catch (error) {
    console.error("Error registering slave server:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register slave server",
      error: error.message,
    });
  }
};

// Update slave server
const updateSlaveServer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.registration_token;
    delete updates.api_key;
    delete updates.secret_key;
    delete updates._id;

    const slaveServer = await SlaveServer.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    res.json({
      success: true,
      message: "Slave server updated successfully",
      data: slaveServer,
    });
  } catch (error) {
    console.error("Error updating slave server:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update slave server",
      error: error.message,
    });
  }
};

// Delete slave server
const deleteSlaveServer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are active licenses
    const activeLicenseCount = await ServerLicense.countDocuments({
      slave_server_id: id,
      status: "active",
    });

    if (activeLicenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete server with ${activeLicenseCount} active licenses. Please deactivate or transfer licenses first.`,
      });
    }

    const slaveServer = await SlaveServer.findByIdAndDelete(id);

    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    res.json({
      success: true,
      message: "Slave server deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting slave server:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete slave server",
      error: error.message,
    });
  }
};

// Activate slave server
const activateSlaveServer = async (req, res) => {
  try {
    const { id } = req.params;

    const slaveServer = await SlaveServer.findByIdAndUpdate(
      id,
      { status: "active", updated_at: new Date() },
      { new: true }
    );

    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    res.json({
      success: true,
      message: "Slave server activated successfully",
      data: slaveServer,
    });
  } catch (error) {
    console.error("Error activating slave server:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate slave server",
      error: error.message,
    });
  }
};

// Deactivate slave server
const deactivateSlaveServer = async (req, res) => {
  try {
    const { id } = req.params;

    const slaveServer = await SlaveServer.findByIdAndUpdate(
      id,
      { status: "inactive", updated_at: new Date() },
      { new: true }
    );

    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    res.json({
      success: true,
      message: "Slave server deactivated successfully",
      data: slaveServer,
    });
  } catch (error) {
    console.error("Error deactivating slave server:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate slave server",
      error: error.message,
    });
  }
};

// Health check for single slave server
const checkSlaveServerHealth = async (req, res) => {
  try {
    const { id } = req.params;

    const slaveServer = await SlaveServer.findById(id);
    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    // Ping the slave server
    try {
      const healthUrl = `${slaveServer.api_url}/health`;
      const response = await axios.get(healthUrl, { timeout: 10000 });

      // Update health status
      await slaveServer.updateHealthStatus("healthy", response.data);

      res.json({
        success: true,
        message: "Health check completed",
        data: {
          server_id: slaveServer._id,
          domain: slaveServer.domain,
          health_status: "healthy",
          response_time: response.headers["x-response-time"] || "N/A",
          server_info: response.data,
        },
      });
    } catch (pingError) {
      // Update health status to unhealthy
      await slaveServer.updateHealthStatus("unhealthy");

      res.json({
        success: true,
        message: "Health check completed",
        data: {
          server_id: slaveServer._id,
          domain: slaveServer.domain,
          health_status: "unhealthy",
          error: pingError.message,
        },
      });
    }
  } catch (error) {
    console.error("Error checking slave server health:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check slave server health",
      error: error.message,
    });
  }
};

// Health check for all active slave servers
const checkAllSlaveServersHealth = async (req, res) => {
  try {
    const activeServers = await SlaveServer.getActiveServers();
    const healthResults = [];

    for (const server of activeServers) {
      try {
        const healthUrl = `${server.api_url}/health`;
        const response = await axios.get(healthUrl, { timeout: 5000 });

        await server.updateHealthStatus("healthy", response.data);

        healthResults.push({
          server_id: server._id,
          domain: server.domain,
          health_status: "healthy",
          response_time: response.headers["x-response-time"] || "N/A",
        });
      } catch (error) {
        await server.updateHealthStatus("unhealthy");

        healthResults.push({
          server_id: server._id,
          domain: server.domain,
          health_status: "unhealthy",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Health check completed for all servers",
      data: healthResults,
    });
  } catch (error) {
    console.error("Error checking all slave servers health:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check slave servers health",
      error: error.message,
    });
  }
};

// Regenerate API keys
const regenerateApiKeys = async (req, res) => {
  try {
    const { id } = req.params;

    const slaveServer = await SlaveServer.findById(id);
    if (!slaveServer) {
      return res.status(404).json({
        success: false,
        message: "Slave server not found",
      });
    }

    // Generate new keys
    const newApiKey = slaveServer.generateApiKey();
    const newSecretKey = slaveServer.generateSecretKey();

    await slaveServer.save();

    res.json({
      success: true,
      message: "API keys regenerated successfully",
      data: {
        api_key: newApiKey,
        secret_key: newSecretKey,
        warning:
          "Please update your slave server configuration with these new keys immediately",
      },
    });
  } catch (error) {
    console.error("Error regenerating API keys:", error);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate API keys",
      error: error.message,
    });
  }
};

// Ping endpoint for slave servers to report their status
const receiveSlaveServerPing = async (req, res) => {
  try {
    const { server_fingerprint, status, server_info } = req.body;
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required",
      });
    }

    // Find slave server by API key
    const slaveServer = await SlaveServer.findByApiKey(apiKey);
    if (!slaveServer) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    // Update server fingerprint if provided
    if (
      server_fingerprint &&
      slaveServer.server_fingerprint !== server_fingerprint
    ) {
      slaveServer.server_fingerprint = server_fingerprint;
    }

    // Update ping timestamp and server info
    await slaveServer.ping();
    if (server_info) {
      slaveServer.server_info = { ...slaveServer.server_info, ...server_info };
      await slaveServer.save();
    }

    res.json({
      success: true,
      message: "Ping received successfully",
      data: {
        server_id: slaveServer._id,
        next_ping_in: 300000, // 5 minutes
      },
    });
  } catch (error) {
    console.error("Error processing slave server ping:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process ping",
      error: error.message,
    });
  }
};

// Get slave server configuration
const getSlaveServerConfig = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required",
      });
    }

    const slaveServer = await SlaveServer.findByApiKey(apiKey);
    if (!slaveServer) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    res.json({
      success: true,
      data: {
        server_id: slaveServer._id,
        name: slaveServer.name,
        domain: slaveServer.domain,
        configuration: slaveServer.configuration,
        master_server_url: process.env.FRONTEND_URL,
        master_api_url: `${req.protocol}://${req.get("host")}`,
        status: slaveServer.status,
      },
    });
  } catch (error) {
    console.error("Error fetching slave server config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch configuration",
      error: error.message,
    });
  }
};

// Self-registration for slave servers (no auth required)
const selfRegisterSlaveServer = async (req, res) => {
  try {
    const {
      name,
      domain,
      description,
      api_url,
      websocket_url,
      configuration,
      server_fingerprint,
      server_info,
    } = req.body;

    // Validate required fields
    if (!name || !domain || !api_url) {
      return res.status(400).json({
        success: false,
        message: "Name, domain, and API URL are required",
      });
    }

    // Check if domain already exists
    const existingServer = await SlaveServer.findByDomain(domain);
    if (existingServer) {
      return res.status(409).json({
        success: false,
        message: "A server with this domain already exists",
        data: {
          existing_server_id: existingServer._id,
          existing_server_name: existingServer.name,
          existing_server_status: existingServer.status,
        },
      });
    }

    // Create new slave server
    const slaveServer = new SlaveServer({
      name,
      domain: domain.toLowerCase(),
      description,
      api_url,
      websocket_url,
      server_fingerprint,
      server_info,
      configuration: {
        max_licenses: configuration?.max_licenses || 10,
        allowed_features: configuration?.allowed_features || [],
        webhook_url: configuration?.webhook_url,
        notification_email: configuration?.notification_email,
        timezone: configuration?.timezone || "UTC",
      },
      status: "inactive", // Start as inactive, admin must activate
      health_status: "unknown",
    });

    // Generate authentication tokens
    slaveServer.generateRegistrationToken();
    slaveServer.generateApiKey();
    slaveServer.generateSecretKey();

    await slaveServer.save();

    console.log(`🔧 Slave server self-registered: ${name} (${domain})`);

    res.status(201).json({
      success: true,
      message:
        "Slave server registered successfully. Awaiting admin activation.",
      data: {
        id: slaveServer._id,
        name: slaveServer.name,
        domain: slaveServer.domain,
        api_url: slaveServer.api_url,
        registration_token: slaveServer.registration_token,
        api_key: slaveServer.api_key,
        secret_key: slaveServer.secret_key,
        status: slaveServer.status,
        message:
          "Your server has been registered. An administrator will activate it soon.",
      },
    });
  } catch (error) {
    console.error("Error in slave server self-registration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register slave server",
      error: error.message,
    });
  }
};

// Development helper: Clear existing slave server registration
const clearSlaveServerRegistration = async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "This endpoint is only available in development mode",
    });
  }

  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Domain is required",
      });
    }

    const existingServer = await SlaveServer.findByDomain(domain);
    if (!existingServer) {
      return res.status(404).json({
        success: false,
        message: "No server found with this domain",
      });
    }

    await SlaveServer.findByIdAndDelete(existingServer._id);

    console.log(
      `🧹 Development: Cleared slave server registration for ${domain}`
    );

    res.json({
      success: true,
      message: `Slave server registration cleared for domain: ${domain}`,
      data: {
        cleared_domain: domain,
        cleared_server_id: existingServer._id,
      },
    });
  } catch (error) {
    console.error("Error clearing slave server registration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear slave server registration",
      error: error.message,
    });
  }
};

module.exports = {
  getAllSlaveServers,
  getSlaveServer,
  registerSlaveServer,
  updateSlaveServer,
  deleteSlaveServer,
  activateSlaveServer,
  deactivateSlaveServer,
  checkSlaveServerHealth,
  checkAllSlaveServersHealth,
  regenerateApiKeys,
  receiveSlaveServerPing,
  getSlaveServerConfig,
  selfRegisterSlaveServer,
  clearSlaveServerRegistration,
};
