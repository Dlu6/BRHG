import { useEffect, useState } from "react";
import { Grid, Paper, Typography, Button, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsSuggestSharpIcon from "@mui/icons-material/SettingsSuggestSharp";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import InboundRouteDialog from "../InboundRouteDialog";
import ConfirmDeletionDialog from "../../utils/ConfirmDeletionDialog";
import {
  deleteInboundRoute,
  fetchAllInboundRoutes,
} from "../../features/inboundRoutes/inboundRouteSlice";

const InboundRoute = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedInboundRouteData, setSelectedInboundRouteData] =
    useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inboundRouteToDeleteId, setInboundRouteToDeleteId] = useState({
    id: null,
    phone_number: "",
  });

  const inboundRoutes = useSelector(
    (state) => state.inboundRoute.inboundRoutes
  );
  const loading = useSelector((state) => state.inboundRoute.loading);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchInboundRoutesData = async () => {
      try {
        await dispatch(fetchAllInboundRoutes()).unwrap();
      } catch (error) {
        console.error("Error fetching inboundRoutes:", error);
        enqueueSnackbar(error.message || "Failed to fetch inbound routes", {
          variant: "error",
        });
      }
    };

    fetchInboundRoutesData();
  }, [dispatch, enqueueSnackbar]);

  const handleRowClick = (params, event) => {
    if (!event.target.closest(".MuiIconButton-root")) {
      const sanitizedData = {
        ...params.row,
        phone_number: String(params.row.phone_number || ""),
      };
      setSelectedInboundRouteData(sanitizedData);
      setEditDialogOpen(true);
    }
  };

  const renderActionCell = (params) => (
    <div>
      <Tooltip title="Edit Inbound Route">
        <IconButton
          onClick={(event) => handleEditInboundRoute(params.row, event)}
        >
          <EditIcon color="action" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Advanced settings">
        <IconButton
          onClick={(event) =>
            handleInboundRouteAdvancedSettings(params.row.id, event)
          }
        >
          <SettingsSuggestSharpIcon color="primary" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Inbound Route">
        <IconButton
          onClick={(event) =>
            handleDelete(event, params.row.id, params.row.phone_number)
          }
        >
          <DeleteIcon color="error" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const handleEditInboundRoute = (routeData, event) => {
    event?.stopPropagation();
    const sanitizedData = {
      ...routeData,
      phone_number: String(routeData.phone_number || ""),
    };
    setSelectedInboundRouteData(sanitizedData);
    setEditDialogOpen(true);
  };

  const handleInboundRouteAdvancedSettings = (inboundRouteId, event) => {
    event.stopPropagation();
    const inboundRouteData = inboundRoutes.find(
      (route) => route.id === inboundRouteId
    );
    if (inboundRouteData) {
      const sanitizedData = {
        ...inboundRouteData,
        phone_number: String(inboundRouteData.phone_number || ""),
      };
      navigate(`/voice/inboundRoutes/${inboundRouteId}`, {
        state: { ...sanitizedData },
      });
    }
  };

  const handleDelete = (event, id, phone_number) => {
    event.stopPropagation();
    setInboundRouteToDeleteId({
      id,
      phone_number: String(phone_number || ""),
    });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteDialogOpen(false);
    setIsDeleting(true);

    try {
      await dispatch(deleteInboundRoute(inboundRouteToDeleteId.id)).unwrap();
      enqueueSnackbar("Inbound route deleted successfully", {
        variant: "success",
      });
    } catch (error) {
      console.error("Deletion error:", error);
      enqueueSnackbar(error.message || "Failed to delete inbound route", {
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 70,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "phone_number",
      headerName: "Phone Number",
      width: 150,
      headerAlign: "left",
      align: "left",
      valueFormatter: (params) => String(params.value || ""),
    },
    {
      field: "destination_type",
      headerName: "Destination Type",
      width: 130,
      headerAlign: "left",
      align: "left",
      valueFormatter: (params) =>
        params.value
          ? params.value.charAt(0).toUpperCase() + params.value.slice(1)
          : "",
    },
    {
      field: "alias",
      headerName: "Alias",
      width: 150,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "description",
      headerName: "Description",
      width: 200,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "enabled",
      headerName: "Status",
      width: 100,
      headerAlign: "center",
      align: "center",
      valueFormatter: (params) => (params.value ? "Enabled" : "Disabled"),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: renderActionCell,
    },
  ];

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Grid container spacing={3} alignItems="center" mb={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">Inbound Routes</Typography>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ textAlign: { sm: "right" } }}>
          <Button variant="contained" onClick={() => setAddDialogOpen(true)}>
            + Add Inbound Route
          </Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography>Loading inbound route configurations...</Typography>
        </Box>
      ) : (
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={inboundRoutes}
            columns={columns}
            autoHeight
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            sx={{
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-row:hover": {
                cursor: "pointer",
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          />
        </div>
      )}

      <InboundRouteDialog
        open={addDialogOpen}
        handleClose={() => setAddDialogOpen(false)}
        mode="add"
      />

      {selectedInboundRouteData && (
        <InboundRouteDialog
          open={editDialogOpen}
          handleClose={() => {
            setEditDialogOpen(false);
            setSelectedInboundRouteData(null);
          }}
          inboundRouteDataProps={selectedInboundRouteData}
          mode="edit"
        />
      )}

      <ConfirmDeletionDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isDeleting ? "Deleting Inbound Route..." : "Confirm Deletion!"}
        message={
          <>
            Are you sure you want to delete Inbound Route
            <span style={{ color: "#153" }}>
              {" "}
              {inboundRouteToDeleteId.phone_number}
            </span>
            ? This action cannot be undone!
          </>
        }
        isDeleting={isDeleting}
      />
    </Paper>
  );
};

export default InboundRoute;
