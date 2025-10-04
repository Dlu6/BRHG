// services/callMonitoringService.js
// import { EventBusService } from "./eventBus.js";
import amiService from "./amiService.js";
// import { ariService } from "./ariService.js";
import { Op } from "../config/sequelize.js";
import chalk from "chalk";
import { socketService } from "./socketService.js";
import CDR from "../models/cdr.js";
import { formatCdrRecord } from "../controllers/cdrController.js";
import UserModel from "../models/usersModel.js";
import { updateBalanceAfterCall } from "./trunkBalanceService.js";
// import { PJSIPEndpoint } from "../models/pjsipModel.js";
import { createCallCostRecord } from "./callCostService.js";

const activeCallsMap = new Map();
const queueCallsMap = new Map(); // Track calls in queues to avoid duplicates
const queueStatsMap = new Map(); // Track queue statistics

// Debug mode - set to false to reduce console clutter
const DEBUG_MODE = false;

// Function to get active calls - returns array of active call objects
const getActiveCalls = () => {
  return Array.from(activeCallsMap.values());
};

// Log wrapper for consistent formatting with debug mode control
const log = {
  info: (msg, data) => {
    if (DEBUG_MODE) {
      console.log(chalk.blue(`[Call Monitor] ${msg}`), data || "");
    }
  },
  success: (msg, data) => {
    console.log(chalk.green(`[Call Monitor] ${msg}`), data || "");
  },
  warn: (msg, data) => {
    console.log(chalk.yellow(`[Call Monitor] ${msg}`), data || "");
  },
  error: (msg, data) => {
    console.error(chalk.red(`[Call Monitor] ${msg}`), data || "");
  },
  debug: (msg, data) => {
    if (DEBUG_MODE) {
      console.log(chalk.gray(`[Call Monitor Debug] ${msg}`), data || "");
    }
  },
};

// Get call volume data by hour for the last 6 hours
const getCallVolumeByHour = async () => {
  try {
    // Create a date object for 6 hours ago
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    // Get current hour
    const currentHour = new Date().getHours();

    // Create an array to hold hourly data
    const hourlyData = [];

    // For each of the last 6 hours
    for (let i = 5; i >= 0; i--) {
      const hour = (currentHour - i + 24) % 24; // Handle wrapping around midnight

      // Create start and end time for this hour
      const hourStart = new Date();
      hourStart.setHours(hour, 0, 0, 0);

      const hourEnd = new Date();
      hourEnd.setHours(hour, 59, 59, 999);

      // If this hour is in the future (e.g., it's 2am and we're calculating for 11pm yesterday)
      // then adjust the date to yesterday
      if (hourStart > new Date()) {
        hourStart.setDate(hourStart.getDate() - 1);
        hourEnd.setDate(hourEnd.getDate() - 1);
      }

      // Query for total calls in this hour
      const totalCalls = await CDR.count({
        where: {
          start: {
            [Op.between]: [hourStart, hourEnd],
          },
        },
      });

      // Query for handled calls in this hour
      const handledCalls = await CDR.count({
        where: {
          start: {
            [Op.between]: [hourStart, hourEnd],
          },
          disposition: {
            [Op.ne]: "NO ANSWER",
          },
        },
      });

      // Calculate abandoned calls
      const abandonedCalls = totalCalls - handledCalls;

      // Format hour as "HH:00"
      const hourFormatted = `${hour.toString().padStart(2, "0")}:00`;

      // Add to hourly data array
      hourlyData.push({
        hour: hourFormatted,
        calls: totalCalls,
        handled: handledCalls,
        abandoned: abandonedCalls,
      });
    }

    return hourlyData;
  } catch (error) {
    log.error("Error getting call volume by hour:", error);
    return [];
  }
};

// Get total calls count from CDR table
const getTotalCallsCount = async () => {
  try {
    // Create a date object for today at midnight instead of 24 hours ago
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        start: {
          [Op.gte]: todayMidnight,
        },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting total calls count:", error);
    return 0;
  }
};

// Get weekly total calls count from CDR table
const getWeeklyTotalCallsCount = async () => {
  try {
    // Create a date object for the start of the current week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    // FIXED: If Sunday is in previous month, cap at start of current month
    // This ensures weekly stats <= monthly stats (logical consistency)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek < startOfMonth ? startOfMonth : startOfWeek;

    // log.info(`Getting weekly total calls since: ${weekStart.toISOString()}`);

    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        start: {
          [Op.gte]: weekStart,
        },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting weekly total calls count:", error);
    return 0;
  }
};

// Get monthly total calls count from CDR table
const getMonthlyTotalCallsCount = async () => {
  try {
    // Create a date object for the start of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // log.info(
    //   `Getting monthly total calls since: ${startOfMonth.toISOString()}`
    // );

    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        start: {
          [Op.gte]: startOfMonth,
        },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting monthly total calls count:", error);
    return 0;
  }
};

// Get inbound calls count (where call came from external source)
const getInboundCallsCount = async (startDate) => {
  try {
    // Inbound calls are those coming from external contexts or external numbers
    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        start: {
          [Op.gte]: startDate,
        },
        [Op.or]: [
          { dcontext: "from-voip-provider" },
          { dcontext: "from-trunk" },
          { dcontext: "from-sip" },
        ],
      },
    });

    return count;
  } catch (error) {
    log.error("Error getting inbound calls count:", error);
    return 0;
  }
};

// Get outbound calls count (where call originated from internal extension)
const getOutboundCallsCount = async (startDate) => {
  try {
    // Outbound calls typically have internal context
    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        start: {
          [Op.gte]: startDate,
        },
        [Op.or]: [{ dcontext: "from-internal" }, { dcontext: "outbound" }],
      },
    });

    return count;
  } catch (error) {
    log.error("Error getting outbound calls count:", error);
    return 0;
  }
};

// Get abandoned calls count from CDR table
const getAbandonedCallsCount = async () => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0); // Just set to beginning of day, no timezone adjustment

    // Only count true abandoned calls: NO ANSWER, BUSY, FAILED
    // Exclude internal queue records (ANSWERED/NORMAL with billsec=0)
    const abandonedCount = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        [Op.or]: [
          { disposition: "NO ANSWER" },
          { disposition: "BUSY" },
          { disposition: "FAILED" },
        ],
        start: {
          [Op.gte]: todayMidnight,
        },
      },
    });

    log.debug(`Found ${abandonedCount} abandoned calls for today`);
    return abandonedCount;
  } catch (error) {
    log.error("Error getting abandoned calls count:", error);
    return 0;
  }
};

// Get weekly abandoned calls count from CDR table
const getWeeklyAbandonedCallsCount = async () => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // FIXED: If Sunday is in previous month, cap at start of current month
    // This ensures weekly stats <= monthly stats (logical consistency)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek < startOfMonth ? startOfMonth : startOfWeek;

    // Only count true abandoned calls: NO ANSWER, BUSY, FAILED
    // Exclude internal queue records (ANSWERED/NORMAL with billsec=0)
    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        [Op.or]: [
          { disposition: "NO ANSWER" },
          { disposition: "BUSY" },
          { disposition: "FAILED" },
        ],
        start: { [Op.gte]: weekStart },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting weekly abandoned calls count:", error);
    return 0;
  }
};

// Get monthly abandoned calls count from CDR table
const getMonthlyAbandonedCallsCount = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Only count true abandoned calls: NO ANSWER, BUSY, FAILED
    // Exclude internal queue records (ANSWERED/NORMAL with billsec=0)
    const count = await CDR.count({
      distinct: true,
      col: "uniqueid",
      where: {
        [Op.or]: [
          { disposition: "NO ANSWER" },
          { disposition: "BUSY" },
          { disposition: "FAILED" },
        ],
        start: { [Op.gte]: startOfMonth },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting monthly abandoned calls count:", error);
    return 0;
  }
};

// Emit stats update to all connected clients
const broadcastStats = async () => {
  try {
    // Log the current state of activeCallsMap only in debug mode
    log.debug(
      `Current active calls: ${activeCallsMap.size}`,
      Array.from(activeCallsMap.entries()).map(([id, call]) => ({
        id,
        src: call.src,
        dst: call.dst,
        status: call.status || "ringing",
        direction: call.direction,
      }))
    );

    // Transform the activeCallsMap values to ensure they have all required fields for the frontend
    const activeCallsList = Array.from(activeCallsMap.values()).map((call) => ({
      ...call,
      callerId: call.src || call.clid || call.callerId,
      extension: call.dst || call.extension,
      status: call.status || "ringing",
      uniqueid: call.uniqueid,
      startTime: call.startTime || new Date().toISOString(),
    }));

    // Transform queueStatsMap to an array for the frontend
    const queueStatusList = Array.from(queueStatsMap.values()).map((queue) => ({
      name: queue.name,
      waiting: queue.waiting || 0,
      sla: queue.serviceLevelPercentage || 0,
      avgWaitTime: queue.avgWaitTime || "0:00",
      abandonRate: queue.abandonRate || 0,
      totalCalls: queue.totalCalls || 0,
      answeredCalls: queue.answeredCalls || 0,
      abandonedCalls: queue.abandonedCalls || 0,
    }));

    // Get active agents data
    const allAgentsList = await getActiveAgents();

    // Count only non-offline agents as active
    const activeAgentsCount = allAgentsList.filter(
      (agent) => agent.status !== "Offline"
    ).length;

    // Get call volume data by hour
    const callsPerHour = await getCallVolumeByHour();

    // Get weekly and monthly stats
    const weeklyTotalCalls = await getWeeklyTotalCallsCount();
    const weeklyAbandonedCalls = await getWeeklyAbandonedCallsCount();
    const monthlyTotalCalls = await getMonthlyTotalCallsCount();
    const monthlyAbandonedCalls = await getMonthlyAbandonedCallsCount();

    // Get date ranges for weekly and monthly views
    const now = new Date();

    // Monthly date range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Weekly date range
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    // FIXED: If Sunday is in previous month, cap at start of current month
    // This ensures weekly stats <= monthly stats (logical consistency)
    const weekStart = startOfWeek < startOfMonth ? startOfMonth : startOfWeek;
    const endOfWeek = new Date(now); // End is today, not Sunday + 6 days

    // Get today's midnight for inbound/outbound counts
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    // PERFORMANCE: Parallelize all database queries for faster response
    const [
      totalCalls,
      abandonedCalls,
      inboundCalls,
      outboundCalls,
      weeklyInboundCalls,
      weeklyOutboundCalls,
      monthlyInboundCalls,
      monthlyOutboundCalls,
    ] = await Promise.all([
      getTotalCallsCount(),
      getAbandonedCallsCount(),
      getInboundCallsCount(todayMidnight),
      getOutboundCallsCount(todayMidnight),
      getInboundCallsCount(weekStart),
      getOutboundCallsCount(weekStart),
      getInboundCallsCount(startOfMonth),
      getOutboundCallsCount(startOfMonth),
    ]);

    // Calculate answered calls (total - abandoned)
    const answeredCalls = Math.max(totalCalls - abandonedCalls, 0);

    const stats = {
      timestamp: now.toISOString(),
      todayDate: new Date().setHours(0, 0, 0, 0),
      weekStartDate: weekStart.getTime(),
      weekEndDate: endOfWeek.getTime(),
      monthStartDate: startOfMonth.getTime(),
      monthEndDate: endOfMonth.getTime(),
      activeCalls: activeCallsMap.size,
      activeCallsList: activeCallsList,
      totalCalls: totalCalls,
      answeredCalls: answeredCalls,
      abandonedCalls: abandonedCalls,
      inboundCalls: inboundCalls,
      outboundCalls: outboundCalls,
      weeklyTotalCalls: weeklyTotalCalls,
      weeklyAbandonedCalls: weeklyAbandonedCalls,
      weeklyInboundCalls: weeklyInboundCalls,
      weeklyOutboundCalls: weeklyOutboundCalls,
      monthlyTotalCalls: monthlyTotalCalls,
      monthlyAbandonedCalls: monthlyAbandonedCalls,
      monthlyInboundCalls: monthlyInboundCalls,
      monthlyOutboundCalls: monthlyOutboundCalls,
      queueStatus: queueStatusList,
      activeAgents: activeAgentsCount,
      activeAgentsList: allAgentsList,
      callsPerHour: callsPerHour, // Add hourly call data
    };

    // Only log essential information, reduce verbosity
    log.debug(
      `Broadcasting stats with ${stats.activeCalls} active calls and ${activeCallsList.length} calls in list`
    );
    log.debug(`Queue stats: ${queueStatusList.length} queues`, queueStatusList);
    log.debug(
      `Active agents: ${stats.activeAgents} (Total agents: ${allAgentsList.length})`,
      allAgentsList.map((agent) => ({
        name: agent.name,
        extension: agent.extension,
        status: agent.status,
      }))
    );
    socketService.broadcast("callStats", stats);
  } catch (error) {
    log.error("Error broadcasting stats:", error);
  }
};

// AMI Event Handlers
const handleNewCall = (event) => {
  const uniqueid = event.uniqueid;
  // Handle multiple contexts that could contain external calls
  const isInbound =
    event.dcontext === "from-voip-provider" ||
    event.dcontext === "from-internal" ||
    event.dcontext === "from-trunk" ||
    event.dcontext === "from-sip";

  if (isInbound && !activeCallsMap.has(uniqueid)) {
    // Capture the real caller number from AMI event
    const realCallerNumber = event.CallerIDNum || event.calleridnum;

    const callData = {
      uniqueid: uniqueid,
      src: event.src,
      dst: event.dst,
      startTime: new Date(),
      status: "ringing",
      direction: "inbound",
      realCallerNumber: realCallerNumber, // Store the real caller number
    };
    activeCallsMap.set(uniqueid, callData);

    broadcastStats(); // Update frontend with new call data
  }
};

// Handle QueueParams event
const handleQueueParams = async (event) => {
  const queueName = event.Queue || event.queue;
  if (!queueName) {
    log.error("Received QueueParams event without queue name:", event);
    return;
  }

  // log.info(`Queue params updated: ${queueName}`, {
  //   calls: event.Calls || event.calls,
  //   completed: event.Completed || event.completed,
  //   abandoned: event.Abandoned || event.abandoned,
  //   serviceLevel: event.ServiceLevel || event.servicelevel,
  //   serviceLevelPercentage:
  //     event.ServiceLevelPercentage || event.servicelevelperc,
  // });

  // Update queue stats
  const queueStats = queueStatsMap.get(queueName) || { name: queueName };
  queueStats.name = queueName;
  queueStats.calls = Number(event.Calls || event.calls) || 0;
  queueStats.completed = Number(event.Completed || event.completed) || 0;
  queueStats.abandoned = Number(event.Abandoned || event.abandoned) || 0;
  queueStats.serviceLevel =
    Number(event.ServiceLevel || event.servicelevel) || 0;
  queueStats.serviceLevelPercentage =
    Number(event.ServiceLevelPercentage || event.servicelevelperc) || 0;
  queueStats.totalCalls = queueStats.completed + queueStats.abandoned;
  queueStats.answeredCalls = queueStats.completed;
  queueStats.abandonedCalls = queueStats.abandoned;

  // Calculate abandon rate
  if (queueStats.totalCalls > 0) {
    queueStats.abandonRate =
      Math.round((queueStats.abandoned / queueStats.totalCalls) * 100 * 10) /
      10;
  } else {
    queueStats.abandonRate = 0;
  }

  // Update the queue stats map
  queueStatsMap.set(queueName, queueStats);

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle QueueSummary event
const handleQueueSummary = async (event) => {
  const queueName = event.Queue || event.queue;
  if (!queueName) {
    log.error("Received QueueSummary event without queue name:", event);
    return;
  }

  // log.info(`Queue summary updated: ${queueName}`, {
  //   loggedIn: event.LoggedIn || event.loggedin,
  //   available: event.Available || event.available,
  //   callers: event.Callers || event.callers,
  //   holdTime: event.HoldTime || event.holdtime,
  //   talkTime: event.TalkTime || event.talktime,
  // });

  // Update queue stats
  const queueStats = queueStatsMap.get(queueName) || { name: queueName };
  queueStats.loggedIn = Number(event.LoggedIn || event.loggedin) || 0;
  queueStats.available = Number(event.Available || event.available) || 0;
  queueStats.waiting = Number(event.Callers || event.callers) || 0;

  // Format hold time as mm:ss
  const holdTimeSeconds = Number(event.HoldTime || event.holdtime) || 0;
  const minutes = Math.floor(holdTimeSeconds / 60);
  const seconds = holdTimeSeconds % 60;
  queueStats.avgWaitTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Update the queue stats map
  queueStatsMap.set(queueName, queueStats);

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle QueueCallerJoin event
const handleQueueCallerJoin = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received QueueCallerJoin event without uniqueid:", event);
    return;
  }

  const queueName = event.Queue || event.queue;

  // Add to queue calls map to track this call in a queue
  queueCallsMap.set(uniqueid, {
    queue: queueName,
    position: event.Position || event.position,
    joinTime: new Date().toISOString(),
  });

  // log.info(`Call joined queue: ${uniqueid}`, {
  //   queue: queueName,
  //   position: event.Position || event.position,
  //   count: event.Count || event.count,
  // });

  // Update queue stats
  const queueStats = queueStatsMap.get(queueName) || { name: queueName };
  queueStats.waiting = (queueStats.waiting || 0) + 1;
  queueStatsMap.set(queueName, queueStats);

  // If the call is not already in the active calls map, add it
  if (!activeCallsMap.has(uniqueid)) {
    // Create call data for tracking in memory
    const callData = {
      uniqueid: uniqueid,
      start: new Date(),
      clid: event.CallerIDNum || event.calleridnum,
      src: event.CallerIDNum || event.calleridnum,
      dst: event.Exten || event.exten,
      dcontext: event.Context || event.context,
      channel: event.Channel || event.channel,
      disposition: "NO ANSWER", // Initial disposition
      status: "ringing", // Add status field
      direction: "inbound", // Queue calls are typically inbound
      startTime: new Date().toISOString(), // Add startTime in ISO format for frontend
      callerId: event.CallerIDNum || event.calleridnum, // Add callerId for frontend display
      extension: event.Exten || event.exten, // Add extension for frontend display
      queue: queueName, // Add queue information
      position: event.Position || event.position,
      realCallerNumber: event.CallerIDNum || event.calleridnum, // Store real caller number
    };

    // Add to active calls map using the uniqueid as the key
    activeCallsMap.set(uniqueid, callData);

    log.success(`Queue call added to active calls map: ${uniqueid}`, {
      mapSize: activeCallsMap.size,
      queue: queueName,
    });
  } else {
    // Update existing call with queue information
    const call = activeCallsMap.get(uniqueid);
    call.queue = queueName;
    call.position = event.Position || event.position;
    // Also update with real caller number if available
    if (event.CallerIDNum || event.calleridnum) {
      call.realCallerNumber = event.CallerIDNum || event.calleridnum;
    }
    activeCallsMap.set(uniqueid, call);
  }

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle QueueCallerLeave event
const handleQueueCallerLeave = async (event) => {
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received QueueCallerLeave event without uniqueid:", event);
    return;
  }

  const queueName = event.Queue || event.queue;

  // Remove from queue calls map
  queueCallsMap.delete(uniqueid);
  // Also try removing by linkedid in case the queue assigned a different channel id
  const linkedid = event.linkedid || event.Linkedid;
  if (linkedid) {
    queueCallsMap.delete(linkedid);
  }

  // Update queue stats
  if (queueName) {
    const queueStats = queueStatsMap.get(queueName) || { name: queueName };
    queueStats.waiting = Math.max(0, (queueStats.waiting || 0) - 1);
    queueStatsMap.set(queueName, queueStats);
  }

  // Ensure the waiting call is cleared from active calls
  if (activeCallsMap.has(uniqueid)) {
    activeCallsMap.delete(uniqueid);
  } else if (linkedid && activeCallsMap.has(linkedid)) {
    activeCallsMap.delete(linkedid);
  }

  // Broadcast updated stats immediately
  broadcastStats();
};

const handleHangup = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received hangup event without uniqueid:", event);
    return;
  }

  // First, collect any data we need from the active call before removing it
  const callData = activeCallsMap.get(uniqueid) || {
    src: event.CallerIDNum || event.calleridnum || "unknown",
    dst: event.Exten || event.exten || "unknown",
    dcontext: event.Context || event.context || "from-voip-provider",
    channel: event.Channel || event.channel || "",
    queue: event.Queue || event.queue || "unknown",
    startTime: new Date(Date.now() - 5000), // Assume 5s ago if unknown
    direction: "inbound",
  };

  // Immediately remove from active calls map for UI consistency.
  // Also try linkedid in case the channel uniqueid changed during the call lifecycle.
  let removedKey = null;
  if (activeCallsMap.has(uniqueid)) {
    activeCallsMap.delete(uniqueid);
    queueCallsMap.delete(uniqueid);
    removedKey = uniqueid;
  } else {
    const linkedid = event.linkedid || event.Linkedid;
    if (linkedid && activeCallsMap.has(linkedid)) {
      activeCallsMap.delete(linkedid);
      queueCallsMap.delete(linkedid);
      removedKey = linkedid;
    }
  }

  // Push an immediate update so the UI clears stale waiting entries
  if (removedKey) {
    broadcastStats();
  }

  try {
    // Extract real caller number from hangup event with priority order
    let realCallerNumber = callData.realCallerNumber;

    // If we don't have it from active call map, try to extract from hangup event
    if (!realCallerNumber) {
      // For external calls, ConnectedLineNum often contains the real caller number
      if (event.ConnectedLineNum && event.ConnectedLineNum !== "<unknown>") {
        realCallerNumber = event.ConnectedLineNum;
      }
      // For external calls, if CallerIDNum is different from src, use it
      else if (
        event.CallerIDNum &&
        event.CallerIDNum !== event.src &&
        event.CallerIDNum !== "<unknown>"
      ) {
        realCallerNumber = event.CallerIDNum;
      }
      // For external calls, if src is different from dst, use src as caller number
      else if (
        event.src &&
        event.dst &&
        event.src !== event.dst &&
        (event.Context === "from-voip-provider" ||
          event.context === "from-voip-provider")
      ) {
        realCallerNumber = event.src;
      }
    }

    // Check if the CDR record exists before updating
    const cdrRecord = await CDR.findOne({ where: { uniqueid: uniqueid } });

    // Determine if this is a normal hangup (causes 16 and 19) vs abandoned call
    // Use Asterisk's standard CDR disposition values
    const isNormal =
      event.Cause === "16" ||
      event.cause === "16" ||
      event.Cause === "19" ||
      event.cause === "19";
    const disposition = isNormal ? "ANSWERED" : "NO ANSWER";

    if (cdrRecord) {
      // Calculate duration based on start time
      const startTime = new Date(cdrRecord.start);
      const endTime = new Date();
      const durationSeconds = Math.ceil((endTime - startTime) / 1000);

      // Update the CDR record
      await CDR.update(
        {
          end: endTime,
          disposition: disposition,
          duration: durationSeconds,
          billsec: cdrRecord.answer
            ? Math.ceil((endTime - new Date(cdrRecord.answer)) / 1000)
            : 0,
        },
        {
          where: { uniqueid: uniqueid },
        }
      );
      log.success(
        `CDR record updated for call: ${uniqueid}, disposition: ${disposition}`
      );
    } else {
      // Create a new CDR record when one doesn't exist
      log.warn(`No CDR record found for call: ${uniqueid}, creating one`);

      const startTime =
        callData.startTime instanceof Date
          ? callData.startTime
          : new Date(callData.startTime || Date.now() - 10000);

      const endTime = new Date();
      const durationSeconds = Math.ceil((endTime - startTime) / 1000);

      const cdrData = {
        uniqueid: uniqueid,
        calldate: new Date(),
        start: startTime,
        end: endTime,
        src: callData.src || event.src || "unknown",
        dst: callData.dst || event.dst || "unknown",
        dcontext: callData.dcontext || event.dcontext || "from-voip-provider",
        channel: callData.channel || event.Channel || event.channel || "",
        lastapp: "Queue",
        lastdata: callData.queue || "",
        duration: durationSeconds,
        billsec: 0,
        disposition: disposition,
        clid: callData.src || event.calleridnum || "unknown",
        amaflags: 0,
        accountcode: "",
        userfield: realCallerNumber || callData.realCallerNumber || "", // Store real caller number in userfield
      };

      await CDR.create(cdrData);

      log.success(`CDR record created for ${disposition} call: ${uniqueid}`);
    }

    // Update CDR record with real caller number if we have it
    if (realCallerNumber) {
      try {
        const existingCdr = await CDR.findOne({
          where: { uniqueid: uniqueid },
        });
        if (existingCdr && existingCdr.userfield !== realCallerNumber) {
          await CDR.update(
            { userfield: realCallerNumber },
            { where: { uniqueid: uniqueid } }
          );
        }
      } catch (error) {
        log.error("Error updating CDR record with real caller number:", error);
      }
    }

    // Force immediate stats broadcast for abandoned calls, but with a delay
    // to ensure database operations complete
    if (
      disposition === "NO ANSWER" &&
      (callData.dcontext === "from-voip-provider" ||
        event.dcontext === "from-voip-provider")
    ) {
      log.info("Broadcasting stats update for abandoned call");
      setTimeout(() => broadcastStats(), 500);
    } else if (removedKey) {
      // If the call was in the active map but not an abandoned call
      // still broadcast stats after a slight delay
      setTimeout(() => broadcastStats(), 100);
    }
  } catch (error) {
    log.error(`Error updating CDR record for call: ${uniqueid}`, error);
    // Broadcast stats even on error to ensure UI consistency
    broadcastStats();
  }
};

const handleBridge = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received bridge event without uniqueid:", event);
    return;
  }

  // log.info(`Call bridged: ${uniqueid}`, {
  //   bridgeChannel: event.bridgechannel || event.BridgeChannel,
  // });

  try {
    // Update the CDR record with answer time and bridged channel
    await CDR.update(
      {
        answer: new Date(),
        disposition: "ANSWERED",
        dstchannel: event.bridgechannel || event.BridgeChannel || "",
      },
      {
        where: { uniqueid: uniqueid },
      }
    );
    log.success(`CDR record updated for bridged call: ${uniqueid}`);
  } catch (error) {
    log.error(`Error updating CDR on bridge for call: ${uniqueid}`, error);
  }

  // Update the active call in memory
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    // Update call status to answered
    call.status = "answered";
    call.answerTime = new Date().toISOString();
    call.dstchannel = event.bridgechannel || event.BridgeChannel || "";
    activeCallsMap.set(uniqueid, call);

    // log.info(`Call updated to answered: ${uniqueid}`, {
    //   status: call.status,
    //   answerTime: call.answerTime,
    //   dstchannel: call.dstchannel,
    // });

    // Broadcast updated stats immediately
    broadcastStats();
  } else {
    log.warn(
      `Call not found in active calls map for bridge event: ${uniqueid}`
    );
  }
};

// Handle BridgeEnter event
const handleBridgeEnter = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received BridgeEnter event without uniqueid:", event);
    return;
  }

  // log.info(`Call entered bridge: ${uniqueid}`, {
  //   bridgeId: event.BridgeUniqueid || event.bridgeuniqueid,
  //   channel: event.Channel || event.channel,
  // });

  // Update the active call in memory
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    // Update call status to answered
    call.status = "answered";
    call.answerTime = new Date().toISOString();
    call.bridgeId = event.BridgeUniqueid || event.bridgeuniqueid;
    activeCallsMap.set(uniqueid, call);

    // log.info(`Call updated on bridge enter: ${uniqueid}`, {
    //   status: call.status,
    //   answerTime: call.answerTime,
    //   bridgeId: call.bridgeId,
    // });

    // Broadcast updated stats immediately
    broadcastStats();
  } else {
    log.warn(
      `Call not found in active calls map for BridgeEnter event: ${uniqueid}`
    );
  }
};

// Handle Newstate event
const handleNewstate = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received Newstate event without uniqueid:", event);
    return;
  }

  const channelState = event.ChannelState || event.channelstate;
  const channelStateDesc = event.ChannelStateDesc || event.channelstatedesc;

  // log.info(`Call state changed: ${uniqueid}`, {
  //   state: channelState,
  //   stateDesc: channelStateDesc,
  //   channel: event.Channel || event.channel,
  // });

  // Update the active call in memory
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    // Update call status based on channel state
    if (channelStateDesc === "Up" || channelState === "6") {
      call.status = "answered";
      call.answerTime = new Date().toISOString();
    } else if (channelStateDesc === "Ringing" || channelState === "4") {
      call.status = "ringing";

      // Capture ConnectedLineNum when call is ringing (contains real caller number)
      if (event.ConnectedLineNum && !call.realCallerNumber) {
        call.realCallerNumber = event.ConnectedLineNum;
      }
    }

    activeCallsMap.set(uniqueid, call);

    // log.info(`Call updated on state change: ${uniqueid}`, {
    //   status: call.status,
    //   channelState: channelState,
    //   channelStateDesc: channelStateDesc,
    // });

    // Broadcast updated stats immediately
    broadcastStats();
  } else {
    // If call is not in active map, try to create it from Newstate event
    // This handles cases where Newchannel events aren't received
    if (channelStateDesc === "Ringing" || channelState === "4") {
      const newCallData = {
        uniqueid: uniqueid,
        src: event.CallerIDNum || event.calleridnum || "unknown",
        dst: event.Exten || event.exten || "unknown",
        startTime: new Date(),
        status: "ringing",
        direction: "inbound",
        realCallerNumber:
          event.ConnectedLineNum || event.CallerIDNum || event.calleridnum,
        dcontext: event.Context || event.context || "from-voip-provider",
        channel: event.Channel || event.channel || "",
      };

      activeCallsMap.set(uniqueid, newCallData);
      broadcastStats();
    } else {
      log.warn(
        `Call not found in active calls map for Newstate event: ${uniqueid}`
      );
    }
  }
};

// Function to request queue statistics from Asterisk
const requestQueueStats = async () => {
  try {
    // log.info("Requesting queue statistics from Asterisk...");

    // Request queue summary for all queues
    const queueSummaryResult = await amiService.executeAction({
      Action: "QueueSummary",
    });

    // log.info("Queue summary request sent");

    // Request queue status for all queues
    const queueStatusResult = await amiService.executeAction({
      Action: "QueueStatus",
    });

    // log.info("Queue status request sent");

    return true;
  } catch (error) {
    log.error("Error requesting queue statistics:", error);
    return false;
  }
};

// Get active agents from queue members
const getActiveAgents = async () => {
  try {
    // Try to get all users with extensions using progressive query building
    // to handle potential schema differences
    let queryOptions = {
      where: {
        extension: {
          [Op.not]: null,
        },
      },
    };

    // Try to add additional filters if they exist in the schema
    try {
      // First attempt with most likely schema
      const users = await UserModel.findAll(queryOptions);

      // Get all extension statuses with lastSeen data
      const extensionStatuses = amiService.getAllExtensionStatuses();

      log.debug(`Found ${users.length} users with extensions`);
      log.debug(`Extension statuses:`, extensionStatuses);

      // Debug: Log each user and their extension status only in debug mode
      users.forEach((user) => {
        const status = extensionStatuses[user.extension];
        log.debug(`User ${user.fullName || user.name} (${user.extension}):`, {
          isRegistered: status?.isRegistered || false,
          peerStatus: status?.peerStatus || "unknown",
          lastSeen: status?.lastSeen || "never",
        });
      });

      // Process and return the results
      const results = processUserResults(users, extensionStatuses);
      log.debug(
        `Processed ${results.length} agents:`,
        results.map((agent) => ({
          name: agent.name,
          extension: agent.extension,
          status: agent.status,
          isRegistered: extensionStatuses[agent.extension]?.isRegistered,
        }))
      );

      return results;
    } catch (error) {
      log.warn("Error with initial user query:", error.message);

      // Fall back to simplest possible query if schema doesn't match
      const users = await UserModel.findAll({
        where: {
          extension: {
            [Op.not]: null,
          },
        },
      });

      // Get all extension statuses with lastSeen data
      const extensionStatuses = amiService.getAllExtensionStatuses();

      // Process and return the results
      return processUserResults(users, extensionStatuses);
    }
  } catch (error) {
    log.error("Error getting active agents:", error);
    return []; // Return empty array on error
  }
};

// Helper function to process user results into agent objects
function processUserResults(users, extensionStatuses) {
  return users.map((user) => {
    const extension = user.extension;
    const extensionStatus = extensionStatuses[extension] || {};
    const isActive = extensionStatus.isRegistered || false;
    const currentCall = activeCallsMap.get(extension);

    // Get display name from user data with fallbacks
    const displayName =
      user.displayName ||
      user.fullName ||
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : null) ||
      user.name || // Some schemas use 'name' directly
      user.username ||
      `Agent ${extension}`;

    return {
      id: user.id,
      name: displayName,
      extension: extension,
      status: isActive ? (currentCall ? "On Call" : "Available") : "Offline",
      callsDone: user.callsDone || 0,
      queues: [], // Empty array for now
      lastSeen: extensionStatus.lastSeen || null,
      currentCall: currentCall
        ? {
            uniqueid: currentCall.uniqueId || currentCall.uniqueid,
            callerId: currentCall.callerId || currentCall.callerid,
            startTime: currentCall.startTime,
            duration: currentCall.duration || 0,
          }
        : null,
      paused: user.paused || false,
    };
  });
}

// Handle QueueMember event
const handleQueueMember = async (event) => {
  const queueName = event.Queue || event.queue;
  const memberName =
    event.Name || event.name || event.Interface || event.interface;

  if (!queueName || !memberName) {
    log.error(
      "Received QueueMember event without queue name or member name:",
      event
    );
    return;
  }

  // log.info(`Queue member updated: ${queueName} - ${memberName}`, {
  //   status: event.Status || event.status,
  //   paused: event.Paused || event.paused,
  //   callsTaken: event.CallsTaken || event.callstaken,
  //   lastCall: event.LastCall || event.lastcall,
  // });

  // Get or create queue stats
  const queueStats = queueStatsMap.get(queueName) || {
    name: queueName,
    members: [],
  };

  // Initialize members array if it doesn't exist
  if (!queueStats.members) {
    queueStats.members = [];
  }

  // Find existing member or create new one
  const memberIndex = queueStats.members.findIndex(
    (m) => m.name === memberName || m.interface === memberName
  );

  const memberStatus = event.Status || event.status;
  const statusText =
    memberStatus === "1"
      ? "Not in use"
      : memberStatus === "2"
      ? "In use"
      : memberStatus === "3"
      ? "Busy"
      : memberStatus === "6"
      ? "Unavailable"
      : "Unknown";

  const memberData = {
    name: memberName,
    interface: event.Interface || event.interface,
    status: statusText,
    statusCode: memberStatus,
    paused: (event.Paused || event.paused) === "1",
    callsTaken: Number(event.CallsTaken || event.callstaken) || 0,
    lastCall: event.LastCall || event.lastcall,
  };

  if (memberIndex >= 0) {
    // Update existing member
    queueStats.members[memberIndex] = {
      ...queueStats.members[memberIndex],
      ...memberData,
    };
  } else {
    // Add new member
    queueStats.members.push(memberData);
  }

  // Update the queue stats map
  queueStatsMap.set(queueName, queueStats);

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle CDR events for call history
const handleCdr = async (event) => {
  try {
    // Format the CDR record
    const formattedRecord = formatCdrRecord(event, event.src);

    // Broadcast to all connected clients for real-time updates
    socketService.broadcast("call_update", formattedRecord);

    // Find users with this source or destination extension
    try {
      const srcUser = await UserModel.findOne({
        where: { extension: event.src },
      });
      const dstUser = await UserModel.findOne({
        where: { extension: event.dst },
      });

      // Broadcast to specific users
      if (srcUser) {
        // log.info(
        //   `Emitting call update to source user ${srcUser.id} (${event.src})`
        // );
        socketService.emitToUser(srcUser.id, "call_update", formattedRecord);
      }

      if (dstUser && dstUser.id !== srcUser?.id) {
        // log.info(
        //   `Emitting call update to destination user ${dstUser.id} (${event.dst})`
        // );
        socketService.emitToUser(dstUser.id, "call_update", formattedRecord);
      }
    } catch (userError) {
      log.error("Error finding users for call update", userError);
    }

    // Also save to database for persistence
    try {
      // Get the real caller number from active calls map if available
      let activeCall = activeCallsMap.get(event.uniqueid);
      if (!activeCall && event.linkedid && event.uniqueid !== event.linkedid) {
        activeCall = activeCallsMap.get(event.linkedid);
      }

      // Check if CDR record already exists
      const existingCdr = await CDR.findOne({
        where: { uniqueid: event.uniqueid },
      });

      // Try multiple sources for real caller number with priority order
      let realCallerNumber = null;

      // 1. First try active call map (from Newchannel events)
      if (activeCall?.realCallerNumber) {
        realCallerNumber = activeCall.realCallerNumber;
      }
      // 2. Try ConnectedLineNum from AMI event (contains real caller number for external calls)
      else if (
        event.ConnectedLineNum &&
        event.ConnectedLineNum !== "<unknown>"
      ) {
        realCallerNumber = event.ConnectedLineNum;
      }
      // 3. Try CallerIDNum if it's not the same as src (to avoid internal extension numbers)
      else if (
        event.CallerIDNum &&
        event.CallerIDNum !== event.src &&
        event.CallerIDNum !== "<unknown>"
      ) {
        realCallerNumber = event.CallerIDNum;
      }
      // 4. For external calls, if src is different from dst, use src as caller number
      else if (
        event.src &&
        event.dst &&
        event.src !== event.dst &&
        (event.Context === "from-voip-provider" ||
          event.context === "from-voip-provider")
      ) {
        realCallerNumber = event.src;
      }

      const cdrData = {
        uniqueid: event.uniqueid,
        calldate: new Date(),
        src: event.src,
        dst: event.dst,
        disposition: event.disposition,
        duration: event.duration || 0,
        billsec: event.billsec || 0,
        recordingfile: event.recordingfile || "",
        userfield: realCallerNumber || event.userfield || "", // Store real caller number in userfield
        cdr_json: JSON.stringify(event),
      };

      if (existingCdr) {
        // Update existing CDR record with real caller number
        if (realCallerNumber && existingCdr.userfield !== realCallerNumber) {
          console.log(
            "💾 Updating existing CDR record with real caller number:",
            {
              uniqueid: event.uniqueid,
              oldUserfield: existingCdr.userfield,
              newUserfield: realCallerNumber,
              realCallerNumber: realCallerNumber,
            }
          );

          await CDR.update(
            { userfield: realCallerNumber },
            { where: { uniqueid: event.uniqueid } }
          );
        }
      } else {
        await CDR.create(cdrData);
      }

      // Emit socket event
      socketService.emitCallHistoryUpdate(formattedRecord);

      // Track call costs and update trunk balance for outbound calls
      try {
        if (event.disposition === "ANSWERED" && event.duration > 0) {
          // Create call cost record - the service will determine if it's outbound
          const callCostRecord = await createCallCostRecord({
            uniqueid: event.uniqueid,
            src: event.src,
            dst: event.dst,
            duration: event.duration,
            billsec: event.billsec || event.duration,
            disposition: event.disposition,
            start: event.start || new Date(),
            end: event.end || new Date(),
          });

          if (callCostRecord) {
            log.info(
              `Call cost tracked: ${event.uniqueid} - ${callCostRecord.total_cost}`,
              {
                duration: event.duration,
                cost: callCostRecord.total_cost,
                trunkId: callCostRecord.trunk_id,
              }
            );

            // Update balance after call if we have trunk information
            if (callCostRecord.trunk_id && callCostRecord.account_number) {
              await updateBalanceAfterCall(
                callCostRecord.account_number,
                event.duration,
                callCostRecord.total_cost
              );

              log.info(
                `Updated balance for trunk ${callCostRecord.trunk_id} after call`,
                {
                  duration: event.duration,
                  cost: callCostRecord.total_cost,
                  accountNumber: callCostRecord.account_number,
                }
              );
            }
          }
        }
      } catch (costError) {
        log.error("Error tracking call costs and updating balance", costError);
      }
    } catch (dbError) {
      log.error("Error saving CDR to database", dbError);
    }
  } catch (error) {
    log.error("Error handling CDR event", error);
  }
};

// Function to get queue statistics
const getQueueStats = () => {
  return Array.from(queueStatsMap.values());
};

// Initialize the service
const initialize = () => {
  log.info("Initializing call monitoring service");
  // Clear any existing active calls
  activeCallsMap.clear();
  queueCallsMap.clear();
  queueStatsMap.clear();

  // Set up AMI event listeners
  amiService.on("Newchannel", handleNewCall);
  amiService.on("Hangup", handleHangup);
  amiService.on("Bridge", handleBridge);
  amiService.on("BridgeEnter", handleBridgeEnter);
  amiService.on("Newstate", handleNewstate);
  amiService.on("QueueCallerJoin", handleQueueCallerJoin);
  amiService.on("QueueCallerLeave", handleQueueCallerLeave);
  amiService.on("QueueMember", handleQueueMember);
  amiService.on("QueueParams", handleQueueParams);
  amiService.on("QueueSummary", handleQueueSummary);

  // Also register for the wrapped events from eventBus
  amiService.on("call:new", handleNewCall);
  amiService.on("call:hangup", handleHangup);
  amiService.on("call:bridged", handleBridge);
  amiService.on("call:bridge:enter", handleBridgeEnter);
  amiService.on("call:state", handleNewstate);
  amiService.on("queue:caller:join", handleQueueCallerJoin);
  amiService.on("queue:caller:leave", handleQueueCallerLeave);
  amiService.on("queue:update", handleQueueParams);
  amiService.on("queue:member:update", handleQueueMember);

  // Make sure CDR event listener is registered
  amiService.on("Cdr", handleCdr);

  // Log that we've set up the CDR handler
  log.info("CDR event handler registered");

  // Request initial queue stats
  requestQueueStats();

  // Set up periodic stats broadcast
  const statsInterval = setInterval(async () => {
    try {
      await broadcastStats();
    } catch (error) {
      log.error("Error broadcasting stats", error);
    }
  }, 10000); // Every 10 seconds

  // Set up periodic queue stats request
  const queueStatsInterval = setInterval(() => {
    requestQueueStats();
  }, 30000); // Every 30 seconds

  // Return cleanup function
  return () => {
    clearInterval(statsInterval);
    clearInterval(queueStatsInterval);
    activeCallsMap.clear();
    queueCallsMap.clear();
    queueStatsMap.clear();

    // Remove event listeners
    amiService.off("Newchannel", handleNewCall);
    amiService.off("Hangup", handleHangup);
    amiService.off("Bridge", handleBridge);
    amiService.off("BridgeEnter", handleBridgeEnter);
    amiService.off("Newstate", handleNewstate);
    amiService.off("QueueCallerJoin", handleQueueCallerJoin);
    amiService.off("QueueCallerLeave", handleQueueCallerLeave);
    amiService.off("QueueMember", handleQueueMember);
    amiService.off("QueueParams", handleQueueParams);
    amiService.off("QueueSummary", handleQueueSummary);
    amiService.off("Cdr", handleCdr);
  };
};

// Cleanup function to remove event listeners
const cleanup = () => {
  // log.info("Cleaning up call monitoring service...");

  // Remove AMI event handlers for direct events
  amiService.off("Newchannel", handleNewCall);
  amiService.off("Hangup", handleHangup);
  amiService.off("Bridge", handleBridge);
  amiService.off("BridgeEnter", handleBridgeEnter);
  amiService.off("Newstate", handleNewstate);
  amiService.off("QueueCallerJoin", handleQueueCallerJoin);
  amiService.off("QueueCallerLeave", handleQueueCallerLeave);
  amiService.off("QueueParams", handleQueueParams);
  amiService.off("QueueSummary", handleQueueSummary);
  amiService.off("QueueMember", handleQueueMember);
  amiService.off("Cdr", handleCdr); // Remove CDR event listener

  // Also remove wrapped event handlers
  amiService.off("call:new", handleNewCall);
  amiService.off("call:hangup", handleHangup);
  amiService.off("call:bridged", handleBridge);
  amiService.off("call:bridge:enter", handleBridgeEnter);
  amiService.off("call:state", handleNewstate);
  amiService.off("queue:caller:join", handleQueueCallerJoin);
  amiService.off("queue:caller:leave", handleQueueCallerLeave);
  amiService.off("queue:update", handleQueueParams);
  amiService.off("queue:member:update", handleQueueMember);

  // Clear active calls map
  activeCallsMap.clear();
  queueCallsMap.clear();
  queueStatsMap.clear();

  // log.success("Call monitoring service cleanup completed");
};

// Export the service
export const callMonitoringService = {
  initialize,
  cleanup,
  monitorCalls: initialize,
  broadcastStats,
  getActiveCalls,
  getTotalCallsCount,
  getAbandonedCallsCount,
  requestQueueStats,
  handleCdr,
  getActiveAgents,
  getCallVolumeByHour,
  getQueueStats,
};

export default callMonitoringService;
