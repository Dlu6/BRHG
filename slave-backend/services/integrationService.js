import IntegrationModel from "../models/integrationModel.js";
import IntegrationDataModel from "../models/integrationDataModel.js";
import { Op } from "sequelize";

class IntegrationService {
  /** Normalize config from DB (handles JSON string vs object) */
  normalizeConfig(config) {
    if (!config) return {};
    if (typeof config === "string") {
      try {
        return JSON.parse(config);
      } catch (_) {
        return {};
      }
    }
    return config;
  }
  /**
   * Get all integrations
   */
  async getAllIntegrations() {
    try {
      const integrations = await IntegrationModel.findAll({
        order: [["createdAt", "DESC"]],
      });
      return { success: true, data: integrations };
    } catch (error) {
      console.error("Error fetching integrations:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id) {
    try {
      const integration = await IntegrationModel.findByPk(id);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }
      return { success: true, data: integration };
    } catch (error) {
      console.error("Error fetching integration by id:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new integration
   */
  async createIntegration(integrationData) {
    try {
      const [integration, created] = await IntegrationModel.findOrCreate({
        where: { name: integrationData.name },
        defaults: integrationData,
      });

      if (!created) {
        // If the integration already existed, update it
        await integration.update(integrationData);
      }

      return { success: true, data: integration };
    } catch (error) {
      console.error("Error creating/updating integration:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an integration
   */
  async updateIntegration(id, updateData) {
    try {
      const integration = await IntegrationModel.findByPk(id);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      await integration.update(updateData);
      return { success: true, data: integration };
    } catch (error) {
      console.error("Error updating integration:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(id) {
    try {
      const integration = await IntegrationModel.findByPk(id);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      // Delete associated data
      await IntegrationDataModel.destroy({
        where: { integrationId: id },
      });

      await integration.destroy();
      return { success: true };
    } catch (error) {
      console.error("Error deleting integration:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test integration connection
   */
  async testIntegration(id) {
    try {
      const integration = await IntegrationModel.findByPk(id);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      // Test connection based on integration type
      const testResult = await this.testConnection(integration);

      // Update integration status
      await integration.update({
        status: testResult.success ? "active" : "error",
        errorMessage: testResult.success ? null : testResult.error,
      });

      return testResult;
    } catch (error) {
      console.error("Error testing integration:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test connection for different integration types
   */
  async testConnection(integration) {
    switch (integration.type) {
      case "zoho":
        return await this.testZohoConnection(integration.config);
      case "salesforce":
        return await this.testSalesforceConnection(integration.config);
      case "hubspot":
        return await this.testHubspotConnection(integration.config);
      case "custom_api":
        return await this.testCustomApiConnection(integration.config);
      case "database":
        return await this.testDatabaseConnection(integration.config);
      default:
        return { success: false, error: "Unsupported integration type" };
    }
  }

  /**
   * Test Zoho CRM connection
   */
  async testZohoConnection(config) {
    try {
      const cfg = this.normalizeConfig(config);
      const baseUrl = cfg.baseUrl || "https://www.zohoapis.com";
      const accessToken = cfg.accessToken;
      if (!accessToken) {
        return { success: false, error: "Missing accessToken in config" };
      }

      let response = await fetch(`${baseUrl}/crm/v3/org`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        return { success: true };
      }

      // Attempt to parse error for better diagnostics
      let details = "";
      try {
        const data = await response.json();
        details = data.message || data.code || JSON.stringify(data);
      } catch (_) {
        // ignore
      }

      // If token might be expired/invalid, try refresh if we have creds
      const shouldRefresh =
        response.status === 401 ||
        (typeof details === "string" && /invalid|expired/i.test(details));

      if (
        shouldRefresh &&
        cfg.refreshToken &&
        cfg.clientId &&
        cfg.clientSecret
      ) {
        const refreshed = await this.refreshZohoToken(cfg);
        if (!refreshed.success) {
          return {
            success: false,
            error: `Token refresh failed: ${refreshed.error}`,
          };
        }

        // Retry request with new token
        response = await fetch(`${baseUrl}/crm/v3/org`, {
          headers: {
            Authorization: `Zoho-oauthtoken ${refreshed.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          // Return marker to allow caller to persist new token
          return { success: true, refreshedAccessToken: refreshed.accessToken };
        }
      }

      return {
        success: false,
        error:
          details ||
          `Failed to connect to Zoho CRM (status ${response.status})`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async refreshZohoToken(cfg) {
    try {
      const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";
      const params = new URLSearchParams({
        refresh_token: cfg.refreshToken,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: "refresh_token",
      });

      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return { success: true, accessToken: data.access_token };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Test Salesforce connection
   */
  async testSalesforceConnection(config) {
    try {
      const response = await fetch(
        `${config.instanceUrl}/services/data/v58.0/sobjects/`,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to connect to Salesforce" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test HubSpot connection
   */
  async testHubspotConnection(config) {
    try {
      const response = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to connect to HubSpot" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test custom API connection
   */
  async testCustomApiConnection(config) {
    try {
      const response = await fetch(config.testEndpoint || config.baseUrl, {
        method: config.testMethod || "GET",
        headers: config.headers || {},
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to connect to custom API" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection(config) {
    try {
      // This would test database connectivity
      // Implementation depends on the database type
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync data from integration
   */
  async syncIntegrationData(id, dataType = null) {
    try {
      const integration = await IntegrationModel.findByPk(id);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      if (integration.status !== "active") {
        return { success: false, error: "Integration is not active" };
      }

      // Sync data based on integration type
      const syncResult = await this.syncData(integration, dataType);

      if (syncResult.success) {
        await integration.update({
          lastSync: new Date(),
          errorMessage: null,
        });
      } else {
        await integration.update({
          status: "error",
          errorMessage: syncResult.error,
        });
      }

      return syncResult;
    } catch (error) {
      console.error("Error syncing integration data:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync data for different integration types
   */
  async syncData(integration, dataType) {
    try {
      switch (integration.type) {
        case "zoho":
          return await this.syncZohoData(integration, dataType);
        case "salesforce":
          return await this.syncSalesforceData(integration, dataType);
        case "hubspot":
          return await this.syncHubspotData(integration, dataType);
        case "custom_api":
          return await this.syncCustomApiData(integration, dataType);
        case "database":
          return await this.syncDatabaseData(integration, dataType);
        default:
          return { success: false, error: "Unsupported integration type" };
      }
    } catch (error) {
      console.error(`Error syncing ${integration.type} data:`, error);
      return { success: false, error: error.message };
    }
  }

  async syncZohoData(integration, dataType = "leads") {
    const cfg = this.normalizeConfig(integration.config);
    const baseUrl = cfg.baseUrl || "https://www.zohoapis.com";
    const accessToken = cfg.accessToken;
    const dataTypes = dataType ? [dataType] : ["leads", "contacts", "deals"];

    for (const type of dataTypes) {
      try {
        // Compose module details
        const moduleName =
          type === "leads"
            ? "Leads"
            : type === "contacts"
            ? "Contacts"
            : "Deals";
        const fields =
          type === "leads"
            ? "id,Full_Name,Email,Phone,Company,Lead_Status"
            : type === "contacts"
            ? "id,Full_Name,Email,Phone,Account_Name,Lead_Source"
            : "id,Deal_Name,Account_Name,Amount,Stage,Closing_Date";

        let page = 1;
        let totalSynced = 0;
        let continuePaging = true;
        let bearer = accessToken;

        while (continuePaging) {
          const endpoint = `${baseUrl}/crm/v3/${moduleName}?fields=${encodeURIComponent(
            fields
          )}&page=${page}&per_page=200`;

          let response = await fetch(endpoint, {
            headers: {
              Authorization: `Zoho-oauthtoken ${bearer}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            // Attempt transparent refresh on auth errors if we have creds
            if (
              response.status === 401 &&
              cfg.refreshToken &&
              cfg.clientId &&
              cfg.clientSecret
            ) {
              const refreshed = await this.refreshZohoToken(cfg);
              if (refreshed.success) {
                bearer = refreshed.accessToken;
                // retry once
                response = await fetch(endpoint, {
                  headers: {
                    Authorization: `Zoho-oauthtoken ${bearer}`,
                    "Content-Type": "application/json",
                  },
                });
                if (response.ok) {
                  // persist new token
                  try {
                    await IntegrationModel.update(
                      { config: { ...cfg, accessToken: bearer } },
                      { where: { id: integration.id } }
                    );
                  } catch (_) {}
                }
              }
            }

            if (!response.ok) {
              let detail = "";
              try {
                const err = await response.json();
                detail = err?.message || err?.code || JSON.stringify(err);
              } catch (_) {}
              throw new Error(
                `Zoho API error: ${response.status} ${response.statusText}${
                  detail ? ` - ${detail}` : ""
                }`
              );
            }
          }

          // Zoho may return 204 when no content
          const payload =
            response.status === 204
              ? { data: [], info: {} }
              : await response.json();

          const rows = payload.data || [];
          for (const record of rows) {
            await IntegrationDataModel.upsert({
              integrationId: integration.id,
              dataType: type,
              externalId: record.id,
              data: record,
              syncStatus: "synced",
              lastSync: new Date(),
            });
          }
          totalSynced += rows.length;

          // Paging: prefer info.more_records when present; otherwise stop when rows < per_page
          const moreRecords = payload.info?.more_records;
          if (moreRecords === true) {
            page += 1;
          } else if (moreRecords === false) {
            continuePaging = false;
          } else {
            continuePaging = rows.length >= 200 ? true : false;
            page += 1;
          }
        }

        console.log(`Synced ${totalSynced} ${type} from Zoho`);
      } catch (error) {
        console.error(`Error syncing Zoho ${type}:`, error);
        // Continue with other data types even if one fails
      }
    }

    return { success: true, message: "Zoho data sync completed" };
  }

  async syncSalesforceData(integration, dataType = "leads") {
    const config = integration.config;
    const dataTypes = dataType
      ? [dataType]
      : ["leads", "contacts", "opportunities"];

    for (const type of dataTypes) {
      try {
        let sobject;
        switch (type) {
          case "leads":
            sobject = "Lead";
            break;
          case "contacts":
            sobject = "Contact";
            break;
          case "opportunities":
            sobject = "Opportunity";
            break;
          default:
            continue;
        }

        const endpoint = `${config.instanceUrl}/services/data/v58.0/query?q=SELECT+Id,Name,Email,Phone,Company,Status,Amount,CloseDate+FROM+${sobject}+LIMIT+1000`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Salesforce API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Store the synced data
        for (const record of data.records || []) {
          await IntegrationDataModel.upsert({
            integrationId: integration.id,
            dataType: type,
            externalId: record.Id,
            data: record,
            syncStatus: "synced",
            lastSync: new Date(),
          });
        }

        console.log(
          `Synced ${data.records?.length || 0} ${type} from Salesforce`
        );
      } catch (error) {
        console.error(`Error syncing Salesforce ${type}:`, error);
      }
    }

    return { success: true, message: "Salesforce data sync completed" };
  }

  async syncHubspotData(integration, dataType = "contacts") {
    const config = integration.config;
    const dataTypes = dataType
      ? [dataType]
      : ["contacts", "companies", "deals"];

    for (const type of dataTypes) {
      try {
        let endpoint;
        switch (type) {
          case "contacts":
            endpoint = "https://api.hubapi.com/crm/v3/objects/contacts";
            break;
          case "companies":
            endpoint = "https://api.hubapi.com/crm/v3/objects/companies";
            break;
          case "deals":
            endpoint = "https://api.hubapi.com/crm/v3/objects/deals";
            break;
          default:
            continue;
        }

        const response = await fetch(`${endpoint}?limit=100`, {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `HubSpot API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Store the synced data
        for (const record of data.results || []) {
          await IntegrationDataModel.upsert({
            integrationId: integration.id,
            dataType: type,
            externalId: record.id,
            data: record,
            syncStatus: "synced",
            lastSync: new Date(),
          });
        }

        console.log(`Synced ${data.results?.length || 0} ${type} from HubSpot`);
      } catch (error) {
        console.error(`Error syncing HubSpot ${type}:`, error);
      }
    }

    return { success: true, message: "HubSpot data sync completed" };
  }

  async syncCustomApiData(integration, dataType = "custom") {
    const config = integration.config;

    try {
      const response = await fetch(config.baseUrl, {
        method: config.testMethod || "GET",
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body:
          config.testMethod === "POST"
            ? JSON.stringify(config.body || {})
            : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `Custom API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Store the synced data
      const records = Array.isArray(data) ? data : [data];
      for (const record of records) {
        await IntegrationDataModel.upsert({
          integrationId: integration.id,
          dataType: dataType,
          externalId: record.id || record.ID || Date.now().toString(),
          data: record,
          syncStatus: "synced",
          lastSync: new Date(),
        });
      }

      console.log(`Synced ${records.length} records from Custom API`);
      return { success: true, message: "Custom API data sync completed" };
    } catch (error) {
      console.error("Error syncing Custom API data:", error);
      return { success: false, error: error.message };
    }
  }

  async syncDatabaseData(integration, dataType = "custom") {
    const config = integration.config;

    try {
      // For database integrations, we'll use a simple query approach
      // In production, you might want to use a more sophisticated approach
      const { Sequelize } = await import("sequelize");

      const dbConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: config.password,
        dialect: config.dialect,
        logging: false,
      };

      const sequelize = new Sequelize(dbConfig);
      await sequelize.authenticate();

      // Query the database (this is a simplified example)
      const [results] = await sequelize.query(
        "SELECT * FROM " + (config.table || "users") + " LIMIT 100"
      );

      // Store the synced data
      for (const record of results) {
        await IntegrationDataModel.upsert({
          integrationId: integration.id,
          dataType: dataType,
          externalId: record.id || record.ID || Date.now().toString(),
          data: record,
          syncStatus: "synced",
          lastSync: new Date(),
        });
      }

      await sequelize.close();
      console.log(`Synced ${results.length} records from External Database`);
      return { success: true, message: "Database data sync completed" };
    } catch (error) {
      console.error("Error syncing Database data:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get integration metrics
   */
  async getIntegrationMetrics(integrationId, startDate, endDate) {
    try {
      const data = await IntegrationDataModel.findAll({
        where: {
          integrationId,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [["createdAt", "DESC"]],
      });

      // Process data into metrics
      const metrics = this.processMetrics(data);
      return { success: true, data: metrics };
    } catch (error) {
      console.error("Error getting integration metrics:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process raw data into metrics
   */
  processMetrics(data) {
    // This would process the raw integration data into meaningful metrics
    // Implementation depends on the data structure
    return {
      totalRecords: data.length,
      dataTypes: [...new Set(data.map((item) => item.dataType))],
      syncStatus: {
        synced: data.filter((item) => item.syncStatus === "synced").length,
        pending: data.filter((item) => item.syncStatus === "pending").length,
        failed: data.filter((item) => item.syncStatus === "failed").length,
      },
    };
  }

  /**
   * Get integration data
   */
  async getIntegrationData(integrationId, dataType = null) {
    try {
      const integration = await IntegrationModel.findByPk(integrationId);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      const whereClause = { integrationId };
      if (dataType && dataType !== "all") {
        whereClause.dataType = dataType;
      }

      const data = await IntegrationDataModel.findAll({
        where: whereClause,
        order: [["lastSync", "DESC"]],
        limit: 1000, // Limit to prevent overwhelming response
      });

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("Error getting integration data:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a single record inside an integration and persist to external system when supported
   */
  async updateIntegrationRecord(integrationId, dataType, externalId, updates) {
    try {
      const integration = await IntegrationModel.findByPk(integrationId);
      if (!integration) {
        return { success: false, error: "Integration not found" };
      }

      // Update upstream first when supported
      if (integration.type === "zoho") {
        const cfg = this.normalizeConfig(integration.config);
        const baseUrl = cfg.baseUrl || "https://www.zohoapis.com";
        let bearer = cfg.accessToken;
        const moduleName =
          dataType === "leads"
            ? "Leads"
            : dataType === "contacts"
            ? "Contacts"
            : dataType === "deals"
            ? "Deals"
            : null;
        if (!moduleName) {
          return { success: false, error: "Unsupported dataType for Zoho" };
        }

        const payload = { data: [{ id: externalId, ...updates }] };
        const endpoint = `${baseUrl}/crm/v3/${moduleName}`;

        let response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            Authorization: `Zoho-oauthtoken ${bearer}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          // Try token refresh once if unauthorized
          if (
            response.status === 401 &&
            cfg.refreshToken &&
            cfg.clientId &&
            cfg.clientSecret
          ) {
            const refreshed = await this.refreshZohoToken(cfg);
            if (refreshed.success) {
              bearer = refreshed.accessToken;
              response = await fetch(endpoint, {
                method: "PUT",
                headers: {
                  Authorization: `Zoho-oauthtoken ${bearer}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
              if (response.ok) {
                try {
                  await IntegrationModel.update(
                    { config: { ...cfg, accessToken: bearer } },
                    { where: { id: integration.id } }
                  );
                } catch (_) {}
              }
            }
          }

          if (!response.ok) {
            let detail = "";
            try {
              const err = await response.json();
              detail = err?.message || err?.code || JSON.stringify(err);
            } catch (_) {}
            return {
              success: false,
              error: `Zoho update failed: ${response.status} ${detail}`,
            };
          }
        }
      }

      // Update local cache
      const record = await IntegrationDataModel.findOne({
        where: { integrationId, dataType, externalId },
      });
      if (!record) {
        return { success: false, error: "Record not found in cache" };
      }
      const current =
        typeof record.data === "string" ? JSON.parse(record.data) : record.data;
      const merged = { ...current, ...updates };
      await record.update({ data: merged, lastSync: new Date() });
      return { success: true, data: record };
    } catch (error) {
      console.error("Error updating integration record:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new IntegrationService();
