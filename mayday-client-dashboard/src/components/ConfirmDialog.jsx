import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ConfirmDialog = ({ open, onClose, onConfirm, title, content }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: "error.main",
          color: "error.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: "error.contrastText" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography>{content}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
