import { useEffect, useState } from "react";
import { Grid, Paper, Typography, Button, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import { useSelector, useDispatch } from "react-redux";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useSnackbar } from "notistack";
import SettingsSuggestSharpIcon from "@mui/icons-material/SettingsSuggestSharp";
import { useNavigate } from "react-router-dom";

import VoiceQueueDialog from "./VoiceQueueDialog.js";
import ConfirmDeletionDialog from "../utils/ConfirmDeletionDialog";
import {
  deleteVoiceQueue,
  fetchVoiceQueues,
} from "../features/voiceQueues/voiceQueueSlice.js";
import LoadingIndicator from "./common/LoadingIndicator.js";

const VoiceQueues = () => {
  const { voiceQueues, loading, error } = useSelector(
    (state) => state.voiceQueue
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQueueData, setSelectedQueueData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchVoiceQueues());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
    }
  }, [error, enqueueSnackbar]);

  const handleQueueDelete = (id) => {
    setDeleteDialogOpen(true);
    setSelectedQueueData(voiceQueues.find((queue) => queue.id === id));
  };

  const handleConfirmDelete = async () => {
    if (selectedQueueData) {
      setIsDeleting(true);
      try {
        const result = await dispatch(
          deleteVoiceQueue(selectedQueueData.id)
        ).unwrap();
        enqueueSnackbar(result.message, { variant: "success" });
      } catch (error) {
        enqueueSnackbar(error.message || "Failed to delete voice queue", {
          variant: "error",
        });
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
      }
    }
  };

  const handleVoiceQueueAdvancedSettings = (voiceQueueId, event) => {
    event.stopPropagation();
    const voiceQueueData = voiceQueues.find(
      (queue) => queue.id === Number(voiceQueueId)
    );
    if (voiceQueueData) {
      const modifiedQueueData = {
        ...voiceQueueData,
      };

      navigate(`/voice/VoiceQueues/${voiceQueueId}`, {
        state: { ...modifiedQueueData },
      });
    }
  };

  const renderActionCell = (params) => (
    <div key={params.row.id}>
      <Tooltip title="Edit Voice Queue">
        <IconButton
          aria-label="EditX"
          onClick={(e) => handleEditQueue(params.row.id, e)}
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Advanced settings">
        <IconButton
          aria-label="Settings"
          onClick={(e) => handleVoiceQueueAdvancedSettings(params.row.id, e)}
        >
          <SettingsSuggestSharpIcon color="primary" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Voice Queue">
        <IconButton
          aria-label="Delete"
          onClick={() => handleQueueDelete(params.row.id)}
        >
          <DeleteIcon color="error" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const columns = [
    { field: "id", headerName: "ID.", width: 90 },
    { field: "name", headerName: "Name", width: 180 },
    { field: "strategy", headerName: "Strategy", width: 160 },
    { field: "description", headerName: "Description", width: 280 },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: renderActionCell,
    },
  ];

  const handleEditQueue = (id, event) => {
    event.stopPropagation();
    const queueData = voiceQueues.find((queue) => queue.id === id);
    setSelectedQueueData(queueData);
    setEditDialogOpen(true);
  };

  const handleAddQueueClick = () => {
    setAddDialogOpen(true);
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Grid container spacing={3} alignItems="center" mb={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">Voice Queues</Typography>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ textAlign: { sm: "right" } }}>
          <Button variant="contained" onClick={handleAddQueueClick}>
            {" "}
            + Add Queue
          </Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography>Loading voice queue...</Typography>
          <LoadingIndicator />
        </Box>
      ) : (
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={voiceQueues}
            columns={columns}
            autoHeight
            getRowId={(row) => row.id}
            loading={loading}
            sx={{
              "& .MuiDataGrid-cell:focus": {
                outline: "solid 2px transparent",
              },
              "& .MuiDataGrid-cell:focus-within": {
                outline: "solid 2px transparent",
              },
            }}
          />
        </div>
      )}

      {addDialogOpen && (
        <VoiceQueueDialog
          open={addDialogOpen}
          handleClose={() => setAddDialogOpen(false)}
          mode="add"
        />
      )}
      {editDialogOpen && (
        <VoiceQueueDialog
          open={editDialogOpen}
          handleClose={() => setEditDialogOpen(false)}
          queueData={selectedQueueData}
          errorFromState={error}
          mode="edit"
        />
      )}

      <ConfirmDeletionDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={
          isDeleting
            ? "Deleting Voice Queue..."
            : "Confirm Voice Queue Deletion"
        }
        message={`Are you sure you want to delete this Voice Queue "${selectedQueueData?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </Paper>
  );
};

export default VoiceQueues;
