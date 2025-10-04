import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as agentService from "../../services/agentService";

export const fetchAgentStatus = createAsyncThunk(
  "agent/fetchStatus",
  async (_, { getState }) => {
    const { token } = getState().auth;
    const response = await agentService.getPauseStatus(token);
    return response.data;
  }
);

export const pauseAgent = createAsyncThunk(
  "agent/pause",
  async (reason, { getState }) => {
    const { token } = getState().auth;
    const response = await agentService.pause(token, reason);
    return response.data;
  }
);

export const unpauseAgent = createAsyncThunk(
  "agent/unpause",
  async (_, { getState }) => {
    const { token } = getState().auth;
    const response = await agentService.unpause(token);
    return response.data;
  }
);

export const fetchAgentProfile = createAsyncThunk(
  "agent/fetchProfile",
  async (_, { getState }) => {
    const { token } = getState().auth;
    const response = await agentService.getProfile(token);
    return response.data;
  }
);

export const fetchAllAgentsStatus = createAsyncThunk(
  "agent/fetchAllAgentsStatus",
  async (_, { getState }) => {
    const { token } = getState().auth;
    const response = await agentService.getAllAgentsStatus(token);
    return response.data;
  }
);

const initialState = {
  isPaused: false,
  pauseReason: null,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  profile: null,
  agents: [],
};

const agentSlice = createSlice({
  name: "agent",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handle fulfillment cases first
      .addCase(fetchAgentStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isPaused = action.payload.isPaused;
        state.pauseReason = action.payload.pauseReason;
      })
      .addCase(pauseAgent.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.isPaused = true;
        state.pauseReason = action.payload.pauseReason;
      })
      .addCase(unpauseAgent.fulfilled, (state) => {
        state.status = "succeeded";
        state.isPaused = false;
        state.pauseReason = null;
      })
      .addCase(fetchAgentProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(fetchAllAgentsStatus.fulfilled, (state, action) => {
        state.agents = action.payload?.agents || [];
      })
      // Now handle generic matchers for pending/rejected
      .addMatcher(
        (action) =>
          [
            fetchAgentStatus.pending,
            pauseAgent.pending,
            unpauseAgent.pending,
            fetchAgentProfile.pending,
            fetchAllAgentsStatus.pending,
          ].includes(action.type),
        (state) => {
          state.status = "loading";
          state.error = null;
        }
      )
      // Shared rejected state
      .addMatcher(
        (action) =>
          [
            fetchAgentStatus.rejected,
            pauseAgent.rejected,
            unpauseAgent.rejected,
            fetchAgentProfile.rejected,
            fetchAllAgentsStatus.rejected,
          ].includes(action.type),
        (state, action) => {
          state.status = "failed";
          state.error = action.error.message;
        }
      );
  },
});

export default agentSlice.reducer;
