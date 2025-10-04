import { configureStore } from "@reduxjs/toolkit";
import auth from "./slices/authSlice";
import sip from "./slices/sipSlice";
import call from "./slices/callSlice";
import notifications from "./slices/notificationsSlice";
import settings from "./slices/settingsSlice";
import agent from "./slices/agentSlice";
import dashboard from "./slices/dashboardSlice";

export const store = configureStore({
  reducer: {
    auth,
    sip,
    call,
    notifications,
    settings,
    agent,
    dashboard,
  },
});
