import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Divider,
  Grid,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import {
  createVoiceQueue,
  updateVoiceQueueDetails,
} from "../features/voiceQueues/voiceQueueSlice.js";

const VoiceQueueDialog = ({
  open,
  handleClose,
  queueData,
  errorFromState,
  mode,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    strategy: "rrmemory",
    description: "",
    musiconhold: "default",
    timeout: 15,
    retry: 5,
    wrapuptime: 0,
    maxlen: 0,
    weight: 0,
    servicelevel: 60,
    ringinuse: "no",
    autopause: "no",
    setinterfacevar: "no",
    setqueuevar: "no",
    announce_holdtime: "no",
    announce_position: "no",
  });

  useEffect(() => {
    if (mode === "edit") {
      const sanitizedData = {
        ...queueData,
        name: queueData?.name ? sanitizeQueueName(queueData.name) : "",
      };
      setFormData(sanitizedData || {});
    }
  }, [queueData, mode]);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const sanitizeQueueName = (value) => {
    // Remove spaces and special characters except dots and underscores
    return value.replace(/[^a-zA-Z0-9._]/g, "");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    // Apply special handling for the name field
    if (name === "name") {
      const sanitizedValue = sanitizeQueueName(value);
      setFormData({
        ...formData,
        [name]: sanitizedValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmitVoiceQueue = async () => {
    try {
      let actionResult;
      if (mode === "edit") {
        actionResult = await dispatch(
          updateVoiceQueueDetails(formData)
        ).unwrap();
      } else {
        actionResult = await dispatch(createVoiceQueue(formData)).unwrap();
      }
      enqueueSnackbar(actionResult.message, { variant: "success" });
      handleClose();
    } catch (err) {
      enqueueSnackbar(errorFromState, { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: "#1976d2",
          color: "#ffffff",
          marginBottom: "16px",
        }}
      >
        {mode === "edit" ? "Edit Queue" : "New Queue"}
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
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" gutterBottom>
          Basic Settings
        </Typography>
        <TextField
          required
          margin="dense"
          label="Name"
          type="text"
          fullWidth
          name="name"
          value={formData.name || ""}
          onChange={handleInputChange}
        />
        <FormHelperText>
          Only numbers, letters and specific characters (._) are supported
        </FormHelperText>

        <FormControl fullWidth margin="normal">
          <InputLabel>Strategy</InputLabel>
          <Select
            name="strategy"
            value={formData.strategy}
            onChange={handleInputChange}
            label="Strategy"
          >
            <MenuItem value="ringall">Ring All</MenuItem>
            <MenuItem value="leastrecent">Least Recent</MenuItem>
            <MenuItem value="fewestcalls">Fewest Calls</MenuItem>
            <MenuItem value="random">Random</MenuItem>
            <MenuItem value="rrmemory">Round Robin with Memory</MenuItem>
            <MenuItem value="linear">Linear</MenuItem>
            <MenuItem value="wrandom">Weight Random</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Queue Settings
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              margin="dense"
              label="Timeout (seconds)"
              type="number"
              name="timeout"
              value={formData.timeout}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              margin="dense"
              label="Wrap-up Time (seconds)"
              type="number"
              name="wrapuptime"
              value={formData.wrapuptime}
              onChange={handleInputChange}
            />
          </Grid>
        </Grid>

        <FormControl fullWidth margin="normal">
          <InputLabel>Music on Hold</InputLabel>
          <Select
            name="musiconhold"
            value={formData.musiconhold}
            onChange={handleInputChange}
            label="Music on Hold"
          >
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="none">None</MenuItem>
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          label="Description"
          type="text"
          fullWidth
          name="description"
          value={formData.description || ""}
          onChange={handleInputChange}
        />
      </DialogContent>
      <DialogActions
        sx={{ justifyContent: "space-between", padding: "8px 24px" }}
      >
        <div style={{ flex: "1 0 0" }} />
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmitVoiceQueue}>
          {mode === "edit" ? "Update Voice Queue" : "Add Voice Queue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VoiceQueueDialog;
