import sequelize, { Op } from "../config/sequelize.js";
import CDR from "../models/cdr.js";

// Define CDR model if not already imported

/**
 * Get call history records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCallHistory = async (req, res) => {
  // If CSV mode enabled, delegate to CSV service
  if (process.env.USE_CDR_CSV === "true") {
    try {
      const { extension = "", limit = 50 } = req.query;
      const { getCallHistoryFromCsv } = await import(
        "../services/cdrCsvService.js"
      );
      const records = await getCallHistoryFromCsv(extension, limit);
      return res.status(200).json({
        success: true,
        data: {
          total: records.length,
          records,
        },
      });
    } catch (csvErr) {
      console.error("Error fetching CSV call history:", csvErr);
      return res.status(500).json({
        success: false,
        message: "CSV CDR error",
        error: csvErr.message,
      });
    }
  }

  // ---- existing MySQL logic below ----
  try {
    const { extension, limit } = req.query;

    // If no extension provided, return empty result
    if (!extension || extension.trim() === "") {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          records: [],
        },
      });
    }

    // Build query conditions
    const whereConditions = {
      [Op.or]: [
        { src: extension },
        { dst: extension },
        { channel: { [Op.like]: `PJSIP/${extension}-%` } }, // Match calls where the extension is in the channel
      ],
    };

    // Get call records
    const callRecords = await CDR.findAll({
      where: whereConditions,
      limit: parseInt(limit) || 50,
      order: [["start", "DESC"]], // Newest first
    });

    // Format the records for the client
    const formattedRecords = callRecords.map((record) =>
      formatCdrRecord(record, extension)
    );

    res.status(200).json({
      success: true,
      data: {
        total: callRecords.length,
        records: formattedRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
      error: error.message,
    });
  }
};

/**
 * Format a CDR record for client consumption
 * @param {Object} record - CDR record from database
 * @param {String} extension - User extension for determining call direction
 * @returns {Object} Formatted call record
 */
export const formatCdrRecord = (record, extension) => {
  // Calculate duration in minutes:seconds format - use billsec for answered calls, duration for total call time
  let durationFormatted = null;
  if (record.billsec > 0) {
    // For answered calls, show billable duration (actual talk time)
    const minutes = Math.floor(record.billsec / 60);
    const seconds = record.billsec % 60;
    durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  } else if (record.duration > 0) {
    // For unanswered calls, show total duration (ring time)
    const minutes = Math.floor(record.duration / 60);
    const seconds = record.duration % 60;
    durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Parse userfield for additional information (format: number|name|codec|transfer|hold|CALLED:called_number)
  const userfieldParts = record.userfield ? record.userfield.split("|") : [];
  // Only use callerNumber if it's a valid phone number (at least 5 digits)
  const callerNumber =
    userfieldParts[0] && userfieldParts[0].match(/^\d{5,}$/)
      ? userfieldParts[0]
      : null;
  const callerName = userfieldParts[1] || null;
  const codec = userfieldParts[2] || null;
  const transferInfo =
    userfieldParts.find((part) => part.startsWith("TRANSFER:")) || null;
  const holdInfo =
    userfieldParts.find((part) => part.startsWith("HOLD_DURATION:")) || null;
  const calledNumberInfo =
    userfieldParts.find((part) => part.startsWith("CALLED:")) || null;
  const calledNumber = calledNumberInfo ? calledNumberInfo.split(":")[1] : null;
  const holdDuration = holdInfo ? parseInt(holdInfo.split(":")[1]) : null;

  // Extract extension from channel if needed
  const channelExtension =
    record.channel && record.channel.startsWith("PJSIP/")
      ? record.channel.split("-")[0].replace("PJSIP/", "")
      : null;

  // Determine call type and status - FIXED LOGIC
  // IMPORTANT: Use channel to determine actual extension, not src (which could be masked caller ID)
  // An outbound call means the extension is in the channel
  // An inbound call means the extension is the destination
  const isOutbound = channelExtension === extension || record.src === extension;
  const type = isOutbound ? "outbound" : "inbound";

  let status = "completed";
  if (record.disposition === "NO ANSWER") {
    status = "missed";
  } else if (record.disposition === "FAILED" || record.disposition === "BUSY") {
    status = "failed";
  } else if (record.disposition === "NORMAL" && record.billsec === 0) {
    // NORMAL disposition but zero billsec likely means a failed or missed call
    status = "missed";
  }

  // Extract phone number with comprehensive logic
  let phoneNumber;
  let extractedFrom = "default";

  if (isOutbound) {
    // For outbound calls, try multiple sources for the destination number
    phoneNumber = callerNumber || record.dst;
    extractedFrom = callerNumber ? "userfield" : "dst";

    // If dst looks like an extension or is truncated, try other sources
    if (
      !phoneNumber ||
      phoneNumber.length <= 4 ||
      phoneNumber === extension ||
      phoneNumber === "h"
    ) {
      // Try dnid (Dialed Number ID) - often contains the real dialed number
      if (record.dnid && record.dnid !== phoneNumber) {
        phoneNumber = record.dnid;
        extractedFrom = "dnid";
      }
      // Try lastdata - might contain the dialed number
      else if (record.lastdata && record.lastdata.match(/^\d+$/)) {
        phoneNumber = record.lastdata;
        extractedFrom = "lastdata";
      }
      // Try clid as fallback
      else if (record.clid) {
        const clidMatch = record.clid.match(/<(\d+)>/);
        if (clidMatch) {
          phoneNumber = clidMatch[1];
          extractedFrom = "clid_angled";
        } else {
          const numberMatch = record.clid.match(/(\d+)/);
          if (numberMatch) {
            phoneNumber = numberMatch[1];
            extractedFrom = "clid_regex";
          }
        }
      }
    }
  } else {
    // For inbound calls, try multiple sources for the caller number
    // Priority order: userfield > src > clid > other sources
    phoneNumber = callerNumber || record.src;
    extractedFrom = callerNumber ? "userfield" : "src";

    // For inbound calls, use existing logic
    if (!phoneNumber || phoneNumber === extension || phoneNumber.length <= 4) {
      // Try userfield first - this contains the real caller number (stored by callMonitoringService)
      if (record.userfield && record.userfield.match(/^\d+$/)) {
        phoneNumber = record.userfield;
        extractedFrom = "userfield";
      }
      // Try ConnectedLineNum - this often contains the real caller number
      else if (
        record.connectedlinenum &&
        record.connectedlinenum.match(/^\d+$/)
      ) {
        phoneNumber = record.connectedlinenum;
        extractedFrom = "connectedlinenum";
      }
      // Try callerid field
      else if (record.callerid && record.callerid !== phoneNumber) {
        const callerMatch = record.callerid.match(/<(\d+)>/);
        if (callerMatch) {
          phoneNumber = callerMatch[1];
          extractedFrom = "callerid_angled";
        } else {
          const numberMatch = record.callerid.match(/(\d+)/);
          if (numberMatch) {
            phoneNumber = numberMatch[1];
            extractedFrom = "callerid_regex";
          }
        }
      }
      // Try clid as fallback
      else if (record.clid) {
        const clidMatch = record.clid.match(/<(\d+)>/);
        if (clidMatch) {
          phoneNumber = clidMatch[1];
          extractedFrom = "clid_angled";
        } else {
          const numberMatch = record.clid.match(/(\d+)/);
          if (numberMatch) {
            phoneNumber = numberMatch[1];
            extractedFrom = "clid_regex";
          }
        }
      }
      // Try accountcode - might contain the real caller number
      else if (record.accountcode && record.accountcode.match(/^\d+$/)) {
        phoneNumber = record.accountcode;
        extractedFrom = "accountcode";
      }
    }
  }

  // Final fallback - try to extract from channel info if available
  if (!phoneNumber || phoneNumber.length <= 4 || phoneNumber === extension) {
    // Try to extract from channel name if it contains caller info
    if (record.channel && record.channel.includes("-")) {
      const channelParts = record.channel.split("-");
      if (channelParts.length > 1) {
        const callerPart = channelParts[1];
        if (callerPart && callerPart.match(/^\d+$/)) {
          phoneNumber = callerPart;
          extractedFrom = "channel_extraction";
        }
      }
    }

    // Last resort fallback
    if (!phoneNumber || phoneNumber.length <= 4 || phoneNumber === extension) {
      phoneNumber = record.clid || "Unknown";
      extractedFrom = "clid_fallback";
    }
  }

  // Enhanced return object with called number tracking
  return {
    id: record.id || record.uniqueid,
    phoneNumber: phoneNumber || "Unknown",
    name: callerName, // Now includes caller name from userfield
    type,
    status,
    duration: durationFormatted,
    timestamp: (() => {
      const timestamp =
        record.start || record.calldate || record.end || new Date();
      // If it's a Date object from the database, it's already in EAT timezone
      // We need to ensure it's treated as EAT when converting to ISO
      if (timestamp instanceof Date) {
        // Create a new date object and adjust for timezone
        const eatOffset = 3 * 60; // EAT is UTC+3
        const utcTime = timestamp.getTime() - eatOffset * 60 * 1000;
        return new Date(utcTime).toISOString();
      }
      return new Date(timestamp).toISOString();
    })(),
    // Additional fields for enhanced call history
    codec: codec,
    transferInfo: transferInfo,
    holdDuration: holdDuration,
    recordingFile: record.recordingfile || null,
    billsec: record.billsec || 0,
    disposition: record.disposition,
    calledNumber: calledNumber, // Which number was dialed (for inbound calls)
    extractedFrom: extractedFrom, // For debugging
  };
};

/**
 * Get recent call history for a specific extension
 * @param {String} extension - User extension
 * @param {Number} limit - Maximum number of records to return
 * @returns {Array} Array of formatted call records
 */
export const getRecentCallHistory = async (extension, limit = 10) => {
  try {
    const whereConditions = {
      [Op.or]: [{ src: extension }, { dst: extension }],
    };

    const callRecords = await CDR.findAll({
      where: whereConditions,
      limit: parseInt(limit),
      order: [["start", "DESC"]],
    });

    return callRecords.map((record) => formatCdrRecord(record, extension));
  } catch (error) {
    console.error("Error fetching recent call history:", error);
    return [];
  }
};

// New endpoint to get call counts by extension
export const getCallCountsByExtension = async (req, res) => {
  // console.log(
  //   "Hit the getCallCountsByExtension controller 🐝🐝🐝🐝🐝🐝🐝",
  //   req.query
  // );
  try {
    const { extension, startDate, endDate } = req.query;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension parameter is required",
      });
    }

    // Build query conditions
    const whereConditions = {
      [Op.or]: [
        { src: extension },
        { dst: extension },
        { channel: { [Op.like]: `PJSIP/${extension}-%` } },
      ],
    };

    // Add date range if provided
    if (startDate || endDate) {
      whereConditions.start = {};

      if (startDate) {
        // FIXED: Parse date components to avoid timezone conversion issues
        // Create Date at midnight local time using date components
        const [year, month, day] = startDate.split("-").map(Number);
        const startDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
        whereConditions.start[Op.gte] = startDateTime;
      }

      if (endDate) {
        // FIXED: Parse date components to avoid timezone conversion issues
        // Create Date at end of day local time using date components
        const [year, month, day] = endDate.split("-").map(Number);
        const endDateTime = new Date(year, month - 1, day, 23, 59, 59, 999);
        whereConditions.start[Op.lte] = endDateTime;
      }
    } else {
      // If no date range provided, default to today (from midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      whereConditions.start = {
        [Op.gte]: today,
      };

      // console.log(
      //   "Using default date range (today from midnight):",
      //   today.toISOString()
      // );
    }

    // Log the final query conditions for debugging
    // console.log(
    //   "Query conditions for call counts:",
    //   JSON.stringify(whereConditions, null, 2)
    // );

    // Get total calls
    const totalCalls = await CDR.count({
      where: whereConditions,
    });

    // Get answered calls (disposition ANSWERED regardless of billsec)
    const answeredCalls = await CDR.count({
      where: {
        ...whereConditions,
        disposition: "ANSWERED",
      },
    });

    // Get missed calls
    const missedCalls = await CDR.count({
      where: {
        ...whereConditions,
        [Op.or]: [
          { disposition: "NO ANSWER" },
          { disposition: "BUSY" },
          { disposition: "FAILED" },
          {
            [Op.and]: [{ disposition: "ANSWERED" }, { billsec: 0 }],
          },
        ],
      },
    });

    // Get outbound calls
    const outboundCalls = await CDR.count({
      where: {
        ...whereConditions,
        src: extension,
      },
    });

    // Get inbound calls
    const inboundCalls = await CDR.count({
      where: {
        ...whereConditions,
        [Op.not]: { src: extension },
      },
    });

    // Calculate average call duration for answered calls (using ABS for negative values)
    const callDurationResult = await CDR.findOne({
      attributes: [
        [
          sequelize.fn("AVG", sequelize.fn("ABS", sequelize.col("billsec"))),
          "avgDuration",
        ],
      ],
      where: {
        ...whereConditions,
        disposition: "ANSWERED",
        billsec: { [Op.ne]: 0 },
      },
      raw: true,
    });

    const avgCallDuration = callDurationResult?.avgDuration
      ? Math.round(callDurationResult.avgDuration)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        extension,
        totalCalls,
        answeredCalls,
        missedCalls,
        outboundCalls,
        inboundCalls,
        avgCallDuration,
      },
    });
  } catch (error) {
    console.error("Error fetching call counts by extension:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call counts",
      error: error.message,
    });
  }
};

/**
 * Get call history with real caller numbers from AMI events
 * This endpoint provides more accurate caller information
 */
export const getCallHistoryWithRealNumbers = async (req, res) => {
  try {
    const { extension, limit } = req.query;

    // If no extension provided, return empty result
    if (!extension || extension.trim() === "") {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          records: [],
        },
      });
    }

    // Get call records from CDR database
    const whereConditions = {
      [Op.or]: [
        { src: extension },
        { dst: extension },
        { channel: { [Op.like]: `PJSIP/${extension}-%` } },
      ],
    };

    const callRecords = await CDR.findAll({
      where: whereConditions,
      limit: parseInt(limit) || 50,
      order: [["start", "DESC"]], // Newest first
      attributes: [
        "id",
        "uniqueid",
        "calldate",
        "start",
        "end",
        "src",
        "dst",
        "dcontext",
        "channel",
        "lastapp",
        "lastdata",
        "duration",
        "billsec",
        "disposition",
        "clid",
        "amaflags",
        "accountcode",
        "userfield",
        "cdr_json",
      ],
    });

    // Format records with enhanced caller number detection
    const formattedRecords = callRecords.map((record) => {
      // Enhanced phone number extraction with real caller number detection
      let phoneNumber;
      let extractedFrom = "default";
      const isOutbound = record.src === extension;
      const isInbound = record.dst === extension;
      const type = isOutbound ? "outbound" : "inbound";

      if (isInbound) {
        // For inbound calls, prioritize userfield (contains real caller number from AMI)
        if (record.userfield && record.userfield.match(/^\d+$/)) {
          phoneNumber = record.userfield;
          extractedFrom = "userfield";
        } else if (record.src && record.src.match(/^\d+$/)) {
          phoneNumber = record.src;
          extractedFrom = "src";
        } else {
          // Try to extract from CDR JSON data as last resort
          try {
            if (record.cdr_json) {
              const cdrData = JSON.parse(record.cdr_json);
              if (
                cdrData.ConnectedLineNum &&
                cdrData.ConnectedLineNum.match(/^\d+$/)
              ) {
                phoneNumber = cdrData.ConnectedLineNum;
                extractedFrom = "cdr_json_connectedlinenum";
              } else if (
                cdrData.CallerIDNum &&
                cdrData.CallerIDNum.match(/^\d+$/)
              ) {
                phoneNumber = cdrData.CallerIDNum;
                extractedFrom = "cdr_json_calleridnum";
              }
            }
          } catch (jsonError) {
            console.warn("Error parsing CDR JSON:", jsonError);
          }

          if (!phoneNumber || phoneNumber === "Unknown") {
            phoneNumber = "Unknown";
            extractedFrom = "unknown";
          }
        }
      } else {
        // For outbound calls
        if (record.dst && record.dst.match(/^\d+$/)) {
          phoneNumber = record.dst;
          extractedFrom = "dst";
        } else if (record.dnid && record.dnid.match(/^\d+$/)) {
          phoneNumber = record.dnid;
          extractedFrom = "dnid";
        } else {
          phoneNumber = "Unknown";
          extractedFrom = "unknown";
        }
      }

      // Calculate duration - use billsec for answered calls, duration for total call time
      let durationFormatted = null;
      if (record.billsec > 0) {
        // For answered calls, show billable duration (actual talk time)
        const minutes = Math.floor(record.billsec / 60);
        const seconds = record.billsec % 60;
        durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      } else if (record.duration > 0) {
        // For unanswered calls, show total duration (ring time)
        const minutes = Math.floor(record.duration / 60);
        const seconds = record.duration % 60;
        durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }

      // Determine status
      let status = "completed";
      if (record.disposition === "NO ANSWER") {
        status = "missed";
      } else if (
        record.disposition === "FAILED" ||
        record.disposition === "BUSY"
      ) {
        status = "failed";
      } else if (record.disposition === "NORMAL" && record.billsec === 0) {
        status = "missed";
      }

      return {
        id: record.id,
        phoneNumber: phoneNumber,
        name: null, // We don't have contact names in this system
        type: type,
        status: status,
        timestamp: (() => {
          const timestamp =
            record.start || record.calldate || record.end || new Date();
          // If it's a Date object from the database, it's already in EAT timezone
          // We need to ensure it's treated as EAT when converting to ISO
          if (timestamp instanceof Date) {
            // Create a new date object and adjust for timezone
            const eatOffset = 3 * 60; // EAT is UTC+3
            const utcTime = timestamp.getTime() - eatOffset * 60 * 1000;
            return new Date(utcTime).toISOString();
          }
          return new Date(timestamp).toISOString();
        })(),
        duration: durationFormatted,
        billsec: record.billsec,
        extractedFrom: extractedFrom,
        // Include raw data for debugging
        raw: {
          src: record.src,
          dst: record.dst,
          userfield: record.userfield,
          callerid: record.callerid,
          clid: record.clid,
          dnid: record.dnid,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: {
        total: formattedRecords.length,
        records: formattedRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching call history with real numbers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
      error: error.message,
    });
  }
};

export default {
  getCallHistory,
  getRecentCallHistory,
  formatCdrRecord,
  getCallCountsByExtension,
  getCallHistoryWithRealNumbers,
};
