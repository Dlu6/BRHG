import { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Tab,
  Tabs,
  useTheme,
  alpha,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import AddIcon from "@mui/icons-material/Add";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import EditNetworkDialog from "./EditNetworkDialog";
import {
  deleteNetworkConfig,
  fetchNetworkConfigs,
} from "../features/network/networkSlice";
import ConfirmDialog from "./ConfirmDialog";

const Networks = () => {
  const theme = useTheme();
  const { networkConfigs, loading } = useSelector((state) => state.network);
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNetworkData, setSelectedNetworkData] = useState(null);
  const [dialogMode, setDialogMode] = useState("edit");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [networkToDelete, setNetworkToDelete] = useState(null);

  const networkTypes = ["externip", "localnet", "stun", "turn"];

  useEffect(() => {
    dispatch(fetchNetworkConfigs());
  }, [dispatch]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleEdit = (network) => {
    setSelectedNetworkData(network);
    setDialogMode("edit");
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedNetworkData({
      type: networkTypes[currentTab],
      address: "",
      username: "",
      password: "",
      active: true,
    });
    setDialogMode("add");
    setEditDialogOpen(true);
  };

  const handleDelete = (id) => {
    const network = networkConfigs.find(
      (n) => n.id === id && n.type === networkTypes[currentTab]
    );
    setNetworkToDelete(network);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await dispatch(
        deleteNetworkConfig({
          id: networkToDelete.id,
          networkType: networkToDelete.type,
        })
      ).unwrap();
      enqueueSnackbar("Network configuration deleted successfully", {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar("Failed to delete network configuration", {
        variant: "error",
      });
    } finally {
      setDeleteDialogOpen(false);
      setNetworkToDelete(null);
    }
  };

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 90,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "address",
      headerName: "Address",
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => {
        // Handle both address and network fields
        return (
          params.row.address || params.row.network || params.row.server || ""
        );
      },
    },
    {
      field: "active",
      headerName: "Status",
      width: 130,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: params.value
              ? alpha(theme.palette.success.main, 0.1)
              : alpha(theme.palette.error.main, 0.1),
            color: params.value
              ? theme.palette.success.main
              : theme.palette.error.main,
            padding: "4px 12px",
            borderRadius: "12px",
            fontWeight: "medium",
          }}
        >
          {params.value ? "Active" : "Inactive"}
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Edit">
            <IconButton
              onClick={() => handleEdit(params.row)}
              size="small"
              sx={{
                color: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              onClick={() => handleDelete(params.row.id)}
              size="small"
              sx={{
                color: theme.palette.error.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredNetworks = networkConfigs
    .filter((network) => network.type === networkTypes[currentTab])
    .map((network) => ({
      ...network,
      // Ensure each row has a unique ID
      id: network.id || `temp-${Math.random()}`,
      // Ensure all required fields are present
      address: network.address || network.network || network.server || "",
      active: network.active !== undefined ? network.active : true,
    }));

  // Debug logging
  // useEffect(() => {
  //   console.log("Network configs:", networkConfigs);
  //   console.log("Current tab:", currentTab);
  //   console.log("Filtered networks:", filteredNetworks);
  // }, [networkConfigs, currentTab, filteredNetworks]);

  // Add error boundary for DataGrid
  const [dataGridError, setDataGridError] = useState(null);

  const handleDataGridError = (error) => {
    console.error("DataGrid error:", error);
    setDataGridError(error);
  };

  // Clear error when data changes
  useEffect(() => {
    setDataGridError(null);
  }, [networkConfigs, currentTab]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: theme.palette.background.paper,
      }}
    >
      <Grid container spacing={3}>
        <Grid
          item
          xs={12}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: theme.palette.text.primary,
            }}
          >
            <SettingsEthernetIcon color="primary" sx={{ fontSize: 28 }} />
            <Box component="span" sx={{ fontWeight: 600 }}>
              Network Configuration:
            </Box>
            <Box
              component="span"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 400,
              }}
            >
              {/* Capitalize the first letter of the network type  */}
              {networkTypes[currentTab].charAt(0).toUpperCase() +
                networkTypes[currentTab].slice(1)}
            </Box>
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
            }}
          >
            Add Network
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                minWidth: 120,
                fontWeight: 500,
              },
              borderBottom: 1,
              borderColor: "divider",
              mb: 2,
            }}
          >
            <Tab label="External IPs" />
            <Tab label="Local Networks" />
            <Tab label="STUN Servers" />
            <Tab label="TURN Servers" />
          </Tabs>
        </Grid>
        <Grid item xs={12}>
          {dataGridError ? (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                color: "error.main",
                border: "1px solid",
                borderColor: "error.main",
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" color="error">
                Error loading network data
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please refresh the page or try again later.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setDataGridError(null)}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Box>
          ) : filteredNetworks.length === 0 ? (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                color: "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="h6">
                No {networkTypes[currentTab]} configurations found
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Click "Add Network" to create your first configuration.
              </Typography>
            </Box>
          ) : (
            <DataGrid
              key={`network-grid-${currentTab}`}
              rows={filteredNetworks}
              columns={columns}
              pageSize={5}
              autoHeight
              loading={loading}
              onError={handleDataGridError}
              getRowId={(row) => row.id || `temp-${Math.random()}`}
              disableRowSelectionOnClick
              sx={{
                border: "none",
                "& .MuiDataGrid-cell": {
                  borderColor: alpha(theme.palette.divider, 0.1),
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                  borderRadius: 2,
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                },
              }}
            />
          )}
        </Grid>
      </Grid>

      <EditNetworkDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        networkData={selectedNetworkData}
        networkType={networkTypes[currentTab]}
        mode={dialogMode}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Network Configuration"
        content={`Are you sure you want to delete this ${
          networkToDelete?.type || ""
        } network configuration?`}
      />
    </Paper>
  );
};

export default Networks;
