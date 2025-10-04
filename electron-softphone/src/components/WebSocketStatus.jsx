import React, { useState, useEffect } from "react";
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  LinearProgress,
  Collapse,
  Alert,
} from "@mui/material";
import {
  Wifi,
  WifiOff,
  Refresh,
  Warning,
  CheckCircle,
  Error,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { useWebSocket } from "../hooks/useWebSocket";

const WebSocketStatus = ({ showDetails = false, onReconnect }) => {
  const {
    isConnected,
    isReconnecting,
    status,
    healthScore,
    lastError,
    forceReconnect,
  } = useWebSocket();

  const [expanded, setExpanded] = useState(showDetails);
  const [showAlert, setShowAlert] = useState(false);

  // Show alert for errors
  useEffect(() => {
    if (lastError) {
      setShowAlert(true);
      const timer = setTimeout(() => setShowAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);

  // Handle manual reconnection
  const handleReconnect = async () => {
    if (onReconnect) {
      onReconnect();
    } else {
      await forceReconnect();
    }
  };

  // Get status color based on health score
  const getStatusColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "error";
  };

  // Get status icon
  const getStatusIcon = () => {
    if (isReconnecting)
      return <Refresh sx={{ animation: "spin 1s linear infinite" }} />;
    if (isConnected) return <Wifi />;
    return <WifiOff />;
  };

  // Get status text
  const getStatusText = () => {
    if (isReconnecting) return "Reconnecting...";
    if (isConnected) return "Connected";
    return "Disconnected";
  };

  // Get health text
  const getHealthText = () => {
    if (healthScore >= 80) return "Excellent";
    if (healthScore >= 60) return "Good";
    if (healthScore >= 40) return "Fair";
    if (healthScore >= 20) return "Poor";
    return "Critical";
  };

  // Format next attempt time
  const formatNextAttempt = () => {
    if (!status.nextAttempt) return "N/A";
    const now = new Date();
    const next = new Date(status.nextAttempt);
    const diff = Math.max(0, Math.ceil((next - now) / 1000));
    return diff > 0 ? `${diff}s` : "Now";
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Error Alert */}
      <Collapse in={showAlert}>
        <Alert
          severity="error"
          sx={{ mb: 1 }}
          onClose={() => setShowAlert(false)}
        >
          {lastError}
        </Alert>
      </Collapse>

      {/* Main Status Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          borderRadius: 1,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
        }}
      >
        {/* Status Icon */}
        <Box sx={{ color: getStatusColor(healthScore) }}>{getStatusIcon()}</Box>

        {/* Status Text */}
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          {getStatusText()}
        </Typography>

        {/* Health Score */}
        <Chip
          label={`${healthScore}%`}
          size="small"
          color={getStatusColor(healthScore)}
          variant="outlined"
        />

        {/* Expand/Collapse Button */}
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>

        {/* Reconnect Button */}
        <Tooltip title="Force Reconnection">
          <IconButton
            size="small"
            onClick={handleReconnect}
            disabled={isReconnecting}
            color="primary"
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Detailed Status */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1, p: 1, bgcolor: "background.paper", borderRadius: 1 }}>
          {/* Health Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="caption">Connection Health</Typography>
              <Typography variant="caption">{getHealthText()}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={healthScore}
              color={getStatusColor(healthScore)}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Status Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Connection State
              </Typography>
              <Typography variant="body2">
                {status.readyState === 0
                  ? "Connecting"
                  : status.readyState === 1
                  ? "Open"
                  : status.readyState === 2
                  ? "Closing"
                  : status.readyState === 3
                  ? "Closed"
                  : "Unknown"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Reconnect Attempts
              </Typography>
              <Typography variant="body2">
                {status.reconnectAttempts} / {status.consecutiveFailures}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Connection Quality
              </Typography>
              <Typography variant="body2">
                {status.connectionQuality || "Unknown"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Next Attempt
              </Typography>
              <Typography variant="body2">{formatNextAttempt()}</Typography>
            </Box>
          </Box>

          {/* Last Error */}
          {status.lastError && (
            <Box sx={{ mt: 1, p: 1, bgcolor: "error.light", borderRadius: 1 }}>
              <Typography variant="caption" color="error.contrastText">
                Last Error: {status.lastError}
              </Typography>
            </Box>
          )}

          {/* Timestamps */}
          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Last Heartbeat
              </Typography>
              <Typography variant="body2">
                {status.lastHeartbeat
                  ? new Date(status.lastHeartbeat).toLocaleTimeString()
                  : "Never"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Last Health Check
              </Typography>
              <Typography variant="body2">
                {status.lastHealthCheck
                  ? new Date(status.lastHealthCheck).toLocaleTimeString()
                  : "Never"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default WebSocketStatus;
