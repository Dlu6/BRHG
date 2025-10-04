import {
  getCallCostStats as getCallCostStatsService,
  getCallCostsByDateRange as getCallCostsByDateRangeService,
  getCostSummaryByTrunk as getCostSummaryByTrunkService,
  updateCallCostWithProvider as updateCallCostWithProviderService,
} from "../services/callCostService.js";
// import { Op } from "../config/sequelize.js";

/**
 * Get call cost statistics
 */
export const getCallCostStats = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      trunkId,
      accountNumber,
      callType,
      disposition,
    } = req.query;

    const filters = {};

    if (startDate && endDate) {
      filters.startDate = new Date(startDate);
      filters.endDate = new Date(endDate);
    }

    if (trunkId) {
      filters.trunkId = parseInt(trunkId);
    }

    if (accountNumber) {
      filters.accountNumber = accountNumber;
    }

    if (callType) {
      filters.callType = callType;
    }

    if (disposition) {
      filters.disposition = disposition;
    }

    const stats = await getCallCostStatsService(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting call cost stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving call cost statistics",
      error: error.message,
    });
  }
};

/**
 * Get call costs by date range
 */
export const getCallCostsByDateRange = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      trunkId,
      accountNumber,
      callType,
      disposition,
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    if (trunkId) {
      options.trunkId = parseInt(trunkId);
    }

    if (accountNumber) {
      options.accountNumber = accountNumber;
    }

    if (callType) {
      options.callType = callType;
    }

    if (disposition) {
      options.disposition = disposition;
    }

    const callCosts = await getCallCostsByDateRangeService(
      new Date(startDate),
      new Date(endDate),
      options
    );

    res.json({
      success: true,
      data: callCosts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error getting call costs by date range:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving call costs",
      error: error.message,
    });
  }
};

/**
 * Get cost summary by trunk
 */
export const getCostSummaryByTrunk = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const summary = await getCostSummaryByTrunkService(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error getting cost summary by trunk:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cost summary",
      error: error.message,
    });
  }
};

/**
 * Update call cost with provider verification
 */
export const updateCallCostWithProvider = async (req, res) => {
  try {
    const { uniqueid, providerCost, verified = true } = req.body;

    if (!uniqueid || providerCost === undefined) {
      return res.status(400).json({
        success: false,
        message: "Unique ID and provider cost are required",
      });
    }

    const updatedCost = await updateCallCostWithProviderService(
      uniqueid,
      parseFloat(providerCost),
      verified
    );

    if (!updatedCost) {
      return res.status(404).json({
        success: false,
        message: "Call cost record not found",
      });
    }

    res.json({
      success: true,
      data: updatedCost,
      message: "Call cost updated successfully",
    });
  } catch (error) {
    console.error("Error updating call cost with provider:", error);
    res.status(500).json({
      success: false,
      message: "Error updating call cost",
      error: error.message,
    });
  }
};

/**
 * Get call cost details by unique ID
 */
export const getCallCostByUniqueId = async (req, res) => {
  try {
    const { uniqueid } = req.params;

    if (!uniqueid) {
      return res.status(400).json({
        success: false,
        message: "Unique ID is required",
      });
    }

    const CallCost = (await import("../models/callCostModel.js")).default;
    const callCost = await CallCost.findOne({
      where: { uniqueid },
    });

    if (!callCost) {
      return res.status(404).json({
        success: false,
        message: "Call cost record not found",
      });
    }

    res.json({
      success: true,
      data: callCost,
    });
  } catch (error) {
    console.error("Error getting call cost by unique ID:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving call cost",
      error: error.message,
    });
  }
};

/**
 * Export call costs to CSV
 */
export const exportCallCostsToCSV = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      trunkId,
      accountNumber,
      callType,
      disposition,
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const options = {};

    if (trunkId) {
      options.trunkId = parseInt(trunkId);
    }

    if (accountNumber) {
      options.accountNumber = accountNumber;
    }

    if (callType) {
      options.callType = callType;
    }

    if (disposition) {
      options.disposition = disposition;
    }

    const callCosts = await CallCostService.getCallCostsByDateRange(
      new Date(startDate),
      new Date(endDate),
      { ...options, limit: 10000 } // Get up to 10,000 records for export
    );

    // Generate CSV content
    const csvHeaders = [
      "Unique ID",
      "Trunk ID",
      "Account Number",
      "Phone Number",
      "Source",
      "Destination",
      "Duration (s)",
      "Billed Duration (s)",
      "Cost per Minute",
      "Total Cost",
      "Currency",
      "Call Type",
      "Disposition",
      "Start Time",
      "End Time",
      "Provider Cost",
      "Cost Verified",
      "Notes",
    ];

    const csvRows = callCosts.map((cost) => [
      cost.uniqueid,
      cost.trunk_id,
      cost.account_number,
      cost.phone_number,
      cost.src,
      cost.dst,
      cost.duration,
      cost.billsec,
      cost.cost_per_minute,
      cost.total_cost,
      cost.currency,
      cost.call_type,
      cost.disposition,
      cost.start_time,
      cost.end_time,
      cost.provider_cost,
      cost.cost_verified,
      cost.notes,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
      .join("\n");

    const filename = `call_costs_${startDate}_to_${endDate}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting call costs to CSV:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting call costs",
      error: error.message,
    });
  }
};
