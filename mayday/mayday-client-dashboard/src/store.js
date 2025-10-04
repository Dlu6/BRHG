//store.js

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice.js";
import agentsReducer from "./features/agents/agentsSlice.js";
import networkReducer from "./features/network/networkSlice.js";
import trunkReducer from "./features/trunks/trunkSlice.js";
import inboundRouteReducer from "./features/inboundRoutes/inboundRouteSlice.js";
import voiceQueueReducer from "./features/voiceQueues/voiceQueueSlice.js";
import audioReducer from "./features/audio/audioSlice.js";
import outboundRouteReducer from "./features/outboundRoutes/outboundRouteSlice.js";
import reportsReducer from "./features/reports/reportsSlice.js";
import ivrReducer from "./features/ivr/ivrSlice.js";
import intervalReducer from "./features/intervals/intervalSlice.js";
import recordingsReducer from "./features/recordings/recordingsSlice.js";
import systemReducer from "./features/system/systemSlice.js";
import odbcReducer from "./features/odbc/odbcSlice.js";
import licenseReducer from "./features/licenses/licenseSlice.js";
import integrationsReducer from "./features/integrations/integrationsSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    agents: agentsReducer,
    network: networkReducer,
    trunk: trunkReducer,
    inboundRoute: inboundRouteReducer,
    voiceQueue: voiceQueueReducer,
    audio: audioReducer,
    outboundRoute: outboundRouteReducer,
    reports: reportsReducer,
    ivr: ivrReducer,
    intervals: intervalReducer,
    recordings: recordingsReducer,
    system: systemReducer,
    odbc: odbcReducer,
    licenses: licenseReducer,
    integrations: integrationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
