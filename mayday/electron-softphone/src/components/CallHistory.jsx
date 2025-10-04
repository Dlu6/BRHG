import React, { useState, useEffect } from "react";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  // Badge,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  CallMade,
  CallReceived,
  CallMissed,
  Phone,
  Search,
  MoreVert,
  FilterList,
  InfoOutlined as InfoIcon,
  Email,
} from "@mui/icons-material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Delete from "@mui/icons-material/Delete";
import Block from "@mui/icons-material/Block";
import moment from "moment";
import { getUserData, getAuthToken } from "../services/storageService";
// import { io } from "socket.io-client";
import callHistoryService from "../services/callHistoryService";

const CallHistory = ({ open, onClose, onCallNumber }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  // const [userExtension, setUserExtension] = useState("");
  const [pollingInterval, setPollingInterval] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  // Setup polling for call history updates
  useEffect(() => {
    // Fetch initial call history
    fetchCallHistory();

    // Set up polling interval
    const interval = setInterval(() => {
      if (open) {
        // Only poll when the component is visible
        // console.log("Polling for call history updates...");
        fetchCallHistory(false, true); // Don't show loading indicator for polling, use timestamp
      }
    }, 20000); //Polling every 20 seconds

    setPollingInterval(interval);

    // Clean up interval on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [open]);

  // Handle initial call history data
  const handleInitialCallHistory = (data) => {
    if (data && data.data && data.data.records) {
      // Update calls
      setCalls(data.data.records);

      // Update last timestamp if we have records
      if (data.data.records.length > 0) {
        const newestCall = data.data.records[0]; // Records are sorted by timestamp DESC
        setLastTimestamp(newestCall.timestamp);
      }
    } else if (data && Array.isArray(data.calls)) {
      setCalls(data.calls);

      // Update last timestamp if we have records
      if (data.calls.length > 0) {
        const newestCall = data.calls[0]; // Records are sorted by timestamp DESC
        setLastTimestamp(newestCall.timestamp);
      }
    } else {
      console.error("Unexpected call history data format:", data);
      setError("Received invalid call history data");
    }
    setLoading(false);
  };

  // Handle incremental call history updates
  const handleIncrementalCallHistory = (data) => {
    if (
      data &&
      data.data &&
      data.data.records &&
      data.data.records.length > 0
    ) {
      // Get new records
      const newRecords = data.data.records;

      // Update the calls state by adding new records at the beginning
      setCalls((prevCalls) => {
        // Create a map of existing call IDs to avoid duplicates
        const existingCallIds = new Set(prevCalls.map((call) => call.id));

        // Filter out any new records that already exist
        const uniqueNewRecords = newRecords.filter(
          (record) => !existingCallIds.has(record.id)
        );

        // If we have new unique records, add them to the beginning
        if (uniqueNewRecords.length > 0) {
          // Update the last timestamp
          setLastTimestamp(uniqueNewRecords[0].timestamp);

          // Return the combined array, limited to 50 records
          return [...uniqueNewRecords, ...prevCalls].slice(0, 50);
        }

        // No new records, return the existing calls
        return prevCalls;
      });
    }
  };

  // Fetch call history from the server
  const fetchCallHistory = async (showLoading = true, useTimestamp = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      // Try to get user data, but don't fail if not available
      const userData = getUserData();
      const token = getAuthToken();

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      // Try the service first
      try {
        // If we're polling for updates and have a timestamp, use it
        const timestamp = useTimestamp ? lastTimestamp : null;
        const data = await callHistoryService.getCallHistory(50, timestamp);

        // If we're polling with a timestamp, use incremental update
        if (useTimestamp && timestamp) {
          handleIncrementalCallHistory(data);
        } else {
          // Otherwise do a full refresh
          handleInitialCallHistory(data);
        }
      } catch (serviceErr) {
        console.error("Service error, falling back to direct API:", serviceErr);
        // Fall back to direct API call
        await fetchViaApi(useTimestamp);
      }
    } catch (err) {
      console.error("Error fetching call history:", err);
      setError("Failed to load call history. Please try again later.");
      setLoading(false);
    }
  };

  // Fallback method to fetch via direct API
  // const fetchViaApi = async (useTimestamp = false) => {
  //   try {
  //     const token = getAuthToken();
  //     // console.log("Auth token available in fetchViaApi:", !!token);

  //     if (!token) {
  //       throw new Error("Authentication token not found");
  //     }

  //     // Get user data to extract extension
  //     const userData = getUserData();
  //     console.log("User data in fetchViaApi🧨🧨🧨🧨🧨🧨:", userData);

  //     // Try to get extension from different possible locations in userData
  //     // let extension;

  //     // if (userData?.extension) {
  //     //   extension = userData.extension;
  //     // } else if (userData?.user?.extension) {
  //     //   extension = userData.user.extension;
  //     // } else if (userData?.mongoUser?.extension) {
  //     //   extension = userData.mongoUser.extension;
  //     // }

  //     // console.log("Found extension:", extension);

  //     // Check if we're running in Electron
  //     const isElectron = window?.electron !== undefined;

  //     // Determine the correct API URL
  //     let apiUrl;
  //     if (isElectron) {
  //       // In Electron, use the environment variable
  //       apiUrl = import.meta.env.VITE_API_URL;
  //     } else {
  //       // In browser, use the current origin
  //       apiUrl = window.location.origin;
  //     }

  //     // Fallback to a hardcoded URL if all else fails
  //     if (!apiUrl) {
  //       apiUrl = "http://localhost:8004";
  //     }

  //     // Build URL with extension parameter
  //     let url = `${apiUrl}/api/cdr/call-history?limit=50&extension=${extension}`;

  //     // Add timestamp parameter if provided to only fetch newer records
  //     if (useTimestamp && lastTimestamp) {
  //       url += `&after=${encodeURIComponent(lastTimestamp)}`;
  //     }

  //     // console.log("Fetching from URL:", url);

  //     const response = await fetch(url, {
  //       method: "GET",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     // console.log("Response status in fetchViaApi:", response.status);

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.log("Error response text in fetchViaApi:", errorText);
  //       throw new Error(`API error: ${response.statusText} - ${errorText}`);
  //     }

  //     const data = await response.json();
  //     // console.log("Call history data received in fetchViaApi:", data);

  //     // If we're polling with a timestamp, use incremental update
  //     if (useTimestamp && lastTimestamp) {
  //       handleIncrementalCallHistory(data);
  //     } else {
  //       // Otherwise do a full refresh
  //       handleInitialCallHistory(data);
  //     }
  //   } catch (err) {
  //     console.error("Error in fallback API call:", err);
  //     setError(
  //       "Failed to load call history. Please check your connection and try again."
  //     );
  //     setLoading(false);
  //   }
  // };

  // State for filters and menu
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  // Filter counts
  const missedCalls = calls.filter((call) => call.status === "missed").length;
  const allCalls = calls.length;

  const handleMenuOpen = (event, call) => {
    setAnchorEl(event.currentTarget);
    setSelectedCall(call);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCall(null);
  };

  const getCallIcon = (type, status) => {
    // console.log("Status in getCallIcon:", status);
    if (status === "missed") return <CallMissed color="error" />;
    if (status === "failed") return <CallMissed color="warning" />;
    if (type === "outbound") return <CallMade color="primary" />;
    return <CallReceived color="success" />;
  };

  const formatTimestamp = (timestamp) => {
    // Handle invalid or null timestamps
    if (!timestamp || timestamp === "Invalid Date" || timestamp === "null") {
      return "Unknown time";
    }

    // Debug logging to understand what we're receiving
    // console.log("Raw timestamp received:", timestamp, typeof timestamp);

    // Parse the timestamp and ensure it's valid
    let callTime = moment(timestamp);

    // console.log(
    //   "Moment parsed timestamp:",
    //   callTime.format(),
    //   "Valid:",
    //   callTime.isValid()
    // );

    // If the timestamp is invalid, try to parse it as ISO string
    if (!callTime.isValid()) {
      callTime = moment(new Date(timestamp));
      // console.log(
      //   "Fallback moment timestamp:",
      //   callTime.format(),
      //   "Valid:",
      //   callTime.isValid()
      // );
      if (!callTime.isValid()) {
        return "Invalid time";
      }
    }

    // Ensure we're working with a valid moment object
    if (!callTime.isValid()) {
      return "Invalid time";
    }

    const formatted = callTime.calendar(null, {
      sameDay: "[Today at] LT",
      lastDay: "[Yesterday at] LT",
      lastWeek: "dddd [at] LT",
      sameElse: "MM/DD/YYYY LT",
    });

    // console.log("Final formatted timestamp:", formatted);
    return formatted;
  };

  // Filter calls based on active tab and search query
  const filteredCalls = calls.filter((call) => {
    const matchesSearch = (call.name || call.phoneNumber)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (activeTab === 1) {
      return matchesSearch && call.status === "missed";
    }
    return matchesSearch;
  });

  // Clean up polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title="Call History"
      headerColor="#1976d2"
    >
      {/* Search and Filter Bar - Added shadow */}
      <Box
        sx={{
          p: 2,
          backgroundColor: "white",
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: "0 2px 6px rgba(0,0,0,0.09)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search call history"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#f5f5f5",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                "&:hover": {
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
                "&.Mui-focused": {
                  boxShadow: "0 2px 4px rgba(25,118,210,0.15)",
                },
              },
            }}
          />
          <IconButton
            size="small"
            sx={{
              bgcolor: "#f5f5f5",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              "&:hover": {
                bgcolor: "#f5f5f5",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              },
            }}
          >
            <FilterList />
          </IconButton>
        </Box>

        {/* Tabs - Added subtle shadow to chips */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ minHeight: "auto" }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>All</span>
                <Chip
                  label={allCalls}
                  size="small"
                  sx={{
                    height: 20,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            }
            sx={{ minHeight: "auto", py: 1 }}
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Missed</span>
                <Chip
                  label={missedCalls}
                  size="small"
                  color="error"
                  sx={{
                    height: 20,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            }
            sx={{ minHeight: "auto", py: 1 }}
          />
        </Tabs>
      </Box>

      {/* Call List - Added hover shadow */}
      <List
        sx={{
          p: 0,
          bgcolor: "background.paper",
          overflow: "auto",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: "text.secondary",
              bgcolor: "#fafafa",
            }}
          >
            <InfoIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography>{error}</Typography>
          </Box>
        ) : filteredCalls.length === 0 ? (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: "text.secondary",
              bgcolor: "#fafafa",
            }}
          >
            <InfoIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography>No calls found</Typography>
          </Box>
        ) : (
          filteredCalls.map((call) => (
            <React.Fragment key={call.id}>
              <ListItem
                button
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    transform: "translateY(-1px)",
                  },
                  py: 1.5,
                }}
              >
                <ListItemIcon>
                  {getCallIcon(call.type, call.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: call.status === "missed" ? 500 : 400 }}
                    >
                      {call.name || call.phoneNumber}
                    </Typography>
                  }
                  secondary={
                    <Box component="span" sx={{ display: "flex", gap: 1 }}>
                      <Typography
                        variant="caption"
                        color={
                          call.status === "missed"
                            ? "error.main"
                            : call.status === "failed"
                            ? "warning.main"
                            : "text.secondary"
                        }
                      >
                        {call.type === "outbound" ? "Outgoing" : "Incoming"}
                        {call.status === "missed"
                          ? " (Missed)"
                          : call.status === "failed"
                          ? " (Failed)"
                          : call.billsec > 0
                          ? " (Answered)"
                          : ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(call.timestamp)}
                      </Typography>
                      {call.duration && (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {call.duration}
                          </Typography>
                        </>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Dial Number">
                    <IconButton
                      edge="end"
                      size="small"
                      sx={{
                        mr: 1,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "rgba(25, 118, 210, 0.08)",
                          color: "#1976d2",
                          boxShadow: "0 2px 4px rgba(25,118,210,0.15)",
                          transform: "scale(1.05)",
                        },
                        borderRadius: "50%",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.9)",
                      }}
                      onClick={() =>
                        onCallNumber && onCallNumber(call.phoneNumber)
                      }
                    >
                      <Phone />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send Email">
                    <IconButton
                      edge="end"
                      size="small"
                      sx={{
                        mr: 1,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "rgba(25, 118, 210, 0.08)",
                          color: "#1976d2",
                          boxShadow: "0 2px 4px rgba(25,118,210,0.15)",
                          transform: "scale(1.05)",
                        },
                        borderRadius: "50%",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.9)",
                      }}
                      onClick={() => {
                        // Open email compose with pre-filled recipient
                        window.dispatchEvent(
                          new CustomEvent("openEmailCompose", {
                            detail: {
                              to: call.phoneNumber + "@example.com", // This would need to be mapped to actual email
                              subject: `Follow-up: Call from ${call.phoneNumber}`,
                              body: `Dear Customer,\n\nThank you for your call today at ${moment(
                                call.timestamp
                              ).format(
                                "MMMM Do YYYY, h:mm:ss a"
                              )}.\n\nWe appreciate your business and look forward to serving you again.\n\nBest regards,\nHugamara Support Team`,
                            },
                          })
                        );
                      }}
                    >
                      <Email />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => handleMenuOpen(e, call)}
                    sx={{
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))
        )}
      </List>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            minWidth: 200,
            "& .MuiMenuItem-root": {
              gap: 0.3,
              py: 1,
            },
          },
        }}
      >
        {/* <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <InfoIcon fontSize="small" sx={{ color: "primary.main" }} />
          </ListItemIcon>
          Call Details
        </MenuItem> */}
        {/* <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" sx={{ color: "success.main" }} />
          </ListItemIcon>
          Add to Contacts
        </MenuItem> */}
        <MenuItem onClick={handleMenuClose} disabled={true}>
          <ListItemIcon>
            <Block fontSize="small" sx={{ color: "warning.main" }} />
          </ListItemIcon>
          Block Number
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          onClick={handleMenuClose}
          disabled={true}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </ContentFrame>
  );
};

export default CallHistory;
