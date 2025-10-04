import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSoundFiles,
  uploadSoundFile,
  deleteSoundFile,
} from "../../features/audio/audioSlice";
import { useSnackbar } from "notistack";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { styled } from "@mui/material/styles";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import Slider from "@mui/material/Slider";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmDeletionDialog from "../../utils/ConfirmDeletionDialog";

const Input = styled("input")({
  display: "none",
});

const AudioPlayer = ({ file, onClose }) => {
  const [audio] = useState(new Audio(`/api/users/sound_files/play/${file.id}`));
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    audio.play().catch((error) => {
      console.error("Auto-play failed:", error);
      setIsPlaying(false);
    });

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () =>
      setCurrentTime(audio.currentTime)
    );
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("loadedmetadata", () => {});
      audio.removeEventListener("timeupdate", () => {});
      audio.removeEventListener("ended", () => {});
    };
  }, [audio]);

  const togglePlay = () => {
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
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handlePlaybackRateChange = (newRate) => {
    audio.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const skip = (seconds) => {
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      duration
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        p: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 3,
        mb: 3,
        position: "relative",
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
        }}
      >
        <CloseIcon />
      </IconButton>

      <Typography variant="subtitle1" gutterBottom>
        {file.description}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <IconButton onClick={togglePlay}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <Typography sx={{ mx: 1 }}>{formatTime(currentTime)}</Typography>

        <Slider
          size="small"
          value={currentTime}
          max={duration}
          onChange={handleTimeChange}
          sx={{ mx: 2, flexGrow: 1 }}
        />

        <Typography sx={{ mx: 1 }}>{formatTime(duration)}</Typography>
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
            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
          <Slider
            size="small"
            value={isMuted ? 0 : volume}
            max={1}
            step={0.1}
            onChange={handleVolumeChange}
            sx={{ width: 100, mx: 2 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => skip(-10)}>
            <FastRewindIcon />
          </IconButton>

          <Select
            value={playbackRate}
            onChange={(e) => handlePlaybackRateChange(e.target.value)}
            size="small"
            sx={{ mx: 1 }}
          >
            <MenuItem value={0.5}>0.5x</MenuItem>
            <MenuItem value={1}>1x</MenuItem>
            <MenuItem value={1.5}>1.5x</MenuItem>
            <MenuItem value={2}>2x</MenuItem>
          </Select>

          <IconButton onClick={() => skip(10)}>
            <FastForwardIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

const AudioManager = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { files, loading, error } = useSelector((state) => state.audio);

  const [openUpload, setOpenUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [newDescription, setNewDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchSoundFiles());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
    }
  }, [error, enqueueSnackbar]);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !description) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("description", description);

    const resultAction = await dispatch(
      uploadSoundFile({
        formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      })
    );

    if (uploadSoundFile.fulfilled.match(resultAction)) {
      setOpenUpload(false);
      setSelectedFile(null);
      setDescription("");
      setUploadProgress(0);
      dispatch(fetchSoundFiles());
      enqueueSnackbar("File uploaded successfully", { variant: "success" });
    }
  };

  const handleDelete = async (file) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const resultAction = await dispatch(deleteSoundFile(fileToDelete.id));
      if (deleteSoundFile.fulfilled.match(resultAction)) {
        enqueueSnackbar("File deleted successfully", { variant: "success" });
        if (selectedAudioFile?.id === fileToDelete.id) {
          setSelectedAudioFile(null);
        }
      }
    } catch (error) {
      enqueueSnackbar("Error deleting file", { variant: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handlePlay = (file) => {
    setSelectedAudioFile(file);
  };

  const handleEdit = (file) => {
    setEditingFile(file);
    setNewDescription(file.description);
    setEditDialogOpen(true);
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch(
        `/api/users/sound_files/download/${file.id}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      enqueueSnackbar("Error downloading file", { variant: "error" });
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/users/sound_files/${editingFile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: newDescription }),
      });

      if (!response.ok) throw new Error("Failed to update description");

      dispatch(fetchSoundFiles());
      setEditDialogOpen(false);
      enqueueSnackbar("Description updated successfully", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5">Audio Files Manager</Typography>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setOpenUpload(true)}
        >
          Upload Audio
        </Button>
      </Box>

      {selectedAudioFile && (
        <AudioPlayer
          file={selectedAudioFile}
          onClose={() => setSelectedAudioFile(null)}
        />
      )}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Filename</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Format</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Upload Date</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow
                key={file.id}
                sx={{
                  bgcolor:
                    selectedAudioFile?.id === file.id
                      ? "action.selected"
                      : "inherit",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <TableCell>{file.description}</TableCell>
                <TableCell>{file.filename}</TableCell>
                <TableCell>{file.format}</TableCell>
                <TableCell>
                  {new Date(file.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="Play file">
                    <IconButton
                      onClick={() => handlePlay(file)}
                      color={
                        selectedAudioFile?.id === file.id
                          ? "primary"
                          : "default"
                      }
                      sx={{ mr: 1 }}
                    >
                      {selectedAudioFile?.id === file.id ? (
                        <PauseIcon />
                      ) : (
                        <PlayArrowIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    onClick={() => handleEdit(file)}
                    color="default"
                    sx={{ mr: 1 }}
                  >
                    <Tooltip title="Edit Description">
                      <EditIcon color="warning" />
                    </Tooltip>
                  </IconButton>
                  <IconButton
                    onClick={() => handleDownload(file)}
                    color="primary"
                    sx={{ mr: 1 }}
                  >
                    <Tooltip title="Download file">
                      <GetAppIcon />
                    </Tooltip>
                  </IconButton>
                  <Tooltip title="Delete file">
                    <IconButton
                      onClick={() => handleDelete(file)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openUpload} onClose={() => setOpenUpload(false)}>
        <DialogTitle>Upload Audio File</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <label htmlFor="audio-file">
              <Input
                accept="audio/*"
                id="audio-file"
                type="file"
                onChange={handleFileSelect}
              />
              <Button variant="outlined" component="span" fullWidth>
                {selectedFile ? selectedFile.name : "Choose File"}
              </Button>
            </label>
            {uploadProgress > 0 && (
              <Box sx={{ width: "100%", mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  {uploadProgress}%
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !description || loading}
            variant="contained"
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Audio Description</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            fullWidth
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeletionDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setFileToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Audio File"
        message={`Are you sure you want to delete "${fileToDelete?.description}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </Box>
  );
};

export default AudioManager;
