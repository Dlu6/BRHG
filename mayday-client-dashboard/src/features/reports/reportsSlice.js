import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

// Async thunks
export const fetchCallVolume = createAsyncThunk(
  "reports/fetchCallVolume",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/call-volume-asterisk?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

export const fetchQualityMetrics = createAsyncThunk(
  "reports/fetchQualityMetrics",
  async ({ startDate, endDate }) => {
    try {
      // Only try to get data from the quality metrics endpoint
      const response = await apiClient.get(
        `/users/reports/quality?startDate=${startDate}&endDate=${endDate}`
      );

      // Return whatever data we get, even if it's empty
      return response.data || {};
    } catch (error) {
      console.error("Error fetching quality metrics:", error);
      throw error;
    }
  }
);

export const fetchPerformanceMetrics = createAsyncThunk(
  "reports/fetchPerformanceMetrics",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/performance-asterisk?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

// Add new async thunks for additional report types
export const fetchQueueDistribution = createAsyncThunk(
  "reports/fetchQueueDistribution",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/queue-distribution-asterisk?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

export const fetchSLACompliance = createAsyncThunk(
  "reports/fetchSLACompliance",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/sla-compliance-asterisk?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

// Add new async thunk for downloads
export const downloadReport = createAsyncThunk(
  "reports/downloadReport",
  async ({ startDate, endDate, type }, { dispatch, rejectWithValue }) => {
    try {
      // Map frontend report types to backend report types
      const reportTypeMap = {
        volume: "call-volume",
        performance: "agent-performance",
        queues: "queue-metrics",
        "call-log": "call-log",
        "call-cost": "call-cost",
        summary: "summary",
        comprehensive: "comprehensive",
        datatool: "datatool",
        "datatool-all-time": "datatool-all-time",
      };

      const reportType = reportTypeMap[type] || type;

      dispatch(updateDownloadProgress(10));

      const response = await apiClient.get(
        `/users/reports/export?startDate=${startDate}&endDate=${endDate}&reportType=${reportType}`,
        {
          responseType: "blob",
          validateStatus: (status) =>
            (status >= 200 && status < 300) || status === 404,
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            dispatch(updateDownloadProgress(percentCompleted));
          },
        }
      );

      dispatch(updateDownloadProgress(100));

      if (response.status === 404) {
        const reader = new FileReader();
        const textData = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsText(response.data);
        });

        try {
          const jsonData = JSON.parse(textData);
          return rejectWithValue({
            type: "NO_DATA",
            message:
              jsonData.message ||
              "No data available for the selected date range",
            silent: true,
          });
        } catch (parseError) {
          return rejectWithValue({
            type: "ERROR",
            message: "Invalid response format",
            silent: false,
          });
        }
      }

      // Create a URL for the blob and trigger download directly here
      // instead of returning the blob to Redux
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;

      // Generate a better filename based on report type
      const reportTypeNames = {
        "call-volume": "Call Volume",
        "agent-performance": "Agent Performance",
        "queue-metrics": "Queue Metrics",
        "call-log": "Call Log",
        "call-cost": "Call Cost",
        summary: "Summary",
        comprehensive: "Comprehensive",
        datatool: "Data Tool",
        "datatool-all-time": "Data Tool All Time",
      };

      const reportName = reportTypeNames[reportType] || reportType;
      const filename = `${reportName}-Report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Small timeout to ensure the download starts before cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      // Return a simple success object without the blob
      return { success: true, filename };
    } catch (error) {
      if (error.isAxiosError && error.response?.status === 404) {
        return rejectWithValue({
          type: "NO_DATA",
          message: "No data available for the selected date range",
          silent: true,
        });
      }
      return rejectWithValue({
        type: "ERROR",
        message: error.message,
      });
    }
  }
);

// Add this new thunk action
export const fetchDataToolMetrics = createAsyncThunk(
  "reports/fetchDataToolMetrics",
  async (params, { rejectWithValue }) => {
    try {
      // Use the new integrations endpoint instead of the old dataTool endpoint
      const response = await apiClient.get("/integrations", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          "Failed to fetch Third-Party Integration metrics"
      );
    }
  }
);

// Add this new thunk for all-time metrics
export const fetchDataToolAllTimeMetrics = createAsyncThunk(
  "reports/fetchDataToolAllTimeMetrics",
  async () => {
    try {
      // Use the new integrations templates endpoint
      const response = await apiClient.get("/integrations/templates");
      return response.data;
    } catch (error) {
      console.error("Error fetching integration templates:", error);
      return { data: {} };
    }
  }
);

export const fetchAgentCallDetails = createAsyncThunk(
  "reports/fetchAgentCallDetails",
  async ({ agentName, startDate, endDate, limit = 50 }) => {
    const response = await apiClient.get(
      `/users/reports/agent-call-details-asterisk?agentName=${encodeURIComponent(
        agentName
      )}&startDate=${startDate}&endDate=${endDate}&limit=${limit}`
    );
    return response.data;
  }
);

const initialState = {
  callVolume: [],
  qualityMetrics: {},
  performance: [],
  queueDistribution: [],
  slaCompliance: [],
  dataToolMetrics: {},
  dataToolAllTimeMetrics: {},
  agentCallDetails: null,
  agentCallDetailsLoading: false,
  loading: false,
  allTimeLoading: false,
  error: null,
  downloadProgress: 0,
  isDownloading: false,
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearReports: (state) => {
      state.callVolume = [];
      state.qualityMetrics = {};
      state.performance = [];
      state.queueDistribution = [];
      state.slaCompliance = [];
      state.dataToolMetrics = {};
      state.dataToolAllTimeMetrics = {};
      state.error = null;
    },
    updateDownloadProgress: (state, action) => {
      state.downloadProgress = action.payload;
    },
    resetDownloadProgress: (state) => {
      state.downloadProgress = 0;
      state.isDownloading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Call Volume
      .addCase(fetchCallVolume.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCallVolume.fulfilled, (state, action) => {
        state.loading = false;
        state.callVolume = action.payload;
        state.error = null;
      })
      .addCase(fetchCallVolume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Quality Metrics
      .addCase(fetchQualityMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQualityMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.qualityMetrics = action.payload;
        state.error = null;
      })
      .addCase(fetchQualityMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Performance Metrics
      .addCase(fetchPerformanceMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPerformanceMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.performance = action.payload;
        state.error = null;
      })
      .addCase(fetchPerformanceMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Queue Distribution
      .addCase(fetchQueueDistribution.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQueueDistribution.fulfilled, (state, action) => {
        state.loading = false;
        state.queueDistribution = action.payload;
        state.error = null;
      })
      .addCase(fetchQueueDistribution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // SLA Compliance
      .addCase(fetchSLACompliance.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSLACompliance.fulfilled, (state, action) => {
        state.loading = false;
        state.slaCompliance = action.payload;
        state.error = null;
      })
      .addCase(fetchSLACompliance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Download Report
      .addCase(downloadReport.pending, (state) => {
        state.isDownloading = true;
        state.downloadProgress = 0;
      })
      .addCase(downloadReport.fulfilled, (state) => {
        state.isDownloading = false;
        state.downloadProgress = 100;
      })
      .addCase(downloadReport.rejected, (state, action) => {
        state.isDownloading = false;
        state.downloadProgress = 0;

        // Check if this is a NO_DATA response
        if (action.payload?.type === "NO_DATA") {
          state.error = {
            type: "NO_DATA",
            message: action.payload.message,
          };
        } else {
          state.error = {
            type: "ERROR",
            message: action.error.message,
          };
        }
      })
      // Third-Party Integration Metrics
      .addCase(fetchDataToolMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDataToolMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.dataToolMetrics = action.payload;
      })
      .addCase(fetchDataToolMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch Third-Party Integration metrics";
      })
      // Third-Party Integration All-Time Metrics
      .addCase(fetchDataToolAllTimeMetrics.pending, (state) => {
        state.allTimeLoading = true;
      })
      .addCase(fetchDataToolAllTimeMetrics.fulfilled, (state, action) => {
        state.allTimeLoading = false;
        state.dataToolAllTimeMetrics = action.payload;
      })
      .addCase(fetchDataToolAllTimeMetrics.rejected, (state, action) => {
        state.allTimeLoading = false;
        state.error =
          action.payload ||
          "Failed to fetch all-time Third-Party Integration metrics";
      })
      // Agent Call Details
      .addCase(fetchAgentCallDetails.pending, (state) => {
        state.agentCallDetailsLoading = true;
        state.error = null;
      })
      .addCase(fetchAgentCallDetails.fulfilled, (state, action) => {
        state.agentCallDetailsLoading = false;
        state.agentCallDetails = action.payload;
        state.error = null;
      })
      .addCase(fetchAgentCallDetails.rejected, (state, action) => {
        state.agentCallDetailsLoading = false;
        state.error = action.payload || "Failed to fetch agent call details";
      });
  },
});

export const { clearReports, updateDownloadProgress, resetDownloadProgress } =
  reportsSlice.actions;
export default reportsSlice.reducer;
