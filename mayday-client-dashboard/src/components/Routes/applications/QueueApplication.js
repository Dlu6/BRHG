// import React, { useEffect, useState } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogActions,
//   DialogTitle,
//   TextField,
//   Button,
//   Paper,
//   IconButton,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel
// } from '@mui/material';
// import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
// import CloseIcon from '@mui/icons-material/Close';

// const QueueApplication = ({ onSave, initialQueueSettings, onToggle, open }) => {
//   const [queueSettings, setQueueSettings] = useState(initialQueueSettings);


//   useEffect(() => {
//     setQueueSettings(initialQueueSettings);
//   }, [initialQueueSettings]);

//   // const handleClickOpen = () => setOpen(true);

//   const handleClose = () => {
//     // setOpen(false);
//     onToggle(false);
//   };

//   const handleSave = () => {
//     onSave(queueSettings);
//     handleClose();
//   };

//   const handleChange = (event) => {
//     setQueueSettings({
//       ...queueSettings,
//       [event.target.name]: event.target.value
//     });
//   };

//   return (
//     <>
//       <Paper
//         elevation={3}
//         style={{
//           display: 'flex',
//           alignItems: 'center',
//           padding: '8px',
//           margin: '8px',
//           cursor: 'grab',
//           fontSize: '14px'
//         }}
//       // onClick={handleClickOpen}
//       >
//         <IconButton
//           size="small"
//           style={{ marginRight: '8px' }}
//           disabled
//         >
//           <DragIndicatorIcon />
//         </IconButton>
//         Queue
//       </Paper>
//       <Dialog open={open} onClose={handleClose}>
//         <DialogTitle style={{ backgroundColor: '#2C5FC4', color: 'white' }}>
//           Edit Queue
//           <IconButton
//             aria-label="close"
//             onClick={handleClose}
//             style={{
//               position: 'absolute',
//               right: 8,
//               top: 8,
//               color: 'white',
//             }}
//           >
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>

//         <DialogContent>
//           <TextField
//             autoFocus
//             margin="dense"
//             name="queue"
//             label="Queue *"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={queueSettings.queue}
//             onChange={handleChange}
//           />
//           <TextField
//             margin="dense"
//             name="options"
//             label="Options"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={queueSettings.options}
//             onChange={handleChange}
//           />
//           <TextField
//             margin="dense"
//             name="url"
//             label="URL"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={queueSettings.url}
//             onChange={handleChange}
//           />
//           <FormControl fullWidth margin="dense">
//             <InputLabel id="announce-override-label">Announce Overrides</InputLabel>
//             <Select
//               labelId="announce-override-label"
//               id="announceOverride"
//               name="announceOverride"
//               value={queueSettings.announceOverride}
//               onChange={handleChange}
//               label="Announce Overrides"
//             >
//               <MenuItem value="None">None</MenuItem>
//               <MenuItem value="Timeout">Timeout</MenuItem>
//             </Select>
//           </FormControl>
//           <TextField
//             margin="dense"
//             name="timeout"
//             label="Timeout"
//             type="number"
//             fullWidth
//             variant="standard"
//             value={queueSettings.timeout}
//             onChange={handleChange}
//           />
//           <TextField
//             margin="dense"
//             name="agi"
//             label="Agi"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={queueSettings.agi}
//             onChange={handleChange}
//           />
//           <TextField
//             margin="dense"
//             name="macro"
//             label="Macro"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={queueSettings.macro}
//             onChange={handleChange}
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={handleClose}>Cancel</Button>
//           <Button onClick={handleSave}>Save</Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// };

// export default QueueApplication;
