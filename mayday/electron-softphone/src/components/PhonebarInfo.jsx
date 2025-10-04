import React from "react";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Link,
  Chip,
  Grid,
} from "@mui/material";
import {
  Info as InfoIcon,
  Update,
  Build,
  Code,
  Storage,
  Security,
  Speed,
  BugReport,
  Email as EmailIcon,
  GitHub,
} from "@mui/icons-material";
import LanguageIcon from "@mui/icons-material/Language";

const PhonebarInfo = ({ open, onClose }) => {
  // You can load these from your package.json or environment variables
  const appInfo = {
    version: "2.0.2",
    buildNumber: "2024.03.14",
    environment: process.env.NODE_ENV,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: window.navigator.platform,
    lastUpdate: "March 14, 2024",
  };

  const features = [
    "SIP Integration",
    "WhatsApp Integration",
    "Email Support",
    "Facebook Integration",
    "Call History",
    "Campaign Management",
    "Agent Status Monitoring",
    "Real-time Analytics",
  ];

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title="About the Appbar"
      headerColor="#2196f3"
    >
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* App Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <InfoIcon color="primary" />
                Application Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Update fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Version" secondary={appInfo.version} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Build fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Build Number"
                    secondary={appInfo.buildNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Code fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Environment"
                    secondary={appInfo.environment}
                  />
                </ListItem>
              </List>
            </Paper>

            {/* System Information */}
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Storage color="primary" />
                System Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Electron Version"
                    secondary={appInfo.electron}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Chrome Version"
                    secondary={appInfo.chrome}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Node Version"
                    secondary={appInfo.node}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Platform"
                    secondary={appInfo.platform}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Features and Support */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Speed color="primary" />
                Features
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>

            {/* Support Information */}
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Security color="primary" />
                Support & Resources
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <BugReport fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Report Issues"
                    secondary={
                      <Link href="#" target="_blank" underline="hover">
                        Submit a bug report
                      </Link>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Support Email"
                    secondary={
                      <Link href="mailto:sales@mmict.info" underline="hover">
                        sales@mmict.info
                      </Link>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LanguageIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Website"
                    secondary={
                      <Link href="https://mmict.it/" underline="hover">
                        https://mmict.it/
                      </Link>
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <GitHub fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Documentation"
                    secondary={
                      <Link href="#" target="_blank" underline="hover">
                        View documentation
                      </Link>
                    }
                  />
                </ListItem>
              </List>
            </Paper>
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mt: 4,
                  color: "text.secondary",
                  fontSize: "0.875rem",
                }}
              >
                <Typography variant="body2">
                  © {new Date().getFullYear()} MM-iCT. All rights reserved.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </ContentFrame>
  );
};

export default PhonebarInfo;
