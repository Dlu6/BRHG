import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "notistack";
import { contextsAPI } from "../services/api";

const emptyForm = {
  name: "",
  include: "from-internal-custom",
  realtimeKey: "",
  description: "",
  active: true,
};

const Contexts = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await contextsAPI.list();
      if (data?.success) setItems(data.data || []);
    } catch (e) {
      enqueueSnackbar(e?.message || "Failed to load contexts", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      include: row.include || "",
      realtimeKey: row.realtimeKey || "",
      description: row.description || "",
      active: row.active !== false,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (!payload.name) {
        enqueueSnackbar("Name is required", { variant: "warning" });
        return;
      }
      if (editingId) {
        await contextsAPI.update(editingId, payload);
        enqueueSnackbar("Context updated", { variant: "success" });
      } else {
        await contextsAPI.create(payload);
        enqueueSnackbar("Context created", { variant: "success" });
      }
      setOpen(false);
      await load();
    } catch (e) {
      enqueueSnackbar(e?.message || "Save failed", { variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this context?")) return;
    try {
      await contextsAPI.remove(id);
      enqueueSnackbar("Context deleted", { variant: "success" });
      await load();
    } catch (e) {
      enqueueSnackbar(e?.message || "Delete failed", { variant: "error" });
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Dialplan Contexts</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                await contextsAPI.sync();
                enqueueSnackbar("Asterisk contexts updated", {
                  variant: "success",
                });
              } catch (e) {
                enqueueSnackbar(
                  e?.message || "Failed to update Asterisk contexts",
                  { variant: "error" }
                );
              }
            }}
          >
            Update Asterisk Contexts
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            Add Context
          </Button>
        </Box>
      </Box>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Include</TableCell>
                <TableCell>Realtime Key</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.include || ""}</TableCell>
                  <TableCell>{row.realtimeKey || row.name}</TableCell>
                  <TableCell>{row.description || ""}</TableCell>
                  <TableCell>{row.active ? "Yes" : "No"}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(row.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No contexts yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingId ? "Edit Context" : "Add Context"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            margin="dense"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Include"
            margin="dense"
            placeholder="from-internal-custom"
            value={form.include}
            onChange={(e) => setForm({ ...form, include: e.target.value })}
          />
          <TextField
            fullWidth
            label="Realtime Key (defaults to name)"
            margin="dense"
            value={form.realtimeKey}
            onChange={(e) => setForm({ ...form, realtimeKey: e.target.value })}
          />
          <TextField
            fullWidth
            label="Description"
            margin="dense"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Contexts;
