import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import {
  fetchIntervals,
  addInterval,
  editInterval,
  removeInterval,
} from "../features/intervals/intervalSlice.js";

const IntervalsComponent = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { intervals, loading, error } = useSelector((state) => state.intervals);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingInterval, setEditingInterval] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    type: "fixed",
    timeRange: { from: "00:00", to: "23:59" },
    weekDays: [],
    monthDays: [],
    months: [],
    description: "",
  });

  // Local loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Fetch intervals on component mount
  useEffect(() => {
    dispatch(fetchIntervals());
  }, [dispatch]);

  // Show error notification if there's an error
  useEffect(() => {
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
    }
  }, [error, enqueueSnackbar]);

  const handleOpenDialog = (interval = null) => {
    if (interval) {
      setEditingInterval(interval);
      // Create a proper deep copy with defaulted values to avoid null/undefined issues
      setFormData({
        ...interval,
        timeRange: interval.timeRange
          ? {
              from: interval.timeRange.from || "00:00",
              to: interval.timeRange.to || "23:59",
            }
          : { from: "00:00", to: "23:59" },
        weekDays: Array.isArray(interval.weekDays)
          ? [...interval.weekDays]
          : [],
        monthDays: Array.isArray(interval.monthDays)
          ? [...interval.monthDays]
          : [],
        months: Array.isArray(interval.months) ? [...interval.months] : [],
        description: interval.description || "",
      });
    } else {
      setEditingInterval(null);
      setFormData({
        id: "", // Let the backend generate the ID
        name: "",
        type: "fixed",
        timeRange: { from: "00:00", to: "23:59" },
        weekDays: [],
        monthDays: [],
        months: [],
        description: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingInterval(null);
  };

  const handleSaveInterval = async () => {
    if (!formData.name.trim()) {
      enqueueSnackbar("Interval name is required", { variant: "error" });
      return;
    }

    // Prepare data with error handling
    let preparedFormData;
    try {
      // Ensure all fields are properly structured before saving
      preparedFormData = {
        ...formData,
        // Make sure timeRange is an object, not a string
        timeRange:
          typeof formData.timeRange === "string"
            ? JSON.parse(formData.timeRange)
            : {
                from: formData.timeRange?.from || "00:00",
                to: formData.timeRange?.to || "23:59",
              },
        // Ensure arrays are proper arrays, not strings
        weekDays: Array.isArray(formData.weekDays)
          ? formData.weekDays
          : typeof formData.weekDays === "string"
          ? JSON.parse(formData.weekDays)
          : [],
        monthDays: Array.isArray(formData.monthDays)
          ? formData.monthDays
          : typeof formData.monthDays === "string"
          ? JSON.parse(formData.monthDays)
          : [],
        months: Array.isArray(formData.months)
          ? formData.months
          : typeof formData.months === "string"
          ? JSON.parse(formData.months)
          : [],
      };
    } catch (error) {
      console.error("Error parsing interval data:", error);
      enqueueSnackbar("Invalid data format. Please fix and try again.", {
        variant: "error",
      });
      return;
    }

    try {
      setIsSaving(true);

      if (editingInterval) {
        // Update existing interval
        await dispatch(
          editInterval({
            id: editingInterval.id,
            data: preparedFormData,
          })
        ).unwrap();
        enqueueSnackbar("Interval updated successfully", {
          variant: "success",
        });
      } else {
        // Create new interval
        await dispatch(addInterval(preparedFormData)).unwrap();
        enqueueSnackbar("Interval created successfully", {
          variant: "success",
        });
      }

      // Refresh the intervals list
      dispatch(fetchIntervals());
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving interval:", error);
      enqueueSnackbar(
        typeof error === "string" ? error : "Failed to save interval",
        { variant: "error" }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInterval = async (id) => {
    if (window.confirm("Are you sure you want to delete this interval?")) {
      try {
        await dispatch(removeInterval(id)).unwrap();
        enqueueSnackbar("Interval deleted successfully", {
          variant: "success",
        });
      } catch (error) {
        console.error("Error deleting interval:", error);
        enqueueSnackbar(
          typeof error === "string" ? error : "Failed to delete interval",
          { variant: "error" }
        );
      }
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleTimeRangeChange = (field, value) => {
    setFormData((prevData) => ({
      ...prevData,
      timeRange: {
        ...prevData.timeRange,
        [field]: value,
      },
    }));
  };

  // Render weekday checkboxes
  const renderWeekDaySelectors = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <FormGroup row>
        {days.map((day, index) => (
          <FormControlLabel
            key={`day-${index}`}
            control={
              <Checkbox
                checked={
                  Array.isArray(formData.weekDays) &&
                  formData.weekDays.includes(index)
                }
                onChange={(e) => {
                  const currentWeekDays = Array.isArray(formData.weekDays)
                    ? [...formData.weekDays]
                    : [];
                  const weekDays = e.target.checked
                    ? [...currentWeekDays, index]
                    : currentWeekDays.filter((d) => d !== index);
                  handleFormChange("weekDays", weekDays);
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
          value={Array.isArray(formData.monthDays) ? formData.monthDays : []}
          onChange={(e) => handleFormChange("monthDays", e.target.value)}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={`month-day-${value}`} label={value} />
              ))}
            </Box>
          )}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <MenuItem key={`month-day-option-${day}`} value={day}>
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
          value={Array.isArray(formData.months) ? formData.months : []}
          onChange={(e) => handleFormChange("months", e.target.value)}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={`month-${value}`} label={months[value]} />
              ))}
            </Box>
          )}
        >
          {months.map((month, index) => (
            <MenuItem key={`month-option-${index}`} value={index}>
              {month}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // Show loading spinner while fetching data
  if (loading && !intervals.length) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5">Time Intervals</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Interval
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Time Range</TableCell>
              <TableCell>Days</TableCell>
              <TableCell>Description</TableCell>
              <TableCell width="150px">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {intervals.length > 0 ? (
              intervals.map((interval) => (
                <TableRow key={`interval-row-${interval.id}`}>
                  <TableCell>{interval.name}</TableCell>
                  <TableCell>{interval.type}</TableCell>
                  <TableCell>
                    {(() => {
                      let timeRange = interval.timeRange;

                      // Handle string timeRange (parse if needed)
                      if (typeof timeRange === "string") {
                        try {
                          timeRange = JSON.parse(timeRange);
                        } catch (e) {
                          console.error(
                            "Error parsing timeRange:",
                            e,
                            timeRange
                          );
                          return "N/A";
                        }
                      }

                      // Check if timeRange is properly formatted
                      if (
                        timeRange &&
                        typeof timeRange === "object" &&
                        timeRange.from &&
                        timeRange.to
                      ) {
                        return `${timeRange.from} - ${timeRange.to}`;
                      }

                      return "N/A";
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      let weekDays = interval.weekDays;

                      // Handle string weekDays (parse if needed)
                      if (typeof weekDays === "string") {
                        try {
                          weekDays = JSON.parse(weekDays);
                        } catch (e) {
                          console.error("Error parsing weekDays:", e, weekDays);
                          return "All days";
                        }
                      }

                      // Check if weekDays is a proper array with values
                      if (Array.isArray(weekDays) && weekDays.length > 0) {
                        return weekDays
                          .map((day) => {
                            // Ensure day is a number
                            const dayIndex = parseInt(day, 10);
                            if (
                              isNaN(dayIndex) ||
                              dayIndex < 0 ||
                              dayIndex > 6
                            ) {
                              return null;
                            }
                            return [
                              "Sun",
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                            ][dayIndex];
                          })
                          .filter(Boolean) // Remove nulls
                          .join(", ");
                      }

                      return "All days";
                    })()}
                  </TableCell>
                  <TableCell>{interval.description}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit interval">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(interval)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete interval">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteInterval(interval.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No intervals found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Interval Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingInterval ? "Edit Interval" : "Create Interval"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="normal"
                label="Interval Name"
                value={formData.name || ""}
                onChange={(e) => handleFormChange("name", e.target.value)}
                required
                error={!formData.name}
                helperText={!formData.name ? "Name is required" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || "fixed"}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                >
                  <MenuItem value="fixed">Fixed</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="normal"
                label="From Time"
                type="time"
                value={formData.timeRange?.from || "00:00"}
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
                value={formData.timeRange?.to || "23:59"}
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
                value={formData.description || ""}
                onChange={(e) =>
                  handleFormChange("description", e.target.value)
                }
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveInterval}
            variant="contained"
            color="primary"
            disabled={isSaving || !formData.name}
          >
            {isSaving ? <CircularProgress size={24} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntervalsComponent;
