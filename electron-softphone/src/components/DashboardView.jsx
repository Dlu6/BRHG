import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  LinearProgress,
  Avatar,
  AvatarGroup,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button,
} from "@mui/material";
import {
  CallMissed,
  Call as CallIcon,
  CallEnd,
  Refresh,
  Timeline,
  SupervisorAccount,
  QueryStats,
  AccessTime,
  Speed,
  TrendingUp,
  Person,
  AccessAlarm,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { callMonitoringService } from "../services/callMonitoringServiceElectron";
import { agentService } from "../services/agentService";
import websocketService from "../services/websocketService";
import { getAgentPerformanceData } from "../api/reportsApi"; // Import the API function
import callHistoryService from "../services/callHistoryService";
import { canInitializeServices } from "../services/storageService";
import { useNotification } from "../contexts/NotificationContext";
import WebSocketStatus from "./WebSocketStatus";
import sessionRecoveryManager from "../services/sessionRecoveryManager";

// Format seconds to mm:ss
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// CRITICAL: Utility function to check if disconnection should be allowed
const shouldAllowDisconnection = () => {
  return !window.isLoggingOut && !window.isAuthenticating;
};

// Enhanced StatCard component
const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      height: "100%",
      bgcolor: `${color}15`,
      border: 1,
      borderColor: `${color}30`,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: `0 4px 8px ${color}20`,
      },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" component="div" color="text.secondary">
          {title}
        </Typography>
        <Typography
          variant="h4"
          component="div"
          sx={{ fontWeight: 500, color: color }}
        >
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: `${color}25`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
    </Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {subtitle && (
        <Typography variant="caption" component="div" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      {trend !== null && trend !== undefined && (
        <Typography
          variant="caption"
          component="div"
          sx={{
            color:
              trend > 0
                ? "success.main"
                : trend < 0
                ? "error.main"
                : "text.secondary",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <TrendingUp
            sx={{
              fontSize: 14,
              transform: trend < 0 ? "rotate(180deg)" : "none",
            }}
          />
          {trend === 0 ? "No change" : `${trend > 0 ? "+" : ""}${trend}%`}
        </Typography>
      )}
    </Box>
  </Paper>
);

// Queue Status Component (per-queue analytics)
const QueueStatus = ({ queue }) => {
  // Prefer per-queue metrics from backend
  const totalCalls = Number(queue.totalCalls) || 0;
  const answeredCalls =
    Number(queue.answeredCalls) ||
    Math.max(totalCalls - (Number(queue.abandonedCalls) || 0), 0);
  const abandonedCalls = Number(queue.abandonedCalls) || 0;
  const abandonRate =
    Number(queue.abandonRate) ||
    (totalCalls > 0
      ? Math.round((abandonedCalls / totalCalls) * 100 * 10) / 10
      : 0);

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="subtitle2" component="div">
          {queue.name}
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          {`SLA: ${queue.sla || 0}%`}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={queue.sla || 0}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: "rgba(0,0,0,0.05)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 4,
            bgcolor: queue.sla >= 90 ? "success.main" : "warning.main",
          },
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
        <Typography variant="caption" component="div" color="text.secondary">
          {`${Number(queue.waiting) || 0} calls waiting`}
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          {`Avg wait: ${queue.avgWaitTime || "0:00"}`}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption" component="div" color="#08403E">
          {`Answered: ${answeredCalls}`}
        </Typography>
        <Typography variant="caption" component="div" color="#939">
          {`Abandoned: ${abandonedCalls} (${abandonRate}%)`}
        </Typography>
      </Box>
    </Box>
  );
};

// Enhanced ActiveCallsList component
const ActiveCallsList = ({ calls }) => {
  // Custom theme extensions for lighter colors
  const customColors = {
    success: {
      lighter: "rgba(12, 195, 19, 0.2)",
    },
    warning: {
      lighter: "rgba(222, 150, 6, 0.2)",
    },
    info: {
      lighter: "rgba(8, 124, 219, 0.2)",
    },
    primary: {
      lighter: "rgba(2, 63, 124, 0.2)",
    },
    secondary: {
      lighter: "rgba(166, 3, 195, 0.2)",
    },
  };

  return (
    <List sx={{ maxHeight: "400px", overflow: "auto" }}>
      {calls.length === 0 ? (
        <ListItem>
          <ListItemText
            primary="No active calls"
            secondary="Waiting calls will appear here when they arrive"
          />
        </ListItem>
      ) : (
        calls.map((call) => {
          // Calculate duration in seconds
          const duration = call.answerTime
            ? Math.floor((Date.now() - new Date(call.answerTime)) / 1000)
            : Math.floor((Date.now() - new Date(call.startTime)) / 1000);

          // Determine status color
          const statusColor =
            call.status === "answered"
              ? "success"
              : call.status === "ringing"
              ? "warning"
              : "info";

          // Determine direction color and icon
          const directionColor =
            call.direction === "inbound" ? "primary" : "secondary";

          // Get caller ID, prioritizing remoteIdentity
          const callerId =
            call.remoteIdentity || call.callerId || call.src || "Unknown";

          return (
            <ListItem
              key={`${call.uniqueid}-${call.startTime}`}
              sx={{
                mb: 1.5,
                borderLeft: 3,
                borderColor: `${statusColor}.main`,
                bgcolor: `${statusColor}.light`,
                borderRadius: 1,
                opacity: 0.9,
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: 2,
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: `${statusColor}.main`,
                    color: "white",
                  }}
                >
                  <CallIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      component="span"
                    >
                      {callerId} → {call.extension || call.dst || "Unknown"}
                    </Typography>
                    <Box
                      component="span"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Tooltip title={`Call is ${call.status}`}>
                        <Typography
                          variant="caption"
                          component="span"
                          sx={{
                            fontWeight: "bold",
                            color: `${statusColor}.dark`,
                            bgcolor: customColors[statusColor].lighter,
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          {call.status.toUpperCase()}
                        </Typography>
                      </Tooltip>
                      {call.direction && (
                        <Tooltip title={`${call.direction} call`}>
                          <Typography
                            variant="caption"
                            component="span"
                            sx={{
                              fontWeight: "medium",
                              color: `${directionColor}.main`,
                              bgcolor: customColors[directionColor].lighter,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                            }}
                          >
                            {call.direction.toUpperCase()}
                          </Typography>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="span"
                        color="text.secondary"
                      >
                        Started: {new Date(call.startTime).toLocaleTimeString()}
                      </Typography>
                      {call.answerTime && (
                        <Typography
                          variant="caption"
                          component="span"
                          color="text.secondary"
                        >
                          Answered:{" "}
                          {new Date(call.answerTime).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="span"
                        color="text.secondary"
                      >
                        Duration: {formatDuration(duration)}
                      </Typography>
                      {call.queue && (
                        <Typography
                          variant="caption"
                          component="span"
                          color="info.main"
                          fontWeight="medium"
                        >
                          Queue: {call.queue}{" "}
                          {call.position ? `(Position: ${call.position})` : ""}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          );
        })
      )}
    </List>
  );
};

// Find the ActiveAgentsList component and update it to include a call button
const ActiveAgentsList = ({ agents, onCallAgent, timeRangeStats }) => {
  return (
    <List
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        p: 0,
        borderRadius: 1,
        overflow: "hidden",
        "& .MuiListItem-root": {
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            transform: "translateY(-1px)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          },
        },
      }}
    >
      {agents.length === 0 ? (
        <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="body2">No agents available</Typography>
        </Box>
      ) : (
        agents.map((agent, index) => {
          // Get status color
          const getStatusColor = (status) => {
            if (status === "On Call") return "error.main";
            if (status === "Available" || status === "Registered")
              return "success.main";
            if (status === "Paused") return "warning.main";
            return "text.disabled"; // Offline
          };

          // Get detailed tooltip content based on call stats
          const getDetailedStats = () => {
            const callStats = agent.callStats || {};
            // Debug log to see what data we have
            // console.log(
            //   `Agent ${agent.name} (${agent.extension}) call stats:`,
            //   callStats
            // );

            return (
              <>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 0.5 }}
                >
                  Call Statistics ({timeRangeStats?.subtitle || "Today"})
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography variant="body2">
                    Answered: {callStats.answeredCalls || 0}
                  </Typography>
                  <Typography variant="body2">
                    Missed: {callStats.missedCalls || 0}
                  </Typography>
                  <Typography variant="body2">
                    Outbound: {callStats.outboundCalls || 0}
                  </Typography>
                  <Typography variant="body2">
                    Inbound: {callStats.inboundCalls || 0}
                  </Typography>
                  <Typography variant="body2">
                    Total: {callStats.totalCalls || 0}
                  </Typography>
                  <Typography variant="body2">
                    Avg. Duration: {agent.avgHandleTime || "0:00"}
                  </Typography>
                </Box>
              </>
            );
          };

          return (
            <React.Fragment key={agent.id || index}>
              <Tooltip
                title={getDetailedStats()}
                placement="left"
                arrow
                sx={{ backgroundColor: "background.paper" }}
              >
                <ListItem
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderLeft: 7,
                    borderColor: getStatusColor(agent.status),
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getStatusColor(agent.status) + "20",
                        color: getStatusColor(agent.status),
                      }}
                    >
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        component="span"
                        sx={{ fontWeight: 500 }}
                      >
                        {agent.name}
                      </Typography>
                    }
                    secondary={
                      <Box
                        component="span"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          component="span"
                          sx={{
                            color: getStatusColor(agent.status),
                            fontWeight: 500,
                            px: 0.8,
                            py: 0.2,
                            borderRadius: 1,
                            bgcolor: getStatusColor(agent.status) + "15",
                          }}
                        >
                          {agent.status}
                        </Typography>
                        <Typography
                          variant="caption"
                          component="span"
                          color="text.secondary"
                        >
                          •
                        </Typography>
                        <Typography
                          variant="caption"
                          component="span"
                          color="text.secondary"
                        >
                          Ext: {agent.extension}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ fontWeight: 500, color: "primary.main" }}
                    >
                      {agent.callsDone != null
                        ? agent.callsDone
                        : agent.callStats?.answeredCalls || 0}{" "}
                      calls
                    </Typography>
                    <Typography
                      variant="caption"
                      component="span"
                      color="text.secondary"
                    >
                      Avg: {agent.avgHandleTime || "0:00"}
                    </Typography>
                  </Box>

                  {/* Add call button */}
                  {onCallAgent && agent.status !== "Offline" && (
                    <Tooltip title={`Call ${agent.name} (${agent.extension})`}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          console.log(
                            `Attempting to call agent ${agent.name} at extension ${agent.extension}`
                          );
                          onCallAgent(agent.extension, agent.name);
                        }}
                        sx={{
                          ml: 1,
                          bgcolor: "rgba(25, 118, 210, 0.08)",
                          "&:hover": {
                            bgcolor: "rgba(25, 118, 210, 0.15)",
                          },
                        }}
                      >
                        <PhoneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItem>
              </Tooltip>
              {index < agents.length - 1 && <Divider component="li" />}
            </React.Fragment>
          );
        })
      )}
    </List>
  );
};

const DashboardView = ({ open, onClose, title, isCollapsed }) => {
  const [timeRange, setTimeRange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(callMonitoringService.getDefaultStats());
  const [error, setError] = useState(null);
  const [agentPerformanceData, setAgentPerformanceData] = useState([]); // Add state for agent performance data
  const [agentCallCounts, setAgentCallCounts] = useState({}); // Stable per-extension handled counts (mix of AMI CallsTaken and CDR answered)
  const [handledCounts, setHandledCounts] = useState({});
  const [previousStats, setPreviousStats] = useState(null); // Track previous stats for trend calculation

  // Add notification hook
  const { showNotification } = useNotification();

  // Calculate trend based on previous stats
  const calculateTrend = (currentValue, previousValue) => {
    if (!previousValue || previousValue === 0) return 0;
    const percentChange =
      ((currentValue - previousValue) / previousValue) * 100;
    return Math.round(percentChange * 10) / 10; // Round to 1 decimal place
  };

  // Function to fetch agent performance data - MOVED UP
  const fetchAgentPerformanceData = useCallback(async () => {
    // GRACEFUL: Check if API calls are blocked during logout
    if (window.apiCallsBlocked) {
      console.log(
        "🔒 Agent performance data fetch gracefully skipped during logout"
      );
      return;
    }

    // Check if services can be initialized (has token and not logging out)
    if (!canInitializeServices()) {
      console.log(
        "Cannot initialize services - no auth token or logout in progress"
      );
      return;
    }

    try {
      // FIXED: Helper function to format date without timezone conversion
      const formatDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Get date range based on selected time range
      const today = new Date();
      let startDate, endDate;

      switch (timeRange) {
        case 0: // Today
          startDate = formatDateStr(today);
          endDate = startDate;
          break;
        case 1: // Week
          // FIXED: Use "since Sunday" to match backend, but cap at start of current month
          // This ensures weekly stats are always <= monthly stats (logical consistency)
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Go back to Sunday
          startOfWeek.setHours(0, 0, 0, 0);

          // If Sunday is in previous month, use start of current month instead
          const currentMonthStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          const weekStart =
            startOfWeek < currentMonthStart ? currentMonthStart : startOfWeek;

          startDate = formatDateStr(weekStart);
          endDate = formatDateStr(today);
          break;
        case 2: // Month
          // FIXED: Use start of current month instead of "30 days ago"
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          startDate = formatDateStr(startOfMonth);
          endDate = formatDateStr(today);
          break;
        default:
          startDate = formatDateStr(today);
          endDate = startDate;
      }

      // Fetch agent performance data
      const response = await getAgentPerformanceData(startDate, endDate);
      setAgentPerformanceData(response.data || []);
    } catch (error) {
      console.error("Error fetching agent performance data:", error);
      // Don't set error state to avoid disrupting the dashboard
    }
  }, [timeRange]);

  // Initial data fetch - NOW AFTER fetchAgentPerformanceData
  const fetchInitialStats = useCallback(async () => {
    // GRACEFUL: Check if API calls are blocked during logout
    if (window.apiCallsBlocked) {
      console.log("🔒 Initial stats fetch gracefully skipped during logout");
      return;
    }

    // Check if user is authenticated or logout is in progress
    // Check if services can be initialized (has token and not logout in progress)
    if (!canInitializeServices()) {
      console.log(
        "Cannot initialize services - no auth token or logout in progress"
      );
      return;
    }

    setIsLoading(true);

    // FIXED: Add timeout to stop loading indicator if connection takes too long
    const loadingTimeout = setTimeout(() => {
      console.warn("Dashboard loading timeout - stopping loading indicator");
      setIsLoading(false);
    }, 5000); // 5 second timeout

    try {
      // Subscribe to stats via centralized websocketService-backed service
      callMonitoringService.connect((newStats) => {
        setStats(newStats);
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      });

      // Also fetch agent performance data
      await fetchAgentPerformanceData();

      // FIXED: Ensure loading stops even if websocket doesn't connect immediately
      // If we got here without error, stop loading after a brief delay
      setTimeout(() => {
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      }, 2000);
    } catch (error) {
      console.error("Error fetching initial stats:", error);
      setError("Failed to load dashboard data. Please try again.");
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    }
  }, [fetchAgentPerformanceData]);

  // Get the appropriate stats based on the selected time range
  const getTimeRangeStats = useMemo(() => {
    switch (timeRange) {
      case 0: // Today
        return {
          totalCalls: stats.totalCalls || 0,
          answeredCalls: stats.answeredCalls || 0,
          inboundCalls: stats.inboundCalls || 0,
          outboundCalls: stats.outboundCalls || 0,
          abandonedCalls: stats.abandonedCalls || 0,
          dateFormatted: stats.todayDateFormatted,
          subtitle: "Today",
          abandonRate:
            stats.totalCalls > 0
              ? Math.round(
                  (stats.abandonedCalls / stats.totalCalls) * 100 * 10
                ) / 10
              : 0,
        };
      case 1: // Week
        return {
          totalCalls: stats.weeklyTotalCalls || 0,
          // FIXED: Use backend-provided data
          answeredCalls: Math.max(
            (stats.weeklyTotalCalls || 0) - (stats.weeklyAbandonedCalls || 0),
            0
          ),
          inboundCalls: stats.weeklyInboundCalls || 0,
          outboundCalls: stats.weeklyOutboundCalls || 0,
          abandonedCalls: stats.weeklyAbandonedCalls || 0,
          dateFormatted: stats.weekDateFormatted,
          subtitle: "This week",
          abandonRate:
            stats.weeklyTotalCalls > 0
              ? Math.round(
                  (stats.weeklyAbandonedCalls / stats.weeklyTotalCalls) *
                    100 *
                    10
                ) / 10
              : 0,
        };
      case 2: // Month
        return {
          totalCalls: stats.monthlyTotalCalls || 0,
          // FIXED: Use backend-provided data
          answeredCalls: Math.max(
            (stats.monthlyTotalCalls || 0) - (stats.monthlyAbandonedCalls || 0),
            0
          ),
          inboundCalls: stats.monthlyInboundCalls || 0,
          outboundCalls: stats.monthlyOutboundCalls || 0,
          abandonedCalls: stats.monthlyAbandonedCalls || 0,
          dateFormatted: stats.monthDateFormatted,
          subtitle: "This month",
          abandonRate:
            stats.monthlyTotalCalls > 0
              ? Math.round(
                  (stats.monthlyAbandonedCalls / stats.monthlyTotalCalls) *
                    100 *
                    10
                ) / 10
              : 0,
        };
      default:
        return {
          totalCalls: stats.totalCalls || 0,
          answeredCalls: stats.answeredCalls || 0,
          inboundCalls: stats.inboundCalls || 0,
          outboundCalls: stats.outboundCalls || 0,
          abandonedCalls: stats.abandonedCalls || 0,
          dateFormatted: stats.todayDateFormatted,
          subtitle: "Today",
          abandonRate:
            stats.totalCalls > 0
              ? Math.round(
                  (stats.abandonedCalls / stats.totalCalls) * 100 * 10
                ) / 10
              : 0,
        };
    }
  }, [timeRange, stats]);

  // Setup socket listeners and initial fetch
  useEffect(() => {
    let mounted = true;

    // GRACEFUL: Check if API calls are blocked during logout
    if (window.apiCallsBlocked) {
      console.log("🔒 Socket setup gracefully skipped during logout");
      return;
    }

    // Check if services can be initialized (has token and not logging out)
    if (!canInitializeServices()) {
      console.log(
        "Cannot initialize services - no auth token or logout in progress"
      );
      return;
    }

    const handleStatsUpdate = (newStats) => {
      if (mounted) {
        setStats(newStats);
        setIsLoading(false);
      }
    };

    // Connect to the monitoring service and set up handlers
    callMonitoringService.connect((newStats) => {
      if (mounted) {
        handleStatsUpdate(newStats);
      }
    });

    // Fetch initial data
    fetchInitialStats();

    return () => {
      mounted = false;

      // CRITICAL: Do NOT disconnect services on unmount
      // The connection manager handles reconnection globally
      // Disconnecting here causes SIP reconnection errors when switching tabs
      console.log(
        "🔌 DashboardView unmounting - keeping services connected (managed by connection manager)"
      );
    };
  }, [fetchInitialStats]);

  // Realtime agent availability updates (AMI → WS → agentService)
  useEffect(() => {
    if (!open || !canInitializeServices() || window.apiCallsBlocked) return;

    // Ensure agentService WS is connected (non-fatal if already connected)
    (async () => {
      try {
        await agentService.connect();
      } catch (_) {}
    })();

    const normalizeStatus = (payload) => {
      const raw = (payload?.status || "").toString().toLowerCase();
      if (
        raw.includes("oncall") ||
        raw.includes("on_call") ||
        raw.includes("busy")
      )
        return "On Call";
      if (raw.includes("avail") || raw.includes("online")) return "Available";
      if (raw.includes("registered")) return "Registered";
      if (raw.includes("pause") || raw.includes("break")) return "Paused";
      return "Offline";
    };

    const upsertAgent = (prevStats, payload) => {
      const ext = String(payload?.extension || payload?.ext || "");
      if (!ext) return prevStats;

      const list = Array.isArray(prevStats.activeAgentsList)
        ? [...prevStats.activeAgentsList]
        : [];

      const idx = list.findIndex((a) => String(a.extension) === ext);
      const status = normalizeStatus(payload);
      const name =
        payload?.name || (idx >= 0 ? list[idx].name : `Agent ${ext}`);

      const updated = {
        name,
        extension: ext,
        status,
        // preserve existing counters if present
        ...(idx >= 0 ? list[idx] : {}),
      };

      if (idx >= 0) list[idx] = updated;
      else list.push(updated);

      const activeAgents = list.filter(
        (a) =>
          a.status === "Available" ||
          a.status === "Registered" ||
          a.status === "On Call"
      ).length;

      return {
        ...prevStats,
        activeAgentsList: list,
        activeAgents,
      };
    };

    const onExtensionStatus = (payload) => {
      setStats((prev) => upsertAgent(prev, payload));
    };

    const onStatusChange = (payload) => {
      setStats((prev) => upsertAgent(prev, payload));
    };

    // Listen to the same agent_status event that AgentStatus.jsx uses successfully
    const agentStatusHandler = (data) => {
      // console.log("[DashboardView] Received agent_status update:", data);

      if (data && data.agents && Array.isArray(data.agents)) {
        // Update stats with the agents list
        setStats((prevStats) => {
          const activeAgents = data.agents.filter(
            (a) =>
              a.status === "Available" ||
              a.status === "Registered" ||
              a.status === "online" ||
              a.queueStatus === "available"
          ).length;

          return {
            ...prevStats,
            activeAgentsList: data.agents,
            activeAgents,
          };
        });
      }
    };

    // Subscribe to both event sources
    agentService.on("extension:status", onExtensionStatus);
    agentService.on("statusChange", onStatusChange);
    websocketService.on("agent_status", agentStatusHandler);

    return () => {
      agentService.off("extension:status", onExtensionStatus);
      agentService.off("statusChange", onStatusChange);
      websocketService.off("agent_status", agentStatusHandler);
    };
  }, [open]);

  // Fetch agent performance data when time range changes
  useEffect(() => {
    if (open && canInitializeServices() && !window.apiCallsBlocked) {
      fetchAgentPerformanceData();
    }
  }, [open, timeRange, fetchAgentPerformanceData]);

  // Update previous stats every 5 minutes for trend calculation
  // CRITICAL: Only depends on 'open' to prevent loops
  useEffect(() => {
    if (!open || !canInitializeServices() || window.apiCallsBlocked) return;

    // Set initial previous stats (runs once when dashboard opens)
    const checkAndSetInitial = () => {
      if (!previousStats && stats) {
        setPreviousStats({
          timestamp: Date.now(),
          totalCalls: getTimeRangeStats.totalCalls,
          answeredCalls: getTimeRangeStats.answeredCalls,
          abandonedCalls: getTimeRangeStats.abandonedCalls,
          activeAgents: stats.activeAgents,
        });
      }
    };

    // Initial check
    checkAndSetInitial();

    // Update previous stats every 5 minutes using latest values
    const interval = setInterval(() => {
      if (stats && getTimeRangeStats) {
        setPreviousStats({
          timestamp: Date.now(),
          totalCalls: getTimeRangeStats.totalCalls,
          answeredCalls: getTimeRangeStats.answeredCalls,
          abandonedCalls: getTimeRangeStats.abandonedCalls,
          activeAgents: stats.activeAgents,
        });
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
    // CRITICAL: Only depend on 'open' to prevent recreation loops
    // The function accesses stats and getTimeRangeStats from closure (always latest values)
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract fetchAgentCallCounts as a reusable function
  // IMPORTANT: Use useRef to prevent recreating this function on every stats change
  const fetchAgentCallCountsRef = useRef();

  fetchAgentCallCountsRef.current = async () => {
    // GRACEFUL: Check if API calls are blocked during logout
    if (window.apiCallsBlocked) {
      console.log(
        "🔒 Agent call counts fetch gracefully skipped during logout"
      );
      return;
    }

    if (!canInitializeServices()) {
      return;
    }

    try {
      // Build a unique set of extensions: visible agents + all agents from backend
      const allAgents = new Map();
      (stats?.activeAgentsList || []).forEach((a) => {
        if (a.extension)
          allAgents.set(String(a.extension), {
            name: a.name || `Agent ${a.extension}`,
          });
      });

      try {
        const backendAgents = await agentService.getAllAgents();
        backendAgents.forEach((a) => {
          if (a.extension)
            allAgents.set(String(a.extension), {
              name: a.name || `Agent ${a.extension}`,
            });
        });
      } catch (_) {}

      const callStatsMap = {};

      // Get today's date at midnight for filtering (UTC-aware)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      // Process each extension to get their call counts
      for (const [ext] of allAgents.entries()) {
        if (ext) {
          try {
            // Check if we should abort before making the call
            if (window.apiCallsBlocked || !open) {
              break;
            }

            // Use the getCallCountsByExtension function to get comprehensive call stats
            const response = await callHistoryService.getCallCountsByExtension(
              ext,
              todayStr,
              todayStr
            );

            if (response && response.success && response.data) {
              callStatsMap[ext] = response.data;
            } else {
              callStatsMap[ext] = null;
            }
          } catch (err) {
            // Check if this is a cancelled request
            if (
              (axios.isCancel && axios.isCancel(err)) ||
              err.message?.includes("XMLHttpRequest") ||
              err.message?.includes("apiCallsBlocked") ||
              err.name === "CanceledError"
            ) {
              console.log(`Call stats fetch cancelled for ${ext}`);
              break;
            }

            console.error(`Error fetching call stats for agent ${ext}:`, err);
            callStatsMap[ext] = null;
          }
        }
      }

      // Update state with the call stats
      if (!window.apiCallsBlocked) {
        setAgentCallCounts((prevCounts) => {
          const newCounts = {};

          // Process all fetched data
          Object.entries(callStatsMap).forEach(([ext, stats]) => {
            if (stats !== null) {
              newCounts[ext] = stats;
            } else if (prevCounts[ext]) {
              newCounts[ext] = prevCounts[ext];
            } else {
              newCounts[ext] = {
                answeredCalls: 0,
                missedCalls: 0,
                outboundCalls: 0,
                inboundCalls: 0,
                totalCalls: 0,
                avgCallDuration: 0,
                extension: ext,
              };
            }
          });

          return newCounts;
        });
      }
    } catch (error) {
      if (!window.apiCallsBlocked) {
        console.error("Error fetching agent call stats:", error);
      }
    }
  };

  // Stable function reference that won't cause re-renders
  const fetchAgentCallCounts = useCallback(() => {
    return fetchAgentCallCountsRef.current();
  }, []);

  // Add comprehensive refresh functionality
  const handleRefresh = useCallback(async () => {
    // GRACEFUL: Check if API calls are blocked during logout
    if (window.apiCallsBlocked) {
      console.log("🔒 Refresh gracefully skipped during logout");
      return;
    }

    if (!canInitializeServices()) {
      console.log("Cannot refresh - no auth token or logout in progress");
      return;
    }

    console.log("🔄 Starting comprehensive dashboard refresh...");
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Disconnect from WebSocket to force fresh connection
      console.log("🔌 Disconnecting WebSocket for fresh data...");
      callMonitoringService.disconnect();

      // Step 2: Clear existing stats to show fresh data
      setStats(callMonitoringService.getDefaultStats());

      // Step 3: Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Reconnect and fetch initial stats
      console.log("📊 Fetching fresh dashboard statistics...");
      await fetchInitialStats();

      // Step 5: Fetch agent performance data
      console.log("👥 Fetching agent performance data...");
      await fetchAgentPerformanceData();

      // Step 6: Refresh agent call counts
      console.log("📞 Refreshing agent call counts...");
      await fetchAgentCallCounts();

      console.log("✅ Dashboard refresh completed successfully");
    } catch (error) {
      console.error("❌ Error during dashboard refresh:", error);
      setError("Failed to refresh dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchInitialStats, fetchAgentPerformanceData, fetchAgentCallCounts]);

  // Listen for recovery completion to refresh dashboard data
  // NOTE: We don't call handleRefresh here because recovery already restores services
  // Calling handleRefresh would disconnect/reconnect services unnecessarily
  useEffect(() => {
    const handleRecoveryCompleted = () => {
      console.log("✅ [Dashboard] Recovery completed - services restored");
      console.log(
        "📊 [Dashboard] Stats will update automatically via WebSocket"
      );

      // Instead of full refresh, just fetch fresh call counts for agents
      // This doesn't disconnect any services
      setTimeout(() => {
        if (!window.apiCallsBlocked && canInitializeServices()) {
          console.log(
            "📞 [Dashboard] Refreshing agent call counts after recovery"
          );
          fetchAgentCallCounts();
        }
      }, 1000);
    };

    // Attach event listener
    sessionRecoveryManager.on("recovery:completed", handleRecoveryCompleted);

    return () => {
      // Cleanup on unmount
      sessionRecoveryManager.off("recovery:completed", handleRecoveryCompleted);
    };
    // CRITICAL: Don't depend on handleRefresh - causes recreation loop
    // fetchAgentCallCounts is stable (empty deps) so no loop
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch call counts for each agent - simplified to use the extracted function
  // IMPORTANT: Only runs when 'open' changes, not when stats change (prevents loops)
  useEffect(() => {
    if (!open || !canInitializeServices() || window.apiCallsBlocked) {
      return;
    }

    // Initial fetch (the function itself checks if there are agents)
    fetchAgentCallCounts();

    // Set up a polling interval to refresh call stats every minute
    const interval = setInterval(() => {
      if (open && canInitializeServices() && !window.apiCallsBlocked) {
        fetchAgentCallCounts();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
    };
    // CRITICAL: Only depend on 'open', NOT on fetchAgentCallCounts or stats
    // This prevents loops while the function always has access to latest stats via ref
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up socket for real-time call count updates
  useEffect(() => {
    if (!canInitializeServices() || window.apiCallsBlocked) {
      return;
    }

    let socketInstance = null;

    const setupSocket = () => {
      socketInstance = callHistoryService.setupRealtimeUpdates((data) => {
        // Extract extension from data
        let extension = data.extension;

        // If no extension directly in data, try to extract from channel
        if (!extension && data.channel && data.channel.startsWith("PJSIP/")) {
          const match = data.channel.match(/PJSIP\/(\d+)-/);
          if (match && match[1]) {
            extension = match[1];
          }
        }

        // If we have an extension and this is a completed call, update the count
        if (extension) {
          setAgentCallCounts((prev) => {
            const newCounts = { ...prev };

            // Ensure we have existing data for this extension
            if (!newCounts[extension]) {
              newCounts[extension] = {
                answeredCalls: 0,
                missedCalls: 0,
                outboundCalls: 0,
                inboundCalls: 0,
                totalCalls: 0,
                avgCallDuration: 0,
                extension,
              };
            }

            // Create a copy of the current stats
            const currentStats = { ...newCounts[extension] };

            // Answered: billsec > 0 (independent of disposition)
            if (Number(data.billsec || 0) > 0) {
              currentStats.answeredCalls =
                (currentStats.answeredCalls || 0) + 1;
              currentStats.totalCalls = (currentStats.totalCalls || 0) + 1;

              if (data.src === extension) {
                currentStats.outboundCalls =
                  (currentStats.outboundCalls || 0) + 1;
              } else {
                currentStats.inboundCalls =
                  (currentStats.inboundCalls || 0) + 1;
              }
            } else if (Number(data.billsec || 0) === 0) {
              // Missed/abandoned: billsec == 0
              currentStats.missedCalls = (currentStats.missedCalls || 0) + 1;
              currentStats.totalCalls = (currentStats.totalCalls || 0) + 1;
            }

            newCounts[extension] = currentStats;
            return newCounts;
          });
        }
      });
    };

    // Setup socket with a small delay to ensure initial data is loaded
    const timer = setTimeout(() => {
      setupSocket();
    }, 1000);

    return () => {
      clearTimeout(timer);
      // CRITICAL: Do NOT disconnect sockets on unmount
      // The connection manager handles all socket lifecycle globally
      // Disconnecting here causes unnecessary reconnection attempts
      console.log(
        "🔌 DashboardView socket cleanup - keeping socket connected (managed globally)"
      );
    };
  }, []);

  // Safe rendering data and AMI-derived call counts
  const queueStatus = stats?.queueStatus || [];
  const callsPerHour = stats?.callsPerHour || [];
  const activeCallsList = stats?.activeCallsList || [];

  const amiAgentCallCounts = useMemo(() => {
    const map = {};
    try {
      (queueStatus || []).forEach((q) => {
        (q.members || []).forEach((m) => {
          const iface = m.interface || m.Interface || "";
          // Expect formats like PJSIP/1004, SIP/1004
          const extMatch = iface.match(/\/(\d+)/);
          const ext = extMatch && extMatch[1] ? String(extMatch[1]) : null;
          if (!ext) return;
          const callsTaken = Number(m.callsTaken || m.CallsTaken) || 0;
          const lastCall = m.lastCall || m.LastCall || null;
          // Keep the max callsTaken observed across queues per agent
          if (!map[ext] || callsTaken > map[ext].callsTaken) {
            map[ext] = { callsTaken, lastCall };
          }
        });
      });
    } catch (_) {}
    return map;
  }, [queueStatus]);

  // Build handled counts purely from CDR answeredCalls (single source of truth)
  useEffect(() => {
    const next = { ...handledCounts };
    const allExtensions = new Set(Object.keys(agentCallCounts || {}));

    allExtensions.forEach((ext) => {
      const cdrAnswered = Number(agentCallCounts[ext]?.answeredCalls || 0);
      next[ext] = cdrAnswered;
    });

    const changed = Object.keys(next).some((k) => next[k] !== handledCounts[k]);
    if (changed) setHandledCounts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentCallCounts]);

  // Sort activeAgentsList to prioritize online agents and those with most handled calls
  const sortedActiveAgentsList = useMemo(() => {
    const agents = [...(stats?.activeAgentsList || [])];

    // Create a map of agent performance data by name for quick lookup
    const performanceMap = new Map();
    agentPerformanceData.forEach((agent) => {
      performanceMap.set(agent.name, agent);
    });

    // Merge agent data with performance data and call stats
    const mergedAgents = agents.map((agent) => {
      const performance = performanceMap.get(agent.name);
      // Get the comprehensive call stats for this agent
      const callStats = agentCallCounts[agent.extension] || {
        answeredCalls: 0,
        missedCalls: 0,
        outboundCalls: 0,
        inboundCalls: 0,
        totalCalls: 0,
        avgCallDuration: 0,
      };

      // Prefer AMI CallsTaken when available for callsDone
      const amiCounts = amiAgentCallCounts[String(agent.extension)] || null;
      const callsDoneFromAMI = amiCounts ? amiCounts.callsTaken : null;

      // Format average call duration if available
      let formattedAvgDuration = "0:00";
      if (callStats.avgCallDuration && callStats.avgCallDuration > 0) {
        formattedAvgDuration = formatDuration(callStats.avgCallDuration);
      }

      return {
        ...agent,
        // Use CDR-only handled counts; fall back to per-agent CDR stats
        callsDone:
          handledCounts[String(agent.extension)] != null
            ? handledCounts[String(agent.extension)]
            : callStats.answeredCalls || 0,
        // Store all the rich call stats data for potential future use
        callStats:
          handledCounts[String(agent.extension)] != null
            ? {
                ...callStats,
                answeredCalls: handledCounts[String(agent.extension)],
              }
            : callStats,
        // Use formatted average call duration
        avgHandleTime: formattedAvgDuration,
        // Keep satisfaction from performance data if available
        satisfaction: performance
          ? performance.satisfaction
          : agent.satisfaction || 0,
      };
    });

    // Sort by status priority and then by calls handled
    return mergedAgents.sort((a, b) => {
      // Define status priority
      const getPriority = (status) => {
        if (status === "On Call") return 1;
        if (status === "Available" || status === "Registered") return 2;
        if (status === "Paused") return 3;
        return 4; // Offline
      };

      // First sort by status priority
      const statusDiff = getPriority(a.status) - getPriority(b.status);

      // If status is the same, sort by calls handled (descending)
      if (statusDiff === 0) {
        return (b.callsDone || 0) - (a.callsDone || 0);
      }

      return statusDiff;
    });
  }, [stats?.activeAgentsList, agentPerformanceData, agentCallCounts]);

  // Format queue metrics for display
  const queueMetrics = useMemo(() => {
    return {
      avgWaitTime: stats?.queueMetrics?.avgWaitTime || "0:00",
      serviceLevelToday: stats?.queueMetrics?.serviceLevelToday || 0,
      // Use the calculated abandon rate from the selected time range
      abandonRate: getTimeRangeStats.abandonRate || 0,
    };
  }, [stats?.queueMetrics, getTimeRangeStats.abandonRate]);

  // Ensure unique calls based on uniqueid
  const uniqueActiveCallsList = useMemo(() => {
    const uniqueCallsMap = new Map();
    stats?.activeCallsList?.forEach((call) => {
      if (!uniqueCallsMap.has(call.uniqueid)) {
        uniqueCallsMap.set(call.uniqueid, call);
      }
    });
    return Array.from(uniqueCallsMap.values());
  }, [stats?.activeCallsList]);

  // Add handler for calling agents
  const handleCallAgent = useCallback(
    (extension, name) => {
      try {
        console.log(
          `Attempting to call agent ${name} at extension ${extension}`
        );

        // Method 1: Try to use the global handleDirectCall function if available
        if (
          window.handleDirectCall &&
          typeof window.handleDirectCall === "function"
        ) {
          console.log(`Using global handleDirectCall for ${extension}`);
          window.handleDirectCall(extension);
          showNotification({
            message: `Initiating call to ${name} (${extension})`,
            severity: "info",
            duration: 3000,
          });
          return;
        }

        // Method 1.5: Try to update the state directly through window object
        if (
          window.updateDialerState &&
          typeof window.updateDialerState === "function"
        ) {
          console.log(`Using window.updateDialerState for ${extension}`);
          window.updateDialerState(extension);
          // Add a small delay to ensure state is updated before clicking
          setTimeout(() => {
            const callButton = document.querySelector(
              '[data-testid="call-button"]'
            );
            if (callButton) {
              callButton.click();
              showNotification({
                message: `Call initiated to ${name} (${extension})`,
                severity: "success",
                duration: 3000,
              });
            } else {
              showNotification({
                message: `Extension ${extension} set in dialpad. Please click the call button manually.`,
                severity: "info",
                duration: 3000,
              });
            }
          }, 100);
          return;
        }

        // Method 2: Try to find the appbar in the current document
        const appbar = document.querySelector(
          '[data-testid="appbar"], #appbar, .MuiAppBar-root'
        );
        if (appbar) {
          console.log("Found appbar, looking for phone input");

          // Find the phone number input field using multiple selectors
          const dialpadInput = appbar.querySelector(
            '[data-testid="phone-input"], input[placeholder*="number"], input[placeholder*="call"], input[name="phoneNumber"]'
          );

          if (dialpadInput) {
            console.log("Found phone input, setting extension");

            // Set the extension as the phone number
            dialpadInput.value = extension;

            // Trigger change event to update the state
            const changeEvent = new Event("input", { bubbles: true });
            dialpadInput.dispatchEvent(changeEvent);

            // Also trigger change event for React
            const reactChangeEvent = new Event("change", { bubbles: true });
            dialpadInput.dispatchEvent(reactChangeEvent);

            // Force React to recognize the change by dispatching a custom event
            const customEvent = new CustomEvent("react:input", {
              detail: { value: extension },
              bubbles: true,
            });
            dialpadInput.dispatchEvent(customEvent);

            // Find and click the call button using multiple selectors
            const callButton = appbar.querySelector(
              '[data-testid="call-button"], button[aria-label*="Call"], button[title*="Call"], button:has([data-testid="CallIcon"])'
            );

            if (callButton) {
              console.log(`Found call button, initiating call to ${extension}`);

              // Add a small delay to ensure React state has updated
              setTimeout(() => {
                callButton.click();
                showNotification({
                  message: `Call initiated to ${name} (${extension})`,
                  severity: "success",
                  duration: 3000,
                });
              }, 100);
            } else {
              console.warn("Found dialpad input but no call button");
              showNotification({
                message: `Extension ${extension} set in dialpad. Please click the call button manually.`,
                severity: "warning",
                duration: 5000,
              });
            }
          } else {
            console.warn("Found appbar but no dialpad input field");
            showNotification({
              message: `Could not find phone input field. Please manually enter ${extension} in the dialpad.`,
              severity: "warning",
              duration: 5000,
            });
          }
        } else {
          // Method 3: Try to find any phone input in the document
          console.log("Appbar not found, searching for any phone input");
          const anyPhoneInput = document.querySelector(
            '[data-testid="phone-input"], input[placeholder*="number"], input[placeholder*="call"], input[name="phoneNumber"]'
          );

          if (anyPhoneInput) {
            console.log("Found phone input via fallback");
            anyPhoneInput.value = extension;
            anyPhoneInput.dispatchEvent(new Event("input", { bubbles: true }));
            anyPhoneInput.dispatchEvent(new Event("change", { bubbles: true }));

            // Try to find a call button near this input
            const callButton =
              anyPhoneInput
                .closest("form")
                ?.querySelector('button[type="submit"]') ||
              anyPhoneInput.parentElement?.querySelector("button") ||
              document.querySelector(
                '[data-testid="call-button"], button[aria-label*="Call"], button[title*="Call"]'
              );

            if (callButton) {
              console.log(
                `Found call button via fallback, initiating call to ${extension}`
              );
              callButton.click();
              showNotification({
                message: `Call initiated to ${name} (${extension})`,
                severity: "success",
                duration: 3000,
              });
            } else {
              console.warn("Found phone input but no call button");
              showNotification({
                message: `Extension ${extension} set in dialpad. Please click the call button manually.`,
                severity: "warning",
                duration: 5000,
              });
            }
          } else {
            console.warn(
              "Could not find any phone input field in the document"
            );
            showNotification({
              message: `Could not find phone input. Please manually enter ${extension} in the dialpad.`,
              severity: "error",
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error(`Error calling agent ${extension}:`, error);
        showNotification({
          message: `Error calling ${name}: ${error.message}`,
          severity: "error",
          duration: 5000,
        });
      }
    },
    [showNotification]
  );

  // Add this effect to expose the agent list to the window object
  useEffect(() => {
    // Expose the sorted agent list to the window object for other components to use
    if (sortedActiveAgentsList && sortedActiveAgentsList.length > 0) {
      window.dashboardAgentsList = sortedActiveAgentsList;
    }

    return () => {
      // Clean up when component unmounts
      delete window.dashboardAgentsList;
    };
  }, [sortedActiveAgentsList]);

  // Show error state if needed
  if (error) {
    return (
      <ContentFrame open={open} onClose={onClose} title={title}>
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button onClick={handleRefresh} startIcon={<Refresh />}>
            Retry
          </Button>
        </Box>
      </ContentFrame>
    );
  }

  // (dedupe removed)
  // Sort activeAgentsList to prioritize online agents
  const activeAgentsList = useMemo(() => {
    const agents = [...(stats?.activeAgentsList || [])];

    // Sort by status priority: On Call (highest), Available, Offline (lowest)
    return agents.sort((a, b) => {
      // Define status priority
      const getPriority = (status) => {
        if (status === "On Call") return 1;
        if (status === "Available" || status === "Registered") return 2;
        return 3; // Offline
      };

      // Sort by priority (lower number = higher priority)
      return getPriority(a.status) - getPriority(b.status);
    });
  }, [stats?.activeAgentsList]);

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Dashboard</Typography>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: "inherit" }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Refresh />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      }
      isCollapsed={isCollapsed}
      headerColor="#08403E"
      hideCloseButton={true}
    >
      {/* Wrap the entire content in a scrollable container that prevents event propagation */}
      <Box
        sx={{
          height: "100%",
          overflow: "auto",
          // Custom scrollbar styling
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0,0,0,0.05)",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Time Range Selector */}
          <Box sx={{ mb: 3 }}>
            <Tabs
              value={timeRange}
              onChange={(_, newValue) => setTimeRange(newValue)}
              sx={{ minHeight: 36 }}
            >
              <Tab label="Today" sx={{ minHeight: 36 }} />
              <Tab label="Week" sx={{ minHeight: 36 }} />
              <Tab label="Month" sx={{ minHeight: 36 }} />
            </Tabs>

            {/* Display current date with time range context */}
            <Box
              sx={{
                mt: 2,
                mb: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" color="text.secondary">
                {getTimeRangeStats.dateFormatted}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {/* Animated snooze clock icon */}
                <AccessAlarm
                  sx={{
                    fontSize: 15,
                    color: "#083E",
                    mr: 0.5,
                    animation: "pulse 1s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 0.6, transform: "scale(1)" },
                      "50%": { opacity: 1, transform: "scale(1.2)" },
                      "100%": { opacity: 0.6, transform: "scale(1.5)" },
                    },
                  }}
                />
                {timeRange === 0
                  ? "Stats reset at midnight"
                  : timeRange === 1
                  ? "Weekly stats (since Sunday)"
                  : "Monthly stats (current month)"}
              </Typography>
            </Box>
          </Box>

          {/* Main Stats */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Waiting Calls"
                value={stats.activeCalls}
                icon={<CallIcon sx={{ color: "#2196f3" }} />}
                color="#2196f3"
                subtitle="Active Calls"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Answered Calls"
                value={getTimeRangeStats.answeredCalls}
                icon={<CallEnd sx={{ color: "#4caf50" }} />}
                color="#4caf50"
                subtitle={getTimeRangeStats.subtitle}
                trend={
                  previousStats
                    ? calculateTrend(
                        getTimeRangeStats.answeredCalls,
                        previousStats.answeredCalls || 0
                      )
                    : null
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Abandoned Calls"
                value={getTimeRangeStats.abandonedCalls}
                icon={<CallMissed sx={{ color: "#f44336" }} />}
                color="#f44336"
                subtitle={`${getTimeRangeStats.subtitle} (${getTimeRangeStats.abandonRate}%)`}
                trend={
                  previousStats
                    ? calculateTrend(
                        getTimeRangeStats.abandonedCalls,
                        previousStats.abandonedCalls
                      )
                    : null
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Calls"
                value={getTimeRangeStats.totalCalls}
                icon={<QueryStats sx={{ color: "#9c27b0" }} />}
                color="#9c27b0"
                subtitle={`${getTimeRangeStats.subtitle} (In: ${
                  getTimeRangeStats.inboundCalls || 0
                } • Out: ${getTimeRangeStats.outboundCalls || 0})`}
                trend={
                  previousStats
                    ? calculateTrend(
                        getTimeRangeStats.totalCalls,
                        previousStats.totalCalls
                      )
                    : null
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Active Agents"
                value={stats.activeAgents}
                icon={<SupervisorAccount sx={{ color: "#ff9800" }} />}
                color="#ff9800"
                subtitle="Currently online"
              />
            </Grid>

            {/* Call Volume Chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Call Volume Trends
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={callsPerHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <ChartTooltip />
                      <Line type="monotone" dataKey="calls" stroke="#2196f3" />
                      <Line
                        type="monotone"
                        dataKey="abandoned"
                        stroke="#f44336"
                      />
                      <Line
                        type="monotone"
                        dataKey="handled"
                        stroke="#4caf50"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Queue Status */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Queue Status
                </Typography>
                {queueStatus && queueStatus.length > 0 ? (
                  queueStatus.map((queue) => (
                    <QueueStatus key={queue.name} queue={queue} />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No active queues
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Active Agents List */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Active Agents</Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "success.light",
                        color: "success.contrastText",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                      }}
                    >
                      <SupervisorAccount sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2" fontWeight="medium">
                        {
                          sortedActiveAgentsList.filter(
                            (agent) =>
                              agent.status === "Available" ||
                              agent.status === "Registered" ||
                              agent.status === "On Call"
                          ).length
                        }{" "}
                        Online
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "primary.light",
                        color: "primary.contrastText",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                      }}
                    >
                      <CallIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2" fontWeight="medium">
                        {
                          // Use sticky mixed counts so aggregate never flickers down
                          sortedActiveAgentsList.reduce((total, agent) => {
                            const ext = String(agent.extension);
                            if (handledCounts[ext] != null)
                              return total + handledCounts[ext];
                            const ami = amiAgentCallCounts[ext];
                            if (ami && typeof ami.callsTaken === "number")
                              return total + ami.callsTaken;
                            return (
                              total + (agent.callStats?.answeredCalls || 0)
                            );
                          }, 0)
                        }{" "}
                        Handled
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <ActiveAgentsList
                  agents={sortedActiveAgentsList}
                  onCallAgent={handleCallAgent}
                  timeRangeStats={getTimeRangeStats}
                />
              </Paper>
            </Grid>

            {/* Active Calls */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Waiting Calls
                </Typography>
                <ActiveCallsList calls={uniqueActiveCallsList} />
              </Paper>
            </Grid>

            {/* Performance Metrics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <AccessTime color="primary" />
                      <Box>
                        <Typography variant="subtitle2">
                          Average Wait Time
                        </Typography>
                        <Typography variant="h6">
                          {queueMetrics.avgWaitTime || "0:00"}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Speed color="success" />
                      <Box>
                        <Typography variant="subtitle2">
                          Service Level Today
                        </Typography>
                        <Typography variant="h6">
                          {`${queueMetrics.serviceLevelToday || 0}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <TrendingUp color="error" />
                      <Box>
                        <Typography variant="subtitle2">
                          Abandon Rate
                        </Typography>
                        <Typography variant="h6">
                          {`${getTimeRangeStats.abandonRate || 0}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* WebSocket Connection Status */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
                <Typography variant="h6" gutterBottom>
                  Connection Health
                </Typography>
                <WebSocketStatus showDetails={true} />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </ContentFrame>
  );
};

export default DashboardView;
