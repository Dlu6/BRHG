import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// Async thunks
export const fetchIntegrations = createAsyncThunk(
  "integrations/fetchIntegrations",
  async () => {
    const response = await apiClient.get("/integrations");
    return response.data;
  }
);

export const fetchIntegrationTemplates = createAsyncThunk(
  "integrations/fetchTemplates",
  async () => {
    const response = await apiClient.get("/integrations/templates");
    return response.data;
  }
);

export const createIntegration = createAsyncThunk(
  "integrations/createIntegration",
  async (integrationData) => {
    const response = await apiClient.post("/integrations", integrationData);
    return response.data;
  }
);

export const updateIntegration = createAsyncThunk(
  "integrations/updateIntegration",
  async ({ id, updateData }) => {
    const response = await apiClient.put(`/integrations/${id}`, updateData);
    return response.data;
  }
);

export const deleteIntegration = createAsyncThunk(
  "integrations/deleteIntegration",
  async (id) => {
    await apiClient.delete(`/integrations/${id}`);
    return id;
  }
);

export const testIntegration = createAsyncThunk(
  "integrations/testIntegration",
  async (id) => {
    const response = await apiClient.post(
      `/integrations/${id}/test`,
      {},
      {
        headers: {
          "x-internal-api-key": process.env.REACT_APP_INTERNAL_API_KEY,
        },
      }
    );
    return { id, result: response.data };
  }
);

export const syncIntegrationData = createAsyncThunk(
  "integrations/syncData",
  async ({ id, dataType }) => {
    const response = await apiClient.post(
      `/integrations/${id}/sync${dataType ? `?dataType=${dataType}` : ""}`
    );
    return { id, result: response.data };
  }
);

export const fetchIntegrationMetrics = createAsyncThunk(
  "integrations/fetchMetrics",
  async ({ id, startDate, endDate }) => {
    const response = await apiClient.get(
      `/integrations/${id}/metrics?startDate=${startDate}&endDate=${endDate}`
    );
    return { id, data: response.data };
  }
);

const initialState = {
  integrations: [],
  templates: {},
  loading: false,
  error: null,
  templatesLoading: false,
  templatesError: null,
  currentIntegration: null,
  metrics: {},
  metricsLoading: false,
  metricsError: null,
};

const integrationsSlice = createSlice({
  name: "integrations",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.templatesError = null;
      state.metricsError = null;
    },
    setCurrentIntegration: (state, action) => {
      state.currentIntegration = action.payload;
    },
    clearCurrentIntegration: (state) => {
      state.currentIntegration = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch integrations
      .addCase(fetchIntegrations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntegrations.fulfilled, (state, action) => {
        state.loading = false;
        state.integrations = action.payload.data || [];
      })
      .addCase(fetchIntegrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch integrations";
      })
      // Fetch templates
      .addCase(fetchIntegrationTemplates.pending, (state) => {
        state.templatesLoading = true;
        state.templatesError = null;
      })
      .addCase(fetchIntegrationTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload.data || {};
      })
      .addCase(fetchIntegrationTemplates.rejected, (state, action) => {
        state.templatesLoading = false;
        state.templatesError = action.payload || "Failed to fetch templates";
      })
      // Create integration
      .addCase(createIntegration.fulfilled, (state, action) => {
        state.integrations.unshift(action.payload.data);
      })
      // Update integration
      .addCase(updateIntegration.fulfilled, (state, action) => {
        const index = state.integrations.findIndex(
          (integration) => integration.id === action.payload.data.id
        );
        if (index !== -1) {
          state.integrations[index] = action.payload.data;
        }
      })
      // Delete integration
      .addCase(deleteIntegration.fulfilled, (state, action) => {
        state.integrations = state.integrations.filter(
          (integration) => integration.id !== action.payload
        );
      })
      // Test integration
      .addCase(testIntegration.fulfilled, (state, action) => {
        const index = state.integrations.findIndex(
          (integration) => integration.id === action.payload.id
        );
        if (index !== -1) {
          state.integrations[index].status = action.payload.result.success
            ? "active"
            : "error";
          state.integrations[index].errorMessage = action.payload.result.success
            ? null
            : action.payload.result.error;
        }
      })
      // Sync integration data
      .addCase(syncIntegrationData.fulfilled, (state, action) => {
        const index = state.integrations.findIndex(
          (integration) => integration.id === action.payload.id
        );
        if (index !== -1) {
          state.integrations[index].lastSync = new Date().toISOString();
        }
      })
      // Fetch metrics
      .addCase(fetchIntegrationMetrics.pending, (state) => {
        state.metricsLoading = true;
        state.metricsError = null;
      })
      .addCase(fetchIntegrationMetrics.fulfilled, (state, action) => {
        state.metricsLoading = false;
        state.metrics[action.payload.id] = action.payload.data;
      })
      .addCase(fetchIntegrationMetrics.rejected, (state, action) => {
        state.metricsLoading = false;
        state.metricsError = action.payload || "Failed to fetch metrics";
      });
  },
});

export const { clearError, setCurrentIntegration, clearCurrentIntegration } =
  integrationsSlice.actions;

export default integrationsSlice.reducer;
