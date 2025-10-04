import { useState, useEffect } from "react";
import apiClient from "../../api/apiClient.js";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tooltip,
  Slider,
  Select,
  MenuItem,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  CloudDownload,
  Star,
  Info,
  CalendarToday,
  Close as CloseIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  FastForward as FastForwardIcon,
  FastRewind as FastRewindIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { toast } from "react-toastify";
import {
  fetchRecordingDates,
  fetchRecordings,
  rateRecording,
  setSelectedDate,
} from "../../features/recordings/recordingsSlice";

// Enhanced Audio Player Component (Adapted from AudioManager.js)
const EnhancedAudioPlayer = ({ src, title, onClose }) => {
  const [audio] = useState(new Audio(src));
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    audio.play().catch((error) => {
      console.error("Auto-play failed for EnhancedAudioPlayer:", error);
      setIsPlaying(false); // Set to false if autoplay fails
    });

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audio]); // audio dependency is stable as it's created with useState

  const togglePlayPause = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeChange = (_, value) => {
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (_, value) => {
    audio.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    audio.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted) {
      // If unmuting, restore previous volume if it was > 0
      if (volume > 0) audio.volume = volume;
      else {
        // if volume was 0, set to a default like 0.5
        audio.volume = 0.5;
        setVolume(0.5);
      }
    }
  };

  const handlePlaybackRateChange = (newRate) => {
    audio.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time) || time < 0) {
      // Check if time is a finite and non-negative number
      return "--:--"; // Placeholder for invalid/loading times
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const skip = (seconds) => {
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      duration
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: "100%",
        p: 2,
        mb: 3,
        position: "sticky", // Make it sticky
        top: 0, // Stick to the top
        zIndex: 1200, // Ensure it's above other content
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="subtitle1"
          gutterBottom
          noWrap
          sx={{ maxWidth: "calc(100% - 48px)" }}
        >
          Now Playing: {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <IconButton onClick={togglePlayPause} color="primary">
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        <Typography sx={{ mx: 1, fontSize: "0.875rem" }}>
          {formatTime(currentTime)}
        </Typography>
        <Slider
          size="small"
          value={Number.isFinite(currentTime) ? currentTime : 0}
          min={0}
          max={Number.isFinite(duration) && duration > 0 ? duration : 0}
          onChange={handleTimeChange}
          sx={{ mx: 1, flexGrow: 1 }}
          aria-label="time-slider"
          disabled={!(Number.isFinite(duration) && duration > 0)}
        />
        <Typography sx={{ mx: 1, fontSize: "0.875rem" }}>
          {formatTime(duration)}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={toggleMute}>
            {isMuted || audio.volume === 0 ? (
              <VolumeOffIcon />
            ) : (
              <VolumeUpIcon />
            )}
          </IconButton>
          <Slider
            size="small"
            value={isMuted ? 0 : volume}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            sx={{ width: 100, mx: 1 }}
            aria-labelledby="volume-slider"
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => skip(-10)} title="Rewind 10s">
            <FastRewindIcon />
          </IconButton>
          <Select
            value={playbackRate}
            onChange={(e) => handlePlaybackRateChange(e.target.value)}
            size="small"
            sx={{ mx: 0.5, fontSize: "0.875rem" }}
            variant="standard"
            disableUnderline
          >
            <MenuItem value={0.5}>0.5x</MenuItem>
            <MenuItem value={1}>1x</MenuItem>
            <MenuItem value={1.25}>1.25x</MenuItem>
            <MenuItem value={1.5}>1.5x</MenuItem>
            <MenuItem value={2}>2x</MenuItem>
          </Select>
          <IconButton onClick={() => skip(10)} title="Forward 10s">
            <FastForwardIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

const Recordings = () => {
  // Redux
  const dispatch = useDispatch();
  const { dates, recordings, selectedDate, loading, error } = useSelector(
    (state) => state.recordings
  );

  // Local state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecordingForModal, setSelectedRecordingForModal] =
    useState(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingNotes, setRatingNotes] = useState("");

  // State for the new audio player
  const [activePlayerSrc, setActivePlayerSrc] = useState(null);
  const [activePlayerTitle, setActivePlayerTitle] = useState("");

  const toAbsoluteUrl = (p) => {
    if (!p) return p;
    // If it's already a full URL, return it
    if (/^https?:\/\//i.test(p)) return p;
    // Otherwise, treat it as a root-relative path
    return p;
  };

  // Fetch available recording dates on component mount
  useEffect(() => {
    dispatch(fetchRecordingDates());
  }, [dispatch]);

  // Effect to load recordings when date changes
  useEffect(() => {
    if (selectedDate) {
      dispatch(fetchRecordings(selectedDate));
      setActivePlayerSrc(null); // Close player when date changes
      setActivePlayerTitle("");
    }
  }, [selectedDate, dispatch]);

  // Effect to show error notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle date change
  const handleDateChange = (date) => {
    // Keep as Date object; the fetch thunk formats Date with date-fns
    dispatch(setSelectedDate(date || new Date()));
    // Player will be closed by the useEffect for selectedDate change
  };

  // Play/pause audio with the new player
  const handlePlayRecording = (recording) => {
    if (activePlayerSrc === toAbsoluteUrl(recording.path)) {
      // Optionally, if player is already open for this track, clicking again could pause it
      // or simply do nothing / rely on player's own controls.
      // For now, clicking again will re-set it, effectively restarting if player isn't smart.
      // Or, to make it close on second click on the same item's play button:
      // setActivePlayerSrc(null);
      // setActivePlayerTitle("");
      // return;
    }
    setActivePlayerSrc(toAbsoluteUrl(recording.path));
    setActivePlayerTitle(recording.filename);
  };

  const closePlayer = () => {
    setActivePlayerSrc(null);
    setActivePlayerTitle("");
  };

  // Download recording
  const downloadRecording = (downloadUrl, filename) => {
    const link = document.createElement("a");
    link.href = toAbsoluteUrl(downloadUrl);
    link.download = filename;
    link.click();
  };

  // Open recording details dialog
  const openDetails = (recording) => {
    setSelectedRecordingForModal(recording);
    setDetailsOpen(true);
  };

  // Open rating dialog
  const openRating = (recording) => {
    setSelectedRecordingForModal(recording);
    setRatingValue(recording.rating || 0);
    setRatingNotes(recording.notes || "");
    setRatingOpen(true);
  };

  // Submit rating using Redux
  const submitRating = async () => {
    if (!selectedRecordingForModal) return;

    dispatch(
      rateRecording({
        date: selectedDate,
        filename: selectedRecordingForModal.filename,
        rating: ratingValue,
        notes: ratingNotes,
      })
    ).then((action) => {
      if (!action.error) {
        toast.success("Rating saved successfully");
        setRatingOpen(false);
      }
    });
  };

  // Format file size (from bytes to KB/MB)
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format duration (seconds to MM:SS)
  const formatTableDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds === 0) {
      return "N/A";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle refresh
  const handleRefresh = () => {
    if (selectedDate) {
      dispatch(fetchRecordings(selectedDate));
    } else {
      toast.info("Please select a date first.");
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Inbound Call Recordings
      </Typography>

      {activePlayerSrc && (
        <EnhancedAudioPlayer
          key={activePlayerSrc}
          src={activePlayerSrc}
          title={activePlayerTitle}
          onClose={closePlayer}
        />
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate ? new Date(selectedDate) : null}
                onChange={handleDateChange}
                format="yyyy-MM-dd"
                slotProps={{ textField: { fullWidth: true } }}
                minDate={
                  dates.length > 0
                    ? new Date(
                        Math.min(...dates.map((d) => new Date(d).getTime()))
                      )
                    : undefined
                }
                maxDate={
                  dates.length > 0
                    ? new Date(
                        Math.max(...dates.map((d) => new Date(d).getTime()))
                      )
                    : undefined
                }
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<CalendarToday />}
                  onClick={handleRefresh}
                >
                  Refresh
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Recordings Table */}
      {recordings.length > 0 ? (
        <Paper>
          <TableContainer>
            <Table>
              {/* Make bold */}
              <TableHead sx={{ backgroundColor: "primary.main" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Time
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Duration
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Size
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Caller/Queue
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Rating
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recordings
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((recording) => (
                    <TableRow key={recording.filename} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {recording.type === "queue" ? (
                            <Chip
                              size="small"
                              color="primary"
                              label="Inbound Queue"
                              sx={{ mr: 1 }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="secondary"
                              label="Inbound Call"
                              sx={{ mr: 1 }}
                            />
                          )}
                          {recording.callDetails?.disposition && (
                            <Tooltip
                              title={`Call ${recording.callDetails.disposition}`}
                            >
                              <Chip
                                size="small"
                                color={
                                  recording.callDetails.disposition ===
                                  "ANSWERED"
                                    ? "success"
                                    : "error"
                                }
                                label={recording.callDetails.disposition}
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {recording.callDetails?.calldate
                          ? new Date(
                              recording.callDetails.calldate
                            ).toLocaleTimeString()
                          : new Date(recording.created).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {formatTableDuration(recording.duration)}
                      </TableCell>
                      <TableCell>{formatFileSize(recording.size)}</TableCell>
                      <TableCell>
                        {recording.type === "queue"
                          ? recording.identifier
                          : recording.callDetails?.src || "-"}
                      </TableCell>
                      <TableCell>
                        <Rating
                          value={recording.rating || 0}
                          readOnly
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handlePlayRecording(recording)}
                            color={
                              activePlayerSrc === recording.path
                                ? "primary"
                                : "default"
                            }
                          >
                            <PlayArrow />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() =>
                              downloadRecording(
                                recording.downloadUrl,
                                recording.filename
                              )
                            }
                          >
                            <CloudDownload sx={{ color: "primary.main" }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openRating(recording)}
                          >
                            <Star />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openDetails(recording)}
                          >
                            <Info sx={{ color: "secondary.main" }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={recordings.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>
      ) : (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          {loading ? (
            <CircularProgress />
          ) : (
            <Typography variant="body1">
              No recordings found for this date. Please select a different date
              or check if recordings exist.
            </Typography>
          )}
        </Paper>
      )}

      {/* Recording Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
      >
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
          Inbound Call Recording Details
        </DialogTitle>
        <DialogContent>
          {selectedRecordingForModal && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <audio
                  controls
                  style={{ width: "100%", borderRadius: 8 }}
                  src={selectedRecordingForModal.path}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recording Type
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedRecordingForModal.type === "queue"
                    ? "Inbound Queue Call"
                    : "Inbound Call"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatTableDuration(selectedRecordingForModal.duration)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Size
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatFileSize(selectedRecordingForModal.size)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recorded At
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(selectedRecordingForModal.created).toLocaleString()}
                </Typography>
              </Grid>
              {selectedRecordingForModal.callDetails && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                    <Typography
                      variant="h6"
                      sx={{ mt: 2, mb: 1, color: "primary.main" }}
                    >
                      Call Details
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Caller Number
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRecordingForModal.callDetails.src || "Unknown"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Called Number
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRecordingForModal.callDetails.dst || "Unknown"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Call Status
                    </Typography>
                    <Chip
                      label={
                        selectedRecordingForModal.callDetails.disposition ||
                        "Unknown"
                      }
                      color={
                        selectedRecordingForModal.callDetails.disposition ===
                        "ANSWERED"
                          ? "success"
                          : "error"
                      }
                      sx={{ fontWeight: "medium" }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Call Time
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRecordingForModal.callDetails.calldate
                        ? new Date(
                            selectedRecordingForModal.callDetails.calldate
                          ).toLocaleString()
                        : "Unknown"}
                    </Typography>
                  </Grid>
                </>
              )}
              {selectedRecordingForModal.rating > 0 && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                    <Typography
                      variant="h6"
                      sx={{ mt: 2, mb: 1, color: "primary.main" }}
                    >
                      Quality Rating
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mr: 2 }}
                      >
                        Rating:
                      </Typography>
                      <Rating
                        value={selectedRecordingForModal.rating}
                        readOnly
                        size="large"
                      />
                      <Typography variant="body1" sx={{ ml: 1 }}>
                        ({selectedRecordingForModal.rating}/5)
                      </Typography>
                    </Box>
                  </Grid>
                  {selectedRecordingForModal.notes && (
                    <Grid item md={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Notes
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, backgroundColor: "background.default" }}
                      >
                        <Typography variant="body1">
                          {selectedRecordingForModal.notes}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsOpen(false)} variant="outlined">
            Close
          </Button>
          {selectedRecordingForModal && (
            <Button
              variant="contained"
              onClick={() =>
                downloadRecording(
                  selectedRecordingForModal.downloadUrl,
                  selectedRecordingForModal.filename
                )
              }
              startIcon={<CloudDownload />}
            >
              Download Recording
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onClose={() => setRatingOpen(false)}>
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
          Rate Call Recording
        </DialogTitle>
        <DialogContent>
          {selectedRecordingForModal && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <Typography variant="body1" fontWeight="medium">
                Recording:{" "}
                {selectedRecordingForModal.type === "queue"
                  ? "Inbound Queue Call"
                  : "Inbound Call"}
                {selectedRecordingForModal.callDetails?.src &&
                  ` from ${selectedRecordingForModal.callDetails.src}`}
              </Typography>

              <Typography variant="body2" sx={{ mb: 1 }}>
                How would you rate the quality of this call recording?
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 1,
                }}
              >
                <Rating
                  name="recording-rating"
                  value={ratingValue}
                  onChange={(event, newValue) => {
                    setRatingValue(newValue);
                  }}
                  size="large"
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {ratingValue === 5
                    ? "Excellent"
                    : ratingValue === 4
                    ? "Good"
                    : ratingValue === 3
                    ? "Average"
                    : ratingValue === 2
                    ? "Poor"
                    : ratingValue === 1
                    ? "Very Poor"
                    : "Not Rated"}
                </Typography>
              </Box>

              <TextField
                label="Notes"
                multiline
                rows={4}
                value={ratingNotes}
                onChange={(e) => setRatingNotes(e.target.value)}
                fullWidth
                placeholder="Add notes about call quality, customer service, or any issues..."
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRatingOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={submitRating}
            variant="contained"
            color="primary"
            disabled={!ratingValue}
          >
            Save Rating
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recordings;
