import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Divider,
  Avatar,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Close as CloseIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

const ClientDetailView = ({ open, onClose, post, handleEdit }) => {
  if (!post) return null;

  const fields = [
    { label: "Caller Name", value: post.callerName },
    { label: "Mobile", value: post.mobile },
    { label: "Caller Sex", value: post.callerSex },
    { label: "Client Sex", value: post.clientSex },
    { label: "Case Source", value: post.caseSource },
    { label: "Peer Referral", value: post.peerReferral },
    { label: "Same As Caller", value: post.sameAsCaller },
    { label: "Client Name", value: post.clientName },
    { label: "Client District", value: post.clientDistrict },
    { label: "Relationship", value: post.relationship },
    { label: "Language", value: post.language },
    { label: "Caller Age", value: post.callerAge },
    { label: "Client Age", value: post.clientAge },
    { label: "Difficulty", value: post.difficulty.join(", ") },
    { label: "How Did You Hear", value: post.howDidYouHear.join(", ") },
    { label: "Case Assessment", value: post.caseAssessment.join(", ") },
    { label: "Services Prior", value: post.servicesPrior.join(", ") },
    { label: "Services Offered", value: post.servicesOffered.join(", ") },
    { label: "Nationality", value: post.nationality },
    { label: "Region", value: post.region },
    { label: "Accessed", value: post.accessed.join(", ") },
    { label: "Message", value: post.message },
    { label: "Reason", value: post.reason },
    { label: "How Long", value: post.howLong },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          style={{
            backgroundColor: "#400036",
            color: "#ffff",
            borderRadius: "5px",
            padding: "15px",
          }}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar style={{ fontSize: "8rem", width: "50px", height: "50px" }}>
              <PersonIcon style={{ fontSize: "3rem" }} />
            </Avatar>
            <Typography variant="h6">Client Details</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Tooltip title="Edit">
              <IconButton
                onClick={() => {
                  onClose();
                  handleEdit(post);
                }}
                size="small"
                style={{
                  color: "#000",
                  backgroundColor: "#9FC131",
                  borderRadius: "5px",
                }}
              >
                <Typography variant="body1">Edit Record</Typography>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                onClick={onClose}
                size="small"
                style={{
                  color: "#ffff",
                  backgroundColor: "#898C8B",
                  borderRadius: "5px",
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          {fields.map((field, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Typography variant="subtitle1" color="textSecondary">
                {field.label}
              </Typography>
              <Typography variant="body1">{field.value || "N/A"}</Typography>
              {index < fields.length - 1 && <Divider sx={{ my: 1 }} />}
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Session Details
        </Typography>
        {post.sessionList.map((session, index) => (
          <Box key={index} mb={2}>
            <Typography
              variant="subtitle1"
              style={{
                backgroundColor: "#400036",
                color: "#ffff",
                borderRadius: "5px",
                paddingLeft: "10px",
              }}
            >
              Session {index + 1}
            </Typography>
            <Typography style={{ fontStyle: "italic" }} variant="body2">
              Date: {new Date(session.session_date).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">Details: {session.session}</Typography>
            <Divider sx={{ my: 1 }} />
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailView;
