// NOT USING THIS CURRENTLY
// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import callReducer from "../features/calls/callSlice";
// import registrationReducer from "../features/extension/registrationSlice"; // Update path

// Create array of middleware for logger
const customMiddleware = [];

// Add logger middleware in development
if (process.env.NODE_ENV === "development") {
  const { createLogger } = require("redux-logger");
  customMiddleware.push(
    createLogger({
      collapsed: true,
      duration: true,
      timestamp: true,
    })
  );
}

const store = configureStore({
  reducer: {
    calls: callReducer,
    // registration: registrationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "registration/initialize",
          "registration/cleanup",
          "registration/updateRegistrationStatus",
          "calls/initiateCall",
          "calls/endCall",
        ],
        ignoredActionPaths: [
          "payload.timestamp",
          "payload.socket",
          "payload.token",
        ],
        ignoredPaths: [
          "calls.session",
          "registration.data.timestamp",
          "registration.data.lastRegistration",
          "registration.data.registrationExpiry",
          "registration.socket",
        ],
      },
    }).concat(customMiddleware),
  devTools: process.env.NODE_ENV !== "production",
  enhancers: (getDefaultEnhancers) => getDefaultEnhancers(),
});

// Debug helpers in development
if (process.env.NODE_ENV === "development") {
  window.__REDUX_STORE__ = store;
  window.debugRedux = {
    getState: store.getState,
    dispatch: store.dispatch,
  };
}

export default store;
