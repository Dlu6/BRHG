import integrationService from "../services/integrationService.js";
import qs from "querystring";

/**
 * Get all integrations
 */
export const getAllIntegrations = async (req, res) => {
  try {
    const result = await integrationService.getAllIntegrations();

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in getAllIntegrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch integrations",
    });
  }
};

/**
 * Get one integration by ID
 */
export const getIntegrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await integrationService.getIntegrationById(id);
    if (result.success) {
      return res.json(result.data);
    }
    return res.status(404).json({ success: false, error: result.error });
  } catch (error) {
    console.error("Error in getIntegrationById:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch integration" });
  }
};

/**
 * Create a new integration
 */
export const createIntegration = async (req, res) => {
  try {
    const { name, type, config, syncInterval } = req.body;

    if (!name || !type || !config) {
      return res.status(400).json({
        success: false,
        error: "Name, type, and config are required",
      });
    }

    const integrationData = {
      name,
      type,
      config,
      syncInterval: syncInterval || 60,
    };

    const result = await integrationService.createIntegration(integrationData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in createIntegration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create integration",
    });
  }
};

/**
 * Update an integration
 */
export const updateIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await integrationService.updateIntegration(id, updateData);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in updateIntegration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update integration",
    });
  }
};

/**
 * Delete an integration
 */
export const deleteIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await integrationService.deleteIntegration(id);

    if (result.success) {
      res.json({
        success: true,
        message: "Integration deleted successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in deleteIntegration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete integration",
    });
  }
};

/**
 * Test integration connection
 */
export const testIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await integrationService.testIntegration(id);

    if (result.success) {
      return res.json({ success: true, ...result });
    }
    return res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    console.error("Error in testIntegration:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to test integration" });
  }
};

/**
 * Sync integration data
 */
export const syncIntegrationData = async (req, res) => {
  try {
    const { id } = req.params;
    const dataType = req.body?.dataType || req.query?.dataType || null;

    const result = await integrationService.syncIntegrationData(id, dataType);

    if (result.success) {
      res.json({
        success: true,
        message: "Data sync completed successfully",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in syncIntegrationData:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync integration data",
    });
  }
};

/**
 * Get integration metrics
 */
export const getIntegrationMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Start date and end date are required",
      });
    }

    const result = await integrationService.getIntegrationMetrics(
      id,
      new Date(startDate),
      new Date(endDate)
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in getIntegrationMetrics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get integration metrics",
    });
  }
};

/**
 * Get integration data
 */
export const getIntegrationData = async (req, res) => {
  try {
    const { id } = req.params;
    const { dataType } = req.query;

    const result = await integrationService.getIntegrationData(id, dataType);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in getIntegrationData:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch integration data",
    });
  }
};

/**
 * Update a specific record belonging to an integration
 * Path params: id (integrationId), dataType (leads|contacts|deals), externalId (record id in external system)
 * Body: { updates: { Phone: "+123...", ... } }
 */
export const updateIntegrationRecord = async (req, res) => {
  try {
    const { id, dataType, externalId } = req.params;
    const { updates } = req.body || {};
    if (!updates || typeof updates !== "object") {
      return res
        .status(400)
        .json({ success: false, error: "updates payload required" });
    }

    const result = await integrationService.updateIntegrationRecord(
      id,
      dataType,
      externalId,
      updates
    );

    if (result.success) {
      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    console.error("Error in updateIntegrationRecord:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update integration record" });
  }
};

/**
 * Get integration templates (predefined configurations)
 */
export const getIntegrationTemplates = async (req, res) => {
  try {
    const templates = {
      zoho: {
        name: "Zoho CRM",
        type: "zoho",
        description: "Integrate with Zoho CRM for lead and contact management",
        config: {
          baseUrl: "https://www.zohoapis.com",
          accessToken: "",
          refreshToken: "",
          clientId: "",
          clientSecret: "",
        },
        fields: [
          { name: "baseUrl", label: "Base URL", type: "text", required: true },
          {
            name: "accessToken",
            label: "Access Token",
            type: "password",
            required: true,
          },
          {
            name: "refreshToken",
            label: "Refresh Token",
            type: "password",
            required: true,
          },
          {
            name: "clientId",
            label: "Client ID",
            type: "text",
            required: true,
          },
          {
            name: "clientSecret",
            label: "Client Secret",
            type: "password",
            required: true,
          },
        ],
      },
      salesforce: {
        name: "Salesforce",
        type: "salesforce",
        description: "Integrate with Salesforce CRM",
        config: {
          instanceUrl: "",
          accessToken: "",
          clientId: "",
          clientSecret: "",
        },
        fields: [
          {
            name: "instanceUrl",
            label: "Instance URL",
            type: "text",
            required: true,
          },
          {
            name: "accessToken",
            label: "Access Token",
            type: "password",
            required: true,
          },
          {
            name: "clientId",
            label: "Client ID",
            type: "text",
            required: true,
          },
          {
            name: "clientSecret",
            label: "Client Secret",
            type: "password",
            required: true,
          },
        ],
      },
      hubspot: {
        name: "HubSpot",
        type: "hubspot",
        description: "Integrate with HubSpot CRM",
        config: {
          accessToken: "",
          baseUrl: "https://api.hubapi.com",
        },
        fields: [
          {
            name: "accessToken",
            label: "Access Token",
            type: "password",
            required: true,
          },
          { name: "baseUrl", label: "Base URL", type: "text", required: true },
        ],
      },
      custom_api: {
        name: "Custom API",
        type: "custom_api",
        description: "Integrate with a custom API endpoint",
        config: {
          baseUrl: "",
          headers: {},
          testEndpoint: "",
          testMethod: "GET",
        },
        fields: [
          { name: "baseUrl", label: "Base URL", type: "text", required: true },
          {
            name: "testEndpoint",
            label: "Test Endpoint",
            type: "text",
            required: false,
          },
          {
            name: "testMethod",
            label: "Test Method",
            type: "select",
            options: ["GET", "POST"],
            required: false,
          },
        ],
      },
      database: {
        name: "External Database",
        type: "database",
        description: "Connect to an external database",
        config: {
          host: "",
          port: "",
          database: "",
          username: "",
          password: "",
          dialect: "mysql",
        },
        fields: [
          { name: "host", label: "Host", type: "text", required: true },
          { name: "port", label: "Port", type: "number", required: true },
          { name: "database", label: "Database", type: "text", required: true },
          { name: "username", label: "Username", type: "text", required: true },
          {
            name: "password",
            label: "Password",
            type: "password",
            required: true,
          },
          {
            name: "dialect",
            label: "Database Type",
            type: "select",
            options: ["mysql", "postgres", "sqlite", "mariadb"],
            required: true,
          },
        ],
      },
    };

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Error in getIntegrationTemplates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get integration templates",
    });
  }
};

/**
 * Exchange Zoho authorization code for access and refresh tokens (server-side)
 */
export const exchangeZohoTokens = async (req, res) => {
  try {
    const { code, clientId, clientSecret, redirectUri } = req.body;

    if (!code || !clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({
        success: false,
        error: "code, clientId, clientSecret and redirectUri are required",
      });
    }

    const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: qs.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res
        .status(400)
        .json({ success: false, error: data.error || "Token exchange failed" });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error exchanging Zoho tokens:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to exchange tokens" });
  }
};
