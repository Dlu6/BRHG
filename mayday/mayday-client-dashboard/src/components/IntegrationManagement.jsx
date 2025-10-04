import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Snackbar,
} from "@mui/material";
import {
  Sync,
  Edit,
  Delete,
  PlayArrow,
  Stop,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchIntegrations,
  updateIntegration,
  deleteIntegration,
  syncIntegrationData,
  testIntegration,
} from "../features/integrations/integrationsSlice";

const IntegrationManagement = () => {
  const dispatch = useDispatch();
  const { integrations, loading, error } = useSelector(
    (state) => state.integrations
  );

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [syncLoading, setSyncLoading] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    dispatch(fetchIntegrations());
  }, [dispatch]);

  useEffect(() => {
    if (selectedIntegration) {
      const rawCfg = selectedIntegration.config;
      let cfg = {};
      if (typeof rawCfg === "string") {
        try {
          cfg = JSON.parse(rawCfg);
        } catch (_) {
          cfg = {};
        }
      } else {
        cfg = rawCfg || {};
      }
      setEditFormData(cfg);
    }
  }, [selectedIntegration]);

  const handleEdit = (integration) => {
    setSelectedIntegration(integration);
    setEditModalOpen(true);
  };

  const handleDelete = async (integration) => {
    if (
      window.confirm(
        `Are you sure you want to delete the integration "${integration.name}"?`
      )
    ) {
      try {
        await dispatch(deleteIntegration(integration.id)).unwrap();
        dispatch(fetchIntegrations());
      } catch (error) {
        console.error("Failed to delete integration:", error);
      }
    }
  };

  const handleSync = async (integration) => {
    setSyncLoading((prev) => ({ ...prev, [integration.id]: true }));
    try {
      await dispatch(syncIntegrationData({ id: integration.id })).unwrap();
      dispatch(fetchIntegrations());
    } catch (error) {
      console.error("Failed to sync integration:", error);
    } finally {
      setSyncLoading((prev) => ({ ...prev, [integration.id]: false }));
    }
  };

  const handleTest = async (integration) => {
    try {
      const result = await dispatch(testIntegration(integration.id)).unwrap();
      const ok = result?.result?.success ?? false;
      setSnackbar({
        open: true,
        severity: ok ? "success" : "error",
        message: ok
          ? "Connection test successful!"
          : `Connection test failed: ${
              result?.result?.error || "Unknown error"
            }`,
      });
    } catch (error) {
      setSnackbar({
        open: true,
        severity: "error",
        message: `Connection test failed: ${error.message}`,
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedIntegration) return;

    try {
      await dispatch(
        updateIntegration({
          id: selectedIntegration.id,
          updateData: {
            config: editFormData,
          },
        })
      ).unwrap();

      setEditModalOpen(false);
      setSelectedIntegration(null);
      dispatch(fetchIntegrations());
    } catch (error) {
      console.error("Failed to update integration:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "default";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle fontSize="small" />;
      case "inactive":
        return <Stop fontSize="small" />;
      case "error":
        return <Error fontSize="small" />;
      default:
        return <Warning fontSize="small" />;
    }
  };

  const formatLastSync = (lastSync) => {
    if (!lastSync) return "Never";
    return new Date(lastSync).toLocaleString();
  };

  const getIntegrationTypeLabel = (type) => {
    switch (type) {
      case "zoho":
        return "Zoho CRM";
      case "salesforce":
        return "Salesforce";
      case "hubspot":
        return "HubSpot";
      case "custom_api":
        return "Custom API";
      case "database":
        return "External Database";
      default:
        return type;
    }
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleFormChange = (fieldName, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
        <Typography variant="h5">Integration Management</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => dispatch(fetchIntegrations())}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {integrations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Integrations Configured
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You haven't set up any third-party integrations yet. Use the setup
              wizard to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Sync</TableCell>
                <TableCell>Error Message</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {integration.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getIntegrationTypeLabel(integration.type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {getStatusIcon(integration.status)}
                      <Chip
                        label={integration.status}
                        size="small"
                        color={getStatusColor(integration.status)}
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatLastSync(integration.lastSync)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {integration.errorMessage ? (
                      <Typography
                        variant="body2"
                        color="error"
                        sx={{ maxWidth: 200 }}
                      >
                        {integration.errorMessage}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No errors
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{ display: "flex", gap: 1, justifyContent: "center" }}
                    >
                      <Tooltip title="Test Connection">
                        <IconButton
                          size="small"
                          onClick={() => handleTest(integration)}
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Sync Data">
                        <IconButton
                          size="small"
                          onClick={() => handleSync(integration)}
                          disabled={syncLoading[integration.id]}
                        >
                          {syncLoading[integration.id] ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Sync />
                          )}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Configuration">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(integration)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete Integration">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(integration)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Configuration Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit {selectedIntegration?.name} Configuration
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Update the configuration settings for your integration. Be careful
            when changing these settings as they may affect the connection.
          </Typography>

          {selectedIntegration && (
            <Box
              component="form"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              {Object.entries(editFormData).map(([key, value]) => (
                <TextField
                  key={key}
                  fullWidth
                  label={key}
                  value={value}
                  onChange={(e) => handleFormChange(key, e.target.value)}
                  margin="normal"
                  type={
                    key.toLowerCase().includes("password") ||
                    key.toLowerCase().includes("token") ||
                    key.toLowerCase().includes("secret")
                      ? showPasswords[key]
                        ? "text"
                        : "password"
                      : "text"
                  }
                  InputProps={{
                    endAdornment:
                      key.toLowerCase().includes("password") ||
                      key.toLowerCase().includes("token") ||
                      key.toLowerCase().includes("secret") ? (
                        <IconButton
                          onClick={() => togglePasswordVisibility(key)}
                          edge="end"
                        >
                          {showPasswords[key] ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      ) : undefined,
                  }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IntegrationManagement;
