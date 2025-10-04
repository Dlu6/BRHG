// src/features/agents/agentsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

export const createAgent = createAsyncThunk(
  "agents/createAgent",
  async (agentData, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post("/users/createAgent", agentData);
      await dispatch(fetchAgents());
      return response.data;
    } catch (error) {
      // Build a richer, user-friendly error payload
      const data = error?.response?.data || {};
      const rawDetail = typeof data.error === "string" ? data.error : "";
      let message = data.message || "Could not create agent";
      let field = null;
      let code = null;

      // Detect common DB/Sequelize duplicate key errors and map to fields
      if (/Duplicate entry/i.test(rawDetail)) {
        code = "DUPLICATE";
        const keyMatch = rawDetail.match(/key '([^']+)'/i);
        const key = keyMatch?.[1] || "";
        if (/email/i.test(key)) {
          field = "email";
          message = "Email already exists. Use a different email.";
        } else if (/username|user_name/i.test(key)) {
          field = "username";
          message = "Username already exists. Choose another username.";
        } else if (/extension|internal/i.test(key)) {
          field = "extension";
          message = "Internal number already in use. Try a different one.";
        }
      }

      // Fallback to generic network/server errors
      if (!message && error.message) message = error.message;

      return rejectWithValue({ message, code, field });
    }
  }
);

// Async thunk for fetching agents
export const fetchAgents = createAsyncThunk(
  "agents/fetchAgents",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/agents");
      return response.data;
      // const { data } = await apiClient.get("/users/agents");
      // return data.agents;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not fetch agents"
      );
    }
  }
);

export const fetchAgentDetailsByExtension = createAsyncThunk(
  "agents/fetchAgentDetailsByExtension",
  async (agentId, { rejectWithValue }) => {
    try {
      const data = await apiClient.get(`/users/agents/${agentId}`);
      if (!data) {
        throw new Error("Agent not found");
      }

      const agentData = {
        ...data,
        ...(data.PJSIPEndpoint && {
          webrtc: data.PJSIPEndpoint.webrtc,
          transport: data.ps_endpoint.transport,
        }),
        ...(data.PJSIPAuth && {
          sipUsername: data.PJSIPAuth.username,
        }),
      };
      return agentData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not fetch agent details"
      );
    }
  }
);

// Async thunk for updating agent details
export const updateAgentDetails = createAsyncThunk(
  "agents/updateAgentDetails",
  async ({ agentId, agentDetails }, { rejectWithValue }) => {
    try {
      // console.log("Sending update request for agent:", agentId, agentDetails);

      const response = await apiClient.put(
        `/users/agents/${agentId}`,
        agentDetails
      );

      // console.log("Update response:", response);

      // Normalize success shape: treat any 2xx as success even if backend
      // doesn't include a `success` flag
      const normalized = {
        success:
          (response.status >= 200 && response.status < 300) ||
          response.data?.success === true,
        message: response.data?.message || "Agent updated successfully",
        data: response.data?.data,
        id: agentId,
      };

      return normalized;
    } catch (error) {
      console.error("Error updating agent details:", error);

      // Handle different error types
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Server error response:", error.response);
        return rejectWithValue(
          error.response.data?.message ||
            `Server error: ${error.response.status} ${error.response.statusText}`
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        return rejectWithValue(
          "No response from server. Please check your network connection."
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        return rejectWithValue(error.message || "Unknown error occurred");
      }
    }
  }
);

// Async thunk for resetting agent password
export const resetAgentPassword = createAsyncThunk(
  "agents/resetAgentPassword",
  async ({ agentId, newPassword }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/users/agents/${agentId}/reset-password`,
        { newPassword }
      );

      return {
        success: response.data?.success || true,
        message: response.data?.message || "Password reset successfully",
        agentId,
      };
    } catch (error) {
      console.error("Error resetting agent password:", error);

      if (error.response) {
        return rejectWithValue(
          error.response.data?.message ||
            `Server error: ${error.response.status} ${error.response.statusText}`
        );
      } else if (error.request) {
        return rejectWithValue(
          "No response from server. Please check your network connection."
        );
      } else {
        return rejectWithValue(error.message || "Unknown error occurred");
      }
    }
  }
);

//Delete Agent
export const deleteAgent = createAsyncThunk(
  "agents/deleteAgent",
  async (agentId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/users/agents/${agentId}`);
      return agentId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not delete agent"
      );
    }
  }
);

const agentsSlice = createSlice({
  name: "agents",
  initialState: {
    agents: [],
    currentAgent: null,
    loading: false,
    error: null,
    socketConnected: false,
    status: "idle",
  },
  reducers: {
    // Real-time event reducers
    agentCreated: (state, action) => {
      state.agents.push(action.payload);
      state.loading = false;
      state.status = "succeeded";
    },
    agentUpdated: (state, action) => {
      const index = state.agents.findIndex(
        (agent) => agent.id === action.payload.id
      );
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    agentDeleted: (state, action) => {
      state.agents = state.agents.filter(
        (agent) => agent.id !== action.payload
      );
    },
    updateAgentInState: (state, action) => {
      const index = state.agents.findIndex(
        (agent) => agent.id === action.payload.id
      );
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    setCurrentAgent: (state, action) => {
      state.currentAgent = action.payload;
    },
    setSocketStatus: (state, action) => {
      state.socketConnected = action.payload;
    },
    updateAgentsList: (state, action) => {
      state.agents = action.payload;
      state.status = "succeeded";
      state.loading = false;
    },
    // Define other reducers that directly update the state if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAgent.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(createAgent.fulfilled, (state) => {
        state.status = "succeeded";
        state.loading = false;
      })
      .addCase(createAgent.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload?.message || action.payload || "Failed";
      });

    // Get agents
    builder
      .addCase(fetchAgents.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.agents = action.payload;
        state.loading = false;
      })
      .addCase(fetchAgents.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.loading = false;
      });
    //Get Agent Details
    builder
      // Add handling for fetchAgentDetailsByExtension
      .addCase(fetchAgentDetailsByExtension.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(fetchAgentDetailsByExtension.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentAgent = action.payload.data; // Update the state with the fetched agent details
        state.loading = false;
      })
      .addCase(fetchAgentDetailsByExtension.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.loading = false;
      });
    // Updates Agent
    builder
      .addCase(updateAgentDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateAgentDetails.fulfilled, (state, action) => {
        const index = state.agents.findIndex(
          (agent) => agent.id === action.payload.id
        );
        if (index !== -1) {
          state.agents[index] = action.payload;
          state.currentAgent = action.payload; //To update the current agent being edited
        }
        state.loading = false;
      })
      .addCase(updateAgentDetails.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.loading = false;
      });
    // Delete Agents
    builder
      .addCase(deleteAgent.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter(
          (agent) => agent.id !== action.payload
        );
        state.loading = false;
      })
      .addCase(deleteAgent.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });

    // Reset Agent Password
    builder
      .addCase(resetAgentPassword.pending, (state) => {
        state.loading = true;
      })
      .addCase(resetAgentPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetAgentPassword.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const {
  agentCreated,
  agentUpdated,
  agentDeleted,
  updateAgentInState,
  setCurrentAgent,
  setSocketStatus,
  updateAgentsList,
} = agentsSlice.actions;

export default agentsSlice.reducer;
