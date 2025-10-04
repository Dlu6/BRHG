// import React, { useState } from "react";
// import {
//   Box,
//   Typography,
//   TextField,
//   InputAdornment,
//   IconButton,
//   Grid,
//   Card,
//   CardContent,
//   Avatar,
//   Chip,
//   Tooltip,
//   Menu,
//   MenuItem,
//   ListItemIcon,
//   Divider,
//   Button,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   FormControl,
//   InputLabel,
//   Select,
//   CircularProgress,
// } from "@mui/material";
// import {
//   Search,
//   Add,
//   Phone,
//   Email,
//   Edit,
//   Delete,
//   Star,
//   StarBorder,
//   MoreVert,
//   WhatsApp,
//   Business,
//   Person,
//   Group,
//   Refresh,
// } from "@mui/icons-material";
// import ContentFrame from "./ContentFrame";

// // Dummy data for contacts
// const dummyContacts = [
//   {
//     id: 1,
//     name: "Juma Monday",
//     company: "Jinja Counselling",
//     phone: "+256700777777",
//     email: "juma.monday@jinja.com",
//     type: "business",
//     favorite: true,
//     avatar: "JM",
//     tags: ["Customer", "VIP"],
//   },
//   {
//     id: 2,
//     name: "Sarah Baker",
//     company: "Kampala Counsellor",
//     phone: "+256700777777",
//     email: "sarah.baker@kampala.com",
//     type: "business",
//     favorite: false,
//     avatar: "SB",
//     tags: ["Supplier"],
//   },
//   // Add more dummy contacts as needed
// ];

// const ContactCard = ({
//   contact,
//   onEdit,
//   onDelete,
//   onToggleFavorite,
//   onWhatsAppChat,
// }) => {
//   const [anchorEl, setAnchorEl] = useState(null);

//   const handleMenuOpen = (event) => {
//     setAnchorEl(event.currentTarget);
//   };

//   const handleMenuClose = () => {
//     setAnchorEl(null);
//   };

//   return (
//     <Card
//       elevation={0}
//       sx={{
//         border: 1,
//         borderColor: "divider",
//         transition: "transform 0.2s ease, box-shadow 0.2s ease",
//         "&:hover": {
//           transform: "translateY(-2px)",
//           boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
//         },
//       }}
//     >
//       <CardContent>
//         <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
//           <Avatar
//             sx={{
//               bgcolor: contact.type === "business" ? "#1976d2" : "#2e7d32",
//               mr: 2,
//             }}
//           >
//             {contact.avatar}
//           </Avatar>
//           <Box sx={{ flexGrow: 1 }}>
//             <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500 }}>
//               {contact.name}
//             </Typography>
//             <Typography variant="caption" color="text.secondary">
//               {contact.company}
//             </Typography>
//           </Box>
//           <IconButton size="small" onClick={() => onToggleFavorite(contact.id)}>
//             {contact.favorite ? (
//               <Star sx={{ color: "#ffc107" }} />
//             ) : (
//               <StarBorder />
//             )}
//           </IconButton>
//           <IconButton size="small" onClick={handleMenuOpen}>
//             <MoreVert />
//           </IconButton>
//         </Box>

//         <Grid container spacing={1}>
//           <Grid item xs={12}>
//             <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
//               <Phone fontSize="small" color="action" />
//               <Typography variant="body2">{contact.phone}</Typography>
//             </Box>
//           </Grid>
//           <Grid item xs={12}>
//             <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
//               <Email fontSize="small" color="action" />
//               <Typography variant="body2">{contact.email}</Typography>
//             </Box>
//           </Grid>
//         </Grid>

//         <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
//           {contact.tags.map((tag) => (
//             <Chip
//               key={tag}
//               label={tag}
//               size="small"
//               sx={{ bgcolor: "action.selected" }}
//             />
//           ))}
//         </Box>

//         <Menu
//           anchorEl={anchorEl}
//           open={Boolean(anchorEl)}
//           onClose={handleMenuClose}
//           PaperProps={{
//             sx: {
//               minWidth: 180,
//             },
//           }}
//         >
//           <MenuItem
//             onClick={() => {
//               handleMenuClose();
//               onEdit(contact);
//             }}
//           >
//             <ListItemIcon>
//               <Edit fontSize="small" />
//             </ListItemIcon>
//             Edit Contact
//           </MenuItem>
//           <MenuItem onClick={() => window.open(`tel:${contact.phone}`)}>
//             <ListItemIcon>
//               <Phone fontSize="small" />
//             </ListItemIcon>
//             Call
//           </MenuItem>
//           <MenuItem
//             onClick={() => {
//               handleMenuClose();
//               onWhatsAppChat(contact);
//             }}
//           >
//             <ListItemIcon>
//               <WhatsApp fontSize="small" />
//             </ListItemIcon>
//             WhatsApp
//           </MenuItem>
//           <Divider />
//           <MenuItem
//             onClick={() => {
//               handleMenuClose();
//               onDelete(contact.id);
//             }}
//             sx={{ color: "error.main" }}
//           >
//             <ListItemIcon>
//               <Delete fontSize="small" sx={{ color: "error.main" }} />
//             </ListItemIcon>
//             Delete
//           </MenuItem>
//         </Menu>
//       </CardContent>
//     </Card>
//   );
// };

// const ContactDialog = ({ open, onClose, contact, onSave }) => {
//   const [formData, setFormData] = useState({
//     name: "",
//     company: "",
//     phone: "",
//     email: "",
//     type: "personal",
//     tags: [],
//     ...contact, // Spread existing contact data if editing
//   });

//   const [newTag, setNewTag] = useState("");

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleAddTag = () => {
//     if (newTag && !formData.tags.includes(newTag)) {
//       setFormData((prev) => ({
//         ...prev,
//         tags: [...prev.tags, newTag],
//       }));
//       setNewTag("");
//     }
//   };

//   const handleRemoveTag = (tagToRemove) => {
//     setFormData((prev) => ({
//       ...prev,
//       tags: prev.tags.filter((tag) => tag !== tagToRemove),
//     }));
//   };

//   const handleSubmit = () => {
//     onSave(formData);
//     onClose();
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
//       <DialogTitle>{contact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
//       <DialogContent>
//         <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
//           <TextField
//             fullWidth
//             label="Name"
//             name="name"
//             value={formData.name}
//             onChange={handleChange}
//             required
//           />
//           <TextField
//             fullWidth
//             label="Company"
//             name="company"
//             value={formData.company}
//             onChange={handleChange}
//           />
//           <TextField
//             fullWidth
//             label="Phone"
//             name="phone"
//             value={formData.phone}
//             onChange={handleChange}
//             required
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <Phone fontSize="small" />
//                 </InputAdornment>
//               ),
//             }}
//           />
//           <TextField
//             fullWidth
//             label="Email"
//             name="email"
//             type="email"
//             value={formData.email}
//             onChange={handleChange}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <Email fontSize="small" />
//                 </InputAdornment>
//               ),
//             }}
//           />
//           <FormControl fullWidth>
//             <InputLabel>Contact Type</InputLabel>
//             <Select
//               name="type"
//               value={formData.type}
//               onChange={handleChange}
//               label="Contact Type"
//             >
//               <MenuItem value="personal">
//                 <ListItemIcon>
//                   <Person fontSize="small" />
//                 </ListItemIcon>
//                 Personal
//               </MenuItem>
//               <MenuItem value="business">
//                 <ListItemIcon>
//                   <Business fontSize="small" />
//                 </ListItemIcon>
//                 Business
//               </MenuItem>
//             </Select>
//           </FormControl>

//           {/* Tags Section */}
//           <Box>
//             <Typography variant="subtitle2" gutterBottom>
//               Tags
//             </Typography>
//             <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
//               {formData.tags.map((tag) => (
//                 <Chip
//                   key={tag}
//                   label={tag}
//                   onDelete={() => handleRemoveTag(tag)}
//                   size="small"
//                 />
//               ))}
//             </Box>
//             <Box sx={{ display: "flex", gap: 1 }}>
//               <TextField
//                 size="small"
//                 placeholder="Add tag"
//                 value={newTag}
//                 onChange={(e) => setNewTag(e.target.value)}
//                 onKeyPress={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     handleAddTag();
//                   }
//                 }}
//               />
//               <Button
//                 size="small"
//                 variant="outlined"
//                 onClick={handleAddTag}
//                 disabled={!newTag}
//               >
//                 Add
//               </Button>
//             </Box>
//           </Box>
//         </Box>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button
//           variant="contained"
//           onClick={handleSubmit}
//           disabled={!formData.name || !formData.phone}
//         >
//           {contact ? "Save Changes" : "Add Contact"}
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// const Contacts = ({ open, onClose, onWhatsAppChat }) => {
//   const [contacts, setContacts] = useState(dummyContacts);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterType, setFilterType] = useState("all");
//   const [isLoading, setIsLoading] = useState(false);
//   const [openDialog, setOpenDialog] = useState(false);
//   const [editContact, setEditContact] = useState(null);

//   const handleRefresh = () => {
//     setIsLoading(true);
//     // Simulate API call
//     setTimeout(() => {
//       setIsLoading(false);
//     }, 1000);
//   };

//   const handleToggleFavorite = (contactId) => {
//     setContacts(
//       contacts.map((contact) =>
//         contact.id === contactId
//           ? { ...contact, favorite: !contact.favorite }
//           : contact
//       )
//     );
//   };

//   const filteredContacts = contacts.filter((contact) => {
//     const matchesSearch =
//       contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       contact.phone.includes(searchQuery) ||
//       contact.email.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchesFilter =
//       filterType === "all" ||
//       (filterType === "favorites" && contact.favorite) ||
//       contact.type === filterType;
//     return matchesSearch && matchesFilter;
//   });

//   const handleSaveContact = (contactData) => {
//     if (editContact) {
//       // Update existing contact
//       setContacts(
//         contacts.map((c) =>
//           c.id === editContact.id
//             ? { ...contactData, id: editContact.id, favorite: c.favorite }
//             : c
//         )
//       );
//     } else {
//       // Add new contact
//       setContacts([
//         ...contacts,
//         {
//           ...contactData,
//           id: Date.now(), // Simple ID generation
//           favorite: false,
//           avatar: contactData.name
//             .split(" ")
//             .map((n) => n[0])
//             .join("")
//             .toUpperCase(),
//         },
//       ]);
//     }
//     setOpenDialog(false);
//   };

//   const handleWhatsAppChat = (contact) => {
//     // Format the contact data to match WhatsApp component's chat format
//     const whatsAppContact = {
//       id: `wa-${contact.id}`,
//       name: contact.name,
//       phoneNumber: contact.phone.replace(/\D/g, ""), // Strip non-digits
//       avatar: contact.avatar,
//       isGroup: false,
//       messages: [], // Initial empty messages
//       unread: 0,
//       isOnline: false,
//       timestamp: new Date().toISOString(),
//     };

//     onWhatsAppChat(whatsAppContact);
//   };

//   return (
//     <ContentFrame
//       open={open}
//       onClose={onClose}
//       title={
//         <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
//           <Typography variant="h6">Contacts</Typography>
//           <Tooltip title="Refresh">
//             <IconButton
//               size="small"
//               onClick={handleRefresh}
//               sx={{ color: "inherit" }}
//             >
//               {isLoading ? (
//                 <CircularProgress size={20} color="inherit" />
//               ) : (
//                 <Refresh />
//               )}
//             </IconButton>
//           </Tooltip>
//         </Box>
//       }
//       headerColor="#7b1fa2"
//     >
//       <Box sx={{ p: 3 }}>
//         {/* Controls */}
//         <Grid container spacing={2} sx={{ mb: 3 }}>
//           <Grid item xs={12} md={6}>
//             <TextField
//               fullWidth
//               variant="outlined"
//               size="small"
//               placeholder="Search contacts..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               InputProps={{
//                 startAdornment: (
//                   <InputAdornment position="start">
//                     <Search />
//                   </InputAdornment>
//                 ),
//               }}
//             />
//           </Grid>
//           <Grid item xs={12} md={3}>
//             <FormControl fullWidth size="small">
//               <InputLabel>Filter</InputLabel>
//               <Select
//                 value={filterType}
//                 label="Filter"
//                 onChange={(e) => setFilterType(e.target.value)}
//               >
//                 <MenuItem value="all">All Contacts</MenuItem>
//                 <MenuItem value="favorites">Favorites</MenuItem>
//                 <MenuItem value="business">Business</MenuItem>
//                 <MenuItem value="personal">Personal</MenuItem>
//               </Select>
//             </FormControl>
//           </Grid>
//           <Grid item xs={12} md={3}>
//             <Button
//               fullWidth
//               variant="contained"
//               startIcon={<Add />}
//               onClick={() => {
//                 setEditContact(null);
//                 setOpenDialog(true);
//               }}
//             >
//               Add Contact
//             </Button>
//           </Grid>
//         </Grid>

//         {/* Contact Cards */}
//         <Grid container spacing={2}>
//           {filteredContacts.map((contact) => (
//             <Grid item xs={12} sm={6} md={4} key={contact.id}>
//               <ContactCard
//                 contact={contact}
//                 onEdit={(contact) => {
//                   setEditContact(contact);
//                   setOpenDialog(true);
//                 }}
//                 onDelete={(id) => {
//                   setContacts(contacts.filter((c) => c.id !== id));
//                 }}
//                 onToggleFavorite={handleToggleFavorite}
//                 onWhatsAppChat={handleWhatsAppChat}
//               />
//             </Grid>
//           ))}
//         </Grid>

//         {/* Add/Edit Contact Dialog */}
//         <ContactDialog
//           open={openDialog}
//           onClose={() => setOpenDialog(false)}
//           contact={editContact}
//           onSave={handleSaveContact}
//         />
//       </Box>
//     </ContentFrame>
//   );
// };

// export default Contacts;
