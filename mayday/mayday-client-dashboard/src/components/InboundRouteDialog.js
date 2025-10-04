// InboundRouteDialog.js

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

// import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import apiClient from "../api/apiClient.js";
import {
  createInboundRoute,
  updateInboundRoute,
} from "../features/inboundRoutes/inboundRouteSlice";

const InboundRouteDialog = ({
  open,
  handleClose,
  inboundRouteDataProps,
  mode,
}) => {
  // console.log(inboundRouteDataProps, "inboundRouteDataProps>>>>>")
  // console.log(JSON.stringify(mode))

  const [formData, setFormData] = useState({
    phone_number: "",
    context: "from-voip-provider",
    alias: "",
    description: "",
  });
  // console.log(formData, "formData>>>>")

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  useEffect(() => {
    if (mode === "edit" && inboundRouteDataProps) {
      setFormData({
        phone_number: inboundRouteDataProps.phone_number || "",
        context: inboundRouteDataProps.context || "from-voip-provider",
        alias: inboundRouteDataProps.alias || "",
        description: inboundRouteDataProps.description || "",
      });
    } else {
      setFormData({
        phone_number: "",
        context: "from-voip-provider",
        alias: "",
        description: "",
      });
    }
  }, [inboundRouteDataProps, mode]);

  const handleInputChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  // This is only for updating an existing network configuration
  const handleSubmitInboundRoute = async () => {
    try {
      if (mode === "edit") {
        // const oldPhoneNumber = inboundRouteDataProps.id;
        let newPhoneNumber = formData.phone_number;

        // Fetch existing applications to preserve them
        let existingApplications = [];
        try {
          console.log(
            "Fetching existing applications for route:",
            inboundRouteDataProps.id
          );
          const response = await apiClient.get(
            `/users/inbound_route/get-one/${inboundRouteDataProps.id}`
          );
          if (response.data.success && response.data.route.applications) {
            existingApplications = JSON.parse(response.data.route.applications);
            console.log("Found existing applications:", existingApplications);
          } else {
            console.log("No existing applications found");
          }
        } catch (error) {
          console.warn("Could not fetch existing applications:", error);
        }

        let updatedFormData = {
          ...formData,
          phone_number: newPhoneNumber,
          routeId: inboundRouteDataProps.id,
          applications: existingApplications, // Preserve existing applications
        };
        console.log("Sending updated route data:", updatedFormData);
        const actionResponse = await dispatch(
          updateInboundRoute({
            updatedFormData,
          })
        ).unwrap();
        enqueueSnackbar(actionResponse.message, { variant: "success" });
      } else {
        const FormData = { ...formData };
        const actionResponse = await dispatch(
          createInboundRoute(FormData)
        ).unwrap();
        enqueueSnackbar(actionResponse.message, { variant: "success" });
      }
      handleClose();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || "An unexpected error occurred", {
        variant: "error",
      });
    }
  };

  const contextOptions = [
    { value: "from-sip", label: "from-sip" },
    { value: "from-voip-provider", label: "from-voip-provider" },
    { value: "from-voicemail", label: "from-voicemail" },
    { value: "mayday-mixmonitor-context", label: "mayday-mixmonitor-context" },
  ];

  const isFormValid = () => {
    return formData.phone_number !== "";
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
        {mode === "edit" ? "Edit Inbound Route" : "New Inbound Route"}
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
        <FormControl fullWidth margin="dense"></FormControl>
        <TextField
          required
          margin="dense"
          label="Phone Number"
          type="text"
          fullWidth
          name="phone_number"
          value={formData.phone_number}
          onChange={handleInputChange}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel htmlFor="type">Context</InputLabel>
          <Select
            labelId="context"
            id="context"
            name="context"
            label="Context"
            value={formData.context || "from-voip-provider"}
            onChange={handleInputChange}
          >
            {contextOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          label="Alias"
          type="text"
          fullWidth
          name="alias"
          variant="standard"
          value={formData.alias}
          onChange={handleInputChange}
        />
        <TextField
          margin="dense"
          label="Description"
          type="text"
          fullWidth
          name="description"
          variant="standard"
          value={formData.description}
          onChange={handleInputChange}
        />
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: "space-between",
          padding: "8px 24px",
          alignItems: "center",
        }}
      >
        {/* <IconButton onClick={() => handleDelete(inboundRouteData.id)} color="error" aria-label="delete" sx={{ position: 'absolute', left: 8, bottom: 8 }}>
          <DeleteIcon />
        </IconButton> */}
        <div style={{ flex: "1 0 0" }} />
        <Button onClick={handleClose}>Cancel</Button>
        <div style={{ cursor: isFormValid() ? "inherit" : "not-allowed" }}>
          <Button
            variant="contained"
            onClick={handleSubmitInboundRoute}
            disabled={!isFormValid()}
          >
            {/* {loading ? 'Saving...' : (mode === 'edit' ? 'Update Trunk' : 'Add Inbound Route')} */}
            {mode === "edit" ? "Update Inbound Route" : "Add Inbound Route"}
            {/* {loading ? 'Saving...' : 'Add Inbound Route'} */}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default InboundRouteDialog;
