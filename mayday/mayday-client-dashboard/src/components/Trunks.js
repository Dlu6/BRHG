import { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsSuggestSharpIcon from "@mui/icons-material/SettingsSuggestSharp";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
// import AlertDialog from '@mui/material/AlertDialog';
import TrunkDialog from "./TrunkDialog.js";
import {
  deleteTrunkAsync,
  fetchTrunks,
  // fetchTrunkById,
} from "../features/trunks/trunkSlice.js";
import ConfirmDeletionDialog from "../utils/ConfirmDeletionDialog.js";
import { getSocket } from "../services/websocketService";

const Trunks = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTrunkData, setSelectedTrunkData] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trunkToDeleteId, setTrunkToDeleteId] = useState(null);
  const [trunkToDeleteName, setTrunkToDeleteName] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState(null);
  const [trunkStatuses, setTrunkStatuses] = useState({});
  // console.log("trunkStatuses>>>>", trunkStatuses);

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loading = useSelector((state) => state.trunk.loading);
  const trunks = useSelector((state) => state.trunk.trunks);
  //   const error = useSelector((state) => state.trunk.error);

  const fetchTrunksData = async () => {
    try {
      setError(null);
      await dispatch(fetchTrunks()).unwrap();
    } catch (error) {
      console.error("Error fetching trunks:", error);
      setError(error.message || "Failed to fetch trunks");
      enqueueSnackbar("Failed to fetch trunks.", { variant: "error" });
    }
  };

  useEffect(() => {
    fetchTrunksData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    const socket = getSocket();
    // console.log("[Trunks] Setting up socket listeners");

    socket.on("trunk:status_update", (status) => {
      // console.log("[Trunks] Received trunk status update:", status);
      if (status && status.endpoint) {
        // console.log("status>>", status);
        setTrunkStatuses((prevStatuses) => ({
          ...prevStatuses,
          [status.endpoint]: {
            ...status,
            lastUpdate: status.timestamp,
          },
        }));
      }
    });

    // Initial status check for all trunks
    const fetchTrunkStatus = async () => {
      try {
        const trunkPromises = trunks.map((trunk) =>
          socket.emit("trunk:status", trunk.name)
        );
        await Promise.all(trunkPromises);
      } catch (error) {
        console.error("Error fetching trunk status:", error);
      }
    };

    fetchTrunkStatus();

    return () => {
      socket.off("trunk:status_update");
    };
  }, [trunks]);

  const handleRefresh = () => {
    fetchTrunksData();
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  const renderActionCell = (params) => (
    <div key={params.row.id}>
      <Tooltip title="Edit Trunk">
        <IconButton
          aria-label="Edit"
          onClick={(event) => handleEditTrunk(params.row.id, event)}
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Advanced settings">
        <IconButton
          aria-label="Settings"
          color="primary"
          onClick={(event) => handleTrunkAdvancedSettings(params.row.id, event)}
        >
          <SettingsSuggestSharpIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Trunk">
        <IconButton
          aria-label="Delete"
          onClick={() => handleDeleteTrunk(params.row.id)}
        >
          <DeleteIcon color="error" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const handleEditTrunk = async (id, event) => {
    event.stopPropagation();
    try {
      const trunkData = trunks.find((trunk) => trunk.name === id);
      if (!trunkData) {
        enqueueSnackbar("Trunk not found", { variant: "error" });
        return;
      }

      // console.log("Trunk Data:", trunkData); // Log the trunk data structure

      // Prepare the data for TrunkDialog
      const enhancedTrunkData = {
        name: trunkData.name,
        host: trunkData.endpoint?.from_domain || trunkData.aor?.contact || "",
        defaultUser: trunkData.auth?.username || "",
        password: trunkData.auth?.password || "",
        context: trunkData.endpoint?.context || "from-voip-provider",
        transport: trunkData.endpoint?.transport || "transport-udp",
        codecs: trunkData.endpoint?.allow || "ulaw,alaw",
        active: trunkData.endpoint?.active ? 1 : 0,
        enabled: Boolean(trunkData.endpoint?.enabled),
        fromUser:
          trunkData.endpoint?.from_user || trunkData.auth?.username || "",
        fromDomain:
          trunkData.endpoint?.from_domain || trunkData.aor?.contact || "",
      };

      setSelectedTrunkData(enhancedTrunkData);
      setEditDialogOpen(true);
    } catch (error) {
      console.error("Error fetching trunk details:", error);
      enqueueSnackbar("Failed to fetch trunk details", { variant: "error" });
    }
  };

  const handleTrunkAdvancedSettings = (trunkId, event) => {
    if (!event) return;
    event.stopPropagation();

    const trunkData = trunks.find((trunk) => trunk.name === trunkId);
    if (trunkData) {
      // Use the trunk_id from the endpoint for routing
      const trunk_id = trunkData.endpoint?.trunk_id;
      if (!trunk_id) {
        enqueueSnackbar("Trunk ID not found", { variant: "error" });
        return;
      }

      const modifiedTrunkData = {
        ...trunkData,
        // Basic settings
        enabled: Boolean(trunkData.endpoint?.enabled),
        active: trunkData.endpoint?.active || 0,
        defaultUser: trunkData.endpoint?.from_user || "",
        host: trunkData.endpoint?.from_domain || "",
        password: trunkData.auth?.password || "",
        register_string: trunkData.endpoint?.registry || "",

        // Convert string fields to arrays
        transport: trunkData.endpoint?.transport
          ?.split(",")
          .filter(Boolean) || ["transport-udp"],
        nat: trunkData.endpoint?.nat?.split(",").filter(Boolean) || [],
        codecs: trunkData.endpoint?.allow?.split(",").filter(Boolean) || [
          "ulaw",
          "alaw",
        ],
        insecure:
          trunkData.endpoint?.insecure?.split(",").filter(Boolean) || [],

        // Default values for advanced settings
        directMedia: trunkData.endpoint?.direct_media || "no",
        callCounter: trunkData.endpoint?.call_counter || "yes",
        fromDomain: trunkData.endpoint?.from_domain || "",
        fromUser: trunkData.endpoint?.from_user || "",
        outboundProxy: trunkData.endpoint?.outbound_proxy || "",
        phoneUrl: trunkData.endpoint?.phone_url || "no",
        trustRemotePartyId: trunkData.endpoint?.trust_remote_party_id || "no",
        sendRemotePartyIdHeader:
          trunkData.endpoint?.send_remote_party_id_header || "no",
        encryption: trunkData.endpoint?.encryption || "no",
        port: trunkData.endpoint?.port || "",
        t38ptUdptl: trunkData.endpoint?.t38pt_udptl || "no",
        videoSupport: trunkData.endpoint?.video_support || "no",
      };

      navigate(`/tools/trunks/${trunk_id}`, { state: modifiedTrunkData });
    }
  };

  const handleDeleteTrunk = (id) => {
    console.log(id, "Trunk ID>>>>>>>>>");
    // Find the trunk data to get the correct name
    const trunkData = trunks.find((trunk) => trunk.id === id);
    if (trunkData) {
      // Use the trunk name (which is the actual endpoint ID) for deletion
      setTrunkToDeleteId(trunkData.name);
      setTrunkToDeleteName(trunkData.name); // Store the trunk name for display
      setDeleteDialogOpen(true);
    } else {
      console.error("Trunk data not found for id:", id);
      enqueueSnackbar("Trunk data not found for id:", id, { variant: "error" });
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteDialogOpen(false);
    setIsDeleting(true);

    try {
      console.log(`Deleting trunk with ID: ${trunkToDeleteId}`);
      const result = await dispatch(deleteTrunkAsync(trunkToDeleteId)).unwrap();
      enqueueSnackbar(result.message, {
        variant: "success",
      });
      // Refresh the list after deletion
      fetchTrunksData();
    } catch (err) {
      console.error("Trunk deletion error:", err);
      enqueueSnackbar(err.message || "Failed to delete trunk.", {
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
      setTrunkToDeleteId(null);
      setTrunkToDeleteName(null);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTrunkToDeleteId(null);
    setTrunkToDeleteName(null);
  };

  const columns = [
    { field: "name", headerName: "Name", flex: 1 },
    {
      field: "active",
      headerName: "Active",
      width: 100,
      renderCell: (params) => {
        return params.row.endpoint?.active === 1 ? (
          <CheckIcon color="success" />
        ) : (
          <CloseIcon color="error" />
        );
      },
    },
    {
      field: "registry",
      headerName: "Registry",
      flex: 1.5,
      valueGetter: (params) => params.row.aor?.contact || "Not Configured",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        const status = trunkStatuses[params.row.name];
        return (
          <Chip
            label={status?.details?.status || "Unknown"}
            color={status?.registered ? "success" : "error"}
            size="small"
            title={`Last updated: ${
              status?.details?.lastUpdate
                ? new Date(status.details.lastUpdate).toLocaleString()
                : "Never"
            }`}
          />
        );
      },
    },
    {
      field: "lastStatusUpdate",
      headerName: "Last Update",
      width: 180,
      valueGetter: (params) => {
        const status = trunkStatuses[params.row.name];
        return status?.timestamp ? new Date(status.timestamp).getTime() : null;
      },
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleString() : "Never",
    },

    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: renderActionCell,
      sortable: false,
    },
  ];

  const handleAddTrunkClick = () => {
    setAddDialogOpen(true);
  };

  // useEffect(() => {
  //   const fetchTrunkStatus = async () => {
  //     try {
  //       console.log("fetching trunk status");
  //     } catch (error) {
  //       console.error("Error fetching trunk status:", error);
  //     }
  //   };

  //   fetchTrunkStatus();
  // }, []);

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Grid container spacing={3} alignItems="center" mb={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">Trunks</Typography>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ textAlign: { sm: "right" } }}>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={handleAddTrunkClick}
            disabled={loading}
          >
            + Add Trunk
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <CircularProgress size={24} />
          <Typography sx={{ mt: 1 }}>
            Loading trunk configurations...
          </Typography>
        </Box>
      ) : (
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={trunks.map((trunk) => ({
              ...trunk,
              id: trunk.id || trunk.name || trunk.trunkId,
            }))}
            columns={columns}
            autoHeight
            getRowId={(row) => row.id}
            pagination
            page={page}
            pageSize={pageSize}
            rowsPerPageOptions={[5, 10, 25]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
            error={error}
            sx={{
              "& .MuiDataGrid-cell:focus": {
                outline: "solid 2px transparent",
              },
              "& .MuiDataGrid-cell:focus-within": {
                outline: "solid 2px transparent",
              },
              "& .MuiDataGrid-root": {
                width: "100%",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "background.paper",
              },
            }}
          />
        </div>
      )}

      {addDialogOpen && (
        <TrunkDialog
          open={addDialogOpen}
          handleClose={() => setAddDialogOpen(false)}
          mode="add"
        />
      )}
      {editDialogOpen && (
        <TrunkDialog
          open={editDialogOpen}
          handleClose={() => setEditDialogOpen(false)}
          trunkData={selectedTrunkData}
          mode="edit"
        />
      )}

      <ConfirmDeletionDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={isDeleting ? "Deleting Trunk..." : "Confirm Deletion"}
        message={`Are you sure you want to delete trunk "${trunkToDeleteName}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </Paper>
  );
};

export default Trunks;
