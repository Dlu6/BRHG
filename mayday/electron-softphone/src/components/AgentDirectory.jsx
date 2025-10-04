import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import ContentFrame from "./ContentFrame";
import {
  Search,
  Phone,
  Star,
  StarBorder,
  Person,
  CallMerge,
  FilterList,
  Refresh,
} from "@mui/icons-material";
import { callMonitoringService } from "../services/callMonitoringServiceElectron";
import { useNotification } from "../contexts/NotificationContext";
import { useCallState } from "../hooks/useCallState";
import { sipService, sipCallService } from "../services/sipService";

const AgentDirectory = ({ open, onClose, onTransferCall }) => {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState(null);
  const { showNotification } = useNotification();
  const { callState, CALL_STATES } = useCallState(sipService, sipCallService);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("agentFavorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    localStorage.setItem("agentFavorites", JSON.stringify(newFavorites));
  };

  // Load agents data
  useEffect(() => {
    if (!open) return;

    const loadAgents = () => {
      try {
        const currentStats = callMonitoringService.getStats();
        if (currentStats?.activeAgentsList) {
          setAgents(currentStats.activeAgentsList);
          setStats(currentStats);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading agents:", error);
        setIsLoading(false);
      }
    };

    loadAgents();

    // Set up real-time updates
    const updateHandler = (newStats) => {
      if (newStats?.activeAgentsList) {
        setAgents(newStats.activeAgentsList);
        setStats(newStats);
      }
    };

    callMonitoringService.connect(updateHandler);

    // Poll for updates every 10 seconds
    const interval = setInterval(loadAgents, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [open]);

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let filtered = agents.filter((agent) => {
      // Apply status filter
      if (
        statusFilter === "available" &&
        agent.status !== "Available" &&
        agent.status !== "Registered"
      )
        return false;
      if (statusFilter === "onCall" && agent.status !== "On Call") return false;
      if (statusFilter === "offline" && agent.status !== "Offline")
        return false;
      if (statusFilter === "favorites" && !favorites.includes(agent.extension))
        return false;

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          agent.name?.toLowerCase().includes(query) ||
          agent.extension?.includes(query)
        );
      }

      return true;
    });

    // Sort agents: favorites first, then by status, then by name
    filtered.sort((a, b) => {
      // Favorites first
      const aIsFavorite = favorites.includes(a.extension);
      const bIsFavorite = favorites.includes(b.extension);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Then by status priority
      const statusPriority = {
        Available: 1,
        Registered: 1,
        "On Call": 2,
        Offline: 3,
      };
      const aPriority = statusPriority[a.status] || 4;
      const bPriority = statusPriority[b.status] || 4;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Finally by name
      return (a.name || "").localeCompare(b.name || "");
    });

    return filtered;
  }, [agents, searchQuery, statusFilter, favorites]);

  // Handle direct call to agent
  const handleDirectCall = async (agent) => {
    if (callState.state !== CALL_STATES.IDLE) {
      showNotification({
        message: "Please end your current call before making a new one",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      await sipCallService.makeCall(agent.extension);
      showNotification({
        message: `Calling ${agent.name} (${agent.extension})`,
        severity: "info",
        duration: 2000,
      });
      onClose();
    } catch (error) {
      showNotification({
        message: `Failed to call ${agent.name}: ${error.message}`,
        severity: "error",
        duration: 5000,
      });
    }
  };

  // Handle transfer to agent
  const handleTransferToAgent = (agent) => {
    if (onTransferCall) {
      onTransferCall(agent.extension);
    }
    onClose();
  };

  // Toggle favorite status
  const toggleFavorite = (extension) => {
    const newFavorites = favorites.includes(extension)
      ? favorites.filter((fav) => fav !== extension)
      : [...favorites, extension];
    saveFavorites(newFavorites);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
      case "Registered":
        return "success";
      case "On Call":
        return "error";
      case "Offline":
        return "default";
      default:
        return "default";
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      total: agents.length,
      available: agents.filter(
        (a) => a.status === "Available" || a.status === "Registered"
      ).length,
      onCall: agents.filter((a) => a.status === "On Call").length,
      offline: agents.filter((a) => a.status === "Offline").length,
    };
  }, [agents]);

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Typography variant="h6">Agent Directory</Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.8)" }}
            >
              {summary.available} available • {summary.onCall} on call •{" "}
              {summary.total} total
            </Typography>
            <IconButton
              size="small"
              onClick={() => window.location.reload()}
              sx={{ color: "white" }}
            >
              <Refresh />
            </IconButton>
          </Box>
        </Box>
      }
      headerColor="#1976d2"
    >
      {/* Search and Filter Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            fullWidth
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
          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            startAdornment={<FilterList />}
          >
            <MenuItem value="all">All Agents</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="onCall">On Call</MenuItem>
            <MenuItem value="offline">Offline</MenuItem>
            <MenuItem value="favorites">Favorites</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Agents List */}
      <Box sx={{ height: "calc(100% - 120px)", overflow: "auto" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredAgents.length === 0 ? (
          <Box sx={{ textAlign: "center", p: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {searchQuery || statusFilter !== "all"
                ? "No agents match your search criteria"
                : "No agents available"}
            </Typography>
            {searchQuery && (
              <Button
                size="small"
                onClick={() => setSearchQuery("")}
                sx={{ mt: 1 }}
              >
                Clear Search
              </Button>
            )}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredAgents.map((agent, index) => (
              <React.Fragment key={agent.extension}>
                <ListItem
                  sx={{
                    py: 1.5,
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          agent.status === "On Call"
                            ? "error.light"
                            : "success.light",
                      }}
                    >
                      <Person />
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box
                        component="span"
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="body2"
                          component="span"
                          fontWeight="medium"
                        >
                          {agent.name}
                        </Typography>
                        {favorites.includes(agent.extension) && (
                          <Star sx={{ fontSize: 16, color: "warning.main" }} />
                        )}
                        <Chip
                          label={agent.status}
                          size="small"
                          color={getStatusColor(agent.status)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box
                        component="span"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography variant="caption" component="span">
                          Ext: {agent.extension}
                        </Typography>
                        {agent.callsDone > 0 && (
                          <>
                            <Typography
                              variant="caption"
                              component="span"
                              color="text.secondary"
                            >
                              •
                            </Typography>
                            <Typography variant="caption" component="span">
                              {agent.callsDone} calls today
                            </Typography>
                          </>
                        )}
                        {agent.currentCall && (
                          <>
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
                              color="error.main"
                            >
                              On call: {agent.currentCall.callerId}
                            </Typography>
                          </>
                        )}
                        {agent.lastSeen && (
                          <>
                            <Typography
                              variant="caption"
                              component="span"
                              color="text.secondary"
                            >
                              •
                            </Typography>
                            <Typography variant="caption" component="span">
                              Last seen:{" "}
                              {new Date(agent.lastSeen).toLocaleTimeString()}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />

                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => toggleFavorite(agent.extension)}
                      color={
                        favorites.includes(agent.extension)
                          ? "warning"
                          : "default"
                      }
                    >
                      <Tooltip
                        title={
                          favorites.includes(agent.extension)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        {favorites.includes(agent.extension) ? (
                          <Star />
                        ) : (
                          <StarBorder />
                        )}
                      </Tooltip>
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => handleDirectCall(agent)}
                      disabled={callState.state !== CALL_STATES.IDLE}
                      color="primary"
                    >
                      <Tooltip title="Call directly">
                        <Phone />
                      </Tooltip>
                    </IconButton>

                    {callState.state === CALL_STATES.ESTABLISHED && (
                      <IconButton
                        size="small"
                        onClick={() => handleTransferToAgent(agent)}
                        color="secondary"
                      >
                        <Tooltip title="Transfer call">
                          <CallMerge />
                        </Tooltip>
                      </IconButton>
                    )}
                  </Box>
                </ListItem>
                {index < filteredAgents.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {callState.state === CALL_STATES.ESTABLISHED && (
          <Button
            onClick={() => {
              // Open transfer dialog
              if (window.handleOpenTransferDialog) {
                window.handleOpenTransferDialog();
              }
              onClose();
            }}
            color="primary"
            variant="contained"
            startIcon={<CallMerge />}
          >
            Transfer Current Call
          </Button>
        )}
      </Box>
    </ContentFrame>
  );
};

export default AgentDirectory;
