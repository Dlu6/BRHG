import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import systemService from "../../services/systemService";

export const fetchSystemInfo = createAsyncThunk(
  "system/fetchInfo",
  async (_, { rejectWithValue }) => {
    try {
      const response = await systemService.getSystemInfo();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const systemSlice = createSlice({
  name: "system",
  initialState: {
    info: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSystemInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.info = action.payload;
      })
      .addCase(fetchSystemInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default systemSlice.reducer;
