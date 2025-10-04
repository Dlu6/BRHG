import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import odbcService from "../../services/odbcService";

export const fetchOdbcStatus = createAsyncThunk(
  "odbc/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await odbcService.getOdbcStatus();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const odbcSlice = createSlice({
  name: "odbc",
  initialState: {
    status: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOdbcStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOdbcStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(fetchOdbcStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default odbcSlice.reducer;
