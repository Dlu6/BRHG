import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Paper,
  Divider,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Send as SendIcon, Add as AddIcon } from "@mui/icons-material";
import ContentFrame from "./ContentFrame";
import { smsService } from "../services/smsService";
import { useNotification } from "../contexts/NotificationContext";

const SmsView = ({ open, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState({
    conversations: true,
    messages: false,
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading((l) => ({ ...l, conversations: true }));
        const res = await smsService.getConversations();
        if (res.success) {
          setConversations(res.data);
          if (res.data.length > 0) {
            // Automatically select the first conversation
            handleSelectConversation(res.data[0]);
          }
        }
      } catch (error) {
        showNotification({
          message: "Failed to load conversations",
          severity: "error",
        });
      } finally {
        setLoading((l) => ({ ...l, conversations: false }));
      }
    };

    if (open) {
      fetchConversations();
    }
  }, [open]);

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    try {
      setLoading((l) => ({ ...l, messages: true }));
      const res = await smsService.getMessages(conversation.partner);
      if (res.success) {
        setMessages(res.data);
      }
    } catch (error) {
      showNotification({
        message: "Failed to load messages for this conversation",
        severity: "error",
      });
    } finally {
      setLoading((l) => ({ ...l, messages: false }));
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() && selectedConversation) {
      try {
        await smsService.send({
          to: selectedConversation.partner,
          content: message,
        });
        setMessage("");
        // Refresh messages after sending
        handleSelectConversation(selectedConversation);
      } catch (error) {
        showNotification({
          message: `Failed to send SMS: ${error.message}`,
          severity: "error",
        });
      }
    }
  };

  return (
    <ContentFrame open={open} onClose={onClose} title="SMS Messaging">
      <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
        {/* Conversations List */}
        <Paper
          elevation={2}
          sx={{
            width: "30%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h6">Conversations</Typography>
            <IconButton color="primary">
              <AddIcon />
            </IconButton>
          </Box>
          <List sx={{ flexGrow: 1, overflowY: "auto" }}>
            {loading.conversations ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              conversations.map((convo) => (
                <ListItem
                  button
                  key={convo.partner}
                  selected={selectedConversation?.partner === convo.partner}
                  onClick={() => handleSelectConversation(convo)}
                >
                  <Avatar sx={{ mr: 2 }}>
                    {convo.partner.charAt(convo.partner.length - 2)}
                  </Avatar>
                  <ListItemText
                    primary={convo.partner}
                    secondary={convo.lastMessage}
                  />
                  <Typography variant="caption">
                    {new Date(convo.timestamp).toLocaleTimeString()}
                  </Typography>
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        {/* Message View */}
        <Box
          sx={{
            width: "70%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedConversation ? (
            <>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <Typography variant="h6">
                  {selectedConversation.partner}
                </Typography>
              </Box>

              <Box
                sx={{
                  flexGrow: 1,
                  p: 2,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column-reverse",
                }}
              >
                {loading.messages ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  messages
                    .slice()
                    .reverse()
                    .map((msg) => (
                      <Box
                        key={msg.id}
                        sx={{
                          alignSelf:
                            msg.direction === "outbound"
                              ? "flex-end"
                              : "flex-start",
                          maxWidth: "70%",
                          mb: 1,
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            borderRadius:
                              msg.direction === "outbound"
                                ? "20px 20px 5px 20px"
                                : "20px 20px 20px 5px",
                            backgroundColor:
                              msg.direction === "outbound"
                                ? "primary.main"
                                : "grey.200",
                            color:
                              msg.direction === "outbound" ? "white" : "black",
                          }}
                        >
                          <Typography variant="body2">{msg.content}</Typography>
                        </Paper>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            textAlign:
                              msg.direction === "outbound" ? "right" : "left",
                            mt: 0.5,
                          }}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    ))
                )}
              </Box>

              <Divider />

              <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!message.trim() || !selectedConversation}
                  sx={{ ml: 1 }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Typography color="text.secondary">
                {loading.conversations
                  ? "Loading conversations..."
                  : "Select a conversation to start messaging"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </ContentFrame>
  );
};

export default SmsView;
