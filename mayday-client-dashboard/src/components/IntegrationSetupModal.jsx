import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Close,
  CheckCircle,
  Error,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchIntegrationTemplates,
  createIntegration,
  testIntegration,
  clearError,
} from "../features/integrations/integrationsSlice";

const IntegrationSetupModal = ({ open, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { templates, templatesLoading, error } = useSelector(
    (state) => state.integrations
  );

  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [integrationName, setIntegrationName] = useState("");

  const steps = [
    "Choose Integration",
    "Configure Settings",
    "Test Connection",
    "Complete Setup",
  ];

  useEffect(() => {
    if (open) {
      dispatch(fetchIntegrationTemplates());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (selectedTemplate) {
      // Initialize form data with template defaults
      const initialData = {};
      selectedTemplate.fields.forEach((field) => {
        initialData[field.name] = field.default || "";
      });
      setFormData(initialData);
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setActiveStep(1);
  };

  const handleFormChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleTestConnection = async () => {
    if (!selectedTemplate || !integrationName) return;

    const integrationData = {
      name: integrationName,
      type: selectedTemplate.type,
      config: formData,
    };

    try {
      const result = await dispatch(
        createIntegration(integrationData)
      ).unwrap();
      if (result.success) {
        const testResult = await dispatch(
          testIntegration(result.data.id)
        ).unwrap();
        setTestResult(testResult);
        setActiveStep(3);
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
  };

  const handleComplete = () => {
    onSuccess?.();
    handleClose();
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedTemplate(null);
    setFormData({});
    setShowPasswords({});
    setTestResult(null);
    setIntegrationName("");
    dispatch(clearError());
    onClose();
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose an Integration Type
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select the type of integration you want to set up. Each
              integration type has specific configuration requirements.
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(templates).map(([key, template]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent>
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
                        <Typography variant="h6">{template.name}</Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                      >
                        {template.description}
                      </Typography>
                      <Chip
                        label={
                          template.type === "zoho" ||
                          template.type === "salesforce" ||
                          template.type === "hubspot"
                            ? "CRM Integration"
                            : template.type === "custom_api"
                            ? "API Integration"
                            : "Database Integration"
                        }
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure {selectedTemplate?.name} Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter the required configuration details for your{" "}
              {selectedTemplate?.name} integration.
            </Typography>

            <TextField
              fullWidth
              label="Integration Name"
              value={integrationName}
              onChange={(e) => setIntegrationName(e.target.value)}
              margin="normal"
              required
              helperText="Give your integration a descriptive name"
            />

            {selectedTemplate?.fields.map((field) => (
              <Box key={field.name} sx={{ mt: 2 }}>
                {field.type === "select" ? (
                  <FormControl fullWidth>
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      value={formData[field.name] || ""}
                      label={field.label}
                      onChange={(e) =>
                        handleFormChange(field.name, e.target.value)
                      }
                      required={field.required}
                    >
                      {field.options.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : field.type === "password" ? (
                  <TextField
                    fullWidth
                    label={field.label}
                    type={showPasswords[field.name] ? "text" : "password"}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleFormChange(field.name, e.target.value)
                    }
                    required={field.required}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => togglePasswordVisibility(field.name)}
                          edge="end"
                        >
                          {showPasswords[field.name] ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      ),
                    }}
                  />
                ) : field.type === "number" ? (
                  <TextField
                    fullWidth
                    label={field.label}
                    type="number"
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleFormChange(field.name, e.target.value)
                    }
                    required={field.required}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label={field.label}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleFormChange(field.name, e.target.value)
                    }
                    required={field.required}
                    helperText={field.helperText}
                  />
                )}
              </Box>
            ))}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Test Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We'll test the connection to your {selectedTemplate?.name}{" "}
              integration to ensure everything is configured correctly.
            </Typography>

            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Testing connection...
              </Typography>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Setup Complete
            </Typography>

            {testResult?.success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <CheckCircle sx={{ mr: 1, verticalAlign: "middle" }} />
                  Connection test successful! Your {selectedTemplate?.name}{" "}
                  integration is ready to use.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <Error sx={{ mr: 1, verticalAlign: "middle" }} />
                  Connection test failed: {testResult?.error || "Unknown error"}
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              You can now sync data from your {selectedTemplate?.name}{" "}
              integration and view it in your reports dashboard.
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (activeStep === 1) {
      // Validate form data
      const requiredFields =
        selectedTemplate?.fields.filter((f) => f.required) || [];
      const missingFields = requiredFields.filter((f) => !formData[f.name]);

      if (missingFields.length > 0 || !integrationName) {
        return;
      }

      setActiveStep(2);
      handleTestConnection();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const canProceed = () => {
    if (activeStep === 0) return selectedTemplate;
    if (activeStep === 1) {
      const requiredFields =
        selectedTemplate?.fields.filter((f) => f.required) || [];
      const missingFields = requiredFields.filter((f) => !formData[f.name]);
      return integrationName && missingFields.length === 0;
    }
    return true;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Setup Third-Party Integration</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {templatesLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          renderStepContent()
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < 2 && (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!canProceed()}
          >
            {activeStep === 1 ? "Test Connection" : "Next"}
          </Button>
        )}
        {activeStep === 3 && (
          <Button onClick={handleComplete} variant="contained">
            Complete Setup
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default IntegrationSetupModal;
