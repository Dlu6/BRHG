import fs from "fs";
import path from "path";

/**
 * Service to directly consume Asterisk CDR data from CSV files
 * This ensures we're reading the exact same data that Asterisk generates
 */

/**
 * Parse Asterisk CDR CSV file using native Node.js methods
 * @param {string} filePath - Path to the CDR CSV file
 * @param {Object} options - Options for parsing
 * @returns {Promise<Array>} Array of parsed CDR records
 */
export const parseAsteriskCdrCsv = async (filePath, options = {}) => {
  const { limit = 100, startDate, endDate } = options;

  try {
    // Read the entire file content
    const fileContent = await fs.promises.readFile(filePath, "utf8");
    const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

    const records = [];

    for (const line of lines) {
      if (records.length >= limit) break;

      // Parse CSV line manually (handle quoted fields)
      const fields = parseCsvLine(line);

      if (fields.length < 18) continue;

      // Map fields to Asterisk CDR structure
      const record = {
        accountcode: fields[0] || "",
        src: fields[1] || "",
        dst: fields[2] || "",
        dcontext: fields[3] || "",
        clid: fields[4] || "",
        channel: fields[5] || "",
        dstchannel: fields[6] || "",
        lastapp: fields[7] || "",
        lastdata: fields[8] || "",
        start: fields[9] ? new Date(fields[9]) : null,
        answer: fields[10] ? new Date(fields[10]) : null,
        end: fields[11] ? new Date(fields[11]) : null,
        duration: parseInt(fields[12]) || 0,
        billsec: parseInt(fields[13]) || 0,
        disposition: fields[14] || "",
        amaflags: fields[15] || "",
        uniqueid: fields[16] || "",
        userfield: fields[17] || "",
      };

      // Filter by date range if provided
      if (startDate || endDate) {
        const recordDate = record.start;
        if (startDate && recordDate && recordDate < new Date(startDate))
          continue;
        if (endDate && recordDate && recordDate > new Date(endDate)) continue;
      }

      records.push(record);
    }

    return records;
  } catch (error) {
    console.error("Error parsing Asterisk CDR CSV:", error);
    throw error;
  }
};

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line - CSV line to parse
 * @returns {Array} Array of field values
 */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      fields.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  fields.push(current.trim());

  return fields;
}

/**
 * Get Asterisk CDR records for a specific extension
 * @param {string} extension - Extension to filter by
 * @param {Object} options - Options for filtering
 * @returns {Promise<Array>} Array of CDR records
 */
export const getAsteriskCdrForExtension = async (extension, options = {}) => {
  const { limit = 50, startDate, endDate } = options;

  // Default CDR file path
  const cdrFilePath =
    process.env.ASTERISK_CDR_PATH || "/var/log/asterisk/cdr-csv/Master.csv";

  try {
    // Check if file exists
    if (!fs.existsSync(cdrFilePath)) {
      throw new Error(`CDR file not found: ${cdrFilePath}`);
    }

    const allRecords = await parseAsteriskCdrCsv(cdrFilePath, {
      limit: limit * 2,
      startDate,
      endDate,
    });

    // Filter by extension
    const filteredRecords = allRecords.filter(
      (record) =>
        record.src === extension ||
        record.dst === extension ||
        record.channel.includes(`PJSIP/${extension}-`)
    );

    return filteredRecords.slice(0, limit);
  } catch (error) {
    console.error("Error reading Asterisk CDR:", error);
    throw error;
  }
};

/**
 * Get Asterisk CDR statistics for an extension
 * @param {string} extension - Extension to get stats for
 * @param {Object} options - Options for filtering
 * @returns {Promise<Object>} CDR statistics
 */
export const getAsteriskCdrStats = async (extension, options = {}) => {
  const { startDate, endDate } = options;

  try {
    const records = await getAsteriskCdrForExtension(extension, {
      limit: 1000,
      startDate,
      endDate,
    });

    const stats = {
      totalCalls: records.length,
      answeredCalls: records.filter(
        (r) => r.disposition === "ANSWERED" && r.billsec > 0
      ).length,
      missedCalls: records.filter(
        (r) =>
          r.disposition === "NO ANSWER" ||
          r.disposition === "BUSY" ||
          r.disposition === "FAILED" ||
          (r.disposition === "ANSWERED" && r.billsec === 0)
      ).length,
      outboundCalls: records.filter((r) => r.src === extension).length,
      inboundCalls: records.filter((r) => r.dst === extension).length,
      avgCallDuration: 0,
      totalDuration: 0,
      totalBillsec: 0,
    };

    // Calculate durations
    const answeredRecords = records.filter((r) => r.billsec > 0);
    if (answeredRecords.length > 0) {
      stats.avgCallDuration = Math.round(
        answeredRecords.reduce((sum, r) => sum + r.billsec, 0) /
          answeredRecords.length
      );
    }

    stats.totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    stats.totalBillsec = records.reduce((sum, r) => sum + r.billsec, 0);

    return stats;
  } catch (error) {
    console.error("Error calculating CDR stats:", error);
    throw error;
  }
};

/**
 * Format Asterisk CDR record for client consumption
 * @param {Object} record - Raw Asterisk CDR record
 * @param {string} extension - Extension for determining call direction
 * @returns {Object} Formatted record
 */
export const formatAsteriskCdrRecord = (record, extension) => {
  // Calculate duration in minutes:seconds format
  let durationFormatted = null;
  if (record.billsec > 0) {
    const minutes = Math.floor(record.billsec / 60);
    const seconds = record.billsec % 60;
    durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  } else if (record.duration > 0) {
    const minutes = Math.floor(record.duration / 60);
    const seconds = record.duration % 60;
    durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Determine call type and status
  const isOutbound = record.src === extension;
  const isInbound = record.dst === extension;
  const type = isOutbound ? "outbound" : "inbound";

  let status = "completed";
  if (record.disposition === "NO ANSWER") {
    status = "missed";
  } else if (record.disposition === "FAILED" || record.disposition === "BUSY") {
    status = "failed";
  } else if (record.disposition === "ANSWERED" && record.billsec === 0) {
    status = "missed";
  } else if (record.disposition === "ANSWERED" && record.billsec > 0) {
    status = "completed";
  }

  // Extract phone number
  let phoneNumber = "Unknown";
  let extractedFrom = "default";

  if (isOutbound) {
    // For outbound calls, try to get the dialed number
    phoneNumber = record.dst;
    extractedFrom = "dst";

    // If dst looks like an extension, try other sources
    if (
      !phoneNumber ||
      phoneNumber.length <= 4 ||
      phoneNumber === extension ||
      phoneNumber === "_X."
    ) {
      if (record.lastdata && record.lastdata.match(/^\d+$/)) {
        phoneNumber = record.lastdata;
        extractedFrom = "lastdata";
      } else if (record.clid) {
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
    // For inbound calls, try to get the caller number
    phoneNumber = record.src;
    extractedFrom = "src";

    if (!phoneNumber || phoneNumber === extension || phoneNumber.length <= 4) {
      if (record.userfield && record.userfield.match(/^\d+$/)) {
        phoneNumber = record.userfield;
        extractedFrom = "userfield";
      } else if (record.clid) {
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
  }

  return {
    id: record.uniqueid,
    phoneNumber: phoneNumber || "Unknown",
    name: null, // Asterisk CDR doesn't include contact names
    type,
    status,
    duration: durationFormatted,
    timestamp: record.start || new Date(),
    billsec: record.billsec || 0,
    disposition: record.disposition,
    extractedFrom: extractedFrom,
    // Additional Asterisk CDR fields
    amaflags: record.amaflags,
    accountcode: record.accountcode,
    uniqueid: record.uniqueid,
    channel: record.channel,
    dstchannel: record.dstchannel,
    lastapp: record.lastapp,
    lastdata: record.lastdata,
    dcontext: record.dcontext,
    answer: record.answer,
    end: record.end,
    userfield: record.userfield,
  };
};

export default {
  parseAsteriskCdrCsv,
  getAsteriskCdrForExtension,
  getAsteriskCdrStats,
  formatAsteriskCdrRecord,
};
