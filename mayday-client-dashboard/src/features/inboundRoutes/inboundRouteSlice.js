import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// Create Inbound Route
export const createInboundRoute = createAsyncThunk(
  "inboundRoutes/createInboundRoute",
  async (inboundRouteData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        "/users/inbound_route/create",
        inboundRouteData
      );
      return {
        createInboundRouteData: response.data.route,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create inbound route!"
      );
    }
  }
);

// Fetch All Inbound Routes
export const fetchAllInboundRoutes = createAsyncThunk(
  "inboundRoutes/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/inbound_route/read");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch inbound routes!"
      );
    }
  }
);

// Update inboundRoute
export const updateInboundRoute = createAsyncThunk(
  "inboundRoutes/updateInboundRoute",
  async ({ updatedFormData }, { rejectWithValue }) => {
    const { routeId } = updatedFormData;
    try {
      const response = await apiClient.put(
        `/users/inbound_route/update-inbound-route/${routeId}`,
        updatedFormData
      );
      return {
        inboundRouteData: response.data.route,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update inbound route!"
      );
    }
  }
);

// Delete Inbound Route
export const deleteInboundRoute = createAsyncThunk(
  "inboundRoutes/deleteInboundRoute",
  async (routeId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/users/inbound_route/delete-inbound/${routeId}`);
      return { id: routeId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete inbound route!"
      );
    }
  }
);

// Add this new thunk
export const fetchInboundRouteApplications = createAsyncThunk(
  "inboundRoutes/fetchApplications",
  async (routeId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/users/inbound_route/get-one/${routeId}`
      );
      if (response.data.success) {
        // Parse the stringified applications
        const applications = JSON.parse(response.data.route.applications);
        return applications;
      }
      throw new Error("Failed to fetch applications");
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch applications!"
      );
    }
  }
);

// Initial State
const initialState = {
  inboundRoutes: [],
  // currentInboundRoute: null,
  apps: [],
  loading: false,
  error: null,
};

const inboundRouteSlice = createSlice({
  name: "inboundRoute",
  initialState,

  reducers: {
    updateInboundRouteConfig: (state, action) => {
      const index = state.inboundRoutes.findIndex(
        (route) => route.id === action.payload.id
      );
      if (index !== -1) {
        state.inboundRoutes[index] = action.payload;
      }
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(fetchAllInboundRoutes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllInboundRoutes.fulfilled, (state, action) => {
        state.loading = false;
        state.inboundRoutes = action.payload;
      })
      .addCase(fetchAllInboundRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.error;
      })
      .addCase(createInboundRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInboundRoute.fulfilled, (state, action) => {
        // console.log(action.payload, "Creating Paylod>>>>");
        state.inboundRoutes.push(action.payload.createInboundRouteData);
        state.loading = false;
      })
      .addCase(createInboundRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //   .addCase(fetchInitialInboundApps.pending, (state) => {
      //     state.loading = true;
      //   })
      //   .addCase(fetchInitialInboundApps.fulfilled, (state, action) => {
      //     state.loading = false;
      //     state.apps = action.payload; // Update your initial state to include an `apps` array
      //   })
      //   .addCase(fetchInitialInboundApps.rejected, (state, action) => {
      //     state.loading = false;
      //     state.error = action.payload;
      //   })
      .addCase(updateInboundRoute.fulfilled, (state, action) => {
        if (action.payload.inboundRouteData) {
          const updatedRoute = action.payload.inboundRouteData;
          state.inboundRoutes = state.inboundRoutes.map((route) =>
            route.id === updatedRoute.id ? { ...route, ...updatedRoute } : route
          );
        }
        state.loading = false;
      })
      .addCase(deleteInboundRoute.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteInboundRoute.fulfilled, (state, action) => {
        state.inboundRoutes = state.inboundRoutes.filter(
          (route) => route.id !== action.payload.id
        );
        state.loading = false;
      })
      .addCase(deleteInboundRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchInboundRouteApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInboundRouteApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.apps = action.payload;
      })
      .addCase(fetchInboundRouteApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { updateInboundRouteConfig } = inboundRouteSlice.actions;
export default inboundRouteSlice.reducer;
