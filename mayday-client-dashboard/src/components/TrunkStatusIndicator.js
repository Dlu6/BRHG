// import React, { useState } from "react";
// import {
//   Chip,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   Typography,
//   Box,
//   List,
//   ListItem,
//   ListItemText,
//   Paper,
//   CircularProgress,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Tooltip,
//   IconButton,
// } from "@mui/material";
// import SignalWifiStatusbar4BarIcon from "@mui/icons-material/SignalWifiStatusbar4Bar";
// import SignalWifiStatusbarConnectedNoInternet4Icon from "@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4";
// import AccessTimeIcon from "@mui/icons-material/AccessTime";
// import CloseIcon from "@mui/icons-material/Close";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import ErrorIcon from "@mui/icons-material/Error";
// import WifiTetheringIcon from "@mui/icons-material/WifiTethering";
// import { getSocket } from "../services/websocketService";

// /**
//  * Enhanced TrunkStatusIndicator component
//  * Displays current trunk status with a detailed modal view
//  */
// const TrunkStatusIndicator = ({ status, trunkId, onRefresh }) => {
//   const [detailsOpen, setDetailsOpen] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   if (!status) {
//     return (
//       <Chip
//         label="Unknown"
//         color="default"
//         size="small"
//         icon={<CircularProgress size={14} />}
//         onClick={() => onRefresh && onRefresh(trunkId)}
//       />
//     );
//   }
//   // Format time elapsed since last update
//   const getTimeAgo = (timestamp) => {
//     if (!timestamp) return "Never";
//     const ms = new Date() - new Date(timestamp);
//     if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
//     if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
//     return `${Math.floor(ms / 3600000)}h ago`;
//   };

//   // Handle manual refresh request
//   const handleRefresh = async (e) => {
//     e.stopPropagation();
//     setRefreshing(true);
//     try {
//       if (onRefresh) {
//         await onRefresh(trunkId);
//       } else {
//         // Default refresh behavior if no onRefresh prop
//         const socket = getSocket();
//         socket.emit("trunk:checkStatus", trunkId);
//       }
//     } finally {
//       setTimeout(() => setRefreshing(false), 1000);
//     }
//   };

//   // Determine status color and icon
//   const isOnline = status.available || status.registered;
//   const statusColor =
//     status.state === "error" ? "error" : isOnline ? "success" : "error";
//   const StatusIcon =
//     status.state === "error"
//       ? ErrorIcon
//       : isOnline
//       ? SignalWifiStatusbar4BarIcon
//       : SignalWifiStatusbarConnectedNoInternet4Icon;

//   // Status label based on detailed state
//   let statusLabel = status.status || "Unknown";

//   return (
//     <>
//       <Tooltip
//         title={`Click for details. Last updated: ${getTimeAgo(
//           status.timestamp
//         )}`}
//       >
//         <Chip
//           label={statusLabel}
//           color={statusColor}
//           size="small"
//           icon={<StatusIcon fontSize="small" />}
//           onClick={() => setDetailsOpen(true)}
//           sx={{ cursor: "pointer" }}
//         />
//       </Tooltip>

//       <Dialog
//         open={detailsOpen}
//         onClose={() => setDetailsOpen(false)}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle>
//           <Box
//             display="flex"
//             alignItems="center"
//             justifyContent="space-between"
//           >
//             <Typography variant="h6">
//               Trunk Status: {status.endpoint}
//             </Typography>
//             <Box display="flex" alignItems="center">
//               <Tooltip title="Refresh status">
//                 <IconButton
//                   onClick={handleRefresh}
//                   disabled={refreshing}
//                   size="small"
//                   sx={{ mr: 1 }}
//                 >
//                   {refreshing ? (
//                     <CircularProgress size={18} />
//                   ) : (
//                     <RefreshIcon />
//                   )}
//                 </IconButton>
//               </Tooltip>
//               <Tooltip
//                 title={`Last updated: ${new Date(
//                   status.timestamp
//                 ).toLocaleString()}`}
//               >
//                 <Box display="flex" alignItems="center">
//                   <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
//                   <Typography variant="body2">
//                     {getTimeAgo(status.timestamp)}
//                   </Typography>
//                 </Box>
//               </Tooltip>
//               <IconButton
//                 onClick={() => setDetailsOpen(false)}
//                 size="small"
//                 sx={{ ml: 1 }}
//               >
//                 <CloseIcon />
//               </IconButton>
//             </Box>
//           </Box>
//         </DialogTitle>
//         <DialogContent>
//           <Box mb={3}>
//             <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
//               <Typography variant="subtitle1" gutterBottom>
//                 Overview
//               </Typography>
//               <Box display="flex" flexWrap="wrap" gap={2}>
//                 <StatusItem
//                   label="Connection"
//                   value={status.available ? "Online" : "Offline"}
//                   icon={
//                     <WifiTetheringIcon
//                       color={status.available ? "success" : "error"}
//                     />
//                   }
//                 />
//                 <StatusItem
//                   label="Registration"
//                   value={status.registered ? "Registered" : "Not Registered"}
//                   icon={
//                     <CheckCircleIcon
//                       color={status.registered ? "success" : "error"}
//                     />
//                   }
//                 />
//                 <StatusItem
//                   label="Active Calls"
//                   value={status.active_channels || 0}
//                   icon={
//                     <PhoneInTalkIcon
//                       color={status.active_channels > 0 ? "primary" : "action"}
//                     />
//                   }
//                 />
//                 {status.latency_ms && (
//                   <StatusItem
//                     label="Response Time"
//                     value={`${status.latency_ms.toFixed(2)} ms`}
//                     icon={null}
//                   />
//                 )}
//               </Box>
//             </Paper>
//           </Box>

//           <Typography variant="subtitle1" gutterBottom>
//             Contacts
//           </Typography>
//           {status.details?.contacts && status.details.contacts.length > 0 ? (
//             <TableContainer component={Paper} sx={{ mb: 3 }}>
//               <Table size="small">
//                 <TableHead>
//                   <TableRow>
//                     <TableCell>URI</TableCell>
//                     <TableCell>Status</TableCell>
//                     <TableCell>Via</TableCell>
//                     <TableCell>Latency</TableCell>
//                     <TableCell>User Agent</TableCell>
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {status.details.contacts.map((contact, index) => (
//                     <TableRow key={index}>
//                       <TableCell
//                         sx={{
//                           maxWidth: 200,
//                           overflow: "hidden",
//                           textOverflow: "ellipsis",
//                         }}
//                       >
//                         <Tooltip title={contact.uri}>
//                           <span>{contact.uri}</span>
//                         </Tooltip>
//                       </TableCell>
//                       <TableCell>
//                         <Chip
//                           label={contact.status}
//                           size="small"
//                           color={contact.available ? "success" : "error"}
//                         />
//                       </TableCell>
//                       <TableCell>
//                         {contact.viaAddress}:{contact.viaPort}
//                       </TableCell>
//                       <TableCell>
//                         {contact.roundtripUsec
//                           ? `${(contact.roundtripUsec / 1000).toFixed(2)} ms`
//                           : "N/A"}
//                       </TableCell>
//                       <TableCell
//                         sx={{
//                           maxWidth: 150,
//                           overflow: "hidden",
//                           textOverflow: "ellipsis",
//                         }}
//                       >
//                         <Tooltip title={contact.userAgent || "Unknown"}>
//                           <span>{contact.userAgent || "Unknown"}</span>
//                         </Tooltip>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//           ) : (
//             <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
//               No active contacts found for this trunk.
//             </Typography>
//           )}

//           {status.details?.registration && (
//             <>
//               <Typography variant="subtitle1" gutterBottom>
//                 Registration
//               </Typography>
//               <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
//                 <List dense disablePadding>
//                   <ListItem>
//                     <ListItemText
//                       primary="Status"
//                       secondary={
//                         <Chip
//                           label={status.details.registration.status}
//                           size="small"
//                           color={
//                             status.details.registration.registered
//                               ? "success"
//                               : "error"
//                           }
//                         />
//                       }
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Server URI"
//                       secondary={status.details.registration.serverUri}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Client URI"
//                       secondary={status.details.registration.clientUri}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Expiration"
//                       secondary={
//                         status.details.registration.expiration
//                           ? `${status.details.registration.expiration} seconds`
//                           : "N/A"
//                       }
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Transport"
//                       secondary={
//                         status.details.registration.transport || "default"
//                       }
//                     />
//                   </ListItem>
//                 </List>
//               </Paper>
//             </>
//           )}

//           {status.details?.endpoint && (
//             <>
//               <Typography variant="subtitle1" gutterBottom>
//                 Endpoint Settings
//               </Typography>
//               <Paper elevation={1} sx={{ p: 2 }}>
//                 <List dense disablePadding>
//                   <ListItem>
//                     <ListItemText
//                       primary="Device State"
//                       secondary={status.details.endpoint.deviceState}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Transport"
//                       secondary={status.details.endpoint.transport}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="From"
//                       secondary={`${status.details.endpoint.fromUser}@${status.details.endpoint.fromDomain}`}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Context"
//                       secondary={status.details.endpoint.context}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Codecs"
//                       secondary={status.details.endpoint.allow}
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Direct Media"
//                       secondary={status.details.endpoint.directMedia}
//                     />
//                   </ListItem>
//                 </List>
//               </Paper>
//             </>
//           )}
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// };

// // Helper component for status items
// const StatusItem = ({ label, value, icon }) => (
//   <Box
//     display="flex"
//     alignItems="center"
//     border={1}
//     borderColor="divider"
//     borderRadius={1}
//     p={1}
//     minWidth={120}
//   >
//     {icon && <Box mr={1}>{icon}</Box>}
//     <Box>
//       <Typography variant="caption" color="textSecondary" display="block">
//         {label}
//       </Typography>
//       <Typography variant="body2" fontWeight="medium">
//         {value}
//       </Typography>
//     </Box>
//   </Box>
// );

// export default TrunkStatusIndicator;
