import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// Create Outbound Route
export const createOutboundRoute = createAsyncThunk(
  "outboundRoutes/createOutboundRoute",
  async (outboundRouteData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        "/users/outbound_routes/create",
        outboundRouteData
      );
      // console.log(response.data.route, "response is ? >>>>");
      return {
        createOutboundRouteData: response.data.route,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create outbound route!"
      );
    }
  }
);

// Fetch All Outbound Routes
export const fetchAllOutboundRoutes = createAsyncThunk(
  "outboundRoutes/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/outbound_routes/read");
      // console.log(response.data, "response is ? >>>>");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch outbound routes!"
      );
    }
  }
);

// Update Outbound Route
export const updateOutboundRoute = createAsyncThunk(
  "outboundRoutes/updateOutboundRoute",
  async ({ routeId, routeData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/users/outbound_routes/update/${routeId}`,
        routeData
      );
      return {
        route: response.data.route,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update outbound route!"
      );
    }
  }
);

// Delete Outbound Route
export const deleteOutboundRoute = createAsyncThunk(
  "outboundRoutes/deleteOutboundRoute",
  async (routeId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/users/outbound_routes/delete/${routeId}`);
      return { id: routeId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete outbound route!"
      );
    }
  }
);

export const fetchOutboundRouteById = createAsyncThunk(
  "outboundRoute/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/users/outbound_routes/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch outbound route!"
      );
    }
  }
);

const initialState = {
  outboundRoutes: [],
  currentRoute: null,
  loading: false,
  error: null,
};

const outboundRouteSlice = createSlice({
  name: "outboundRoute",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Create cases
      .addCase(createOutboundRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOutboundRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.outboundRoutes = [
          ...state.outboundRoutes,
          action.payload.createOutboundRouteData,
        ];
      })
      .addCase(createOutboundRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch cases
      .addCase(fetchAllOutboundRoutes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllOutboundRoutes.fulfilled, (state, action) => {
        state.loading = false;
        state.outboundRoutes = action.payload.routes;
      })
      .addCase(fetchAllOutboundRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update cases
      .addCase(updateOutboundRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOutboundRoute.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.outboundRoutes.findIndex(
          (route) => route.id === action.payload.route.id
        );
        if (index !== -1) {
          state.outboundRoutes[index] = action.payload.route;
        }
      })
      .addCase(updateOutboundRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete cases
      .addCase(deleteOutboundRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOutboundRoute.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.id) {
          state.outboundRoutes = state.outboundRoutes.filter(
            (route) => route.id !== action.payload.id
          );
        }
      })
      .addCase(deleteOutboundRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add these cases for fetchById
      .addCase(fetchOutboundRouteById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOutboundRouteById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRoute = action.payload.route;
      })
      .addCase(fetchOutboundRouteById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default outboundRouteSlice.reducer;
