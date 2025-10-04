import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  FormControl,
  FormHelperText,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { alpha, styled } from "@mui/material/styles";
import { pink } from "@mui/material/colors";
import Switch from "@mui/material/Switch";
import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import {
  createTrunk,
  updateTrunkDetailsAsync,
  fetchTrunkById,
} from "../features/trunks/trunkSlice.js";

const TrunkDialog = ({ open, handleClose, trunkData, mode }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (mode === "edit" && trunkData && trunkData.active !== undefined) {
      return trunkData.active;
    } else {
      return 0;
    }
  });
  const [isP2P, setIsP2P] = useState(true); // Default to P2P

  const [formData, setFormData] = useState({
    name: "",
    host: "",
    defaultUser: "",
    password: "",
    context: "from-voip-provider",
    codecs: "ulaw,alaw",
    transport: "transport-udp",
    active: 1,
    fromUser: "",
    fromDomain: "",
    providerIPs: "",
  });

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  useEffect(() => {
    if (mode === "edit" && trunkData) {
      // Debug: inspect provider IPs structure from backend
      console.log(
        "[TrunkDialog] trunkData:",
        {
          name: trunkData?.name,
          identifyMatches: trunkData?.identifyMatches,
          identify: trunkData?.identify,
        },
        trunkData
      );
      const enhancedTrunkData = {
        name: trunkData.name || "",
        host: trunkData.host || trunkData.endpoint?.from_domain || "",
        defaultUser:
          trunkData.defaultUser || trunkData.endpoint?.from_user || "",
        transport: (
          trunkData.transport ||
          trunkData.endpoint?.transport ||
          "transport-udp"
        ).replace("transport-", ""),
        context:
          trunkData.context ||
          trunkData.endpoint?.context ||
          "from-voip-provider",
        active: trunkData.active || (trunkData.endpoint?.active ? 1 : 0),
        enabled: trunkData.enabled || Boolean(trunkData.endpoint?.enabled),
        password: trunkData.password || trunkData.auth?.password || "",
        codecs: trunkData.codecs || trunkData.endpoint?.allow || "ulaw,alaw",
        fromUser: trunkData.fromUser || trunkData.endpoint?.from_user || "",
        fromDomain:
          trunkData.fromDomain || trunkData.endpoint?.from_domain || "",
        providerIPs:
          (Array.isArray(trunkData.identifyMatches)
            ? trunkData.identifyMatches.join(",")
            : trunkData.identify?.match) ||
          trunkData.providerIPs ||
          "",
      };
      setFormData(enhancedTrunkData);
      setEnabled(enhancedTrunkData.active);
      setIsP2P(enhancedTrunkData.isP2P || true);

      // Fallback: if providerIPs not available on list row, fetch detail
      if (
        !enhancedTrunkData.providerIPs &&
        (trunkData.name || trunkData.endpoint?.id)
      ) {
        const id = trunkData.name || trunkData.endpoint?.id;
        (async () => {
          try {
            const res = await dispatch(fetchTrunkById(id)).unwrap();
            const t = res.trunk || res;
            const matches = Array.isArray(t.identifyMatches)
              ? t.identifyMatches.join(",")
              : t.identify?.match || "";
            setFormData((prev) => ({ ...prev, providerIPs: matches }));
            // console.log("[TrunkDialog] detail identify:", {
            //   identifyMatches: t.identifyMatches,
            //   identify: t.identify,
            // });
          } catch (e) {
            console.warn("Failed to load trunk identify details:", e);
          }
        })();
      }
    }
  }, [trunkData, mode]);

  const handleInputChange = (event) => {
    const { name, value, checked } = event.target;
    if (name === "enabledSwitch") {
      const isEnabled = checked ? 1 : 0;
      setEnabled(isEnabled);
      setFormData((prev) => ({
        ...prev,
        enabled: isEnabled,
        active: isEnabled ? 1 : 0,
      }));
    } else if (name === "isP2P") {
      setIsP2P(checked);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "defaultUser" ? { fromUser: value } : {}),
        ...(name === "host" ? { fromDomain: value } : {}),
      }));
    }
  };

  const handleSubmitTrunk = async () => {
    if (
      !formData.name
      // !formData.host ||
      // !formData.defaultUser ||
      // !formData.password
    ) {
      enqueueSnackbar("Please fill in all required fields", {
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const trunkPayload = {
        ...formData,
        isP2P,
      };

      if (mode === "edit") {
        await dispatch(updateTrunkDetailsAsync(trunkPayload)).unwrap();
      } else {
        await dispatch(createTrunk(trunkPayload)).unwrap();
      }

      enqueueSnackbar(
        `Trunk ${mode === "edit" ? "updated" : "created"} successfully`,
        { variant: "success" }
      );
      handleClose();
    } catch (error) {
      console.log(error, "error");

      // Check if the error is related to external IP configuration
      if (
        error &&
        (error.includes("External IP configuration required") ||
          error.includes("Cannot create trunk"))
      ) {
        enqueueSnackbar(
          "Please configure an external IP in Network Settings before creating trunks. Go to Settings > Networks > External IPs and add your server's external IP address.",
          { variant: "error" }
        );
      } else {
        enqueueSnackbar(error || `Failed to ${mode} trunk`, {
          variant: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      handleClose();
      enqueueSnackbar("Network configuration deleted successfully.", {
        variant: "success",
      });
    } catch (err) {
      console.error("Network deletion error:", err);
      enqueueSnackbar("Failed to delete network configuration.", {
        variant: "error",
      });
    }
  };

  const label = { inputProps: { "aria-label": "Color switch demo" } };

  const PinkSwitch = styled(Switch)(({ theme }) => ({
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: pink[600],
      "&:hover": {
        backgroundColor: alpha(pink[600], theme.palette.action.hoverOpacity),
      },
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: pink[600],
    },
  }));

  const PinkSwitchContainer = styled("div")({
    paddingTop: "8px",
  });

  return (
    <Dialog
      open={open}
      onClose={!isSubmitting ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          backgroundColor: "#1976d2",
          color: "#ffffff",
          marginBottom: "16px",
        }}
      >
        {mode === "edit" ? "Edit Trunk" : "New Trunk"}
        {!isSubmitting && (
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#e3f2fd",
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <TextField
            required
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            name="name"
            // variant="standard"
            value={formData.name || ""}
            onChange={handleInputChange}
            disabled={mode === "edit" && Boolean(trunkData)}
          />
          <FormHelperText>The name of the trunk</FormHelperText>

          <FormControlLabel
            control={
              <Checkbox
                checked={isP2P}
                onChange={handleInputChange}
                name="isP2P"
                color="primary"
                disabled={isSubmitting}
              />
            }
            label="P2P"
          />

          <PinkSwitchContainer>
            <FormControlLabel
              control={
                <PinkSwitch
                  {...label}
                  checked={enabled === 1}
                  onChange={handleInputChange}
                  name="enabledSwitch"
                  disabled={isSubmitting}
                />
              }
              label="Active"
            />
          </PinkSwitchContainer>

          <TextField
            required
            margin="dense"
            label="Host"
            type="text"
            fullWidth
            name="host"
            variant="standard"
            value={formData.host || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          <TextField
            margin="dense"
            label="Provider IPs (comma-separated)"
            type="text"
            fullWidth
            name="providerIPs"
            variant="standard"
            value={formData.providerIPs || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
            helperText="Optional: e.g. 41.77.10.100/32 or 41.77.10.10,41.77.10.11"
          />
          {/* From User */}
          <TextField
            required
            margin="dense"
            label="From User"
            type="number"
            fullWidth
            name="fromUser"
            variant="standard"
            value={formData.fromUser || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />

          <FormHelperText>Number of the user (0312345678)</FormHelperText>

          {!isP2P && (
            <>
              <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                name="password"
                variant="standard"
                placeholder="Password"
                value={formData.password || ""}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <FormHelperText>Authentication password</FormHelperText>

              <TextField
                margin="dense"
                label="Default User"
                type="text"
                fullWidth
                name="defaultUser"
                variant="standard"
                value={formData.defaultUser || ""}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <FormHelperText>Authentication username</FormHelperText>
            </>
          )}
        </FormControl>
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: "space-between",
          padding: "8px 24px",
          alignItems: "center",
        }}
      >
        {mode === "edit" && !isSubmitting && (
          <IconButton
            onClick={() => handleDelete(trunkData.id)}
            color="error"
            aria-label="delete"
            sx={{ position: "absolute", left: 8, bottom: 8 }}
            disabled={isSubmitting}
          >
            <DeleteIcon />
          </IconButton>
        )}
        <div style={{ flex: "1 0 0" }} />
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitTrunk}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {mode === "edit" ? "Updating..." : "Adding..."}
            </>
          ) : mode === "edit" ? (
            "Update Trunk"
          ) : (
            "Add Trunk"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrunkDialog;
