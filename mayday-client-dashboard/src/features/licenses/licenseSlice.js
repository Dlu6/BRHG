import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import licenseService from "../../services/licenseService";

export const fetchLicenses = createAsyncThunk(
  "licenses/fetchLicenses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await licenseService.getLicenses();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchLicenseTypes = createAsyncThunk(
  "licenses/fetchLicenseTypes",
  async (_, { rejectWithValue }) => {
    try {
      const response = await licenseService.getLicenseTypes();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const generateLicense = createAsyncThunk(
  "licenses/generateLicense",
  async (licenseData, { rejectWithValue }) => {
    try {
      const response = await licenseService.generateLicense(licenseData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchFeatureList = createAsyncThunk(
  "licenses/fetchFeatureList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await licenseService.getAllFeatures();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchCurrentLicense = createAsyncThunk(
  "licenses/fetchCurrentLicense",
  async (_, { rejectWithValue }) => {
    try {
      const response = await licenseService.getCurrentLicense();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const licenseSlice = createSlice({
  name: "licenses",
  initialState: {
    licenses: [],
    licenseTypes: [],
    loading: false,
    error: null,
    currentLicense: null,
    loadingCurrentLicense: "idle",
    featureList: {},
    loadingFeatureList: "idle",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLicenses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLicenses.fulfilled, (state, action) => {
        state.loading = false;
        state.licenses = action.payload;
      })
      .addCase(fetchLicenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLicenseTypes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLicenseTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.licenseTypes = action.payload;
      })
      .addCase(fetchLicenseTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateLicense.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateLicense.fulfilled, (state, action) => {
        state.loading = false;
        // Optionally add the new license to the state
      })
      .addCase(generateLicense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCurrentLicense.pending, (state) => {
        state.loadingCurrentLicense = "pending";
      })
      .addCase(fetchCurrentLicense.fulfilled, (state, action) => {
        state.loadingCurrentLicense = "succeeded";
        state.currentLicense = action.payload;
      })
      .addCase(fetchCurrentLicense.rejected, (state, action) => {
        state.loadingCurrentLicense = "failed";
        state.error = action.payload;
      })
      .addCase(fetchFeatureList.pending, (state) => {
        state.loadingFeatureList = "pending";
      })
      .addCase(fetchFeatureList.fulfilled, (state, action) => {
        state.loadingFeatureList = "succeeded";
        state.featureList = action.payload;
      })
      .addCase(fetchFeatureList.rejected, (state, action) => {
        state.loadingFeatureList = "failed";
        state.error = action.payload;
      });
  },
});

export default licenseSlice.reducer;
