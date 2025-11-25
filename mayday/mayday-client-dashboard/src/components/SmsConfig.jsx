import { useEffect, useMemo, useState } from "react";
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
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import smsService from "../services/smsService";

const SmsConfig = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState({
    baseUrl: "",
    overrideIp: "",
    strictTls: "false",
    authHeader: "",
    username: "",
    password: "",
    defaultSender: "",
    dlrUrl: "",
  });
  const [original, setOriginal] = useState(null);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const cfgRes = await smsService.getConfig();
        const cfg = cfgRes?.data || {};
        setConfig((prev) => ({
          ...prev,
          ...cfg,
          strictTls:
            typeof cfg.strictTls === "boolean"
              ? String(cfg.strictTls)
              : cfg.strictTls || "false",
        }));
        setOriginal(cfg);
      } catch (e) {
        setError("Failed to load SMS configuration");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChange = (key) => (e) =>
    setConfig((c) => ({ ...c, [key]: e.target.value }));

  const onToggleStrictTls = (e) =>
    setConfig((c) => ({ ...c, strictTls: String(e.target.checked) }));

  const hasChanges = useMemo(
    () =>
      JSON.stringify({ ...config, password: "" }) !==
      JSON.stringify({ ...(original || {}), password: "" }),
    [config, original]
  );

  const validateUrl = (url) => !url || /^https?:\/\//i.test(url);
  const validateIp = (ip) => !ip || /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  const isValid = validateUrl(config.baseUrl) && validateIp(config.overrideIp);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await smsService.updateConfig(config);
      setSuccess(true);
      setOriginal(config);
    } catch (e) {
      setError(e?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const resetToSaved = async () => {
    try {
      setLoading(true);
      setError(null);
      const cfgRes = await smsService.getConfig();
      const cfg = cfgRes?.data || {};
      setConfig((prev) => ({ ...prev, ...cfg }));
      setOriginal(cfg);
      setSuccess(false);
    } catch (e) {
      setError("Failed to reload configuration");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await smsService.getBalance();
      setBalance(res.data);
    } catch (_) {}
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
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SettingsIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight="700" sx={{ mb: 1 }}>
              SMS Integration
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 300 }}
            >
              Configure your SMS provider for outbound messaging
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {(error || success) && (
        <Box sx={{ mb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Configuration saved successfully
            </Alert>
          )}
        </Box>
      )}

      {/* Config Card */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
          mb: 4,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h6"
            fontWeight="600"
            sx={{ mb: 3, display: "flex", alignItems: "center" }}
          >
            <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
            Provider & Network
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Base URL"
                value={config.baseUrl || ""}
                onChange={onChange("baseUrl")}
                fullWidth
                placeholder="https://sms.example.com/secure"
                error={!validateUrl(config.baseUrl)}
                helperText={
                  !validateUrl(config.baseUrl)
                    ? "Must start with http(s)://"
                    : ""
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Override IP"
                value={config.overrideIp || ""}
                onChange={onChange("overrideIp")}
                fullWidth
                placeholder="41.77.78.156"
                error={!validateIp(config.overrideIp)}
                helperText={
                  !validateIp(config.overrideIp)
                    ? "Invalid IPv4"
                    : "Optional; for DNS issues"
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={String(config.strictTls).toLowerCase() === "true"}
                    onChange={onToggleStrictTls}
                    color="primary"
                  />
                }
                label="Strict TLS"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography
            variant="h6"
            fontWeight="600"
            sx={{ mb: 3, display: "flex", alignItems: "center" }}
          >
            <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
            Authentication
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Auth Header (Basic ...)"
                value={config.authHeader || ""}
                onChange={onChange("authHeader")}
                fullWidth
                placeholder="Basic xxxxx=="
                helperText="Alternative to username/password"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Username"
                value={config.username || ""}
                onChange={onChange("username")}
                fullWidth
                placeholder="api_user"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Password"
                type="password"
                value={config.password || ""}
                onChange={onChange("password")}
                fullWidth
                placeholder="••••••••"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography
            variant="h6"
            fontWeight="600"
            sx={{ mb: 3, display: "flex", alignItems: "center" }}
          >
            <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
            Defaults
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Default Sender"
                value={config.defaultSender || ""}
                onChange={onChange("defaultSender")}
                fullWidth
                placeholder="Hugamara"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="DLR URL"
                value={config.dlrUrl || ""}
                onChange={onChange("dlrUrl")}
                fullWidth
                placeholder="https://cs.brhgroup.co/api/sms/dlr"
              />
            </Grid>
          </Grid>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="flex-end"
            sx={{ mt: 4 }}
          >
            <Button
              variant="outlined"
              onClick={resetToSaved}
              disabled={saving}
              startIcon={<RefreshIcon />}
            >
              Reset to Saved
            </Button>
            <Button
              variant="contained"
              onClick={save}
              disabled={saving || !hasChanges || !isValid}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6" fontWeight={600}>
              Provider Balance
            </Typography>
            <Button
              variant="outlined"
              onClick={fetchBalance}
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Balance"}
            </Button>
          </Stack>
          {balance !== null && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Balance: {JSON.stringify(balance)}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SmsConfig;
