import { useEffect, useState } from "react";
import { Grid, Paper, Typography, Button, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import ConfirmDeletionDialog from "../../utils/ConfirmDeletionDialog";
import {
  deleteOutboundRoute,
  fetchAllOutboundRoutes,
} from "../../features/outboundRoutes/outboundRouteSlice";
import OutboundRouteDialog from "./OutboundRouteDialog";
import SettingsSuggestSharpIcon from "@mui/icons-material/SettingsSuggestSharp";

const OutboundRoute = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOutboundRouteData, setSelectedOutboundRouteData] =
    useState(null);

  const { outboundRoutes, loading } = useSelector(
    (state) => state.outboundRoute
  );

  // console.log("outboundRoutes>>>>>>>>>", outboundRoutes);

  useEffect(() => {
    dispatch(fetchAllOutboundRoutes());
  }, [dispatch]);

  const handleEdit = (id) => {
    const routeData = outboundRoutes.find((route) => route.id === id);
    navigate(`/voice/outboundRoutes/${id}/edit`, {
      state: {
        formData: {
          context: routeData.context,
          phoneNumber: routeData.phoneNumber,
          recording: routeData.recording || "none",
          // cutDigits: routeData.cutDigits || "",
          alias: routeData.alias || "",
          description: routeData.description || "",
        },
        applications: routeData.applications || [],
        voiceExtensions: routeData.voiceExtensions || [],
      },
    });
  };

  const handleDelete = (route) => {
    setRouteToDelete(route);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete || !routeToDelete.id) {
      enqueueSnackbar("Invalid outbound route selected for deletion", {
        variant: "error",
      });
      setDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      await dispatch(deleteOutboundRoute(routeToDelete.id)).unwrap();

      // Refresh the list to ensure we have the latest data
      dispatch(fetchAllOutboundRoutes());

      enqueueSnackbar("Outbound route deleted successfully", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(error || "Failed to delete outbound route", {
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRouteToDelete(null);
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 10 },
    { field: "phoneNumber", headerName: "Phone Number", width: 150 },
    { field: "description", headerName: "Description", width: 200 },
    { field: "context", headerName: "Context", width: 180 },
    { field: "recording", headerName: "Recording", width: 150 },
    { field: "alias", headerName: "Alias", width: 130 },
    // {
    //   field: "voiceExtensions",
    //   headerName: "Voice Extensions",
    //   width: 200,
    //   renderCell: (params) => (
    //     <ul>
    //       {params.row.voiceExtensions?.map((ve) => (
    //         <li key={ve.id}>
    //           {ve.exten} (Priority: {ve.priority})
    //         </li>
    //       ))}
    //     </ul>
    //   ),
    // },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit Outbound Route">
            <IconButton onClick={() => handleEdit(params.row.id)}>
              <EditIcon color="action" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Advanced Settings">
            <IconButton
              onClick={() =>
                navigate(`/voice/outboundRoutes/${params.row.id}/edit`)
              }
            >
              <SettingsSuggestSharpIcon color="primary" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Outbound Route">
            <IconButton onClick={() => handleDelete(params.row)}>
              <DeleteIcon color="error" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Outbound Routes</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setAddDialogOpen(true)}
            >
              Create New Route
            </Button>
          </Box>
          <DataGrid
            rows={outboundRoutes || []}
            columns={columns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            key={outboundRoutes?.length || "empty-grid"}
            disableRowSelectionOnClick
            autoHeight
            loading={loading}
            getRowId={(row) => row.id}
          />
        </Paper>
      </Grid>
      <ConfirmDeletionDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Outbound Route"
        content={`Are you sure you want to delete the outbound route "${routeToDelete?.phoneNumber}"?`}
        isDeleting={isDeleting}
      />
      <OutboundRouteDialog
        open={addDialogOpen}
        handleClose={() => setAddDialogOpen(false)}
        mode="add"
      />
      {selectedOutboundRouteData && (
        <OutboundRouteDialog
          open={editDialogOpen}
          handleClose={() => {
            setEditDialogOpen(false);
            setSelectedOutboundRouteData(null);
          }}
          outboundRouteDataProps={selectedOutboundRouteData}
          mode="edit"
        />
      )}
    </Grid>
  );
};

export default OutboundRoute;
