// import React, { useState } from "react";
// import ContentFrame from "./ContentFrame";
// import {
//   Box,
//   Grid,
//   Paper,
//   Typography,
//   List,
//   ListItem,
//   ListItemText,
//   ListItemAvatar,
//   Avatar,
//   IconButton,
//   TextField,
//   InputAdornment,
//   Fab,
//   Divider,
//   Badge,
//   Tooltip,
//   Menu,
//   MenuItem,
//   ListItemIcon,
//   Button,
// } from "@mui/material";
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
// import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
// import {
//   Send,
//   AttachFile,
//   Image,
//   InsertEmoticon,
//   MoreVert,
//   Search,
//   ThumbUp,
//   Comment,
//   Share,
//   PhotoLibrary,
//   LocationOn,
//   Poll,
//   Facebook as FacebookIcon,
//   Close,
//   Inbox,
// } from "@mui/icons-material";

// // Dummy data for Facebook posts
// const dummyPosts = [
//   {
//     id: 1,
//     author: "Councelor X",
//     avatar: "JS",
//     content: "Just launched our new customer service platform! 🚀",
//     timestamp: "2 hours ago",
//     likes: 24,
//     comments: 8,
//     shares: 3,
//     image: "https://source.unsplash.com/random/800x400?technology",
//   },
//   {
//     id: 2,
//     author: "Clinical Team",
//     avatar: "ST",
//     content: "We're here to help! Our team is available 24/7.",
//     timestamp: "5 hours ago",
//     likes: 15,
//     comments: 4,
//     shares: 1,
//   },
//   // Add more dummy posts...
// ];

// // Add dummy messages data
// const dummyMessages = [
//   {
//     id: 1,
//     name: "Councelor X",
//     avatar: "JS",
//     lastMessage: "Hi, I have a question about your services",
//     timestamp: "10:30 AM",
//     unread: true,
//     messages: [
//       {
//         id: 1,
//         content: "Hi, I have a question about your services",
//         timestamp: "10:30 AM",
//         sender: "user",
//       },
//     ],
//   },
//   {
//     id: 2,
//     name: "Sarah Baker",
//     avatar: "SW",
//     lastMessage: "Thanks for your quick response!",
//     timestamp: "Yesterday",
//     unread: false,
//     messages: [
//       {
//         id: 1,
//         content: "Hello, do you offer 24/7 support?",
//         timestamp: "Yesterday",
//         sender: "user",
//       },
//       {
//         id: 2,
//         content: "Yes, we do! Our team is available around the clock.",
//         timestamp: "Yesterday",
//         sender: "admin",
//       },
//       {
//         id: 3,
//         content: "Thanks for your quick response!",
//         timestamp: "Yesterday",
//         sender: "user",
//       },
//     ],
//   },
// ];

// const FacebookView = ({ open, onClose }) => {
//   const [posts, setPosts] = useState(dummyPosts);
//   const [newPost, setNewPost] = useState("");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [selectedPost, setSelectedPost] = useState(null);
//   const [replyingTo, setReplyingTo] = useState(null);
//   const [commentText, setCommentText] = useState("");
//   const [showMessages, setShowMessages] = useState(false);
//   const [messages, setMessages] = useState(dummyMessages);
//   const [selectedChat, setSelectedChat] = useState(null);
//   const [messageText, setMessageText] = useState("");
//   const [unreadCount, setUnreadCount] = useState(
//     messages.filter((chat) => chat.unread).length
//   );

//   const handlePostSubmit = () => {
//     if (!newPost.trim()) return;

//     const newPostObj = {
//       id: posts.length + 1,
//       author: "You",
//       avatar: "ME",
//       content: newPost,
//       timestamp: "Just now",
//       likes: 0,
//       comments: 0,
//       shares: 0,
//     };

//     setPosts([newPostObj, ...posts]);
//     setNewPost("");
//   };

//   const handleLike = (postId) => {
//     setPosts(
//       posts.map((post) =>
//         post.id === postId ? { ...post, likes: post.likes + 1 } : post
//       )
//     );
//   };

//   const handleComment = (postId) => {
//     if (!commentText.trim()) return;

//     setPosts(
//       posts.map((post) => {
//         if (post.id === postId) {
//           return {
//             ...post,
//             comments: post.comments + 1,
//             commentsList: [
//               ...(post.commentsList || []),
//               {
//                 id: (post.commentsList?.length || 0) + 1,
//                 author: "Page Admin",
//                 avatar: "PA",
//                 content: commentText,
//                 timestamp: "Just now",
//                 isAdmin: true,
//                 replyTo: replyingTo,
//               },
//             ],
//           };
//         }
//         return post;
//       })
//     );
//     setCommentText("");
//     setReplyingTo(null);
//   };

//   const renderReplyPreview = (postId) => {
//     if (!replyingTo) return null;

//     return (
//       <Box
//         sx={{
//           p: 1,
//           bgcolor: "background.paper",
//           borderLeft: "4px solid #1877F2",
//           display: "flex",
//           alignItems: "center",
//           gap: 1,
//           mb: 1,
//         }}
//       >
//         <Box sx={{ flexGrow: 1 }}>
//           <Typography variant="caption" color="primary">
//             Replying to {replyingTo.author}
//           </Typography>
//           <Typography variant="body2" noWrap>
//             {replyingTo.content}
//           </Typography>
//         </Box>
//         <IconButton size="small" onClick={() => setReplyingTo(null)}>
//           <Close fontSize="small" />
//         </IconButton>
//       </Box>
//     );
//   };

//   // Handle sending a direct message
//   const handleSendMessage = () => {
//     if (!messageText.trim() || !selectedChat) return;

//     const newMessage = {
//       id: selectedChat.messages.length + 1,
//       content: messageText,
//       timestamp: "Just now",
//       sender: "admin",
//     };

//     setMessages(
//       messages.map((chat) =>
//         chat.id === selectedChat.id
//           ? {
//               ...chat,
//               messages: [...chat.messages, newMessage],
//               lastMessage: messageText,
//               timestamp: "Just now",
//             }
//           : chat
//       )
//     );

//     setMessageText("");
//   };

//   // Handle opening messages from notification
//   const handleOpenMessages = () => {
//     setShowMessages(true);
//   };

//   // Handle opening a specific chat
//   const handleOpenChat = (chat) => {
//     setSelectedChat(chat);
//     // Mark messages as read
//     if (chat.unread) {
//       setMessages(
//         messages.map((m) => (m.id === chat.id ? { ...m, unread: false } : m))
//       );
//       setUnreadCount((prev) => Math.max(0, prev - 1));
//     }
//   };

//   // Handle sending a message with keyboard shortcut
//   const handleKeyPress = (event) => {
//     if (event.key === "Enter" && !event.shiftKey) {
//       event.preventDefault();
//       handleSendMessage();
//     }
//   };

//   // Render the messages button with notification badge
//   const renderMessagesButton = () => (
//     <Paper sx={{ p: 2, mb: 2 }}>
//       <Button
//         fullWidth
//         variant="contained"
//         startIcon={
//           <Badge badgeContent={unreadCount} color="error">
//             <Inbox />
//           </Badge>
//         }
//         onClick={handleOpenMessages}
//         sx={{ justifyContent: "flex-start" }}
//       >
//         Messages
//         {unreadCount > 0 && (
//           <Typography variant="caption" sx={{ ml: 1, color: "inherit" }}>
//             ({unreadCount} new)
//           </Typography>
//         )}
//       </Button>
//     </Paper>
//   );

//   // Render the chat interface
//   const renderChatInterface = () => (
//     <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
//       {/* Chat Header */}
//       <Box
//         sx={{
//           p: 2,
//           borderBottom: 1,
//           borderColor: "divider",
//           bgcolor: "#1877F2",
//           color: "white",
//           display: "flex",
//           alignItems: "center",
//           gap: 2,
//         }}
//       >
//         <IconButton
//           onClick={() => setSelectedChat(null)}
//           sx={{ color: "white" }}
//         >
//           <ArrowBackIcon />
//         </IconButton>
//         <Avatar>{selectedChat?.avatar}</Avatar>
//         <Box>
//           <Typography variant="subtitle1">{selectedChat?.name}</Typography>
//           <Typography variant="caption">
//             {selectedChat?.online ? "Active Now" : "Offline"}
//           </Typography>
//         </Box>
//       </Box>

//       {/* Messages Area */}
//       <Box
//         sx={{
//           flex: 1,
//           overflow: "auto",
//           p: 2,
//           display: "flex",
//           flexDirection: "column",
//           gap: 1,
//         }}
//       >
//         {selectedChat?.messages.map((message) => (
//           <Box
//             key={message.id}
//             sx={{
//               display: "flex",
//               flexDirection: "column",
//               alignItems:
//                 message.sender === "admin" ? "flex-end" : "flex-start",
//             }}
//           >
//             <Paper
//               sx={{
//                 p: 1.5,
//                 maxWidth: "70%",
//                 bgcolor: message.sender === "admin" ? "#1877F2" : "grey.100",
//                 color: message.sender === "admin" ? "white" : "inherit",
//                 borderRadius: 2,
//               }}
//             >
//               <Typography variant="body2">{message.content}</Typography>
//             </Paper>
//             <Typography
//               variant="caption"
//               color="text.secondary"
//               sx={{ mt: 0.5, mx: 1 }}
//             >
//               {message.timestamp}
//             </Typography>
//           </Box>
//         ))}
//       </Box>

//       {/* Message Input */}
//       <Box
//         sx={{
//           p: 2,
//           borderTop: 1,
//           borderColor: "divider",
//           bgcolor: "background.paper",
//         }}
//       >
//         <TextField
//           fullWidth
//           multiline
//           maxRows={4}
//           size="small"
//           placeholder="Type a message..."
//           value={messageText}
//           onChange={(e) => setMessageText(e.target.value)}
//           onKeyPress={handleKeyPress}
//           InputProps={{
//             sx: { borderRadius: 3 },
//             startAdornment: (
//               <InputAdornment position="start">
//                 <Tooltip title="Add emoji">
//                   <IconButton size="small">
//                     <EmojiEmotionsIcon />
//                   </IconButton>
//                 </Tooltip>
//                 <Tooltip title="Attach file">
//                   <IconButton size="small">
//                     <AttachFile />
//                   </IconButton>
//                 </Tooltip>
//               </InputAdornment>
//             ),
//             endAdornment: (
//               <InputAdornment position="end">
//                 <Tooltip title="Send message (Enter)">
//                   <IconButton
//                     onClick={handleSendMessage}
//                     disabled={!messageText.trim()}
//                     color="primary"
//                   >
//                     <Send />
//                   </IconButton>
//                 </Tooltip>
//               </InputAdornment>
//             ),
//           }}
//         />
//       </Box>
//     </Box>
//   );

//   // Update the messages section render
//   const renderMessagesSection = () => {
//     if (!showMessages) return null;

//     return (
//       <Box sx={{ height: "100%" }}>
//         {selectedChat ? (
//           renderChatInterface()
//         ) : (
//           <>
//             {/* Messages List Header */}
//             <Box
//               sx={{
//                 p: 2,
//                 borderBottom: 1,
//                 borderColor: "divider",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 2,
//               }}
//             >
//               <IconButton onClick={() => setShowMessages(false)}>
//                 <ArrowBackIcon />
//               </IconButton>
//               <Typography variant="h6">Messages</Typography>
//             </Box>

//             {/* Messages List */}
//             <List sx={{ p: 0 }}>
//               {messages.map((chat) => (
//                 <ListItem
//                   key={chat.id}
//                   button
//                   onClick={() => handleOpenChat(chat)}
//                   sx={{
//                     borderBottom: 1,
//                     borderColor: "divider",
//                     bgcolor: chat.unread ? "action.hover" : "transparent",
//                   }}
//                 >
//                   <ListItemAvatar>
//                     <Badge
//                       color="primary"
//                       variant="dot"
//                       invisible={!chat.unread}
//                     >
//                       <Avatar>{chat.avatar}</Avatar>
//                     </Badge>
//                   </ListItemAvatar>
//                   <ListItemText
//                     primary={chat.name}
//                     secondary={chat.lastMessage}
//                     primaryTypographyProps={{
//                       fontWeight: chat.unread ? 600 : 400,
//                     }}
//                   />
//                   <Typography
//                     variant="caption"
//                     color="text.secondary"
//                     sx={{ ml: 2 }}
//                   >
//                     {chat.timestamp}
//                   </Typography>
//                 </ListItem>
//               ))}
//             </List>
//           </>
//         )}
//       </Box>
//     );
//   };

//   return (
//     <ContentFrame
//       open={open}
//       onClose={onClose}
//       title="Facebook"
//       headerColor="#1877F2"
//     >
//       <Box sx={{ p: 3 }}>
//         <Grid container spacing={3}>
//           {/* Left Sidebar */}
//           <Grid item xs={12} md={3}>
//             <Paper sx={{ p: 2, mb: 2 }}>
//               <Typography variant="h6" gutterBottom>
//                 Page Overview
//               </Typography>
//               <List>
//                 <ListItem>
//                   <ListItemText primary="Page Views" secondary="1,234" />
//                 </ListItem>
//                 <ListItem>
//                   <ListItemText primary="New Messages" secondary="12" />
//                 </ListItem>
//                 <ListItem>
//                   <ListItemText primary="Post Reach" secondary="5,678" />
//                 </ListItem>
//               </List>
//             </Paper>
//             {renderMessagesButton()}
//           </Grid>

//           {/* Main Content */}
//           <Grid item xs={12} md={6}>
//             {showMessages ? (
//               renderMessagesSection()
//             ) : (
//               <>
//                 {/* Create Post */}
//                 <Paper sx={{ p: 2, mb: 3 }}>
//                   <TextField
//                     fullWidth
//                     multiline
//                     rows={3}
//                     placeholder="What's on your mind?"
//                     value={newPost}
//                     onChange={(e) => setNewPost(e.target.value)}
//                     sx={{ mb: 2 }}
//                   />
//                   <Box
//                     sx={{ display: "flex", justifyContent: "space-between" }}
//                   >
//                     <Box>
//                       <IconButton>
//                         <PhotoLibrary color="primary" />
//                       </IconButton>
//                       <IconButton>
//                         <LocationOn color="error" />
//                       </IconButton>
//                       <IconButton>
//                         <Poll color="success" />
//                       </IconButton>
//                     </Box>
//                     <Fab
//                       variant="extended"
//                       size="small"
//                       color="primary"
//                       onClick={handlePostSubmit}
//                       disabled={!newPost.trim()}
//                     >
//                       <Send sx={{ mr: 1 }} />
//                       Post
//                     </Fab>
//                   </Box>
//                 </Paper>

//                 {/* Posts List */}
//                 {posts.map((post) => (
//                   <Paper key={post.id} sx={{ p: 2, mb: 2 }}>
//                     <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
//                       <Avatar sx={{ mr: 2 }}>{post.avatar}</Avatar>
//                       <Box>
//                         <Typography variant="subtitle1">
//                           {post.author}
//                         </Typography>
//                         <Typography variant="caption" color="text.secondary">
//                           {post.timestamp}
//                         </Typography>
//                       </Box>
//                     </Box>
//                     <Typography sx={{ mb: 2 }}>{post.content}</Typography>
//                     {post.image && (
//                       <Box sx={{ mb: 2 }}>
//                         <img
//                           src={post.image}
//                           alt=""
//                           style={{
//                             width: "100%",
//                             borderRadius: 8,
//                           }}
//                         />
//                       </Box>
//                     )}
//                     <Divider sx={{ my: 1 }} />
//                     <Box
//                       sx={{ display: "flex", justifyContent: "space-between" }}
//                     >
//                       <Button
//                         startIcon={<ThumbUp />}
//                         onClick={() => handleLike(post.id)}
//                       >
//                         {post.likes}
//                       </Button>
//                       <Button startIcon={<Comment />}>{post.comments}</Button>
//                       <Button startIcon={<Share />}>{post.shares}</Button>
//                     </Box>

//                     {/* Comments Section */}
//                     <Box sx={{ mt: 2 }}>
//                       {post.commentsList?.map((comment) => (
//                         <Box
//                           key={comment.id}
//                           sx={{
//                             display: "flex",
//                             gap: 1,
//                             mb: 1,
//                             pl: comment.replyTo ? 4 : 0,
//                           }}
//                         >
//                           <Avatar
//                             sx={{
//                               width: 32,
//                               height: 32,
//                               bgcolor: comment.isAdmin ? "#1877F2" : "grey.400",
//                             }}
//                           >
//                             {comment.avatar}
//                           </Avatar>
//                           <Box>
//                             <Box
//                               sx={{
//                                 bgcolor: "grey.100",
//                                 p: 1,
//                                 borderRadius: 2,
//                               }}
//                             >
//                               <Typography
//                                 variant="subtitle2"
//                                 sx={{ fontWeight: 600 }}
//                               >
//                                 {comment.author}
//                                 {comment.isAdmin && (
//                                   <Typography
//                                     component="span"
//                                     sx={{
//                                       ml: 1,
//                                       px: 1,
//                                       py: 0.5,
//                                       bgcolor: "#1877F2",
//                                       color: "white",
//                                       borderRadius: 1,
//                                       fontSize: "0.75rem",
//                                     }}
//                                   >
//                                     Admin
//                                   </Typography>
//                                 )}
//                               </Typography>
//                               <Typography variant="body2">
//                                 {comment.content}
//                               </Typography>
//                             </Box>
//                             <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
//                               <Button
//                                 size="small"
//                                 onClick={() => setReplyingTo(comment)}
//                               >
//                                 Reply
//                               </Button>
//                               <Typography
//                                 variant="caption"
//                                 color="text.secondary"
//                               >
//                                 {comment.timestamp}
//                               </Typography>
//                             </Box>
//                           </Box>
//                         </Box>
//                       ))}

//                       {/* Comment Input */}
//                       <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
//                         <Avatar sx={{ bgcolor: "#1877F2" }}>PA</Avatar>
//                         <Box sx={{ flexGrow: 1 }}>
//                           {renderReplyPreview(post.id)}
//                           <TextField
//                             fullWidth
//                             size="small"
//                             placeholder="Write a comment..."
//                             value={commentText}
//                             onChange={(e) => setCommentText(e.target.value)}
//                             InputProps={{
//                               endAdornment: (
//                                 <InputAdornment position="end">
//                                   <IconButton
//                                     onClick={() => handleComment(post.id)}
//                                     disabled={!commentText.trim()}
//                                   >
//                                     <Send />
//                                   </IconButton>
//                                 </InputAdornment>
//                               ),
//                             }}
//                           />
//                         </Box>
//                       </Box>
//                     </Box>
//                   </Paper>
//                 ))}
//               </>
//             )}
//           </Grid>

//           {/* Right Sidebar */}
//           <Grid item xs={12} md={3}>
//             <Paper sx={{ p: 2 }}>
//               <Typography variant="h6" gutterBottom>
//                 Insights
//               </Typography>
//               <List>
//                 <ListItem>
//                   <ListItemText primary="Engagement Rate" secondary="4.2%" />
//                 </ListItem>
//                 <ListItem>
//                   <ListItemText primary="Page Followers" secondary="2,345" />
//                 </ListItem>
//                 <ListItem>
//                   <ListItemText primary="Response Rate" secondary="95%" />
//                 </ListItem>
//               </List>
//             </Paper>
//           </Grid>
//         </Grid>
//       </Box>
//     </ContentFrame>
//   );
// };

// export default FacebookView;
