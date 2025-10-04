import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tabs,
  Tab,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useDispatch, useSelector } from "react-redux";
import { fetchIntervals } from "../../features/intervals/intervalSlice.js";

/**
 * IntervalDialog Component
 *
 * This component allows users to select existing intervals from the database or create custom ones.
 * It works with dynamic intervals that are stored in the database and managed through Redux.
 * The intervals come from the database, not from the static definitions in tools/Intervals.js.
 */

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`interval-tabpanel-${index}`}
      aria-labelledby={`interval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const IntervalDialog = ({ open, onClose, onSave, currentInterval }) => {
  const dispatch = useDispatch();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState(null);
  const { intervals, loading, error } = useSelector((state) => state.intervals);

  const [customInterval, setCustomInterval] = useState({
    id: `custom_${Date.now()}`,
    name: "",
    type: "custom",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [],
    monthDays: [],
    months: [],
    description: "",
  });

  // Log current interval for debugging
  useEffect(() => {
    if (currentInterval) {
      console.log("Current interval in dialog:", currentInterval);
      console.log("TimeRange:", currentInterval.timeRange);
    }
  }, [currentInterval]);

  // Fetch intervals when dialog opens
  useEffect(() => {
    if (open) {
      dispatch(fetchIntervals());
    }
  }, [dispatch, open]);

  // Set the selected interval when the dialog opens with a current interval
  useEffect(() => {
    if (open && currentInterval) {
      // If it's a predefined interval from the store, select it in the list
      const existing = intervals.find((i) => i.id === currentInterval.id);
      if (existing) {
        console.log("Found existing interval:", existing);
        setSelectedInterval(existing);
        setSelectedTab(0); // Switch to Existing tab
      } else if (currentInterval.type === "custom") {
        console.log("Setting custom interval:", currentInterval);

        // Ensure timeRange is properly formatted and is an object
        let timeRange = currentInterval.timeRange || {
          from: "00:00",
          to: "23:59",
        };
        if (typeof timeRange === "string") {
          try {
            timeRange = JSON.parse(timeRange);
          } catch (e) {
            console.error("Error parsing timeRange:", e);
            timeRange = { from: "00:00", to: "23:59" };
          }
        }

        // Ensure arrays are properly formatted
        const parseJsonArray = (field) => {
          if (typeof field === "string") {
            try {
              return JSON.parse(field);
            } catch (e) {
              console.error("Error parsing array field:", e);
              return [];
            }
          }
          return Array.isArray(field) ? field : [];
        };

        setCustomInterval({
          ...currentInterval,
          timeRange: {
            from: timeRange.from || "00:00",
            to: timeRange.to || "23:59",
          },
          weekDays: parseJsonArray(currentInterval.weekDays),
          monthDays: parseJsonArray(currentInterval.monthDays),
          months: parseJsonArray(currentInterval.months),
          description: currentInterval.description || "",
        });
        setSelectedTab(1); // Switch to Custom tab
      } else {
        // Reset to default state if no matching interval found
        setSelectedInterval(null);
        setCustomInterval({
          id: `custom_${Date.now()}`,
          name: "",
          type: "custom",
          timeRange: { from: "00:00", to: "23:59" },
          weekDays: [],
          monthDays: [],
          months: [],
          description: "",
        });
      }
    } else if (open) {
      // No interval selected, reset state
      setSelectedInterval(null);
      setCustomInterval({
        id: `custom_${Date.now()}`,
        name: "",
        type: "custom",
        timeRange: { from: "00:00", to: "23:59" },
        weekDays: [],
        monthDays: [],
        months: [],
        description: "",
      });
    }
  }, [currentInterval, intervals, open]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSave = () => {
    // Ensure timeRange is properly formatted before saving
    if (selectedTab === 0 && selectedInterval) {
      onSave(selectedInterval);
    } else if (selectedTab === 1 && customInterval.name) {
      const formattedCustomInterval = {
        ...customInterval,
        timeRange: {
          from: customInterval.timeRange?.from || "00:00",
          to: customInterval.timeRange?.to || "23:59",
        },
      };
      onSave(formattedCustomInterval);
    } else {
      // If removing the interval
      onSave(null);
    }
    onClose();
  };

  const handleRefreshIntervals = () => {
    dispatch(fetchIntervals());
  };

  const handleChangeCustom = (field, value) => {
    setCustomInterval((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTimeRangeChange = (field, value) => {
    setCustomInterval((prev) => ({
      ...prev,
      timeRange: {
        ...prev.timeRange,
        [field]: value,
      },
    }));
  };

  const handleRemoveInterval = () => {
    onSave(null);
    onClose();
  };

  // Render weekday checkboxes
  const renderWeekDaySelectors = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <FormGroup row>
        {days.map((day, index) => (
          <FormControlLabel
            key={`weekday-${index}`}
            control={
              <Checkbox
                checked={
                  Array.isArray(customInterval.weekDays) &&
                  customInterval.weekDays.includes(index)
                }
                onChange={(e) => {
                  const currentWeekDays = Array.isArray(customInterval.weekDays)
                    ? customInterval.weekDays
                    : [];
                  const weekDays = e.target.checked
                    ? [...currentWeekDays, index]
                    : currentWeekDays.filter((d) => d !== index);
                  handleChangeCustom("weekDays", weekDays);
                }}
              />
            }
            label={day}
          />
        ))}
      </FormGroup>
    );
  };

  // Render month day selectors (1-31)
  const renderMonthDaySelectors = () => {
    return (
      <FormControl fullWidth margin="normal">
        <InputLabel id="month-days-label">Month Days</InputLabel>
        <Select
          labelId="month-days-label"
          multiple
          value={
            Array.isArray(customInterval.monthDays)
              ? customInterval.monthDays
              : []
          }
          onChange={(e) => handleChangeCustom("monthDays", e.target.value)}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={`month-day-chip-${value}`} label={value} />
              ))}
            </Box>
          )}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <MenuItem key={`month-day-${day}`} value={day}>
              {day}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // Render month selectors
  const renderMonthSelectors = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <FormControl fullWidth margin="normal">
        <InputLabel id="months-label">Months</InputLabel>
        <Select
          labelId="months-label"
          multiple
          value={
            Array.isArray(customInterval.months) ? customInterval.months : []
          }
          onChange={(e) => handleChangeCustom("months", e.target.value)}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={`month-chip-${value}`} label={months[value]} />
              ))}
            </Box>
          )}
        >
          {months.map((month, index) => (
            <MenuItem key={`month-${index}`} value={index}>
              {month}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">
          {currentInterval ? "Edit Interval" : "Add Interval"}
        </Typography>
        <Box>
          <Tooltip title="Refresh intervals">
            <IconButton onClick={handleRefreshIntervals} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          aria-label="interval tabs"
        >
          <Tab label="Existing Intervals" />
          <Tab label="Custom Interval" />
        </Tabs>

        {/* Existing Intervals Tab */}
        <TabPanel value={selectedTab} index={0}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="interval-select-label">
              Select an Interval
            </InputLabel>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : error ? (
              <Box sx={{ color: "error.main", p: 2 }}>
                Error loading intervals: {error}
              </Box>
            ) : (
              <Select
                labelId="interval-select-label"
                value={selectedInterval?.id || ""}
                onChange={(e) => {
                  const interval = intervals.find(
                    (i) => i.id === e.target.value
                  );
                  setSelectedInterval(interval);
                }}
                label="Select an Interval"
              >
                <MenuItem value="" key="none-option">
                  <em>None (Remove interval)</em>
                </MenuItem>
                {intervals.map((interval) => (
                  <MenuItem
                    key={`interval-option-${interval.id}`}
                    value={interval.id}
                  >
                    {interval.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {selectedInterval && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "background.paper",
                borderRadius: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="h6">{selectedInterval.name}</Typography>
              {selectedInterval.description && (
                <Typography variant="body2" color="text.secondary">
                  {selectedInterval.description}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                {selectedInterval.timeRange?.from &&
                selectedInterval.timeRange?.to ? (
                  <>
                    <strong>Time:</strong> {selectedInterval.timeRange.from} -{" "}
                    {selectedInterval.timeRange.to}
                  </>
                ) : (
                  <>
                    <strong>Time:</strong> No time range specified
                  </>
                )}
              </Typography>
              {selectedInterval.weekDays &&
                Array.isArray(selectedInterval.weekDays) &&
                selectedInterval.weekDays.length > 0 && (
                  <Typography variant="body2">
                    <strong>Days:</strong>{" "}
                    {selectedInterval.weekDays
                      .map(
                        (d) =>
                          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
                      )
                      .join(", ")}
                  </Typography>
                )}
              {selectedInterval.monthDays &&
                Array.isArray(selectedInterval.monthDays) &&
                selectedInterval.monthDays.length > 0 && (
                  <Typography variant="body2">
                    <strong>Month Days:</strong>{" "}
                    {selectedInterval.monthDays.join(", ")}
                  </Typography>
                )}
            </Box>
          )}
        </TabPanel>

        {/* Custom Interval Tab */}
        <TabPanel value={selectedTab} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                label="Interval Name"
                value={customInterval.name || ""}
                onChange={(e) => handleChangeCustom("name", e.target.value)}
                required
                error={!customInterval.name && selectedTab === 1}
                helperText={
                  !customInterval.name && selectedTab === 1
                    ? "Name is required"
                    : ""
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="normal"
                label="From Time"
                type="time"
                value={customInterval.timeRange?.from || "00:00"}
                onChange={(e) => handleTimeRangeChange("from", e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="normal"
                label="To Time"
                type="time"
                value={customInterval.timeRange?.to || "23:59"}
                onChange={(e) => handleTimeRangeChange("to", e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Week Days
              </Typography>
              {renderWeekDaySelectors()}
            </Grid>

            <Grid item xs={12} sm={6}>
              {renderMonthDaySelectors()}
            </Grid>

            <Grid item xs={12} sm={6}>
              {renderMonthSelectors()}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                label="Description"
                value={customInterval.description || ""}
                onChange={(e) =>
                  handleChangeCustom("description", e.target.value)
                }
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        {currentInterval && (
          <Button
            onClick={handleRemoveInterval}
            color="error"
            sx={{ marginRight: "auto" }}
          >
            Remove Interval
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading || (selectedTab === 1 && !customInterval.name)}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntervalDialog;
