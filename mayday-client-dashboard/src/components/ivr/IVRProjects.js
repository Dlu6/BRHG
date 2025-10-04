import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchIVRFlows,
  selectAllFlows,
  selectIVRLoading,
  createIVRFlow,
  selectCreateStatus,
  deleteIVRFlow,
  selectDeleteStatus,
  updateIVRFlow,
} from "../../features/ivr/ivrSlice";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  DialogContentText,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "notistack";
import useAuth from "../../hooks/useAuth";
import LoadingIndicator from "../common/LoadingIndicator";
import { decodeToken } from "../../utils/jwtUtils";

const IVRProjects = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const flows = useSelector(selectAllFlows);
  const loading = useSelector(selectIVRLoading);
  const { enqueueSnackbar } = useSnackbar();
  const createStatus = useSelector(selectCreateStatus);
  const isCreating = createStatus === "loading";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteStatus = useSelector(selectDeleteStatus);
  const isDeleting = deleteStatus === "loading";

  // State for menu
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedFlow, setSelectedFlow] = React.useState(null);

  // State for create dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  });

  // Add new state for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    // if (user?.id) {
    dispatch(fetchIVRFlows());
    // }
  }, [dispatch, user]);

  const handleMenuClick = (event, flow) => {
    setAnchorEl(event.currentTarget);
    setSelectedFlow(flow);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFlow(null);
  };

  const handleEdit = () => {
    if (selectedFlow) {
      navigate(`/ivr/projects/${selectedFlow.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFlow || isDeleting) return;

    try {
      await dispatch(deleteIVRFlow(selectedFlow.id)).unwrap();
      enqueueSnackbar("IVR project deleted successfully", {
        variant: "success",
      });
      setDeleteDialogOpen(false);
      handleMenuClose();
    } catch (error) {
      enqueueSnackbar(error.message || "Failed to delete IVR project", {
        variant: "error",
      });
    }
  };

  const handleCreateDialogOpen = () => {
    setOpenCreateDialog(true);
  };

  const handleCreateDialogClose = () => {
    setOpenCreateDialog(false);
    setNewProject({ name: "", description: "" });
  };

  const handleCreateNewIvrProject = async () => {
    if (!newProject.name.trim() || isCreating) {
      return;
    }

    // Prefer Redux user, but fall back to JWT token to avoid timing issues
    const token = localStorage.getItem("token");
    const decoded = decodeToken(token);
    const createdBy = user?.id || decoded?.userId || decoded?.id;

    if (!createdBy) {
      enqueueSnackbar("User not authenticated. Please log in again.", {
        variant: "error",
      });
      return;
    }

    const projectData = {
      name: newProject.name,
      description: newProject.description,
      blocks: [],
      connections: [],
      created_by: createdBy,
      metadata: {
        created: new Date().toISOString(),
        version: "1.0",
      },
      status: "Draft",
    };

    try {
      const result = await dispatch(createIVRFlow(projectData)).unwrap();
      if (result?.data?.id) {
        enqueueSnackbar("IVR project created successfully", {
          variant: "success",
        });
        handleCreateDialogClose();
      }
    } catch (error) {
      enqueueSnackbar(error.message || "Failed to create IVR project", {
        variant: "error",
      });
    }
  };

  const handleRowClick = (flow) => {
    setEditProject({
      id: flow.id,
      name: flow.name,
      description: flow.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditProject({ name: "", description: "" });
  };

  const handleUpdateProject = async () => {
    try {
      const result = await dispatch(
        updateIVRFlow({
          id: editProject.id,
          flowData: {
            ...selectedFlow,
            description: editProject.description,
          },
        })
      ).unwrap();

      if (result?.data) {
        enqueueSnackbar("Project updated successfully", {
          variant: "success",
        });
        handleEditDialogClose();
      }
    } catch (error) {
      enqueueSnackbar(error.message || "Failed to update project", {
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 2 }}>
        <Typography>Loading IVR projects...</Typography>
        <LoadingIndicator />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">IVR Projects</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateDialogOpen}
        >
          Create New Project
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography>Loading IVR projects...</Typography>
          <LoadingIndicator />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="1%" sx={{ fontWeight: "bold" }}>
                  #
                </TableCell>
                <TableCell width="20%" sx={{ fontWeight: "bold" }}>
                  Name
                </TableCell>
                <TableCell width="30%" sx={{ fontWeight: "bold" }}>
                  ID
                </TableCell>
                <TableCell width="20%" sx={{ fontWeight: "bold" }}>
                  Description
                </TableCell>
                <TableCell width="20%" sx={{ fontWeight: "bold" }}>
                  Created
                </TableCell>
                <TableCell width="10%" sx={{ fontWeight: "bold" }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} width="10%">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flows.map((flow, index) => (
                <TableRow
                  key={flow.id}
                  onClick={() => handleRowClick(flow)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{flow.name}</TableCell>
                  <TableCell>{flow.id}</TableCell>
                  <TableCell>{flow.description}</TableCell>
                  <TableCell>
                    {new Date(flow.metadata?.created).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{flow.status}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        handleMenuClick(e, flow);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Actions Menu - simplified */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <OpenInNewIcon
            sx={{
              color: "green",
            }}
          />
          Open Builder
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon
            sx={{
              color: "red",
            }}
          />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={!isDeleting ? handleDeleteCancel : undefined}
      >
        <DialogTitle>Delete IVR Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{selectedFlow?.name}&quot;?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            <DeleteIcon />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Updated Create Project Dialog */}
      <Dialog
        sx={{
          "& .MuiDialog-paper": {
            width: "700px",
          },
        }}
        open={openCreateDialog}
        onClose={!isCreating ? handleCreateDialogClose : undefined}
      >
        <DialogTitle
          sx={{
            color: "#ffff",
            backgroundColor: "#000000",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          Create New IVR Project
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Project Name"
              type="text"
              fullWidth
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              required
              disabled={isCreating}
            />
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={newProject.description}
              onChange={(e) =>
                setNewProject({ ...newProject, description: e.target.value })
              }
              disabled={isCreating}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateNewIvrProject}
            variant="contained"
            color="primary"
            disabled={!newProject.name.trim() || isCreating || authLoading}
            startIcon={isCreating ? <CircularProgress size={20} /> : null}
          >
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Edit Project Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        sx={{
          "& .MuiDialog-paper": {
            width: "700px",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#ffff",
            backgroundColor: "#000000",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          Edit IVR Project
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              margin="dense"
              label="Project Name"
              type="text"
              fullWidth
              value={editProject.name}
              disabled={true}
              sx={{ mb: 2 }}
            />
            <TextField
              autoFocus
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={editProject.description}
              onChange={(e) =>
                setEditProject({ ...editProject, description: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button
            onClick={handleUpdateProject}
            variant="contained"
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IVRProjects;
