import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Input,
  FormHelperText,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  FormControlLabel,
  Switch,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { createAgent, fetchAgents } from "../../features/agents/agentsSlice";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";

const NewAgentForm = ({ open, handleClose }) => {
  const loading = useSelector((state) => state.agents.loading);
  // const socketConnected = useSelector((state) => state.agents.socketConnected);
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [agentDetails, setAgentDetails] = useState({
    fullName: "",
    username: "",
    alias: "",
    typology: "webRTC",
    email: "",
    phone: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    autoGenerateNumber: true,
    description: "",
    voicemail: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAgentDetails({ ...agentDetails, [name]: value });
  };

  const handleToggleChange = (e) => {
    setAgentDetails({ ...agentDetails, [e.target.name]: e.target.checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    //Password Validation
    if (agentDetails.password !== agentDetails.confirmPassword) {
      // alert('Passwords do not match');
      enqueueSnackbar("Passwords do not match", { variant: "error" });
      return;
    }
    // Submit data to the server and create agent with asterisk
    try {
      // Wait for the createAgent action to complete before fetching the updated list
      const actionResult = await dispatch(
        createAgent({
          fullName: agentDetails.fullName,
          username: agentDetails.username,
          alias: agentDetails.alias,
          typology: agentDetails.typology,
          email: agentDetails.email,
          password: agentDetails.password,
          autoGenerateNumber: agentDetails.autoGenerateNumber,
          description: agentDetails.description,
          voicemail: agentDetails.voicemail,
        })
      ).unwrap();

      // Always fetch agents after creation, regardless of socket status
      await dispatch(fetchAgents());

      enqueueSnackbar(actionResult.message, { variant: "success" });

      // Reset form
      setAgentDetails({
        fullName: "",
        username: "",
        alias: "",
        typology: "webRTC",
        email: "",
        password: "",
        confirmPassword: "",
        autoGenerateNumber: true,
        description: "",
        voicemail: false,
      });

      handleClose(); // Close the dialog on successful submit
    } catch (error) {
      // error can be a string or a structured object from rejectWithValue
      console.error("Failed to create agent:", error);

      const friendly =
        typeof error === "string"
          ? { message: error }
          : error || { message: "Failed to create agent" };

      // Field-level hints for quick fixes
      if (friendly.field === "email") {
        enqueueSnackbar(
          friendly.message || "Email already exists. Use a different email.",
          { variant: "error" }
        );
      } else if (friendly.field === "username") {
        enqueueSnackbar(
          friendly.message || "Username already exists. Choose another.",
          { variant: "error" }
        );
      } else if (friendly.field === "extension") {
        enqueueSnackbar(
          friendly.message ||
            "Internal number is already in use. Try a different one or enable auto-generate.",
          { variant: "error" }
        );
      } else {
        // Generic fallback with guidance
        enqueueSnackbar(
          friendly.message ||
            "Could not create agent. Please verify inputs and try again.",
          { variant: "error" }
        );
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: loading ? "#6B343A" : "#540710",
          m: 0,
          p: 2,
          color: loading ? "#BAB9B9" : "#f0f0f0",
        }}
      >
        {loading ? "Creating New Agent..." : "Add New Agent"}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ mt: 1, position: "relative" }}
        >
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.5)", // Semi-transparent background
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "not-allowed",
                zIndex: 2, // Ensure it covers the form fields
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel htmlFor="fullName">Full Name</InputLabel>
            <Input
              id="fullName"
              name="fullName"
              value={agentDetails.fullName}
              onChange={handleInputChange}
              autoComplete="username"
              disabled={loading}
              required
            />
          </FormControl>
          <FormControl fullWidth margin="normal" sx={{ mt: 3 }}>
            <InputLabel htmlFor="username">Username</InputLabel>
            <Input
              id="username"
              name="username"
              value={agentDetails.username}
              onChange={handleInputChange}
              autoComplete="username"
              required
              disabled={loading}
            />
            <FormHelperText>
              Only numbers, letters, and specific characters (_) are supported
            </FormHelperText>
          </FormControl>
          {/* ... Other input fields */}
          <FormControl fullWidth margin="normal" sx={{ mt: 3 }}>
            <InputLabel htmlFor="typology">Typology</InputLabel>
            <Select
              id="typology"
              name="typology"
              value={agentDetails.typology}
              onChange={handleInputChange}
              required
              label="Typology"
            >
              <MenuItem value="webRTC">WebRTC Appbar</MenuItem>
              <MenuItem value="chrome_softphone">Chrome Extension</MenuItem>
              <MenuItem value="phonebar">Phonebar</MenuItem>
              <MenuItem value="external">External</MenuItem>
            </Select>
          </FormControl>
          {/* Email */}
          <FormControl fullWidth margin="normal" sx={{ mt: 3 }}>
            <InputLabel htmlFor="email">Email</InputLabel>
            <Input
              id="email"
              name="email"
              type="email"
              value={agentDetails.email}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </FormControl>

          {/* Password */}
          <FormControl fullWidth margin="normal" sx={{ mt: 3 }}>
            <InputLabel htmlFor="password">Password</InputLabel>
            <Input
              id="password"
              name="password"
              type="password"
              value={agentDetails.password}
              onChange={handleInputChange}
              autoComplete="new-password"
              required
              disabled={loading}
              // style={{ cursor: loading ? 'not-allowed' : 'auto' }}
            />
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={agentDetails.confirmPassword}
              onChange={handleInputChange}
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </FormControl>
          {/* Internal Number */}
          <FormControlLabel
            sx={{ mt: 4 }}
            control={
              <Switch
                checked={agentDetails.autoGenerateNumber}
                onChange={handleToggleChange}
                name="autoGenerateNumber"
                color="primary"
              />
            }
            label="Auto generate internal number"
          />
          {/* Description */}
          <FormControl fullWidth margin="normal" sx={{ mt: 4 }}>
            <InputLabel htmlFor="description">Description</InputLabel>
            <Input
              id="description"
              name="description"
              value={agentDetails.description}
              onChange={handleInputChange}
              disabled={loading}
            />
          </FormControl>
          {/* Voicemail */}
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Switch
                checked={agentDetails.voicemail}
                onChange={handleToggleChange}
                name="voicemail"
                color="primary"
              />
            }
            label="Voicemail"
          />

          {/* Submit button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 4,
              mb: 2,
              backgroundColor: loading ? "#666363" : "primary.main",
              "&:hover": {
                backgroundColor: loading ? "#cccccc" : "primary.dark",
              },
              cursor: loading && "not-allowed",
            }}
            disabled={loading}
          >
            {loading ? "Creating Agent..." : "Add Agent"}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NewAgentForm;
