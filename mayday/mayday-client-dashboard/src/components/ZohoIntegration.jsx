import apiClient from "../api/apiClient";
import React, { useState, useEffect, useCallback } from "react";
import ZohoTokenGenerator from "./ZohoTokenGenerator.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  TablePagination,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stack,
  LinearProgress,
} from "@mui/material";
import Sync from "@mui/icons-material/Sync";
import Add from "@mui/icons-material/Add";
import Close from "@mui/icons-material/Close";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import Warning from "@mui/icons-material/Warning";
import Phone from "@mui/icons-material/Phone";
import Edit from "@mui/icons-material/Edit";
import Done from "@mui/icons-material/Done";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Call from "@mui/icons-material/Call";
import Email from "@mui/icons-material/Email";
import Business from "@mui/icons-material/Business";
import Person from "@mui/icons-material/Person";
import AttachMoney from "@mui/icons-material/AttachMoney";
import Key from "@mui/icons-material/Key";

const ZohoIntegration = () => {
  const [integration, setIntegration] = useState(null);
  const [data, setData] = useState({
    leads: [],
    contacts: [],
    deals: [],
    loading: false,
    error: null,
  });
  const [syncStatus, setSyncStatus] = useState({
    lastSync: null,
    syncInProgress: false,
    error: null,
  });
  const [selectedTab, setSelectedTab] = useState(0);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState("all");
  const [showTokenGenerator, setShowTokenGenerator] = useState(false);

  const [formConfig, setFormConfig] = useState({
    baseUrl: "https://www.zohoapis.com",
    accessToken: "",
    refreshToken: "",
    clientId: "",
    clientSecret: "",
  });

  const handleFormChange = (field, value) => {
    setFormConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Per-table pagination state
  const [pagination, setPagination] = useState({
    leads: { page: 0, rowsPerPage: 25 },
    contacts: { page: 0, rowsPerPage: 25 },
    deals: { page: 0, rowsPerPage: 25 },
  });

  const handleChangePage = (type, newPage) => {
    setPagination((prev) => ({
      ...prev,
      [type]: { ...prev[type], page: newPage },
    }));
  };

  const handleChangeRowsPerPage = (type, newRowsPerPage) => {
    const value = parseInt(newRowsPerPage, 10);
    setPagination((prev) => ({
      ...prev,
      [type]: { page: 0, rowsPerPage: value },
    }));
  };

  // Fetch Zoho data
  const fetchData = useCallback(async (integrationId) => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

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
        const responseData = response.data;
        setData({
          leads: responseData.filter((item) => item.dataType === "leads"),
          contacts: responseData.filter((item) => item.dataType === "contacts"),
          deals: responseData.filter((item) => item.dataType === "deals"),
          loading: false,
          error: null,
        });
      } else {
        throw new Error("Failed to fetch Zoho data");
      }
    } catch (error) {
      setData((prev) => ({ ...prev, loading: false, error: error.message }));
    }
  }, []);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async (integrationId) => {
    try {
      const response = await apiClient.get(`/integrations/${integrationId}`, {
        headers: {
          "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
        },
      });

      if (response.status === 200) {
        const integration = response.data;
        setSyncStatus({
          lastSync: integration.lastSync,
          syncInProgress: false,
          error: integration.errorMessage,
        });
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  }, []);

  // Fetch Zoho integration
  const fetchIntegration = useCallback(async () => {
    try {
      const response = await apiClient.get("/integrations?type=zoho", {
        headers: {
          "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
        },
      });

      if (response.status === 200) {
        const integrations = response.data.data;
        const zohoIntegration = integrations.find(
          (integration) => integration.type === "zoho"
        );
        setIntegration(zohoIntegration);

        if (zohoIntegration) {
          // Prefill form with existing config
          const rawCfg = zohoIntegration.config;
          const cfg =
            typeof rawCfg === "string"
              ? (() => {
                  try {
                    return JSON.parse(rawCfg);
                  } catch (_) {
                    return {};
                  }
                })()
              : rawCfg || {};

          setFormConfig((prev) => ({
            baseUrl: cfg.baseUrl || prev.baseUrl,
            accessToken: cfg.accessToken || "",
            refreshToken: cfg.refreshToken || "",
            clientId: cfg.clientId || "",
            clientSecret: cfg.clientSecret || "",
          }));
          await fetchData(zohoIntegration.id);
          await fetchSyncStatus(zohoIntegration.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch Zoho integration:", error);
    }
  }, [fetchData, fetchSyncStatus]);

  // Sync Zoho data
  const syncData = useCallback(
    async (integrationId, dataType = "all") => {
      setSyncStatus((prev) => ({ ...prev, syncInProgress: true, error: null }));

      try {
        const response = await apiClient.post(
          `/integrations/${integrationId}/sync`,
          { dataType },
          {
            headers: {
              "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
            },
            // Zoho sync can take a while; extend timeout to 5 minutes
            timeout: 300000,
          }
        );

        if (response.status === 200) {
          await fetchData(integrationId);
          await fetchSyncStatus(integrationId);
          setSyncModalOpen(false);
        } else {
          throw new Error("Failed to sync Zoho data");
        }
      } catch (error) {
        const isTimeout =
          (error && error.code === "ECONNABORTED") ||
          /timeout/i.test(error?.message || "");
        setSyncStatus((prev) => ({
          ...prev,
          syncInProgress: false,
          error: isTimeout
            ? "Sync is still running on the server. We'll refresh shortly."
            : error.message,
        }));
        // If the request timed out, the server may still be syncing.
        // Attempt a delayed refresh to pull results once available.
        if (isTimeout) {
          setTimeout(async () => {
            await fetchData(integrationId);
            await fetchSyncStatus(integrationId);
          }, 7000);
        }
      }
    },
    [fetchData, fetchSyncStatus]
  );

  // Test connection and attempt activation on the server
  const testConnection = useCallback(
    async (integrationId) => {
      try {
        const response = await apiClient.post(
          `/integrations/${integrationId}/test`,
          {},
          {
            headers: {
              "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
            },
          }
        );
        const ok = response.status === 200 && (response.data?.success ?? true);
        if (ok) {
          await fetchIntegration();
        }
      } catch (error) {
        console.error("Test connection failed:", error);
      }
    },
    [fetchIntegration]
  );

  // Save updated configuration for an existing integration
  const saveConfiguration = useCallback(async () => {
    if (!integration?.id) return;
    try {
      const response = await apiClient.put(
        `/integrations/${integration.id}`,
        { config: formConfig },
        {
          headers: {
            "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
          },
        }
      );
      if (response.status === 200 && (response.data?.success ?? true)) {
        await fetchIntegration();
        setConfigModalOpen(false);
      } else {
        console.error("Failed to save configuration", response.data);
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
  }, [integration, formConfig, fetchIntegration]);

  // Delete the current integration
  const deleteIntegration = useCallback(async () => {
    if (!integration?.id) return;
    const ok = window.confirm(
      "Delete Zoho integration? This cannot be undone."
    );
    if (!ok) return;
    try {
      const response = await apiClient.delete(
        `/integrations/${integration.id}`,
        {
          headers: {
            "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
          },
        }
      );
      if (response.status === 200 && (response.data?.success ?? true)) {
        setIntegration(null);
        setData({
          leads: [],
          contacts: [],
          deals: [],
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      console.error("Failed to delete integration:", err);
    }
  }, [integration]);

  // Setup Zoho integration
  const setupIntegration = useCallback(
    async (config) => {
      try {
        const response = await apiClient.post(
          "/integrations",
          {
            name: "Zoho CRM Integration",
            type: "zoho",
            config,
          },
          {
            headers: {
              "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
            },
          }
        );

        const ok = response.status === 200 || response.status === 201;
        if (ok && (response.data?.success ?? true)) {
          const created = response.data?.data;
          if (created?.id) {
            await testConnection(created.id);
          }
          await fetchIntegration();
          setSetupModalOpen(false);
        } else {
          const message =
            response.data?.error || "Failed to setup Zoho integration";
          throw new Error(message);
        }
      } catch (error) {
        console.error("Failed to setup integration:", error);
      }
    },
    [fetchIntegration, testConnection]
  );

  // Load data on component mount
  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  // Inline editing state for phone numbers
  const [editValues, setEditValues] = useState({}); // key: `${type}:${externalId}` => value
  const [savingKeys, setSavingKeys] = useState(new Set());
  const [editingKeys, setEditingKeys] = useState(new Set());

  const getItemExternalId = (item) => {
    if (item?.externalId) return item.externalId;
    try {
      const d =
        typeof item.data === "string" ? JSON.parse(item.data) : item.data || {};
      return d.id || d.ID || d.Id;
    } catch (_) {
      return undefined;
    }
  };

  const updateLocalPhone = (type, externalId, newPhone) => {
    setData((prev) => {
      const list = prev[type] || [];
      const updated = list.map((rec) => {
        const recId = getItemExternalId(rec);
        if (recId !== externalId) return rec;
        let dataObj = rec.data;
        if (typeof dataObj === "string") {
          try {
            dataObj = JSON.parse(dataObj);
          } catch (_) {
            dataObj = {};
          }
        }
        const merged = { ...dataObj, Phone: newPhone };
        return {
          ...rec,
          data: typeof rec.data === "string" ? JSON.stringify(merged) : merged,
        };
      });
      return { ...prev, [type]: updated };
    });
  };

  const savePhone = async (type, item, value) => {
    if (!integration?.id) return;
    const externalId = getItemExternalId(item);
    if (!externalId) return;
    const key = `${type}:${externalId}`;
    setSavingKeys((prev) => new Set([...Array.from(prev), key]));
    try {
      await apiClient.put(
        `/integrations/${integration.id}/data/${type}/${externalId}`,
        { updates: { Phone: value } },
        {
          headers: {
            "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
          },
        }
      );
      updateLocalPhone(type, externalId, value);
      // exit edit mode and clear temp value
      setEditingKeys((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(key);
        return next;
      });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e) {
      console.error("Failed to save phone:", e);
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(key);
        return next;
      });
    }
  };

  // Normalize to UG format: 0XXXXXXXXX (10 digits)
  const normalizeUgNumber = (raw) => {
    if (!raw) return "";
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    // If starts with country code 256 and length >= 11-12, convert to local 0XXXXXXXXX
    if (digits.startsWith("256") && digits.length >= 11) {
      const local = digits.slice(3);
      return `0${local.replace(/^0+/, "")}`.slice(0, 10);
    }
    // If already starts with 0 and length >=10, take first 10
    if (digits.startsWith("0")) {
      return digits.slice(0, 10);
    }
    // Fallback: pad to 10 by prefixing 0 if length 9
    if (digits.length === 9) {
      return `0${digits}`;
    }
    return digits;
  };

  const dialWithSoftphone = (rawNumber) => {
    const number = normalizeUgNumber(rawNumber);
    if (!number) return;
    try {
      // Populate the softphone input only; user will press Call to initiate
      window.postMessage({ type: "reachmi:populate", number }, "*");
    } catch (_) {}
  };

  const startEditingPhone = (type, item) => {
    const externalId = getItemExternalId(item);
    if (!externalId) return;
    const key = `${type}:${externalId}`;
    // Preload current value
    try {
      let recordData = item.data;
      if (typeof recordData === "string") recordData = JSON.parse(recordData);
      const current = recordData?.Phone || "";
      setEditValues((prev) => ({ ...prev, [key]: current }));
    } catch (_) {}
    setEditingKeys((prev) => new Set([...Array.from(prev), key]));
  };

  const cancelEditingPhone = (type, item) => {
    const externalId = getItemExternalId(item);
    if (!externalId) return;
    const key = `${type}:${externalId}`;
    setEditingKeys((prev) => {
      const next = new Set(Array.from(prev));
      next.delete(key);
      return next;
    });
    setEditValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "completed":
        return "success";
      case "inactive":
      case "failed":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "completed":
        return <CheckCircle />;
      case "inactive":
      case "failed":
        return <ErrorIcon />;
      case "pending":
        return <Warning />;
      default:
        return <Warning />;
    }
  };

  // Render data table
  const renderDataTable = (data, type) => {
    const columns = {
      leads: [
        { field: "Full_Name", label: "Name", icon: <Person /> },
        { field: "Email", label: "Email", icon: <Email /> },
        { field: "Phone", label: "Phone", icon: <Phone /> },
        { field: "Company", label: "Company", icon: <Business /> },
        { field: "Lead_Status", label: "Status", icon: null },
      ],
      contacts: [
        { field: "Full_Name", label: "Name", icon: <Person /> },
        { field: "Email", label: "Email", icon: <Email /> },
        { field: "Phone", label: "Phone", icon: <Phone /> },
        { field: "Account_Name", label: "Account", icon: <Business /> },
        { field: "Lead_Source", label: "Source", icon: null },
      ],
      deals: [
        { field: "Deal_Name", label: "Deal Name", icon: <AttachMoney /> },
        { field: "Account_Name", label: "Account", icon: <Business /> },
        { field: "Amount", label: "Amount", icon: <AttachMoney /> },
        { field: "Stage", label: "Stage", icon: null },
        { field: "Closing_Date", label: "Closing Date", icon: null },
      ],
    };

    const tableColumns = columns[type] || [];

    const { page, rowsPerPage } = pagination[type] || {
      page: 0,
      rowsPerPage: 25,
    };
    const startIndex = rowsPerPage === -1 ? 0 : page * rowsPerPage;
    const endIndex =
      rowsPerPage === -1 ? data.length : startIndex + rowsPerPage;
    const pageData =
      rowsPerPage === -1 ? data : data.slice(startIndex, endIndex);

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    #
                  </Typography>
                </Box>
              </TableCell>
              {tableColumns.map((column, index) => (
                <TableCell key={index}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {column.icon}
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {column.label}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2">
                    {startIndex + index + 1}.
                  </Typography>
                </TableCell>
                {tableColumns.map((column, colIndex) => (
                  <TableCell key={colIndex}>
                    {column.field === "Lead_Status" ||
                    column.field === "Stage" ? (
                      <Chip
                        label={
                          (typeof item.data === "string"
                            ? (() => {
                                try {
                                  return JSON.parse(item.data)[column.field];
                                } catch (_) {
                                  return undefined;
                                }
                              })()
                            : item.data?.[column.field]) || "N/A"
                        }
                        size="small"
                        color={getStatusColor(
                          typeof item.data === "string"
                            ? (() => {
                                try {
                                  return JSON.parse(item.data)[column.field];
                                } catch (_) {
                                  return undefined;
                                }
                              })()
                            : item.data?.[column.field]
                        )}
                        variant="outlined"
                      />
                    ) : (
                      (() => {
                        let recordData = item.data;
                        if (typeof recordData === "string") {
                          try {
                            recordData = JSON.parse(recordData);
                          } catch (_) {
                            recordData = {};
                          }
                        }
                        const value = recordData[column.field];

                        // Editable Phone field for leads/contacts with explicit edit mode
                        if (
                          column.field === "Phone" &&
                          (type === "contacts" || type === "leads")
                        ) {
                          const externalId = getItemExternalId(item);
                          const key = `${type}:${externalId}`;
                          const isSaving = savingKeys.has(key);
                          const isEditing = editingKeys.has(key);
                          const displayVal = editValues[key] ?? (value || "");

                          if (isEditing) {
                            return (
                              <TextField
                                size="small"
                                variant="outlined"
                                value={displayVal}
                                onChange={(e) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    savePhone(type, item, displayVal);
                                  } else if (e.key === "Escape") {
                                    cancelEditingPhone(type, item);
                                  }
                                }}
                                placeholder="Enter phone"
                                disabled={isSaving}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Phone fontSize="small" />
                                    </InputAdornment>
                                  ),
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      {isSaving ? (
                                        <CircularProgress size={16} />
                                      ) : (
                                        <>
                                          <Tooltip title="Save (Enter)">
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                savePhone(
                                                  type,
                                                  item,
                                                  displayVal
                                                )
                                              }
                                              aria-label="save phone"
                                            >
                                              <Done fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Cancel (Esc)">
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                cancelEditingPhone(type, item)
                                              }
                                              aria-label="cancel edit"
                                            >
                                              <Close fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            );
                          }

                          // Read-only display with fixed-width action area (even spacing) and a single phone action icon
                          return (
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: "monospace",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  flexGrow: 1,
                                  mr: 1,
                                }}
                              >
                                {value || "N/A"}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: 108,
                                  flexShrink: 0,
                                }}
                              >
                                <Tooltip title="Mayday Call">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (value) dialWithSoftphone(value);
                                      }}
                                      aria-label="call"
                                      disabled={!value}
                                    >
                                      <Call fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Copy">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!value) return;
                                        try {
                                          await navigator.clipboard.writeText(
                                            value
                                          );
                                        } catch (_) {}
                                      }}
                                      aria-label="copy"
                                      disabled={!value}
                                    >
                                      <ContentCopy fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingPhone(type, item);
                                    }}
                                    aria-label="edit"
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          );
                        }

                        // Default read-only rendering
                        if (!value)
                          return <Typography variant="body2">N/A</Typography>;
                        if (
                          column.field === "Account_Name" &&
                          typeof value === "object"
                        ) {
                          return (
                            <Typography variant="body2">
                              {value.name || "N/A"}
                            </Typography>
                          );
                        }
                        return <Typography variant="body2">{value}</Typography>;
                      })()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data.length}
          page={page}
          onPageChange={(_, newPage) => handleChangePage(type, newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) =>
            handleChangeRowsPerPage(type, e.target.value)
          }
          rowsPerPageOptions={[
            10,
            25,
            50,
            100,
            200,
            { label: "All", value: -1 },
          ]}
        />
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Zoho CRM Integration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect and manage your Zoho CRM data integration
        </Typography>
      </Box>

      {/* Integration Status */}
      {integration ? (
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {getStatusIcon(integration.status)}
                <Typography variant="h6">{integration.name}</Typography>
                <Chip
                  label={integration.status}
                  size="small"
                  color={getStatusColor(integration.status)}
                />
              </Box>
            }
            subheader={`Connected to Zoho CRM • Last sync: ${
              syncStatus.lastSync
                ? new Date(syncStatus.lastSync).toLocaleString()
                : "Never"
            }`}
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<Key />}
                  onClick={() => setShowTokenGenerator(true)}
                >
                  Regenerate Tokens
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setConfigModalOpen(true)}
                >
                  Configure
                </Button>
                {integration.status !== "active" && (
                  <Button
                    variant="outlined"
                    onClick={() => testConnection(integration.id)}
                  >
                    Test Connection
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<Sync />}
                  onClick={() => setSyncModalOpen(true)}
                  disabled={syncStatus.syncInProgress}
                >
                  Sync Data
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={deleteIntegration}
                >
                  Delete
                </Button>
              </Stack>
            }
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant="h3"
                    color="primary"
                    sx={{ fontWeight: "bold" }}
                  >
                    {data.leads.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Leads
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant="h3"
                    color="success.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    {data.contacts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contacts
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: "center", p: 2 }}>
                  <Typography
                    variant="h3"
                    color="info.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    {data.deals.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deals
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {syncStatus.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Sync Error:</strong> {syncStatus.error}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Typography variant="h6" gutterBottom>
              No Zoho Integration Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Setup your Zoho CRM integration to start syncing leads, contacts,
              and deals.
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setSetupModalOpen(true)}
              >
                Setup Zoho Integration
              </Button>
              <Button
                variant="outlined"
                startIcon={<Key />}
                onClick={() => setShowTokenGenerator(true)}
              >
                Generate OAuth Tokens
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {integration &&
        (data.leads.length > 0 ||
          data.contacts.length > 0 ||
          data.deals.length > 0) && (
          <Card>
            <CardHeader
              title="Zoho CRM Data"
              subheader="View and manage your synced Zoho data"
            />
            <CardContent>
              <Tabs
                value={selectedTab}
                onChange={(_, newValue) => {
                  setSelectedTab(newValue);
                  const types = ["leads", "contacts", "deals"];
                  const type = types[newValue];
                  setPagination((prev) => ({
                    ...prev,
                    [type]: { ...prev[type], page: 0 },
                  }));
                }}
                sx={{ mb: 2 }}
              >
                <Tab label={`Leads (${data.leads.length})`} />
                <Tab label={`Contacts (${data.contacts.length})`} />
                <Tab label={`Deals (${data.deals.length})`} />
              </Tabs>

              {data.loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {selectedTab === 0 &&
                    data.leads.length > 0 &&
                    renderDataTable(data.leads, "leads")}
                  {selectedTab === 1 &&
                    data.contacts.length > 0 &&
                    renderDataTable(data.contacts, "contacts")}
                  {selectedTab === 2 &&
                    data.deals.length > 0 &&
                    renderDataTable(data.deals, "deals")}

                  {((selectedTab === 0 && data.leads.length === 0) ||
                    (selectedTab === 1 && data.contacts.length === 0) ||
                    (selectedTab === 2 && data.deals.length === 0)) && (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available for this category. Click "Sync Data"
                        to import from Zoho CRM.
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        )}

      {/* Setup Modal */}
      <Dialog
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Setup Zoho CRM Integration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your Zoho CRM API credentials to connect your account.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                value={formConfig.baseUrl}
                onChange={(e) => handleFormChange("baseUrl", e.target.value)}
                helperText="Zoho API base URL"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Access Token"
                type="password"
                value={formConfig.accessToken}
                onChange={(e) =>
                  handleFormChange("accessToken", e.target.value)
                }
                helperText="Your Zoho CRM access token"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Refresh Token"
                type="password"
                value={formConfig.refreshToken}
                onChange={(e) =>
                  handleFormChange("refreshToken", e.target.value)
                }
                helperText="Your Zoho CRM refresh token"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Client ID"
                value={formConfig.clientId}
                onChange={(e) => handleFormChange("clientId", e.target.value)}
                helperText="Your Zoho app client ID"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Client Secret"
                type="password"
                value={formConfig.clientSecret}
                onChange={(e) =>
                  handleFormChange("clientSecret", e.target.value)
                }
                helperText="Your Zoho app client secret"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetupModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => setupIntegration(formConfig)}
          >
            Setup Integration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Config Modal */}
      <Dialog
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Zoho CRM Configuration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                value={formConfig.baseUrl}
                onChange={(e) => handleFormChange("baseUrl", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Access Token"
                type="password"
                value={formConfig.accessToken}
                onChange={(e) =>
                  handleFormChange("accessToken", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Refresh Token"
                type="password"
                value={formConfig.refreshToken}
                onChange={(e) =>
                  handleFormChange("refreshToken", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Client ID"
                value={formConfig.clientId}
                onChange={(e) => handleFormChange("clientId", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Client Secret"
                type="password"
                value={formConfig.clientSecret}
                onChange={(e) =>
                  handleFormChange("clientSecret", e.target.value)
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={deleteIntegration}>
            Delete
          </Button>
          <Button onClick={() => setConfigModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => saveConfiguration()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync Modal */}
      <Dialog
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sync Zoho Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which data types to sync from your Zoho CRM.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={selectedDataType}
              label="Data Type"
              onChange={(e) => setSelectedDataType(e.target.value)}
            >
              <MenuItem value="all">All Data (Leads, Contacts, Deals)</MenuItem>
              <MenuItem value="leads">Leads Only</MenuItem>
              <MenuItem value="contacts">Contacts Only</MenuItem>
              <MenuItem value="deals">Deals Only</MenuItem>
            </Select>
          </FormControl>

          {syncStatus.syncInProgress && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Syncing data from Zoho CRM...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSyncModalOpen(false)}
            disabled={syncStatus.syncInProgress}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => syncData(integration.id, selectedDataType)}
            disabled={syncStatus.syncInProgress}
            startIcon={
              syncStatus.syncInProgress ? (
                <CircularProgress size={16} />
              ) : (
                <Sync />
              )
            }
          >
            {syncStatus.syncInProgress ? "Syncing..." : "Start Sync"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Token Generator */}
      {showTokenGenerator && (
        <Dialog
          open={showTokenGenerator}
          onClose={() => setShowTokenGenerator(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6">Zoho OAuth Token Generator</Typography>
              <IconButton onClick={() => setShowTokenGenerator(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <ZohoTokenGenerator />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default ZohoIntegration;
