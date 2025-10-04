import React, { useState, useEffect } from "react";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Paper,
  InputAdornment,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Email,
  Send,
  Reply,
  ReplyAll,
  Forward,
  Delete,
  Star,
  StarBorder,
  Archive,
  Unarchive,
  Search,
  FilterList,
  Add,
  Refresh,
  AttachFile,
  Inbox,
  Outbox,
  Settings,
  Visibility,
  VisibilityOff,
  Science,
} from "@mui/icons-material";
import * as emailService from "../services/emailService";

const EmailView = ({ open, onClose }) => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Email composition state
  const [composeData, setComposeData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    attachments: [],
    priority: "normal",
  });

  // Configuration state
  const [smtpConfig, setSmtpConfig] = useState({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "",
    domain: "cs.hugamara.com",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load emails on component mount
  useEffect(() => {
    if (open) {
      loadEmails();
      loadConfiguration();
    }
  }, [open]);

  // Listen for email compose events from other components
  useEffect(() => {
    const handleEmailCompose = (event) => {
      const { to, subject, body } = event.detail;
      setComposeData({
        to: to || "",
        cc: "",
        bcc: "",
        subject: subject || "",
        body: body || "",
        attachments: [],
        priority: "normal",
      });
      setActiveTab(1); // Switch to compose tab
    };

    window.addEventListener("openEmailCompose", handleEmailCompose);
    return () =>
      window.removeEventListener("openEmailCompose", handleEmailCompose);
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const response = await emailService.getAllEmails();
      const emailsFromApi = Array.isArray(response?.data?.emails)
        ? response.data.emails
        : Array.isArray(response?.emails)
        ? response.emails
        : Array.isArray(response?.data)
        ? response.data
        : [];
      setEmails(emailsFromApi);
    } catch (error) {
      console.error("Error loading emails:", error);
      showSnackbar("Failed to load emails", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguration = async () => {
    try {
      const response = await emailService.getEmailConfiguration();
      const cfg = response?.data?.smtp
        ? response.data
        : response?.data?.data
        ? response.data.data
        : response || {};
      if (cfg?.smtp) setSmtpConfig(cfg.smtp);
    } catch (error) {
      console.error("Error loading configuration:", error);
    }
  };

  const handleCompose = () => {
    setComposeData({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
      attachments: [],
      priority: "normal",
    });
    setComposeOpen(true);
  };

  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    // Mark as read
    try {
      await emailService.markAsRead(email.id);
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
      );
    } catch (error) {
      console.error("Error marking email as read:", error);
    }
  };

  const handleReply = () => {
    if (selectedEmail) {
      setComposeData({
        to: selectedEmail.from,
        subject: `Re: ${selectedEmail.subject}`,
        body: `\n\n--- Original Message ---\nFrom: ${
          selectedEmail.from
        }\nDate: ${emailService.formatEmailDate(
          selectedEmail.createdAt
        )}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`,
        attachments: [],
        priority: "normal",
      });
      setSelectedEmail(null);
      setComposeOpen(true);
    }
  };

  const handleSendEmail = async () => {
    setLoading(true);
    try {
      const emailData = {
        to: [composeData.to],
        cc: composeData.cc ? [composeData.cc] : [],
        bcc: composeData.bcc ? [composeData.bcc] : [],
        subject: composeData.subject,
        body: composeData.body,
        priority: composeData.priority,
        attachments: composeData.attachments,
      };

      await emailService.sendEmail(emailData);
      showSnackbar("Email sent successfully!", "success");
      setComposeOpen(false);
      loadEmails();
    } catch (error) {
      console.error("Error sending email:", error);
      showSnackbar("Failed to send email: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (emailId) => {
    try {
      await emailService.deleteEmail(emailId);
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      showSnackbar("Email deleted", "success");
    } catch (error) {
      console.error("Error deleting email:", error);
      showSnackbar("Failed to delete email", "error");
    }
  };

  const handleStar = async (emailId) => {
    try {
      const email = emails.find((e) => e.id === emailId);
      if (email.isStarred) {
        await emailService.unstarEmail(emailId);
      } else {
        await emailService.starEmail(emailId);
      }
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, isStarred: !e.isStarred } : e
        )
      );
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const handleArchive = async (emailId) => {
    try {
      const email = emails.find((e) => e.id === emailId);
      if (email.isArchived) {
        await emailService.unarchiveEmail(emailId);
      } else {
        await emailService.archiveEmail(emailId);
      }
      setEmails((prev) =>
        prev.map((e) =>
          e.id === emailId ? { ...e, isArchived: !e.isArchived } : e
        )
      );
    } catch (error) {
      console.error("Error toggling archive:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const response = await emailService.uploadAttachment(file);
        setComposeData((prev) => ({
          ...prev,
          attachments: [...prev.attachments, response.data],
        }));
        showSnackbar("File uploaded successfully", "success");
      } catch (error) {
        console.error("Error uploading file:", error);
        showSnackbar("Failed to upload file", "error");
      }
    }
  };

  const emailsArray = Array.isArray(emails) ? emails : [];
  const filteredEmails = emailsArray.filter((email) => {
    const matchesSearch =
      (email.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.from || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !email.isRead) ||
      (filter === "starred" && email.isStarred) ||
      (filter === "sent" && (email.from || "").includes("cs.hugamara.com"));

    return matchesSearch && matchesFilter;
  });

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status) => {
    return emailService.getStatusColor(status);
  };

  const getPriorityColor = (priority) => {
    return emailService.getPriorityColor(priority);
  };

  const formatDate = (dateString) => {
    return emailService.formatEmailDate(dateString);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Inbox
        return (
          <Box>
            {/* Search and Filter */}
            <Box
              sx={{
                mb: 3,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr auto auto",
                },
                gap: 2,
                alignItems: "center",
              }}
            >
              <TextField
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: "100%" }}
              />
              <Button
                startIcon={<FilterList />}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                Filter
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={() => setFilter("all")}>All</MenuItem>
                <MenuItem onClick={() => setFilter("unread")}>Unread</MenuItem>
                <MenuItem onClick={() => setFilter("starred")}>
                  Starred
                </MenuItem>
                <MenuItem onClick={() => setFilter("sent")}>Sent</MenuItem>
              </Menu>
              <Button
                startIcon={<Refresh />}
                onClick={loadEmails}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>

            {/* Email List */}
            <Card>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {filteredEmails.map((email) => (
                    <ListItem
                      key={email.id}
                      button
                      onClick={() => handleEmailClick(email)}
                      sx={{
                        borderBottom: "1px solid #eee",
                        "&:hover": { bgcolor: "#f5f5f5" },
                        bgcolor: !email.isRead ? "#f8f9fa" : "transparent",
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: !email.isRead ? "bold" : "normal",
                              }}
                            >
                              {email.subject}
                            </Typography>
                            <Chip
                              label={email.priority}
                              size="small"
                              color={getPriorityColor(email.priority)}
                            />
                            {email.attachments &&
                              email.attachments.length > 0 && (
                                <AttachFile fontSize="small" color="action" />
                              )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              From: {email.from}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {email.body.substring(0, 100)}...
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDate(email.createdAt)}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title={email.isStarred ? "Unstar" : "Star"}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStar(email.id);
                              }}
                            >
                              {email.isStarred ? (
                                <Star color="warning" />
                              ) : (
                                <StarBorder />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={email.isArchived ? "Unarchive" : "Archive"}
                          >
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(email.id);
                              }}
                            >
                              {email.isArchived ? <Unarchive /> : <Archive />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(email.id);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Card>
          </Box>
        );

      case 1: // Compose
        return (
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Compose New Email
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="To"
                  fullWidth
                  value={composeData.to}
                  onChange={(e) =>
                    setComposeData({ ...composeData, to: e.target.value })
                  }
                  variant="outlined"
                />
                <TextField
                  label="CC"
                  fullWidth
                  value={composeData.cc}
                  onChange={(e) =>
                    setComposeData({ ...composeData, cc: e.target.value })
                  }
                  variant="outlined"
                />
                <TextField
                  label="BCC"
                  fullWidth
                  value={composeData.bcc}
                  onChange={(e) =>
                    setComposeData({ ...composeData, bcc: e.target.value })
                  }
                  variant="outlined"
                />
                <TextField
                  label="Subject"
                  fullWidth
                  value={composeData.subject}
                  onChange={(e) =>
                    setComposeData({ ...composeData, subject: e.target.value })
                  }
                  variant="outlined"
                />
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={composeData.priority}
                    onChange={(e) =>
                      setComposeData({
                        ...composeData,
                        priority: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Message"
                  fullWidth
                  multiline
                  rows={10}
                  value={composeData.body}
                  onChange={(e) =>
                    setComposeData({ ...composeData, body: e.target.value })
                  }
                  variant="outlined"
                />
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFile />}
                    component="label"
                  >
                    Attach File
                    <input type="file" hidden onChange={handleFileUpload} />
                  </Button>
                  {composeData.attachments.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {composeData.attachments.length} file(s) attached
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
                >
                  <Button
                    onClick={() =>
                      setComposeData({
                        to: "",
                        cc: "",
                        bcc: "",
                        subject: "",
                        body: "",
                        attachments: [],
                        priority: "normal",
                      })
                    }
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={handleSendEmail}
                    disabled={
                      loading || !composeData.to || !composeData.subject
                    }
                  >
                    {loading ? "Sending..." : "Send"}
                  </Button>
                </Box>
              </Box>
            </Card>
          </Box>
        );

      case 2: // Configuration
        return (
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Email Configuration
              </Typography>

              <Grid container spacing={3}>
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
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Password"
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    value={smtpConfig.password}
                    onChange={(e) =>
                      setSmtpConfig({ ...smtpConfig, password: e.target.value })
                    }
                    margin="normal"
                    variant="outlined"
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
                <Grid item xs={12}>
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
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={smtpConfig.secure}
                        onChange={(e) =>
                          setSmtpConfig({
                            ...smtpConfig,
                            secure: e.target.checked,
                          })
                        }
                        color="primary"
                      />
                    }
                    label="Use secure connection (SSL/TLS)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<Science />}
                    onClick={async () => {
                      setTesting(true);
                      try {
                        const response = await emailService.testEmailConnection(
                          smtpConfig
                        );
                        showSnackbar(
                          response.success
                            ? "Connection successful!"
                            : "Connection failed",
                          response.success ? "success" : "error"
                        );
                      } catch (error) {
                        showSnackbar("Connection test failed", "error");
                      } finally {
                        setTesting(false);
                      }
                    }}
                    disabled={
                      testing || !smtpConfig.user || !smtpConfig.password
                    }
                  >
                    {testing ? "Testing..." : "Test Connection"}
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title="Email Management"
      headerColor="#1976d2"
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Align the buttons to the right */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              padding: 2,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => setActiveTab(2)}
            >
              Settings
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCompose}
              sx={{ bgcolor: "#128C7E", "&:hover": { bgcolor: "#0f7a6e" } }}
            >
              Compose
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              icon={<Inbox />}
              iconPosition="start"
              label="Inbox"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<Outbox />}
              iconPosition="start"
              label="Compose"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<Settings />}
              iconPosition="start"
              label="Configuration"
              sx={{ minHeight: 64 }}
            />
          </Tabs>

          <Box sx={{ p: 3, flex: 1, overflow: "auto" }}>
            {renderTabContent()}
          </Box>
        </Card>

        {/* Email Detail Dialog */}
        <Dialog
          open={Boolean(selectedEmail)}
          onClose={() => setSelectedEmail(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">{selectedEmail?.subject}</Typography>
              <Box>
                <IconButton onClick={handleReply}>
                  <Reply />
                </IconButton>
                <IconButton>
                  <ReplyAll />
                </IconButton>
                <IconButton>
                  <Forward />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedEmail && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  From: {selectedEmail.from}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  To: {selectedEmail.to}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Date: {formatDate(selectedEmail.createdAt)}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {selectedEmail.body}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedEmail(null)}>Close</Button>
            <Button
              variant="contained"
              startIcon={<Reply />}
              onClick={handleReply}
            >
              Reply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ContentFrame>
  );
};

export default EmailView;
