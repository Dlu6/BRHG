// // src/features/registration/registrationSlice.js
// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import io from "socket.io-client";

// // Socket instance
// let socket = null;

// // Async thunks
// export const initializeRegistration = createAsyncThunk(
//   "registration/initialize",
//   async ({ token, extension }, { dispatch, rejectWithValue }) => {
//     try {
//       // Validate inputs
//       if (!token) {
//         return rejectWithValue("TOKEN_MISSING");
//       }

//       if (!extension) {
//         return rejectWithValue("EXTENSION_MISSING");
//       }

//       // Cleanup existing socket
//       if (socket?.connected) {
//         socket.disconnect();
//       }

//       // Create new socket connection with auth header
//       socket = io("http://localhost:8004", {
//         auth: {
//           token: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
//         },
//         extraHeaders: {
//           Authorization: token.startsWith("Bearer ")
//             ? token
//             : `Bearer ${token}`,
//         },
//         transports: ["websocket"],
//         path: "/socket.io/",
//         withCredentials: true,
//         timeout: 5000, // Reduced timeout
//         autoConnect: false, // Important: we'll connect manually
//       });

//       return new Promise((resolve, reject) => {
//         const connectionTimeout = setTimeout(() => {
//           socket.close();
//           reject(new Error("Connection timeout"));
//         }, 5000);

//         socket.on("connect", () => {
//           clearTimeout(connectionTimeout);
//           console.log("[Socket] Connected, registering extension:", extension);
//           socket.emit("register_extension", { extension });
//           resolve({ connected: true, extension });
//         });

//         socket.on("connect_error", (error) => {
//           clearTimeout(connectionTimeout);
//           console.error("[Socket] Connection error:", error);
//           socket.close();
//           reject(error);
//         });

//         // Setup other event listeners first
//         socket.on("extension:status", (data) => {
//           dispatch(updateRegistrationStatus(data));
//         });

//         // ... other event listeners ...

//         // Connect after setting up listeners
//         console.log("[Socket] Attempting connection...");
//         socket.connect();
//       });
//     } catch (error) {
//       console.error("[Registration] Initialization failed:", error);
//       return rejectWithValue(error.message || "Connection failed");
//     }
//   }
// );

// export const cleanupRegistration = createAsyncThunk(
//   "registration/cleanup",
//   async () => {
//     if (socket) {
//       socket.removeAllListeners();
//       socket.close();
//       socket = null;
//     }
//   }
// );

// // Slice
// const initialState = {
//   status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
//   error: null,
//   connectionStatus: "disconnected", // 'disconnected' | 'connecting' | 'connected'
//   data: {
//     endpoint: null,
//     registered: false,
//     registrationExpiry: null,
//     lastRegistration: null,
//     contactUri: null,
//     userAgent: null,
//     timestamp: null,
//     state: "Unregistered",
//     presence: "NOT_READY",
//   },
// };

// const registrationSlice = createSlice({
//   name: "registration",
//   initialState,
//   reducers: {
//     updateConnectionStatus: (state, action) => {
//       state.connectionStatus = action.payload;
//     },
//     updateRegistrationStatus: (state, action) => {
//       console.log("[Slice] Registration status update:", action.payload);
//       state.status = "succeeded";
//       state.error = null;
//       state.data = {
//         ...state.data,
//         ...action.payload,
//         registered: action.payload.state === "Registered",
//         timestamp: new Date().toISOString(),
//       };
//     },
//     updatePresenceState: (state, action) => {
//       state.data.presence = action.payload;
//     },
//     registrationError: (state, action) => {
//       state.status = "failed";
//       state.error = action.payload;
//       state.data.state = "Unregistered";
//       state.data.registered = false;
//     },
//     resetRegistration: () => initialState,
//   },
//   extraReducers: (builder) => {
//     builder
//       // Initialize registration
//       .addCase(initializeRegistration.pending, (state) => {
//         state.connectionStatus = "connecting";
//         state.status = "loading";
//         state.error = null;
//       })
//       .addCase(initializeRegistration.fulfilled, (state, action) => {
//         state.connectionStatus = "connected";
//         state.status = "succeeded";
//         state.data.endpoint = action.payload.extension;
//         state.error = null;
//       })
//       .addCase(initializeRegistration.rejected, (state, action) => {
//         state.connectionStatus = "disconnected";
//         state.status = "failed";
//         state.error = action.payload || "Connection failed";
//       })
//       // Cleanup
//       .addCase(cleanupRegistration.fulfilled, (state) => {
//         return initialState;
//       });
//   },
// });

// // Actions
// export const {
//   updateRegistrationStatus,
//   updatePresenceState,
//   registrationError,
//   resetRegistration,
//   updateConnectionStatus,
// } = registrationSlice.actions;

// // Selectors
// export const selectRegistrationData = (state) => state.registration.data;
// export const selectIsRegistered = (state) => state.registration.data.registered;
// export const selectRegistrationError = (state) => state.registration.error;
// export const selectPresenceState = (state) => state.registration.data.presence;
// export const selectConnectionStatus = (state) =>
//   state.registration.connectionStatus;

// export default registrationSlice.reducer;
