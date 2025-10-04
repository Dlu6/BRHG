import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  ListItemIcon,
  LinearProgress,
} from "@mui/material";
import DnsIcon from "@mui/icons-material/Dns";
import GitHubIcon from "@mui/icons-material/GitHub";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CommitIcon from "@mui/icons-material/Commit";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import UpdateIcon from "@mui/icons-material/Update";
import apiClient from "../api/apiClient";

const About = () => {
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [error, setError] = useState(null);
  const [updateApproved] = useState(false); // This would be set by admin approval
  const [systemInfo, setSystemInfo] = useState({
    version: "1.0.2",
    uptime: null,
    lastUpdate: null,
    systemHealth: {
      cpu: null,
      memory: null,
      disk: null,
    },
    services: {
      asterisk: false,
      redis: false,
      mysql: false,
      pm2: false,
    },
    updateHistory: [],
    gitInfo: {
      lastCommit: "",
      branch: "",
      commitDate: "",
    },
  });

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await apiClient.get("/users/system/info");
      setSystemInfo(response.data);

      // Fetch Redis health status if available
      try {
        const redisResponse = await apiClient.get("/admin/health/redis");
        if (redisResponse.data.redis === "connected") {
          setSystemInfo((prev) => ({
            ...prev,
            services: {
              ...prev.services,
              redis: true,
            },
          }));
        }
      } catch (redisError) {
        // Redis health check failed, keep existing status
        console.debug("Redis health check not available:", redisError.message);
      }
    } catch (err) {
      console.error("Failed to fetch system info:", err);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);
      setUpdateStatus("Starting update process...");

      const response = await apiClient.post("/users/system/update");

      if (response.data.success) {
        setUpdateStatus(
          "Update completed successfully! The system will restart momentarily..."
        );
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update system");
    } finally {
      setUpdating(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Typography
              sx={{
                color: "primary.main",
                fontWeight: "bold",
                fontSize: "2rem",
                fontFamily: "fantasy",
                letterSpacing: "0.1em",
                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
              }}
              variant="h4"
              gutterBottom
            >
              About Mayday CRM
            </Typography>
            <Typography variant="body1" paragraph>
              Version: {systemInfo.version || "Loading..."}
            </Typography>
            <Typography variant="body1" paragraph>
              Mayday Client Relationship Management System (Mayday-CRM) is a
              comprehensive call center management solution integrating with
              Asterisk PBX to provide advanced telephony features, queue
              management, and real-time monitoring capabilities and
              integrations.
            </Typography>
          </Grid>

          {/* System Health Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <MemoryIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">CPU Usage</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" display="inline">
                        {systemInfo.systemHealth.cpu?.total || "0.0"}%
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(
                            systemInfo.systemHealth.cpu?.total || 0
                          )}
                          sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: "background.default",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: (theme) => {
                                const value = parseFloat(
                                  systemInfo.systemHealth.cpu?.total || 0
                                );
                                if (value < 1) return theme.palette.info.main;
                                if (value < 60)
                                  return theme.palette.success.main;
                                if (value < 80)
                                  return theme.palette.warning.main;
                                return theme.palette.error.main;
                              },
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          User: {systemInfo.systemHealth.cpu?.user || "0.0"}% |
                          System: {systemInfo.systemHealth.cpu?.system || "0.0"}
                          %
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <StorageIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Memory Usage</Typography>
                    </Box>
                    <Typography variant="h5">
                      {systemInfo.systemHealth.memory}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AccessTimeIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Uptime</Typography>
                    </Box>
                    <Typography variant="h5">
                      {systemInfo.uptime
                        ? formatUptime(systemInfo.uptime)
                        : "..."}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Disk Info */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <StorageIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="h6">Disk Information</Typography>
                </Box>
                <List
                  sx={{
                    "& .MuiListItem-root": {
                      borderLeft: "3px solid transparent",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderLeft: "3px solid primary.main",
                        bgcolor: "action.hover",
                      },
                    },
                  }}
                >
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          sx={{ mr: 0.5 }}
                        >
                          Total Space:
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="body1"
                          component="span"
                          sx={{ mt: 0.5 }}
                        >
                          {systemInfo.systemHealth.disk?.total ||
                            "Calculating.."}{" "}
                          GB
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                        >
                          Used Space
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography component="div" variant="body1">
                            {systemInfo.systemHealth.disk?.used || "Reading.."}{" "}
                            GB
                            <LinearProgress
                              variant="determinate"
                              value={
                                (parseFloat(
                                  systemInfo.systemHealth.disk?.used || 0
                                ) /
                                  parseFloat(
                                    systemInfo.systemHealth.disk?.total || 1
                                  )) *
                                100
                              }
                              sx={{
                                mt: 1,
                                height: 8,
                                borderRadius: 1,
                                bgcolor: "background.default",
                              }}
                            />
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          sx={{ mr: 0.5 }}
                        >
                          Free Space:
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="body1"
                          component="span"
                          sx={{ mt: 0.5 }}
                        >
                          {systemInfo.systemHealth.disk?.free || "Computing.."}{" "}
                          GB
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Services Status */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <DnsIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="h6" component="div">
                    Services Status
                  </Typography>
                </Box>
                <List>
                  {Object.entries(systemInfo.services).map(
                    ([service, status]) => (
                      <ListItem key={service}>
                        <ListItemText
                          primary={service.toUpperCase()}
                          primaryTypographyProps={{ component: "div" }}
                        />
                        <Chip
                          label={status ? "Running" : "Stopped"}
                          color={status ? "success" : "error"}
                          size="small"
                        />
                      </ListItem>
                    )
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Update History */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <UpdateIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="h6" component="div">
                    Update History
                  </Typography>
                </Box>
                <List>
                  {systemInfo.updateHistory.map((update, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={new Date(update.date).toLocaleDateString()}
                        secondary={update.version}
                        primaryTypographyProps={{ component: "div" }}
                        secondaryTypographyProps={{ component: "div" }}
                      />
                      <UpdateIcon color="action" />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Git Info */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <GitHubIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="h6">Git Information</Typography>
                </Box>
                <List
                  sx={{
                    "& .MuiListItem-root": {
                      borderLeft: "3px solid transparent",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderLeft: "3px solid primary.main",
                        bgcolor: "action.hover",
                      },
                    },
                  }}
                >
                  <ListItem>
                    <ListItemIcon>
                      <AccountTreeIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          component="div"
                          variant="body2"
                          color="text.secondary"
                        >
                          Current Branch
                        </Typography>
                      }
                      secondary={
                        <Typography
                          component="div"
                          variant="body1"
                          sx={{ mt: 0.5 }}
                        >
                          {systemInfo.gitInfo.branch || "Loading..."}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CommitIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          component="div"
                          variant="body2"
                          color="text.secondary"
                        >
                          Last Commit
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={
                              systemInfo.gitInfo.lastCommit || "Loading..."
                            }
                            sx={{
                              maxWidth: "100%",
                              fontFamily: "monospace",
                              bgcolor: "background.default",
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AccessTimeIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          component="div"
                          variant="body2"
                          color="text.secondary"
                        >
                          Commit Date
                        </Typography>
                      }
                      secondary={
                        <Typography
                          component="div"
                          variant="body1"
                          sx={{ mt: 0.5 }}
                        >
                          {systemInfo.gitInfo.commitDate
                            ? new Date(
                                systemInfo.gitInfo.commitDate
                              ).toLocaleString()
                            : "Loading..."}
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* System Update Information and Button */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mt: 2 }}>
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  "& .MuiAlert-message": {
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  },
                }}
                icon={<SystemUpdateAltIcon />}
              >
                <Box>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: "medium", mb: 1 }}
                  >
                    System Updates
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    System updates require administrator approval. The update
                    button below will be enabled once your update request has
                    been approved.
                  </Typography>
                </Box>
              </Alert>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    updating ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SystemUpdateAltIcon />
                    )
                  }
                  onClick={handleUpdate}
                  disabled={!updateApproved || updating}
                  sx={{
                    opacity: updateApproved ? 1 : 0.6,
                    transition: "opacity 0.2s ease-in-out",
                  }}
                >
                  {updating ? "Updating..." : "Update System"}
                </Button>

                {!updateApproved && (
                  <Typography variant="body2" color="text.secondary">
                    (Disabled - Awaiting approval)
                  </Typography>
                )}
              </Box>

              {updateStatus && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {updateStatus}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 4,
                color: "text.secondary",
                fontSize: "0.875rem",
              }}
            >
              <Typography variant="body2">
                © {new Date().getFullYear()} MM-iCT. All rights reserved.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default About;
