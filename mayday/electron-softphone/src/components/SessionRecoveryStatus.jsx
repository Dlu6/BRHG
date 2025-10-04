/**
 * Session Recovery Status Component
 *
 * Displays real-time session recovery status to users
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Wifi as WifiIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Timeline as MonitoringIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";

const SessionRecoveryStatus = ({ recoveryManager, onForceRecovery }) => {
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    if (!recoveryManager) return;

    // Initial status
    setStatus(recoveryManager.getStatus());

    // Listen for recovery events
    const handleRecoveryStarted = (data) => {
      setStatus(recoveryManager.getStatus());
      setExpanded(true);
      setShowDetails(true);
    };

    const handleRecoveryPhase = (data) => {
      setStatus(recoveryManager.getStatus());
    };

    const handleRecoveryCompleted = (data) => {
      setStatus(recoveryManager.getStatus());
      // Auto-collapse after 5 seconds
      setTimeout(() => {
        setExpanded(false);
        setShowDetails(false);
      }, 5000);
    };

    const handleRecoveryError = (data) => {
      setStatus(recoveryManager.getStatus());
      setExpanded(true);
      setShowDetails(true);
    };

    const handleServiceRestored = (data) => {
      setStatus(recoveryManager.getStatus());
    };

    const handleAuthRequired = () => {
      console.log("🔐 Authentication required - redirecting to login");
      setAuthRequired(true);
      setExpanded(true);
      setShowDetails(true);
    };

    recoveryManager.on("recovery:started", handleRecoveryStarted);
    recoveryManager.on("recovery:phase", handleRecoveryPhase);
    recoveryManager.on("recovery:completed", handleRecoveryCompleted);
    recoveryManager.on("recovery:error", handleRecoveryError);
    recoveryManager.on("recovery:service_restored", handleServiceRestored);
    recoveryManager.on("recovery:auth_required", handleAuthRequired);

    // Update status periodically
    const interval = setInterval(() => {
      setStatus(recoveryManager.getStatus());
    }, 1000);

    return () => {
      recoveryManager.off("recovery:started", handleRecoveryStarted);
      recoveryManager.off("recovery:phase", handleRecoveryPhase);
      recoveryManager.off("recovery:completed", handleRecoveryCompleted);
      recoveryManager.off("recovery:error", handleRecoveryError);
      recoveryManager.off("recovery:service_restored", handleServiceRestored);
      recoveryManager.off("recovery:auth_required", handleAuthRequired);
      clearInterval(interval);
    };
  }, [recoveryManager]);

  if (!status) {
    return null;
  }

  const getPhaseMessage = (phase) => {
    switch (phase) {
      case "idle":
        return "All systems operational";
      case "validating":
        return "Validating session...";
      case "reconnecting":
        return "Restoring connections...";
      case "verifying":
        return "Verifying restoration...";
      case "complete":
        return "Mayday Bar Healthy";
      case "failed":
        return "Recovery failed";
      default:
        return "Unknown status";
    }
  };

  const getPhaseColor = (phase) => {
    switch (phase) {
      case "idle":
      case "complete":
        return "success";
      case "validating":
      case "reconnecting":
      case "verifying":
        return "info";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const getServiceIcon = (service) => {
    switch (service) {
      case "auth":
        return <SecurityIcon />;
      case "websocket":
        return <WifiIcon />;
      case "sip":
        return <PhoneIcon />;
      case "agent":
        return <PersonIcon />;
      case "monitoring":
        return <MonitoringIcon />;
      default:
        return null;
    }
  };

  const getServiceLabel = (service) => {
    switch (service) {
      case "auth":
        return "Authentication";
      case "websocket":
        return "WebSocket";
      case "sip":
        return "SIP Phone";
      case "agent":
        return "Agent Status";
      case "monitoring":
        return "Call Monitoring";
      default:
        return service;
    }
  };

  // Don't show anything if everything is healthy and not recovering
  if (
    !status.isRecovering &&
    status.recoveryPhase === "idle" &&
    !showDetails &&
    !authRequired
  ) {
    return null;
  }

  // Special UI for authentication required
  if (authRequired) {
    return (
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          width: 320,
        }}
      >
        <Paper elevation={8} sx={{ overflow: "hidden" }}>
          <Alert severity="error" sx={{ p: 2 }}>
            <AlertTitle sx={{ fontWeight: "bold" }}>
              🔐 Authentication Required
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Your session credentials are missing or invalid. Redirecting to
              login page...
            </Typography>
            <LinearProgress color="error" />
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        width: 320,
      }}
    >
      <Paper elevation={8} sx={{ overflow: "hidden" }}>
        {/* Header */}
        <Box
          sx={{
            p: 0.5,
            bgcolor: status.isRecovering
              ? "info.main"
              : status.recoveryPhase === "complete"
              ? "success.main"
              : status.recoveryPhase === "failed"
              ? "error.main"
              : "background.paper",
            color:
              status.isRecovering ||
              status.recoveryPhase === "complete" ||
              status.recoveryPhase === "failed"
                ? "white"
                : "text.primary",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {status.isRecovering ? (
              <RefreshIcon sx={{ animation: "spin 1s linear infinite" }} />
            ) : status.recoveryPhase === "complete" ? (
              <CheckIcon />
            ) : status.recoveryPhase === "failed" ? (
              <ErrorIcon />
            ) : null}

            <Typography variant="subtitle1" fontWeight="bold">
              {getPhaseMessage(status.recoveryPhase)}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {status.isRecovering && (
              <Chip
                label={`Attempt ${status.recoveryAttempt}/${status.maxRecoveryAttempts}`}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
              />
            )}

            <IconButton size="small" sx={{ color: "inherit" }}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Progress Bar */}
        {status.isRecovering && <LinearProgress />}

        {/* Collapsible Details */}
        <Collapse in={expanded}>
          <Box sx={{ p: 2 }}>
            {/* Failed Services Alert */}
            {status.failedServices.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Services Requiring Attention</AlertTitle>
                {status.failedServices.join(", ")}
              </Alert>
            )}

            {/* Service Health Status */}
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Service Health
            </Typography>

            <List dense>
              {Object.entries(status.healthStatus)
                .filter(([service]) => service !== "agent")
                .map(([service, healthy]) => (
                  <ListItem key={service}>
                    <ListItemIcon>{getServiceIcon(service)}</ListItemIcon>
                    <ListItemText
                      primary={getServiceLabel(service)}
                      secondary={healthy ? "Connected" : "Disconnected"}
                    />
                    {healthy ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItem>
                ))}
            </List>

            {/* Force Recovery Button */}
            {!status.isRecovering && status.recoveryPhase !== "complete" && (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Tooltip title="Force session recovery">
                  <IconButton
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onForceRecovery) {
                        onForceRecovery();
                      }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Add spinning animation */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default SessionRecoveryStatus;
