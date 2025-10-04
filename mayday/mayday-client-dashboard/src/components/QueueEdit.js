// AgentEditComponent.jsx

import { useEffect, useState } from "react";
import {
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  Tabs,
  Tab,
  Tooltip,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Select,
  Switch,
  Stack,
  FormControl,
  FormControlLabel,
  FormHelperText,
  ListItemText,
  InputLabel,
  MenuItem,
} from "@mui/material";
// import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import CloseIcon from "@mui/icons-material/Close";
// import AddIcon from "@mui/icons-material/Add";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
// import RemoveIcon from "@mui/icons-material/Remove";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import SaveIcon from "@mui/icons-material/Save";
// import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
// import SettingsIcon from '@mui/icons-material/Settings';
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import SearchIcon from "@mui/icons-material/Search";
// import Tooltip from '@mui/material/Tooltip';

import {
  addQueueMembers,
  // fetchVoiceQueues,
  getQueueMembers,
  removeQueueMember,
  updateVoiceQueueDetails,
} from "../features/voiceQueues/voiceQueueSlice.js";
import { fetchAgents } from "../features/agents/agentsSlice.js";
import apiClient from "../api/apiClient.js";
import LoadingIndicator from "./common/LoadingIndicator.js";

const QueueEdit = () => {
  const { agents, loading } = useSelector((state) => state.agents);
  const { queueId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [openDialog, setOpenDialog] = useState(false);
  const [availableAgents, setAvailableAgents] = useState(agents);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [asteriskEndpoints, setAsteriskEndpoints] = useState([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState([]);
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchSelected, setSearchSelected] = useState("");
  const [currentQueueMembers, setCurrentQueueMembers] = useState([]);
  //   console.log(currentQueueMembers, "currentQueueMembers>>>>>>");

  const [formData, setFormData] = useState({
    name: "",
    strategy: "ringall",
    timeout: "15",
    retry: "5",
    wrapuptime: "0",
    maxlen: "0",
    weight: "0",
    servicelevel: "0",
    musiconhold: "default",
    announce_frequency: "0",
    announce_holdtime: "no",
    announce_position: "no",
    joinempty: ["yes"],
    leavewhenempty: ["no"],
    ringinuse: "no", // Changed to match database default
    autopause: "no",
    setinterfacevar: "no",
    setqueuevar: "no",
    monitor_format: "gsm",
    context: "from-queue",
    description: "",
    periodicAnnounce: [], // Initialize as an empty array
  });

  //Fetch Agents to enure they are loading for adding to the queue
  useEffect(() => {
    dispatch(fetchAgents());
  }, [dispatch, openDialog]);

  useEffect(() => {
    if (location.state) {
      // console.log("Received queue data:", location.state);

      // Helper function to ensure array
      const ensureArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          return value.includes(",") ? value.split(",") : [value];
        }
        return [value];
      };

      const transformedData = {
        ...location.state,
        joinempty: ensureArray(location.state.joinempty),
        leavewhenempty: ensureArray(location.state.leavewhenempty),
        wrapuptime: location.state.wrapuptime || "0",
        musiconhold: location.state.musiconhold || "default",
        announce_holdtime: location.state.announce_holdtime || "no",
        announce_position: location.state.announce_position || "no",
        ringinuse: location.state.ringinuse || "no", // Ensure it's a string value
        autopause: location.state.autopause || "no",
        setinterfacevar: location.state.setinterfacevar || "no",
        setqueuevar: location.state.setqueuevar || "no",
      };

      // console.log("Transformed data:", transformedData);
      setFormData(transformedData);
    }
  }, [location.state]);

  const [currentTab, setCurrentTab] = useState("settings");

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    // Special handling for single-value fields that might come as arrays
    const singleValueFields = [
      "ringinuse",
      "autopause",
      "setinterfacevar",
      "setqueuevar",
    ];

    setFormData((prev) => ({
      ...prev,
      [name]:
        singleValueFields.includes(name) && Array.isArray(value)
          ? value[0]
          : value,
    }));
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSaveVoiceQueue = async () => {
    try {
      const queueSettings = {
        id: queueId,
        name: formData.name,
        strategy: formData.strategy,
        timeout: parseInt(formData.timeout),
        retry: parseInt(formData.retry),
        wrapuptime: parseInt(formData.wrapuptime),
        maxlen: parseInt(formData.maxlen),
        servicelevel: parseInt(formData.servicelevel),
        weight: parseInt(formData.weight),
        musiconhold: Array.isArray(formData.musiconhold)
          ? formData.musiconhold[0]
          : formData.musiconhold,
        announce_frequency: parseInt(formData.announce_frequency),
        announce_holdtime: Array.isArray(formData.announce_holdtime)
          ? formData.announce_holdtime[0]
          : formData.announce_holdtime,
        announce_position: Array.isArray(formData.announce_position)
          ? formData.announce_position[0]
          : formData.announce_position,
        joinempty: Array.isArray(formData.joinempty)
          ? formData.joinempty.join(",")
          : formData.joinempty,
        leavewhenempty: Array.isArray(formData.leavewhenempty)
          ? formData.leavewhenempty.join(",")
          : formData.leavewhenempty,
        ringinuse: Array.isArray(formData.ringinuse)
          ? formData.ringinuse[0]
          : formData.ringinuse,
        autopause: Array.isArray(formData.autopause)
          ? formData.autopause[0]
          : formData.autopause,
        setinterfacevar: Array.isArray(formData.setinterfacevar)
          ? formData.setinterfacevar[0]
          : formData.setinterfacevar,
        setqueuevar: Array.isArray(formData.setqueuevar)
          ? formData.setqueuevar[0]
          : formData.setqueuevar,
        monitor_format: formData.monitor_format,
        context: formData.context,
        description: formData.description,
      };

      const resultAction = await dispatch(
        updateVoiceQueueDetails(queueSettings)
      ).unwrap();
      enqueueSnackbar(resultAction.message, { variant: "success" });
    } catch (error) {
      console.error("Error updating queue:", error);
      enqueueSnackbar(error.message || "Failed to update queue", {
        variant: "error",
      });
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography variant="h6">Loading Queue Details...</Typography>
        <LoadingIndicator />
      </Box>
    );
  }

  const handleClickOpenModelAssociation = async () => {
    try {
      const [queueMembersResponse, endpointsResponse] = await Promise.all([
        apiClient.get(`/users/voice_queue/${queueId}/members`),
        apiClient.get("/users/voice_queue/available-endpoints"),
      ]);

      const currentMembers =
        queueMembersResponse.data.members?.map((member) => ({
          id: member.interface.replace("PJSIP/", ""),
          extension: member.interface.replace("PJSIP/", ""),
          username: member.membername,
          interface: member.interface,
          penalty: member.penalty,
          status: member.status,
        })) || [];

      const allEndpoints = endpointsResponse.data.endpoints.map((endpoint) => ({
        id: endpoint.id,
        extension: endpoint.extension,
        username: endpoint.username,
        interface: `PJSIP/${endpoint.extension}`,
        status: endpoint.status,
      }));

      const availableEndpoints = allEndpoints.filter(
        (endpoint) =>
          !currentMembers.some(
            (member) => member.extension === endpoint.extension
          )
      );

      setCurrentQueueMembers(currentMembers);
      setSelectedEndpoints(currentMembers); // Initialize with current members
      setAsteriskEndpoints(availableEndpoints);
      setOpenDialog(true);
    } catch (error) {
      console.error("Error fetching queue data:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Failed to fetch queue data",
        {
          variant: "error",
        }
      );
    }
  };
  const handleCloseModelAssociation = () => {
    setOpenDialog(false);
  };

  const handleToggle = (endpoint) => {
    // Check if the endpoint is in the selectedEndpoints list
    const isSelected = selectedEndpoints.some(
      (selected) => selected.extension === endpoint.extension
    );

    if (isSelected) {
      // Remove from selected and add to available
      setSelectedEndpoints(
        selectedEndpoints.filter((e) => e.extension !== endpoint.extension)
      );
      // Only add to asteriskEndpoints if it's not already there
      if (!asteriskEndpoints.some((e) => e.extension === endpoint.extension)) {
        setAsteriskEndpoints([...asteriskEndpoints, endpoint]);
      }
    } else {
      // Add to selected and remove from available
      if (!selectedEndpoints.some((e) => e.extension === endpoint.extension)) {
        setSelectedEndpoints([...selectedEndpoints, endpoint]);
      }
      setAsteriskEndpoints(
        asteriskEndpoints.filter((e) => e.extension !== endpoint.extension)
      );
    }
  };

  const handleSaveSelectedAgents = async () => {
    const penalty = document.getElementById("penalty").value || 0;

    // Compare with currentQueueMembers to determine changes
    const membersToRemove = currentQueueMembers.filter(
      (member) =>
        !selectedEndpoints.some(
          (endpoint) => endpoint.extension === member.extension
        )
    );

    const membersToAdd = selectedEndpoints.filter(
      (endpoint) =>
        !currentQueueMembers.some(
          (member) => member.extension === endpoint.extension
        )
    );

    try {
      // Handle removals
      if (membersToRemove.length > 0) {
        for (const member of membersToRemove) {
          await dispatch(
            removeQueueMember({
              queueId,
              Interface: member.interface, // Use the full interface string
            })
          ).unwrap();
        }
      }

      // Handle additions with username
      if (membersToAdd.length > 0) {
        const memberData = {
          members: membersToAdd.map((endpoint) => ({
            Interface: `PJSIP/${endpoint.extension}`,
            MemberName: endpoint.username || endpoint.extension,
            Penalty: parseInt(penalty),
            Status: endpoint.status,
          })),
        };

        await dispatch(addQueueMembers({ queueId, memberData })).unwrap();
      }

      const changesMade = membersToAdd.length > 0 || membersToRemove.length > 0;

      if (changesMade) {
        enqueueSnackbar(
          `Queue members updated (${membersToAdd.length} added, ${membersToRemove.length} removed)`,
          { variant: "success" }
        );
        await dispatch(getQueueMembers(queueId)).unwrap();
        setOpenDialog(false);
      } else {
        enqueueSnackbar("No changes to queue members", { variant: "info" });
      }
    } catch (error) {
      console.error("Error updating queue members:", error);
      enqueueSnackbar(error.message || "Failed to update queue members", {
        variant: "error",
      });
    }
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
  // const filteredAvailableAgents = availableAgents.filter((agent) =>
  //   agent.username.includes(searchAvailable)
  // );

  // const filteredSelectedAgents = selectedAgents.filter((agent) =>
  //   agent.username.includes(searchSelected)
  // );

  // Update the filter functions
  const filteredAvailableEndpoints = asteriskEndpoints.filter(
    (endpoint) =>
      endpoint.extension
        .toLowerCase()
        .includes(searchAvailable.toLowerCase()) ||
      endpoint.username.toLowerCase().includes(searchAvailable.toLowerCase())
  );

  //   console.log(filteredAvailableEndpoints, "filteredAvailableEndpoints>>>>>>");

  const filteredSelectedEndpoints = selectedEndpoints.filter(
    (endpoint) =>
      endpoint.extension.toLowerCase().includes(searchSelected.toLowerCase()) ||
      endpoint.username.toLowerCase().includes(searchSelected.toLowerCase())
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
        elevation={0}
        sx={{
          backgroundColor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ minHeight: "64px", paddingY: "8px" }}>
          <IconButton edge="start" sx={{ mr: 2 }} onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              #{queueId} {formData.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Created at:{" "}
              {formData.createdAt
                ? new Date(formData.createdAt).toLocaleString()
                : "Unknown"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            <Tooltip title="Add agents to queue">
              <IconButton
                sx={{
                  backgroundColor: (theme) => theme.palette.success.main,
                  color: "white",
                  "&:hover": {
                    backgroundColor: (theme) => theme.palette.success.dark,
                  },
                }}
                onClick={handleClickOpenModelAssociation}
              >
                <PersonAddIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Add team to queue">
              <IconButton
                sx={{
                  backgroundColor: (theme) => theme.palette.primary.main,
                  color: "white",
                  "&:hover": {
                    backgroundColor: (theme) => theme.palette.primary.dark,
                  },
                }}
                onClick={() => {}}
              >
                <GroupAddIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveVoiceQueue}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              mr: 1,
            }}
          >
            Save
          </Button>
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="queue details tabs"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            minWidth: 120,
            fontWeight: 500,
          },
        }}
      >
        <Tab label="Settings" value="settings" />
        <Tab label="Announcements" value="announcements" />
        <Tab label="Advanced" value="advanced" />
      </Tabs>

      {/* Content Card */}
      <Card
        sx={{
          boxShadow: (theme) => theme.shadows[2],
          borderRadius: 2,
          mb: 3,
        }}
      >
        {currentTab === "settings" && (
          <SettingsTabContent
            formData={formData}
            handleInputChange={handleInputChange}
          />
        )}
        {currentTab === "announcements" && (
          <AnnouncementsTabContent
            formData={formData}
            handleInputChange={handleInputChange}
          />
        )}
        {currentTab === "advanced" && (
          <AdvancedTabContent
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
          />
        )}
      </Card>

      {/* Agent Association Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseModelAssociation}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Add Agent To Voice Queue
          <IconButton
            onClick={handleCloseModelAssociation}
            sx={{ color: "inherit" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
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
                id="searchSelectedAgents"
                value={searchAvailable}
                onChange={handleSearchAvailable}
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
                      {filteredAvailableEndpoints.map((member) => (
                        <ListItem
                          key={member.id}
                          button
                          onClick={() => handleToggle(member)}
                        >
                          <ListItemText
                            primary={member.username}
                            secondary={
                              <>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color={
                                    member.status === "online"
                                      ? "success.main"
                                      : "error.main"
                                  }
                                  sx={{ display: "inline" }}
                                >
                                  ●{" "}
                                </Typography>
                                {`Extension: ${member.extension} (Penalty: ${
                                  member.penalty || 0
                                })`}
                              </>
                            }
                          />
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
                  {" "}
                  {filteredAvailableEndpoints.length} All Agents
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
                    <List style={{ maxHeight: "200px", overflow: "auto" }}>
                      {filteredSelectedEndpoints.map((endpoint) => (
                        <ListItem
                          key={endpoint.id}
                          button
                          onClick={() => handleToggle(endpoint)}
                          sx={{
                            backgroundColor:
                              endpoint.status === "online"
                                ? "success.main"
                                : "#f9f0f0",
                            // color: "white",
                            borderRadius: "8px",
                            padding: "8px",
                            margin: "8px",
                            "&:hover": {
                              backgroundColor:
                                endpoint.status === "online"
                                  ? "success.main"
                                  : "#9FC131",
                            },
                          }}
                        >
                          <ListItemIcon>
                            <Checkbox
                              checked={selectedEndpoints.some(
                                (selected) => selected.id === endpoint.id
                              )}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={endpoint.username}
                            secondary={
                              <>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color={
                                    endpoint.status === "online"
                                      ? "success.main"
                                      : "error.main"
                                  }
                                  sx={{ display: "inline" }}
                                >
                                  ●{" "}
                                </Typography>
                                {/* {`Extension: ${endpoint.extension} (${endpoint.status})`} */}
                                {`Extension: ${endpoint.extension} (Penalty: ${endpoint.penalty})`}
                              </>
                            }
                          />
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
                  {selectedEndpoints.length} Selected
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseModelAssociation}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSelectedAgents}
            sx={{ borderRadius: 1 }}
          >
            Commit Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const SettingsTabContent = ({ formData, handleInputChange }) => {
  const strategyOptions = [
    { value: "ringall", label: "Ring All" },
    { value: "rr", label: "Round Robbin" },
    { value: "rrmemory", label: "Round Robin Memory" },
    { value: "leastrecent", label: "Least Recent" },
    { value: "fewestcalls", label: "Fewest Calls" },
    { value: "random", label: "Random" },
    { value: "linear", label: "Linear" },
    { value: "wrandom", label: "Weight Random" },
    { value: "rrordered", label: "Round Robbin Ordered" },
  ];
  const musicOnHold = [
    { value: "default", label: "Default" },
    { value: "noice", label: "Noice" },
    { value: "wait", label: "Wait" },
  ];
  const announceToAgent = [
    { value: "none", label: "None" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const joinempty = [
    { value: "no", label: "no" },
    { value: "yes", label: "yes" },
    { value: "strict", label: "strict" },
    { value: "loose", label: "loose" },
    { value: "paused", label: "paused" },
    { value: "penalty", label: "penalty" },
    { value: "inuse", label: "inuse" },
    { value: "ringing", label: "ringing" },
    { value: "unavailable", label: "unavailable" },
    { value: "invalid", label: "invalid" },
    { value: "unknown", label: "unknown" },
    { value: "wrapup", label: "wrapup" },
  ];
  const leaveWhenEmpty = [
    { value: "no", label: "no" },
    { value: "yes", label: "yes" },
    { value: "strict", label: "strict" },
    { value: "loose", label: "loose" },
    { value: "paused", label: "paused" },
    { value: "penalty", label: "penalty" },
    { value: "inuse", label: "inuse" },
    { value: "ringing", label: "ringing" },
    { value: "unavailable", label: "unavailable" },
    { value: "invalid", label: "invalid" },
    { value: "unknown", label: "unknown" },
    { value: "wrapup", label: "wrapup" },
  ];

  return (
    <Box p={3}>
      <Typography variant="h6">General</Typography>

      {/* Name */}
      <TextField
        label="Name"
        value={formData.name}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
        name="name"
        InputProps={{
          readOnly: true,
        }}
      />
      <FormHelperText>
        Only numbers, letters and specific characters (._) are supported
      </FormHelperText>

      {/* Strategy */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="type">Strategy</InputLabel>
        <Select
          labelId="strategy"
          id="strategy"
          name="strategy"
          label="strategy"
          value={formData.strategy || "ringall"}
          onChange={handleInputChange}
        >
          {strategyOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Timeout */}
      <TextField
        margin="dense"
        label="Timeout"
        type="number"
        fullWidth
        name="timeout"
        variant="standard"
        value={formData.timeout}
        onChange={handleInputChange}
      />
      <FormHelperText>How many seconds to ring a device.</FormHelperText>

      {/* Maximum Length */}
      <TextField
        margin="dense"
        label="Maximum Length"
        type="number"
        fullWidth
        name="queue_seconds"
        variant="standard"
        value={formData.queue_seconds}
        onChange={handleInputChange}
      />
      <FormHelperText>
        Maximum number of callers allowed to wait in a queue: zero means
        unlimited.
      </FormHelperText>

      {/* Retry */}
      <TextField
        margin="dense"
        label="Retry"
        type="number"
        fullWidth
        name="retry"
        variant="standard"
        value={formData.retry}
        onChange={handleInputChange}
      />
      <FormHelperText>
        Time in seconds to wait before calling the next agent in queue when the
        timeout is expired.
      </FormHelperText>

      {/* Wrap */}
      <TextField
        margin="dense"
        label="Wrapup Time"
        type="number"
        fullWidth
        name="wrapuptime"
        variant="standard"
        value={formData.wrapuptime}
        onChange={handleInputChange}
      />
      <FormHelperText>
        Time in seconds to keep a queue member unavailable after completing a
        call.
      </FormHelperText>
      {/* Weight */}
      <TextField
        margin="dense"
        label="Weight"
        type="number"
        fullWidth
        name="weight"
        variant="standard"
        value={formData.weight}
        onChange={handleInputChange}
      />
      <FormHelperText>
        Weight of a queue in order to define priority if members are associated
        with multiple queues.
      </FormHelperText>
      {/* Join when Empty */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Join When Empty</InputLabel>
        <Select
          required
          labelId="joinempty"
          id="joinempty"
          name="joinempty"
          multiple
          label="Join When Empty"
          value={formData.joinempty}
          onChange={handleInputChange}
          renderValue={(selected) => selected.join(", ")}
        >
          {joinempty.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={formData.joinempty.indexOf(option.value) > -1}
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Used to control whether a caller is passed to a queue when no members
        are available.
      </FormHelperText>

      {/* leave when Empty */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Leave When Empty</InputLabel>
        <Select
          required
          labelId="leavewhenempty"
          id="leavewhenempty"
          name="leavewhenempty"
          multiple
          label="Leave When Empty"
          value={formData.leavewhenempty}
          onChange={handleInputChange}
          renderValue={(selected) => selected.join(", ")}
        >
          {leaveWhenEmpty.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={formData.leavewhenempty.indexOf(option.value) > -1}
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Used to control whether callers are made leave the queue when no members
        are available to take calls.
      </FormHelperText>

      {/* Music On Hold */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="type">Music On Hold</InputLabel>
        <Select
          labelId="musicOnHold"
          id="musicOnHold"
          name="musiconhold"
          label="Music On Hold"
          value={formData.musiconhold || "default"}
          onChange={handleInputChange}
        >
          {musicOnHold.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Sets the music class to use for a particular queue
      </FormHelperText>

      {/* Announce to Agent */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="type">Announce to Agent</InputLabel>
        <Select
          labelId="announce_to_first_user"
          id="musicOnHold"
          name="announce_to_first_user"
          label="Announce To First User"
          value={formData.announce_to_first_user || ""}
          onChange={handleInputChange}
        >
          {announceToAgent.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>Announce To Agent</FormHelperText>

      {/* Description */}
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
    </Box>
  );
};

const AnnouncementsTabContent = ({ formData, handleInputChange }) => {
  const randomPeriodicAnnounce = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
  ];
  const announceHoldTime = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
    { value: "once", label: "Once" },
  ];
  const announceCallerPosition = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "limit", label: "Limit" },
    { value: "more", label: "More" },
  ];
  const announceAgentHoldTime = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
  ];

  const periodicAnnounce = [
    { value: "defaultAnnounce", label: "Default Announce" },
    { value: "noAnnounce", label: "No Announce" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const holdTimeAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
  ];
  const yourNextAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const thereAreAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const waitingCallsAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const estimatedHoldTimeAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const minutesAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const minuteAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const secondsAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];
  const thankYouAnnounce = [
    { value: "default", label: "Default" },
    { value: "disabled", label: "Disabled" },
    { value: "agentActionFailure", label: "Agent Action Failure" },
    { value: "agentEndPause", label: "Agent End Pause" },
    { value: "agentLogin", label: "Agent Login" },
    { value: "agentLogout", label: "Agent Logout" },
    { value: "agentMenu", label: "Agent Menu" },
    { value: "agentPause", label: "Agent Pause" },
    { value: "callRatingMessage", label: "Call Rating Message" },
    { value: "orderElaborated", label: "Order Elaborated" },
    { value: "orderMessage", label: "Order Message" },
    { value: "orderShipped", label: "Order Shipped" },
    { value: "thankYou", label: "Thank You" },
    { value: "welcomeMessage", label: "Welcome Message" },
  ];

  return (
    <>
      <Box p={3}>
        <Typography variant="h6">Settings</Typography>
        <Stack spacing={2} p={3}>
          {/* Announce Frequency */}
          <TextField
            margin="dense"
            label="Announce Frequency"
            type="number"
            fullWidth
            name="announce_frequency"
            variant="standard"
            value={formData.announce_frequency || 0}
            onChange={handleInputChange}
          />
          <FormHelperText>
            How often to announce the caller&apos;s position and/or estimated
            hold time in the queue (zero to disable).
          </FormHelperText>

          {/* Minimum Announce Frequency */}
          <TextField
            margin="dense"
            label="Minimum Announce Frequency"
            type="number"
            fullWidth
            name="min_announce_frequency"
            variant="standard"
            value={formData.min_announce_frequency || 0}
            onChange={handleInputChange}
          />
          <FormHelperText>
            Minimum announcement frequency (useful when the caller&apos;s
            position changes frequently).
          </FormHelperText>

          {/* Periodic Announce Frequency */}
          <TextField
            margin="dense"
            label="Periodic Announce Frequency"
            type="number"
            fullWidth
            name="periodic_announce_frequency"
            variant="standard"
            value={formData.periodic_announce_frequency || 0}
            onChange={handleInputChange}
          />
          <FormHelperText>
            Frequency of periodic announcements to the caller.
          </FormHelperText>

          {/* Random Periodic Announce */}
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel htmlFor="type">Random Periodic Announce</InputLabel>
            <Select
              labelId="random_periodic_announce"
              id="random_periodic_announce"
              name="random_periodic_announce"
              label="Random Periodic Announce"
              value={formData.random_periodic_announce || "no"}
              onChange={handleInputChange}
            >
              {randomPeriodicAnnounce.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormHelperText>
            If yes, the defined periodic announcements will be played random
          </FormHelperText>

          {/* Announce Hold Time */}
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel htmlFor="type">Announce Hold Time</InputLabel>
            <Select
              labelId="announce_holdtime"
              id="announce_holdtime"
              name="announce_holdtime"
              label="Announce Hold Time"
              value={formData.announce_holdtime || "no"}
              onChange={handleInputChange}
            >
              {announceHoldTime.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormHelperText>
            Plays the estimated hold time along with the periodic announcements
            (Yes/No/Once)
          </FormHelperText>

          {/* Announce Caller Position */}
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel htmlFor="type">Announce Caller Position</InputLabel>
            <Select
              labelId="announceCallerPosition"
              id="announceCallerPosition"
              name="announceCallerPosition"
              label="Announce Caller Position"
              value={formData.announceCallerPosition || "no"}
              onChange={handleInputChange}
            >
              {announceCallerPosition.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormHelperText>
            Used to define if the caller&apos;s position in the queue should be
            announced: No=never; Yes=always; Limit=only if it is within the
            limit defined by announce-position-limit; More= only if it is beyond
            the value defined by announce-position-limit
          </FormHelperText>

          {/* Announce Position Limit*/}
          <TextField
            margin="dense"
            label="Announce Position Limit"
            type="number"
            fullWidth
            name="announce_position_limit"
            variant="standard"
            value={formData.announce_position_limit}
            onChange={handleInputChange}
          />
          <FormHelperText>
            Used if announce-position is defined as either &apos;limit&apos; or
            &apos;more&apos;.
          </FormHelperText>

          {/* Announce Agent Hold Time */}
          <FormControl fullWidth margin="dense" variant="standard">
            <InputLabel htmlFor="type">Announce Agent Hold Time</InputLabel>
            <Select
              labelId="announceAgentHoldTime"
              id="announceAgentHoldTime"
              name="announceAgentHoldTime"
              label="Announce Agent Hold Time"
              value={formData.announceAgentHoldTime || "no"}
              onChange={handleInputChange}
            >
              {announceAgentHoldTime.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormHelperText>
            Enables reporting caller&apos;s hold time to the agent in queue
            prior to connection
          </FormHelperText>
        </Stack>
      </Box>
      <Card variant="outlined" sx={{ boxShadow: 3 }}>
        <CardContent>
          <Stack spacing={2} p={3}>
            <Typography variant="h6">Announcements</Typography>

            {/* Periodic Announce */}
            <FormControl fullWidth margin="dense" variant="standard" required>
              <InputLabel htmlFor="type">Periodic Announce</InputLabel>
              <Select
                required
                labelId="periodicAnnounce"
                id="periodicAnnounce"
                name="periodicAnnounce"
                // multiple
                label="Periodic Announce"
                value={formData.periodicAnnounce}
                onChange={handleInputChange}
                // renderValue={(selected) => selected.join(', ')}
              >
                {periodicAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox
                      checked={
                        Array.isArray(formData.periodicAnnounce) &&
                        formData.periodicAnnounce.indexOf(option.value) > -1
                      }
                    />
                    {/* <ListItemText primary={option.label} /> */}
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormHelperText>
              Set of periodic announcements to be played (in the order).
            </FormHelperText>

            {/* Hold Time Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">Hold Time Announce</InputLabel>
              <Select
                labelId="queue_holdtime"
                id="queue_holdtime"
                name="queue_holdtime"
                label="queue_holdtime"
                value={formData.queue_holdtime || "default"}
                onChange={handleInputChange}
              >
                {holdTimeAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;Hold time&quot;.
                Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* You're next Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">You&apos;re Next Announce</InputLabel>
              <Select
                labelId="queue_youarenext"
                id="queue_youarenext"
                name="queue_youarenext"
                label="queue_youarenext"
                value={formData.queue_youarenext || "default"}
                onChange={handleInputChange}
              >
                {yourNextAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;You are now first
                in line&quot;. Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* There're Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">There&apos;re Announce</InputLabel>
              <Select
                labelId="queue_thereare"
                id="queue_thereare"
                name="queue_thereare"
                label="queue_thereare"
                value={formData.queue_thereare || "default"}
                onChange={handleInputChange}
              >
                {thereAreAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;There are&quot;.
                Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* Waiting Calls Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">Waiting Calls Announce</InputLabel>
              <Select
                labelId="queue_callswaiting"
                id="queue_callswaiting"
                name="queue_callswaiting"
                label="queue_callswaiting"
                value={formData.queue_callswaiting || "default"}
                onChange={handleInputChange}
              >
                {waitingCallsAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;calls
                waiting&quot;. Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* Estimated Calls Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">
                Estimated HoldTime Announce
              </InputLabel>
              <Select
                labelId="estimatedHoldTimeAnnounce"
                id="estimatedHoldTimeAnnounce"
                name="estimatedHoldTimeAnnounce"
                label="estimatedHoldTimeAnnounce"
                value={formData.estimatedHoldTimeAnnounce || "default"}
                onChange={handleInputChange}
              >
                {estimatedHoldTimeAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;The current
                estimated hold time is&quot;. Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* Minutes Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">Minutes Announce</InputLabel>
              <Select
                labelId="queue_minutes"
                id="queue_minutes"
                name="queue_minutes"
                label="queue_minutes"
                value={formData.queue_minutes || "default"}
                onChange={handleInputChange}
              >
                {minutesAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;minutes&quot;.
                Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* Minute Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">Minute Announce</InputLabel>
              <Select
                labelId="queue_minute"
                id="queue_minute"
                name="queue_minute"
                label="queue_minute"
                value={formData.queue_minute || "default"}
                onChange={handleInputChange}
              >
                {minuteAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;minute&quot;.
                Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* Seconds Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">Seconds Announce</InputLabel>
              <Select
                labelId="announce_round_seconds"
                id="announce_round_seconds"
                name="announce_round_seconds"
                label="announce_round_seconds"
                value={formData.announce_round_seconds || "default"}
                onChange={handleInputChange}
              >
                {secondsAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;seconds&quot;.
                Undefined=no announcement.
              </FormHelperText>
            </FormControl>

            {/* Thank You Announce */}
            <FormControl fullWidth margin="dense" variant="standard">
              <InputLabel htmlFor="type">Thank you&apos; Announce</InputLabel>
              <Select
                labelId="queue_thankyou"
                id="queue_thankyou"
                name="queue_thankyou"
                label="queue_thankyou"
                value={formData.queue_thankyou || "default"}
                onChange={handleInputChange}
              >
                {thankYouAnnounce.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a Sound defined in Tools. Default=&quot;Thank you for
                your patience&quot;. Undefined=no announcement.
              </FormHelperText>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
};

const AdvancedTabContent = ({ formData, handleInputChange, setFormData }) => {
  const handleSwitchChange = (event) => {
    const { name, checked } = event.target;

    // If the switch is toggled off, reset the Mandatory disposition field
    const newFormData = checked
      ? { ...formData, [name]: "yes" }
      : { ...formData, [name]: "no", disposition: "" };

    setFormData(newFormData);
  };

  // Handler for After Call Work toggle
  const handleAfterCallWorkToggle = (event) => {
    const checked = event.target.checked;
    setFormData({
      ...formData,
      afterCallWork: checked ? "yes" : "no",
      // When After Call Work is enabled, autoPause is set to 'no' and afterCallWorkDuration to '10' by default
      autoPause: checked ? ["no"] : formData.autoPause,
      afterCallWorkDuration: checked
        ? formData.afterCallWorkDuration || 10
        : formData.afterCallWorkDuration,
    });
  };

  const autoPause = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
  ];

  const timeOutRestart = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const recordingFormatOptions = [
    { value: "wav", label: "wav" },
    { value: "mp3", label: "mp3" },
    { value: "gsm", label: "gsm" },
    { value: "inactive", label: "inactive" },
  ];
  const setInterfaceVariablesOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const setQueueVariablesOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const setQueueEntryVariablesOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const dispositionOptions = [
    { value: "afterCall", label: "After Call" },
    { value: "backOffice", label: "Back office" },
  ];
  const ringInUse = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  // Content for the Advanced tab
  return (
    <Box p={3}>
      <Typography variant="h6">Advanced</Typography>
      <Stack spacing={2} p={3}>
        {/* AfterCall Work */}
        <FormControlLabel
          control={
            <Switch
              checked={formData.afterCallWork === "yes"}
              onChange={handleAfterCallWorkToggle}
              name="afterCallWork"
              color="primary"
            />
          }
          label="After Call Work"
        />
        <FormHelperText>
          If enabled, the agent will be set on Pause after completing a call
        </FormHelperText>

        {/* If Switch is Active */}
        {/* Conditional Rendering for Auto Pause or After Call Work Duration */}
        {formData.afterCallWork === "yes" && (
          // After Call Work Duration Input
          <TextField
            margin="dense"
            label="After Call Work Duration"
            type="number"
            fullWidth
            name="afterCallWorkDuration"
            variant="standard"
            value={formData.afterCallWorkDuration || 10}
            onChange={handleInputChange}
          />
        )}

        {/* Auto Pause  */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Auto Pause</InputLabel>
          <Select
            labelId="autoPause"
            id="autoPause"
            name="autoPause"
            label="Auto Pause"
            value={formData.autoPause || "no"}
            onChange={handleInputChange}
          >
            {autoPause.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          Enables/disables the automatic pause of agents who fail to answer a
          call. If enabled it causes the agent to be paused in all queues he
          belongs to
        </FormHelperText>

        {/* Ring In Use */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Ring In Use</InputLabel>
          <Select
            labelId="ringinuse"
            id="ringinuse"
            name="ringinuse"
            label="Auto Pause"
            value={formData.ringinuse || "no"}
            onChange={handleInputChange}
          >
            {ringInUse.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          To avoid/allow sending calls to members whose status is In Use
        </FormHelperText>

        {/* Member Delay */}
        <TextField
          margin="dense"
          label="Member Delay"
          type="number"
          fullWidth
          name="memberdelay"
          variant="standard"
          value={formData.memberdelay}
          onChange={handleInputChange}
        />
        <FormHelperText>
          Inserts a delay prior to the caller and agent in queue get connected.
        </FormHelperText>

        {/* TimeOut Restart */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Timeout Restart</InputLabel>
          <Select
            labelId="timeoutrestart"
            id="timeoutrestart"
            name="timeoutrestart"
            label="Auto Pause"
            value={formData.timeoutrestart || "yes"}
            onChange={handleInputChange}
          >
            {timeOutRestart.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          If yes, this resets the timeout for an agent to answer when either a
          BUSY or CONGESTION status is received from the channel.
        </FormHelperText>

        {/* Recording Format */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Recording Format</InputLabel>
          <Select
            labelId="monitor_format"
            id="monitor_format"
            name="monitor_format"
            label="Recording Format"
            value={formData.monitor_format || "gsm"}
            onChange={handleInputChange}
          >
            {recordingFormatOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          Specifies the file format to use when recording. If monitor-format is
          inactive, calls will not be recorded.
        </FormHelperText>

        {/* Context */}
        <TextField
          margin="dense"
          label="Context"
          type="text"
          fullWidth
          name="context"
          variant="standard"
          value={formData.context}
          onChange={handleInputChange}
        />
        <FormHelperText>
          Allows a caller to exit the queue by pressing a single DTMF digit. If
          a context is specified and the caller enters a number, that digit will
          attempt to be matched in the context specified, and dialplan execution
          will continue there.
        </FormHelperText>

        {/* Set Interface Variables */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Set Interface Variables</InputLabel>
          <Select
            labelId="setInterfaceVar"
            id="setInterfaceVar"
            name="setInterfaceVar"
            label="Set Interface Variables"
            value={formData.setinterfacevar || "no"}
            onChange={handleInputChange}
          >
            {setInterfaceVariablesOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          If set to yes, just prior to the caller being connected with a queue
          agent some variables will be set (for more information see wiki docs).
        </FormHelperText>

        {/* Set Queue Variables */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Set Queue Variables</InputLabel>
          <Select
            labelId="setqueuevar"
            id="setqueuevar"
            name="setqueuevar"
            label="Set Queue Variables"
            value={formData.setqueuevar || "no"}
            onChange={handleInputChange}
          >
            {setQueueVariablesOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          If set to yes, just prior to the caller being connected with a queue
          agent and leaving the queue, some variables will be set (for more
          information, see wiki docs).
        </FormHelperText>

        {/* Set Queue Entry Variables */}
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel htmlFor="type">Set Queue Entry Variables</InputLabel>
          <Select
            labelId="setqueueentryvar"
            id="setqueueentryvar"
            name="setqueueentryvar"
            label="Set Queue Variables"
            value={formData.setqueueentryvar || "no"}
            onChange={handleInputChange}
          >
            {setQueueEntryVariablesOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormHelperText>
          If set to yes, just prior to the caller being connected with a queue
          agent some variables will be set (for more information, see wiki
          docs).
        </FormHelperText>

        {/* Service Level */}
        <TextField
          margin="dense"
          label="Service Level"
          type="number"
          fullWidth
          name="servicelevel"
          variant="standard"
          value={formData.servicelevel}
          onChange={handleInputChange}
        />
        <FormHelperText>
          Second settings for service level (default=0, no SL). Used for service
          level statistics (calls answered within service level time frame).
        </FormHelperText>

        {/* Mandatory Disposition */}
        <FormControlLabel
          sx={{ marginTop: 3 }}
          control={
            <Switch
              checked={formData.mandatoryDisposition === "yes"}
              onChange={handleSwitchChange}
              name="mandatoryDisposition"
              color="primary"
            />
          }
          label="Mandatory Disposition"
        />
        {/* Conditional rendering for disposition dropdown */}
        {formData.mandatoryDisposition === "yes" && (
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="disposition-label">Disposition</InputLabel>
            <Select
              labelId="disposition-label"
              id="disposition"
              name="disposition"
              value={formData.disposition}
              label="Disposition"
              onChange={handleInputChange}
            >
              {dispositionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
};

export default QueueEdit;
