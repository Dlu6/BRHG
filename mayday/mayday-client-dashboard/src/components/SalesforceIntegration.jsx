import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  CloudOutlined,
  Person as PersonIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Analytics as AnalyticsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Launch as LaunchIcon,
  SaveAlt as SaveIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  //   Group as GroupIcon,
  //   AccountBalance as AccountBalanceIcon,
  //   Phone as PhoneIcon,
  //   Email as EmailIcon,
  //   ContactPhone as ContactPhoneIcon,
  Badge as BadgeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  DataUsage as DataUsageIcon,
  Autorenew as AutorenewIcon,
} from "@mui/icons-material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";

const SalesforceIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [activeTab, setActiveTab] = useState(0);
  const [testConnectionDialog, setTestConnectionDialog] = useState(false);
  const [syncDialog, setSyncDialog] = useState(false);
  const [fieldMappingDialog, setFieldMappingDialog] = useState({
    open: false,
    data: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [salesforceConfig, setSalesforceConfig] = useState({
    enabled: false,
    instanceUrl: "",
    clientId: "",
    clientSecret: "",
    username: "",
    securityToken: "",
    sandboxMode: false,
    autoSync: false,
    syncInterval: 30, // minutes
    fieldMappings: {
      "Contact.FirstName": "first_name",
      "Contact.LastName": "last_name",
      "Contact.Phone": "phone_number",
      "Contact.Email": "email",
      "Contact.AccountId": "account_id",
    },
    syncSettings: {
      syncContacts: true,
      syncAccounts: true,
      syncLeads: true,
      syncOpportunities: false,
      enableScreenPop: true,
      enableClickToDial: true,
      logCalls: true,
    },
  });

  const [connectionInfo, setConnectionInfo] = useState({
    lastSync: null,
    totalContacts: 0,
    totalAccounts: 0,
    lastError: null,
    apiVersion: "v58.0",
  });

  const [syncStats, setSyncStats] = useState({
    contactsSynced: 0,
    accountsSynced: 0,
    leadsSynced: 0,
    errors: 0,
    lastSyncDuration: null,
  });

  useEffect(() => {
    fetchSalesforceConfig();
  }, []);

  const fetchSalesforceConfig = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful configuration fetch
      setConnectionStatus(
        salesforceConfig.enabled ? "connected" : "disconnected"
      );
    } catch (error) {
      console.error("Failed to fetch Salesforce config:", error);
      setConnectionStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setSalesforceConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSyncSettingChange = (field) => (event) => {
    setSalesforceConfig((prev) => ({
      ...prev,
      syncSettings: {
        ...prev.syncSettings,
        [field]: event.target.checked,
      },
    }));
  };

  const handleSaveConfiguration = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update connection status based on enabled state
      setConnectionStatus(
        salesforceConfig.enabled ? "connected" : "disconnected"
      );

      // Show success message (you might want to use a toast/snackbar)
      console.log("Salesforce configuration saved successfully");
    } catch (error) {
      console.error("Failed to save configuration:", error);
      setConnectionStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setConnectionStatus("connected");
      setConnectionInfo((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
        totalContacts: 1247,
        totalAccounts: 89,
        lastError: null,
      }));

      setTestConnectionDialog(false);
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus("error");
      setConnectionInfo((prev) => ({
        ...prev,
        lastError: error.message,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    setLoading(true);
    try {
      // Simulate data sync
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setSyncStats({
        contactsSynced: 156,
        accountsSynced: 23,
        leadsSynced: 45,
        errors: 0,
        lastSyncDuration: "2.3s",
      });

      setConnectionInfo((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
        totalContacts: prev.totalContacts + 156,
        totalAccounts: prev.totalAccounts + 23,
      }));

      setSyncDialog(false);
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStats((prev) => ({
        ...prev,
        errors: prev.errors + 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = () => {
    const statusConfig = {
      connected: {
        color: "success",
        icon: <CheckCircleOutlinedIcon />,
        label: "Connected",
      },
      disconnected: {
        color: "default",
        icon: <InfoOutlinedIcon />,
        label: "Disconnected",
      },
      error: { color: "error", icon: <ErrorOutlineIcon />, label: "Error" },
    };

    const config = statusConfig[connectionStatus];
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        variant="outlined"
      />
    );
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ paddingTop: "24px" }}>
      {value === index && children}
    </div>
  );

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          bgcolor: "primary.main",
          color: "white",
          borderRadius: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={3}
          position="relative"
          zIndex={1}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CloudOutlined sx={{ fontSize: 48, color: "white" }} />
          </Box>
          <Box>
            <Typography
              variant="h3"
              gutterBottom
              fontWeight="600"
              sx={{ mb: 1 }}
            >
              Salesforce Integration
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300 }}>
              Connect your Mayday system with Salesforce CRM for seamless
              customer data management and enhanced productivity
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip
                icon={<SecurityIcon />}
                label="Enterprise Security"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
              <Chip
                icon={<LaunchIcon />}
                label="Real-time Sync"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Status Card */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          bgcolor: "background.paper",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Stack direction="row" alignItems="center" spacing={3}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor:
                    connectionStatus === "connected"
                      ? "success.light"
                      : connectionStatus === "error"
                      ? "error.light"
                      : "grey.200",
                  color:
                    connectionStatus === "connected"
                      ? "success.main"
                      : connectionStatus === "error"
                      ? "error.main"
                      : "grey.600",
                  transition: "all 0.3s ease",
                }}
              >
                {connectionStatus === "connected" && <CheckCircleIcon />}
                {connectionStatus === "error" && <ErrorOutlineIcon />}
                {connectionStatus === "disconnected" && <InfoOutlinedIcon />}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="600">
                  Connection Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {connectionStatus === "connected" &&
                    "Successfully connected to Salesforce"}
                  {connectionStatus === "error" &&
                    "Connection failed - check credentials"}
                  {connectionStatus === "disconnected" &&
                    "Not connected to Salesforce"}
                </Typography>
              </Box>
              {getStatusChip()}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Test Connection">
                <IconButton
                  onClick={() => setTestConnectionDialog(true)}
                  disabled={!salesforceConfig.enabled}
                  sx={{
                    bgcolor: "primary.50",
                    color: "primary.main",
                    "&:hover": { bgcolor: "primary.100" },
                    "&:disabled": { bgcolor: "grey.100", color: "grey.400" },
                  }}
                >
                  <SyncOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Status">
                <IconButton
                  onClick={fetchSalesforceConfig}
                  disabled={loading}
                  sx={{
                    bgcolor: "secondary.50",
                    color: "secondary.main",
                    "&:hover": { bgcolor: "secondary.100" },
                    animation: loading ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                >
                  <RefreshOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {connectionStatus === "connected" && connectionInfo.lastSync && (
            <Box
              sx={{
                p: 2,
                bgcolor: "success.50",
                borderRadius: 2,
                border: "1px solid rgba(76, 175, 80, 0.2)",
                mt: 2,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <TimelineIcon sx={{ color: "success.main", fontSize: 20 }} />
                <Typography
                  variant="body2"
                  color="success.dark"
                  fontWeight="500"
                >
                  Last synchronized:{" "}
                  {new Date(connectionInfo.lastSync).toLocaleString()}
                </Typography>
              </Stack>
            </Box>
          )}

          {connectionInfo.lastError && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                borderRadius: 2,
                "& .MuiAlert-icon": { fontSize: 20 },
              }}
              icon={<WarningIcon />}
            >
              <Typography variant="body2" fontWeight="500">
                {connectionInfo.lastError}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Configuration Tabs */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              backgroundColor: "grey.50",
              "& .MuiTab-root": {
                minHeight: 70,
                fontWeight: 600,
                fontSize: "0.95rem",
                textTransform: "none",
                "&.Mui-selected": {
                  backgroundColor: "white",
                  color: "primary.main",
                  fontWeight: 700,
                },
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                },
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                backgroundColor: "#1976d2",
              },
            }}
          >
            <Tab
              icon={<SettingsIcon sx={{ mb: 0.5 }} />}
              label="Configuration"
              iconPosition="top"
            />
            <Tab
              icon={<SyncIcon sx={{ mb: 0.5 }} />}
              label="Sync Settings"
              iconPosition="top"
            />
            <Tab
              icon={<DataUsageIcon sx={{ mb: 0.5 }} />}
              label="Field Mapping"
              iconPosition="top"
            />
            <Tab
              icon={<AnalyticsIcon sx={{ mb: 0.5 }} />}
              label="Analytics"
              iconPosition="top"
            />
          </Tabs>

          {/* Configuration Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 4 }}>
              <Stack spacing={4}>
                {/* Enable/Disable Section */}
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: salesforceConfig.enabled
                      ? "success.50"
                      : "grey.50",
                    border: `2px solid ${
                      salesforceConfig.enabled ? "success.200" : "grey.200"
                    }`,
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: salesforceConfig.enabled
                          ? "success.main"
                          : "grey.400",
                        color: "white",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {salesforceConfig.enabled ? (
                        <CheckCircleIcon />
                      ) : (
                        <CancelIcon />
                      )}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="600">
                        Integration Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {salesforceConfig.enabled
                          ? "Salesforce integration is active and ready to use"
                          : "Enable to start using Salesforce integration features"}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={salesforceConfig.enabled}
                          onChange={handleConfigChange("enabled")}
                          color="primary"
                          size="large"
                        />
                      }
                      label={
                        <Typography variant="h6" fontWeight="600">
                          {salesforceConfig.enabled ? "Active" : "Inactive"}
                        </Typography>
                      }
                    />
                  </Stack>
                </Paper>

                {/* Credentials Section */}
                <Paper sx={{ p: 3, bgcolor: "grey.25", borderRadius: 2 }}>
                  <Typography
                    variant="h6"
                    fontWeight="600"
                    sx={{ mb: 2, display: "flex", alignItems: "center" }}
                  >
                    <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
                    Authentication Credentials
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Instance URL"
                        placeholder="https://yourinstance.salesforce.com"
                        value={salesforceConfig.instanceUrl}
                        onChange={handleConfigChange("instanceUrl")}
                        disabled={!salesforceConfig.enabled}
                        InputProps={{
                          startAdornment: (
                            <LaunchIcon
                              sx={{ mr: 1, color: "action.active" }}
                            />
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "&:hover fieldset": {
                              borderColor: "primary.main",
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Client ID"
                        value={salesforceConfig.clientId}
                        onChange={handleConfigChange("clientId")}
                        disabled={!salesforceConfig.enabled}
                        InputProps={{
                          startAdornment: (
                            <BadgeIcon sx={{ mr: 1, color: "action.active" }} />
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "&:hover fieldset": {
                              borderColor: "primary.main",
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Client Secret"
                        type={showPassword ? "text" : "password"}
                        value={salesforceConfig.clientSecret}
                        onChange={handleConfigChange("clientSecret")}
                        disabled={!salesforceConfig.enabled}
                        InputProps={{
                          startAdornment: (
                            <SecurityIcon
                              sx={{ mr: 1, color: "action.active" }}
                            />
                          ),
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "&:hover fieldset": {
                              borderColor: "primary.main",
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        value={salesforceConfig.username}
                        onChange={handleConfigChange("username")}
                        disabled={!salesforceConfig.enabled}
                        InputProps={{
                          startAdornment: (
                            <PersonIcon
                              sx={{ mr: 1, color: "action.active" }}
                            />
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "&:hover fieldset": {
                              borderColor: "primary.main",
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Security Token"
                        type={showToken ? "text" : "password"}
                        value={salesforceConfig.securityToken}
                        onChange={handleConfigChange("securityToken")}
                        disabled={!salesforceConfig.enabled}
                        InputProps={{
                          startAdornment: (
                            <SecurityIcon
                              sx={{ mr: 1, color: "action.active" }}
                            />
                          ),
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowToken(!showToken)}
                              edge="end"
                              size="small"
                            >
                              {showToken ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "&:hover fieldset": {
                              borderColor: "primary.main",
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl
                        fullWidth
                        disabled={!salesforceConfig.enabled}
                      >
                        <InputLabel>API Version</InputLabel>
                        <Select
                          value={connectionInfo.apiVersion}
                          label="API Version"
                          sx={{
                            borderRadius: 2,
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "primary.main",
                            },
                          }}
                        >
                          <MenuItem value="v58.0">v58.0 (Latest)</MenuItem>
                          <MenuItem value="v57.0">v57.0</MenuItem>
                          <MenuItem value="v56.0">v56.0</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Additional Settings */}
                <Paper sx={{ p: 3, bgcolor: "primary.50", borderRadius: 2 }}>
                  <Typography
                    variant="h6"
                    fontWeight="600"
                    sx={{ mb: 2, display: "flex", alignItems: "center" }}
                  >
                    <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
                    Additional Settings
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: "white", borderRadius: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={salesforceConfig.sandboxMode}
                              onChange={handleConfigChange("sandboxMode")}
                              disabled={!salesforceConfig.enabled}
                              color="warning"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="subtitle1" fontWeight="600">
                                Sandbox Mode
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Connect to Salesforce sandbox environment
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: "white", borderRadius: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={salesforceConfig.autoSync}
                              onChange={handleConfigChange("autoSync")}
                              disabled={!salesforceConfig.enabled}
                              color="success"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="subtitle1" fontWeight="600">
                                Auto Sync
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Automatically synchronize data at intervals
                              </Typography>
                            </Box>
                          }
                        />
                        {salesforceConfig.autoSync && (
                          <TextField
                            label="Sync Interval (minutes)"
                            type="number"
                            value={salesforceConfig.syncInterval}
                            onChange={handleConfigChange("syncInterval")}
                            disabled={!salesforceConfig.enabled}
                            size="small"
                            sx={{
                              mt: 2,
                              maxWidth: 200,
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                              },
                            }}
                            InputProps={{
                              startAdornment: (
                                <AutorenewIcon
                                  sx={{ mr: 1, color: "action.active" }}
                                />
                              ),
                            }}
                          />
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Save Button */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={fetchSalesforceConfig}
                    disabled={loading}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    <RefreshOutlinedIcon sx={{ mr: 1 }} />
                    Reset to Saved
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveConfiguration}
                    disabled={loading || !salesforceConfig.enabled}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      // Use default contained button color
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <>
                        <SaveIcon sx={{ mr: 1 }} />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </TabPanel>

          {/* Sync Settings Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Synchronization Settings
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Objects to Sync
                    </Typography>
                    <Stack spacing={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={salesforceConfig.syncSettings.syncContacts}
                            onChange={handleSyncSettingChange("syncContacts")}
                          />
                        }
                        label="Contacts"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={salesforceConfig.syncSettings.syncAccounts}
                            onChange={handleSyncSettingChange("syncAccounts")}
                          />
                        }
                        label="Accounts"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={salesforceConfig.syncSettings.syncLeads}
                            onChange={handleSyncSettingChange("syncLeads")}
                          />
                        }
                        label="Leads"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={
                              salesforceConfig.syncSettings.syncOpportunities
                            }
                            onChange={handleSyncSettingChange(
                              "syncOpportunities"
                            )}
                          />
                        }
                        label="Opportunities"
                      />
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Call Integration Features
                    </Typography>
                    <Stack spacing={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={
                              salesforceConfig.syncSettings.enableScreenPop
                            }
                            onChange={handleSyncSettingChange(
                              "enableScreenPop"
                            )}
                          />
                        }
                        label="Screen Pop on Incoming Calls"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={
                              salesforceConfig.syncSettings.enableClickToDial
                            }
                            onChange={handleSyncSettingChange(
                              "enableClickToDial"
                            )}
                          />
                        }
                        label="Click-to-Dial from Salesforce"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={salesforceConfig.syncSettings.logCalls}
                            onChange={handleSyncSettingChange("logCalls")}
                          />
                        }
                        label="Automatic Call Logging"
                      />
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Button
                variant="outlined"
                onClick={() => setSyncDialog(true)}
                disabled={
                  !salesforceConfig.enabled || connectionStatus !== "connected"
                }
                sx={{ mt: 3 }}
              >
                Sync Data Now
              </Button>
            </Box>
          </TabPanel>

          {/* Field Mapping Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Typography variant="h6">
                  Field Mapping Configuration
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFieldMappingDialog(true)}
                >
                  Add Mapping
                </Button>
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Salesforce Field</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Mayday Field</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Actions</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(salesforceConfig.fieldMappings).map(
                      ([sfField, reachField]) => (
                        <TableRow key={sfField}>
                          <TableCell>{sfField}</TableCell>
                          <TableCell>{reachField}</TableCell>
                          <TableCell>
                            <Button size="small" color="error">
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: 4 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={3}
              >
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight="600"
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <AssessmentIcon sx={{ mr: 1, color: "primary.main" }} />
                    Integration Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monitor your Salesforce integration performance and data
                    synchronization
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={fetchSalesforceConfig}
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  <RefreshOutlinedIcon sx={{ mr: 1 }} />
                  Refresh Data
                </Button>
              </Stack>

              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      borderRadius: 3,
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <CardContent sx={{ textAlign: "center", p: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "50%",
                          bgcolor: "rgba(255,255,255,0.2)",
                          display: "inline-flex",
                          mb: 2,
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 32, color: "white" }} />
                      </Box>
                      <Typography variant="h3" fontWeight="700" mb={1}>
                        {connectionInfo.totalContacts.toLocaleString()}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                        Total Contacts
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      bgcolor: "secondary.main",
                      color: "white",
                      borderRadius: 3,
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <CardContent sx={{ textAlign: "center", p: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "50%",
                          bgcolor: "rgba(255,255,255,0.2)",
                          display: "inline-flex",
                          mb: 2,
                        }}
                      >
                        <BusinessIcon sx={{ fontSize: 32, color: "white" }} />
                      </Box>
                      <Typography variant="h3" fontWeight="700" mb={1}>
                        {connectionInfo.totalAccounts.toLocaleString()}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                        Total Accounts
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      bgcolor: "info.main",
                      color: "white",
                      borderRadius: 3,
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <CardContent sx={{ textAlign: "center", p: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "50%",
                          bgcolor: "rgba(255,255,255,0.2)",
                          display: "inline-flex",
                          mb: 2,
                        }}
                      >
                        <TrendingUpIcon sx={{ fontSize: 32, color: "white" }} />
                      </Box>
                      <Typography variant="h3" fontWeight="700" mb={1}>
                        {syncStats.contactsSynced + syncStats.accountsSynced}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                        Records Synced Today
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      bgcolor: syncStats.errors > 0 ? "error.main" : "grey.100",
                      color: syncStats.errors > 0 ? "white" : "text.primary",
                      borderRadius: 3,
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-4px)" },
                    }}
                  >
                    <CardContent sx={{ textAlign: "center", p: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "50%",
                          bgcolor:
                            syncStats.errors > 0
                              ? "rgba(255,255,255,0.2)"
                              : "rgba(0,0,0,0.1)",
                          display: "inline-flex",
                          mb: 2,
                        }}
                      >
                        <ErrorOutlineIcon
                          sx={{
                            fontSize: 32,
                            color:
                              syncStats.errors > 0 ? "white" : "error.main",
                          }}
                        />
                      </Box>
                      <Typography variant="h3" fontWeight="700" mb={1}>
                        {syncStats.errors}
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        sx={{ opacity: syncStats.errors > 0 ? 0.9 : 0.7 }}
                      >
                        Sync Errors
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Performance Metrics */}
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="600"
                  sx={{ mb: 2, display: "flex", alignItems: "center" }}
                >
                  <SpeedIcon sx={{ mr: 1, color: "primary.main" }} />
                  Performance Metrics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: "center", p: 2 }}>
                      <Typography
                        variant="h4"
                        color="success.main"
                        fontWeight="600"
                      >
                        {syncStats.lastSyncDuration || "N/A"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last Sync Duration
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: "center", p: 2 }}>
                      <Typography
                        variant="h4"
                        color="warning.main"
                        fontWeight="600"
                      >
                        99.2%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Success Rate
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: "center", p: 2 }}>
                      <Typography
                        variant="h4"
                        color="info.main"
                        fontWeight="600"
                      >
                        {connectionInfo.apiVersion}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        API Version
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {syncStats.lastSyncDuration && (
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 2,
                    "& .MuiAlert-icon": { fontSize: 24 },
                  }}
                  icon={<CheckCircleIcon />}
                >
                  <Typography variant="body1" fontWeight="500">
                    Last sync completed successfully in{" "}
                    {syncStats.lastSyncDuration}
                  </Typography>
                </Alert>
              )}
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Test Connection Dialog */}
      <Dialog
        open={testConnectionDialog}
        onClose={() => setTestConnectionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Test Salesforce Connection</DialogTitle>
        <DialogContent>
          <Typography>
            This will test the connection to your Salesforce instance using the
            configured credentials.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestConnectionDialog(false)}>Cancel</Button>
          <Button
            onClick={handleTestConnection}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Test Connection"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync Data Dialog */}
      <Dialog
        open={syncDialog}
        onClose={() => setSyncDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sync Data with Salesforce</DialogTitle>
        <DialogContent>
          <Typography>
            This will synchronize data between Reach-mi and Salesforce based on
            your current sync settings. This process may take a few minutes
            depending on the amount of data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSyncData}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Start Sync"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesforceIntegration;
