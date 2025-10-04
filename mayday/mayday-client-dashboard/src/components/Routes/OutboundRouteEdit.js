import { useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SaveIcon from "@mui/icons-material/Save";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import { fetchTrunks } from "../../features/trunks/trunkSlice";
import {
  updateOutboundRoute,
  createOutboundRoute,
  fetchOutboundRouteById,
} from "../../features/outboundRoutes/outboundRouteSlice";
import AppsIcon from "@mui/icons-material/Apps";
import { contextsAPI, didsAPI } from "../../services/api";

const initialApps = [
  { id: 1, app: "outboundDial", name: "Outbound Dial", type: "OutboundDial" },
  { id: 2, app: "custom", name: "Custom", type: "Custom" },
];

// Application Edit Dialog Component
const AppEditDialog = ({ open, onClose, app, onSave, trunks, dids }) => {
  const [formData, setFormData] = useState({
    applicationName: "",
    arguments: "",
    trunkId: "",
    prefix: "",
    tag: "",
    timeout: "30",
    options: "",
    url: "",
    callerId: "",
  });

  useEffect(() => {
    if (app) {
      setFormData(app.settings || {});
    }
  }, [app]);

  const handleSave = () => {
    onSave({ ...app, settings: formData });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {app?.type === "Custom"
          ? "Edit Custom Application"
          : "Edit Outbound Dial"}
      </DialogTitle>
      <DialogContent>
        {app?.type === "Custom" ? (
          <>
            <TextField
              fullWidth
              label="Application Name"
              value={formData.applicationName}
              onChange={(e) =>
                setFormData({ ...formData, applicationName: e.target.value })
              }
              margin="normal"
              helperText="Use 'Set' for setting variables or 'CALLERID' for caller ID"
            />
            <TextField
              fullWidth
              label="Arguments"
              value={formData.arguments}
              onChange={(e) =>
                setFormData({ ...formData, arguments: e.target.value })
              }
              margin="normal"
              helperText="Format: CALLERID(all)=<number as string> <number>"
            />
          </>
        ) : (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel>Trunk</InputLabel>
              <Select
                value={formData.trunkId}
                onChange={(e) =>
                  setFormData({ ...formData, trunkId: e.target.value })
                }
              >
                {trunks.map((trunk) => (
                  <MenuItem key={trunk.id} value={trunk.id}>
                    {trunk.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Caller ID (DID)</InputLabel>
              <Select
                value={formData.callerId}
                onChange={(e) =>
                  setFormData({ ...formData, callerId: e.target.value })
                }
              >
                {(dids || []).map((d) => (
                  <MenuItem key={d.did} value={d.did}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Prefix"
              value={formData.prefix}
              onChange={(e) =>
                setFormData({ ...formData, prefix: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Tag"
              value={formData.tag}
              onChange={(e) =>
                setFormData({ ...formData, tag: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Timeout"
              type="number"
              value={formData.timeout}
              onChange={(e) =>
                setFormData({ ...formData, timeout: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Options"
              value={formData.options}
              onChange={(e) =>
                setFormData({ ...formData, options: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="URL"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              margin="normal"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const OutboundRouteEdit = () => {
  const { outboundRouteId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [currentTab, setCurrentTab] = useState("settings");
  const [configuredApps, setConfiguredApps] = useState([]);
  // console.log(configuredApps, "configuredApps>>>>>");
  const [formData, setFormData] = useState({
    context: "from-internal",
    phoneNumber: "",
    recording: "none",
    // cutDigits: "0",
    alias: "",
    description: "",
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [editableApp, setEditableApp] = useState(null);
  const [voiceExtensions, setVoiceExtensions] = useState([]);
  const [availableContexts, setAvailableContexts] = useState([
    { value: "outbound-trunk", label: "Outbound Trunk" },
    { value: "from-sip", label: "From SIP" },
    { value: "from-internal", label: "From Internal" },
    { value: "from-voip-provider", label: "From VoIP Provider" },
    { value: "from-voicemail", label: "From Voicemail" },
  ]);
  const [availableDids, setAvailableDids] = useState([]);

  const currentRoute = useSelector((state) => state.outboundRoute.currentRoute);
  // const loading = useSelector((state) => state.outboundRoute.loading);

  useEffect(() => {
    if (outboundRouteId) {
      dispatch(fetchOutboundRouteById(outboundRouteId));
    }
  }, [outboundRouteId, dispatch]);

  // Load contexts from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await contextsAPI.list();
        if (mounted && data?.success && Array.isArray(data.data)) {
          const items = data.data
            .filter((c) => c?.name)
            .map((c) => ({ value: c.name, label: c.name }));
          if (items.length > 0) setAvailableContexts(items);
        }
        const didsResp = await didsAPI.list();
        if (mounted && didsResp?.data?.success) {
          setAvailableDids(didsResp.data.data || []);
        }
      } catch (e) {
        // silent fallback to defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentRoute) {
      setFormData({
        context: currentRoute.context || "outbound-trunk",
        phoneNumber: currentRoute.phoneNumber || "",
        recording: currentRoute.recording || "none",
        alias: currentRoute.alias || "",
        description: currentRoute.description || "",
      });

      // Set manual voice extensions
      setVoiceExtensions(currentRoute.voiceExtensions || []);

      // Handle generated extensions if needed
      const generatedExts = currentRoute.generatedExtensions || [];
      console.log("Generated Extensions:", generatedExts);

      // Transform database apps to match UI expected format
      if (currentRoute.applications && currentRoute.applications.length > 0) {
        const transformedApps = currentRoute.applications.map((app) => {
          // Parse settings if it's a string
          const settings =
            typeof app.settings === "string"
              ? JSON.parse(app.settings)
              : app.settings;

          // Find the matching app template
          const appTemplate = initialApps.find(
            (template) => template.type === app.type
          );

          return {
            ...appTemplate,
            uniqueId: `${app.id}-db`,
            id: app.id,
            dbRecord: true,
            priority: app.priority,
            settings: settings,
            type: app.type,
            generatedExtensions: generatedExts.filter(
              (ext) => ext.generatedByAppId === app.id
            ),
          };
        });

        setConfiguredApps(transformedApps);
      } else {
        setConfiguredApps([]);
      }
    }
  }, [currentRoute]);

  const contexts = availableContexts;

  // Settings Tab Content
  const SettingsTabContent = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/voice/outboundRoutes")}
            >
              Back to Outbound Routes
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel id="context-label">Context</InputLabel>
              <Select
                labelId="context-label"
                id="context"
                value={formData.context}
                onChange={(e) =>
                  setFormData({ ...formData, context: e.target.value })
                }
                label="Context"
                required
              >
                {contexts.map((context) => (
                  <MenuItem key={context.value} value={context.value}>
                    {context.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Phone Number"
              defaultValue={formData.phoneNumber}
              onBlur={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Alias"
              defaultValue={formData.alias}
              onBlur={(e) =>
                setFormData({ ...formData, alias: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              defaultValue={formData.description}
              onBlur={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="recording-format-label" shrink>
                Recording Format
              </InputLabel>
              <Select
                value={formData.recording}
                onChange={(e) =>
                  setFormData({ ...formData, recording: e.target.value })
                }
                label="Recording Format"
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="wav">Wav</MenuItem>
                <MenuItem value="gsm">Gsm</MenuItem>
              </Select>
            </FormControl>
            {/* <TextField
              fullWidth
              label="Cut Digits"
              type="number"
              defaultValue={formData.cutDigits}
              onBlur={(e) =>
                setFormData({ ...formData, cutDigits: e.target.value })
              }
              margin="normal"
              inputProps={{ min: 0 }}
            /> */}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Actions Tab Content
  const ActionsTabContent = () => {
    const dispatch = useDispatch();
    const trunks = useSelector((state) => state.trunk.trunks);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [currentEditingAppId, setCurrentEditingAppId] = useState(null);

    useEffect(() => {
      dispatch(fetchTrunks());
    }, [dispatch]);

    const handleDragEnd = (result) => {
      if (!result.destination) return;

      const src = result.source.droppableId;
      const dst = result.destination.droppableId;

      // Add from palette → configured list
      if (src === "available-apps" && dst === "configured-apps") {
        const app = initialApps[result.source.index];
        const newApp = {
          ...app,
          uniqueId: `${app.id}-${Date.now()}`,
          priority: configuredApps.length + 1,
          settings: {
            trunkId: "",
            prefix: "",
            tag: "",
            timeout: "30",
            options: "",
            url: "",
            applicationName: "",
            arguments: "",
            callerId: "",
          },
        };
        const next = [...configuredApps, newApp];
        // Reindex priorities to be explicit
        const reindexed = next.map((a, i) => ({ ...a, priority: i + 1 }));
        setConfiguredApps(reindexed);

        // Open dialog for configuration
        setEditableApp(newApp);
        setOpenDialog(true);
        return;
      }

      // Reorder within configured list
      if (src === "configured-apps" && dst === "configured-apps") {
        const items = Array.from(configuredApps);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        // Normalize priorities so top row is highest priority (1)
        const reindexed = items.map((a, i) => ({ ...a, priority: i + 1 }));
        setConfiguredApps(reindexed);
      }
    };

    const handleApplicationMenuOpen = (event, appId) => {
      event.stopPropagation();
      setMenuAnchorEl(event.currentTarget);
      setCurrentEditingAppId(appId);
    };

    const handleApplicationMenuClose = () => {
      setMenuAnchorEl(null);
      setCurrentEditingAppId(null);
    };

    const handleRemoveApp = () => {
      const newConfiguredApps = configuredApps
        .filter((app) => app.uniqueId !== currentEditingAppId)
        .map((a, i) => ({ ...a, priority: i + 1 }));
      setConfiguredApps(newConfiguredApps);
      handleApplicationMenuClose();
    };

    const handleEditApplication = () => {
      const appToEdit = configuredApps.find(
        (app) => app.uniqueId === currentEditingAppId
      );
      if (appToEdit) {
        setEditableApp(appToEdit);
        setOpenDialog(true);
      }
      handleApplicationMenuClose();
    };

    return (
      <>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6">Applications List</Typography>
                <Droppable droppableId="available-apps">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {initialApps.map((app, index) => (
                        <Draggable
                          key={app.id}
                          draggableId={`${app.id}`}
                          index={index}
                        >
                          {(provided) => (
                            <Paper
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                p: 2,
                                m: 1,
                                display: "flex",
                                alignItems: "center",
                                cursor: "grab",
                                "&:hover": {
                                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                                },
                              }}
                            >
                              <AppsIcon
                                sx={{
                                  mr: 2,
                                  color: "action.active",
                                  fontSize: 20,
                                }}
                              />
                              <Typography>{app.name}</Typography>
                            </Paper>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Paper>
            </Grid>

            <Grid item xs={8}>
              <Paper sx={{ p: 2, minHeight: "500px" }}>
                <Typography variant="h6" style={{ fontSize: "16px" }}>
                  Drag & Drop Routing
                </Typography>
                <Droppable droppableId="configured-apps">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      style={{
                        minHeight: "450px", // Leave space for the header
                        padding: "8px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "4px",
                        marginTop: "8px",
                      }}
                    >
                      <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell></TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Appdata</TableCell>
                              <TableCell>Interval</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {configuredApps.map((app, index) => {
                              // Determine what to display in the Appdata column based on app type
                              let appdata = "";
                              if (app.type === "OutboundDial") {
                                // Show standard Asterisk pattern: PJSIP/<prefix>${EXTEN}@<trunk>
                                // Fall back to the standard Asterisk variable when not provided
                                const extenPart =
                                  app.settings?.exten &&
                                  String(app.settings.exten).trim() !== ""
                                    ? app.settings.exten
                                    : "${EXTEN}"; // eslint-disable-line no-template-curly-in-string
                                const prefixPart = app.settings?.prefix || "";
                                appdata = `PJSIP/${prefixPart}${extenPart}@${
                                  app.settings?.trunkId || ""
                                }`;
                              } else if (app.type === "Custom") {
                                appdata = `${
                                  app.settings?.applicationName || ""
                                } ${app.settings?.arguments || ""}`;
                              }

                              return (
                                <Draggable
                                  key={app.uniqueId}
                                  draggableId={app.uniqueId}
                                  index={index}
                                >
                                  {(provided) => (
                                    <TableRow
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      sx={{
                                        "&:hover": {
                                          backgroundColor:
                                            "rgba(0, 0, 0, 0.04)",
                                        },
                                      }}
                                    >
                                      <TableCell>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <AppsIcon
                                            sx={{
                                              mr: 1,
                                              color: "action.active",
                                              fontSize: 16,
                                            }}
                                          />
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        {app.type === "OutboundDial"
                                          ? "Dial"
                                          : app.settings?.applicationName ||
                                            "Set*"}
                                      </TableCell>
                                      <TableCell>{appdata}</TableCell>
                                      <TableCell>****</TableCell>
                                      <TableCell>
                                        <IconButton
                                          size="small"
                                          onClick={(event) =>
                                            handleApplicationMenuOpen(
                                              event,
                                              app.uniqueId
                                            )
                                          }
                                        >
                                          <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </div>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          </Grid>
        </DragDropContext>

        <Menu
          id="long-menu"
          anchorEl={menuAnchorEl}
          keepMounted
          open={Boolean(menuAnchorEl)}
          onClose={handleApplicationMenuClose}
        >
          <MenuItem onClick={handleEditApplication}>Edit Application</MenuItem>
          {/* <MenuItem
            onClick={() => {
              // TODO: Implement interval editing
              handleApplicationMenuClose();
            }}
          >
            Edit Interval
          </MenuItem> */}
          <MenuItem onClick={handleRemoveApp}>Delete Application</MenuItem>
        </Menu>

        {editableApp && (
          <AppEditDialog
            open={openDialog}
            onClose={() => {
              setEditableApp(null);
              setOpenDialog(false);
            }}
            app={editableApp}
            onSave={(updatedApp) => {
              let next = configuredApps.map((app) =>
                app.uniqueId === updatedApp.uniqueId ? updatedApp : app
              );

              // Auto-insert Custom Set CALLERID(all) when OutboundDial has a callerId
              if (
                updatedApp?.type === "OutboundDial" &&
                updatedApp?.settings?.callerId &&
                String(updatedApp.settings.callerId).trim() !== ""
              ) {
                const idx = next.findIndex(
                  (a) => a.uniqueId === updatedApp.uniqueId
                );
                const setId = `${updatedApp.uniqueId}-set`;
                const alreadyHasSet = next.some((a) => a.uniqueId === setId);
                const cid = updatedApp.settings.callerId;
                const setApp = {
                  id: undefined,
                  dbRecord: false,
                  uniqueId: setId,
                  type: "Custom",
                  app: "custom",
                  name: "Custom",
                  settings: {
                    applicationName: "Set",
                    arguments: `CALLERID(all)="${cid} <${cid}>"`,
                  },
                };
                if (!alreadyHasSet && idx >= 0) {
                  next = [...next.slice(0, idx), setApp, ...next.slice(idx)];
                } else if (alreadyHasSet) {
                  next = next.map((a) =>
                    a.uniqueId === setId
                      ? { ...a, settings: setApp.settings }
                      : a
                  );
                }
                // Reindex priorities after possible insert
                next = next.map((a, i) => ({ ...a, priority: i + 1 }));
              }

              setConfiguredApps(next);
              setOpenDialog(false);
              setEditableApp(null);
            }}
            trunks={trunks}
            dids={availableDids}
          />
        )}
      </>
    );
  };

  const handleSave = async () => {
    try {
      // Prepare the payload for the outbound route
      const applicationsPayload = configuredApps.map((app) => {
        return {
          id: app.dbRecord ? app.id : undefined,
          type: app.type,
          priority: app.priority,
          settings: app.settings,
        };
      });
      const payload = {
        phoneNumber: formData.phoneNumber,
        context: formData.context,
        recording: formData.recording,
        // cutDigits: formData.cutDigits,
        alias: formData.alias,
        description: formData.description,
        applications: applicationsPayload,
        voiceExtensions,
      };

      if (outboundRouteId) {
        await dispatch(
          updateOutboundRoute({ routeId: outboundRouteId, routeData: payload })
        ).unwrap();
        enqueueSnackbar("Outbound route updated successfully", {
          variant: "success",
        });
      } else {
        await dispatch(createOutboundRoute(payload)).unwrap();
        enqueueSnackbar("Outbound route created successfully", {
          variant: "success",
        });
      }

      navigate("/voice/outboundRoutes");
    } catch (error) {
      enqueueSnackbar(
        error || error.message || "Failed to save outbound route",
        {
          variant: "error",
        }
      );
    }
  };

  // Add this component after the SettingsTabContent component
  const VoiceExtensionsTabContent = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Generated Extensions
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Priority</TableCell>
                    <TableCell>Application</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentRoute?.generatedExtensions?.map((ext) => (
                    <TableRow key={ext.id}>
                      <TableCell>{ext.priority}</TableCell>
                      <TableCell>{ext.app}</TableCell>
                      <TableCell>{ext.appdata}</TableCell>
                      <TableCell>{ext.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={ext.isGenerated ? "Generated" : "Manual"}
                          color={ext.isGenerated ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Add this to the tabs array
  const tabs = [
    { value: "settings", label: "Settings" },
    { value: "actions", label: "Actions" },
    { value: "extensions", label: "Voice Extensions" },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/voice/outboundRoutes")}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={<SaveIcon />}
        >
          Save Changes
        </Button>
      </Box>

      <AppBar position="static" color="default">
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </AppBar>

      {currentTab === "settings" && (
        <>
          <SettingsTabContent />
        </>
      )}
      {currentTab === "actions" && <ActionsTabContent />}
      {currentTab === "extensions" && <VoiceExtensionsTabContent />}
    </Box>
  );
};

export default OutboundRouteEdit;
