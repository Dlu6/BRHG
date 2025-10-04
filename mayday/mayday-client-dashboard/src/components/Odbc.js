import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

const Odbc = () => {
  const [open, setOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connections, setConnections] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    dsn: "",
    description: "",
  });
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch ODBC connections on component mount
  useEffect(() => {
    fetchConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await axios.get("/api/users/odbc");
      setConnections(response.data);
    } catch (error) {
      showAlert(
        error.response?.data?.error || "Failed to fetch connections",
        "error"
      );
    }
  };

  const handleOpen = (connection = null) => {
    setSelectedConnection(connection);
    setFormData({
      name: connection?.name || "",
      dsn: connection?.dsn || "",
      description: connection?.description || "",
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedConnection(null);
    setFormData({ name: "", dsn: "", description: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.dsn) {
        showAlert("Name and DSN are required", "error");
        return;
      }

      if (selectedConnection) {
        // Update existing connection
        await axios.put(`/api/users/odbc/${selectedConnection.id}`, formData);
        showAlert("Connection updated successfully", "success");
      } else {
        // Create new connection
        await axios.post("/api/users/odbc", formData);
        showAlert("Connection created successfully", "success");
      }

      handleClose();
      fetchConnections();
    } catch (error) {
      showAlert(
        error.response?.data?.error || "Failed to save connection",
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/users/odbc/${id}`);
      showAlert("Connection deleted successfully", "success");
      fetchConnections();
    } catch (error) {
      showAlert(
        error.response?.data?.error || "Failed to delete connection",
        "error"
      );
    }
  };

  const showAlert = (message, severity) => {
    setAlert({
      open: true,
      message,
      severity,
    });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2>ODBC Connections</h2>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Connection
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>DSN</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connections.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell>{connection.name}</TableCell>
                <TableCell
                  sx={{
                    maxWidth: 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {connection.dsn}
                </TableCell>
                <TableCell>{connection.description}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(connection)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(connection.id)}
                    color="error"
                  >
                    <CloseIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "#2196f3",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {selectedConnection ? "Edit ODBC connection" : "New ODBC connection"}
          <IconButton onClick={handleClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            required
            margin="dense"
            label="Name"
            name="name"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
          />
          <TextField
            required
            margin="dense"
            label="DSN"
            name="dsn"
            fullWidth
            value={formData.dsn}
            onChange={handleInputChange}
            helperText="Example: DRIVER=MySQL;SERVER=127.0.0.1;UID=xcall;PWD=password;DATABASE=motion"
            FormHelperTextProps={{
              sx: { color: "text.primary" },
            }}
          />
          <TextField
            margin="dense"
            label="Description"
            name="description"
            fullWidth
            multiline
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ textTransform: "uppercase" }}
          >
            {selectedConnection ? "Save" : "Add ODBC"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Odbc;
