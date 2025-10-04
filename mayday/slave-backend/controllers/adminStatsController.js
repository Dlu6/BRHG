import sequelize, { Op } from "../config/sequelize.js";
import CDR from "../models/cdr.js";
import callMonitoringService from "../services/callMonitoringService.js";

/**
 * Get current call statistics for admin dashboard
 */
export const getCallStats = async (req, res) => {
  try {
    // Get active calls from monitoring service
    const activeCalls = callMonitoringService.getActiveCalls();

    // Count calls in different states
    const waitingCalls = activeCalls.filter(
      (call) => call.status === "waiting" || call.status === "queued"
    ).length;
    const talkingCalls = activeCalls.filter(
      (call) => call.status === "answered" || call.status === "in-progress"
    ).length;

    // Get today's call counts from CDR
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get answered calls count
    // Handle both "ANSWERED" (Asterisk standard) and "NORMAL" (legacy) for compatibility
    const answeredCalls = await CDR.count({
      where: {
        start: { [Op.gte]: todayStart },
        disposition: { [Op.in]: ["ANSWERED", "NORMAL"] },
      },
    });

    // Get abandoned calls count
    // Only count true abandoned calls: NO ANSWER, BUSY, FAILED
    // Exclude internal queue records (NORMAL/ANSWERED with billsec=0)
    const abandonedCalls = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        [Op.or]: [
          { disposition: "NO ANSWER" },
          { disposition: "BUSY" },
          { disposition: "FAILED" },
        ],
        start: { [Op.gte]: todayStart },
      },
    });

    // Get total offered calls
    const totalOffered = await CDR.count({
      where: {
        start: { [Op.gte]: todayStart },
      },
    });

    // Calculate average hold time
    const holdTimeResult = await CDR.findAll({
      attributes: [
        [
          sequelize.fn(
            "AVG",
            sequelize.fn(
              "TIMESTAMPDIFF",
              sequelize.literal("SECOND"),
              sequelize.col("start"),
              sequelize.col("answer")
            )
          ),
          "avgHoldTime",
        ],
      ],
      where: {
        start: { [Op.gte]: todayStart },
        disposition: "ANSWERED",
        answer: { [Op.ne]: null },
      },
      raw: true,
    });

    const avgHoldTime = holdTimeResult[0]?.avgHoldTime || 0;

    // Get previous hour stats for trend calculation
    const previousHourStart = new Date();
    previousHourStart.setHours(previousHourStart.getHours() - 1);

    const previousHourStats = await getPreviousHourStats(
      previousHourStart,
      todayStart
    );

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const stats = {
      waiting: waitingCalls,
      talking: talkingCalls,
      answered: answeredCalls,
      abandoned: abandonedCalls,
      totalOffered: totalOffered,
      avgHoldTime: avgHoldTime,
      trends: {
        waiting: calculateTrend(waitingCalls, previousHourStats.waiting),
        talking: calculateTrend(talkingCalls, previousHourStats.talking),
        answered: calculateTrend(answeredCalls, previousHourStats.answered),
        abandoned: calculateTrend(abandonedCalls, previousHourStats.abandoned),
        totalOffered: calculateTrend(
          totalOffered,
          previousHourStats.totalOffered
        ),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting call stats:", error);
    res.status(500).json({ error: "Failed to fetch call statistics" });
  }
};

/**
 * Get queue activity metrics
 */
export const getQueueActivity = async (req, res) => {
  try {
    // Get queue stats from monitoring service
    const queueStats = callMonitoringService.getQueueStats();

    // Calculate overall service level across all queues
    let totalAnswered = 0;
    let totalCalls = 0;
    let totalWaitTime = 0;
    let totalAbandoned = 0;

    queueStats.forEach((queue) => {
      totalAnswered += queue.answered || 0;
      totalCalls += queue.calls || 0;
      totalWaitTime += queue.totalWaitTime || 0;
      totalAbandoned += queue.abandoned || 0;
    });

    const serviceLevel =
      totalCalls > 0 ? Math.round((totalAnswered / totalCalls) * 100) : 0;

    // Calculate average wait time from actual CDR data for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get average wait time from CDR data
    const waitTimeResult = await CDR.findAll({
      attributes: [
        [
          sequelize.fn(
            "AVG",
            sequelize.fn(
              "TIMESTAMPDIFF",
              sequelize.literal("SECOND"),
              sequelize.col("start"),
              sequelize.col("answer")
            )
          ),
          "avgWaitTime",
        ],
      ],
      where: {
        start: { [Op.gte]: todayStart },
        disposition: "ANSWERED",
        answer: { [Op.ne]: null },
      },
      raw: true,
    });

    const avgWaitTime = waitTimeResult[0]?.avgWaitTime || 0;

    // Calculate abandon rate from actual CDR data for today
    // Get total calls for today
    const totalCallsToday = await CDR.count({
      where: {
        start: { [Op.gte]: todayStart },
      },
    });

    // Get abandoned calls for today using the same logic as callMonitoringService
    const abandonedCallsToday = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        [Op.or]: [
          { disposition: "NO ANSWER" },
          { disposition: "BUSY" },
          { disposition: "FAILED" },
          {
            [Op.and]: [{ disposition: "ANSWERED" }, { billsec: 0 }],
          },
        ],
        start: {
          [Op.gte]: todayStart,
        },
      },
    });

    // Calculate abandon rate from actual CDR data
    const abandonRate =
      totalCallsToday > 0
        ? Math.round((abandonedCallsToday / totalCallsToday) * 100 * 10) / 10
        : 0;

    res.json({
      serviceLevel,
      waitTime: avgWaitTime,
      abandonRate,
      totalCalls: totalCallsToday,
      abandonedCalls: abandonedCallsToday,
      queues: queueStats,
    });
  } catch (error) {
    console.error("Error getting queue activity:", error);
    res.status(500).json({ error: "Failed to fetch queue activity" });
  }
};

/**
 * Get historical call data for trends
 */
export const getHistoricalStats = async (req, res) => {
  try {
    const { timeframe = "hour" } = req.query;
    let startTime;
    const now = new Date();

    // Determine time range based on requested timeframe
    switch (timeframe) {
      case "hour":
        startTime = new Date(now);
        startTime.setHours(now.getHours() - 1);
        break;
      case "day":
        startTime = new Date(now);
        startTime.setDate(now.getDate() - 1);
        break;
      case "week":
        startTime = new Date(now);
        startTime.setDate(now.getDate() - 7);
        break;
      default:
        startTime = new Date(now);
        startTime.setHours(now.getHours() - 1);
    }

    // Get historical data
    const historicalData = await CDR.findAll({
      attributes: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("start"),
            "%Y-%m-%d %H:00:00"
          ),
          "hour",
        ],
        [sequelize.fn("COUNT", sequelize.col("id")), "total"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END"
            )
          ),
          "answered",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END"
            )
          ),
          "abandoned",
        ],
      ],
      where: {
        start: { [Op.between]: [startTime, now] },
      },
      group: [
        sequelize.fn(
          "DATE_FORMAT",
          sequelize.col("start"),
          "%Y-%m-%d %H:00:00"
        ),
      ],
      order: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("start"),
            "%Y-%m-%d %H:00:00"
          ),
          "ASC",
        ],
      ],
      raw: true,
    });

    res.json(historicalData);
  } catch (error) {
    console.error("Error getting historical stats:", error);
    res.status(500).json({ error: "Failed to fetch historical statistics" });
  }
};

/**
 * Get abandon rate statistics for different time periods
 */
export const getAbandonRateStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    // Helper function to calculate abandon rate for a time period
    const calculateAbandonRate = async (startDate) => {
      const totalCalls = await CDR.count({
        where: {
          start: { [Op.gte]: startDate },
        },
      });

      // Only count true abandoned calls:
      // - NO ANSWER, BUSY, FAILED dispositions
      // - For Queue calls: only those with lastapp='Queue' and disposition='NO ANSWER'
      // - Exclude internal queue records (NORMAL/ANSWERED with billsec=0 are often internal records)
      const abandonedCalls = await CDR.count({
        distinct: true,
        col: "uniqueid",
        where: {
          [Op.or]: [
            { disposition: "NO ANSWER" },
            { disposition: "BUSY" },
            { disposition: "FAILED" },
          ],
          start: { [Op.gte]: startDate },
        },
      });

      return {
        totalCalls,
        abandonedCalls,
        abandonRate:
          totalCalls > 0
            ? Math.round((abandonedCalls / totalCalls) * 100 * 10) / 10
            : 0,
      };
    };

    // Calculate abandon rates for different periods
    const today = await calculateAbandonRate(todayStart);
    const week = await calculateAbandonRate(weekStart);
    const month = await calculateAbandonRate(monthStart);

    // Get hourly breakdown for today
    const hourlyStats = await CDR.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("start"), "%h:00 %p"),
          "hour",
        ],
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN disposition IN ('NO ANSWER', 'BUSY', 'FAILED') 
               THEN 1 ELSE 0 END`
            )
          ),
          "abandonedCalls",
        ],
      ],
      where: {
        start: { [Op.gte]: todayStart },
      },
      group: [sequelize.fn("DATE_FORMAT", sequelize.col("start"), "%h:00 %p")],
      order: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("start"), "%h:00 %p"),
          "ASC",
        ],
      ],
      raw: true,
    });

    // Calculate abandon rate for each hour
    const hourlyAbandonRates = hourlyStats.map((stat) => ({
      hour: stat.hour,
      totalCalls: parseInt(stat.totalCalls),
      abandonedCalls: parseInt(stat.abandonedCalls),
      abandonRate:
        stat.totalCalls > 0
          ? Math.round((stat.abandonedCalls / stat.totalCalls) * 100 * 10) / 10
          : 0,
    }));

    res.json({
      today,
      week,
      month,
      hourlyBreakdown: hourlyAbandonRates,
    });
  } catch (error) {
    console.error("Error getting abandon rate stats:", error);
    res.status(500).json({ error: "Failed to fetch abandon rate statistics" });
  }
};

/**
 * Helper function to get previous hour stats for trend calculation
 */
async function getPreviousHourStats(previousHourStart, todayStart) {
  try {
    // Get active calls count from previous hour
    // This is an approximation since we don't store historical active call counts
    const previousWaiting = 0;
    const previousTalking = 0;

    // Get answered calls from previous hour
    // Handle both "ANSWERED" (Asterisk standard) and "NORMAL" (legacy) for compatibility
    const previousAnswered = await CDR.count({
      where: {
        start: { [Op.between]: [previousHourStart, todayStart] },
        disposition: { [Op.in]: ["ANSWERED", "NORMAL"] },
      },
    });

    // Get abandoned calls from previous hour
    const previousAbandoned = await CDR.count({
      where: {
        start: { [Op.between]: [previousHourStart, todayStart] },
        disposition: "NO ANSWER",
      },
    });

    // Get total offered from previous hour
    const previousTotalOffered = await CDR.count({
      where: {
        start: { [Op.between]: [previousHourStart, todayStart] },
      },
    });

    return {
      waiting: previousWaiting,
      talking: previousTalking,
      answered: previousAnswered,
      abandoned: previousAbandoned,
      totalOffered: previousTotalOffered,
    };
  } catch (error) {
    console.error("Error getting previous hour stats:", error);
    return {
      waiting: 0,
      talking: 0,
      answered: 0,
      abandoned: 0,
      totalOffered: 0,
    };
  }
}

export default {
  getCallStats,
  getQueueActivity,
  getHistoricalStats,
  getAbandonRateStats,
};
