import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  Refresh,
  Phone,
  PhoneDisabled,
  Timer,
  CheckCircle,
  PauseCircle,
  Block,
  SupervisorAccount,
} from "@mui/icons-material";
import ContentFrame from "./ContentFrame";
import { callMonitoringService } from "../services/callMonitoringServiceElectron";
import websocketService from "../services/websocketService";
import { formatDistanceToNow } from "date-fns";

// Status configuration - supports both frontend and Asterisk AMI formats
const statusConfig = {
  // Asterisk queue status (from AMI events)
  available: { color: "#4caf50", icon: CheckCircle, label: "Available" },
  in_use: { color: "#2196f3", icon: Phone, label: "On Call" },
  busy: { color: "#f44336", icon: PhoneDisabled, label: "Busy" },
  unavailable: { color: "#9e9e9e", icon: Block, label: "Unavailable" },
  ringing: { color: "#ffa726", icon: Phone, label: "Ringing" },
  on_hold: { color: "#ff9800", icon: PauseCircle, label: "On Hold" },
  // PJSIP registration status
  online: { color: "#4caf50", icon: CheckCircle, label: "Online" },
  registered: { color: "#4caf50", icon: CheckCircle, label: "Registered" },
  offline: { color: "#9e9e9e", icon: Block, label: "Offline" },
  // Legacy formats
  "On Call": { color: "#2196f3", icon: Phone, label: "On Call" },
  Available: { color: "#4caf50", icon: CheckCircle, label: "Available" },
  Offline: { color: "#9e9e9e", icon: Block, label: "Offline" },
  Break: { color: "#ff9800", icon: PauseCircle, label: "Break" },
  "Not Ready": { color: "#f44336", icon: Block, label: "Not Ready" },
};

// Helper function to get status config with fallbacks
const getStatusConfig = (agent) => {
  // Prioritize queueStatus (from AMI queue events) over general status
  let statusKey = agent.queueStatus || agent.status;

  // If agent is paused, override with Break status
  if (agent.paused) {
    return {
      color: "#ff9800",
      icon: PauseCircle,
      label: agent.pauseReason || "On Break",
    };
  }

  // Normalize status key
  if (statusKey) {
    statusKey = String(statusKey).toLowerCase();
  }

  return (
    statusConfig[statusKey] ||
    statusConfig[agent.status] || {
      color: "#9e9e9e",
      icon: Block,
      label: agent.status || "Unknown",
    }
  );
};

// Helper function to format last seen time
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Unknown";
  try {
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  } catch (error) {
    return "Unknown";
  }
};

const AgentStatusCard = ({ agent }) => {
  const status = getStatusConfig(agent);
  const StatusIcon = status.icon;

  // Get agent name from either name or fullName field
  const agentName =
    agent.name || agent.fullName || agent.username || "Unknown Agent";

  // Generate initials from name for avatar
  const initials = agentName
    ? agentName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "??";

  return (
    <Card
      elevation={2}
      sx={{
        border: 1,
        borderColor: "divider",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: status.color, mr: 2 }}>{initials}</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500 }}>
              {agentName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ext: {agent.extension}
            </Typography>
          </Box>
          <Chip
            icon={<StatusIcon sx={{ fontSize: 16 }} />}
            label={status.label}
            size="small"
            sx={{
              bgcolor: `${status.color}15`,
              color: status.color,
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Box>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Status Duration
            </Typography>
            <Typography variant="body2">
              {agent.currentCall
                ? agent.currentCall.duration
                  ? `${Math.floor(agent.currentCall.duration / 60)}:${(
                      agent.currentCall.duration % 60
                    )
                      .toString()
                      .padStart(2, "0")}`
                  : "00:00"
                : "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Calls Taken
            </Typography>
            <Typography variant="body2">
              {agent.callsTaken || agent.callsDone || 0}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Queue{agent.queues && agent.queues.length > 1 ? "s" : ""}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
              {agent.queues && agent.queues.length > 0
                ? agent.queues.join(", ")
                : "None"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Connection
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
              {agent.ip || agent.transport === "websocket"
                ? "WebRTC"
                : agent.status === "offline" ||
                  agent.status === "Offline" ||
                  agent.queueStatus === "unavailable"
                ? "Disconnected"
                : "Connected"}
            </Typography>
          </Grid>
          {agent.lastCall && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Last Call
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                {formatLastSeen(agent.lastCall)}
              </Typography>
            </Grid>
          )}
          {agent.status === "offline" ||
          agent.status === "Offline" ||
          agent.queueStatus === "unavailable" ? (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Last Seen
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                {formatLastSeen(agent.lastSeen)}
              </Typography>
            </Grid>
          ) : null}
        </Grid>
      </CardContent>
    </Card>
  );
};

const AgentStatus = ({ open, onClose }) => {
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(callMonitoringService.getDefaultStats());

  // Initialize socket connection and listen for agent status updates
  useEffect(() => {
    if (!open) return;

    let loadingTimeout = null;
    let mounted = true;
    let agentStatusHandler = null;

    const initializeAgentStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Set hard timeout for loading indicator (5 seconds)
        loadingTimeout = setTimeout(() => {
          console.warn(
            "[AgentStatus] Loading timeout - stopping loading indicator"
          );
          if (mounted) {
            setIsLoading(false);
          }
        }, 5000);

        // Connect to websocket if not already connected
        await websocketService.connect();

        // Listen for agent status updates
        agentStatusHandler = (data) => {
          if (!mounted) return;

          console.log("[AgentStatus] Received agent status update:", data);

          // Handle the agent status update payload
          if (data && data.agents) {
            setAgents(data.agents);
            setIsLoading(false);
            clearTimeout(loadingTimeout);
          }
        };

        // Subscribe to agent_status event
        websocketService.on("agent_status", agentStatusHandler);

        // Also connect to call monitoring for general stats (optional)
        callMonitoringService.connect((newStats) => {
          if (!mounted) return;
          setStats(newStats);

          // Handle legacy format if activeAgentsList is provided
          if (newStats.activeAgentsList) {
            setAgents(newStats.activeAgentsList);
            setIsLoading(false);
            clearTimeout(loadingTimeout);
          }
        });

        // Request initial agent status via HTTP fallback
        try {
          const response = await fetch(
            `${
              process.env.REACT_APP_API_URL || "http://localhost:8004"
            }/api/agent-status`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.agents) {
              setAgents(result.data.agents);
              setIsLoading(false);
              clearTimeout(loadingTimeout);
            }
          }
        } catch (fetchError) {
          console.warn("[AgentStatus] HTTP fallback failed:", fetchError);
        }

        // Fallback: stop loading after 2 seconds even if no data received
        setTimeout(() => {
          if (mounted) {
            setIsLoading(false);
            clearTimeout(loadingTimeout);
          }
        }, 2000);
      } catch (err) {
        console.error("[AgentStatus] Error initializing:", err);
        if (mounted) {
          setError("Failed to load agent status");
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    initializeAgentStatus();

    return () => {
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      // Remove event listener with proper handler reference
      if (agentStatusHandler) {
        websocketService.off("agent_status", agentStatusHandler);
      }
    };
  }, [open]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    // Set timeout to stop loading after 3 seconds if no response
    const refreshTimeout = setTimeout(() => {
      console.warn(
        "[AgentStatus] Refresh timeout - stopping loading indicator"
      );
      setIsLoading(false);
    }, 3000);

    try {
      // Request fresh agent status
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:8004"
        }/api/agent-status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.agents) {
          setAgents(result.data.agents);
          setIsLoading(false);
          clearTimeout(refreshTimeout);
          return;
        }
      }
    } catch (fetchError) {
      console.warn("[AgentStatus] Refresh failed:", fetchError);
    }

    // Fallback: stop loading after timeout
    setTimeout(() => {
      setIsLoading(false);
      clearTimeout(refreshTimeout);
    }, 2000);
  };

  const filteredAgents = useMemo(() => {
    return agents.filter(
      (agent) =>
        agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.extension?.includes(searchQuery)
    );
  }, [agents, searchQuery]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      total: agents.length,
      available: agents.filter((a) => {
        // Agent is available if: online/registered AND not paused AND not in use
        if (a.paused) return false;
        const queueStatus = a.queueStatus?.toLowerCase();
        const status = a.status?.toLowerCase();
        return (
          queueStatus === "available" ||
          status === "available" ||
          status === "online" || // Added online check
          status === "registered" ||
          a.status === "Available" ||
          a.status === "Online" || // Added Online check
          a.status === "Registered"
        );
      }).length,
      onCall: agents.filter((a) => {
        const queueStatus = a.queueStatus?.toLowerCase();
        const status = a.status?.toLowerCase();
        return (
          queueStatus === "in_use" ||
          queueStatus === "busy" ||
          queueStatus === "ringing" ||
          status === "on call" ||
          a.status === "On Call"
        );
      }).length,
      offline: agents.filter((a) => {
        const queueStatus = a.queueStatus?.toLowerCase();
        const status = a.status?.toLowerCase();
        return (
          queueStatus === "unavailable" ||
          queueStatus === "offline" ||
          status === "offline" ||
          a.status === "Offline" ||
          (!a.status && !a.queueStatus)
        );
      }).length,
    };
  }, [agents]);

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Agent Status</Typography>
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
      headerColor="#0288d1"
    >
      <Box sx={{ p: 3 }}>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#f5f5f5",
              }}
            >
              <SupervisorAccount color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Agents
                </Typography>
                <Typography variant="h6">{summary.total}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#e8f5e9",
              }}
            >
              <CheckCircle color="success" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Available
                </Typography>
                <Typography variant="h6">{summary.available}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#e3f2fd",
              }}
            >
              <Phone color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  On Call
                </Typography>
                <Typography variant="h6">{summary.onCall}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#ffebee",
              }}
            >
              <Block color="error" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Offline
                </Typography>
                <Typography variant="h6">{summary.offline}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search agents by name or extension..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {error ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <Typography variant="body1" color="error" textAlign="center">
              {error}
            </Typography>
          </Box>
        ) : isLoading && agents.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={agent.id || agent.extension}
                >
                  <AgentStatusCard agent={agent} />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  textAlign="center"
                >
                  {searchQuery
                    ? "No agents found matching your search"
                    : "No agents available"}
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </ContentFrame>
  );
};

export default AgentStatus;
