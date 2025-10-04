import CallCost from "../models/callCostModel.js";
import { PJSIPEndpoint } from "../models/pjsipModel.js";
import { Op } from "../config/sequelize.js";
import sequelize from "../config/sequelize.js";

/**
 * Calculate call cost based on duration and rate
 * @param {number} duration - Call duration in seconds
 * @param {number} costPerMinute - Cost per minute
 * @returns {number} - Total cost
 */
export const calculateCallCost = (duration, costPerMinute = 200) => {
  const durationMinutes = Math.ceil(duration / 60);
  return parseFloat((durationMinutes * costPerMinute).toFixed(4));
};

/**
 * Determine call type based on source and destination
 * @param {string} src - Source number
 * @param {string} dst - Destination number
 * @returns {string} - Call type (inbound, outbound, internal)
 */
export const determineCallType = (src, dst) => {
  // Internal calls (both numbers are extensions)
  if (src && dst && src.length <= 4 && dst.length <= 4) {
    return "internal";
  }

  // Outbound calls (from internal to external)
  if (src && dst && src.length <= 4 && dst.length > 4) {
    return "outbound";
  }

  // Inbound calls (from external to internal)
  if (src && dst && src.length > 4 && dst.length <= 4) {
    return "inbound";
  }

  // Default to outbound
  return "outbound";
};

/**
 * Get trunk information for a call
 * @param {string} src - Source number
 * @param {string} dst - Destination number
 * @returns {Object|null} - Trunk information
 */
export const getTrunkForCall = async (src, dst) => {
  try {
    // For outbound calls, find the most recently created enabled trunk
    const trunk = await PJSIPEndpoint.findOne({
      where: {
        endpoint_type: "trunk",
        enabled: true,
      },
      order: [["id", "DESC"]], // Use ID instead of createdAt
    });

    return trunk;
  } catch (error) {
    console.error("Error getting trunk for call:", error);
    return null;
  }
};

/**
 * Create a call cost record
 * @param {Object} callData - Call data from CDR
 * @returns {Object} - Created call cost record
 */
export const createCallCostRecord = async (callData) => {
  try {
    const {
      uniqueid,
      src,
      dst,
      duration = 0,
      billsec = 0,
      disposition,
      start,
      end,
    } = callData;

    // Determine call type
    const callType = determineCallType(src, dst);

    // Only track costs for outbound calls
    if (callType !== "outbound") {
      console.log(`Skipping cost tracking for ${callType} call: ${uniqueid}`);
      return null;
    }

    // Get trunk information
    const trunk = await getTrunkForCall(src, dst);
    if (!trunk) {
      console.log(`No trunk found for call: ${uniqueid}`);
      return null;
    }

    console.log(`Found trunk for call: ${uniqueid}`, {
      trunkId: trunk.id,
      trunkName: trunk.name,
      accountNumber: trunk.account_number,
    });

    // Calculate cost
    const costPerMinute = 200; // Default rate, can be made configurable
    const totalCost = calculateCallCost(billsec || duration, costPerMinute);

    // Create call cost record
    const callCostData = {
      uniqueid,
      trunk_id: null, // Set to null since trunk.id is actually the name
      account_number: trunk.account_number,
      phone_number: trunk.phone_number,
      src,
      dst,
      duration,
      billsec,
      cost_per_minute: costPerMinute,
      total_cost: totalCost,
      currency: "Ushs",
      call_type: callType,
      disposition,
      start_time: start || new Date(),
      end_time: end || new Date(),
      cost_verified: false,
      notes: `Auto-calculated cost for ${callType} call (Trunk: ${trunk.id})`,
    };

    const callCost = await CallCost.create(callCostData);

    console.log(`Call cost recorded: ${uniqueid} - ${totalCost} (${billsec}s)`);

    return callCost;
  } catch (error) {
    console.error("Error creating call cost record:", error);
    return null;
  }
};

/**
 * Get call cost statistics
 * @param {Object} filters - Date range and other filters
 * @returns {Object} - Cost statistics
 */
export const getCallCostStats = async (filters = {}) => {
  try {
    const {
      startDate,
      endDate,
      trunkId,
      accountNumber,
      callType,
      disposition,
    } = filters;

    const whereClause = {};

    if (startDate && endDate) {
      whereClause.start_time = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (trunkId) {
      whereClause.trunk_id = trunkId;
    }

    if (accountNumber) {
      whereClause.account_number = accountNumber;
    }

    if (callType) {
      whereClause.call_type = callType;
    }

    if (disposition) {
      whereClause.disposition = disposition;
    }

    const stats = await CallCost.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("total_cost")), "total_cost"],
        [sequelize.fn("COUNT", sequelize.col("id")), "call_count"],
        [sequelize.fn("SUM", sequelize.col("duration")), "total_duration"],
        [sequelize.fn("AVG", sequelize.col("total_cost")), "avg_cost"],
        [sequelize.fn("AVG", sequelize.col("duration")), "avg_duration"],
      ],
    });

    return {
      totalCost: parseFloat(stats[0]?.dataValues?.total_cost || 0),
      callCount: parseInt(stats[0]?.dataValues?.call_count || 0),
      totalDuration: parseInt(stats[0]?.dataValues?.total_duration || 0),
      avgCost: parseFloat(stats[0]?.dataValues?.avg_cost || 0),
      avgDuration: parseFloat(stats[0]?.dataValues?.avg_duration || 0),
    };
  } catch (error) {
    console.error("Error getting call cost stats:", error);
    return {
      totalCost: 0,
      callCount: 0,
      totalDuration: 0,
      avgCost: 0,
      avgDuration: 0,
    };
  }
};

/**
 * Get call costs by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Query options
 * @returns {Array} - Array of call cost records
 */
export const getCallCostsByDateRange = async (
  startDate,
  endDate,
  options = {}
) => {
  try {
    const {
      limit = 100,
      offset = 0,
      trunkId,
      accountNumber,
      callType,
      disposition,
    } = options;

    const whereClause = {
      start_time: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (trunkId) {
      whereClause.trunk_id = trunkId;
    }

    if (accountNumber) {
      whereClause.account_number = accountNumber;
    }

    if (callType) {
      whereClause.call_type = callType;
    }

    if (disposition) {
      whereClause.disposition = disposition;
    }

    const callCosts = await CallCost.findAll({
      where: whereClause,
      order: [["start_time", "DESC"]],
      limit,
      offset,
    });

    return callCosts;
  } catch (error) {
    console.error("Error getting call costs by date range:", error);
    return [];
  }
};

/**
 * Update call cost with provider verification
 * @param {string} uniqueid - Call unique ID
 * @param {number} providerCost - Actual cost from provider
 * @param {boolean} verified - Whether cost was verified
 * @returns {Object|null} - Updated call cost record
 */
export const updateCallCostWithProvider = async (
  uniqueid,
  providerCost,
  verified = true
) => {
  try {
    const callCost = await CallCost.findOne({
      where: { uniqueid },
    });

    if (!callCost) {
      console.log(`Call cost record not found for: ${uniqueid}`);
      return null;
    }

    await callCost.update({
      provider_cost: providerCost,
      cost_verified: verified,
      notes: `Provider cost: ${providerCost}, verified: ${verified}`,
    });

    console.log(
      `Updated call cost for ${uniqueid} with provider cost: ${providerCost}`
    );

    return callCost;
  } catch (error) {
    console.error("Error updating call cost with provider:", error);
    return null;
  }
};

/**
 * Get cost summary by trunk
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Cost summary by trunk
 */
export const getCostSummaryByTrunk = async (startDate, endDate) => {
  try {
    const summary = await CallCost.findAll({
      where: {
        start_time: {
          [Op.between]: [startDate, endDate],
        },
        call_type: "outbound",
      },
      attributes: [
        "trunk_id",
        "account_number",
        "phone_number",
        [sequelize.fn("SUM", sequelize.col("total_cost")), "total_cost"],
        [sequelize.fn("COUNT", sequelize.col("id")), "call_count"],
        [sequelize.fn("SUM", sequelize.col("duration")), "total_duration"],
      ],
      group: ["trunk_id", "account_number", "phone_number"],
      order: [[sequelize.fn("SUM", sequelize.col("total_cost")), "DESC"]],
    });

    return summary.map((item) => ({
      trunkId: item.trunk_id,
      accountNumber: item.account_number,
      phoneNumber: item.phone_number,
      totalCost: parseFloat(item.dataValues.total_cost || 0),
      callCount: parseInt(item.dataValues.call_count || 0),
      totalDuration: parseInt(item.dataValues.total_duration || 0),
    }));
  } catch (error) {
    console.error("Error getting cost summary by trunk:", error);
    return [];
  }
};
