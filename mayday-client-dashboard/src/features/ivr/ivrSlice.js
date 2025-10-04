import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

// Async thunk for saving IVR flow
export const saveIVRFlow = createAsyncThunk(
  "ivr/saveFlow",
  async (flowData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/users/ivr/flow", flowData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to save IVR flow" }
      );
    }
  }
);

// Async thunk for fetching IVR flows
export const fetchIVRFlows = createAsyncThunk(
  "ivr/fetchFlows",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/ivr/flows");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch IVR flows" }
      );
    }
  }
);

// Async thunk for updating IVR flow
export const updateIVRFlow = createAsyncThunk(
  "ivr/updateFlow",
  async ({ id, flowData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/users/ivr/flow/${id}`, flowData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update IVR flow" }
      );
    }
  }
);

// Async thunk for fetching IVR flow
export const fetchIVRFlow = createAsyncThunk(
  "ivr/fetchFlow",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/users/ivr/flow/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch IVR flow" }
      );
    }
  }
);

export const createIVRFlow = createAsyncThunk(
  "ivr/createFlow",
  async (flowData) => {
    const response = await apiClient.post("/users/ivr/flow", flowData);
    return response.data;
  }
);

// Add new async thunk for deletion
export const deleteIVRFlow = createAsyncThunk(
  "ivr/deleteFlow",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/users/ivr/flow/${id}`);
      return { ...response.data, id }; // Include id for reducer
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to delete IVR flow" }
      );
    }
  }
);

const ivrSlice = createSlice({
  name: "ivr",
  initialState: {
    flows: [],
    loading: false,
    error: null,
    currentFlow: null,
    saveStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    lastSaved: null,
    createStatus: "idle", // Add this to track create operation status
    deleteStatus: "idle", // Add this to track delete operation status
  },
  reducers: {
    setCurrentFlow: (state, action) => {
      state.currentFlow = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Save Flow cases
      .addCase(saveIVRFlow.pending, (state) => {
        state.loading = true;
        state.saveStatus = "loading";
        state.error = null;
      })
      .addCase(saveIVRFlow.fulfilled, (state, action) => {
        state.loading = false;
        state.saveStatus = "succeeded";
        state.flows.push(action.payload.data);
        state.currentFlow = action.payload.data;
        state.lastSaved = new Date().toISOString();
        state.error = null;
      })
      .addCase(saveIVRFlow.rejected, (state, action) => {
        state.loading = false;
        state.saveStatus = "failed";
        state.error = action.payload?.message || "Failed to save IVR flow";
      })
      // Fetch Flows cases
      .addCase(fetchIVRFlows.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIVRFlows.fulfilled, (state, action) => {
        state.loading = false;
        state.flows = action.payload.data;
        state.error = null;
      })
      .addCase(fetchIVRFlows.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch IVR flows";
      })
      // Update Flow cases
      .addCase(updateIVRFlow.pending, (state) => {
        state.loading = true;
        state.saveStatus = "loading";
        state.error = null;
      })
      .addCase(updateIVRFlow.fulfilled, (state, action) => {
        state.loading = false;
        state.saveStatus = "succeeded";
        const index = state.flows.findIndex(
          (flow) => flow.id === action.payload.data.id
        );
        if (index !== -1) {
          state.flows[index] = action.payload.data;
        }
        state.currentFlow = action.payload.data;
        state.lastSaved = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateIVRFlow.rejected, (state, action) => {
        state.loading = false;
        state.saveStatus = "failed";
        state.error = action.payload?.message || "Failed to update IVR flow";
      })
      // Fetch Single Flow cases
      .addCase(fetchIVRFlow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIVRFlow.fulfilled, (state, action) => {
        state.loading = false;
        state.currentFlow = action.payload.data;
        state.error = null;
      })
      .addCase(fetchIVRFlow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch IVR flow";
      })
      // Create Flow cases
      .addCase(createIVRFlow.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createIVRFlow.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.flows.unshift(action.payload.data); // Add to start of array
        state.error = null;
      })
      .addCase(createIVRFlow.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload?.message || "Failed to create IVR flow";
      })
      // Delete Flow cases
      .addCase(deleteIVRFlow.pending, (state) => {
        state.deleteStatus = "loading";
        state.error = null;
      })
      .addCase(deleteIVRFlow.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.flows = state.flows.filter(
          (flow) => flow.id !== action.payload.id
        );
        state.error = null;
      })
      .addCase(deleteIVRFlow.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.error = action.payload?.message || "Failed to delete IVR flow";
      });
  },
});

// Selectors
export const selectAllFlows = (state) => state.ivr.flows;
export const selectCurrentFlow = (state) => state.ivr.currentFlow;
export const selectIVRLoading = (state) => state.ivr.loading;
export const selectIVRError = (state) => state.ivr.error;
export const selectSaveStatus = (state) => state.ivr.saveStatus;
export const selectLastSaved = (state) => state.ivr.lastSaved;
export const selectCreateStatus = (state) => state.ivr.createStatus;
export const selectDeleteStatus = (state) => state.ivr.deleteStatus;

export const { setCurrentFlow, clearError } = ivrSlice.actions;
export default ivrSlice.reducer;
