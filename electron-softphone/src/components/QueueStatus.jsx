import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Chip,
} from "@mui/material";

function QueueStatus({ queues, isLoading }) {
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", bgcolor: "#2c3338" }}>
      <List sx={{ p: 0 }}>
        {queues.map((queue) => (
          <ListItem
            key={queue.id}
            sx={{
              borderBottom: "1px solid #444",
              flexDirection: "column",
              alignItems: "flex-start",
              py: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                {queue.name}
              </Typography>
              <Chip
                label={`${queue.waitingCalls} waiting`}
                color={queue.waitingCalls > 0 ? "error" : "success"}
                size="small"
              />
            </Box>

            <Box sx={{ width: "100%" }}>
              <Typography variant="caption" sx={{ color: "#999" }}>
                Avg. Wait: {Math.round(queue.averageWaitTime / 60)}m
              </Typography>
              <Typography variant="caption" sx={{ color: "#999", ml: 2 }}>
                Agents: {queue.agentsAvailable}/{queue.totalAgents}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default QueueStatus;
