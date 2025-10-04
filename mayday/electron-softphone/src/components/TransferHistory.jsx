import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
} from "@mui/material";
import ContentFrame from "./ContentFrame";
import {
  Search,
  FilterList,
  Refresh,
  Download,
  Delete,
  History,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Schedule,
} from "@mui/icons-material";
import transferHistoryService from "../services/transferHistoryService";
import { useNotification } from "../contexts/NotificationContext";

const TransferHistory = ({ open, onClose }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { showNotification } = useNotification();

  // Load transfer history
  useEffect(() => {
    if (!open) return;

    const loadHistory = () => {
      try {
        const transferHistory = transferHistoryService.getHistory();
        setHistory(transferHistory);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading transfer history:", error);
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [open]);

  // Filter history
  const filteredHistory = useMemo(() => {
    return history.filter((transfer) => {
      // Apply status filter
      if (statusFilter !== "all" && transfer.status !== statusFilter)
        return false;

      // Apply type filter
      if (typeFilter !== "all" && transfer.transferType !== typeFilter)
        return false;

      // Apply date filter
      if (dateFilter !== "all") {
        const transferDate = new Date(transfer.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (
          dateFilter === "today" &&
          transferDate.toDateString() !== today.toDateString()
        )
          return false;
        if (
          dateFilter === "yesterday" &&
          transferDate.toDateString() !== yesterday.toDateString()
        )
          return false;
        if (dateFilter === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (transferDate < weekAgo) return false;
        }
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          transfer.targetExtension?.toLowerCase().includes(query) ||
          transfer.fromExtension?.toLowerCase().includes(query) ||
          transfer.callId?.toLowerCase().includes(query) ||
          transfer.error?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [history, searchQuery, statusFilter, dateFilter, typeFilter]);

  // Get transfer statistics
  const stats = useMemo(() => {
    return transferHistoryService.getTransferStats();
  }, [history]);

  // Get most frequent targets
  const frequentTargets = useMemo(() => {
    return transferHistoryService.getMostFrequentTargets(5);
  }, [history]);

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    const transferHistory = transferHistoryService.getHistory();
    setHistory(transferHistory);
    setIsLoading(false);
    showNotification({
      message: "Transfer history refreshed",
      severity: "success",
      duration: 2000,
    });
  };

  // Handle export
  const handleExport = () => {
    try {
      const exportData = transferHistoryService.exportHistory();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transfer-history-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification({
        message: "Transfer history exported successfully",
        severity: "success",
        duration: 3000,
      });
    } catch (error) {
      showNotification({
        message: "Failed to export transfer history",
        severity: "error",
        duration: 3000,
      });
    }
  };

  // Handle clear history
  const handleClearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all transfer history? This action cannot be undone."
      )
    ) {
      transferHistoryService.clearHistory();
      setHistory([]);
      showNotification({
        message: "Transfer history cleared",
        severity: "success",
        duration: 3000,
      });
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "success":
        return "success";
      case "failed":
      case "rejected":
        return "error";
      case "initiated":
        return "warning";
      default:
        return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "success":
        return <CheckCircle fontSize="small" />;
      case "failed":
      case "rejected":
        return <Cancel fontSize="small" />;
      case "initiated":
        return <Schedule fontSize="small" />;
      default:
        return <History fontSize="small" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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
          <Typography variant="h6">Transfer History</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: "white" }}
            >
              <Refresh />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleExport}
              sx={{ color: "white" }}
            >
              <Download />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleClearHistory}
              color="error"
              sx={{ color: "white" }}
            >
              <Delete />
            </IconButton>
          </Box>
        </Box>
      }
      headerColor="#d32f2f"
    >
      {/* Statistics Cards */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Transfers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" color="success.main">
                  {stats.successful}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successful
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" color="error.main">
                  {stats.failed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" color="warning.main">
                  {stats.successful > 0
                    ? Math.round((stats.successful / stats.total) * 100)
                    : 0}
                  %
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Success Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Search and Filter Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search transfers..."
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
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="initiated">Initiated</MenuItem>
          </Select>
          <Select
            size="small"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="blind">Blind Transfer</MenuItem>
            <MenuItem value="attended">Attended Transfer</MenuItem>
          </Select>
          <Select
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Transfer History Table */}
      <Box sx={{ height: "calc(100% - 300px)", overflow: "auto" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredHistory.length === 0 ? (
          <Box sx={{ textAlign: "center", p: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No transfer history found
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ height: "100%" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Call ID</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.map((transfer) => (
                  <TableRow key={transfer.id} hover>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(transfer.status)}
                        label={transfer.status}
                        size="small"
                        color={getStatusColor(transfer.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transfer.transferType || "blind"}
                        size="small"
                        color={
                          transfer.transferType === "attended"
                            ? "secondary"
                            : "default"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{transfer.fromExtension}</TableCell>
                    <TableCell>{transfer.targetExtension}</TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {transfer.callId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatTimestamp(transfer.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transfer.error && (
                        <Tooltip title={transfer.error}>
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "block",
                            }}
                          >
                            {transfer.error}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </Box>
    </ContentFrame>
  );
};

export default TransferHistory;
