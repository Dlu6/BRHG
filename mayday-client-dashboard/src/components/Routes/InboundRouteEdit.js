// InboundRouteEdit.js

import { useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogTitle,
  Divider,
  DialogContent,
  DialogActions,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  Toolbar,
  Typography,
  IconButton,
  Select,
  FormControl,
  ListItemText,
  InputLabel,
  MenuItem,
  Menu,
  CircularProgress,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AppsIcon from "@mui/icons-material/Apps";
import FitbitIcon from "@mui/icons-material/Fitbit";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import SaveIcon from "@mui/icons-material/Save";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import IntervalDialog from "./IntervalDialog";
// NOTE: No longer using static intervals from tools/Intervals
// Using dynamic intervals from Redux store (fetched from database) instead
import { useDispatch, useSelector } from "react-redux";
import { TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { Droppable, Draggable, DragDropContext } from "react-beautiful-dnd";

import SearchIcon from "@mui/icons-material/Search";
import AppEditDialog from "./AppEditDialog.js";
import { fetchAgents } from "../../features/agents/agentsSlice.js";
import { fetchVoiceQueues } from "../../features/voiceQueues/voiceQueueSlice.js";
import apiClient from "../../api/apiClient.js";
import { fetchIVRFlows } from "../../features/ivr/ivrSlice";
import { fetchInboundRouteApplications } from "../../features/inboundRoutes/inboundRouteSlice";
import { fetchSoundFiles } from "../../features/audio/audioSlice";
import { fetchIntervals } from "../../features/intervals/intervalSlice";

// Dial Settings

const initialApps = [
  { id: 7, app: "ivr", name: "IVR", type: "IVR" },
  { id: 1, app: "dial", name: "Dial", type: "Dial" },
  { id: 2, app: "internalDial", name: "Internal Dial", type: "InternalDial" }, //Should be of type Dial
  { id: 3, app: "externalDial", name: "External Dial", type: "ExternalDial" }, //Should be of type Dial
  { id: 4, app: "ringGroup", name: "Ring Group", type: "ringGroup" }, //Should be of type Dial
  { id: 5, app: "playback", name: "Playback", type: "Playback" },
  { id: 6, app: "queue", name: "Queue", type: "Queue" },
  { id: 8, app: "set", name: "Set", type: "Set" },
  { id: 10, app: "goTo", name: "GoTo", type: "GoTo" },
  { id: 11, app: "hangup", name: "Hangup", type: "Hangup" },
  { id: 12, app: "sendDTMF", name: "Send DTMF", type: "SendDTMF" },
  { id: 13, app: "custom", name: "Custom", type: "Custom" },
  { id: 14, app: "noOp", name: "NoOp", type: "NoOp" },
  { id: 15, app: "setCallerId", name: "Set Caller ID", type: "SetCallerId" },
  { id: 16, app: "setVariable", name: "Set Variable", type: "SetVariable" },
  //Should append *
  // ...add other apps based on the list in the image
];

const InboundRouteEdit = () => {
  const { agents } = useSelector((state) => state.agents);
  // const { voiceQueues, loading: queuesLoading } = useSelector(
  //   (state) => state.voiceQueue
  // );
  const { queueId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { inboundRouteId } = useParams();
  // log params from useParams
  // console.log(useParams());
  // console.log(inboundRouteId, "<<<<<<inboundRouteId");

  const { enqueueSnackbar } = useSnackbar();

  const [openAgentDialog, setOpenAgentDialog] = useState(false);

  const [availableAgents, setAvailableAgents] = useState(agents);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchSelected, setSearchSelected] = useState("");

  const [openDialog, setOpenDialog] = useState(false);

  const [formData, setFormData] = useState({
    phone_number: "",
    context: "from-voip-provider",
    company: "",
    description: "",
    alias: "",
    applications: [],
    createdAt: "",
    updatedAt: "",
    name: "",
  });

  const [configuredApps, setConfiguredApps] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  // console.log(flows, "<<<<<<flows");

  //Fetch Agents to enure they are loading for adding to the queue
  useEffect(() => {
    dispatch(fetchAgents());
    dispatch(fetchVoiceQueues());
    dispatch(fetchIVRFlows());
    // Only fetch sound files when opening dialog that might need them
  }, [dispatch, openAgentDialog, openDialog]);

  // Separate effect for sound files to prevent frequent fetching
  useEffect(() => {
    // Fetch sound files only once when component mounts
    dispatch(fetchSoundFiles());
    // No dependencies array to ensure it only runs once
  }, [dispatch]);

  useEffect(() => {
    if (location.state) {
      setFormData((prev) => ({
        ...prev,
        ...location.state,
        phone_number: location.state.phone_number || "",
        company: location.state.company || "",
        description: location.state.description || "",
        alias: location.state.alias || "",
        name: location.state.name || "",
        joinempty: Array.isArray(location.state.joinempty)
          ? location.state.joinempty
          : ["yes"],
        leavewhenempty: Array.isArray(location.state.leavewhenempty)
          ? location.state.leavewhenempty
          : ["no"],
      }));
    }
  }, [location.state]);

  // Add this useEffect to fetch voice queues
  useEffect(() => {
    dispatch(fetchVoiceQueues());
  }, [dispatch]);

  // Add this useEffect to load intervals when the component mounts
  useEffect(() => {
    dispatch(fetchIntervals());
  }, [dispatch]);

  const [currentTab, setCurrentTab] = useState("settings");

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === undefined ? "" : value,
    }));
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleClose = () => {
    // setAnchorEl(null);
  };

  const handleSaveVoiceQueue = async () => {
    if (isSaving) return; // Prevent double submission

    setIsSaving(true);
    try {
      // Transform the configured apps to include interval data in both the main object and settings
      const appsWithIntervals = configuredApps.map((app) => {
        // For each app, ensure interval data is properly formatted
        const intervalData = app.interval ? app.interval.id : null;

        return {
          id: app.id,
          name: app.name,
          type: app.type,
          appdata: app.appdata || "",
          priority: app.priority,
          interval: intervalData,
          intervalId: intervalData,
          settings: {
            ...app.settings,
            options: intervalData || "*,*,*,*",
            enabled: app.settings?.enabled ?? true,
            // Add interval info to settings as well to ensure compatibility
            interval: intervalData,
          },
        };
      });

      const routeData = {
        phone_number: formData.phone_number,
        context: formData.context,
        alias: formData.alias,
        description: formData.description,
        applications: appsWithIntervals,
      };

      // console.log("Saving inbound route with applications:", routeData);

      const response = await apiClient.put(
        `/users/inbound_route/update-inbound-route/${inboundRouteId}`,
        routeData
      );

      if (response.data.success) {
        enqueueSnackbar(response.data.message, {
          variant: "success",
        });
        navigate(`/voice/inboundRoutes/${inboundRouteId}`);
      }
    } catch (error) {
      console.error("Error updating inbound route:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Failed to update inbound route",
        {
          variant: "error",
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch existing applications when editing
  useEffect(() => {
    const fetchRouteDetails = async () => {
      if (inboundRouteId) {
        try {
          const applications = await dispatch(
            fetchInboundRouteApplications(inboundRouteId)
          ).unwrap();

          if (applications && Array.isArray(applications)) {
            // Normalize and sort by saved priority so UI reflects execution order
            const parsedApps = applications.map((app, index) => {
              // Extract interval data if available
              let intervalData = null;

              // Check if there's a complete interval object using the new association name
              if (app.interval && typeof app.interval === "object") {
                intervalData = app.interval;
              }
              // First check if interval is directly in the app object as an ID
              else if (app.interval && typeof app.interval === "string") {
                intervalData = { id: app.interval, name: "Loading..." };
              }
              // Then check if it's in intervalId
              else if (app.intervalId) {
                intervalData = { id: app.intervalId, name: "Loading..." };
              }
              // Finally check if it's in the settings object
              else if (app.settings?.interval) {
                intervalData = {
                  id: app.settings.interval,
                  name: "Loading...",
                };
              }
              // Check if options is actually an interval ID (sometimes the backend stores it this way)
              else if (
                app.settings?.options &&
                app.settings.options !== "*,*,*,*" &&
                !app.settings.options.includes(",")
              ) {
                intervalData = {
                  id: app.settings.options,
                  name: "Loading...",
                };
              }

              return {
                ...app,
                id: app.id || `app-${Date.now()}-${index}`,
                interval: intervalData,
                settings: app.settings || {
                  options: "*,*,*,*",
                  enabled: true,
                },
              };
            });

            // Ensure stable ordering by priority (lowest number = highest priority)
            const ordered = [...parsedApps].sort(
              (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
            );
            // Re-index priorities to be sequential (1..N)
            const renumbered = ordered.map((a, i) => ({
              ...a,
              priority: i + 1,
            }));

            setConfiguredApps(renumbered);

            // Only update formData if phone_number is not already set
            setFormData((prev) => ({
              ...prev,
              phone_number: prev.phone_number || applications[0]?.exten || "",
              context: prev.context || "from-voip-provider",
            }));

            // Load full interval data for any apps that have intervals
            dispatch(fetchIntervals());
          }
        } catch (error) {
          console.error("Error fetching route details:", error);
          enqueueSnackbar(
            error.response?.data?.message || "Failed to load route details",
            {
              variant: "error",
            }
          );
        }
      }
    };

    fetchRouteDetails();
  }, [inboundRouteId, dispatch, enqueueSnackbar]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleClickOpenModelAssociation = () => {
    setOpenAgentDialog(true);
  };

  const handleCloseModelAssociation = () => {
    setOpenAgentDialog(false);
  };

  const handleSaveSelectedAgents = () => {
    // Assemble the update data with the selected agents
    // const updateData = {
    //   ...formData, // include all other form data you might need to save
    //   selectedAgents: selectedAgents.map((agent) => agent.id), // Assuming each agent has a unique ID
    // };
    // Dispatch the Redux action to save the updated queue details
    // dispatch(updateVoiceQueueDetails({ id: queueId, updateData }))
    // .unwrap()
    // .then(response => {
    //     enqueueSnackbar("Agents successfully added to the queue", { variant: 'success' });
    //     setOpenDialog(false); // Close the dialog upon successful update
    // })
    // .catch(error => {
    //     enqueueSnackbar(error.message, { variant: 'error' });
    // });
  };

  const handleToggle = (agent) => {
    const selectedIndex = selectedAgents.indexOf(agent);
    let newAvailableAgents = [...availableAgents];
    let newSelectedAgents = [...selectedAgents];

    if (selectedIndex === -1) {
      newSelectedAgents = newSelectedAgents.concat(agent);
      newAvailableAgents = newAvailableAgents.filter((a) => a.id !== agent.id);
    } else {
      newSelectedAgents = newSelectedAgents.filter((a) => a.id !== agent.id);
      newAvailableAgents = newAvailableAgents.concat(agent);
    }

    setAvailableAgents(newAvailableAgents);
    setSelectedAgents(newSelectedAgents);
  };

  // Adds all agents to the selected list
  const handleAddAllAgents = () => {
    setSelectedAgents(selectedAgents.concat(availableAgents));
    setAvailableAgents([]);
  };

  // Removes all agents from the selected list
  const handleRemoveAllAgents = () => {
    setAvailableAgents(availableAgents.concat(selectedAgents));
    setSelectedAgents([]);
  };

  // Filter lists based on search input
  const filteredAvailableAgents = availableAgents.filter((agent) =>
    agent.username.includes(searchAvailable)
  );

  const filteredSelectedAgents = selectedAgents.filter((agent) =>
    agent.username.includes(searchSelected)
  );

  // Search handlers
  const handleSearchAvailable = (event) => {
    setSearchAvailable(event.target.value);
  };

  const handleSearchSelected = (event) => {
    setSearchSelected(event.target.value);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Top Bar */}
      <AppBar
        position="static"
        color="default"
        elevation={1}
        sx={{ marginBottom: 2 }}
      >
        <Toolbar sx={{ minHeight: "64px", paddingY: "8px" }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={handleBack}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem" }}>
              #{queueId} {formData.name}
            </Typography>
            <Typography variant="caption" display="block">
              Created at:{" "}
              {formData.createdAt
                ? new Date(formData.createdAt).toLocaleString()
                : "Unknown"}
            </Typography>
          </Box>

          {/* Add Agent Button */}
          <Box sx={{ display: "flex", alignItems: "center", mr: 4 }}>
            <Tooltip title="Add agents to queue">
              <IconButton
                sx={{
                  backgroundColor: "#9FC131",
                  "&:hover": {
                    backgroundColor: "#A62B1F",
                  },
                  margin: "0 8px",
                }}
                color="#ffff"
                onClick={handleClickOpenModelAssociation}
              >
                <PersonAddIcon />
              </IconButton>
            </Tooltip>

            {/* Settings or Manage Agents Button */}
            <Tooltip title="Add team to queue">
              <IconButton
                sx={{
                  backgroundColor: "#F20020",
                  "&:hover": {
                    backgroundColor: "#F28709",
                  },
                  margin: "0 8px",
                }}
                color="inherit"
                onClick={() => {}}
              >
                <GroupAddIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            onClick={handleSaveVoiceQueue}
            color="primary"
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <IconButton color="inherit">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="inbound route details tabs"
      >
        <Tab label="Settings" value="settings" />
        <Tab label="Action" value="action" />
      </Tabs>
      {/* Content Card */}
      <Card variant="outlined" sx={{ boxShadow: 3 }}>
        {/* <CardContent> */}
        {currentTab === "settings" && (
          <SettingsTabContent
            formData={formData}
            handleInputChange={handleInputChange}
          />
        )}
        {currentTab === "action" && (
          <ActionTabContent
            handleClose={handleClose}
            agents={agents}
            openDialog={openDialog}
            setOpenDialog={setOpenDialog}
            configuredApps={configuredApps}
            setConfiguredApps={setConfiguredApps}
          />
        )}
        {/* </CardContent> */}
      </Card>
      <Dialog
        open={openAgentDialog}
        onClose={handleCloseModelAssociation}
        aria-labelledby="form-dialog-title"
        fullWidth={true}
        maxWidth="sm"
      >
        <DialogTitle
          id="form-dialog-title"
          style={{ backgroundColor: "#2C5FC4", color: "white" }}
        >
          Add Agent To Voice Queue
          <IconButton
            aria-label="close"
            onClick={handleCloseModelAssociation}
            style={{
              position: "absolute",
              right: "8px",
              top: "8px",
              color: "white",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="penalty"
            label="Penalty *"
            type="number"
            fullWidth
            defaultValue={0}
            style={{ marginTop: "18px" }}
          />
          <Grid container spacing={2}>
            <Grid item xs={5}>
              <TextField
                margin="dense"
                id="searchAvailableAgents"
                placeholder="Search..."
                value={searchAvailable}
                onChange={handleSearchAvailable}
                type="search"
                fullWidth
                variant="standard"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{
                  style: { lineHeight: "1.4375em" },
                }}
                style={{ marginTop: "8px" }}
              />
              <Box
                style={{
                  height: "350px",
                  display: "flex",
                  flexDirection: "column",
                  marginTop: "8px",
                }}
              >
                <Card
                  variant="outlined"
                  style={{ flexGrow: 1, overflow: "auto" }}
                >
                  <CardContent>
                    <Typography gutterBottom>Available Agents</Typography>
                    <List style={{ maxHeight: "200px", overflow: "auto" }}>
                      {filteredAvailableAgents.map((agent) => (
                        <ListItem
                          key={agent.id}
                          button
                          onClick={() => handleToggle(agent)}
                        >
                          <ListItemIcon>
                            <Checkbox
                              checked={selectedAgents.some(
                                (selectedAgent) => selectedAgent.id === agent.id
                              )}
                            />
                          </ListItemIcon>
                          <ListItemText primary={agent.username} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
                {/* Counter of available agents */}
                <Typography
                  variant="body2"
                  style={{
                    textAlign: "start",
                    padding: "8px",
                    paddingTop: "16px",
                  }}
                >
                  {agents.length} Available
                </Typography>
              </Box>
            </Grid>
            <Grid
              item
              xs={2}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-around",
              }}
            >
              <IconButton onClick={handleAddAllAgents} aria-label="add all">
                {/* <AddIcon /> */}
                {/* <KeyboardDoubleArrowLeftIcon /> */}
                <KeyboardDoubleArrowRightIcon />
              </IconButton>
              <IconButton
                onClick={handleRemoveAllAgents}
                aria-label="remove all"
              >
                {/* <RemoveIcon /> */}
                <KeyboardDoubleArrowLeftIcon />
              </IconButton>
            </Grid>
            <Grid item xs={5}>
              <TextField
                margin="dense"
                id="searchSelectedAgents"
                // label="Search..."
                value={searchSelected}
                onChange={handleSearchSelected}
                placeholder="Search..."
                type="search"
                fullWidth
                variant="standard"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{
                  style: { lineHeight: "1.4375em" },
                }}
                style={{ marginTop: "8px" }}
              />
              <Box
                style={{
                  height: "350px",
                  display: "flex",
                  flexDirection: "column",
                  marginTop: "8px",
                }}
              >
                <Card
                  variant="outlined"
                  style={{ flexGrow: 1, overflow: "auto" }}
                >
                  <CardContent>
                    <Typography gutterBottom>Assoc Agents</Typography>
                    <List>
                      {filteredSelectedAgents.map((agent) => (
                        <ListItem
                          key={agent.id}
                          button
                          onClick={() => handleToggle(agent)}
                        >
                          <ListItemIcon>
                            <Checkbox
                              checked={selectedAgents.some(
                                (selectedAgent) => selectedAgent.id === agent.id
                              )}
                            />
                          </ListItemIcon>
                          <ListItemText primary={agent.username} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
                <Typography
                  variant="body2"
                  style={{
                    textAlign: "end",
                    padding: "8px",
                    paddingTop: "16px",
                  }}
                >
                  {selectedAgents.length} Selected
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions style={{ marginBottom: "16px" }}>
          <Button onClick={handleCloseModelAssociation} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSaveSelectedAgents}
            color="primary"
            variant="contained"
          >
            Add Selected Agents
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const SettingsTabContent = ({ formData, handleInputChange }) => {
  const contextOptions = [
    { value: "from-voip-provider", label: "from-voip-provider" },
    { value: "from-sip", label: "from-sip" },
    { value: "mix-monitor-context", label: "mix-monitor-context" },
  ];

  return (
    <Box p={3}>
      <Typography variant="h6">General</Typography>

      {/* Phone Number */}
      <TextField
        label="Phone Number"
        value={formData.phone_number || ""}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="standard"
        name="phone_number"
        inputProps={{
          pattern: "[0-9+*#]*", // Only allow numbers and special characters
          title: "Only numbers and special characters (+*#) are allowed",
        }}
        helperText="Enter the phone number (numbers and special characters only)"
      />

      {/* Context */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="type">Context</InputLabel>
        <Select
          labelId="context"
          id="context"
          name="context"
          label="context"
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

      {/* Company */}
      <TextField
        margin="dense"
        label="Company"
        type="text"
        fullWidth
        name="company"
        variant="standard"
        value={formData.company || ""}
        onChange={handleInputChange}
      />

      {/* Description */}
      <TextField
        margin="dense"
        label="Description"
        type="text"
        fullWidth
        name="description"
        variant="standard"
        value={formData.description || ""}
        onChange={handleInputChange}
      />
    </Box>
  );
};

//Header For Drag Drop
const DragDropRoutingHeader = () => {
  return (
    <>
      <Paper
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "3px",
        }}
      >
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            width: "100%",
          }}
        >
          <Checkbox disabled style={{ padding: "0" }} />{" "}
          {/* Replace this with actual checkbox if needed */}
          <Typography
            variant="subtitle1"
            style={{ width: "10%", fontSize: "14px" }}
          >
            Priority
          </Typography>
          <Typography
            variant="subtitle1"
            style={{ width: "10%", fontSize: "14px", marginLeft: "20px" }}
          >
            Type
          </Typography>
          <Typography
            variant="subtitle1"
            style={{ width: "50%", fontSize: "14px" }}
          >
            Appdata
          </Typography>
          <Typography
            variant="subtitle1"
            style={{ width: "20%", fontSize: "14px" }}
          >
            Interval
          </Typography>
        </Box>
        <IconButton>
          <SearchIcon />
        </IconButton>
      </Paper>
      <Divider />
    </>
  );
};

const ActionTabContent = ({
  agents,
  openDialog,
  setOpenDialog,
  configuredApps,
  setConfiguredApps,
}) => {
  const { loading, error } = useSelector((state) => state.inboundRoute);
  const [editableApp, setEditableApp] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentEditingAppId, setCurrentEditingAppId] = useState(null);
  const [openIntervalDialog, setOpenIntervalDialog] = useState(false);
  const [editingIntervalForApp, setEditingIntervalForApp] = useState(null);
  const { flows: ivrFlows, loading: ivrLoading } = useSelector(
    (state) => state.ivr
  );
  const { files: audioFiles } = useSelector((state) => state.audio);
  const { intervals } = useSelector((state) => state.intervals);
  const dispatch = useDispatch();

  useEffect(() => {
    // Make sure we have audio files loaded when this component mounts
    dispatch(fetchSoundFiles());
  }, [dispatch]);

  // Update interval data in configuredApps when intervals are loaded
  useEffect(() => {
    if (intervals.length > 0 && configuredApps.length > 0) {
      // Check if any configuredApp has an interval that needs to be updated
      const needsUpdate = configuredApps.some(
        (app) => app.interval?.id && app.interval.name === "Loading..."
      );

      if (needsUpdate) {
        const updatedApps = configuredApps.map((app) => {
          // If this app has an interval ID but not full interval data
          if (app.interval?.id) {
            // Find the interval in the loaded intervals
            const fullInterval = intervals.find(
              (interval) => interval.id === app.interval.id
            );
            if (fullInterval) {
              return { ...app, interval: fullInterval };
            }
          }
          return app;
        });

        setConfiguredApps(updatedApps);
      }
    }
  }, [intervals, configuredApps]);

  if (loading) return <div>Loading...</div>;
  // Adorn the error message
  if (error)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100%",
          backgroundColor: "#f4f4f4",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Error Icon */}
        <ErrorOutlineIcon style={{ fontSize: "48px", color: "#ff4444" }} />
        <Typography variant="h6" style={{ marginBottom: "16px" }}>
          Error Loading Route Configuration
        </Typography>
        <Typography variant="body1" style={{ textAlign: "center" }}>
          {error}
        </Typography>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );

  const updatePriorities = (appsArray) => {
    // Priority is strictly based on UI order: 1 (top) .. N (bottom)
    return appsArray.map((app, index) => ({
      ...app,
      priority: index + 1,
    }));
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;

    // Nothing happens if dropped outside a droppable area
    if (!destination) return;

    let newConfiguredApps = Array.from(configuredApps);

    if (
      source.droppableId === "appsList" &&
      destination.droppableId === "dropZone"
    ) {
      // Create new app instance from template
      const appToConfigure = {
        ...initialApps[source.index],
        id: `${initialApps[source.index].app}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        appdata: "", // Initialize empty appdata
        settings: {
          options: "*,*,*,*",
          enabled: true,
        },
        interval: null, // Initialize with no interval
        priority: configuredApps.length + 1,
      };

      // Adding the new app instance to the configuredApps at the dropped position
      newConfiguredApps.splice(destination.index, 0, appToConfigure);

      // Update priorities and set state
      newConfiguredApps = handlePriorityUpdate(newConfiguredApps);

      // Open dialog for configuration
      setEditableApp(appToConfigure);
      setOpenDialog(true);
    } else if (
      source.droppableId === "dropZone" &&
      destination.droppableId === "dropZone"
    ) {
      // Reorder configuredApps
      const [relocatedApp] = newConfiguredApps.splice(source.index, 1);
      newConfiguredApps.splice(destination.index, 0, relocatedApp);
    }

    // Update priorities after any change in order
    newConfiguredApps = updatePriorities(newConfiguredApps);

    // Update the state with the new configuration
    setConfiguredApps(newConfiguredApps);

    // Prepare for editing the new app or the app that has changed position
    setEditableApp(newConfiguredApps[destination.index]);
    setOpenDialog(true);
  };

  const handleSaveApplicationSettings = (appId, appData, savedApp = null) => {
    const updatedApps = configuredApps.map((app) => {
      if (app.id === appId) {
        // If a complete savedApp object is provided, use it
        if (savedApp) {
          return savedApp;
        }
        // Otherwise just update the appdata
        return { ...app, appdata: appData };
      }
      return app;
    });
    setConfiguredApps(updatedApps);
  };

  // Function to handle priority changes when reordering
  const handlePriorityUpdate = (newApps) => {
    // First, ensure all apps have valid sequential priorities
    const appsWithPriorities = updatePriorities(newApps);
    setConfiguredApps(appsWithPriorities);
    return appsWithPriorities;
  };

  const handleApplicationMenuOpen = (event, appId) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentEditingAppId(appId); // Keep track of which app is being edited
  };

  const handleApplicationMenuClose = () => {
    setMenuAnchorEl(null);
    setCurrentEditingAppId(null);
  };

  //Remove App from Configuration Area
  const handleRemoveApp = () => {
    const updatedApps = configuredApps.filter(
      (app) => app.id !== currentEditingAppId
    );
    setConfiguredApps(updatedApps);
    handleApplicationMenuClose();
  };
  const handleEditConfiguredApplication = (appId) => {
    const appToEdit = configuredApps.find((app) => app.id === appId);

    // Log app details for debugging
    console.log("Editing app:", appToEdit);
    console.log("Current audio files:", audioFiles);

    // Always refresh audio files when editing a Playback app
    if (appToEdit && appToEdit.type === "Playback") {
      dispatch(fetchSoundFiles());
    }

    setEditableApp(appToEdit);
    setOpenDialog(true);
  };

  const handleSaveInterval = (interval) => {
    // Create a new array with updated interval data
    const newConfiguredApps = configuredApps.map((app) => {
      if (app.id === editingIntervalForApp.id) {
        return {
          ...app,
          interval: interval,
          settings: {
            ...app.settings,
            options: interval ? interval.id : "*,*,*,*",
            interval: interval ? interval.id : null,
          },
        };
      }
      return app;
    });

    setConfiguredApps(newConfiguredApps);
    setOpenIntervalDialog(false);
    setEditingIntervalForApp(null);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Grid container spacing={4} style={{ margin: 0, width: "100%" }}>
        {/* Left container for the list of available apps */}
        <Grid item xs={4}>
          <Typography variant="h6" style={{ fontSize: "16px" }}>
            Applications List
          </Typography>
          <Divider style={{ borderWidth: "1px", marginBottom: "6px" }} />
          <Droppable droppableId="appsList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {initialApps.map((app, index) => (
                  <Draggable
                    key={app.id}
                    draggableId={app.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        elevation={snapshot.isDragging ? 3 : 1}
                        style={{
                          ...getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          ),
                          cursor: "move", // Changing cursor to 'grab'
                          padding: "8px",
                          margin: "0 0 8px 0",
                          backgroundColor: snapshot.isDragging
                            ? "#f4f4f4"
                            : "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <AppsIcon
                            style={{
                              marginRight: "8px",
                              color: "gray",
                              fontSize: "13px",
                            }}
                          />
                          {/* Render the app component here */}
                          {app.name}
                        </div>
                      </Paper>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </Grid>

        {/* Right container for the drop area */}
        <Grid item xs={8}>
          <Typography variant="h6" style={{ fontSize: "16px" }}>
            Drag & Drop Routing
          </Typography>
          <DragDropRoutingHeader />
          <Droppable droppableId="dropZone">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={getDroppableStyle(snapshot.isDraggingOver)}
              >
                {configuredApps.map((app, index) => (
                  <Draggable
                    key={app.id}
                    draggableId={app.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        {/* Render the app component here */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            height: "19px",
                            padding: "8px",
                            margin: "0 0 8px 0",
                          }}
                          onClick={(e) => {
                            // Only open dialog if not clicking menu icon or checkbox
                            if (
                              !e.target.closest(".MuiIconButton-root") &&
                              !e.target.closest(".MuiCheckbox-root")
                            ) {
                              handleEditConfiguredApplication(app.id);
                            }
                          }}
                        >
                          <Checkbox />
                          <Typography
                            variant="body2"
                            style={{
                              width: "10%", // match the width with the header
                              marginRight: "10px",
                              fontSize: "14px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {app.priority}
                          </Typography>
                          {/* <DragIndicatorIcon style={{ marginRight: '10px', color: "gray", fontSize: "12px" }} /> */}
                          <FitbitIcon
                            style={{
                              marginRight: "10px",
                              color: "gray",
                              fontSize: "15px",
                            }}
                          />
                          <Typography
                            variant="body1"
                            style={{
                              flexGrow: 1,
                              width: "10%", // match the width with the header
                              fontSize: "13.5px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {app.name}
                          </Typography>

                          {/* Render appData string */}
                          <Typography
                            variant="body1"
                            style={{
                              width: "60%", // match the width with the header and add truncation
                              marginRight: "10px",
                              fontSize: "13px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {app.appdata || ""}
                          </Typography>

                          <Typography
                            variant="body1"
                            style={{
                              width: "20%",
                              fontSize: "14px",
                              marginLeft: "14px",
                              display: "flex",
                              alignItems: "center",
                              color: app?.interval ? "#2C5FC4" : "gray",
                              fontWeight: app?.interval ? "500" : "normal",
                            }}
                          >
                            {app?.interval ? (
                              <>
                                <span
                                  style={{
                                    maxWidth: "calc(100% - 30px)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {app.interval.name}
                                </span>
                              </>
                            ) : (
                              <span
                                style={{ fontStyle: "italic", opacity: 0.7 }}
                              >
                                None
                              </span>
                            )}
                          </Typography>
                          <IconButton
                            style={{
                              marginRight: "10px",
                              color: app?.interval ? "#2C5FC4" : "inherit",
                              backgroundColor: app?.interval
                                ? "rgba(44, 95, 196, 0.1)"
                                : "transparent",
                            }}
                            onClick={() => {
                              setEditingIntervalForApp(app);
                              setOpenIntervalDialog(true);
                            }}
                          >
                            <AccessTimeIcon />
                          </IconButton>
                          <IconButton
                            aria-label="more"
                            aria-controls="long-menu"
                            aria-haspopup="true"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleApplicationMenuOpen(event, app.id);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </Grid>

        {/* Move Menu here, outside of the map */}
        <Menu
          id="long-menu"
          anchorEl={menuAnchorEl}
          keepMounted
          open={Boolean(menuAnchorEl)}
          onClose={handleApplicationMenuClose}
        >
          <MenuItem
            onClick={() => {
              const appToEdit = configuredApps.find(
                (app) => app.id === currentEditingAppId
              );
              if (appToEdit) {
                setEditableApp(appToEdit);
                setOpenDialog(true);
              }
              handleApplicationMenuClose();
            }}
          >
            Edit Application
          </MenuItem>
          <MenuItem
            onClick={() => {
              const appToEdit = configuredApps.find(
                (app) => app.id === currentEditingAppId
              );
              if (appToEdit) {
                setEditingIntervalForApp(appToEdit);
                setOpenIntervalDialog(true);
              }
              handleApplicationMenuClose();
            }}
          >
            Edit Interval
          </MenuItem>
          <MenuItem onClick={handleRemoveApp}>Delete Application</MenuItem>
        </Menu>

        {editableApp && (
          <AppEditDialog
            app={editableApp}
            open={openDialog}
            onSave={handleSaveApplicationSettings}
            onClose={() => {
              setEditableApp(null);
              setOpenDialog(false);
            }}
            agents={agents}
            ivrFlows={ivrFlows}
            ivrLoading={ivrLoading}
          />
        )}

        {/* Interval Dialog */}
        {editingIntervalForApp && (
          <IntervalDialog
            open={openIntervalDialog}
            onClose={() => {
              setOpenIntervalDialog(false);
              setEditingIntervalForApp(null);
            }}
            currentInterval={editingIntervalForApp.interval}
            onSave={handleSaveInterval}
          />
        )}
      </Grid>
    </DragDropContext>
  );
};

// const getListStyle = (isDraggingOver) => ({
//   background: isDraggingOver ? "lightblue" : "lightgrey",
//   padding: 8,
//   minHeight: 500, // Set a minimum height for the droppable area
// });

const getDroppableStyle = (isDraggingOver) => ({
  background: isDraggingOver ? "lightblue" : "lightgrey",
  padding: 8,
  minHeight: 500, // Same here for consistent appearance
});

const getItemStyle = (isDragging, draggableStyle) => ({
  // userSelect: "none",
  padding: 16,
  margin: "0 0 8px 0",
  background: isDragging ? "lightgreen" : "#9FC131",
  display: "flex",
  justifyContent: "space-between",
  ...draggableStyle,
});

export default InboundRouteEdit;
