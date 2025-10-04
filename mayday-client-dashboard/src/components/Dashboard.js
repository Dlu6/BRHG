import {
  Box,
  Card,
  Grid,
  Typography,
  useTheme,
  alpha,
  Paper,
  LinearProgress,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import TalkIcon from "@mui/icons-material/Forum";
import AnswerIcon from "@mui/icons-material/QuestionAnswer";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import TimerIcon from "@mui/icons-material/Timer";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useState, useEffect } from "react";
import callStatsService from "../services/callStatsService";
import AgentAvailability from "./AgentAvailability";

const StatCard = ({ title, value, icon, color, trend, isLoading }) => {
  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUpIcon sx={{ fontSize: 16 }} />;
    if (trend < 0) return <TrendingDownIcon sx={{ fontSize: 16 }} />;
    return <TrendingFlatIcon sx={{ fontSize: 16 }} />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return "success.main";
    if (trend < 0) return "error.main";
    return "text.secondary";
  };

  return (
    <Card
      sx={{
        p: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        boxShadow: "0 8px 8px rgba(37, 122, 0, 0.95)",
        border: "1px solid rgba(0,0,0,0.06)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.9)",
          borderColor: alpha(color, 0.3),
        },
      }}
    >
      {/* Header with colored background */}
      <Box
        sx={{
          p: 2.5,
          backgroundColor: alpha(color, 0.08),
          borderBottom: `1px solid ${alpha(color, 0.1)}`,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: "white",
              color: color,
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>

          {trend !== null && (
            <Chip
              icon={getTrendIcon(trend)}
              label={`${Math.abs(trend)}%`}
              size="small"
              sx={{
                backgroundColor: alpha(getTrendColor(trend), 0.1),
                color: getTrendColor(trend),
                fontWeight: 600,
                fontSize: "0.75rem",
                "& .MuiChip-icon": {
                  color: getTrendColor(trend),
                },
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
        <Typography
          variant="h3"
          sx={{
            mb: 1,
            fontWeight: 700,
            color: "text.primary",
            letterSpacing: "-0.02em",
            transition: "all 0.3s ease",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textTransform: "uppercase",
            fontWeight: 600,
            letterSpacing: "0.5px",
            fontSize: "0.75rem",
            transition: "all 0.3s ease",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Bottom accent */}
      <Box
        sx={{
          height: 4,
          backgroundColor: color,
          opacity: 0.8,
        }}
      />
    </Card>
  );
};

// Helper function to format time in MM:SS format
const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

// Helper function to format wait time with better readability
const formatWaitTime = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Helper function to calculate trend percentage
const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return null;
  const trend = ((current - previous) / previous) * 100;
  return Math.round(trend);
};

const Dashboard = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [queueActivity, setQueueActivity] = useState({ serviceLevel: 0 });
  const [abandonRateStats, setAbandonRateStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch call statistics
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch current stats
        const callStats = await callStatsService.getCallStats();
        const queueData = await callStatsService.getQueueActivity();
        const abandonStats = await callStatsService.getAbandonRateStats();

        if (callStats) {
          // Store previous stats for trend calculation
          setPreviousStats(
            stats.length > 0
              ? {
                  waiting: stats[0]?.value || 0,
                  talking: stats[1]?.value || 0,
                  answered: stats[2]?.value || 0,
                  abandoned: stats[3]?.value || 0,
                  totalOffered: stats[4]?.value || 0,
                  avgHoldTime: stats[5]?.value || "00:00",
                }
              : null
          );

          // Format the stats for display
          const formattedStats = [
            {
              title: "WAITING",
              value: callStats.waiting || 0,
              icon: <PhoneCallbackIcon />,
              color: theme.palette.info.main,
              trend: previousStats
                ? calculateTrend(callStats.waiting, previousStats.waiting)
                : null,
            },
            {
              title: "TALKING",
              value: callStats.talking || 0,
              icon: <TalkIcon />,
              color: theme.palette.warning.main,
              trend: previousStats
                ? calculateTrend(callStats.talking, previousStats.talking)
                : null,
            },
            {
              title: "ANSWERED",
              value: callStats.answered || 0,
              icon: <AnswerIcon />,
              color: theme.palette.success.main,
              trend: previousStats
                ? calculateTrend(callStats.answered, previousStats.answered)
                : null,
            },
            {
              title: "ABANDONED",
              value: callStats.abandoned || 0,
              icon: <PhoneMissedIcon />,
              color: theme.palette.error.main,
              trend: previousStats
                ? calculateTrend(callStats.abandoned, previousStats.abandoned)
                : null,
            },
            {
              title: "TOTAL OFFERED",
              value: callStats.totalOffered || 0,
              icon: <PhoneForwardedIcon />,
              color: theme.palette.primary.main,
              trend: previousStats
                ? calculateTrend(
                    callStats.totalOffered,
                    previousStats.totalOffered
                  )
                : null,
            },
            {
              title: "AVERAGE HOLD TIME",
              value: formatTime(callStats.avgHoldTime),
              icon: <TimerIcon />,
              color: "#6b7280",
              trend: null, // No trend for time values
            },
          ];

          setStats(formattedStats);
          setQueueActivity(queueData);
          setAbandonRateStats(abandonStats);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchData, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const callStats = await callStatsService.getCallStats();
      const queueData = await callStatsService.getQueueActivity();
      const abandonStats = await callStatsService.getAbandonRateStats();

      if (callStats) {
        const formattedStats = [
          {
            title: "WAITING",
            value: callStats.waiting || 0,
            icon: <PhoneCallbackIcon />,
            color: theme.palette.info.main,
            trend: previousStats
              ? calculateTrend(callStats.waiting, previousStats.waiting)
              : null,
          },
          {
            title: "TALKING",
            value: callStats.talking || 0,
            icon: <TalkIcon />,
            color: theme.palette.warning.main,
            trend: previousStats
              ? calculateTrend(callStats.talking, previousStats.talking)
              : null,
          },
          {
            title: "ANSWERED",
            value: callStats.answered || 0,
            icon: <AnswerIcon />,
            color: theme.palette.success.main,
            trend: previousStats
              ? calculateTrend(callStats.answered, previousStats.answered)
              : null,
          },
          {
            title: "ABANDONED",
            value: callStats.abandoned || 0,
            icon: <PhoneMissedIcon />,
            color: theme.palette.error.main,
            trend: previousStats
              ? calculateTrend(callStats.abandoned, previousStats.abandoned)
              : null,
          },
          {
            title: "TOTAL OFFERED",
            value: callStats.totalOffered || 0,
            icon: <PhoneForwardedIcon />,
            color: theme.palette.primary.main,
            trend: previousStats
              ? calculateTrend(
                  callStats.totalOffered,
                  previousStats.totalOffered
                )
              : null,
          },
          {
            title: "AVERAGE HOLD TIME",
            value: formatTime(callStats.avgHoldTime),
            icon: <TimerIcon />,
            color: "#6b7280",
            trend: null,
          },
        ];

        setStats(formattedStats);
        setQueueActivity(queueData);
        setAbandonRateStats(abandonStats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      {/* Enhanced Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DashboardIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="700" sx={{ mb: 0.5 }}>
                Daily Stats Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Real-time monitoring and analytics for call center operations
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
              <Chip
                label={isLoading ? "Updating..." : "Live"}
                size="small"
                sx={{
                  mt: 0.5,
                  backgroundColor: isLoading
                    ? alpha(theme.palette.warning.main, 0.1)
                    : alpha(theme.palette.success.main, 0.1),
                  color: isLoading
                    ? theme.palette.warning.main
                    : theme.palette.success.main,
                  fontWeight: 600,
                }}
              />
            </Box>
            <Tooltip title="Refresh Data">
              <span>
                <IconButton
                  onClick={handleRefresh}
                  disabled={isLoading}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Stats Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          fontWeight="600"
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Key Performance Indicators
        </Typography>
        <Grid container spacing={3}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <StatCard {...stat} isLoading={isLoading} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Enhanced Queue Activity */}
      <Paper
        sx={{
          mt: 4,
          p: 0,
          borderRadius: 3,
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            >
              <ShowChartIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="600">
                Queue Activity Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time performance metrics and service levels
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                    }}
                  >
                    <SpeedIcon />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    SERVICE LEVEL
                  </Typography>
                </Stack>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    mb: 2,
                    color: theme.palette.success.main,
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {queueActivity.serviceLevel}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={queueActivity.serviceLevel}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: theme.palette.success.main,
                    },
                  }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                    }}
                  >
                    <AccessTimeIcon />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    AVERAGE WAIT TIME
                  </Typography>
                </Stack>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    mb: 1,
                    color: theme.palette.info.main,
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {formatWaitTime(queueActivity.waitTime)}
                </Typography>

                {/* Show additional wait time info */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, fontSize: "0.875rem" }}
                >
                  Average time to answer calls today
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={Math.min((queueActivity.waitTime / 180) * 100, 100)} // Scale to 3 minutes max for better visualization
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: theme.palette.info.main,
                    },
                  }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.error.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      color: theme.palette.error.main,
                    }}
                  >
                    <TrendingDownIcon />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    ABANDON RATE
                  </Typography>
                </Stack>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    mb: 1,
                    color: theme.palette.error.main,
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {abandonRateStats?.today?.abandonRate ||
                    queueActivity.abandonRate ||
                    0}
                  %
                </Typography>

                {/* Show call counts */}
                {abandonRateStats?.today && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, fontSize: "0.875rem" }}
                  >
                    {abandonRateStats.today.abandonedCalls} of{" "}
                    {abandonRateStats.today.totalCalls} calls abandoned today
                  </Typography>
                )}

                <LinearProgress
                  variant="determinate"
                  value={
                    abandonRateStats?.today?.abandonRate ||
                    queueActivity.abandonRate ||
                    0
                  }
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: theme.palette.error.main,
                    },
                  }}
                />

                {/* Show additional stats if available */}
                {abandonRateStats && (
                  <Stack direction="row" spacing={2} mt={2}>
                    <Box sx={{ textAlign: "center", flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        This Week
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        color="text.primary"
                      >
                        {abandonRateStats.week?.abandonRate || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        This Month
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        color="text.primary"
                      >
                        {abandonRateStats.month?.abandonRate || 0}%
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Hourly Abandon Rate Trend */}
          {abandonRateStats?.hourlyBreakdown &&
            abandonRateStats.hourlyBreakdown.length > 0 && (
              <Paper
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                }}
              >
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Hourly Abandon Rate Trend (Today)
                </Typography>
                <Grid container spacing={2}>
                  {abandonRateStats.hourlyBreakdown.map((hourData, index) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          backgroundColor: "white",
                          border: "1px solid rgba(0,0,0,0.1)",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {hourData.hour}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="text.primary"
                        >
                          {hourData.abandonRate}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {hourData.abandonedCalls}/{hourData.totalCalls}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
        </Box>
      </Paper>

      {/* Agent Availability Section */}
      <Box sx={{ mt: 4 }}>
        <AgentAvailability />
      </Box>
    </Box>
  );
};

export default Dashboard;
