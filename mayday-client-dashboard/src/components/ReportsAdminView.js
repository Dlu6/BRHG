import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCallVolume,
  fetchPerformanceMetrics,
  fetchQueueDistribution,
  fetchSLACompliance,
  downloadReport,
  clearReports,
  fetchAgentCallDetails,
} from "../features/reports/reportsSlice";
import apiClient from "../api/apiClient";
import IntegrationSetupModal from "./IntegrationSetupModal";
import IntegrationManagement from "./IntegrationManagement";
import {
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Tabs,
  Tab,
  Box,
  Alert,
  Chip,
  CircularProgress,
  Button,
  LinearProgress,
  Paper,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Phone,
  People,
  BarChart as BarChartIcon,
  Download,
  PieChart as PieChartIcon,
  Visibility,
  Close,
  Call,
  CallEnd,
  PhoneDisabled,
  Refresh,
  Preview,
} from "@mui/icons-material";
import LoadingIndicator from "./common/LoadingIndicator";
import { format } from "date-fns";

const Reports = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    callVolume,
    performance,
    queueDistribution,
    slaCompliance,
    loading,
    error,
    downloadProgress,
    isDownloading,
    agentCallDetails,
    agentCallDetailsLoading,
  } = useSelector((state) => state.reports);
  const [dateRange, setDateRange] = useState({
    startDate: new Date("2025-07-29"), // Match the actual data range
    endDate: new Date("2025-08-07"), // Match the actual data range
  });
  const [selectedView, setSelectedView] = useState("volume");
  const [agentDetailsModalOpen, setAgentDetailsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [integrationSetupModalOpen, setIntegrationSetupModalOpen] =
    useState(false);
  const [showIntegrationManagement, setShowIntegrationManagement] =
    useState(false);
  const [downloadOptionsModalOpen, setDownloadOptionsModalOpen] =
    useState(false);
  const [selectedReportType, setSelectedReportType] = useState("comprehensive");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [callFilters, setCallFilters] = useState({
    callType: "all",
    status: "all",
    search: "",
    sortBy: "timestamp",
    sortOrder: "desc",
    dateRange: {
      startDate: new Date("2025-07-29"),
      endDate: new Date("2025-08-07"),
    },
  });

  // Zoho Integration State
  const [zohoData, setZohoData] = useState({
    leads: [],
    contacts: [],
    deals: [],
    loading: false,
    error: null,
  });
  const [zohoIntegration, setZohoIntegration] = useState(null);
  const [zohoSyncStatus, setZohoSyncStatus] = useState({
    lastSync: null,
    syncInProgress: false,
    error: null,
  });
  const [zohoTab, setZohoTab] = useState(0);

  // Data availability fetched from backend CDR aggregate
  const [dataAvailabilityInfo, setDataAvailabilityInfo] = useState({
    availableStartDate: null,
    availableEndDate: null,
    totalRecords: 0,
    lastUpdated: null,
  });

  const loadAvailability = useCallback(async () => {
    try {
      const res = await apiClient.get(`/users/reports/availability`);
      const d = res.data || {};
      setDataAvailabilityInfo({
        availableStartDate: d.availableStartDate
          ? new Date(d.availableStartDate)
          : null,
        availableEndDate: d.availableEndDate
          ? new Date(d.availableEndDate)
          : null,
        totalRecords: d.totalRecords || 0,
        lastUpdated: d.lastUpdated ? new Date(d.lastUpdated) : null,
      });
    } catch (e) {
      // Non-blocking if availability fails
      setDataAvailabilityInfo((prev) => prev);
    }
  }, []);

  // Production-grade data refresh
  const [dataRefreshTime, setDataRefreshTime] = useState(new Date());

  const refreshDataAvailability = useCallback(async () => {
    try {
      await loadAvailability();
      setDataRefreshTime(new Date());
    } catch (error) {
      // ignore
    }
  }, [loadAvailability]);

  const handlePreviewReport = async () => {
    const dateStatus = getDateRangeStatus();
    if (!dateStatus.valid) {
      console.warn("Preview blocked:", dateStatus.message);
      return;
    }

    setPreviewLoading(true);
    setPreviewModalOpen(true);

    try {
      const response = await apiClient.get(`/users/reports/preview`, {
        params: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          reportType: selectedReportType,
        },
        headers: {
          "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
        },
      });

      const result = response.data;
      setPreviewData({
        ...result.data,
        summary: result.summary,
        totalRecords: result.totalRecords,
        previewRecords: result.previewRecords,
      });
    } catch (error) {
      setPreviewData({
        error: error?.response?.data?.message || "Failed to load preview data",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const isDateRangeValid = useCallback(() => {
    const now = new Date();
    // Normalize to end of today to avoid timezone edge cases
    now.setHours(23, 59, 59, 999);
    return (
      dateRange.startDate &&
      dateRange.endDate &&
      dateRange.endDate > dateRange.startDate &&
      dateRange.endDate <= now &&
      dateRange.startDate <= now
    );
  }, [dateRange]);

  const isDateRangeInDataRange = useCallback(() => {
    if (
      !dataAvailabilityInfo.availableStartDate ||
      !dataAvailabilityInfo.availableEndDate
    ) {
      return true;
    }
    return (
      dateRange.startDate >= dataAvailabilityInfo.availableStartDate &&
      dateRange.endDate <= dataAvailabilityInfo.availableEndDate
    );
  }, [dateRange, dataAvailabilityInfo]);

  const getDateRangeStatus = useCallback(() => {
    if (!isDateRangeValid()) {
      return { valid: false, message: "Invalid date range", severity: "error" };
    }
    // If availability is known and selection is outside, show a gentle notice on the button only
    if (
      dataAvailabilityInfo.availableStartDate &&
      dataAvailabilityInfo.availableEndDate &&
      !isDateRangeInDataRange()
    ) {
      return {
        valid: true,
        message: "Date range selected",
        severity: "info",
      };
    }
    return { valid: true, message: "Date range selected", severity: "success" };
  }, [isDateRangeValid, isDateRangeInDataRange, dataAvailabilityInfo]);

  const getButtonText = () => {
    if (isDownloading) return `Downloading ${downloadProgress}%`;

    const dateStatus = getDateRangeStatus();
    if (!dateStatus.valid) {
      return dateStatus.severity === "error"
        ? "Invalid Date Range"
        : "Date Range Outside Data";
    }

    if (!dateRange.startDate || !dateRange.endDate) return "Select Date Range";
    if (dateRange.endDate > new Date()) return "Future Dates Not Allowed";
    if (dateRange.endDate <= dateRange.startDate) return "Invalid Date Range";

    // Calculate the difference in days
    const diffTime = Math.abs(dateRange.endDate - dateRange.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Return appropriate text based on the range
    if (diffDays === 7) return "Download Weekly Report";
    if (diffDays === 30 || diffDays === 31) return "Download Monthly Report";
    return `Download ${diffDays}-Day Report`;
  };

  useEffect(() => {
    // Load availability once
    loadAvailability();
    if (!isDateRangeValid()) return;

    const params = {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    };

    switch (selectedView) {
      case "volume":
        dispatch(fetchCallVolume(params));
        break;
      case "performance":
        dispatch(fetchPerformanceMetrics(params));
        break;
      case "queues":
        dispatch(fetchQueueDistribution(params));
        dispatch(fetchSLACompliance(params));
        break;
      case "datatool":
        // Third-Party Integrations tab uses static UI, no API calls needed
        // dispatch(fetchDataToolMetrics(params));
        // dispatch(fetchDataToolAllTimeMetrics());
        break;
      default:
        break;
    }
  }, [dispatch, dateRange, selectedView, isDateRangeValid, loadAvailability]);

  // Zoho Integration Functions
  // Define helpers before using them in callbacks to satisfy lints
  const fetchZohoData = useCallback(async (integrationId) => {
    setZohoData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get(
        `/integrations/${integrationId}/data`,
        {
          headers: {
            "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
          },
        }
      );

      if (response.status === 200) {
        const data = response.data;
        setZohoData({
          leads: data.filter((item) => item.dataType === "leads"),
          contacts: data.filter((item) => item.dataType === "contacts"),
          deals: data.filter((item) => item.dataType === "deals"),
          loading: false,
          error: null,
        });
      } else {
        throw new Error("Failed to fetch Zoho data");
      }
    } catch (error) {
      setZohoData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  const fetchZohoSyncStatus = useCallback(async (integrationId) => {
    try {
      const response = await apiClient.get(`/integrations/${integrationId}`, {
        headers: {
          "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
        },
      });

      if (response.status === 200) {
        const integration = response.data;
        setZohoSyncStatus({
          lastSync: integration.lastSync,
          syncInProgress: false,
          error: integration.errorMessage,
        });
      }
    } catch (error) {
      console.error("Failed to fetch Zoho sync status:", error);
    }
  }, []);

  const fetchZohoIntegration = useCallback(async () => {
    try {
      const response = await apiClient.get("/integrations?type=zoho", {
        headers: {
          "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
        },
      });

      if (response.status === 200) {
        const integrations = response.data.data;
        const zohoIntegration = integrations.find(
          (integration) =>
            integration.type === "zoho" && integration.status === "active"
        );
        setZohoIntegration(zohoIntegration);

        if (zohoIntegration) {
          await fetchZohoData(zohoIntegration.id);
          await fetchZohoSyncStatus(zohoIntegration.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch Zoho integration:", error);
    }
  }, [fetchZohoData, fetchZohoSyncStatus]);

  const syncZohoData = useCallback(
    async (integrationId) => {
      setZohoSyncStatus((prev) => ({
        ...prev,
        syncInProgress: true,
        error: null,
      }));

      try {
        const response = await apiClient.post(
          `/integrations/${integrationId}/sync`,
          {},
          {
            headers: {
              "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
            },
            timeout: 300000,
          }
        );

        if (response.status === 200) {
          await fetchZohoData(integrationId);
          await fetchZohoSyncStatus(integrationId);
        } else {
          throw new Error("Failed to sync Zoho data");
        }
      } catch (error) {
        setZohoSyncStatus((prev) => ({
          ...prev,
          syncInProgress: false,
          error: error.message,
        }));
      }
    },
    [fetchZohoData, fetchZohoSyncStatus]
  );

  // Load Zoho integration data when datatool tab is selected
  useEffect(() => {
    if (selectedView === "datatool") {
      fetchZohoIntegration();
    }
  }, [selectedView, fetchZohoIntegration]);

  const handleDownload = async () => {
    const dateStatus = getDateRangeStatus();
    if (!dateStatus.valid) {
      console.warn("Download blocked:", dateStatus.message);
      return;
    }

    try {
      // The download is now handled directly in the thunk
      await dispatch(
        downloadReport({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          type: selectedReportType,
        })
      ).unwrap();

      // Clear any errors on successful download
      if (error) {
        dispatch(clearReports());
      }

      // No need to handle the blob here anymore as it's done in the thunk
    } catch (error) {
      console.error("Download failed:", error);
      // Don't re-throw the error to prevent React rendering issues
      // The error will be handled by the Redux slice
    }
  };

  const handleDownloadWithOptions = () => {
    const dateStatus = getDateRangeStatus();
    if (!dateStatus.valid) {
      console.warn("Download modal blocked:", dateStatus.message);
      return;
    }

    // Clear any previous errors when opening the download modal
    if (error) {
      dispatch(clearReports());
    }
    setDownloadOptionsModalOpen(true);
  };

  const handleAgentDetailsClick = async (agent) => {
    setSelectedAgent(agent);
    setAgentDetailsModalOpen(true);

    // Reset filters to current date range when opening modal
    setCallFilters({
      callType: "all",
      status: "all",
      search: "",
      sortBy: "timestamp",
      sortOrder: "desc",
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    });

    try {
      await dispatch(
        fetchAgentCallDetails({
          agentName: agent.name,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          limit: 100,
        })
      ).unwrap();
    } catch (error) {
      console.error("Failed to fetch agent call details:", error);
    }
  };

  const handleCloseAgentDetailsModal = () => {
    setAgentDetailsModalOpen(false);
    setSelectedAgent(null);
    // Reset filters when closing modal
    setCallFilters({
      callType: "all",
      status: "all",
      search: "",
      sortBy: "timestamp",
      sortOrder: "desc",
      dateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      },
    });
  };

  const handleFilterChange = (filterType, value) => {
    setCallFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleFilterDateRangeChange = (dateType, date) => {
    setCallFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [dateType]: date,
      },
    }));
  };

  const applyFilters = async () => {
    if (!selectedAgent) return;

    try {
      await dispatch(
        fetchAgentCallDetails({
          agentName: selectedAgent.name,
          startDate: callFilters.dateRange.startDate.toISOString(),
          endDate: callFilters.dateRange.endDate.toISOString(),
          limit: 100,
        })
      ).unwrap();
    } catch (error) {
      console.error("Failed to fetch filtered agent call details:", error);
    }
  };

  const clearFilters = () => {
    setCallFilters({
      callType: "all",
      status: "all",
      search: "",
      sortBy: "timestamp",
      sortOrder: "desc",
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    });
  };

  const getFilteredCalls = () => {
    if (!agentCallDetails?.calls) return [];

    let filteredCalls = agentCallDetails.calls.filter((call) => {
      // Filter by call type
      if (
        callFilters.callType !== "all" &&
        call.type !== callFilters.callType
      ) {
        return false;
      }

      // Filter by status
      if (callFilters.status !== "all" && call.status !== callFilters.status) {
        return false;
      }

      // Filter by search term
      if (callFilters.search) {
        const searchTerm = callFilters.search.toLowerCase();
        const phoneNumber = (call.phoneNumber || "").toLowerCase();
        const callerName = (call.name || "").toLowerCase();
        const calledNumber = (call.calledNumber || "").toLowerCase();

        if (
          !phoneNumber.includes(searchTerm) &&
          !callerName.includes(searchTerm) &&
          !calledNumber.includes(searchTerm)
        ) {
          return false;
        }
      }

      return true;
    });

    // Sort the filtered calls
    filteredCalls.sort((a, b) => {
      let aValue, bValue;

      switch (callFilters.sortBy) {
        case "timestamp":
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case "duration":
          aValue = parseInt(a.duration?.replace(":", "") || "0");
          bValue = parseInt(b.duration?.replace(":", "") || "0");
          break;
        case "phoneNumber":
          aValue = a.phoneNumber || "";
          bValue = b.phoneNumber || "";
          break;
        case "calledNumber":
          aValue = a.calledNumber || "";
          bValue = b.calledNumber || "";
          break;
        case "type":
          aValue = a.type || "";
          bValue = b.type || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        default:
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
      }

      if (callFilters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredCalls;
  };

  // Updated styles for the main container
  const containerStyles = {
    p: 4,
    backgroundColor: theme.palette.background.default,
    minHeight: "100vh",
  };

  // Updated card styles
  const cardStyles = {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 2,
    boxShadow: theme.shadows[3],
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: theme.shadows[6],
    },
  };

  // COLORS for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const renderCallVolumeChart = () => {
    // Format data for the chart if needed
    const formattedData = callVolume.map((item) => ({
      date: item.date,
      inbound: item.inbound || 0,
      outbound: item.outbound || 0,
      abandoned: item.abandoned || 0,
    }));

    return (
      <Card sx={cardStyles}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Phone fontSize="small" color="primary" />
              <Typography variant="h6" color="primary">
                Call Volume Trends
              </Typography>
            </Box>
          }
        />
        <CardContent>
          {loading ? (
            // <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            //   <CircularProgress />
            // </Box>
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography>Loading Analytics...</Typography>
              <LoadingIndicator />
            </Box>
          ) : formattedData.length === 0 ? (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography color="textSecondary">No data available</Typography>
            </Box>
          ) : (
            <Paper elevation={0} sx={{ p: 2, backgroundColor: "transparent" }}>
              <ResponsiveContainer height={400}>
                <LineChart data={formattedData}>
                  <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inbound"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Inbound Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound"
                    stroke={theme.palette.success.main}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Outbound Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="abandoned"
                    stroke={theme.palette.error.main}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Abandoned Calls"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceMetrics = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          {/* <CircularProgress /> */}
          <LoadingIndicator />
        </Box>
      ) : performance?.length === 0 ? (
        <Box sx={{ textAlign: "center", p: 4 }}>
          <Typography color="textSecondary">No agent data available</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: theme.shadows[3] }}>
          <Table>
            <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Agent Name
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Total Calls
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Avg Handle Time
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Satisfaction
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performance.map((agent, index) => (
                <TableRow
                  key={index}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.action.selected,
                    },
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <People color="primary" fontSize="small" />
                      <Typography>{agent.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={agent.calls}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell align="center">{agent.avgHandleTime}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${agent.satisfaction}%`}
                      color={
                        agent.satisfaction > 90
                          ? "success"
                          : agent.satisfaction > 80
                          ? "info"
                          : "warning"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleAgentDetailsClick(agent)}
                      sx={{ minWidth: "auto" }}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderQueueMetrics = () => (
    <Grid container spacing={3}>
      {/* Queue Distribution Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyles}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <PieChartIcon fontSize="small" color="primary" />
                <Typography variant="h6" color="primary">
                  Queue Distribution
                </Typography>
              </Box>
            }
          />
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                {/* <CircularProgress /> */}
                <LoadingIndicator />
              </Box>
            ) : queueDistribution?.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4 }}>
                <Typography color="textSecondary">
                  No queue data available
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={queueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {queueDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} calls`, "Volume"]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* SLA Compliance Bar Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyles}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <BarChartIcon fontSize="small" color="primary" />
                <Typography variant="h6" color="primary">
                  SLA Compliance by Hour
                </Typography>
              </Box>
            }
          />
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                {/* <CircularProgress /> */}
                <LoadingIndicator />
              </Box>
            ) : slaCompliance?.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4 }}>
                <Typography color="textSecondary">
                  No SLA data available
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={slaCompliance}>
                  <XAxis dataKey="hour" />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "SLA Compliance"]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Bar
                    dataKey="percentage"
                    fill={theme.palette.primary.main}
                    name="SLA Compliance"
                  >
                    {slaCompliance.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.percentage >= 90
                            ? theme.palette.success.main
                            : entry.percentage >= 80
                            ? theme.palette.warning.main
                            : theme.palette.error.main
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDataToolMetrics = () => {
    // Third-Party Integrations tab uses static UI, no loading states needed

    // Show integration management if requested
    if (showIntegrationManagement) {
      return (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setShowIntegrationManagement(false)}
            >
              ← Back to Overview
            </Button>
            <Button
              variant="contained"
              startIcon={<BarChartIcon />}
              onClick={() => setIntegrationSetupModalOpen(true)}
            >
              Add New Integration
            </Button>
          </Box>
          <IntegrationManagement />
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Helpers for Zoho table rendering (mirror ZohoIntegration.jsx) */}
        {(() => {
          // define once per render without re-creating functions inside many cells
          if (!window.__reachmiZohoHelpers) {
            window.__reachmiZohoHelpers = {
              getZohoRecordData: (item) => {
                let d = item?.data;
                if (typeof d === "string") {
                  try {
                    d = JSON.parse(d);
                  } catch (_) {
                    d = {};
                  }
                }
                return d || {};
              },
              getAccountName: (value, fallback = "N/A") => {
                if (!value) return fallback;
                if (typeof value === "object") return value?.name || fallback;
                return value;
              },
            };
          }
          return null;
        })()}
        {/* Integration Management Header */}
        <Card sx={cardStyles}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <BarChartIcon fontSize="small" color="primary" />
                <Typography variant="h6" color="primary">
                  Third-Party Integrations
                </Typography>
              </Box>
            }
            subheader="Connect and manage external data sources like Zoho CRM, Salesforce, HubSpot, and custom APIs"
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Integrate with external systems to import and analyze data
              alongside your call center metrics. Supported integrations include
              CRM systems, databases, and custom APIs.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "primary.light",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    0
                  </Typography>
                  <Typography variant="body2">Active Integrations</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "success.light",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    0
                  </Typography>
                  <Typography variant="body2">Synced Records</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "info.light",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    5
                  </Typography>
                  <Typography variant="body2">Available Templates</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "warning.light",
                    color: "white",
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    0
                  </Typography>
                  <Typography variant="body2">Pending Syncs</Typography>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Integration Setup Guide */}
        <Card sx={cardStyles}>
          <CardHeader title="Getting Started with Integrations" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              To get started with third-party integrations:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  1
                </Box>
                <Typography variant="body2">
                  <strong>Choose an Integration Type:</strong> Select from Zoho
                  CRM, Salesforce, HubSpot, Custom API, or External Database
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  2
                </Box>
                <Typography variant="body2">
                  <strong>Configure Connection:</strong> Enter API credentials,
                  endpoints, and authentication details
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  3
                </Box>
                <Typography variant="body2">
                  <strong>Test Connection:</strong> Verify that the integration
                  can successfully connect to the external system
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  4
                </Box>
                <Typography variant="body2">
                  <strong>Sync Data:</strong> Import data from the external
                  system and view integrated metrics
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<BarChartIcon />}
                onClick={() => setIntegrationSetupModalOpen(true)}
              >
                Setup New Integration
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setShowIntegrationManagement(true)}
              >
                Manage Integrations
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  // TODO: Open integration documentation
                  window.open("https://maydaycrm.com/wiki", "_blank");
                }}
              >
                View Documentation
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Available Integration Types */}
        <Card sx={cardStyles}>
          <CardHeader title="Available Integration Types" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    p: 2,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="h6">Zoho CRM</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Import leads, contacts, and deals from Zoho CRM. Sync call
                    data with customer records.
                  </Typography>
                  <Chip
                    label="CRM Integration"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    p: 2,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="h6">Salesforce</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Connect with Salesforce CRM to sync opportunities, accounts,
                    and contact information.
                  </Typography>
                  <Chip
                    label="CRM Integration"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    p: 2,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="h6">HubSpot</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Import contacts, companies, and deals from HubSpot CRM and
                    marketing platform.
                  </Typography>
                  <Chip
                    label="CRM Integration"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    p: 2,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="h6">Custom API</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Connect to any REST API endpoint to import custom data and
                    metrics.
                  </Typography>
                  <Chip
                    label="API Integration"
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    p: 2,
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="h6">External Database</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Connect directly to external databases (MySQL, PostgreSQL,
                    SQLite) for data import.
                  </Typography>
                  <Chip
                    label="Database Integration"
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Zoho Integration Status */}
        {zohoIntegration ? (
          <Card sx={cardStyles}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "success.main",
                    }}
                  />
                  <Typography variant="h6">Zoho CRM Integration</Typography>
                </Box>
              }
              subheader={`Connected to ${zohoIntegration.name}`}
              action={
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => syncZohoData(zohoIntegration.id)}
                  disabled={zohoSyncStatus.syncInProgress}
                  startIcon={
                    zohoSyncStatus.syncInProgress ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Refresh />
                    )
                  }
                >
                  {zohoSyncStatus.syncInProgress ? "Syncing..." : "Sync Now"}
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      {zohoData.leads.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leads
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="success.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      {zohoData.contacts.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contacts
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="info.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      {zohoData.deals.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Deals
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {zohoSyncStatus.lastSync && (
                <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Sync:</strong>{" "}
                    {new Date(zohoSyncStatus.lastSync).toLocaleString()}
                  </Typography>
                </Box>
              )}

              {zohoSyncStatus.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Sync Error:</strong> {zohoSyncStatus.error}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card sx={cardStyles}>
            <CardHeader
              title="Integration Status"
              subheader="Monitor the health and sync status of your integrations"
            />
            <CardContent>
              <Box sx={{ textAlign: "center", p: 4 }}>
                <Typography color="textSecondary">
                  No integrations configured yet. Setup your first integration
                  to start importing external data.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Zoho Data Display */}
        {zohoIntegration &&
          (zohoData.leads.length > 0 ||
          zohoData.contacts.length > 0 ||
          zohoData.deals.length > 0 ? (
            <Card sx={cardStyles}>
              <CardHeader
                title="Zoho CRM Data"
                subheader="Recent leads, contacts, and deals from your Zoho CRM"
              />
              <CardContent>
                <Tabs
                  value={zohoTab}
                  onChange={(_, v) => setZohoTab(v)}
                  sx={{ mb: 2 }}
                >
                  <Tab label={`Leads (${zohoData.leads.length})`} />
                  <Tab label={`Contacts (${zohoData.contacts.length})`} />
                  <Tab label={`Deals (${zohoData.deals.length})`} />
                </Tabs>

                {/* Leads Table */}
                {zohoTab === 0 && zohoData.leads.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {zohoData.leads.slice(0, 10).map((lead, index) => {
                          const d =
                            window.__reachmiZohoHelpers.getZohoRecordData(lead);
                          return (
                            <TableRow key={index}>
                              <TableCell>{index + 1}.</TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Full_Name ||
                                    d.Lead_Name ||
                                    d.name ||
                                    "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Email || d.email || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Phone || d.phone || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Company || d.company || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={d.Lead_Status || d.status || "New"}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Contacts Table */}
                {zohoTab === 1 && zohoData.contacts.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Account</TableCell>
                          <TableCell>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {zohoData.contacts.slice(0, 10).map((c, index) => {
                          const d =
                            window.__reachmiZohoHelpers.getZohoRecordData(c);
                          return (
                            <TableRow key={index}>
                              <TableCell>{index + 1}.</TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Full_Name || d.name || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Email || d.email || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Phone || d.phone || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {window.__reachmiZohoHelpers.getAccountName(
                                    d.Account_Name || d.account,
                                    "N/A"
                                  )}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Lead_Source || d.source || "N/A"}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Deals Table */}
                {zohoTab === 2 && zohoData.deals.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Deal Name</TableCell>
                          <TableCell>Account</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Stage</TableCell>
                          <TableCell>Closing Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {zohoData.deals.slice(0, 10).map((row, index) => {
                          const d =
                            window.__reachmiZohoHelpers.getZohoRecordData(row);
                          return (
                            <TableRow key={index}>
                              <TableCell>{index + 1}.</TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Deal_Name || d.name || "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {window.__reachmiZohoHelpers.getAccountName(
                                    d.Account_Name || d.account,
                                    "N/A"
                                  )}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Amount ?? "N/A"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={d.Stage || "N/A"}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {d.Closing_Date || "N/A"}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {(zohoTab === 0 && zohoData.leads.length === 0) ||
                (zohoTab === 1 && zohoData.contacts.length === 0) ||
                (zohoTab === 2 && zohoData.deals.length === 0) ? (
                  <Box sx={{ textAlign: "center", p: 4 }}>
                    <Typography color="textSecondary">
                      No data available for this category. Click "Sync Now" to
                      import from Zoho CRM.
                    </Typography>
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          ) : null)}
      </Box>
    );
  };

  const renderDownloadButton = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Button
        variant="contained"
        startIcon={
          isDownloading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <Download />
          )
        }
        onClick={handleDownloadWithOptions}
        disabled={isDownloading || !isDateRangeValid()}
        title={getButtonText()}
      >
        {getButtonText()}
      </Button>
      {isDownloading && (
        <LinearProgress
          variant="determinate"
          value={downloadProgress}
          sx={{ width: 100 }}
        />
      )}
    </Box>
  );

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Alert severity="error" sx={{ width: "100%" }}>
          {typeof error === "object" && error.message
            ? error.message
            : String(error)}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={containerStyles}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                backgroundColor: theme.palette.primary.main,
                borderRadius: 2,
                p: 2,
                display: "inline-block",
                boxShadow: `0 4px 14px ${theme.palette.primary.main}40`,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600,
                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                Call Reports Dashboard
              </Typography>
            </Box>
          </Grid>

          {/* Data Availability Status */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  📊 Data Available: {dataAvailabilityInfo.totalRecords} records
                </Typography>
                <IconButton
                  size="small"
                  onClick={refreshDataAvailability}
                  sx={{ p: 0.5 }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                📅 Range:{" "}
                {dataAvailabilityInfo.availableStartDate &&
                dataAvailabilityInfo.availableEndDate
                  ? `${format(
                      dataAvailabilityInfo.availableStartDate,
                      "MMM dd"
                    )} - ${format(
                      dataAvailabilityInfo.availableEndDate,
                      "MMM dd, yyyy"
                    )}`
                  : "Unknown"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🔄 Last Updated: {format(dataRefreshTime, "MMM dd, HH:mm")}
              </Typography>
            </Box>
          </Grid>

          <Grid
            item
            xs={12}
            md={4}
            sx={{
              marginLeft: "auto",
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(date) =>
                    setDateRange((prev) => {
                      if (!date) return prev;
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      const clamped = date > today ? today : date;
                      // Ensure endDate is not before startDate
                      const endDate =
                        prev.endDate && prev.endDate < clamped
                          ? clamped
                          : prev.endDate;
                      return { ...prev, startDate: clamped, endDate };
                    })
                  }
                  maxDate={new Date()}
                  disableFuture
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      helperText: "Past dates only",
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(date) =>
                    setDateRange((prev) => {
                      if (!date) return prev;
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      const clamped = date > today ? today : date;
                      // Ensure endDate is not before startDate
                      const startDate =
                        prev.startDate && clamped < prev.startDate
                          ? prev.startDate
                          : prev.startDate;
                      return { ...prev, endDate: clamped, startDate };
                    })
                  }
                  maxDate={new Date()}
                  minDate={dateRange.startDate}
                  disableFuture
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      helperText: "Must be after start date",
                    },
                  }}
                />
              </Box>

              {/* Date Range Status */}
              <Box sx={{ mt: 1 }}>
                {(() => {
                  const status = getDateRangeStatus();
                  return (
                    <Alert
                      severity={status.severity}
                      sx={{
                        py: 0.5,
                        px: 1,
                        fontSize: "0.75rem",
                        "& .MuiAlert-message": { py: 0.5 },
                      }}
                    >
                      {status.message}
                    </Alert>
                  );
                })()}
              </Box>
            </LocalizationProvider>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              {renderDownloadButton()}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Tabs
        value={selectedView}
        onChange={(_, value) => setSelectedView(value)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            minHeight: 64,
            fontSize: "1rem",
          },
        }}
      >
        <Tab icon={<Phone />} label="Call Volume" value="volume" />
        <Tab icon={<People />} label="Agent Performance" value="performance" />
        <Tab icon={<PieChartIcon />} label="Queue Metrics" value="queues" />
        <Tab
          icon={<BarChartIcon />}
          label="Third-Party Integrations"
          value="datatool"
        />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {selectedView === "volume" && renderCallVolumeChart()}
        {selectedView === "performance" && renderPerformanceMetrics()}
        {selectedView === "queues" && renderQueueMetrics()}
        {selectedView === "datatool" && renderDataToolMetrics()}
      </Box>

      {/* Agent Details Modal */}
      <Dialog
        open={agentDetailsModalOpen}
        onClose={handleCloseAgentDetailsModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <People color="primary" />
              <Typography variant="h6">
                {selectedAgent?.name} - Call Details
              </Typography>
            </Box>
            <IconButton onClick={handleCloseAgentDetailsModal}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3 }}>
          {agentCallDetailsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <LoadingIndicator />
            </Box>
          ) : agentCallDetails ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Summary Cards */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      {agentCallDetails.summary.totalCalls}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Calls
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="success.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      {agentCallDetails.summary.answeredCalls}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Answered Calls
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="warning.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      {agentCallDetails.summary.missedCalls}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Missed Calls
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      color="info.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      {agentCallDetails.summary.answerRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Answer Rate
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Filter Controls */}
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Filter Call History
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Call Type</InputLabel>
                      <Select
                        value={callFilters.callType}
                        label="Call Type"
                        onChange={(e) =>
                          handleFilterChange("callType", e.target.value)
                        }
                      >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="inbound">Inbound</MenuItem>
                        <MenuItem value="outbound">Outbound</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Call Status</InputLabel>
                      <Select
                        value={callFilters.status}
                        label="Call Status"
                        onChange={(e) =>
                          handleFilterChange("status", e.target.value)
                        }
                      >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="missed">Missed</MenuItem>
                        <MenuItem value="failed">Failed</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Search Phone/Name"
                      value={callFilters.search}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      placeholder="Search by phone number, name, or dialed number..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Start Date"
                        value={callFilters.dateRange.startDate}
                        onChange={(date) =>
                          handleFilterDateRangeChange("startDate", date)
                        }
                        maxDate={callFilters.dateRange.endDate}
                        slotProps={{
                          textField: {
                            size: "small",
                            fullWidth: true,
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="End Date"
                        value={callFilters.dateRange.endDate}
                        onChange={(date) =>
                          handleFilterDateRangeChange("endDate", date)
                        }
                        minDate={callFilters.dateRange.startDate}
                        maxDate={new Date()}
                        slotProps={{
                          textField: {
                            size: "small",
                            fullWidth: true,
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={clearFilters}
                        fullWidth
                      >
                        Clear
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={applyFilters}
                        disabled={agentCallDetailsLoading}
                        fullWidth
                      >
                        Apply
                      </Button>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={callFilters.sortBy}
                        label="Sort By"
                        onChange={(e) =>
                          handleFilterChange("sortBy", e.target.value)
                        }
                      >
                        <MenuItem value="timestamp">Time</MenuItem>
                        <MenuItem value="duration">Duration</MenuItem>
                        <MenuItem value="phoneNumber">Phone Number</MenuItem>
                        <MenuItem value="calledNumber">Called Number</MenuItem>
                        <MenuItem value="type">Call Type</MenuItem>
                        <MenuItem value="status">Status</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sort Order</InputLabel>
                      <Select
                        value={callFilters.sortOrder}
                        label="Sort Order"
                        onChange={(e) =>
                          handleFilterChange("sortOrder", e.target.value)
                        }
                      >
                        <MenuItem value="desc">Newest First</MenuItem>
                        <MenuItem value="asc">Oldest First</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Card>

              {/* Quick Filtered Stats */}
              {getFilteredCalls().length > 0 && (
                <Card sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Filtered Results Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h6" color="primary">
                          {getFilteredCalls().length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Calls
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h6" color="success.main">
                          {
                            getFilteredCalls().filter(
                              (call) => call.status === "completed"
                            ).length
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Completed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h6" color="warning.main">
                          {
                            getFilteredCalls().filter(
                              (call) => call.status === "missed"
                            ).length
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Missed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h6" color="info.main">
                          {
                            getFilteredCalls().filter(
                              (call) => call.type === "inbound"
                            ).length
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Inbound
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              )}

              {/* Detailed Stats */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Call Duration Statistics
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">
                          Average Duration:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.avgDuration}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">
                          Average Billable Time:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.avgBillsec}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">Total Duration:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.totalDuration}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">
                          Total Billable Time:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.totalBillsec}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Agent Information
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">Name:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.agentName}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">Extension:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.extension}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">Failed Calls:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {agentCallDetails.summary.failedCalls}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>

              {/* Call History Table */}
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Call color="primary" />
                      <Typography variant="h6">Call History</Typography>
                    </Box>
                  }
                  subheader={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mt: 1,
                      }}
                    >
                      <Chip
                        label={`${getFilteredCalls().length} calls`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {callFilters.callType !== "all" && (
                        <Chip
                          label={`Type: ${callFilters.callType}`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                      {callFilters.status !== "all" && (
                        <Chip
                          label={`Status: ${callFilters.status}`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                />
                <CardContent>
                  {getFilteredCalls().length === 0 ? (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        {agentCallDetails.calls.length === 0
                          ? "No call records found"
                          : "No calls match the current filters"}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Time</TableCell>
                            <TableCell>Phone Number</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Disposition</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getFilteredCalls().map((call, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(call.timestamp).toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {call.phoneNumber}
                                </Typography>
                                {call.calledNumber &&
                                  call.calledNumber !== call.phoneNumber && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Dialed: {call.calledNumber}
                                    </Typography>
                                  )}
                                {call.name && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {call.name}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={call.type}
                                  size="small"
                                  color={
                                    call.type === "outbound"
                                      ? "primary"
                                      : "secondary"
                                  }
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  {call.status === "completed" ? (
                                    <Call color="success" fontSize="small" />
                                  ) : call.status === "missed" ? (
                                    <CallEnd color="error" fontSize="small" />
                                  ) : (
                                    <PhoneDisabled
                                      color="warning"
                                      fontSize="small"
                                    />
                                  )}
                                  <Typography
                                    variant="body2"
                                    sx={{ textTransform: "capitalize" }}
                                  >
                                    {call.status}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {call.duration || "0:00"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {call.disposition}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography color="textSecondary">No data available</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAgentDetailsModal} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Integration Setup Modal */}
      <IntegrationSetupModal
        open={integrationSetupModalOpen}
        onClose={() => setIntegrationSetupModalOpen(false)}
      />

      {/* Download Options Modal */}
      <Dialog
        open={downloadOptionsModalOpen}
        onClose={() => setDownloadOptionsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">Download Report Options</Typography>
            <IconButton onClick={() => setDownloadOptionsModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose the type of report you want to download for the selected date
            range.
          </Typography>

          {/* Data Availability Warning */}
          {!isDateRangeInDataRange() && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Your selected date range may not have
                complete data. Available data:{" "}
                {format(
                  dataAvailabilityInfo.availableStartDate,
                  "MMM dd, yyyy"
                )}{" "}
                -{" "}
                {format(dataAvailabilityInfo.availableEndDate, "MMM dd, yyyy")}
              </Typography>
            </Alert>
          )}

          {/* Production Tips */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Production Tips:</strong>
              <br />• Large date ranges may take longer to process
              <br />• Reports are generated in real-time from live data
              <br />• CSV format is compatible with Excel and other tools
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "comprehensive" ? 2 : 1,
                  borderColor:
                    selectedReportType === "comprehensive"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "comprehensive"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("comprehensive")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 Comprehensive Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Complete report with call volume, agent performance,
                    summary, and breakdowns.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "call-volume" ? 2 : 1,
                  borderColor:
                    selectedReportType === "call-volume"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "call-volume"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("call-volume")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📈 Call Volume Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Daily call volume trends with answered, missed, and failed
                    calls.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "performance" ? 2 : 1,
                  borderColor:
                    selectedReportType === "performance"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "performance"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("performance")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    👥 Agent Performance Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Individual agent performance metrics and call statistics.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "call-log" ? 2 : 1,
                  borderColor:
                    selectedReportType === "call-log"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "call-log"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("call-log")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📞 Call Log Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detailed call records with timestamps, durations, and
                    dispositions.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "call-cost" ? 2 : 1,
                  borderColor:
                    selectedReportType === "call-cost"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "call-cost"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("call-cost")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    💰 Call Cost Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cost analysis for outbound calls with billing information.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "summary" ? 2 : 1,
                  borderColor:
                    selectedReportType === "summary"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "summary"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("summary")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Summary Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High-level summary with key metrics and top performers.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedReportType === "queues" ? 2 : 1,
                  borderColor:
                    selectedReportType === "queues"
                      ? "primary.main"
                      : "divider",
                  bgcolor:
                    selectedReportType === "queues"
                      ? "primary.50"
                      : "background.paper",
                }}
                onClick={() => setSelectedReportType("queues")}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🎯 Queue Metrics Report
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Queue distribution and SLA compliance metrics.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Selected Report:</strong>{" "}
              {selectedReportType === "comprehensive" && "Comprehensive Report"}
              {selectedReportType === "call-volume" && "Call Volume Report"}
              {selectedReportType === "performance" &&
                "Agent Performance Report"}
              {selectedReportType === "call-log" && "Call Log Report"}
              {selectedReportType === "call-cost" && "Call Cost Report"}
              {selectedReportType === "summary" && "Summary Report"}
              {selectedReportType === "queues" && "Queue Metrics Report"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Date Range:</strong>{" "}
              {format(dateRange.startDate, "MMM dd, yyyy")} -{" "}
              {format(dateRange.endDate, "MMM dd, yyyy")}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setDownloadOptionsModalOpen(false);
              // Clear any errors when closing the modal
              if (error) {
                dispatch(clearReports());
              }
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePreviewReport}
            variant="outlined"
            startIcon={<Preview />}
            disabled={isDownloading}
          >
            Preview Report
          </Button>
          <Button
            onClick={() => {
              setDownloadOptionsModalOpen(false);
              handleDownload();
            }}
            variant="contained"
            startIcon={
              isDownloading ? <CircularProgress size={16} /> : <Download />
            }
            disabled={isDownloading}
          >
            {isDownloading ? "Downloading..." : "Download Report"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Preview color="primary" />
              <Typography variant="h6">
                Report Preview -{" "}
                {selectedReportType
                  .replace("-", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Typography>
            </Box>
            <IconButton onClick={() => setPreviewModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3 }}>
          {previewLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <Box sx={{ textAlign: "center" }}>
                <CircularProgress size={40} />
                <Typography sx={{ mt: 2 }}>Loading preview data...</Typography>
              </Box>
            </Box>
          ) : previewData?.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {previewData.error}
            </Alert>
          ) : previewData ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Report Summary */}
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Report Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" color="primary">
                        {previewData.summary?.totalRecords ||
                          previewData.length ||
                          0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Records
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" color="success.main">
                        {previewData.summary?.dateRange ||
                          `${format(dateRange.startDate, "MMM dd")} - ${format(
                            dateRange.endDate,
                            "MMM dd, yyyy"
                          )}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Date Range
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" color="info.main">
                        {selectedReportType}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Report Type
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" color="warning.main">
                        {previewData.summary?.estimatedSize ||
                          "~" +
                            Math.round((previewData.length || 0) * 0.1) +
                            " KB"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Size
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader
                  title="Data Preview"
                  subheader={`Showing first ${Math.min(
                    10,
                    previewData.length || 0
                  )} records of ${previewData.length || 0} total`}
                />
                <CardContent>
                  {previewData.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {Object.keys(previewData[0]).map((key) => (
                              <TableCell key={key} sx={{ fontWeight: "bold" }}>
                                {key}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {previewData.slice(0, 10).map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value, cellIndex) => (
                                <TableCell key={cellIndex}>
                                  <Typography variant="body2">
                                    {typeof value === "string" &&
                                    value.length > 50
                                      ? value.substring(0, 50) + "..."
                                      : String(value)}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available for preview
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography color="textSecondary">
                No preview data available
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPreviewModalOpen(false)} variant="outlined">
            Close
          </Button>
          {previewData && !previewData.error && (
            <Button
              onClick={() => {
                setPreviewModalOpen(false);
                handleDownload();
              }}
              variant="contained"
              startIcon={<Download />}
            >
              Download Full Report
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
