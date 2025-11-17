// AgentEditComponent.jsx

import { useState } from "react";
import {
  Checkbox,
  Tabs,
  Tab,
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
  CircularProgress,
  Alert,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { TextField } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { pink } from "@mui/material/colors";
import { useSnackbar } from "notistack";

import {
  updateTrunkDetailsAsync,
  // getTrunkBalance,
  checkTrunkBalance,
  fetchTrunkById,
} from "../features/trunks/trunkSlice";
import LoadingIndicator from "./common/LoadingIndicator";
import { useEffect } from "react";

const TrunkEdit = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { trunkId } = useParams();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: "",
    active: 0,
    host: "",
    password: "",
    context: "from-voip-provider",
    defaultUser: "",
    type: "friend",
    dtmfMode: "rfc2833",
    // register_string: "",
    description: "",
    nat: [],
    transport: [],
    qualify: "yes",
    codecs: [],
    insecure: [],
    callLimit: 1000,
    directMedia: "no",
    callCounter: "yes",
    fromDomain: "",
    fromUser: "",
    outboundProxy: "",
    phoneUrl: "no",
    trustRemotePartyId: "no",
    sendRemotePartyIdHeader: "no",
    encryption: "no",
    port: "",
    t38ptUdptl: "no",
    videoSupport: "no",
    others: "",
    enabled: false,
    account_number: "",
    phone_number: "",
    providerIPs: "",
    ...(location.state && {
      ...location.state,
      enabled: Boolean(location.state.enabled || location.state.active === 1),
      active: location.state.enabled || location.state.active === 1 ? 1 : 0,
      defaultUser: location.state.defaultUser || "",
      transport: Array.isArray(location.state.transport)
        ? location.state.transport
        : location.state.transport?.split(",").filter(Boolean) || [],
      nat: Array.isArray(location.state.nat)
        ? location.state.nat
        : location.state.nat?.split(",").filter(Boolean) || [],
      codecs: Array.isArray(location.state.codecs)
        ? location.state.codecs
        : location.state.codecs?.split(",").filter(Boolean) || [],
      insecure: Array.isArray(location.state.insecure)
        ? location.state.insecure
        : location.state.insecure?.split(",").filter(Boolean) || [],
      account_number: location.state.account_number || "",
      phone_number: location.state.phone_number || "",
      providerIPs: location.state.providerIPs || "",
    }),
  });

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [currentTab, setCurrentTab] = useState("settings");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch trunk data when component mounts
  useEffect(() => {
    const fetchTrunkData = async () => {
      if (trunkId) {
        try {
          setLoading(true);
          const result = await dispatch(fetchTrunkById(trunkId)).unwrap();

          // Update formData with fetched trunk data
          const trunkData = result.trunk || result;
          const endpointData = trunkData.endpoint || {};

          // Debug: inspect provider IPs structure from backend
          console.log("[TrunkEdit] trunkData:", {
            name: trunkData?.name,
            identifyMatches: trunkData?.identifyMatches,
            identify: trunkData?.identify,
          });

          setFormData((prev) => ({
            ...prev,
            ...endpointData,
            enabled: Boolean(endpointData.enabled || endpointData.active === 1),
            active: endpointData.enabled || endpointData.active === 1 ? 1 : 0,
            defaultUser: endpointData.defaultUser || "",
            transport: Array.isArray(endpointData.transport)
              ? endpointData.transport
              : endpointData.transport?.split(",").filter(Boolean) || [],
            nat: Array.isArray(endpointData.nat)
              ? endpointData.nat
              : endpointData.nat?.split(",").filter(Boolean) || [],
            codecs: Array.isArray(endpointData.codecs)
              ? endpointData.codecs
              : endpointData.codecs?.split(",").filter(Boolean) || [],
            insecure: Array.isArray(endpointData.insecure)
              ? endpointData.insecure
              : endpointData.insecure?.split(",").filter(Boolean) || [],
            account_number: endpointData.account_number || "",
            phone_number: endpointData.phone_number || "",
            providerIPs:
              (Array.isArray(trunkData.identifyMatches)
                ? trunkData.identifyMatches.join(",")
                : trunkData.identify?.match) ||
              prev.providerIPs ||
              "",
          }));
        } catch (error) {
          console.error("Error fetching trunk data:", error);
          enqueueSnackbar("Failed to load trunk details", { variant: "error" });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTrunkData();
  }, [trunkId, dispatch, enqueueSnackbar]);

  // Balance polling functionality
  useEffect(() => {
    if (trunkId && formData.account_number && formData.phone_number) {
      // Initial balance check
      checkBalance();

      // Set up polling every 5 minutes
      const interval = setInterval(checkBalance, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [trunkId, formData.account_number, formData.phone_number]);

  const checkBalance = async () => {
    setBalanceLoading(true);
    try {
      const result = await dispatch(checkTrunkBalance(trunkId)).unwrap();
      if (result.balance) {
        setBalance(result.balance);
      }
    } catch (error) {
      console.error("Failed to check balance:", error);
      enqueueSnackbar("Failed to check balance", { variant: "error" });
    } finally {
      setBalanceLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isP2P, setIsP2P] = useState(true); // Default to P2P

  const handleInputChange = (event) => {
    const { name, value, checked } = event.target;

    if (name === "isP2P") {
      setIsP2P(checked);
    } else if (["nat", "transport", "codecs", "insecure"].includes(name)) {
      // If it's a multi-select, value will be an array
      setFormData((prev) => ({
        ...prev,
        [name]: Array.isArray(value) ? value : [value],
      }));
    } else {
      // For regular fields, handle normally
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // console.log(agentId, "ID parsed in the Agent Edit Form")
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Placeholder for save function
  const handleSave = async () => {
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    try {
      const dataToSend = {
        ...formData,
        isP2P,
        transport: Array.isArray(formData.transport)
          ? formData.transport.join(",")
          : formData.transport,
        nat: Array.isArray(formData.nat)
          ? formData.nat.join(",")
          : formData.nat,
        codecs: Array.isArray(formData.codecs)
          ? formData.codecs.join(",")
          : formData.codecs,
        insecure: Array.isArray(formData.insecure)
          ? formData.insecure.join(",")
          : formData.insecure,
        enabled: Boolean(formData.enabled),
        active: formData.enabled ? 1 : 0,
        account_number: formData.account_number,
        phone_number: formData.phone_number,
        providerIPs: formData.providerIPs,
      };

      await dispatch(updateTrunkDetailsAsync(dataToSend)).unwrap();
      enqueueSnackbar("Trunk updated successfully", { variant: "success" });
      navigate(-1);
    } catch (error) {
      console.error("Error updating trunk:", error);
      enqueueSnackbar(error.message || "Failed to update trunk", {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
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
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <LoadingIndicator />
        <Typography variant="h6">Loading Trunk Details...</Typography>
      </Box>
    );
  }

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
            disabled={isSubmitting}
          >
            {/* Icon button for back navigation */}
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem" }}>
            #{trunkId} {formData.name}
          </Typography>
          <Button
            color="primary"
            startIcon={
              isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />
            }
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "SAVING..." : "SAVE"}
          </Button>
          <IconButton color="inherit" disabled={isSubmitting}>
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="trunk details tabs"
      >
        <Tab label="Settings" value="settings" />
        <Tab label="Advanced" value="advanced" />
        <Tab label="Account Information" value="account" />
        <Tab label="Other Fields" value="others" />
        {/* ...other tabs */}
        {/* Tab Content */}
      </Tabs>
      {/* Content Card */}
      <Card variant="outlined" sx={{ boxShadow: 3 }}>
        <CardContent>
          {currentTab === "settings" && (
            <SettingsTabContent
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              disabled={isSubmitting}
              isP2P={isP2P}
              balance={balance}
              balanceLoading={balanceLoading}
            />
          )}
          {currentTab === "advanced" && (
            <AdvancedTabContent
              formData={formData}
              // formAgentDetails={formAgentDetails}
              handleInputChange={handleInputChange}
              disabled={isSubmitting}
            />
          )}
          {currentTab === "account" && (
            <AccountTabContent
              formData={formData}
              handleInputChange={handleInputChange}
              disabled={isSubmitting}
              balance={balance}
              balanceLoading={balanceLoading}
            />
          )}
          {currentTab === "others" && (
            <OthersTabContent
              formData={formData}
              handleInputChange={handleInputChange}
              disabled={isSubmitting}
            />
          )}
          {/* ...other tab contents */}
        </CardContent>
      </Card>
    </Box>
  );
};

const SettingsTabContent = ({
  formData,
  handleInputChange,
  setFormData,
  disabled,
  isP2P,
  balance,
  balanceLoading,
}) => {
  const handleSwitchChange = (event) => {
    const { checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      enabled: checked,
      active: checked ? 1 : 0,
    }));
  };

  const contextTypes = [
    { value: "from-sip", label: "from-sip" },
    { value: "from-voicemail", label: "from-voicemail" },
    { value: "from-voip-provider", label: "from-voip-provider" },
  ];
  const Type = [
    { value: "peer", label: "Peer" },
    { value: "friend", label: "Friend" },
    { value: "user", label: "User" },
  ];
  const dtmfMode = [
    { value: "rfc2833", label: "rfc2833" },
    { value: "info", label: "info" },
    { value: "shortinfo", label: "shortinfo" },
    { value: "inband", label: "inband" },
    { value: "auto", label: "auto" },
  ];
  const nat = [
    { value: "force_rport", label: "force_rport" },
    { value: "comedia", label: "comedia" },
    { value: "yes", label: "yes" },
    { value: "no", label: "no" },
    { value: "never", label: "never" },
    { value: "route", label: "route" },
  ];
  const transportOptions = [
    { value: "udp", label: "udp" },
    { value: "tcp", label: "tcp" },
    { value: "ws", label: "ws" },
    { value: "wss", label: "wss" },
    { value: "tls", label: "tls" },
  ];
  const qualify = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const codecs = [
    { value: "ulaw", label: "ulaw" },
    { value: "alaw", label: "alaw" },
    { value: "gsm", label: "gsm" },
    { value: "g723", label: "g723" },
    { value: "g726", label: "g726" },
    { value: "g722", label: "g722" },
    { value: "g729", label: "g729" },
    { value: "ilbc", label: "ilbc" },
    { value: "opus", label: "opus" },
    { value: "h264", label: "h264" },
  ];
  const insecure = [
    { value: "port", label: "port" },
    { value: "invite", label: "invite" },
    { value: "very", label: "very" },
  ];

  // const label = { inputProps: { "aria-label": "Color switch demo" } };

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
    paddingTop: "12px",
  });

  return (
    <Box p={3}>
      <Typography variant="h6">General</Typography>

      {/* Trunk Name */}
      <TextField
        label="Trunk Name"
        value={formData.name || "Demo"}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="outlined"
        name="name"
        InputProps={{
          readOnly: true,
        }}
        disabled={disabled}
      />
      <FormHelperText>
        Only numbers, letters and specific characters (._) are supported
      </FormHelperText>

      <FormControlLabel
        control={
          <Checkbox
            checked={isP2P}
            onChange={handleInputChange}
            name="isP2P"
            color="primary"
            disabled={disabled}
          />
        }
        label="P2P"
      />

      <PinkSwitchContainer>
        <FormControlLabel
          control={
            <PinkSwitch
              checked={Boolean(formData.enabled)}
              onChange={handleSwitchChange}
              name="enabled"
              color="primary"
              disabled={disabled}
            />
          }
          label="Enabled"
        />
      </PinkSwitchContainer>

      {/* Domain */}
      <TextField
        required
        margin="dense"
        label="Host"
        type="text"
        fullWidth
        name="host"
        variant="standard"
        value={formData.host}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>The domain or host name</FormHelperText>

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
            disabled={disabled}
          />
          <FormHelperText>Authentication password</FormHelperText>

          <TextField
            margin="dense"
            label="Default User"
            type="text"
            fullWidth
            name="defaultUser"
            variant="standard"
            value={formData.defaultUser}
            onChange={handleInputChange}
            disabled={disabled}
          />
          <FormHelperText>Authentication username</FormHelperText>
        </>
      )}

      {/* Context */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="type">Context</InputLabel>
        <Select
          labelId="context"
          id="context"
          name="context"
          label="Context"
          value={formData.context || "from-voip-provider"}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {contextTypes.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Allows a caller to exit the queue by pressing a single DTMF digit. If a
        context is specified and the caller enters a number, that digit will
        attempt to be matched in the context specified, and dialplan execution
        will continue there
      </FormHelperText>

      {/* Caller ID */}
      <TextField
        margin="dense"
        label="callerId"
        type="text"
        fullWidth
        name="callerId"
        variant="standard"
        value={formData.callerId || '"" <> '}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>
        The Caller ID, in the format &quot;name&quot;
      </FormHelperText>

      {/* Type */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Type</InputLabel>
        <Select
          required
          labelId="type"
          id="type"
          name="type"
          label="Type"
          value={formData.type || "friend"}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {Type.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>Type</FormHelperText>

      {/* DTMF Mode */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">DTMF Mode</InputLabel>
        <Select
          required
          labelId="dtmfMode"
          id="dtmfMode"
          name="dtmfMode"
          label="dtmfMode"
          value={formData.dtmfMode}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {dtmfMode.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        How DTMF (Dual-Tone Multi-Frequency) are sent. RFC2833: the default
        mode, the DTMF are sent with RTP but outside the audio stream. INBAND:
        The DTMF is sent in audio stream of the current conversation, becoming
        audible from the speakers. Requires a high CPU load. INFO: Although this
        method is very reliable, it is not supported by all PBX devices and many
        SIP Trunks.
      </FormHelperText>

      {/* NAT */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">NAT</InputLabel>
        <Select
          required
          labelId="nat"
          id="nat"
          name="nat"
          multiple
          label="NAT"
          value={Array.isArray(formData.nat) ? formData.nat : []}
          onChange={handleInputChange}
          renderValue={(selected) =>
            Array.isArray(selected) ? selected.join(", ") : ""
          }
          disabled={disabled}
        >
          {nat.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={
                  Array.isArray(formData.nat) &&
                  formData.nat.indexOf(option.value) > -1
                }
              />
              <ListItemText primary={option.label} />
              {/* {option.label} */}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Change the behavior of Asterisk for clients behind a firewall. If any of
        the comma-separated options is &quot;no&quot;, Asterisk will ignore any
        other settings and set nat=no.
      </FormHelperText>

      {/* Transport */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Transport</InputLabel>
        <Select
          required
          labelId="transport"
          id="transport"
          name="transport"
          multiple
          label="Transport"
          value={Array.isArray(formData.transport) ? formData.transport : []}
          onChange={handleInputChange}
          renderValue={(selected) =>
            Array.isArray(selected) ? selected.join(", ") : ""
          }
          disabled={disabled}
        >
          {transportOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={
                  Array.isArray(formData.transport) &&
                  formData.transport.indexOf(option.value) > -1
                }
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Set the default transports, in order of preference.
      </FormHelperText>

      {/* Qualify */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Qualify</InputLabel>
        <Select
          required
          labelId="qualify"
          id="qualify"
          name="qualify"
          label="qualify"
          value={formData.qualify}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {qualify.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>Determine when the SIP is achievable.</FormHelperText>

      {/* Allowed Codecs */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Allowed Codecs</InputLabel>
        <Select
          required
          labelId="codecs"
          id="codecs"
          name="codecs"
          multiple
          label="Allowed Codecs"
          value={Array.isArray(formData.codecs) ? formData.codecs : []}
          onChange={handleInputChange}
          renderValue={(selected) =>
            Array.isArray(selected) ? selected.join(", ") : ""
          }
          disabled={disabled}
        >
          {codecs.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={
                  Array.isArray(formData.codecs) &&
                  formData.codecs.indexOf(option.value) > -1
                }
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>Allowed codecs in order of preference.</FormHelperText>

      {/* Insecure */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Insecure</InputLabel>
        <Select
          required
          labelId="insecure"
          id="insecure"
          name="insecure"
          multiple
          label="Insecure"
          value={Array.isArray(formData.insecure) ? formData.insecure : []}
          onChange={handleInputChange}
          renderValue={(selected) =>
            Array.isArray(selected) ? selected.join(", ") : ""
          }
          disabled={disabled}
        >
          {insecure.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={
                  Array.isArray(formData.insecure) &&
                  formData.insecure.indexOf(option.value) > -1
                }
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Specify how to handle connections with peer, allowing insecure settings.
      </FormHelperText>

      {/* Call Limit */}
      <TextField
        margin="dense"
        label="Call Limit"
        type="text"
        fullWidth
        name="callLimit"
        variant="standard"
        value={formData.callLimit}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>
        The limit number of the inbound and outbound concurrent calls
      </FormHelperText>

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
        disabled={disabled}
      />
      {/* Add more fields as needed */}
    </Box>
  );
};

const AdvancedTabContent = ({ formData, handleInputChange, disabled }) => {
  const directMedia = [
    { value: "yes", label: "yes" },
    { value: "no", label: "no" },
    { value: "nonat", label: "nonat" },
    { value: "update", label: "update" },
  ];
  const callCounter = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const phoneUrl = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const trustRemotePartyId = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  const sendRemotePartyIdHeader = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    {
      value: "P-Asserted-Identity",
      label: "P-Asserted-Identity: <sip:.*@domain.com>",
    },
  ];
  const encryption = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  const videoSupport = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "always", label: "Always" },
  ];
  // Content for the Advanced tab
  return (
    <Box p={3}>
      <Typography variant="h6">Advanced</Typography>

      {/* Registry */}
      {/* <TextField
        label="Registry"
        value={formData?.register_string}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="standard"
        name="register_string"
        disabled={disabled}
      />
      <FormHelperText>
        The registry string, if required by provider, usually
        defaultuser:password@host
      </FormHelperText> */}

      {/* Direct Media */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Direct Media</InputLabel>
        <Select
          required
          labelId="directMedia"
          id="directMedia"
          name="directMedia"
          label="Direct Media"
          value={formData.directMedia}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {directMedia.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Asterisk by default tries to redirect the RTP media stream to go
        directly from the caller to the callee. Some devices do not support this
        (especially if one of them is behind a NAT). The default setting is YES.
        If you have all clients behind a NAT, or for some other reason want
        Asterisk to stay in the audio path, you may want to turn this off.
      </FormHelperText>

      {/* Call Counter */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Call Counter</InputLabel>
        <Select
          required
          labelId="callCounter"
          id="callCounter"
          name="callCounter"
          label="callCounter"
          value={formData.callCounter}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {callCounter.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>Enable call counters on devices.</FormHelperText>

      {/* From Domain */}
      <TextField
        margin="dense"
        label="From Domain"
        type="text"
        fullWidth
        name="fromDomain"
        variant="standard"
        value={formData.fromDomain}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>
        Set default From:domain in SIP messages when acting as a SIP ua
        (client). Some destinations may require mandatory identity name instead
        of only the IP address.
      </FormHelperText>

      {/* From User */}
      <TextField
        margin="dense"
        label="From User"
        type="text"
        fullWidth
        name="fromUser"
        variant="standard"
        value={formData.fromUser}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>
        How your provider knows you. This is which user to put instead of
        callerid when placing calls to peer (another SIP proxy). Valid only for
        type=peer.
      </FormHelperText>

      {/* Outbound Proxy */}
      <TextField
        margin="dense"
        label="Outbound Proxy"
        type="text"
        fullWidth
        name="outboundProxy"
        variant="standard"
        value={formData.outboundProxy}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>
        IP_address or DNS SRV name (excluding the _sip._udp prefix): SRV name,
        hostname, or IP address of the outbound SIP Proxy. Send outbound
        signaling to this proxy, not directly to the devices. Valid only for
        type=peer.
      </FormHelperText>

      {/* Add Phone to URL */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Add Phone to URL</InputLabel>
        <Select
          required
          labelId="phoneUrl"
          id="phoneUrl"
          name="phoneUrl"
          label="Add Phone to URL"
          value={formData.phoneUrl}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {phoneUrl.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Define if the provider requires &quot;user=phone&quot; on URL.
      </FormHelperText>

      {/* Trust Remote Party ID */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Trust Remote Party ID</InputLabel>
        <Select
          required
          labelId="trustRemotePartyId"
          id="trustRemotePartyId"
          name="trustRemotePartyId"
          label="Trust Remote PartyId"
          value={formData.trustRemotePartyId}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {trustRemotePartyId.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Define if Remote-Party-ID should be trusted.
      </FormHelperText>

      {/* Send Remote Party ID Header */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Send Remote Party ID Header</InputLabel>
        <Select
          required
          labelId="sendRemotePartyIdHeader"
          id="sendRemotePartyIdHeader"
          name="sendRemotePartyIdHeader"
          label="Send Remote Party ID Header"
          value={formData.sendRemotePartyIdHeader}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {sendRemotePartyIdHeader.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Define if Remote-Party-ID should be sent (defaults is no).
      </FormHelperText>

      {/* Encryption */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Encryption</InputLabel>
        <Select
          required
          labelId="encryption"
          id="encryption"
          name="encryption"
          label="Encryption"
          value={formData.encryption}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {encryption.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormHelperText>
        Whether to offer SRTP encrypted media (and only SRTP encrypted media) on
        outgoing calls to a peer. Calls will fail with HANGUPCAUSE=58 if the
        peer does not support SRTP. Defaults value is No.
      </FormHelperText>

      {/* Port */}
      <TextField
        margin="dense"
        label="Port"
        type="text"
        fullWidth
        name="port"
        variant="standard"
        value={formData.port}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <FormHelperText>The SIP port number.</FormHelperText>

      {/* t38ptUdptl */}
      <TextField
        label="T38pt Udptl"
        value={formData.t38ptUdptl}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="standard"
        name="t38ptUdptl"
        disabled={disabled}
      />
      <FormHelperText>Es: yes,redundancy,maxdatagram=400</FormHelperText>

      {/* Video Support */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="type">Video Support</InputLabel>
        <Select
          required
          labelId="videoSupport"
          id="videoSupport"
          name="videoSupport"
          label="Video Support"
          value={formData.videoSupport}
          onChange={handleInputChange}
          disabled={disabled}
        >
          {videoSupport.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

const AccountTabContent = ({
  formData,
  handleInputChange,
  disabled,
  balance,
  balanceLoading,
}) => {
  // Check if account information has been configured
  const isAccountConfigured = formData.account_number && formData.phone_number;

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Account Information
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your provider account information for balance checking.
      </Typography>

      {/* Account Number */}
      <TextField
        margin="dense"
        label="Account Number"
        type="text"
        fullWidth
        name="account_number"
        variant="standard"
        value={formData.account_number || ""}
        onChange={handleInputChange}
        disabled={disabled || isAccountConfigured}
        placeholder="e.g., 0320000005"
        helperText={
          isAccountConfigured
            ? "Account number is configured and cannot be changed"
            : "Enter your provider account number"
        }
      />

      {/* Phone Number */}
      <TextField
        margin="dense"
        label="Phone Number"
        type="text"
        fullWidth
        name="phone_number"
        variant="standard"
        value={formData.phone_number || ""}
        onChange={handleInputChange}
        disabled={disabled || isAccountConfigured}
        placeholder="e.g., 0323300242"
        helperText={
          isAccountConfigured
            ? "Phone number is configured and cannot be changed"
            : "Enter your SIP trunk phone number"
        }
      />

      {/* Balance Display */}
      {formData.account_number && formData.phone_number && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            backgroundColor: "#fafafa",
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Account BalanceX
          </Typography>
          {balanceLoading ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={20} />
              <Typography variant="body2">Checking balance...</Typography>
            </Box>
          ) : balance ? (
            <Box>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontWeight: "bold" }}
              >
                {balance.currency} {balance.amount?.toLocaleString() || "0.00"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Last updated:{" "}
                {balance.lastUpdated
                  ? new Date(balance.lastUpdated).toLocaleString()
                  : "Never"}
              </Typography>
              {balance.error && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Error: {balance.error}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No balance information available
            </Typography>
          )}
        </Box>
      )}

      {!isAccountConfigured && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Please configure your account number and phone number to enable
            balance checking. Once configured, these values cannot be changed.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

const OthersTabContent = ({ formData, handleInputChange, disabled }) => {
  return (
    <Stack spacing={2} p={3}>
      <Typography variant="h6">Other Settings</Typography>
      {/* Other Fields */}
      <TextField
        label="Other Fields"
        value={formData.others}
        onChange={handleInputChange}
        fullWidth
        margin="normal"
        variant="standard"
        name="others"
        disabled={disabled}
      />
      <FormHelperText>
        Other fields to add in the trunks conf files. Follow default asterisk
        format (key=value), each field on a single row
      </FormHelperText>
    </Stack>
  );
};

export default TrunkEdit;
