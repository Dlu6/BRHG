// // src/middleware/websocketMiddleware.js
// import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
// import { websocketService } from "../../services/websocketService";
// // import { updateCallState } from "../../features/extension/extensionSlice";

// import {
//   updateRegistrationStatus,
//   registrationError,
//   updatePresenceState,
// } from "../../features/extension/registrationSlice";

// export const listenerMiddleware = createListenerMiddleware();

// // Registration handling
// listenerMiddleware.startListening({
//   actionCreator: updateRegistrationStatus,
//   effect: async (action, listenerApi) => {
//     try {
//       console.log("[Middleware] Registration status updated:", action.payload);
//     } catch (error) {
//       listenerApi.dispatch(registrationError(error.message));
//     }
//   },
// });

// // Presence handling
// listenerMiddleware.startListening({
//   actionCreator: updatePresenceState,
//   effect: async (action, listenerApi) => {
//     try {
//       websocketService.emit("presence:update", { state: action.payload });
//     } catch (error) {
//       console.error("Presence update error:", error);
//     }
//   },
// });

// // Call handling
// listenerMiddleware.startListening({
//   matcher: isAnyOf(),
//   effect: async (action, listenerApi) => {
//     try {
//       const { type, channelId, number } = action.payload;

//       switch (type) {
//         case "initiate":
//           websocketService.emit("call:initiate", { number });
//           break;
//         case "end":
//           websocketService.emit("call:end", { channelId });
//           break;
//         case "dtmf":
//           websocketService.emit("dtmf:send", {
//             digit: action.payload.digit,
//             channelId,
//           });
//           break;
//         default:
//           break;
//       }
//     } catch (error) {
//       console.error("Call action error:", error);
//     }
//   },
// });

// // Export the middleware
// export default listenerMiddleware;
