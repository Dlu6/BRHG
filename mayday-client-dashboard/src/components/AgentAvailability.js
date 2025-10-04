import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Person as PersonIcon,
  Circle as CircleIcon,
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  Phone as PhoneIcon,
  PhoneDisabled as PhoneDisabledIcon,
  Settings as SettingsIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import apiClient from "../api/apiClient";

const StatusIndicator = styled(CircleIcon)(({ theme, status }) => ({
  fontSize: 12,
  color:
    status === "online"
      ? theme.palette.success.main
      : status === "registered"
      ? theme.palette.warning.main
      : status === "offline"
      ? theme.palette.error.main
      : theme.palette.grey[400],
}));

const AgentCard = styled(Card)(({ theme, status }) => ({
  transition: "all 0.3s ease",
  border: `1px solid ${
    status === "online"
      ? alpha(theme.palette.success.main, 0.3)
      : status === "registered"
      ? alpha(theme.palette.warning.main, 0.3)
      : alpha(theme.palette.grey[300], 0.3)
  }`,
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[8],
  },
}));

const AgentAvailability = () => {
  const theme = useTheme();
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({
    totalAgents: 0,
    onlineAgents: 0,
    offlineAgents: 0,
    registeredAgents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  // const [viewMode, setViewMode] = useState("cards"); // 'cards' or 'table' - commented out for future use

  useEffect(() => {
    fetchAgentStatus();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchAgentStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const [statusResponse, summaryResponse] = await Promise.all([
        apiClient.get("/agent-status"),
        apiClient.get("/agent-status/summary"),
      ]);

      if (statusResponse.data.success) {
        setAgents(statusResponse.data.data.agents || []);
        setLastUpdate(new Date(statusResponse.data.data.timestamp));
      }

      if (summaryResponse.data.success) {
        setSummary(summaryResponse.data.data);
      }

      setError(null);
    } catch (error) {
      console.error("Error fetching agent status:", error);
      setError("Failed to fetch agent status");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await apiClient.post("/agent-status/refresh");
      await fetchAgentStatus();
    } catch (error) {
      console.error("Error refreshing agent status:", error);
      setError("Failed to refresh agent status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return theme.palette.success.main;
      case "registered":
        return theme.palette.warning.main;
      case "offline":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[400];
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "online":
        return "Online";
      case "registered":
        return "Registered";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const getStatusIcon = (agent) => {
    if (agent.status === "online") {
      return agent.transport === "websocket" ? <WifiIcon /> : <PhoneIcon />;
    }
    return agent.configured ? <PhoneDisabledIcon /> : <WifiOffIcon />;
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Never";

    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now - seen;

    if (diffMs < 60000) return "Just now";
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return seen.toLocaleDateString();
  };

  if (loading && agents.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Summary Cards */}
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
          mb={3}
        >
          <Box>
            <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
              Agent Availability
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time status of all registered agents
              {lastUpdate &&
                ` • Last updated: ${lastUpdate.toLocaleTimeString()}`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh Status">
              <IconButton
                onClick={handleRefresh}
                disabled={loading}
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <Card
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.05),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                  }}
                >
                  <PersonIcon />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="700"
                    color="success.main"
                  >
                    {summary.onlineAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Online
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.warning.main, 0.05),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                  }}
                >
                  <SettingsIcon />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="700"
                    color="warning.main"
                  >
                    {summary.registeredAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registered
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.error.main, 0.05),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                  }}
                >
                  <PhoneDisabledIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700" color="error.main">
                    {summary.offlineAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Offline
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                >
                  <ComputerIcon />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="700"
                    color="primary.main"
                  >
                    {summary.totalAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Agent List */}
      <Paper
        sx={{
          borderRadius: 3,
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <Typography variant="h6" fontWeight="600">
            Agent Details ({agents.length})
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {agents.map((agent) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={agent.extension}>
                <AgentCard status={agent.status}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {/* Agent Header */}
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor: getStatusColor(agent.status),
                            width: 40,
                            height: 40,
                          }}
                        >
                          {getStatusIcon(agent)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight="600"
                            noWrap
                          >
                            {agent.fullName || agent.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Ext. {agent.extension}
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Status */}
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Chip
                          icon={<StatusIndicator status={agent.status} />}
                          label={getStatusLabel(agent.status)}
                          size="small"
                          sx={{
                            backgroundColor: alpha(
                              getStatusColor(agent.status),
                              0.1
                            ),
                            color: getStatusColor(agent.status),
                            fontWeight: 600,
                            // ensure the small leading circle matches the status color
                            "& .MuiChip-icon": {
                              color: getStatusColor(agent.status),
                            },
                          }}
                        />
                        <Chip
                          label={
                            agent.typology === "chrome_softphone"
                              ? "Chrome Extension"
                              : agent.typology === "electron_softphone"
                              ? "Desktop App"
                              : agent.typology === "webRTC"
                              ? "WebRTC"
                              : agent.typology || "SIP Phone"
                          }
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: "0.75rem",
                            backgroundColor: agent.sessionActive
                              ? alpha(theme.palette.info.main, 0.1)
                              : alpha(theme.palette.grey[500], 0.1),
                            color: agent.sessionActive
                              ? theme.palette.info.main
                              : theme.palette.grey[600],
                          }}
                        />
                      </Stack>

                      {/* Connection Details */}
                      {agent.status === "online" && agent.ip && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            IP: {agent.ip}:{agent.port}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Transport: {agent.transport}
                          </Typography>
                        </Box>
                      )}

                      {/* Last Seen */}
                      <Typography variant="caption" color="text.secondary">
                        Last seen: {formatLastSeen(agent.lastSeen)}
                        {agent.sessionActive && (
                          <span
                            style={{
                              color: theme.palette.success.main,
                              marginLeft: 8,
                            }}
                          >
                            • Active Session
                          </span>
                        )}
                      </Typography>
                    </Stack>
                  </CardContent>
                </AgentCard>
              </Grid>
            ))}
          </Grid>

          {agents.length === 0 && !loading && (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <PersonIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                No agents found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No agents are currently configured in the system
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AgentAvailability;
