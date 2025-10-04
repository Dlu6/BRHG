import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as dashboardService from "../../services/dashboardService";

export const fetchMyPerformanceStats = createAsyncThunk(
  "dashboard/fetchMyStats",
  async (timeframe = "today", { getState }) => {
    const { token } = getState().auth;
    const response = await dashboardService.getMyPerformanceStats(
      token,
      timeframe
    );
    return response.data;
  }
);

const initialState = {
  stats: {
    totalCalls: 0,
    inbound: 0,
    outbound: 0,
    missed: 0,
    avgHandleTime: "0:00",
  },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyPerformanceStats.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMyPerformanceStats.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.stats = action.payload;
      })
      .addCase(fetchMyPerformanceStats.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default dashboardSlice.reducer;
