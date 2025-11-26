import axios from "axios";

const baseUrl =
  process.env.TRUNK_PROVIDER_API_URL ||
  "https://ug.cyber-innovative.com:444/cyber-api/cyber_validate.php";

// Server IP for authorization (can be overridden by env var)
const serverIp = process.env.SERVER_PUBLIC_IP || "3.111.43.161";

/**
 * Generate Basic Auth header for a specific account
 * Format: Basic base64(account_number:server_ip)
 */
const generateAuthHeader = (accountNumber) => {
  const credentials = `${accountNumber}:${serverIp}`;
  const base64Credentials = Buffer.from(credentials).toString("base64");
  return `Basic ${base64Credentials}`;
};

export const checkBalance = async (accountNumber) => {
  // Only allow balance checking in production environment
  if (process.env.NODE_ENV !== "production") {
    console.log("Balance checking is only available in production environment");
    return {
      success: false,
      error: "Balance checking is only available in production environment",
      message: "This feature is only available in production",
    };
  }

  try {
    // Generate account-specific authorization header
    const authHeader = generateAuthHeader(accountNumber);

    console.log(`[Balance Check] Checking balance for account: ${accountNumber}`);

    const response = await axios.post(
      baseUrl,
      new URLSearchParams({
        account: accountNumber,
        BALANCE: "BALANCE",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: authHeader,
        },
      }
    );

    console.log(`[Balance Check] Response:`, response.data);

    return {
      success: true,
      data: response.data,
      balance: parseBalanceResponse(response.data),
    };
  } catch (error) {
    console.error("Error checking trunk balance:", error);
    console.error("Error response:", error.response?.data);
    return {
      success: false,
      error: error.response?.data || error.message,
      message: "Failed to check balance",
    };
  }
};

const parseBalanceResponse = (responseData) => {
  console.log("Parsing balance response:", responseData);

  if (responseData.status === "ok" && responseData.balance?.message) {
    const balanceAmount = parseFloat(responseData.balance.message);
    return {
      amount: balanceAmount,
      currency: "USHS",
      lastUpdated: new Date().toISOString(),
    };
  }

  // Handle failure cases
  if (responseData.status === "Fail") {
    return {
      amount: 0,
      currency: "USHS",
      lastUpdated: new Date().toISOString(),
      error: responseData.details?.message || "API request failed",
    };
  }

  return {
    amount: 0,
    currency: "USHS",
    lastUpdated: new Date().toISOString(),
    error: responseData.balance?.message || "Unable to parse balance",
  };
};

export const updateBalanceAfterCall = async (
  accountNumber,
  callDuration,
  callCost
) => {
  try {
    // This would be called after a call is completed
    // For now, we'll just log the call details
    console.log(`Call completed for account ${accountNumber}:`, {
      duration: callDuration,
      cost: callCost,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you might want to:
    // 1. Store call details in database
    // 2. Update local balance cache
    // 3. Trigger balance refresh

    return {
      success: true,
      message: "Call details logged successfully",
    };
  } catch (error) {
    console.error("Error updating balance after call:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if balance is sufficient for a call
 * @param {string} accountNumber - Account number to check
 * @param {number} estimatedCost - Estimated cost of the call
 * @param {number} minimumBalance - Minimum balance threshold (default: $5.00)
 * @returns {Object} - Balance check result
 */
export const checkBalanceForCall = async (
  accountNumber,
  estimatedCost = 200,
  minimumBalance = 5000
) => {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Skipping balance check");
      return {
        success: true,
        canMakeCall: true,
        currentBalance: 15000.0,
        estimatedCost,
        message: "Development mode - balance check bypassed",
      };
    }

    console.log(
      `Checking balance for call: Account ${accountNumber}, Estimated cost: $${estimatedCost}`
    );

    // Get current balance from provider
    const balanceResult = await checkBalance(accountNumber);

    if (!balanceResult.success) {
      return {
        success: false,
        canMakeCall: false,
        message: "Failed to check balance with provider",
        error: balanceResult.error,
      };
    }

    const currentBalance = balanceResult.balance?.amount || 0;
    const canMakeCall = currentBalance >= estimatedCost + minimumBalance;

    console.log(`Balance check result:`, {
      accountNumber,
      currentBalance,
      estimatedCost,
      minimumBalance,
      canMakeCall,
    });

    return {
      success: true,
      canMakeCall,
      currentBalance,
      estimatedCost,
      minimumBalance,
      message: canMakeCall
        ? "Sufficient balance for call"
        : `Insufficient balance. Required: $${
            estimatedCost + minimumBalance
          }, Available: $${currentBalance}`,
    };
  } catch (error) {
    console.error("Error checking balance for call:", error);
    return {
      success: false,
      canMakeCall: false,
      message: "Error checking balance",
      error: error.message,
    };
  }
};

/**
 * Estimate call cost based on destination and duration
 * @param {string} destination - Destination number
 * @param {number} estimatedDuration - Estimated duration in seconds
 * @returns {number} - Estimated cost in USD
 */
export const estimateCallCost = (destination, estimatedDuration = 60) => {
  try {
    // Basic cost estimation logic
    // In a real implementation, you would have rate tables per destination
    const durationMinutes = Math.ceil(estimatedDuration / 60);

    // Default rate: $0.01 per minute
    let ratePerMinute = 200;

    // Adjust rates based on destination (example)
    if (destination.startsWith("+256")) {
      // US/Canada calls
      ratePerMinute = 200;
    } else if (destination.startsWith("+44")) {
      // UK calls
      ratePerMinute = 800;
    } else if (destination.startsWith("+91")) {
      // India calls
      ratePerMinute = 1200;
    }

    const estimatedCost = durationMinutes * ratePerMinute;

    console.log(
      `Estimated call cost: ${destination} for ${estimatedDuration}s = $${estimatedCost}`
    );

    return parseFloat(estimatedCost.toFixed(4));
  } catch (error) {
    console.error("Error estimating call cost:", error);
    return 0.01; // Default fallback
  }
};
