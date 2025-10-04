import agentStatusService from "../services/agentStatusService.js";

/**
 * Agent Status Controller
 *
 * REST API endpoints for agent availability status
 */

/**
 * Get current agent status for all agents
 */
export const getAgentStatus = async (req, res) => {
  try {
    const status = await agentStatusService.getCurrentStatus();
    // console.log("status🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥", status);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error getting agent status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get agent status",
      error: error.message,
    });
  }
};

/**
 * Get status for a specific agent by extension
 */
export const getAgentStatusByExtension = async (req, res) => {
  try {
    const { extension } = req.params;
    let allStatus = await agentStatusService.getCurrentStatus();
    let agent = allStatus.agents.find((a) => a.extension === extension);

    // Durable fallback: refresh agents from DB once if not found
    if (!agent) {
      const refreshed = await agentStatusService.refreshAgents();
      if (refreshed) {
        allStatus = await agentStatusService.getCurrentStatus();
        agent = allStatus.agents.find((a) => a.extension === extension);
      }
    }

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent with extension ${extension} not found`,
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error("Error getting agent status by extension:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get agent status",
      error: error.message,
    });
  }
};

/**
 * Force refresh agent status (manual poll)
 */
export const refreshAgentStatus = async (req, res) => {
  try {
    await agentStatusService.pollAgentStatus();

    const status = await agentStatusService.getCurrentStatus();

    res.json({
      success: true,
      message: "Agent status refreshed successfully",
      data: status,
    });
  } catch (error) {
    console.error("Error refreshing agent status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh agent status",
      error: error.message,
    });
  }
};

/**
 * Get agent status summary (counts only)
 */
export const getAgentStatusSummary = async (req, res) => {
  try {
    const status = await agentStatusService.getCurrentStatus();

    const agents = status.agents || [];
    const totalAgents = agents.length;

    // Registered == has valid ps_contact → we mark as online when a contact exists
    const onlineAgents = agents.filter((a) => a.status === "online").length;
    const registeredAgents = agents.filter((a) => a.ip).length || onlineAgents;
    const offlineAgents = Math.max(totalAgents - onlineAgents, 0);

    const summary = {
      timestamp: status.timestamp,
      totalAgents,
      onlineAgents,
      offlineAgents,
      registeredAgents,
      byTypology: {},
    };

    // Group by typology for extra breakdowns
    agents.forEach((agent) => {
      const key = agent.typology || "unknown";
      if (!summary.byTypology[key]) {
        summary.byTypology[key] = { total: 0, online: 0, offline: 0 };
      }
      summary.byTypology[key].total++;
      if (agent.status === "online") summary.byTypology[key].online++;
      else summary.byTypology[key].offline++;
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error getting agent status summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get agent status summary",
      error: error.message,
    });
  }
};

/**
 * Refresh agent list from database
 */
export const refreshAgentList = async (req, res) => {
  try {
    const success = await agentStatusService.refreshAgents();

    if (success) {
      const status = await agentStatusService.getCurrentStatus();

      res.json({
        success: true,
        message: "Agent list refreshed from database",
        data: {
          totalAgents: status.agents.length,
          agents: status.agents.map((a) => ({
            extension: a.extension,
            fullName: a.fullName,
            typology: a.typology,
            hasEndpoint: a.hasEndpoint,
            hasAuth: a.hasAuth,
          })),
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to refresh agent list",
      });
    }
  } catch (error) {
    console.error("Error refreshing agent list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh agent list",
      error: error.message,
    });
  }
};

/**
 * Service health
 */
export const getServiceHealth = async (req, res) => {
  try {
    const status = await agentStatusService.getCurrentStatus();
    res.json({
      success: true,
      data: {
        isRunning: status.isRunning,
        timestamp: status.timestamp,
        totalAgents: status.agents.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
