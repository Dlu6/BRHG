import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  IconButton,
  keyframes,
  styled,
} from "@mui/material";
import {
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

// Define the pulse animation
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.9);
    background-color: #4caf50;
  }
  50% {
    transform: scale(1.12);
    box-shadow: 0 0 20px 10px rgba(76, 175, 80, 0.4);
    background-color: #2e7d32;
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    background-color: #4caf50;
  }
`;

// Create a styled button with the animation
const AnimatedAnswerButton = styled(Button)(({ theme }) => ({
  borderRadius: 28,
  padding: "10px 28px",
  animation: `${pulseAnimation} 1.2s infinite`,
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  fontWeight: "bold",
  letterSpacing: "0.5px",
  "&:hover": {
    transform: "scale(1.15)",
    boxShadow: "0 6px 25px rgba(76, 175, 80, 0.6)",
    animation: "none",
    backgroundColor: "#2e7d32",
  },
}));

// Add a ringing animation for the avatar
const ringAnimation = keyframes`
  0% {
    transform: rotate(-15deg);
  }
  50% {
    transform: rotate(15deg);
  }
  100% {
    transform: rotate(-15deg);
  }
`;

// Create a styled avatar with animation
const AnimatedAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  marginBottom: 16,
  backgroundColor: theme.palette.primary.light,
  animation: `${ringAnimation} 0.5s infinite`,
  boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)",
}));

/**
 * CallPopup - A component for displaying incoming call notifications
 * This component is designed to be independent of scrolling in other components
 *
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the popup is open
 * @param {Object} props.call - Call information object
 * @param {Function} props.onAnswer - Function to call when answering the call
 * @param {Function} props.onReject - Function to call when rejecting the call
 */
const CallPopup = ({
  open,
  call,
  client,
  loading,
  onAnswer,
  onReject,
  onOpenRecord,
}) => {
  // Log the call object to debug
  useEffect(() => {
    if (call) {
      console.log("Call data in CallPopup:", call);
    }
  }, [call]);

  if (!call) return null;

  // Extract caller information with remoteIdentity as the primary source
  const callerId =
    call.remoteIdentity || // This is the primary field for caller ID based on the logs
    call.callerid ||
    call.callerId ||
    call.src ||
    call.CallerIDNum ||
    call.callerIdNum ||
    call.clid ||
    call.CallerID ||
    call.callerid_num ||
    call.Callerid ||
    call.from ||
    "Unknown";

  const extension =
    call.extension || call.dst || call.Exten || call.exten || call.to || "";

  const queue = call.queue || call.Queue || "";

  // Extract quick insights from client record if available
  const clientName = client?.clientName || client?.callerName;
  const clientSessions = Array.isArray(client?.sessionList)
    ? client.sessionList.length
    : client?.sessionCount || 0;
  const lastSessionDate =
    Array.isArray(client?.sessionList) && client.sessionList.length > 0
      ? new Date(client.sessionList[client.sessionList.length - 1].session_date)
      : client?.createdAt
      ? new Date(client.createdAt)
      : null;

  // Create a transparent overlay for the dialog backdrop
  // This will allow clicks to pass through to elements behind the dialog
  const handleBackdropClick = (e) => {
    // Only stop propagation if clicking on the actual dialog content
    if (e.target.closest(".MuiDialog-paper")) {
      e.stopPropagation();
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      onClick={handleBackdropClick}
      sx={{
        zIndex: 9999, // Ensure it's above everything else
        position: "fixed",
        "& .MuiDialog-paper": {
          margin: 2,
          borderRadius: 2,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        },
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.3)", // More transparent backdrop
        },
        // Make the backdrop allow pointer events to pass through
        "& .MuiBackdrop-root:not(.MuiDialog-paper)": {
          pointerEvents: "none", // Allow clicks to pass through the backdrop
        },
      }}
      // Prevent dialog from closing when clicking outside
      disableEscapeKeyDown={true}
      onClose={(event, reason) => {
        // Prevent any automatic closing
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return false;
        }
      }}
      // Make the dialog container allow pointer events to pass through
      // This ensures scrolling works behind the dialog
      BackdropProps={{
        sx: {
          pointerEvents: "none", // Allow events to pass through
        },
        onClick: (e) => {
          // Prevent dialog from closing on backdrop click
          e.stopPropagation();
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "primary.main",
          color: "white",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "1.25rem",
        }}
      >
        Incoming Call
      </DialogTitle>
      <DialogContent sx={{ p: 3, textAlign: "center" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            my: 2,
          }}
        >
          <AnimatedAvatar>
            <PersonIcon fontSize="large" />
          </AnimatedAvatar>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {callerId}
          </Typography>
          {loading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Matching client...
            </Typography>
          )}
          {extension && (
            <Typography variant="body1" color="text.secondary">
              to extension {extension}
            </Typography>
          )}
          {queue && (
            <Typography
              variant="body2"
              color="primary"
              sx={{
                mt: 1,
                fontWeight: "medium",
                bgcolor: "primary.lighter",
                px: 2,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Via Queue: {queue}
            </Typography>
          )}

          {/* Client insights if we have a matched record */}
          {client && (
            <Box
              sx={{
                mt: 2,
                width: "100%",
                textAlign: "left",
                bgcolor: (theme) => theme.palette.grey[100],
                p: 2,
                borderRadius: 1,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Matched Client
              </Typography>
              {clientName && (
                <Typography variant="body2">Name: {clientName}</Typography>
              )}
              {client?.reason && (
                <Typography
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  Reason: {client.reason}
                </Typography>
              )}
              <Typography variant="body2">
                Sessions: {clientSessions}
                {lastSessionDate &&
                  ` • Last: ${lastSessionDate.toLocaleDateString()}`}
              </Typography>
              {onOpenRecord && (
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRecord();
                  }}
                >
                  Open Client Record
                </Button>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 3, gap: 2 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<CallEndIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          sx={{
            borderRadius: 28,
            px: 3,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: "0 4px 15px rgba(244, 67, 54, 0.4)",
            },
          }}
        >
          Decline
        </Button>
        <AnimatedAnswerButton
          variant="contained"
          color="success"
          startIcon={<CallIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onAnswer();
          }}
        >
          Answer
        </AnimatedAnswerButton>
      </DialogActions>
    </Dialog>
  );
};

export default CallPopup;
