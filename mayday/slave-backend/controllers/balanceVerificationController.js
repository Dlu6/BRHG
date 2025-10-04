import {
  checkBalanceForCall,
  estimateCallCost,
} from "../services/trunkBalanceService.js";
import { PJSIPEndpoint } from "../models/pjsipModel.js";

/**
 * Verify balance before allowing a call
 */
export const verifyBalanceForCall = async (req, res) => {
  try {
    const {
      destination,
      estimatedDuration = 60,
      trunkId,
      accountNumber,
    } = req.body;

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "Destination number is required",
      });
    }

    // Get trunk information
    let trunk = null;
    if (trunkId) {
      trunk = await PJSIPEndpoint.findByPk(trunkId);
    } else if (accountNumber) {
      trunk = await PJSIPEndpoint.findOne({
        where: { account_number: accountNumber },
      });
    } else {
      // Get the most recently created enabled trunk
      trunk = await PJSIPEndpoint.findOne({
        where: {
          endpoint_type: "trunk",
          enabled: true,
        },
        order: [["createdAt", "DESC"]],
      });
    }

    if (!trunk) {
      return res.status(404).json({
        success: false,
        message: "No enabled trunk found",
      });
    }

    if (!trunk.account_number) {
      return res.status(400).json({
        success: false,
        message: "Trunk account number not configured",
      });
    }

    // Estimate call cost
    const estimatedCost = estimateCallCost(destination, estimatedDuration);

    // Check balance
    const balanceCheck = await checkBalanceForCall(
      trunk.account_number,
      estimatedCost
    );

    res.json({
      success: true,
      data: {
        trunk: {
          id: trunk.id,
          name: trunk.name,
          accountNumber: trunk.account_number,
          phoneNumber: trunk.phone_number,
        },
        call: {
          destination,
          estimatedDuration,
          estimatedCost,
        },
        balance: {
          canMakeCall: balanceCheck.canMakeCall,
          currentBalance: balanceCheck.currentBalance,
          estimatedCost: balanceCheck.estimatedCost,
          minimumBalance: balanceCheck.minimumBalance,
          message: balanceCheck.message,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying balance for call:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying balance for call",
      error: error.message,
    });
  }
};

/**
 * Get balance verification status for a trunk
 */
export const getBalanceVerificationStatus = async (req, res) => {
  try {
    const { trunkId, accountNumber } = req.query;

    let trunk = null;
    if (trunkId) {
      trunk = await PJSIPEndpoint.findByPk(trunkId);
    } else if (accountNumber) {
      trunk = await PJSIPEndpoint.findOne({
        where: { account_number: accountNumber },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Trunk ID or account number is required",
      });
    }

    if (!trunk) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    if (!trunk.account_number) {
      return res.status(400).json({
        success: false,
        message: "Trunk account number not configured",
      });
    }

    // Check current balance
    const balanceCheck = await checkBalanceForCall(trunk.account_number, 0.01);

    res.json({
      success: true,
      data: {
        trunk: {
          id: trunk.id,
          name: trunk.name,
          accountNumber: trunk.account_number,
          phoneNumber: trunk.phone_number,
        },
        balance: {
          currentBalance: balanceCheck.currentBalance,
          canMakeCall: balanceCheck.canMakeCall,
          message: balanceCheck.message,
        },
      },
    });
  } catch (error) {
    console.error("Error getting balance verification status:", error);
    res.status(500).json({
      success: false,
      message: "Error getting balance verification status",
      error: error.message,
    });
  }
};

/**
 * Estimate call cost for a destination
 */
export const estimateCallCostForDestination = async (req, res) => {
  try {
    const { destination, estimatedDuration = 60 } = req.query;

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "Destination number is required",
      });
    }

    const estimatedCost = estimateCallCost(destination, estimatedDuration);

    res.json({
      success: true,
      data: {
        destination,
        estimatedDuration,
        estimatedCost,
        ratePerMinute: estimatedCost / Math.ceil(estimatedDuration / 60),
      },
    });
  } catch (error) {
    console.error("Error estimating call cost:", error);
    res.status(500).json({
      success: false,
      message: "Error estimating call cost",
      error: error.message,
    });
  }
};
