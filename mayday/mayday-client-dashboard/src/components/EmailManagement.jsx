import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Stack,
  IconButton,
  Grid,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Email,
  Science,
  CheckCircle,
  Error,
  Info,
  Save,
  Refresh,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Launch,
  InfoOutlined,
  Send,
  SettingsApplications,
  AccountCircle,
  Lock,
} from "@mui/icons-material";
import * as emailService from "../services/emailService";

const EmailManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "",
    domain: "cs.hugamara.com",
  });

  // User Configuration
  const [userConfig, setUserConfig] = useState({
    defaultFromName: "Hugamara Support",
    defaultReplyTo: "",
    signature: "",
    autoReply: false,
    autoReplyMessage: "",
  });

  // Security Configuration
  const [securityConfig, setSecurityConfig] = useState({
    requireAuth: true,
    allowAttachments: true,
    maxAttachmentSize: 10, // MB
    allowedFileTypes: ["pdf", "doc", "docx", "jpg", "png", "gif"],
    spamFilter: true,
    virusScan: true,
  });

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await emailService.getEmailConfiguration();
      if (response.data) {
        setSmtpConfig(response.data.smtp || smtpConfig);
        setUserConfig(response.data.user || userConfig);
        setSecurityConfig(response.data.security || securityConfig);
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      showSnackbar("Failed to load configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      await emailService.updateEmailConfiguration({
        smtp: smtpConfig,
        user: userConfig,
        security: securityConfig,
      });
      showSnackbar("Configuration saved successfully!", "success");
    } catch (error) {
      console.error("Error saving configuration:", error);
      showSnackbar("Failed to save configuration: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await emailService.testEmailConnection(smtpConfig);
      setTestResult({
        success: response.success,
        message:
          response.message ||
          (response.success ? "Connection successful!" : "Connection failed"),
      });
      setTestDialogOpen(true);
    } catch (error) {
      console.error("Error testing connection:", error);
      setTestResult({
        success: false,
        message: "Connection test failed: " + error.message,
      });
      setTestDialogOpen(true);
    } finally {
      setTesting(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar("Configuration copied to clipboard!", "info");
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // SMTP Settings
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <SettingsApplications sx={{ mr: 1, color: "primary.main" }} />
                SMTP Server Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure your SMTP server settings to enable email sending
                functionality.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="SMTP Host"
                fullWidth
                value={smtpConfig.host}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, host: e.target.value })
                }
                margin="normal"
                variant="outlined"
                helperText="e.g., smtp.gmail.com"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Port"
                fullWidth
                type="number"
                value={smtpConfig.port}
                onChange={(e) =>
                  setSmtpConfig({
                    ...smtpConfig,
                    port: parseInt(e.target.value),
                  })
                }
                margin="normal"
                variant="outlined"
                helperText="e.g., 587 for TLS, 465 for SSL"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Username/Email"
                fullWidth
                type="email"
                value={smtpConfig.user}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, user: e.target.value })
                }
                margin="normal"
                variant="outlined"
                helperText="The email address used for authentication"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Password/App Password"
                fullWidth
                type={showPassword ? "text" : "password"}
                value={smtpConfig.password}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, password: e.target.value })
                }
                margin="normal"
                variant="outlined"
                helperText="Your email password or a generated app password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="From Email Address"
                fullWidth
                type="email"
                value={smtpConfig.from}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, from: e.target.value })
                }
                margin="normal"
                variant="outlined"
                helperText="The email address that will appear as the sender"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Domain"
                fullWidth
                value={smtpConfig.domain}
                onChange={(e) =>
                  setSmtpConfig({ ...smtpConfig, domain: e.target.value })
                }
                margin="normal"
                variant="outlined"
                helperText="Your organization's domain (e.g., cs.hugamara.com)"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={smtpConfig.secure}
                    onChange={(e) =>
                      setSmtpConfig({ ...smtpConfig, secure: e.target.checked })
                    }
                    color="primary"
                  />
                }
                label="Use secure connection (SSL/TLS)"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" icon={<InfoOutlined fontSize="inherit" />}>
                <Typography variant="body2">
                  For Gmail, you need to enable 2-factor authentication and
                  generate an App Password in your Google Account settings.
                  <Button
                    size="small"
                    color="primary"
                    onClick={() =>
                      window.open(
                        "https://myaccount.google.com/apppasswords",
                        "_blank"
                      )
                    }
                    endIcon={<Launch />}
                    sx={{ ml: 1 }}
                  >
                    Generate App Password
                  </Button>
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 1: // User Configuration
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <AccountCircle sx={{ mr: 1, color: "primary.main" }} />
                User-Specific Email Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure default sender information and email behavior for
                users.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Default From Name"
                fullWidth
                value={userConfig.defaultFromName}
                onChange={(e) =>
                  setUserConfig({
                    ...userConfig,
                    defaultFromName: e.target.value,
                  })
                }
                margin="normal"
                variant="outlined"
                helperText="The name that appears as the sender (e.g., Hugamara Support)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Default Reply-To Address"
                fullWidth
                type="email"
                value={userConfig.defaultReplyTo}
                onChange={(e) =>
                  setUserConfig({
                    ...userConfig,
                    defaultReplyTo: e.target.value,
                  })
                }
                margin="normal"
                variant="outlined"
                helperText="The email address replies will be sent to"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Email Signature"
                fullWidth
                multiline
                rows={4}
                value={userConfig.signature}
                onChange={(e) =>
                  setUserConfig({ ...userConfig, signature: e.target.value })
                }
                margin="normal"
                variant="outlined"
                helperText="Automatically appended to outgoing emails"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userConfig.autoReply}
                    onChange={(e) =>
                      setUserConfig({
                        ...userConfig,
                        autoReply: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label="Enable auto-reply for incoming emails"
              />
              {userConfig.autoReply && (
                <TextField
                  label="Auto-Reply Message"
                  fullWidth
                  multiline
                  rows={3}
                  value={userConfig.autoReplyMessage}
                  onChange={(e) =>
                    setUserConfig({
                      ...userConfig,
                      autoReplyMessage: e.target.value,
                    })
                  }
                  margin="normal"
                  variant="outlined"
                  helperText="Message sent automatically when an email is received"
                  sx={{ mt: 2 }}
                />
              )}
            </Grid>
          </Grid>
        );

      case 2: // Security & Policies
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Lock sx={{ mr: 1, color: "primary.main" }} />
                Email Security & Content Policies
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Define rules for email authentication, attachments, and content
                filtering.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={securityConfig.requireAuth}
                    onChange={(e) =>
                      setSecurityConfig({
                        ...securityConfig,
                        requireAuth: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label="Require authentication for all email operations"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={securityConfig.allowAttachments}
                    onChange={(e) =>
                      setSecurityConfig({
                        ...securityConfig,
                        allowAttachments: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label="Allow file attachments"
              />
            </Grid>

            {securityConfig.allowAttachments && (
              <>
                <Grid item xs={12} md={6} sx={{ pl: 4 }}>
                  <TextField
                    label="Maximum Attachment Size (MB)"
                    fullWidth
                    type="number"
                    value={securityConfig.maxAttachmentSize}
                    onChange={(e) =>
                      setSecurityConfig({
                        ...securityConfig,
                        maxAttachmentSize: parseInt(e.target.value),
                      })
                    }
                    margin="normal"
                    variant="outlined"
                    inputProps={{ min: 1, max: 100 }}
                    helperText="Set the maximum size for individual attachments"
                  />
                </Grid>

                <Grid item xs={12} sx={{ pl: 4 }}>
                  <TextField
                    label="Allowed File Types (comma-separated)"
                    fullWidth
                    value={securityConfig.allowedFileTypes.join(", ")}
                    onChange={(e) =>
                      setSecurityConfig({
                        ...securityConfig,
                        allowedFileTypes: e.target.value
                          .split(",")
                          .map((t) => t.trim()),
                      })
                    }
                    margin="normal"
                    variant="outlined"
                    helperText="e.g., pdf, doc, docx, jpg, png, gif"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={securityConfig.spamFilter}
                    onChange={(e) =>
                      setSecurityConfig({
                        ...securityConfig,
                        spamFilter: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label="Enable spam filtering"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={securityConfig.virusScan}
                    onChange={(e) =>
                      setSecurityConfig({
                        ...securityConfig,
                        virusScan: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label="Enable virus scanning for attachments"
              />
            </Grid>
          </Grid>
        );

      case 3: // Test & Validate
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Science sx={{ mr: 1, color: "primary.main" }} />
                Test & Validate Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Verify your SMTP settings and review the current email
                configuration.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined" sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Science color="primary" />
                  <Typography variant="subtitle1">Connection Test</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Click the button below to test if your SMTP server connection
                  is working correctly.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={testConnection}
                  disabled={testing || !smtpConfig.user || !smtpConfig.password}
                  startIcon={
                    testing ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Send />
                    )
                  }
                >
                  {testing ? "Testing Connection..." : "Test SMTP Connection"}
                </Button>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined" sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Info color="info" />
                  <Typography variant="subtitle1">
                    Configuration Summary
                  </Typography>
                </Stack>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="SMTP Host"
                      secondary={smtpConfig.host}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Port" secondary={smtpConfig.port} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Secure Connection (SSL/TLS)"
                      secondary={smtpConfig.secure ? "Yes" : "No"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="From Address"
                      secondary={smtpConfig.from || "Not set"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Default From Name"
                      secondary={userConfig.defaultFromName}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Allow Attachments"
                      secondary={securityConfig.allowAttachments ? "Yes" : "No"}
                    />
                  </ListItem>
                  {securityConfig.allowAttachments && (
                    <>
                      <ListItem sx={{ pl: 4 }}>
                        <ListItemText
                          primary="Max Attachment Size"
                          secondary={`${securityConfig.maxAttachmentSize} MB`}
                        />
                      </ListItem>
                      <ListItem sx={{ pl: 4 }}>
                        <ListItemText
                          primary="Allowed File Types"
                          secondary={
                            securityConfig.allowedFileTypes.join(", ") || "All"
                          }
                        />
                      </ListItem>
                    </>
                  )}
                  <ListItem>
                    <ListItemText
                      primary="Spam Filtering"
                      secondary={
                        securityConfig.spamFilter ? "Enabled" : "Disabled"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Virus Scanning"
                      secondary={
                        securityConfig.virusScan ? "Enabled" : "Disabled"
                      }
                    />
                  </ListItem>
                </List>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          smtp: smtpConfig,
                          user: userConfig,
                          security: securityConfig,
                        },
                        null,
                        2
                      )
                    )
                  }
                  startIcon={<ContentCopy />}
                  sx={{ mt: 2 }}
                >
                  Copy Full Configuration
                </Button>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", fontWeight: 600 }}
        >
          <Email sx={{ mr: 1, color: "primary.main" }} />
          Email Management Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your email settings and manage SMTP connections
        </Typography>
      </Box>

      {/* Main Card */}
      <Card elevation={2}>
        <CardContent sx={{ p: 0 }}>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}
          >
            <Tab
              icon={<SettingsApplications />}
              iconPosition="start"
              label="SMTP Settings"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<AccountCircle />}
              iconPosition="start"
              label="User Configuration"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<Lock />}
              iconPosition="start"
              label="Security & Policies"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<Science />}
              iconPosition="start"
              label="Test & Validate"
              sx={{ minHeight: 64 }}
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 8,
                }}
              >
                <CircularProgress size={40} />
                <Typography variant="h6" sx={{ ml: 2 }}>
                  Loading configuration...
                </Typography>
              </Box>
            ) : (
              renderTabContent()
            )}
          </Box>

          {/* Action Buttons */}
          <Divider />
          <Box
            sx={{ p: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadConfiguration}
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={saveConfiguration}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Test Result Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {testResult?.success ? (
              <CheckCircle sx={{ color: "success.main", mr: 1 }} />
            ) : (
              <Error sx={{ color: "error.main", mr: 1 }} />
            )}
            Connection Test Result
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert
            severity={testResult?.success ? "success" : "error"}
            sx={{ mt: 1 }}
          >
            {testResult?.message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmailManagement;
