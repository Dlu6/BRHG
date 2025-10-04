import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";
import { format } from "date-fns";

// Fetch available dates with recordings
export const fetchRecordingDates = createAsyncThunk(
  "recordings/fetchDates",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/recordings/dates");
      return response.data.dates;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch recording dates!"
      );
    }
  }
);

// Fetch recordings for a specific date
export const fetchRecordings = createAsyncThunk(
  "recordings/fetchByDate",
  async (date, { rejectWithValue }) => {
    try {
      const year = format(date, "yyyy");
      const month = format(date, "MM");
      const day = format(date, "dd");

      const response = await apiClient.get(
        `/recordings/list/${year}/${month}/${day}`
      );
      return response.data.recordings;
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch recordings for this date!"
      );
    }
  }
);

// Rate a recording
export const rateRecording = createAsyncThunk(
  "recordings/rate",
  async ({ date, filename, rating, notes }, { rejectWithValue }) => {
    try {
      const year = format(date, "yyyy");
      const month = format(date, "MM");
      const day = format(date, "dd");

      const response = await apiClient.post(
        `/recordings/rate/${year}/${month}/${day}/${filename}`,
        { rating, notes }
      );

      return {
        success: response.data.success,
        filename,
        rating,
        notes,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to rate recording!"
      );
    }
  }
);

// Initial State
const initialState = {
  dates: [],
  recordings: [],
  selectedDate: new Date(),
  loading: false,
  error: null,
};

const recordingsSlice = createSlice({
  name: "recordings",
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    clearRecordings: (state) => {
      state.recordings = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Dates
      .addCase(fetchRecordingDates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecordingDates.fulfilled, (state, action) => {
        state.loading = false;
        state.dates = action.payload;
      })
      .addCase(fetchRecordingDates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Recordings
      .addCase(fetchRecordings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecordings.fulfilled, (state, action) => {
        state.loading = false;
        state.recordings = action.payload || [];
      })
      .addCase(fetchRecordings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Rate Recording
      .addCase(rateRecording.pending, (state) => {
        // We don't set loading=true here to avoid blocking the UI
        state.error = null;
      })
      .addCase(rateRecording.fulfilled, (state, action) => {
        const { filename, rating, notes } = action.payload;

        // Update the recording in the state
        state.recordings = state.recordings.map((recording) =>
          recording.filename === filename
            ? { ...recording, rating, notes }
            : recording
        );
      })
      .addCase(rateRecording.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { setSelectedDate, clearRecordings } = recordingsSlice.actions;
export default recordingsSlice.reducer;
