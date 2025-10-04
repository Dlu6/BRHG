import { useRef, useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Toolbar,
  AppBar,
  Button,
  Drawer,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Save,
  Upload,
  DragIndicator,
  Close as CloseIcon,
  ArrowBack,
} from "@mui/icons-material";

import FlipToFrontIcon from "@mui/icons-material/FlipToFront";
import FlipToBackIcon from "@mui/icons-material/FlipToBack";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useSelector, useDispatch } from "react-redux";
import { fetchVoiceQueues } from "../../features/voiceQueues/voiceQueueSlice";
import { fetchAgents } from "../../features/agents/agentsSlice";
import { BLOCK_TYPES } from "./blocks";
import {
  saveIVRFlow,
  selectIVRLoading,
  selectSaveStatus,
  selectIVRError,
  clearError,
  fetchIVRFlow,
  updateIVRFlow,
  selectCurrentFlow,
} from "../../features/ivr/ivrSlice";
import useAuth from "../../hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/apiClient";

const GRID_SIZE = 20; // Size of grid cells
const SNAP_THRESHOLD = 10; // Distance in pixels to trigger snapping
const SCROLL_THRESHOLD = 100; // Distance from edge to trigger scrolling
const SCROLL_SPEED = 10; // Pixels to scroll per frame
const SCROLL_INTERVAL = 16; // Milliseconds between scroll updates (60fps)
const BLOCK_WIDTH = 160;
const BLOCK_HEIGHT = 40;
const CONNECT_SNAP_DISTANCE = 18; // px radius to snap connectors to nearest port

// Function to encrypt data using AES
// const encryptData = async (data, key) => {
//   try {
//     // Convert the key to a proper format and ensure it's 256 bits (32 bytes)
//     const encoder = new TextEncoder();
//     const keyData = encoder.encode(key.padEnd(32, "0")); // Pad key to 32 bytes

//     // Generate a proper crypto key
//     const cryptoKey = await window.crypto.subtle.importKey(
//       "raw",
//       keyData.slice(0, 32), // Ensure exactly 32 bytes
//       { name: "AES-GCM", length: 256 }, // Specify 256-bit key
//       false,
//       ["encrypt"]
//     );

//     // Generate random IV
//     const iv = window.crypto.getRandomValues(new Uint8Array(12));

//     // Encrypt the data
//     const encodedData = encoder.encode(JSON.stringify(data));
//     const encryptedContent = await window.crypto.subtle.encrypt(
//       {
//         name: "AES-GCM",
//         iv: iv,
//       },
//       cryptoKey,
//       encodedData
//     );

//     // Combine IV and encrypted content
//     const encryptedArray = new Uint8Array(
//       iv.length + encryptedContent.byteLength
//     );
//     encryptedArray.set(iv);
//     encryptedArray.set(new Uint8Array(encryptedContent), iv.length);

//     // Convert to base64 for transmission
//     return btoa(String.fromCharCode(...encryptedArray));
//   } catch (error) {
//     console.error("Encryption error:", error);
//     throw new Error("Failed to encrypt data");
//   }
// };

// Utility function to generate Asterisk XML

const IVRBuilder = () => {
  const { id } = useParams(); // Get the flow ID from URL if editing
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  // console.log(user, "User in IVR Builder");

  const currentFlow = useSelector(selectCurrentFlow);
  const [blocks, setBlocks] = useState([]);
  const [connecting, setConnecting] = useState(null);
  const [connections, setConnections] = useState([]);
  const [editingBlock, setEditingBlock] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectionInProgress, setConnectionInProgress] = useState(null);
  const [draggingBlock, setDraggingBlock] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  // const [gridSize] = useState(20);
  const [canvasSize, setCanvasSize] = useState({
    width: 2000, // Initial width
    height: 2000, // Initial height
  });
  const [scrollInterval, setScrollInterval] = useState(null);
  const [zoom, setZoom] = useState(100); // 100 means 100%
  const [blockContextMenu, setBlockContextMenu] = useState(null);
  const [connectionContextMenu, setConnectionContextMenu] = useState(null);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [publishStatus, setPublishStatus] = useState({
    isPublished: false,
    publishedAt: null,
  });
  const [hoverTarget, setHoverTarget] = useState(null); // nearest connection point while connecting

  // Get available sip accounts from Redux store
  const { agents = [] } = useSelector(
    (state) => state.agents || { agents: [], loading: false }
  );
  // Get available voice queues from Redux store
  const { voiceQueues = [], loading: queuesLoading } = useSelector(
    (state) => state.voiceQueue || { voiceQueues: [], loading: false }
  );

  // Trunk Example || To fix this with real trunk data later on
  const trunks = [
    { value: "1", label: "Trunk 1" },
    { value: "2", label: "Trunk 2" },
    { value: "3", label: "Trunk 3" },
  ];

  // Get available lists from Redux store || Todo
  const lists = [
    { value: "blacklist", label: "Black List" },
    { value: "callbacklist", label: "Callback List" },
    { value: "publiclist", label: "Public List" },
  ];

  // Get Audio options from Redux store || Todo
  const audioFiles = [
    { value: "orderShipped", label: "Order Shipped" },
    { value: "welcomeMessage", label: "Welcome Message" },
    { value: "thankyou", label: "Thank You" },
  ];

  // Get available variables from Redux store || Todo
  const variables = [
    { value: "callerid", label: "Caller ID (dnid)" },
    { value: "calleridname", label: "Caller ID (name)" },
    { value: "calleridnumber", label: "Caller ID (num)" },
    { value: "channel", label: "Channel(language)" },
    { value: "choice", label: "Choice" },
    { value: "Counter", label: "Counter" },
    { value: "dbResults", label: "Database Results" },
    { value: "email", label: "Email" },
    { value: "extravar", label: "Extra Variable" },
    { value: "lastname", label: "Last Name" },
    { value: "firstname", label: "First Name" },
    { value: "orderNum", label: "Order Number" },
  ];

  // Get available intervals from redux || Todo
  const intervals = [
    { value: "newyear", label: "New Year" },
    { value: "weekend", label: "Weekend" },
    { value: "weekend", label: "Weekend" },
    { value: "independende", label: "Independence Day" },
  ];

  const loading = useSelector(selectIVRLoading);
  const saveStatus = useSelector(selectSaveStatus);
  const error = useSelector(selectIVRError);

  // console.log(user, "Which User???");
  useEffect(() => {
    dispatch(fetchVoiceQueues());
    dispatch(fetchAgents());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delete both block and connection on Delete Key Press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete") {
        if (selectedConnections.length > 0) {
          handleConnectionDelete();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnections]);

  // Prepare queue options for the dropdown
  const queueOptions = useMemo(() => {
    if (!Array.isArray(voiceQueues) || queuesLoading) return [];
    return voiceQueues.map((queue) => ({
      value: queue.id.toString(),
      label: `${queue.name} (${queue.id})`,
      name: queue.name,
    }));
  }, [voiceQueues, queuesLoading]);

  const handleConnectionStart = (blockId, pointType, pointIndex, e) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;

    setConnectionInProgress({
      sourceBlockId: blockId,
      sourceType: pointType,
      sourceIndex: pointIndex,
      startX: (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale,
      startY: (e.clientY - rect.top + canvasRef.current.scrollTop) / scale,
      currentX: (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale,
      currentY: (e.clientY - rect.top + canvasRef.current.scrollTop) / scale,
    });
  };

  const handleAutoScroll = (containerRef, mouseX, mouseY) => {
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Calculate distances from edges
    const distanceFromRight = rect.right - mouseX;
    const distanceFromLeft = mouseX - rect.left;
    const distanceFromBottom = rect.bottom - mouseY;
    const distanceFromTop = mouseY - rect.top;

    // Clear existing interval
    if (scrollInterval) {
      clearInterval(scrollInterval);
    }

    // Set up new scroll interval if near edges
    const interval = setInterval(() => {
      if (distanceFromRight < SCROLL_THRESHOLD) {
        container.scrollLeft += SCROLL_SPEED;
      } else if (distanceFromLeft < SCROLL_THRESHOLD) {
        container.scrollLeft -= SCROLL_SPEED;
      }

      if (distanceFromBottom < SCROLL_THRESHOLD) {
        container.scrollTop += SCROLL_SPEED;
      } else if (distanceFromTop < SCROLL_THRESHOLD) {
        container.scrollTop -= SCROLL_SPEED;
      }
    }, SCROLL_INTERVAL);

    setScrollInterval(interval);
  };

  const handleMouseMove = (e) => {
    if (draggingBlock) {
      const container = canvasRef.current;
      const rect = container.getBoundingClientRect();
      const scale = zoom / 100;

      handleAutoScroll(canvasRef, e.clientX, e.clientY);

      const rawPosition = {
        x:
          (e.clientX - rect.left - dragOffset.x + container.scrollLeft) / scale,
        y: (e.clientY - rect.top - dragOffset.y + container.scrollTop) / scale,
      };

      const snappedPosition = snapToGrid(rawPosition);

      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === draggingBlock.id
            ? { ...block, position: snappedPosition }
            : block
        )
      );
      updateCanvasSize(blocks);
    }

    if (connectionInProgress) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = zoom / 100;
      const currentX =
        (e.clientX - rect.left + canvasRef.current.scrollLeft) / scale;
      const currentY =
        (e.clientY - rect.top + canvasRef.current.scrollTop) / scale;

      setConnectionInProgress((prev) => ({
        ...prev,
        currentX,
        currentY,
      }));

      // Find nearest compatible connection point for magnetic snapping
      const desiredTargetType =
        connectionInProgress.sourceType === "output" ? "input" : "output";
      const nearest = findNearestConnectionPoint(
        currentX,
        currentY,
        desiredTargetType,
        connectionInProgress.sourceBlockId
      );
      setHoverTarget(nearest);
    }
  };

  const handleConnectionEnd = (targetBlockId, targetType, targetIndex) => {
    console.log("Connection End Data:", {
      targetBlockId,
      targetType,
      targetIndex,
      connectionInProgress,
    });

    if (!connectionInProgress) {
      console.log("No connection in progress");
      return;
    }

    // Prevent connecting same types
    if (connectionInProgress.sourceType === targetType) {
      console.log("Cannot connect same types");
      setConnectionInProgress(null);
      return;
    }

    // Prevent self-connections
    if (connectionInProgress.sourceBlockId === targetBlockId) {
      console.log("Cannot connect to self");
      setConnectionInProgress(null);
      return;
    }

    const newConnection = {
      from:
        connectionInProgress.sourceType === "output"
          ? connectionInProgress.sourceBlockId
          : targetBlockId,
      to:
        connectionInProgress.sourceType === "output"
          ? targetBlockId
          : connectionInProgress.sourceBlockId,
      fromIndex:
        connectionInProgress.sourceType === "output"
          ? connectionInProgress.sourceIndex
          : targetIndex,
      toIndex:
        connectionInProgress.sourceType === "output"
          ? targetIndex
          : connectionInProgress.sourceIndex,
    };

    // Validate connection
    if (isValidConnection(newConnection)) {
      setConnections((prev) => [...prev, newConnection]);
      console.log("Connection created:", newConnection);
    } else {
      console.log("Invalid connection");
    }

    setConnectionInProgress(null);
    setHoverTarget(null);
  };

  const isValidConnection = (connection) => {
    // Check if connection already exists
    const duplicateConnection = connections.find(
      (conn) =>
        conn.from === connection.from &&
        conn.to === connection.to &&
        conn.fromIndex === connection.fromIndex &&
        conn.toIndex === connection.toIndex
    );

    if (duplicateConnection) {
      console.log("Connection already exists");
      return false;
    }

    // Check if target block can accept more connections
    const targetBlock = blocks.find((b) => b.id === connection.to);
    const targetType = BLOCK_TYPES.find((t) => t.id === targetBlock.type);
    const existingInputs = connections.filter(
      (conn) => conn.to === connection.to
    );

    if (existingInputs.length >= targetType.connections.inputs) {
      console.log("Target block cannot accept more connections");
      return false;
    }

    return true;
  };

  // Compute all available connection points of a given type with absolute centers
  const getAllConnectionPoints = (pointType) => {
    const points = [];
    for (const block of blocks) {
      const blockType = BLOCK_TYPES.find((t) => t.id === block.type);
      if (!blockType) continue;
      const count =
        pointType === "input"
          ? blockType.connections.inputs
          : blockType.connections.outputs;
      for (let i = 0; i < count; i++) {
        const rel =
          pointType === "input"
            ? { left: -6, top: (BLOCK_HEIGHT * (i + 1)) / (count + 1) }
            : {
                left: BLOCK_WIDTH - 6,
                top: (BLOCK_HEIGHT * (i + 1)) / (count + 1),
              };
        const cx = block.position.x + rel.left + 6;
        const cy = block.position.y + rel.top + 6;
        points.push({ blockId: block.id, type: pointType, index: i, cx, cy });
      }
    }
    return points;
  };

  const findNearestConnectionPoint = (x, y, targetType, excludeBlockId) => {
    const candidates = getAllConnectionPoints(targetType).filter(
      (p) => p.blockId !== excludeBlockId
    );
    if (candidates.length === 0) return null;
    let best = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      const dx = c.cx - x;
      const dy = c.cy - y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    if (best && bestDist <= CONNECT_SNAP_DISTANCE) {
      return best;
    }
    return null;
  };

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData("blockType", JSON.stringify(type));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = JSON.parse(e.dataTransfer.getData("blockType"));
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;

    const newBlock = {
      id: `${type.id}-${Date.now()}`,
      type: type.id,
      position: {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      },
      config: getDefaultConfig(type.id),
    };

    setBlocks([...blocks, newBlock]);
  };

  const getDefaultConfig = (type) => {
    switch (type) {
      case "menu":
        return { options: [], prompt: "" };
      case "queue":
        return { queueName: "", timeout: 300 };
      case "timeCondition":
        return { schedule: [], timezone: "EAT" };
      default:
        return {};
    }
  };

  const handleBlockConnect = (blockId, pointType, pointIndex) => {
    if (!connecting) {
      // Starting a new connection
      if (pointType === "output") {
        setConnecting({
          sourceId: blockId,
          sourceIndex: pointIndex,
          targetId: null,
          targetIndex: null,
          type: getConnectionType(blockId, pointIndex),
        });
      }
    } else {
      // Completing a connection
      if (pointType === "input" && connecting.sourceId !== blockId) {
        const newConnection = {
          from: connecting.sourceId,
          to: blockId,
          fromIndex: connecting.sourceIndex,
          toIndex: pointIndex,
          type: connecting.type,
          priority: getNextPriority(connecting.sourceId),
        };

        if (isValidConnection(newConnection)) {
          setConnections([...connections, newConnection]);
        }
      }
      setConnecting(null);
    }
  };

  const getConnectionType = (blockId, outputIndex) => {
    const block = blocks.find((b) => b.id === blockId);
    const blockType = BLOCK_TYPES.find((t) => t.id === block.type);

    switch (blockType.id) {
      case "InternalDial":
        return outputIndex === 0 ? "success" : "failure";
      case "menu":
        return "option";
      case "GotoIfTime":
        return outputIndex === 0 ? "matched" : "unmatched";
      default:
        return "next";
    }
  };

  const getNextPriority = (sourceId) => {
    const existingConnections = connections.filter(
      (conn) => conn.from === sourceId
    );
    return existingConnections.length + 1;
  };

  const handleSaveIVRProject = async () => {
    if (!user) {
      console.error("Not authenticated!");
      return;
    }

    const flowData = {
      name: currentFlow?.name || "Untitled Flow",
      description: currentFlow?.description || "",
      blocks,
      connections,
      created_by: user.id,
      metadata: {
        lastModified: new Date().toISOString(),
        version: currentFlow?.metadata?.version || "1.0",
      },
    };

    try {
      if (id) {
        // Update existing flow
        await dispatch(updateIVRFlow({ id, flowData })).unwrap();
      } else {
        // Create new flow
        await dispatch(saveIVRFlow(flowData)).unwrap();
      }
    } catch (error) {
      console.error("Error saving IVR flow:", error);
    }
  };

  const handleBlockDrag = (e, block) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;

    setDragOffset({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    });
    setDraggingBlock(block);
  };

  const snapToGrid = (value) => {
    const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
    const diff = Math.abs(value - snapped);
    return diff < SNAP_THRESHOLD ? snapped : value;
  };

  const handleBlockClick = (block) => {
    if (!connecting) {
      setEditingBlock(block);
      setDialogOpen(true);
    } else {
      handleBlockConnect(block.id);
    }
  };

  const handleSaveConfig = (config) => {
    setBlocks(
      blocks.map((block) =>
        block.id === editingBlock.id
          ? { ...block, config, label: config.label || block.type }
          : block
      )
    );
    setDialogOpen(false);
    setEditingBlock(null);
  };

  const ConfigDialog = ({ block, open, onClose, onSave }) => {
    const [config, setConfig] = useState({
      ...block?.config,
      label: block?.label || block?.type || "",
    });

    const renderFields = () => {
      switch (block?.type) {
        case "Start":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || "Start"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="answer-label">Answer</InputLabel>
                <Select
                  labelId="answer-label"
                  value={config.answer || "yes"}
                  onChange={(e) =>
                    setConfig({ ...config, answer: e.target.value })
                  }
                  label="Answer"
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </>
          );
        case "InternalDial":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || "Internal Dial"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              {/* Dropdown for available sip accounts */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="sip-label">Select SIP*</InputLabel>
                <Select
                  labelId="sip-label"
                  value={config.sip || ""}
                  onChange={(e) =>
                    setConfig({ ...config, sip: e.target.value })
                  }
                  label="Select SIP*"
                  required
                  error={!config.sip}
                  helperText={!config.sip ? "Please select a SIP account" : ""}
                >
                  {agents.map((agent) => (
                    <MenuItem key={agent.extension} value={agent.extension}>
                      {agent.username} ({agent.extension})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Timeout"
                type="number"
                value={config.timeout || 60}
                onChange={(e) =>
                  setConfig({ ...config, timeout: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Options"
                value={config.options}
                onChange={(e) =>
                  setConfig({ ...config, options: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="URL"
                value={config.url || ""}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                margin="normal"
              />
            </>
          );
        case "ExternalDial":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || "External Dial"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                required
                error={!config.phone}
                helperText={!config.phone ? "Please enter a phone number" : ""}
                label="Phone"
                value={config.phone || ""}
                onChange={(e) =>
                  setConfig({ ...config, phone: e.target.value })
                }
                margin="normal"
              />
              {/* Trunk from dropdown */}
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!config.trunk}
                helperText={!config.trunk ? "Please select a trunk" : ""}
              >
                <InputLabel id="trunk-label">Select Trunk</InputLabel>
                <Select
                  labelId="trunk-label"
                  value={config.trunk || ""}
                  onChange={(e) =>
                    setConfig({ ...config, trunk: e.target.value })
                  }
                  label="Select Trunk"
                >
                  {trunks.map((trunk) => (
                    <MenuItem key={trunk.value} value={trunk.value}>
                      {trunk.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Timeout"
                type="number"
                value={config.timeout || 60}
                onChange={(e) =>
                  setConfig({ ...config, timeout: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Options"
                value={config.options || ""}
                onChange={(e) =>
                  setConfig({ ...config, options: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="URL"
                value={config.url || ""}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                margin="normal"
              />
            </>
          );
        case "Callback":
          return (
            <>
              <TextField
                fullWidth
                label="Callback"
                value={config.label || "Callback"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Name"
                value={config.name || "Name"}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                margin="normal"
                required
                error={!config.name}
                helperText={!config.name ? "Please enter a name" : ""}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={config.lastname || "Last Name"}
                onChange={(e) =>
                  setConfig({ ...config, lastname: e.target.value })
                }
                margin="normal"
              />
              {/* Phone */}
              <TextField
                fullWidth
                label="Phone"
                value={config.phone || ""}
                onChange={(e) =>
                  setConfig({ ...config, phone: e.target.value })
                }
                margin="normal"
              />
              {/* List */}
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!config.list}
                helperText={!config.list ? "Please select a list" : ""}
              >
                <InputLabel id="list-label">List</InputLabel>
                <Select
                  labelId="list-label"
                  value={config.list || ""}
                  onChange={(e) =>
                    setConfig({ ...config, list: e.target.value })
                  }
                  label="List"
                >
                  {lists.map((list) => (
                    <MenuItem key={list.value} value={list.value}>
                      {list.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Delay */}
              <TextField
                fullWidth
                label="Delay (min)"
                type="number"
                value={config.delay || 5}
                onChange={(e) =>
                  setConfig({ ...config, delay: e.target.value })
                }
                margin="normal"
              />

              {/* Priority */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  value={config.priority || "Highest"}
                  onChange={(e) =>
                    setConfig({ ...config, priority: e.target.value })
                  }
                  label="Priority"
                >
                  <MenuItem value="Highest">Highest</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Lowest">Lowest</MenuItem>
                </Select>
              </FormControl>
            </>
          );
        case "Record":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || ""}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                required
                error={!config.filename}
                helperText={!config.filename ? "Please enter a filename" : ""}
                label="Filename"
                value={config.filename || ""}
                onChange={(e) =>
                  setConfig({ ...config, filename: e.target.value })
                }
                margin="normal"
              />
              {/* Dropdown with recording formats */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="format-label">Format</InputLabel>
                <Select
                  labelId="format-label"
                  value={config.format || "wav"}
                  onChange={(e) =>
                    setConfig({ ...config, format: e.target.value })
                  }
                  label="Format"
                >
                  <MenuItem value="wav">Wav</MenuItem>
                  <MenuItem value="gsm">Gsm</MenuItem>
                  {/* <MenuItem value="mp3">MP3</MenuItem> */}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Max Duration (seconds)"
                type="number"
                value={config.duration || -1}
                onChange={(e) =>
                  setConfig({ ...config, duration: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Escape Digits"
                value={config.escapeDigits || "#"}
                onChange={(e) =>
                  setConfig({ ...config, escapeDigits: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Playback":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || "Playback"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              {/* Audio Dropdown selector */}
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!config.filename}
                helperText={
                  !config.filename ? "Please select an audio file" : ""
                }
              >
                <InputLabel id="audio-label">Audio</InputLabel>
                <Select
                  labelId="audio-label"
                  value={config.filename || ""}
                  onChange={(e) =>
                    setConfig({ ...config, filename: e.target.value })
                  }
                  label="Audio"
                >
                  {audioFiles.map((file) => (
                    <MenuItem key={file.value} value={file.value}>
                      {file.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Checkbox for skip if channel answered */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.skip || false}
                    onChange={(e) =>
                      setConfig({ ...config, skip: e.target.checked })
                    }
                  />
                }
                label="Skip if Channel Answered"
              />
              {/* Options */}
              <TextField
                fullWidth
                label="Options"
                value={config.options || ""}
                onChange={(e) =>
                  setConfig({ ...config, options: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Answer":
          return (
            <>
              <TextField
                fullWidth
                label="Answer"
                value={config.answer || ""}
                onChange={(e) =>
                  setConfig({ ...config, answer: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Timeout"
                type="number"
                value={config.timeout || 0}
                onChange={(e) =>
                  setConfig({ ...config, timeout: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Menu":
          return (
            <>
              <TextField
                fullWidth
                label="Menu Name"
                value={config.name || ""}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Prompt"
                value={config.prompt || ""}
                onChange={(e) =>
                  setConfig({ ...config, prompt: e.target.value })
                }
                margin="normal"
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Timeout (seconds)"
                value={config.timeout || 5}
                onChange={(e) =>
                  setConfig({ ...config, timeout: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                type="number"
                label="Max Retries"
                value={config.maxRetries || 3}
                onChange={(e) =>
                  setConfig({ ...config, maxRetries: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Goto":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || ""}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                required
                error={!config.context}
                helperText={!config.context ? "Please enter a context" : ""}
                label="Context"
                value={config.context || ""}
                onChange={(e) =>
                  setConfig({ ...config, context: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                required
                error={!config.extension}
                helperText={
                  !config.extension ? "Please enter an extension" : ""
                }
                label="Extension"
                value={config.extension || ""}
                onChange={(e) =>
                  setConfig({ ...config, extension: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                required
                error={!config.priority}
                helperText={!config.priority ? "Please enter a priority" : ""}
                label="Priority"
                type="number"
                value={config.priority || 1}
                onChange={(e) =>
                  setConfig({ ...config, priority: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "GotoIf":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || ""}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                required
                error={!config.condition}
                helperText={!config.condition ? "Please enter a condition" : ""}
                label="Condition"
                value={config.condition || ""}
                onChange={(e) =>
                  setConfig({ ...config, condition: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "GotoIfTime":
          return (
            <>
              <TextField
                fullWidth
                label="label"
                value={config.label}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              {/* Dropdown for Available intervals */}
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!config.interval}
                helperText={!config.interval ? "Please select an interval" : ""}
              >
                <InputLabel id="interval-label">Interval</InputLabel>
                <Select
                  labelId="interval-label"
                  value={config.interval || ""}
                  onChange={(e) =>
                    setConfig({ ...config, interval: e.target.value })
                  }
                  label="Interval"
                >
                  {intervals.map((interval) => (
                    <MenuItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          );
        case "Switch":
          return (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="Switch"
                value={config.label || "Switch"}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    label: e.target.value,
                  })
                }
              />
              {/* Dropdown variables */}
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!config.variable}
                helperText={!config.variable ? "Please select a variable" : ""}
              >
                <InputLabel id="variable-label">Variable</InputLabel>
                <Select
                  labelId="variable-label"
                  value={config.variable || ""}
                  onChange={(e) =>
                    setConfig({ ...config, variable: e.target.value })
                  }
                  label="Variable"
                >
                  {variables.map((variable) => (
                    <MenuItem key={variable.value} value={variable.value}>
                      {variable.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          );
        case "Goal":
          return (
            <>
              <TextField
                fullWidth
                label="Goal Name"
                value={config.name || ""}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Goal Value"
                value={config.value || ""}
                onChange={(e) =>
                  setConfig({ ...config, value: e.target.value })
                }
                margin="normal"
                required
                error={!config.value}
                helperText={!config.value ? "Please enter a goal value" : ""}
              />
            </>
          );
        case "queue":
          return (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel id="queue-label">Queue</InputLabel>
                <Select
                  labelId="queue-label"
                  value={config.queueName || ""}
                  onChange={(e) =>
                    setConfig({ ...config, queueName: e.target.value })
                  }
                  label="Select Queue"
                >
                  {queuesLoading ? (
                    <MenuItem value="">Loading queues...</MenuItem>
                  ) : queueOptions.length === 0 ? (
                    <MenuItem value="">No queues available</MenuItem>
                  ) : (
                    queueOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Options"
                value={config.options || "xX"}
                onChange={(e) =>
                  setConfig({ ...config, options: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="URL"
                value={config.url || ""}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Timeout"
                type="number"
                value={config.timeout || 30}
                onChange={(e) =>
                  setConfig({ ...config, timeout: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="AGI"
                type="text"
                value={config.agi || ""}
                onChange={(e) => setConfig({ ...config, agi: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Macro"
                type="text"
                value={config.macro || ""}
                onChange={(e) =>
                  setConfig({ ...config, macro: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="GoSub"
                type="text"
                value={config.goSub || ""}
                onChange={(e) =>
                  setConfig({ ...config, goSub: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Position"
                type="text"
                value={config.position || ""}
                onChange={(e) =>
                  setConfig({ ...config, position: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Database":
          return (
            <>
              <TextField
                fullWidth
                label="Database"
                value={config.database || ""}
                onChange={(e) =>
                  setConfig({ ...config, database: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                required
                error={!config.odbcConnection}
                helperText={
                  !config.odbcConnection
                    ? "Please enter an ODBC Connection"
                    : ""
                }
                label="ODBC Connection"
                value={config.odbcConnection || ""}
                onChange={(e) =>
                  setConfig({ ...config, odbcConnection: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Query"
                value={config.query || ""}
                onChange={(e) =>
                  setConfig({ ...config, query: e.target.value })
                }
                margin="normal"
              />
              {/* Dropdown for variable */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="variable-label">Variable</InputLabel>
                <Select
                  labelId="variable-label"
                  value={config.variable || ""}
                  onChange={(e) =>
                    setConfig({ ...config, variable: e.target.value })
                  }
                  label="Variable"
                >
                  {variables.map((variable) => (
                    <MenuItem key={variable.value} value={variable.value}>
                      {variable.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          );
        case "RestApi":
          return (
            <>
              <TextField
                l
                fullWidth
                label="Rest API"
                value={config.restApi || ""}
                onChange={(e) =>
                  setConfig({ ...config, restApi: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="URL"
                required
                error={!config.url}
                helperText={!config.url ? "Please enter a URL" : ""}
                value={config.url || ""}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                margin="normal"
              />
              {/* Dropdown with the available methods */}
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!config.method}
              >
                <InputLabel id="method-label">Method</InputLabel>
                <Select
                  labelId="method-label"
                  value={config.method || ""}
                  onChange={(e) =>
                    setConfig({ ...config, method: e.target.value })
                  }
                  label="Method"
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Headers"
                multiline
                rows={4}
                value={config.headers || ""}
                onChange={(e) =>
                  setConfig({ ...config, headers: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Body"
                value={config.body || ""}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Timeout"
                type="number"
                value={config.timeout || 5}
                onChange={(e) =>
                  setConfig({ ...config, timeout: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Script"
                value={config.script || ""}
                onChange={(e) =>
                  setConfig({ ...config, script: e.target.value })
                }
                margin="normal"
              />
              {/* Variables dropdown */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="variable-label">Variable</InputLabel>
                <Select
                  labelId="variable-label"
                  value={config.variable || ""}
                  onChange={(e) =>
                    setConfig({ ...config, variable: e.target.value })
                  }
                  label="Variable"
                >
                  {variables.map((variable) => (
                    <MenuItem key={variable.value} value={variable.value}>
                      {variable.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          );
        case "AGI":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.agi || ""}
                onChange={(e) => setConfig({ ...config, agi: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Command"
                value={config.command || ""}
                onChange={(e) =>
                  setConfig({ ...config, command: e.target.value })
                }
                margin="normal"
                required
                error={!config.command}
                helperText={!config.command ? "Please enter a command" : ""}
              />
              <TextField
                fullWidth
                label="Arguments"
                value={config.arguments || ""}
                onChange={(e) =>
                  setConfig({ ...config, arguments: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "System":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || "System"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              {/* Dropdown for Variables */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="variable-label">Variable</InputLabel>
                <Select
                  labelId="variable-label"
                  value={config.variable || ""}
                  onChange={(e) =>
                    setConfig({ ...config, variable: e.target.value })
                  }
                  label="Variable"
                >
                  {variables.map((variable) => (
                    <MenuItem key={variable.value} value={variable.value}>
                      {variable.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Command"
                value={config.command || ""}
                onChange={(e) =>
                  setConfig({ ...config, command: e.target.value })
                }
                margin="normal"
                required
                error={!config.command}
                helperText={!config.command ? "Please enter a command" : ""}
              />
            </>
          );
        case "NoOp":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || ""}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Command"
                value={config.command || ""}
                onChange={(e) =>
                  setConfig({ ...config, command: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Math":
          return (
            <>
              <TextField
                fullWidth
                label="Label"
                value={config.label || ""}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
              {/* Expression */}
              <TextField
                fullWidth
                label="Expression"
                value={config.expression || ""}
                onChange={(e) =>
                  setConfig({ ...config, expression: e.target.value })
                }
                margin="normal"
              />
              {/* Variables dropdown */}
              <FormControl fullWidth margin="normal">
                <InputLabel id="variable-label">Variable</InputLabel>
                <Select
                  labelId="variable-label"
                  value={config.variable || ""}
                  onChange={(e) =>
                    setConfig({ ...config, variable: e.target.value })
                  }
                  label="Variable"
                >
                  {variables.map((variable) => (
                    <MenuItem key={variable.value} value={variable.value}>
                      {variable.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          );
        case "Hangup":
          return (
            <>
              <TextField
                fullWidth
                label={config.label || "Hangup"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "Finally":
          return (
            <>
              <TextField
                fullWidth
                label={config.label || "Finally"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        case "End":
          return (
            <>
              <TextField
                fullWidth
                label={config.label || "End"}
                onChange={(e) =>
                  setConfig({ ...config, label: e.target.value })
                }
                margin="normal"
              />
            </>
          );
        // Add other application-specific fields
        default:
          return null;
      }
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configure {block?.type}
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>{renderFields()}</DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => onSave(config)}
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  const handleMouseUp = () => {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      setScrollInterval(null);
    }
    if (draggingBlock) {
      setDraggingBlock(null);
      setDragOffset({ x: 0, y: 0 });
    }
    if (connectionInProgress) {
      if (hoverTarget) {
        // Finalize connection to the hovered target even if mouse is not exactly on it
        handleConnectionEnd(
          hoverTarget.blockId,
          hoverTarget.type,
          hoverTarget.index
        );
      } else {
        setConnectionInProgress(null);
      }
      setHoverTarget(null);
    }
  };
  const ConnectionPoint = ({
    type,
    position,
    blockId,
    index,
    isConnecting,
    highlighted,
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        onMouseDown={(e) => {
          console.log("Connection Point MouseDown:", {
            type,
            blockId,
            index,
            isConnecting,
          });
          handleConnectionStart(blockId, type, index, e);
        }}
        onMouseUp={() => {
          console.log("Connection Point MouseUp:", {
            type,
            blockId,
            index,
            isConnecting,
            connectionInProgress,
          });
          if (connectionInProgress) {
            handleConnectionEnd(blockId, type, index);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "absolute",
          width: "14px",
          height: "14px",
          backgroundColor: highlighted
            ? "#1b1b1b"
            : isConnecting
            ? "#2e7d32"
            : isHovered
            ? "#333"
            : "#111",
          border: highlighted ? "2px solid #2196f3" : "2px solid #444",
          borderRadius: "50%",
          cursor: "crosshair",
          zIndex: 2,
          boxShadow: highlighted
            ? "0 0 0 6px rgba(33,150,243,0.15), 0 2px 6px rgba(0,0,0,0.35)"
            : isHovered
            ? "0 1px 3px rgba(0,0,0,0.35)"
            : "0 1px 2px rgba(0,0,0,0.25)",
          ...position,
        }}
      />
    );
  };

  const renderConnectionLine = () => {
    if (!connectionInProgress) return null;

    // Calculate control points for smooth curve
    const dx = connectionInProgress.currentX - connectionInProgress.startX;
    const controlPointOffset = Math.abs(dx) / 2;

    // Use hoverTarget center to visually snap the preview line
    const endX = hoverTarget ? hoverTarget.cx : connectionInProgress.currentX;
    const endY = hoverTarget ? hoverTarget.cy : connectionInProgress.currentY;

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        <defs>
          <marker
            id="arrowhead-temp"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#D9213F" />
          </marker>
        </defs>
        <path
          d={`M ${connectionInProgress.startX} ${connectionInProgress.startY} 
              C ${connectionInProgress.startX + controlPointOffset} ${
            connectionInProgress.startY
          },
                ${endX - controlPointOffset} ${endY},
                ${endX} ${endY}`}
          stroke="#4e7"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          markerEnd="url(#arrowhead-temp)"
        />
      </svg>
    );
  };

  const handleBlockContextMenu = (event, block) => {
    event.preventDefault();
    event.stopPropagation();
    setBlockContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      block: block,
    });
  };
  const handleBlockDelete = () => {
    if (blockContextMenu?.block) {
      // Remove all connections associated with this block
      setConnections(
        connections.filter(
          (conn) =>
            conn.from !== blockContextMenu.block.id &&
            conn.to !== blockContextMenu.block.id
        )
      );
      // Remove the block
      setBlocks(blocks.filter((b) => b.id !== blockContextMenu.block.id));
    }
    setBlockContextMenu(null);
  };

  // For Duplicating Blocks
  const handleBlockDuplicate = () => {
    if (blockContextMenu?.block) {
      const newBlock = {
        ...blockContextMenu.block,
        id: `${blockContextMenu.block.type}-${Date.now()}`,
        position: {
          x: blockContextMenu.block.position.x + GRID_SIZE,
          y: blockContextMenu.block.position.y + GRID_SIZE,
        },
      };
      setBlocks([...blocks, newBlock]);
    }
    setBlockContextMenu(null);
  };

  // For Bringing Blocks to Front
  const handleBringToFront = () => {
    if (blockContextMenu?.block) {
      const newBlocks = [...blocks];
      const index = newBlocks.findIndex(
        (b) => b.id === blockContextMenu.block.id
      );
      if (index !== -1) {
        const [block] = newBlocks.splice(index, 1);
        newBlocks.push(block);
        setBlocks(newBlocks);
      }
    }
    setBlockContextMenu(null);
  };

  // For Sending Blocks to Back
  const handleSendToBack = () => {
    if (blockContextMenu?.block) {
      const newBlocks = [...blocks];
      const index = newBlocks.findIndex(
        (b) => b.id === blockContextMenu.block.id
      );
      if (index !== -1) {
        const [block] = newBlocks.splice(index, 1);
        newBlocks.unshift(block);
        setBlocks(newBlocks);
      }
    }
    setBlockContextMenu(null);
  };

  const handleConnectionDelete = () => {
    if (selectedConnections.length > 0) {
      setConnections((prevConnections) =>
        prevConnections.filter(
          (conn) =>
            !selectedConnections.some(
              (selected) =>
                selected.from === conn.from &&
                selected.to === conn.to &&
                selected.fromIndex === conn.fromIndex &&
                selected.toIndex === conn.toIndex
            )
        )
      );
      setSelectedConnections([]);
      setConnectionContextMenu(null);
    }
  };

  const handleConnectionDuplicate = () => {
    if (connectionContextMenu?.connection) {
      const newConnection = {
        ...connectionContextMenu.connection,
        // Optionally modify the duplicate connection's properties
        fromIndex: connectionContextMenu.connection.fromIndex + 1,
        toIndex: connectionContextMenu.connection.toIndex + 1,
      };
      setConnections([...connections, newConnection]);
    }
    setConnectionContextMenu(null);
  };

  const renderConnections = () => {
    return connections.map((connection, index) => {
      const fromBlock = blocks.find((b) => b.id === connection.from);
      const toBlock = blocks.find((b) => b.id === connection.to);

      if (!fromBlock || !toBlock) return null;

      const fromPoint = {
        x: fromBlock.position.x + 160,
        y: fromBlock.position.y + 20 + connection.fromIndex * 20,
      };

      const toPoint = {
        x: toBlock.position.x,
        y: toBlock.position.y + 20 + connection.toIndex * 20,
      };

      const dx = toPoint.x - fromPoint.x;
      const controlPointOffset = Math.abs(dx) / 2;

      const isSelected = selectedConnections.some(
        (selected) =>
          selected.from === connection.from &&
          selected.to === connection.to &&
          selected.fromIndex === connection.fromIndex &&
          selected.toIndex === connection.toIndex
      );

      // Create the path string once
      const pathString = `M ${fromPoint.x} ${fromPoint.y} 
        C ${fromPoint.x + controlPointOffset} ${fromPoint.y},
          ${toPoint.x - controlPointOffset} ${toPoint.y},
          ${toPoint.x} ${toPoint.y}`;

      return (
        <svg
          key={`connection-${index}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none", // Change this to allow clicking through
          }}
        >
          <defs>
            <marker
              id={`arrowhead-${index}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={isSelected ? "#2196f3" : "#690"}
              />
            </marker>
          </defs>

          {/* Invisible wider path for better click detection */}
          <path
            d={pathString}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            style={{ pointerEvents: "stroke", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) {
                setSelectedConnections((prev) =>
                  prev.some(
                    (c) =>
                      c.from === connection.from &&
                      c.to === connection.to &&
                      c.fromIndex === connection.fromIndex &&
                      c.toIndex === connection.toIndex
                  )
                    ? prev
                    : [...prev, connection]
                );
              } else {
                setSelectedConnections([connection]);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedConnections([connection]);
              setConnectionContextMenu({
                mouseX: e.clientX,
                mouseY: e.clientY,
                connection: connection,
              });
            }}
          />

          {/* Visual connection line */}
          {isSelected && (
            <path
              d={pathString}
              stroke="#2196f3"
              strokeWidth="6"
              fill="none"
              opacity="0.2"
              style={{ pointerEvents: "none" }}
            />
          )}

          <path
            d={pathString}
            stroke={isSelected ? "#2196f3" : "#690"}
            strokeWidth={isSelected ? "2" : "1"}
            fill="none"
            markerEnd={`url(#arrowhead-${index})`}
            style={{ pointerEvents: "none" }}
          />
        </svg>
      );
    });
  };

  const GridOverlay = () => (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 1,
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );

  const updateCanvasSize = (blocks) => {
    const padding = 300; // Extra space beyond the furthest block

    const maxX = Math.max(...blocks.map((block) => block.position.x), 0);
    const maxY = Math.max(...blocks.map((block) => block.position.y), 0);

    setCanvasSize((prev) => ({
      width: Math.max(prev.width, maxX + padding),
      height: Math.max(prev.height, maxY + padding),
    }));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200)); // Max 200%
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25)); // Min 25%
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  useEffect(() => {
    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollInterval]);

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedConnections([]);
      setConnectionContextMenu(null);
      setBlockContextMenu(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedConnections([]);
        setConnectionContextMenu(null);
        setBlockContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (id) {
      // If we have an ID, fetch the flow data
      dispatch(fetchIVRFlow(id)); // You'll need to create this action
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  useEffect(() => {
    if (currentFlow && id) {
      // Set up the builder with existing flow data
      setBlocks(currentFlow.blocks);
      setConnections(currentFlow.connections);
      // Set any other necessary state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFlow, id]);

  const handlePublishFlow = async () => {
    if (!currentFlow?.id) {
      setSnackbar({
        open: true,
        message: "Please save the flow before publishing",
        severity: "warning",
      });
      return;
    }

    // Validate flow before publishing
    const validationErrors = validateFlow(blocks, connections);
    if (validationErrors.length > 0) {
      setSnackbar({
        open: true,
        message: `Cannot publish: ${validationErrors.join(", ")}`,
        severity: "error",
      });
      return;
    }

    try {
      const response = await apiClient.post(
        `/users/ivr/publish/${currentFlow.id}`
      );
      if (response.data.success) {
        setPublishStatus({
          isPublished: true,
          publishedAt: new Date(),
        });
        setSnackbar({
          open: true,
          message: "IVR flow published successfully!",
          severity: "success",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to publish IVR flow!",
        severity: "error",
      });
    }
  };

  const validateFlow = (blocks, connections) => {
    const errors = [];

    // Check for Start block and its connection
    const startBlock = blocks.find((b) => b.type === "Start");
    if (!startBlock) {
      errors.push("Missing Start block");
    } else {
      const startConnection = connections.find((c) => c.from === startBlock.id);
      if (!startConnection)
        errors.push("Start block must have an outgoing connection");
    }

    // Remove the Answer block validation since it's handled by Start block

    // Check for End block
    const endBlock = blocks.find((b) => b.type === "End");
    if (!endBlock) errors.push("Missing End block");

    // Validate specific block types based on Asterisk requirements
    blocks.forEach((block) => {
      switch (block.type) {
        case "Menu":
          if (!block.data?.prompt) errors.push("Menu block missing prompt");
          if (!block.data?.timeout) errors.push("Menu block missing timeout");
          if (!block.data?.maxDigits || block.data.maxDigits < 1)
            errors.push("Menu block invalid maxDigits");
          break;

        case "Queue": {
          if (!block.data?.queueName)
            errors.push("Queue block missing queue name");
          if (!block.data?.timeout || block.data.timeout < 0)
            errors.push("Queue block invalid timeout");
          if (
            !block.data?.announceFrequency ||
            block.data.announceFrequency < 0
          )
            errors.push("Queue block invalid announce frequency");
          // Validate queue options format (Asterisk 20.11.1 options)
          const validQueueOptions = ["t", "T", "n", "d", "h", "r", "i", "c"];
          if (block.data?.options) {
            const invalidOptions = block.data.options
              .split("")
              .filter((opt) => !validQueueOptions.includes(opt));
            if (invalidOptions.length > 0) {
              errors.push(
                `Queue block invalid options: ${invalidOptions.join(",")}`
              );
            }
          }
          break;
        }

        case "Playback":
          if (!block.data?.filename)
            errors.push("Playback block missing audio file");
          // Validate audio file exists (you'll need to implement this)
          break;

        case "InternalDial":
          if (!block.data?.extension)
            errors.push("InternalDial block missing extension");
          if (!block.data?.timeout || block.data.timeout < 1)
            errors.push("InternalDial block invalid timeout");
          break;

        default:
          break;
      }
    });

    // Validate flow path completeness
    const validatePath = (blockId, visited = new Set()) => {
      if (visited.has(blockId)) return true; // Handle loops
      visited.add(blockId);

      const block = blocks.find((b) => b.id === blockId);
      if (!block) return false;

      if (block.type === "End") return true;

      const outgoingConnections = connections.filter((c) => c.from === blockId);
      return outgoingConnections.some((conn) =>
        validatePath(conn.to, new Set(visited))
      );
    };

    if (startBlock && !validatePath(startBlock.id)) {
      errors.push(
        "Flow must have at least one complete path from Start to End"
      );
    }

    return errors;
  };

  // const convertToAsteriskFormat = (blocks, connections) => {
  //   // Convert the blocks and connections to a format that Asterisk can understand
  //   // This might involve creating a dialplan or similar structure
  //   return JSON.stringify({ blocks, connections }); // Example conversion
  // };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/ivr/projects")}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            IVR Builder
          </Typography>

          {/* Add Zoom Controls */}
          <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
            <IconButton
              color="inherit"
              onClick={handleZoomOut}
              disabled={zoom <= 25}
            >
              <Tooltip title="Zoom Out">
                <ZoomOutIcon />
              </Tooltip>
            </IconButton>

            <Typography
              variant="body2"
              sx={{
                mx: 1,
                minWidth: "60px",
                textAlign: "center",
                userSelect: "none",
              }}
            >
              {zoom}%
            </Typography>

            <IconButton
              color="inherit"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
            >
              <Tooltip title="Zoom In">
                <ZoomInIcon />
              </Tooltip>
            </IconButton>

            <IconButton
              color="inherit"
              onClick={handleResetZoom}
              disabled={zoom === 100}
              sx={{ ml: 1 }}
            >
              <Tooltip title="Reset Zoom">
                <RestartAltIcon />
              </Tooltip>
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={handleSaveIVRProject} disabled={loading}>
              <Tooltip title="Save Flow">
                <Save />
              </Tooltip>
            </IconButton>

            <Tooltip
              title={
                publishStatus.isPublished
                  ? `Published at ${new Date(
                      publishStatus.publishedAt
                    ).toLocaleString()}`
                  : "Publish Flow"
              }
            >
              <span>
                <IconButton
                  onClick={handlePublishFlow}
                  disabled={
                    loading || !currentFlow?.id || publishStatus.isPublished
                  }
                  color={publishStatus.isPublished ? "success" : "default"}
                >
                  <Upload />
                </IconButton>
              </span>
            </Tooltip>

            {error && (
              <Alert
                severity="error"
                onClose={() => dispatch(clearError())}
                sx={{
                  position: "absolute",
                  top: "70px",
                  right: "20px",
                  zIndex: 1000,
                }}
              >
                {error}
              </Alert>
            )}

            {saveStatus === "succeeded" && (
              <Alert
                severity="success"
                sx={{
                  position: "absolute",
                  top: "70px",
                  right: "20px",
                  zIndex: 1000,
                }}
              >
                IVR Flow saved successfully
              </Alert>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Drawer
          variant="permanent"
          sx={{
            width: 240,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 240,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },
          }}
        >
          {/* Fixed Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              backgroundColor: "background.paper",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Typography variant="h6">Blocks</Typography>
          </Box>

          {/* Scrollable Block List */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2,
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "rgba(0,0,0,0.1)",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: "4px",
              },
            }}
          >
            {BLOCK_TYPES.map((type) => (
              <Paper
                key={type.id}
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                sx={{
                  p: 1,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: type.color,
                  color: "white",
                  cursor: "move",
                  "&:hover": {
                    opacity: 0.9,
                    transform: "translateY(-1px)",
                    transition: "all 0.2s",
                  },
                }}
              >
                <type.icon sx={{ mr: 1 }} />
                <Typography>{type.label}</Typography>
              </Paper>
            ))}
          </Box>
        </Drawer>

        <Box
          sx={{
            flex: 1,
            position: "relative",
            overflow: "auto",
            bgcolor: "#0f1115",
            "& > *": {
              minWidth: `${(canvasSize.width * zoom) / 100}px`,
              minHeight: `${(canvasSize.height * zoom) / 100}px`,
            },
          }}
        >
          <Box
            ref={canvasRef}
            sx={{
              position: "relative",
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              bgcolor: "#0f1115",
              transform: `scale(${zoom / 100})`,
              transformOrigin: "0 0",
              transition: "transform 0.2s ease-out",
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <GridOverlay />
            {blocks.map((block) => {
              const blockType = BLOCK_TYPES.find((t) => t.id === block.type);
              const blockWidth = BLOCK_WIDTH;
              const blockHeight = BLOCK_HEIGHT;

              // Calculate connection point positions
              const inputPoints = Array(blockType.connections.inputs)
                .fill(0)
                .map((_, i) => ({
                  left: -6,
                  top:
                    (blockHeight * (i + 1)) /
                    (blockType.connections.inputs + 1),
                }));

              const outputPoints = Array(blockType.connections.outputs)
                .fill(0)
                .map((_, i) => ({
                  left: blockWidth - 6,
                  top:
                    (blockHeight * (i + 1)) /
                    (blockType.connections.outputs + 1),
                }));

              return (
                <Paper
                  key={block.id}
                  onMouseDown={(e) => handleBlockDrag(e, block)}
                  onClick={() => handleBlockClick(block)}
                  onContextMenu={(e) => handleBlockContextMenu(e, block)}
                  sx={{
                    position: "absolute",
                    left: block.position.x,
                    top: block.position.y,
                    width: blockWidth,
                    height: blockHeight,
                    p: 1,
                    bgcolor: blockType.color,
                    color: "white",
                    cursor: "move",
                    display: "flex",
                    alignItems: "center",
                    boxShadow: connecting === block.id ? 8 : 2,
                    userSelect: "none",
                    zIndex: 1,
                  }}
                >
                  {/* Input connection points */}
                  {inputPoints.map((position, i) => (
                    <ConnectionPoint
                      key={`input-${i}`}
                      type="input"
                      position={position}
                      blockId={block.id}
                      index={i}
                      isConnecting={
                        !!connectionInProgress &&
                        connectionInProgress.sourceBlockId === block.id
                      }
                      highlighted={
                        !!hoverTarget &&
                        hoverTarget.type === "input" &&
                        hoverTarget.blockId === block.id &&
                        hoverTarget.index === i
                      }
                    />
                  ))}

                  {/* Output connection points */}
                  {outputPoints.map((position, i) => (
                    <ConnectionPoint
                      key={`output-${i}`}
                      type="output"
                      position={position}
                      blockId={block.id}
                      index={i}
                      isConnecting={
                        !!connectionInProgress &&
                        connectionInProgress.sourceBlockId === block.id
                      }
                      highlighted={
                        !!hoverTarget &&
                        hoverTarget.type === "output" &&
                        hoverTarget.blockId === block.id &&
                        hoverTarget.index === i
                      }
                    />
                  ))}

                  <DragIndicator sx={{ mr: 1 }} />
                  <blockType.icon sx={{ mr: 1 }} />
                  <Typography>
                    {block.config?.label || blockType.label}
                  </Typography>
                </Paper>
              );
            })}
            {renderConnections()}
            {renderConnectionLine()}
            <ConfigDialog
              block={editingBlock}
              open={dialogOpen}
              onClose={() => {
                setDialogOpen(false);
                setEditingBlock(null);
              }}
              onSave={handleSaveConfig}
            />
          </Box>
        </Box>
      </Box>
      {/* Block Context Menu */}
      <Menu
        open={blockContextMenu !== null}
        // onClose={handleContextMenuClose}
        onClose={() => setBlockContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          blockContextMenu !== null
            ? { top: blockContextMenu.mouseY, left: blockContextMenu.mouseX }
            : undefined
        }
      >
        {/* Delete Block */}
        <MenuItem onClick={handleBlockDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>

        {/* Duplicate Block */}
        <MenuItem onClick={handleBlockDuplicate}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          Duplicate
        </MenuItem>

        {/* Bring to Front */}
        <MenuItem onClick={handleBringToFront}>
          <ListItemIcon>
            <FlipToFrontIcon fontSize="small" />
          </ListItemIcon>
          Bring to Front
        </MenuItem>

        {/* Send to Back */}
        <MenuItem onClick={handleSendToBack}>
          <ListItemIcon>
            <FlipToBackIcon fontSize="small" />
          </ListItemIcon>
          Send to Back
        </MenuItem>

        {/* Cut Block */}
        <MenuItem onClick={() => setBlockContextMenu(null)}>
          <ListItemIcon>
            <ContentCutIcon fontSize="small" />
          </ListItemIcon>
          Cut
        </MenuItem>

        {/* Paste Block */}
        <MenuItem onClick={() => setBlockContextMenu(null)}>
          <ListItemIcon>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          Paste
        </MenuItem>
      </Menu>

      {/* Connection Context Menu */}
      <Menu
        open={connectionContextMenu !== null}
        onClose={() => setConnectionContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          connectionContextMenu !== null
            ? {
                top: connectionContextMenu.mouseY,
                left: connectionContextMenu.mouseX,
              }
            : undefined
        }
      >
        <MenuItem onClick={handleConnectionDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete Connection
        </MenuItem>
        <MenuItem onClick={handleConnectionDuplicate}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          Duplicate Connection
        </MenuItem>
        <MenuItem onClick={() => setConnectionContextMenu(null)}>
          <ListItemIcon>
            <ContentCutIcon fontSize="small" />
          </ListItemIcon>
          Cut Connection
        </MenuItem>
        <MenuItem onClick={() => setConnectionContextMenu(null)}>
          <ListItemIcon>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          Paste Connection
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IVRBuilder;
