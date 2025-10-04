import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { createOutboundRoute } from "../../features/outboundRoutes/outboundRouteSlice";

const OutboundRouteDialog = ({ open, handleClose }) => {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    context: "from-internal",
    recording: "none",
    // cutDigits: "",
    alias: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const handleInputChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async () => {
    if (isCreating) return; // Prevent multiple submissions

    setIsCreating(true);
    try {
      const actionResponse = await dispatch(
        createOutboundRoute(formData)
      ).unwrap();
      enqueueSnackbar(actionResponse.message, { variant: "success" });
      handleClose();
    } catch (err) {
      enqueueSnackbar(err.message || "An unexpected error occurred", {
        variant: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = () => {
    return formData.phoneNumber?.trim();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        New Outbound Route
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          required
          margin="dense"
          label="Phone Number"
          fullWidth
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Context</InputLabel>
          <Select
            name="context"
            value={formData.context}
            onChange={handleInputChange}
            label="Context"
          >
            <MenuItem value="from-internal">From Internal</MenuItem>
            <MenuItem value="outbound-trunk">Outbound Trunk</MenuItem>
            <MenuItem value="from-sip">From SIP</MenuItem>
            <MenuItem value="from-voip-provider">From VoIP Provider</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Recording</InputLabel>
          <Select
            name="recording"
            value={formData.recording}
            onChange={handleInputChange}
            label="Recording"
          >
            <MenuItem value="none">none</MenuItem>
            <MenuItem value="wav">wav</MenuItem>
            <MenuItem value="gsm">gsm</MenuItem>
            <MenuItem value="wav49">wav49</MenuItem>
          </Select>
        </FormControl>
        {/* <TextField
          margin="dense"
          label="Cut Digits"
          fullWidth
          name="cutDigits"
          value={formData.cutDigits}
          onChange={handleInputChange}
          type="number"
        /> */}
        <TextField
          margin="dense"
          label="Alias"
          fullWidth
          name="alias"
          value={formData.alias}
          onChange={handleInputChange}
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          multiline
          rows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || isCreating}
          startIcon={
            isCreating ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {isCreating ? "Creating..." : "Add Outbound Route"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OutboundRouteDialog;
