// EditNetworkDialog.js

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { useEffect } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import {
  addNetworkConfig,
  deleteNetworkConfig,
  updateNetworkConfig,
} from "../features/network/networkSlice.js";

const EditNetworkDialog = ({
  open,
  onClose,
  networkData,
  networkType,
  mode,
}) => {
  const { loading } = useSelector((state) => state.network);
  const [formData, setFormData] = useState({
    type: "",
    address: "",
    username: "",
    password: "",
  });
  const [originalData, setOriginalData] = useState(null);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  useEffect(() => {
    if (mode === "edit") {
      const mappedData = {
        ...networkData,
        address:
          networkData?.type === "localnet"
            ? networkData?.network
            : networkData?.type === "stun" || networkData?.type === "turn"
            ? `${networkData?.server}:${networkData?.port}`
            : networkData?.address,
        type: networkData?.type || "",
        username: networkData?.username || "",
        password: networkData?.password || "",
      };
      setFormData(mappedData);
      setOriginalData(mappedData);
    } else {
      setFormData({
        type: networkType || "",
        address: "",
        username: "",
        password: "",
      });
      setOriginalData(null);
    }
  }, [networkData, mode, networkType]);

  const handleInputChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const validateIPAddress = (address) => {
    // Remove http:// or https:// and trailing slashes
    const cleanedValue = address.replace(/^https?:\/\//, "").replace(/\/$/, "");

    // IP address regex pattern
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (!ipPattern.test(cleanedValue)) {
      return { isValid: false, error: "Please enter a valid IP address" };
    }

    // Validate each octet is between 0 and 255
    const octets = cleanedValue.split(".");
    for (const octet of octets) {
      const num = parseInt(octet);
      if (num < 0 || num > 255) {
        return {
          isValid: false,
          error: "Each IP octet must be between 0 and 255",
        };
      }
    }

    return { isValid: true, value: cleanedValue };
  };

  const handleSave = async () => {
    try {
      let payload;
      if (formData.type === "stun" || formData.type === "turn") {
        // Parse the address to handle stun:// or turn:// prefixes
        const addressParts = formData.address.split(":");
        let server, port;

        if (addressParts.length === 3) {
          // Format: stun:hostname:port
          [, server, port] = addressParts;
        } else if (addressParts.length === 2) {
          // Format: hostname:port
          [server, port] = addressParts;
        } else {
          server = addressParts[0];
          port = "3478"; // Default STUN/TURN port
        }

        // Remove any remaining stun:// or turn:// prefix
        server = server.replace(/^(?:stun|turn|turns):\/\//, "");

        payload = {
          networkType: formData.type,
          networkConfig: {
            server,
            port: parseInt(port, 10),
            active: true,
            ...(formData.type === "turn" && {
              username: formData.username,
              password: formData.password,
            }),
          },
        };
      } else {
        payload = {
          networkType: formData.type,
          networkConfig: {
            ...(formData.type === "localnet"
              ? { network: formData.address }
              : { address: formData.address }),
            active: true,
          },
        };
      }

      if (mode === "edit") {
        const result = await dispatch(
          updateNetworkConfig({ id: formData.id, ...payload })
        ).unwrap();

        if (!result) {
          throw new Error("Failed to update network configuration");
        }
      } else {
        const result = await dispatch(addNetworkConfig(payload)).unwrap();

        if (!result) {
          throw new Error("Failed to add network configuration");
        }
      }

      enqueueSnackbar(
        `Network configuration ${
          mode === "edit" ? "updated" : "added"
        } successfully`,
        { variant: "success" }
      );
      onClose();
    } catch (error) {
      console.error("Network configuration error:", error);

      // Handle specific error types
      let errorMessage = "Failed to save network configuration";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (error && error.message) {
        errorMessage = error.message;
      } else if (error && error.error) {
        errorMessage = error.error;
      }

      enqueueSnackbar(errorMessage, {
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this network configuration?"
      )
    ) {
      try {
        await dispatch(
          deleteNetworkConfig({
            id: networkData.id,
            networkType: networkData.type,
          })
        ).unwrap();
        enqueueSnackbar("Network configuration deleted successfully", {
          variant: "success",
        });
        onClose();
      } catch (err) {
        console.error("Network deletion error:", err);
        enqueueSnackbar("Failed to delete network configuration", {
          variant: "error",
        });
      }
    }
  };

  const renderNetworkTypeFields = () => {
    switch (formData.type) {
      case "externip":
      case "localnet":
        return (
          <TextField
            margin="dense"
            label={
              formData.type === "localnet" ? "Network (CIDR)" : "IP Address"
            }
            type="text"
            fullWidth
            name="address"
            value={formData.address || ""}
            onChange={handleInputChange}
            helperText={
              formData.type === "localnet"
                ? "Example: 192.168.1.0/24"
                : "Example: 203.0.113.1"
            }
          />
        );
      case "stun":
        return (
          <>
            <TextField
              margin="dense"
              label="Server Address:Port"
              type="text"
              fullWidth
              name="address"
              value={formData.address || ""}
              onChange={handleInputChange}
              helperText="Enter the STUN server address (e.g., stun.example.com:3478)"
            />
          </>
        );
      case "turn":
        return (
          <>
            <TextField
              margin="dense"
              label="Server Address:Port"
              type="text"
              fullWidth
              name="address"
              value={formData.address || ""}
              onChange={handleInputChange}
              helperText="Enter the TURN server address (e.g., turn.example.com:3478)"
            />
            {formData.type === "turn" && (
              <>
                <TextField
                  margin="dense"
                  label="Username"
                  type="text"
                  fullWidth
                  name="username"
                  value={formData.username || ""}
                  onChange={handleInputChange}
                />
                <TextField
                  margin="dense"
                  label="Password"
                  type="password"
                  fullWidth
                  name="password"
                  value={formData.password || ""}
                  onChange={handleInputChange}
                />
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const handleSubmit = () => {
    if (formData.type === "externip") {
      const { isValid, error, value } = validateIPAddress(formData.address);
      if (!isValid) {
        enqueueSnackbar(error, { variant: "error" });
        return;
      }
      // Update the form data with cleaned IP
      formData.address = value;
    }

    handleSave();
  };

  const hasChanges = () => {
    if (mode !== "edit" || !originalData) return true;

    return (
      formData.address !== originalData.address ||
      formData.username !== originalData.username ||
      formData.password !== originalData.password
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: "#1976d2",
          color: "#ffffff",
          marginBottom: "16px",
        }}
      >
        {mode === "edit" ? "Edit Network" : "New Network"}
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <Select
            name="type"
            value={formData.type || ""}
            onChange={handleInputChange}
            disabled={mode === "edit"}
          >
            <MenuItem value="externip">External IP</MenuItem>
            <MenuItem value="localnet">Local Network</MenuItem>
            <MenuItem value="stun">STUN Server</MenuItem>
            <MenuItem value="turn">TURN Server</MenuItem>
          </Select>
        </FormControl>
        {renderNetworkTypeFields()}
      </DialogContent>
      <DialogActions
        sx={{ justifyContent: "space-between", padding: "8px 24px" }}
      >
        {mode === "edit" && (
          <IconButton onClick={handleDelete} color="error">
            <DeleteIcon />
          </IconButton>
        )}
        <div style={{ flex: "1 0 0" }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            loading || !formData.type || !formData.address || !hasChanges()
          }
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditNetworkDialog;
