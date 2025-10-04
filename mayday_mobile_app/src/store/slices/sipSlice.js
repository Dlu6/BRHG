import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { sipEvents, initializeSIP } from "../../services/sipClient";

export const registerSip = createAsyncThunk(
  "sip/register",
  async (sipConfig, { dispatch }) => {
    dispatch(setConnecting(true));
    if (sipConfig?.server) {
      dispatch(setDomain(sipConfig.server));
    }

    // A promise that resolves or rejects based on SIP registration events
    const registrationPromise = new Promise((resolve, reject) => {
      const onRegistered = () => {
        console.log("[sipSlice] Registration successful");
        dispatch(setRegistered(true));
        cleanup();
        resolve();
      };

      const onRegistrationFailed = (e) => {
        console.error("[sipSlice] Registration failed", e);
        dispatch(setRegistered(false));
        cleanup();
        reject(new Error(e?.cause || "SIP registration failed"));
      };

      const onUnregistered = () => {
        console.log("[sipSlice] SIP unregistered");
        dispatch(setRegistered(false));
        // Don't reject here as it might be an intentional unregister
      };

      const cleanup = () => {
        sipEvents.removeListener("registered", onRegistered);
        sipEvents.removeListener("registrationFailed", onRegistrationFailed);
        sipEvents.removeListener("unregistered", onUnregistered);
      };

      sipEvents.on("registered", onRegistered);
      sipEvents.on("registrationFailed", onRegistrationFailed);
      sipEvents.on("unregistered", onUnregistered);

      // Timeout in case no event is received
      setTimeout(() => {
        cleanup();
        reject(new Error("SIP registration timed out."));
      }, 15000); // 15 seconds timeout
    });

    try {
      // Initialize the SIP client
      await initializeSIP(sipConfig);
      // Wait for the registration event
      await registrationPromise;
    } catch (error) {
      // Rethrow to let createAsyncThunk handle the rejection
      throw error;
    } finally {
      dispatch(setConnecting(false));
    }
  }
);

const initialState = {
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  registered: false,
  connecting: false,
  domain: null,
};

const sipSlice = createSlice({
  name: "sip",
  initialState,
  reducers: {
    setRegistered(state, action) {
      state.registered = action.payload;
      if (action.payload) {
        state.status = "succeeded";
        state.error = null;
      }
    },
    setConnecting(state, action) {
      state.connecting = action.payload;
      if (action.payload) {
        state.status = "loading";
      }
    },
    setDomain(state, action) {
      state.domain = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerSip.pending, (state) => {
        state.status = "loading";
        state.connecting = true;
        state.error = null;
      })
      .addCase(registerSip.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.connecting = false;
        state.registered = true;
      })
      .addCase(registerSip.rejected, (state, action) => {
        state.status = "failed";
        state.connecting = false;
        state.registered = false;
        state.error = action.error.message;
      });
  },
});

export const { setRegistered, setConnecting, setDomain } = sipSlice.actions;
export default sipSlice.reducer;
