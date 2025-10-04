import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";

const ConfirmDeletionDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  isDeleting,
  loading,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button
          onClick={onClose}
          color="primary"
          disabled={loading || isDeleting}
          style={{
            cursor: loading || isDeleting ? "not-allowed" : "pointer",
            backgroundColor: loading || isDeleting ? "#ccc" : "#1976d2", // Example gray or blue background color
            color: "#fff",
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="secondary"
          autoFocus
          disabled={loading || isDeleting}
          startIcon={
            isDeleting ? <CircularProgress size={20} color="secondary" /> : null
          }
          style={{
            cursor: loading || isDeleting ? "not-allowed" : "pointer",
            backgroundColor: loading || isDeleting ? "#ccc" : "#d32f2f", // Example gray or red background color
            color: "#fff",
          }}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeletionDialog;
