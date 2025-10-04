// services/cdrCsvService.js
// -----------------------------------------------------------------------------
// Read Asterisk CSV CDR (Master.csv) and return call history tailored per agent
// -----------------------------------------------------------------------------
// This utility is used when USE_CDR_CSV=true in the environment.  It replicates
// (a subset of) the logic inside formatCdrRecord() but works on raw CSV rows.
// -----------------------------------------------------------------------------
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

// Default location for Asterisk CSV CDR
const DEFAULT_CDR_CSV_PATH = "/var/log/asterisk/cdr-csv/Master.csv";

/**
 * Map a raw CSV row (array) to a normalized CDR-like object using the typical
 * Asterisk cdr-csv order. Extra columns are ignored gracefully.
 * Default order (18 columns):
 * 0 accountcode, 1 src, 2 dst, 3 dcontext, 4 clid, 5 channel, 6 dstchannel,
 * 7 lastapp, 8 lastdata, 9 start, 10 answer, 11 end, 12 duration, 13 billsec,
 * 14 disposition, 15 amaflags, 16 uniqueid, 17 userfield
 */
function mapRowToRecord(row) {
  const safe = (i) => (i >= 0 && i < row.length ? row[i] : "");
  return {
    accountcode: safe(0),
    src: safe(1),
    dst: safe(2),
    dcontext: safe(3),
    clid: safe(4),
    channel: safe(5),
    dstchannel: safe(6),
    lastapp: safe(7),
    lastdata: safe(8),
    start: safe(9),
    answer: safe(10),
    end: safe(11),
    duration: safe(12),
    billsec: safe(13),
    disposition: safe(14),
    amaflags: safe(15),
    uniqueid: safe(16),
    userfield: safe(17),
  };
}

/**
 * Read and parse the entire CSV file (usually only a day's worth) and return
 * recent call records for the given extension.
 * @param {string} extension - agent extension (e.g., "1001")
 * @param {number} [limit=50] - max number of records to return
 * @returns {Promise<Array>} formatted records (same shape as formatCdrRecord)
 */
export async function getCallHistoryFromCsv(extension, limit = 50) {
  const filePath = process.env.CDR_CSV_PATH || DEFAULT_CDR_CSV_PATH;

  if (!fs.existsSync(filePath)) {
    throw new Error(`CDR CSV file not found at ${filePath}`);
  }

  const content = await fs.promises.readFile(filePath, "utf8");

  // Parse without fixed columns to support variants
  const rows = parse(content, {
    relax_quotes: true,
    skip_empty_lines: true,
  });

  // Map rows to records using standard index mapping; skip malformed rows
  const parsedRecords = rows
    .filter((r) => Array.isArray(r) && r.length >= 15) // basic sanity
    .map((r) => mapRowToRecord(r));

  // Filter by agent extension
  const filtered = parsedRecords.filter((r) => {
    return (
      r.src === extension ||
      r.dst === extension ||
      (r.channel && r.channel.startsWith(`PJSIP/${extension}-`))
    );
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.start) - new Date(a.start));

  // Limit & format
  const sliced = filtered.slice(0, limit);
  return sliced.map((r) => formatCsvRecord(r, extension));
}

// ------------------ helpers ------------------
function formatCsvRecord(record, extension) {
  // Duration as mm:ss (if billsec>0)
  let durationFormatted = null;
  const billsecNum = Number(record.billsec);
  if (billsecNum > 0) {
    const m = Math.floor(billsecNum / 60);
    const s = billsecNum % 60;
    durationFormatted = `${m}:${String(s).padStart(2, "0")}`;
  }

  const outbound = record.src === extension;
  const type = outbound ? "outbound" : "inbound";

  let status = "completed";
  if (record.disposition === "NO ANSWER") status = "missed";
  else if (["FAILED", "BUSY"].includes(record.disposition)) status = "failed";
  else if (record.disposition === "NORMAL" && billsecNum === 0)
    status = "missed";

  // Extract phone number with fallback chain
  let phoneNumber;
  if (outbound) {
    phoneNumber =
      firstNonEmpty(record.dst, digits(record.lastdata), digits(record.clid)) ||
      "Unknown";
  } else {
    phoneNumber =
      firstNonEmpty(record.userfield, record.src, digits(record.clid)) ||
      "Unknown";
  }

  return {
    id: record.uniqueid,
    phoneNumber,
    name: null,
    type,
    status,
    duration: durationFormatted,
    timestamp: record.start,
    billsec: billsecNum,
  };
}

const digits = (str) => (str || "").match(/\d+/)?.[0] || null;
const firstNonEmpty = (...vals) =>
  vals.find((v) => v && String(v).trim() !== "");
