// intervalSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getIntervals,
  getIntervalById,
  createInterval,
  updateInterval,
  deleteInterval,
} from "./intervalService";

// Helper function to parse interval data from API
const parseIntervalData = (interval) => {
  if (!interval) return interval;

  try {
    // Parse JSON strings into actual objects/arrays
    return {
      ...interval,
      timeRange:
        typeof interval.timeRange === "string"
          ? JSON.parse(interval.timeRange)
          : interval.timeRange,
      weekDays:
        typeof interval.weekDays === "string"
          ? JSON.parse(interval.weekDays)
          : interval.weekDays,
      monthDays:
        typeof interval.monthDays === "string"
          ? JSON.parse(interval.monthDays)
          : interval.monthDays,
      months:
        typeof interval.months === "string"
          ? JSON.parse(interval.months)
          : interval.months,
    };
  } catch (error) {
    console.error("Error parsing interval data:", error, interval);
    // Return a safe version of the data with defaults
    return {
      ...interval,
      timeRange: { from: "00:00", to: "23:59" },
      weekDays: Array.isArray(interval.weekDays) ? interval.weekDays : [],
      monthDays: Array.isArray(interval.monthDays) ? interval.monthDays : [],
      months: Array.isArray(interval.months) ? interval.months : [],
    };
  }
};

// Fetch all intervals
export const fetchIntervals = createAsyncThunk(
  "intervals/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const intervals = await getIntervals();
      // Parse each interval
      return intervals.map((interval) => parseIntervalData(interval));
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to fetch intervals";
      return rejectWithValue(message);
    }
  }
);

// Fetch single interval by ID
export const fetchIntervalById = createAsyncThunk(
  "intervals/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      const interval = await getIntervalById(id);
      return parseIntervalData(interval);
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to fetch interval";
      return rejectWithValue(message);
    }
  }
);

// Create new interval
export const addInterval = createAsyncThunk(
  "intervals/add",
  async (data, { rejectWithValue }) => {
    try {
      const response = await createInterval(data);
      return parseIntervalData(response.interval);
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to create interval";
      return rejectWithValue(message);
    }
  }
);

// Update existing interval
export const editInterval = createAsyncThunk(
  "intervals/edit",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await updateInterval(id, data);
      return parseIntervalData(response.interval);
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update interval";
      return rejectWithValue(message);
    }
  }
);

// Delete interval
export const removeInterval = createAsyncThunk(
  "intervals/remove",
  async (id, { rejectWithValue }) => {
    try {
      await deleteInterval(id);
      return id;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to delete interval";
      return rejectWithValue(message);
    }
  }
);

const intervalSlice = createSlice({
  name: "intervals",
  initialState: {
    intervals: [],
    currentInterval: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentInterval: (state, action) => {
      state.currentInterval = action.payload;
    },
    clearCurrentInterval: (state) => {
      state.currentInterval = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all intervals
      .addCase(fetchIntervals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntervals.fulfilled, (state, action) => {
        state.intervals = action.payload;
        state.loading = false;
      })
      .addCase(fetchIntervals.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // Fetch single interval
      .addCase(fetchIntervalById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntervalById.fulfilled, (state, action) => {
        state.currentInterval = action.payload;
        state.loading = false;
      })
      .addCase(fetchIntervalById.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // Create interval
      .addCase(addInterval.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addInterval.fulfilled, (state, action) => {
        state.intervals.unshift(action.payload);
        state.loading = false;
      })
      .addCase(addInterval.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // Update interval
      .addCase(editInterval.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editInterval.fulfilled, (state, action) => {
        const index = state.intervals.findIndex(
          (interval) => interval.id === action.payload.id
        );
        if (index !== -1) {
          state.intervals[index] = action.payload;
        }
        state.loading = false;
      })
      .addCase(editInterval.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // Delete interval
      .addCase(removeInterval.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeInterval.fulfilled, (state, action) => {
        state.intervals = state.intervals.filter(
          (interval) => interval.id !== action.payload
        );
        state.loading = false;
      })
      .addCase(removeInterval.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const { clearError, setCurrentInterval, clearCurrentInterval } =
  intervalSlice.actions;
export default intervalSlice.reducer;
