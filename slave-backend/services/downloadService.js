import { Parser } from "json2csv";
import sequelize, { Op } from "../config/sequelize.js";
import CDR from "../models/cdr.js";
import UserModel from "../models/usersModel.js";
import CallCost from "../models/callCostModel.js";
import { parseISO, format as formatDate, startOfDay, endOfDay } from "date-fns";

class DownloadService {
  constructor() {
    this.parser = new Parser();
  }

  // Generate comprehensive call volume report
  async generateCallVolumeReport(startDate, endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const data = await CDR.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("start"), "%Y-%m-%d"),
          "date",
        ],
        [sequelize.fn("COUNT", sequelize.col("id")), "total_calls"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END"
            )
          ),
          "answered_calls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END"
            )
          ),
          "missed_calls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'BUSY' THEN 1 ELSE 0 END"
            )
          ),
          "busy_calls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'FAILED' THEN 1 ELSE 0 END"
            )
          ),
          "failed_calls",
        ],
        [sequelize.fn("AVG", sequelize.col("duration")), "avg_duration"],
        [sequelize.fn("SUM", sequelize.col("duration")), "total_duration"],
        [sequelize.fn("AVG", sequelize.col("billsec")), "avg_billable_time"],
        [sequelize.fn("SUM", sequelize.col("billsec")), "total_billable_time"],
      ],
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
      group: [sequelize.fn("DATE_FORMAT", sequelize.col("start"), "%Y-%m-%d")],
      order: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("start"), "%Y-%m-%d"),
          "ASC",
        ],
      ],
    });

    return data.map((row) => ({
      Date: row.dataValues.date,
      "Total Calls": row.dataValues.total_calls,
      "Answered Calls": row.dataValues.answered_calls,
      "Missed Calls": row.dataValues.missed_calls,
      "Busy Calls": row.dataValues.busy_calls,
      "Failed Calls": row.dataValues.failed_calls,
      "Answer Rate (%)":
        row.dataValues.total_calls > 0
          ? (
              (row.dataValues.answered_calls / row.dataValues.total_calls) *
              100
            ).toFixed(2)
          : "0.00",
      "Average Duration (seconds)": Math.round(
        row.dataValues.avg_duration || 0
      ),
      "Total Duration (seconds)": row.dataValues.total_duration || 0,
      "Average Billable Time (seconds)": Math.round(
        row.dataValues.avg_billable_time || 0
      ),
      "Total Billable Time (seconds)": row.dataValues.total_billable_time || 0,
    }));
  }

  // Generate detailed agent performance report
  async generateAgentPerformanceReport(startDate, endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Get all unique sources from CDR data (these are the "agents")
    const agentSources = await CDR.findAll({
      attributes: [
        "src",
        [sequelize.fn("COUNT", sequelize.col("id")), "call_count"],
        [sequelize.fn("SUM", sequelize.col("duration")), "total_duration"],
        [sequelize.fn("SUM", sequelize.col("billsec")), "total_billsec"],
        [sequelize.fn("MIN", sequelize.col("start")), "first_call"],
        [sequelize.fn("MAX", sequelize.col("start")), "last_call"],
      ],
      where: {
        start: {
          [Op.between]: [start, end],
        },
        src: {
          [Op.ne]: null, // Exclude null sources
        },
      },
      group: ["src"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
    });

    const agentData = [];

    for (const agentSource of agentSources) {
      const src = agentSource.src;

      // Get detailed call data for this source
      const calls = await CDR.findAll({
        where: {
          src: src,
          start: {
            [Op.between]: [start, end],
          },
        },
        attributes: [
          "id",
          "start",
          "answer",
          "end",
          "duration",
          "billsec",
          "disposition",
          "src",
          "dst",
          "clid",
        ],
      });

      if (calls.length > 0) {
        const totalCalls = calls.length;
        const answeredCalls = calls.filter(
          (call) => call.disposition === "ANSWERED"
        ).length;
        const missedCalls = calls.filter(
          (call) => call.disposition === "NO ANSWER"
        ).length;
        const normalCalls = calls.filter(
          (call) => call.disposition === "NORMAL"
        ).length;
        const totalDuration = calls.reduce(
          (sum, call) => sum + (call.duration || 0),
          0
        );
        const totalBillsec = calls.reduce(
          (sum, call) => sum + (call.billsec || 0),
          0
        );
        const avgDuration =
          totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
        const avgBillsec =
          totalCalls > 0 ? Math.round(totalBillsec / totalCalls) : 0;
        const answerRate =
          totalCalls > 0
            ? ((answeredCalls / totalCalls) * 100).toFixed(2)
            : "0.00";

        agentData.push({
          "Agent ID": src,
          "Agent Name": `Agent ${src}`,
          Extension: src,
          "Total Calls": totalCalls,
          "Answered Calls": answeredCalls,
          "Missed Calls": missedCalls,
          "Normal Calls": normalCalls,
          "Answer Rate (%)": answerRate,
          "Average Duration (seconds)": avgDuration,
          "Total Duration (seconds)": totalDuration,
          "Average Billable Time (seconds)": avgBillsec,
          "Total Billable Time (seconds)": totalBillsec,
          "First Call":
            calls.length > 0
              ? formatDate(new Date(calls[0].start), "yyyy-MM-dd HH:mm:ss")
              : "N/A",
          "Last Call":
            calls.length > 0
              ? formatDate(
                  new Date(calls[calls.length - 1].start),
                  "yyyy-MM-dd HH:mm:ss"
                )
              : "N/A",
        });
      }
    }

    return agentData;
  }

  // Generate detailed call log report
  async generateCallLogReport(startDate, endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const calls = await CDR.findAll({
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
      attributes: [
        "id",
        "start",
        "answer",
        "end",
        "clid",
        "src",
        "dst",
        "dcontext",
        "channel",
        "dstchannel",
        "lastapp",
        "lastdata",
        "duration",
        "billsec",
        "disposition",
        "accountcode",
        "uniqueid",
        "userfield",
      ],
      order: [["start", "DESC"]],
      limit: 10000, // Limit to prevent memory issues
    });

    return calls.map((call) => ({
      "Call ID": call.id,
      "Unique ID": call.uniqueid,
      "Start Time": formatDate(new Date(call.start), "yyyy-MM-dd HH:mm:ss"),
      "Answer Time": call.answer
        ? formatDate(new Date(call.answer), "yyyy-MM-dd HH:mm:ss")
        : "N/A",
      "End Time": call.end
        ? formatDate(new Date(call.end), "yyyy-MM-dd HH:mm:ss")
        : "N/A",
      "Caller ID": call.clid || "N/A",
      Source: call.src || "N/A",
      Destination: call.dst || "N/A",
      Context: call.dcontext || "N/A",
      Channel: call.channel || "N/A",
      "Destination Channel": call.dstchannel || "N/A",
      "Last Application": call.lastapp || "N/A",
      "Last Data": call.lastdata || "N/A",
      "Duration (seconds)": call.duration || 0,
      "Billable Time (seconds)": call.billsec || 0,
      Disposition: call.disposition || "N/A",
      "Account Code": call.accountcode || "N/A",
      "User Field": call.userfield || "N/A",
    }));
  }

  // Generate call cost analysis report
  async generateCallCostReport(startDate, endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const costs = await CallCost.findAll({
      where: {
        start_time: {
          [Op.between]: [start, end],
        },
      },
      attributes: [
        "id",
        "uniqueid",
        "account_number",
        "phone_number",
        "src",
        "dst",
        "duration",
        "billsec",
        "cost_per_minute",
        "total_cost",
        "currency",
        "call_type",
        "disposition",
        "start_time",
        "end_time",
        "provider_cost",
        "cost_verified",
        "notes",
      ],
      order: [["start_time", "DESC"]],
    });

    return costs.map((cost) => ({
      "Cost ID": cost.id,
      "Unique ID": cost.uniqueid,
      "Account Number": cost.account_number || "N/A",
      "Phone Number": cost.phone_number || "N/A",
      Source: cost.src || "N/A",
      Destination: cost.dst || "N/A",
      "Duration (seconds)": cost.duration || 0,
      "Billable Time (seconds)": cost.billsec || 0,
      "Cost Per Minute": cost.cost_per_minute || 0,
      "Total Cost": cost.total_cost || 0,
      Currency: cost.currency || "N/A",
      "Call Type": cost.call_type || "N/A",
      Disposition: cost.disposition || "N/A",
      "Start Time": formatDate(
        new Date(cost.start_time),
        "yyyy-MM-dd HH:mm:ss"
      ),
      "End Time": cost.end_time
        ? formatDate(new Date(cost.end_time), "yyyy-MM-dd HH:mm:ss")
        : "N/A",
      "Provider Cost": cost.provider_cost || "N/A",
      "Cost Verified": cost.cost_verified ? "Yes" : "No",
      Notes: cost.notes || "N/A",
    }));
  }

  // Generate summary report
  async generateSummaryReport(startDate, endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Get overall statistics
    const totalCalls = await CDR.count({
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
    });

    const answeredCalls = await CDR.count({
      where: {
        start: {
          [Op.between]: [start, end],
        },
        disposition: "ANSWERED",
      },
    });

    const totalDuration = await CDR.sum("duration", {
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
    });

    const totalBillsec = await CDR.sum("billsec", {
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
    });

    const totalCost = await CallCost.sum("total_cost", {
      where: {
        start_time: {
          [Op.between]: [start, end],
        },
      },
    });

    // Get top agents
    const topAgents = await CDR.findAll({
      attributes: [
        "src",
        [sequelize.fn("COUNT", sequelize.col("id")), "call_count"],
        [sequelize.fn("SUM", sequelize.col("duration")), "total_duration"],
      ],
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
      group: ["src"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      limit: 10,
    });

    // Get call disposition breakdown
    const dispositionBreakdown = await CDR.findAll({
      attributes: [
        "disposition",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
      group: ["disposition"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
    });

    return {
      summary: {
        "Report Period": `${formatDate(start, "yyyy-MM-dd")} to ${formatDate(
          end,
          "yyyy-MM-dd"
        )}`,
        "Total Calls": totalCalls,
        "Answered Calls": answeredCalls,
        "Answer Rate (%)":
          totalCalls > 0
            ? ((answeredCalls / totalCalls) * 100).toFixed(2)
            : "0.00",
        "Total Duration (seconds)": totalDuration || 0,
        "Total Billable Time (seconds)": totalBillsec || 0,
        "Total Cost": totalCost || 0,
        "Average Call Duration (seconds)":
          totalCalls > 0 ? Math.round((totalDuration || 0) / totalCalls) : 0,
      },
      topAgents: topAgents.map((agent, index) => ({
        Rank: index + 1,
        Extension: agent.src,
        "Call Count": agent.dataValues.call_count,
        "Total Duration (seconds)": agent.dataValues.total_duration || 0,
      })),
      dispositionBreakdown: dispositionBreakdown.map((disp) => ({
        Disposition: disp.disposition,
        Count: disp.dataValues.count,
        Percentage:
          totalCalls > 0
            ? ((disp.dataValues.count / totalCalls) * 100).toFixed(2)
            : "0.00",
      })),
    };
  }

  // Generate CSV from data
  generateCSV(data, options = {}) {
    const defaultOptions = {
      flatten: true,
      flattenSeparator: "_",
    };

    const parserOptions = { ...defaultOptions, ...options };
    return this.parser.parse(data, parserOptions);
  }

  // Generate filename
  generateFilename(reportType, startDate, endDate, fileFormat = "csv") {
    const start = formatDate(parseISO(startDate), "yyyy-MM-dd");
    const end = formatDate(parseISO(endDate), "yyyy-MM-dd");
    return `${reportType}-report-${start}-to-${end}.${fileFormat}`;
  }
}

export default new DownloadService();
