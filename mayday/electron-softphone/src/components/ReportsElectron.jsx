import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tab,
  Tabs,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  CircularProgress,
  Alert,
  Avatar,
  Popover,
  Menu,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  DateRange,
  Download,
  Refresh,
  BarChart,
  PieChart,
  Assessment,
  CalendarMonth,
} from "@mui/icons-material";
import ContentFrame from "./ContentFrame";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { exportReportData } from "../api/reportsApi";
import callHistoryService from "../services/callHistoryService";
import agentService from "../services/agentService";
import { getUserData } from "../services/storageService";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Reports = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState("week");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date picker state
  const [anchorEl, setAnchorEl] = useState(null);
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateError, setDateError] = useState("");

  // State for report data
  const [callVolumeData, setCallVolumeData] = useState([]);
  const [agentPerformanceData, setAgentPerformanceData] = useState([]);
  const [queueDistributionData, setQueueDistributionData] = useState([]);

  // Agents/performance detail
  const [agents, setAgents] = useState([]);
  const [agentListLoading, setAgentListLoading] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgentCalls, setSelectedAgentCalls] = useState([]);
  const [selectedAgentCounts, setSelectedAgentCounts] = useState(null);

  // State for export menu
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const exportMenuOpen = Boolean(exportAnchorEl);

  // Helper: get date range params
  const getDateParams = () => {
    const today = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case "today":
        startDate = today.toISOString().split("T")[0];
        endDate = startDate;
        break;
      case "yesterday":
        {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = yesterday.toISOString().split("T")[0];
          endDate = startDate;
        }
        break;
      case "week":
        {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split("T")[0];
          endDate = today.toISOString().split("T")[0];
        }
        break;
      case "month":
        {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          startDate = monthAgo.toISOString().split("T")[0];
          endDate = today.toISOString().split("T")[0];
        }
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = today.toISOString().split("T")[0];
        endDate = startDate;
    }

    return { startDate, endDate };
  };

  // Helper: filter records by date range
  const isWithinRange = (ts, start, end) => {
    try {
      const d = new Date(ts);
      const s = new Date(start);
      const e = new Date(end);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return d >= s && d <= e;
    } catch (_) {
      return true;
    }
  };

  const buildDatasetsFromCdr = (records, startDate, endDate) => {
    const filtered = records.filter((r) =>
      isWithinRange(r.timestamp, startDate, endDate)
    );

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const volumeByHour = hours.map((h) => ({
      hour: String(h).padStart(2, "0"),
      count: 0,
    }));

    const perfByHour = hours.map((h) => ({
      hour: String(h).padStart(2, "0"),
      answered: 0,
      missed: 0,
    }));

    let answeredTotal = 0;
    let missedTotal = 0;
    let failedTotal = 0;

    filtered.forEach((rec) => {
      const d = new Date(rec.timestamp);
      const h = d.getHours();

      volumeByHour[h].count += 1;

      if (rec.status === "completed") perfByHour[h].answered += 1;
      else if (rec.status === "missed") perfByHour[h].missed += 1;

      if (rec.status === "completed") answeredTotal += 1;
      else if (rec.status === "missed") missedTotal += 1;
      else if (rec.status === "failed") failedTotal += 1;
    });

    const distribution = [
      { name: "Answered", value: answeredTotal },
      { name: "Missed", value: missedTotal },
      { name: "Failed", value: failedTotal },
    ];

    return {
      callVolumeData: volumeByHour,
      agentPerformanceData: perfByHour,
      queueDistributionData: distribution,
    };
  };

  // Fetch all report data via CDR endpoints
  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);

    const { startDate, endDate } = getDateParams();

    try {
      const user = await getUserData();
      const extension = user?.extension || user?.user?.extension || "";

      const historyResp = await callHistoryService.getCallHistory(
        1000,
        null,
        extension
      );
      const records = historyResp?.data?.records || [];

      const { callVolumeData, agentPerformanceData, queueDistributionData } =
        buildDatasetsFromCdr(records, startDate, endDate);

      setCallVolumeData(callVolumeData);
      setAgentPerformanceData(agentPerformanceData);
      setQueueDistributionData(queueDistributionData);
    } catch (err) {
      console.error("Error fetching CDR report data:", err);
      setError("Failed to load report data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      setAgentListLoading(true);
      const list = await agentService.getAllAgents();
      setAgents(Array.isArray(list) ? list : []);
    } catch (e) {
      // ignore
    } finally {
      setAgentListLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [open, dateRange]);

  useEffect(() => {
    if (open && activeTab === 1) {
      loadAgents();
    }
  }, [open, activeTab]);

  const handleRefresh = () => {
    fetchReportData();
    if (activeTab === 1) loadAgents();
  };

  const handleExportMenuOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  const generateCsvFromRecords = (records) => {
    const headers = [
      "id",
      "timestamp",
      "type",
      "status",
      "phoneNumber",
      "duration",
      "billsec",
    ];
    const rows = records.map((r) => [
      r.id,
      new Date(r.timestamp).toISOString(),
      r.type,
      r.status,
      r.phoneNumber,
      r.duration || "",
      r.billsec || 0,
    ]);
    const csv = [headers.join(","), ...rows.map((x) => x.join(","))].join("\n");
    return csv;
  };

  const handleExport = async (reportType) => {
    try {
      setIsLoading(true);
      handleExportMenuClose();
      const { startDate, endDate } = getDateParams();

      if (reportType === "raw-cdr") {
        const user = await getUserData();
        const extension = user?.extension || user?.user?.extension || "";
        const historyResp = await callHistoryService.getCallHistory(
          5000,
          null,
          extension
        );
        const all = historyResp?.data?.records || [];
        const filtered = all.filter((r) =>
          isWithinRange(r.timestamp, startDate, endDate)
        );
        const csv = generateCsvFromRecords(filtered);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `raw-cdr-${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const { startDate: s, endDate: e } = getDateParams();

      if (!reportType) {
        reportType =
          activeTab === 0
            ? "call-volume"
            : activeTab === 1
            ? "agent-performance"
            : "queue-metrics";
      }

      const response = await exportReportData(s, e, reportType);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting report:", err);
      setError("Failed to export report. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDatePicker = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseDatePicker = () => {
    setAnchorEl(null);
  };

  const handleApplyDateRange = () => {
    if (
      !isValidDateFormat(customStartDate) ||
      !isValidDateFormat(customEndDate)
    ) {
      setDateError("Please use YYYY-MM-DD format for dates");
      return;
    }

    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setDateError("Invalid date format");
      return;
    }

    if (endDate < startDate) {
      setDateError("End date must be after start date");
      return;
    }

    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      setDateError("Date range cannot exceed 90 days");
      return;
    }

    setDateRange("custom");
    setDateError("");
    handleCloseDatePicker();
    fetchReportData();
    if (activeTab === 1) loadAgents();
  };

  const isValidDateFormat = (dateString) =>
    /^\d{4}-\d{2}-\d{2}$/.test(dateString);

  const isDatePickerOpen = Boolean(anchorEl);

  const DatePickerPopover = () => (
    <Popover
      open={isDatePickerOpen}
      anchorEl={anchorEl}
      onClose={handleCloseDatePicker}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
      <Box sx={{ p: 2, width: 320 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Select Date Range
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          {dateError && (
            <Grid item xs={12}>
              <Alert severity="warning">{dateError}</Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleApplyDateRange}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Popover>
  );

  const formatTs = (ts) => new Date(ts).toLocaleString();

  const openAgentDetail = async (agent) => {
    try {
      setSelectedAgent(agent);
      setAgentDialogOpen(true);
      setSelectedAgentCounts(null);
      setSelectedAgentCalls([]);
      const { startDate, endDate } = getDateParams();
      const countsResp = await callHistoryService.getCallCountsByExtension(
        agent.extension,
        startDate,
        endDate
      );
      setSelectedAgentCounts(countsResp?.data || null);
      const histResp = await callHistoryService.getCallHistory(
        500,
        null,
        agent.extension
      );
      const calls = (histResp?.data?.records || []).filter((r) =>
        isWithinRange(r.timestamp, startDate, endDate)
      );
      setSelectedAgentCalls(calls);
    } catch (e) {
      // ignore errors in modal load
    }
  };

  const renderCallVolumeReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Call Volume by Hour
          </Typography>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={callVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#1976d2" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Calls:{" "}
            {callVolumeData.reduce((sum, x) => sum + (x.count || 0), 0)}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderAgentPerformance = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Agent Performance (Answered vs Missed)
          </Typography>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={agentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="answered" stroke="#2e7d32" />
                  <Line type="monotone" dataKey="missed" stroke="#d32f2f" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Agents
          </Typography>
          {agentListLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : agents.length === 0 ? (
            <Alert severity="info">No agents found</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Extension</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agents.map((a) => (
                    <TableRow key={a.extension} hover>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.extension}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openAgentDetail(a)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderQueueMetrics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Call Outcome Distribution
          </Typography>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={queueDistributionData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                  >
                    {queueDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Reports</Typography>
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
      headerColor="#2e7d32"
    >
      <Box sx={{ p: 3 }}>
        {/* Controls */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
            alignItems: "center",
          }}
        >
          <TextField
            select
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            sx={{ minWidth: 150 }}
            label="Date Range"
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>

          {dateRange === "custom" && (
            <Button
              variant="outlined"
              startIcon={<DateRange />}
              onClick={handleOpenDatePicker}
              size="small"
            >
              {customStartDate} to {customEndDate}
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportMenuOpen}
            disabled={isLoading}
          >
            Export Report
          </Button>
        </Box>

        {dateRange === "custom" && (
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarMonth fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              Showing data from <strong>{customStartDate}</strong> to{" "}
              <strong>{customEndDate}</strong>
            </Typography>
          </Box>
        )}

        {/* Report Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
        >
          <Tab icon={<BarChart />} label="Call Volume" />
          <Tab icon={<Assessment />} label="Agent Performance" />
          <Tab icon={<PieChart />} label="Queue Metrics" />
        </Tabs>

        {/* Report Content */}
        {activeTab === 0 && renderCallVolumeReport()}
        {activeTab === 1 && renderAgentPerformance()}
        {activeTab === 2 && renderQueueMetrics()}
      </Box>

      {/* Date Picker */}
      <DatePickerPopover />

      {/* Export Menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={exportMenuOpen}
        onClose={handleExportMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem onClick={() => handleExport()}>
          <ListItemText>Current Tab Data</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport("comprehensive-cdr")}>
          <ListItemText
            primary="Comprehensive CDR Report"
            secondary="All call details with metadata"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("detailed-agent-report")}>
          <ListItemText
            primary="Detailed Agent Report"
            secondary="Extended agent metrics"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("call-disposition-report")}>
          <ListItemText
            primary="Call Disposition Analysis"
            secondary="Disposition breakdown"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("hourly-call-pattern")}>
          <ListItemText
            primary="Hourly Call Pattern"
            secondary="24-hour call distribution"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("trunk-usage-report")}>
          <ListItemText
            primary="Trunk Usage Report"
            secondary="Channel utilization stats"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("raw-cdr")}>
          <ListItemText
            primary="Raw Asterisk CDR (CSV)"
            secondary="Filtered by selected date range"
          />
        </MenuItem>
      </Menu>

      {/* Agent Detail Dialog */}
      <Dialog
        open={agentDialogOpen}
        onClose={() => setAgentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAgent
            ? `${selectedAgent.name} (${selectedAgent.extension})`
            : "Agent Details"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedAgentCounts ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total: {selectedAgentCounts.totalCalls} • Answered:{" "}
                {selectedAgentCounts.answeredCalls} • Missed:{" "}
                {selectedAgentCounts.missedCalls} • Avg Duration:{" "}
                {selectedAgentCounts.avgCallDuration}s
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Number</TableCell>
                  <TableCell>Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedAgentCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No calls in selected range
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedAgentCalls.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{formatTs(c.timestamp)}</TableCell>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell>{c.phoneNumber}</TableCell>
                      <TableCell>{c.duration || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ContentFrame>
  );
};

export default Reports;
