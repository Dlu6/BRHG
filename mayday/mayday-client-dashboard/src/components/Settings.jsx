import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import smsService from "../services/smsService";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    baseUrl: "",
    overrideIp: "",
    strictTls: "",
    authHeader: "",
    username: "",
    password: "",
    defaultSender: "",
    dlrUrl: "",
  });
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cfg, providers] = await Promise.all([
          smsService.getConfig().then((r) => r.data),
          smsService.getProviders().catch(() => null),
        ]);
        setConfig((prev) => ({ ...prev, ...(cfg || {}) }));
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChange = (key) => (e) =>
    setConfig((c) => ({ ...c, [key]: e.target.value }));

  const save = async () => {
    try {
      setSaving(true);
      await smsService.updateConfig(config);
    } finally {
      setSaving(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await smsService.getBalance();
      setBalance(res.data);
    } catch (_) {}
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          SMS Provider Configuration
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Base URL"
            value={config.baseUrl || ""}
            onChange={onChange("baseUrl")}
            fullWidth
          />
          <TextField
            label="Override IP"
            value={config.overrideIp || ""}
            onChange={onChange("overrideIp")}
            fullWidth
          />
          <TextField
            label="Strict TLS (true/false)"
            value={config.strictTls || ""}
            onChange={onChange("strictTls")}
            fullWidth
          />
          <TextField
            label="Auth Header (Basic ...)"
            value={config.authHeader || ""}
            onChange={onChange("authHeader")}
            fullWidth
          />
          <TextField
            label="Username"
            value={config.username || ""}
            onChange={onChange("username")}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={config.password || ""}
            onChange={onChange("password")}
            fullWidth
          />
          <TextField
            label="Default Sender"
            value={config.defaultSender || ""}
            onChange={onChange("defaultSender")}
            fullWidth
          />
          <TextField
            label="DLR URL"
            value={config.dlrUrl || ""}
            onChange={onChange("dlrUrl")}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outlined" onClick={fetchBalance}>
              Check Balance
            </Button>
          </Stack>
          {balance && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Balance: {JSON.stringify(balance)}
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default Settings;
