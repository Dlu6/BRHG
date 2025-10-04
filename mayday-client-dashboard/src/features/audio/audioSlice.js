import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

// Async thunks
export const fetchSoundFiles = createAsyncThunk(
  "audio/fetchSoundFiles",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/sound_files");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadSoundFile = createAsyncThunk(
  "audio/uploadSoundFile",
  async ({ formData, onUploadProgress }, { rejectWithValue }) => {
    try {
      const response = await apiClient({
        method: "post",
        url: "/users/sound_files/upload",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteSoundFile = createAsyncThunk(
  "audio/deleteSoundFile",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/users/sound_files/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const audioSlice = createSlice({
  name: "audio",
  initialState: {
    files: [],
    loading: false,
    error: null,
    lastFetchTime: 0, // Add timestamp for last fetch
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch sound files
      .addCase(fetchSoundFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSoundFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload;
        state.lastFetchTime = Date.now(); // Update timestamp
        state.error = null;
      })
      .addCase(fetchSoundFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Upload sound file
      .addCase(uploadSoundFile.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(uploadSoundFile.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete sound file
      .addCase(deleteSoundFile.fulfilled, (state, action) => {
        state.files = state.files.filter((file) => file.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteSoundFile.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default audioSlice.reducer;
