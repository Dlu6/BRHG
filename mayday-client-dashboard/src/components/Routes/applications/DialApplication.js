// import React, { useEffect, useState } from 'react';
// import { Dialog, DialogContent, DialogActions, DialogTitle, TextField, Button, Paper, IconButton } from '@mui/material';
// import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
// import CloseIcon from '@mui/icons-material/Close';

// const DialApplication = ({ onSave, initialDialSettings, onToggle, open }) => {
//   const [dialSettings, setDialSettings] = useState(initialDialSettings);

//   useEffect(() => {
//     setDialSettings(initialDialSettings);
//   }, [initialDialSettings]);

//   const handleClose = () => {
//     onToggle(false);
//   };

//   const handleSave = () => {
//     onSave(dialSettings);
//     handleClose();
//   };

//   const handleInputChange = (event) => {
//     setDialSettings({
//       ...dialSettings,
//       [event.target.name]: event.target.value,
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
//       >
//         <IconButton
//           size="small"
//           style={{ marginRight: '8px' }}
//           disabled
//         >
//           <DragIndicatorIcon />
//         </IconButton>
//         Dial
//       </Paper>
//       <Dialog open={open} onClose={handleClose}>
//         <DialogTitle style={{ backgroundColor: '#2C5FC4', color: 'white' }}>
//           Edit Dial
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
//             name="technologyResource"
//             label="Technology/Resource *"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={dialSettings.technologyResource}
//             onChange={handleInputChange}
//           />
//           <TextField
//             margin="dense"
//             name="timeout"
//             label="Timeout"
//             type="number"
//             fullWidth
//             variant="standard"
//             value={dialSettings.timeout}
//             onChange={handleInputChange}
//           />
//           <TextField
//             margin="dense"
//             name="options"
//             label="Options"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={dialSettings.options}
//             onChange={handleInputChange}
//           />
//           <TextField
//             margin="dense"
//             name="url"
//             label="URL"
//             type="text"
//             fullWidth
//             variant="standard"
//             value={dialSettings.url}
//             onChange={handleInputChange}
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

// export default DialApplication;
