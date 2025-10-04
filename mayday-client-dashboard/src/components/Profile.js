import {
  TextField,
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import useAuth from "../hooks/useAuth";

const Profile = () => {
  const { user } = useAuth();

  const handleCopyToClipboard = (text) => {
    // Attempt to use the Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert("License copied to clipboard!");
        })
        .catch((err) => {
          // Fallback for when the Clipboard API fails
          console.error("Could not copy text: ", err);
          manualCopyFallback(text);
        });
    } else {
      // Direct fallback
      manualCopyFallback(text);
    }
  };

  const manualCopyFallback = (text) => {
    // Create a temporary textarea
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand("copy");
      const msg = successful ? "successful" : "unsuccessful";
      console.log("Fallback: Copying text command was " + msg);
      alert("License copied to clipboard (fallback method).");
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }
    document.body.removeChild(textarea);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        p: 3,
      }}
    >
      <Avatar sx={{ width: 100, height: 100, mb: 2 }}>
        {user?.name?.charAt(0) || "U"}
      </Avatar>
      <Typography variant="h4">{user?.name || "User"}</Typography>
      <Typography variant="subtitle1">
        {user?.email || "No email provided"}
      </Typography>

      <Box sx={{ mt: 4, width: "100%" }}>
        <Typography variant="h6">License Information</Typography>
        <TextField
          fullWidth
          disabled
          value={user?.license || "No license available"}
          variant="outlined"
          InputProps={{
            endAdornment: (
              <Tooltip title="Copy to clipboard">
                <IconButton
                  onClick={() => handleCopyToClipboard(user?.license || "")}
                  disabled={!user?.license}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            ),
          }}
        />
      </Box>

      {/* Include other functionalities as needed */}
    </Box>
  );
};

export default Profile;
