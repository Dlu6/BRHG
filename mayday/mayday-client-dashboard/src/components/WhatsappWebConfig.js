import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  Key as KeyIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Article as TemplateIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import apiClient from "../api/apiClient";

const CreateTemplateDialog = ({ open, onClose, onSubmit }) => {
  const theme = useTheme();
  const [template, setTemplate] = useState({
    friendly_name: "general_message",
    language: "en",
    category: "UTILITY",
    variables: { 1: "Hello! How are you today?" },
    types: {
      "twilio/text": {
        body: "{{1}}",
      },
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(template);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.1
          )} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          >
            <TemplateIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="600">
              Create Chat Template
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Design a new WhatsApp message template
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a template for your WhatsApp messages. This template will be
          used for general chat messages and must comply with WhatsApp policies.
        </Typography>

        <TextField
          fullWidth
          label="Template Name"
          value={template.friendly_name}
          onChange={(e) =>
            setTemplate((prev) => ({ ...prev, friendly_name: e.target.value }))
          }
          margin="normal"
          helperText="Use lowercase letters, numbers, and underscores only. Example: general_message"
          InputProps={{
            startAdornment: (
              <TemplateIcon sx={{ mr: 1, color: "action.active" }} />
            ),
            sx: { borderRadius: 2 },
          }}
        />

        <TextField
          fullWidth
          label="Sample Message"
          value={template.variables["1"]}
          onChange={(e) =>
            setTemplate((prev) => ({
              ...prev,
              variables: { 1: e.target.value },
            }))
          }
          margin="normal"
          multiline
          rows={3}
          helperText="Example message that will be sent. Example: Hello! How are you today?"
          InputProps={{
            sx: { borderRadius: 2 },
          }}
        />

        <Alert
          severity="info"
          sx={{
            mt: 3,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}
          icon={<CheckCircleIcon />}
        >
          <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>
            Template Guidelines:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, "& li": { mb: 0.5 } }}>
            <li>Keep messages simple and conversational</li>
            <li>Avoid promotional content</li>
            <li>Use proper grammar and punctuation</li>
            <li>Template will be used for general chat messages</li>
          </Box>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            "&:hover": {
              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            },
          }}
        >
          Create Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const WhatsappWebConfig = () => {
  const theme = useTheme();
  const [whatsappConfig, setWhatsappConfig] = useState({
    apiKey: "",
    phoneNumber: "",
    enabled: false,
    webhookUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    fetchWhatsAppConfig();
    fetchTemplates();
  }, []);

  const fetchWhatsAppConfig = async () => {
    try {
      const response = await apiClient.get(
        "/whatsapp/integrations/whatsapp/config"
      );
      if (response.data.success) {
        setWhatsappConfig(response.data.data);
        setOriginalConfig(response.data.data);
      }
    } catch (error) {
      setError(
        error.response?.data?.error || "Failed to load WhatsApp configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/whatsapp/templates");
      if (response.data.success) {
        setTemplates(response.data.data);
      } else {
        setError(response.data.error || "Failed to load templates");
      }
    } catch (error) {
      console.error("Template fetch error:", error);
      setError(error.response?.data?.error || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!originalConfig) return false;
    return (
      (originalConfig.apiKey || "") !== (whatsappConfig.apiKey || "") ||
      (originalConfig.phoneNumber || "") !==
        (whatsappConfig.phoneNumber || "") ||
      (originalConfig.enabled || false) !== (whatsappConfig.enabled || false) ||
      (originalConfig.webhookUrl || "") !== (whatsappConfig.webhookUrl || "")
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiClient.post(
        "/whatsapp/integrations/whatsappConfig",
        whatsappConfig
      );

      if (response.data.success) {
        setSuccess(true);
        setOriginalConfig(whatsappConfig);
      } else {
        setError(response.data.error || "Failed to save configuration");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (event) => {
    setWhatsappConfig((prev) => ({
      ...prev,
      [field]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      const response = await apiClient.post(
        "/whatsapp/templates",
        templateData
      );
      if (response.data.success) {
        setTemplateDialogOpen(false);
        fetchTemplates(); // Refresh templates list
        setError(null);
      } else {
        setError(response.data.error || "Failed to create template");
      }
    } catch (error) {
      console.error("Template creation error:", error);
      setError(error.response?.data?.error || "Failed to create template");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      setLoading(true);
      await apiClient.delete(`/whatsapp/templates/${templateId}`);
      await fetchTemplates(); // Refresh the list
      setError(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      setError(error.response?.data?.error || "Failed to delete template");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmation = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (templateToDelete) {
      await handleDeleteTemplate(templateToDelete.sid);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        margin: "0 auto",
        p: 4,
        backgroundColor: "#fafafa",
        minHeight: "100vh",
      }}
    >
      {/* Enhanced Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 3,
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={3}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: alpha("#25D366", 0.1),
              color: "#25D366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight="700" sx={{ mb: 1 }}>
              WhatsApp Integration
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 300 }}
            >
              Configure your Twilio WhatsApp business account for seamless
              messaging
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip
                icon={<SecurityIcon />}
                label="Secure Messaging"
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                  fontWeight: 600,
                  "& .MuiChip-icon": { color: theme.palette.success.main },
                }}
              />
              <Chip
                icon={<SettingsIcon />}
                label="Easy Setup"
                sx={{
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontWeight: 600,
                  "& .MuiChip-icon": { color: theme.palette.info.main },
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Configuration Card */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
          mb: 4,
        }}
      >
        {/* Status Header */}
        <Box
          sx={{
            p: 3,
            backgroundColor: whatsappConfig.enabled
              ? alpha("#25D366", 0.05)
              : alpha(theme.palette.grey[500], 0.05),
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={3}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  backgroundColor: whatsappConfig.enabled
                    ? alpha("#25D366", 0.1)
                    : alpha(theme.palette.grey[500], 0.1),
                  color: whatsappConfig.enabled
                    ? "#25D366"
                    : theme.palette.grey[500],
                  transition: "all 0.3s ease",
                }}
              >
                {whatsappConfig.enabled ? <CheckCircleIcon /> : <ErrorIcon />}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="600">
                  Integration Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {whatsappConfig.enabled
                    ? "WhatsApp integration is active and ready to use"
                    : "Enable WhatsApp integration to start messaging"}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={whatsappConfig.enabled}
                    onChange={handleChange("enabled")}
                    color="success"
                    size="large"
                  />
                }
                label={
                  <Typography variant="h6" fontWeight="600" sx={{ ml: 1 }}>
                    {whatsappConfig.enabled ? "Active" : "Inactive"}
                  </Typography>
                }
              />
            </Stack>
            <Tooltip title="Refresh Configuration">
              <IconButton
                onClick={fetchWhatsAppConfig}
                disabled={loading}
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                  animation: loading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h6"
            fontWeight="600"
            sx={{ mb: 3, display: "flex", alignItems: "center" }}
          >
            <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
            Connection Credentials
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lipachat API Key"
                type={showAuthToken ? "text" : "password"}
                value={whatsappConfig.apiKey}
                onChange={handleChange("apiKey")}
                variant="outlined"
                disabled={!whatsappConfig.enabled}
                InputProps={{
                  startAdornment: (
                    <KeyIcon sx={{ mr: 1, color: "action.active" }} />
                  ),
                  sx: {
                    borderRadius: 2,
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      edge="end"
                      size="small"
                      disabled={!whatsappConfig.enabled}
                    >
                      {showAuthToken ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
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
                label="WhatsApp Business Number"
                value={whatsappConfig.phoneNumber}
                onChange={handleChange("phoneNumber")}
                variant="outlined"
                helperText="Include country code (e.g., +1234567890)"
                disabled={!whatsappConfig.enabled}
                InputProps={{
                  startAdornment: (
                    <PhoneIcon sx={{ mr: 1, color: "action.active" }} />
                  ),
                  sx: {
                    borderRadius: 2,
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              {/* Slot intentionally left blank (previous Twilio field replaced by number above) */}
            </Grid>

            <Grid item xs={12} md={6}>
              {/* Content SID removed for Lipachat */}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Webhook URL"
                value={whatsappConfig.webhookUrl}
                onChange={handleChange("webhookUrl")}
                variant="outlined"
                helperText="Set this in Lipachat to: https://your-domain/api/whatsapp/webhook"
                disabled={!whatsappConfig.enabled}
                InputProps={{
                  startAdornment: (
                    <LinkIcon sx={{ mr: 1, color: "action.active" }} />
                  ),
                  sx: {
                    borderRadius: 2,
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          {(error || success) && (
            <Box sx={{ mt: 4 }}>
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.error.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                    "& .MuiAlert-icon": { fontSize: 24 },
                  }}
                  icon={<ErrorIcon />}
                >
                  <Typography variant="body1" fontWeight="500">
                    {error}
                  </Typography>
                </Alert>
              )}
              {success && (
                <Alert
                  severity="success"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.05),
                    border: `1px solid ${alpha(
                      theme.palette.success.main,
                      0.1
                    )}`,
                    "& .MuiAlert-icon": { fontSize: 24 },
                  }}
                  icon={<CheckCircleIcon />}
                >
                  <Typography variant="body1" fontWeight="500">
                    Configuration saved successfully!
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={fetchWhatsAppConfig}
              disabled={saving}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
              }}
            >
              <RefreshIcon sx={{ mr: 1 }} />
              Reset to Saved
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !hasChanges() || !whatsappConfig.enabled}
              startIcon={
                saving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "1rem",
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                "&:hover": {
                  background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                },
                "&:disabled": {
                  background: theme.palette.grey[300],
                  color: theme.palette.grey[500],
                },
              }}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Templates Section */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Templates Header */}
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              >
                <TemplateIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="600">
                  WhatsApp Templates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your message templates for WhatsApp business messaging
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button
                startIcon={
                  loading ? <CircularProgress size={20} /> : <RefreshIcon />
                }
                variant="outlined"
                onClick={fetchTemplates}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => setTemplateDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  "&:hover": {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  },
                }}
              >
                Create Template
              </Button>
            </Stack>
          </Stack>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.error.main, 0.05),
                border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
              }}
            >
              {error}
            </Alert>
          )}

          {templates.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                backgroundColor: alpha(theme.palette.grey[500], 0.03),
                borderRadius: 2,
                border: "2px dashed rgba(0,0,0,0.1)",
              }}
            >
              <TemplateIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No templates found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first WhatsApp message template to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTemplateDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Create Your First Template
              </Button>
            </Paper>
          ) : (
            <Stack spacing={3}>
              {templates.map((template) => (
                <Card
                  key={template.sid}
                  sx={{
                    p: 0,
                    borderRadius: 2,
                    border: "1px solid rgba(0,0,0,0.06)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Stack direction="row" spacing={3} alignItems="center">
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor:
                            template.status === "active"
                              ? alpha(theme.palette.success.main, 0.1)
                              : template.status === "pending"
                              ? alpha(theme.palette.warning.main, 0.1)
                              : alpha(theme.palette.error.main, 0.1),
                          color:
                            template.status === "active"
                              ? theme.palette.success.main
                              : template.status === "pending"
                              ? theme.palette.warning.main
                              : theme.palette.error.main,
                        }}
                      >
                        {template.status === "active" && <CheckCircleIcon />}
                        {template.status === "pending" && <WarningIcon />}
                        {template.status === "rejected" && <ErrorIcon />}
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          fontWeight="600"
                          sx={{ mb: 0.5 }}
                        >
                          {template.name}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {template.category} • {template.language}
                          </Typography>
                          <Chip
                            size="small"
                            label={template.status.toUpperCase()}
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              backgroundColor:
                                template.status === "active"
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : template.status === "pending"
                                  ? alpha(theme.palette.warning.main, 0.1)
                                  : alpha(theme.palette.error.main, 0.1),
                              color:
                                template.status === "active"
                                  ? theme.palette.success.main
                                  : template.status === "pending"
                                  ? theme.palette.warning.main
                                  : theme.palette.error.main,
                            }}
                          />
                        </Stack>
                        {template.status === "rejected" &&
                          template.rejection_reason && (
                            <Alert
                              severity="error"
                              sx={{
                                mt: 1,
                                backgroundColor: alpha(
                                  theme.palette.error.main,
                                  0.05
                                ),
                                border: `1px solid ${alpha(
                                  theme.palette.error.main,
                                  0.1
                                )}`,
                                "& .MuiAlert-message": { fontSize: "0.875rem" },
                              }}
                            >
                              <Typography variant="body2" fontWeight="500">
                                Rejection reason: {template.rejection_reason}
                              </Typography>
                            </Alert>
                          )}
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant={
                            whatsappConfig.contentSid === template.sid
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() => {
                            setWhatsappConfig((prev) => ({
                              ...prev,
                              contentSid: template.sid,
                            }));
                          }}
                          color={
                            whatsappConfig.contentSid === template.sid
                              ? "success"
                              : "primary"
                          }
                          startIcon={
                            whatsappConfig.contentSid === template.sid ? (
                              <CheckCircleIcon />
                            ) : null
                          }
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                          }}
                        >
                          {whatsappConfig.contentSid === template.sid
                            ? "Selected"
                            : "Select"}
                        </Button>
                        <IconButton
                          onClick={() => handleDeleteConfirmation(template)}
                          disabled={loading}
                          sx={{
                            color: theme.palette.error.main,
                            backgroundColor: alpha(
                              theme.palette.error.main,
                              0.1
                            ),
                            "&:hover": {
                              backgroundColor: alpha(
                                theme.palette.error.main,
                                0.2
                              ),
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <CreateTemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSubmit={handleCreateTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.error.main,
              0.1
            )} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              }}
            >
              <WarningIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="600">
                Confirm Template Deletion
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This action cannot be undone
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              backgroundColor: alpha(theme.palette.warning.main, 0.05),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
            }}
          >
            <Typography variant="body1">
              Are you sure you want to delete the template{" "}
              <strong>&quot;{templateToDelete?.name}&quot;</strong>?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              This action cannot be undone and the template will be permanently
              removed.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirmed}
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DeleteIcon />
              )
            }
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              backgroundColor: theme.palette.error.main,
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            }}
          >
            {loading ? "Deleting..." : "Delete Template"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhatsappWebConfig;
