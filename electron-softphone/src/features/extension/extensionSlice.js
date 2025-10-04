// // src/features/extension/extensionSlice.js
// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// // import { websocketService } from "../../services/websocketService";

// // Async thunk for getting initial extension status
// export const fetchExtensionStatus = createAsyncThunk(
//   "extension/fetchStatus",
//   // async (extension) => {
//   //   // websocketService.emit("get:extension:status", { extension });
//   //   // // This will be updated through websocket events
//   //   // return null;
//   //   return extension;
//   // }
//   async (extension) => extension
// );

// const initialState = {
//   // status: {
//   //   registration: "Unregistered", // registered, unregistered, error
//   //   presence: "OFFLINE", // READY, BREAK, ON_CALL etc
//   //   device: "Unknown", // From AMI device state
//   //   transport: null,
//   //   contactUri: null,
//   //   roundtripUsec: null,
//   //   lastUpdate: null,
//   // },
//   details: {
//     extension: null,
//     aor: null,
//     transport: null,
//     roundtripUsec: null,
//     userAgent: null,
//   },
//   call: {
//     active: false,
//     channelId: null,
//     status: null,
//     remote: null,
//   },
// };

// const extensionSlice = createSlice({
//   name: "extension",
//   initialState,
//   reducers: {
//     // updateExtensionStatus(state, action) {
//     //   const {
//     //     registered,
//     //     state: deviceState,
//     //     transport,
//     //     lastActivity,
//     //     roundtripUsec,
//     //     userAgent,
//     //   } = action.payload;

//     //   state.status = {
//     //     registration: registered ? "Registered" : "Unregistered",
//     //     device: deviceState,
//     //     transport,
//     //     lastUpdate: lastActivity,
//     //     roundtripUsec,
//     //   };

//     //   state.details = {
//     //     ...state.details,
//     //     userAgent,
//     //   };
//     // },
//     // setPresenceState(state, action) {
//     //   state.status.presence = action.payload;
//     // },
//     updateCallState(state, action) {
//       state.call = {
//         ...state.call,
//         ...action.payload,
//       };
//     },
//   },
//   extraReducers: (builder) => {},
// });

// // Selectors
// export const { updateCallState } = extensionSlice.actions;

// // export const selectExtensionStatus = (state) => state.extension.status;
// // export const selectExtensionDetails = (state) => state.extension.details;
// export const selectCallState = (state) => state.extension.call;

// export default extensionSlice.reducer;
