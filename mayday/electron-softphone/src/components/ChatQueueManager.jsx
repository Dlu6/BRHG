import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Badge,
  Stack,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as PriorityIcon,
  Business as BusinessIcon,
  Hotel as HotelIcon,
  Support as SupportIcon,
  Feedback as FeedbackIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import whatsAppService from "../services/whatsAppService";
import moment from "moment";

const ChatQueueManager = ({ onConversationSelect, currentAgent }) => {
  const [queue, setQueue] = useState([]);
  const [assignedConversations, setAssignedConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoAssign, setAutoAssign] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Fetch unassigned conversations (queue)
      const queueResponse = await whatsAppService.getConversations("pending");
      if (queueResponse.success) {
        setQueue(queueResponse.data.conversations || []);
      }

      // Fetch assigned conversations
      const assignedResponse = await whatsAppService.getAgentConversations(
        "open"
      );
      if (assignedResponse.success) {
        setAssignedConversations(assignedResponse.data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching queue:", error);
      setError("Failed to load chat queue");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!currentAgent || queue.length === 0) return;

    try {
      // Auto-assign the oldest conversation in queue
      const oldestConversation = queue.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      )[0];

      if (oldestConversation) {
        await whatsAppService.assignConversationToAgent(
          oldestConversation.id,
          currentAgent.id
        );
        await fetchQueue();
      }
    } catch (error) {
      console.error("Error auto-assigning conversation:", error);
      setError("Failed to auto-assign conversation");
    }
  };

  const handleManualAssign = async (conversationId) => {
    if (!currentAgent) return;

    try {
      await whatsAppService.assignConversationToAgent(
        conversationId,
        currentAgent.id
      );
      await fetchQueue();
    } catch (error) {
      console.error("Error assigning conversation:", error);
      setError("Failed to assign conversation");
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "normal":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const getServiceIcon = (serviceType) => {
    switch (serviceType) {
      case "booking":
        return <HotelIcon />;
      case "complaint":
        return <SupportIcon />;
      case "feedback":
        return <FeedbackIcon />;
      default:
        return <BusinessIcon />;
    }
  };

  const getCustomerTypeColor = (customerType) => {
    switch (customerType) {
      case "vip":
        return "warning";
      case "returning":
        return "success";
      case "guest":
        return "info";
      case "prospect":
        return "default";
      case "group":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatWaitTime = (createdAt) => {
    const now = moment();
    const created = moment(createdAt);
    const diffMinutes = now.diff(created, "minutes");

    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoAssign && queue.length > 0 && currentAgent) {
      const timeout = setTimeout(handleAutoAssign, 2000); // Auto-assign after 2 seconds
      return () => clearTimeout(timeout);
    }
  }, [queue, autoAssign, currentAgent]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Chat Queue Manager</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Tooltip title="Auto-assign conversations">
            <Button
              size="small"
              variant={autoAssign ? "contained" : "outlined"}
              onClick={() => setAutoAssign(!autoAssign)}
              startIcon={<AutoAwesomeIcon />}
            >
              Auto
            </Button>
          </Tooltip>
          <Tooltip title="Refresh Queue">
            <IconButton onClick={fetchQueue} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Queue Statistics */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: "#f5f5f5" }}>
        <Stack direction="row" spacing={2} justifyContent="space-around">
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" color="primary">
              {queue.length}
            </Typography>
            <Typography variant="caption">In Queue</Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" color="success.main">
              {assignedConversations.length}
            </Typography>
            <Typography variant="caption">Assigned to Me</Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" color="warning.main">
              {queue.filter((c) => c.priority === "urgent").length}
            </Typography>
            <Typography variant="caption">Urgent</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Queue List */}
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
        Queue ({queue.length})
      </Typography>

      {queue.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", bgcolor: "#f5f5f5" }}>
          <Typography color="textSecondary">
            No conversations in queue
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: "background.paper", borderRadius: 1, mb: 2 }}>
          {queue.map((conversation) => (
            <ListItem
              key={conversation.id}
              sx={{
                borderLeft:
                  conversation.priority === "urgent"
                    ? "4px solid #f44336"
                    : conversation.priority === "high"
                    ? "4px solid #ff9800"
                    : "4px solid transparent",
                "&:hover": { bgcolor: "#f5f5f5" },
              }}
              secondaryAction={
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleManualAssign(conversation.id)}
                  startIcon={<AssignmentIcon />}
                  disabled={!currentAgent}
                >
                  Assign to Me
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "#128C7E" }}>
                  {getServiceIcon(conversation.serviceType)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="subtitle2">
                      Conversation #{conversation.id}
                    </Typography>
                    <Chip
                      size="small"
                      label={conversation.priority || "normal"}
                      color={getPriorityColor(conversation.priority)}
                      icon={<PriorityIcon />}
                    />
                    {conversation.customerType && (
                      <Chip
                        size="small"
                        label={conversation.customerType}
                        color={getCustomerTypeColor(conversation.customerType)}
                        icon={<PersonIcon />}
                      />
                    )}
                    {conversation.serviceType && (
                      <Chip
                        size="small"
                        label={conversation.serviceType}
                        color="info"
                        icon={getServiceIcon(conversation.serviceType)}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Contact: {conversation.contactId} • Wait Time:{" "}
                      {formatWaitTime(conversation.createdAt)}
                    </Typography>
                    {conversation.lastMessageAt && (
                      <Typography variant="caption" color="text.secondary">
                        Last Message:{" "}
                        {moment(conversation.lastMessageAt).format(
                          "MMM DD, HH:mm"
                        )}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* My Assigned Conversations */}
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
        My Conversations ({assignedConversations.length})
      </Typography>

      {assignedConversations.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", bgcolor: "#f5f5f5" }}>
          <Typography color="textSecondary">
            No conversations assigned to you
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
          {assignedConversations.map((conversation) => (
            <ListItem
              key={conversation.id}
              button
              onClick={() =>
                onConversationSelect && onConversationSelect(conversation)
              }
              sx={{
                "&:hover": { bgcolor: "#f5f5f5" },
                borderLeft: "4px solid #4caf50",
              }}
            >
              <ListItemAvatar>
                <Badge
                  badgeContent={conversation.unreadCount || 0}
                  color="error"
                  invisible={!conversation.unreadCount}
                >
                  <Avatar sx={{ bgcolor: "#4caf50" }}>
                    {getServiceIcon(conversation.serviceType)}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="subtitle2">
                      Conversation #{conversation.id}
                    </Typography>
                    <Chip
                      size="small"
                      label={conversation.status}
                      color={
                        conversation.status === "open" ? "primary" : "default"
                      }
                    />
                    {conversation.disposition && (
                      <Chip
                        size="small"
                        label={conversation.disposition.replace(/_/g, " ")}
                        color={
                          conversation.disposition.includes("resolved")
                            ? "success"
                            : conversation.disposition.includes("escalated")
                            ? "error"
                            : "default"
                        }
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    Contact: {conversation.contactId} • Last:{" "}
                    {conversation.lastMessageAt
                      ? moment(conversation.lastMessageAt).format(
                          "MMM DD, HH:mm"
                        )
                      : "Never"}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ChatQueueManager;
