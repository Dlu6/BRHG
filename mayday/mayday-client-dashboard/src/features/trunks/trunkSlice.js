import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// Create Trunk
export const createTrunk = createAsyncThunk(
  "trunks/createTrunk",
  async (trunkData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/users/trunk/create", trunkData);
      return response.data;
    } catch (error) {
      // Handle duplicate trunk error specifically
      if (error.response?.status === 409) {
        return rejectWithValue({
          message: error.response.data.message,
          type: "DUPLICATE_TRUNK",
        });
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to create trunk!"
      );
    }
  }
);

// Read Trunk
export const fetchTrunks = createAsyncThunk(
  "trunks/fetchTrunks",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/trunk/read");
      return response.data.trunks;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't fetch trunks!"
      );
    }
  }
);

// Update Trunk
export const updateTrunkDetailsAsync = createAsyncThunk(
  "trunks/updateTrunkDetailsAsync",
  async (trunkData, { rejectWithValue }) => {
    // console.log("trunkData in slice>>", trunkData);
    try {
      const trunkId = trunkData.name;

      // Prepare the data including advanced settings
      const updateData = {
        ...trunkData,
        // Convert arrays back to strings for transport
        transport: Array.isArray(trunkData.transport)
          ? trunkData.transport.join(",")
          : trunkData.transport,
        // Include all advanced settings
        directMedia: trunkData.directMedia || "no",
        callCounter: trunkData.callCounter || "yes",
        // ... other advanced settings
      };

      const response = await apiClient.put(
        `/users/trunk/update/${trunkId}`,
        updateData
      );
      return response.data.trunk;
    } catch (error) {
      console.log("error>>", error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete Trunk
export const deleteTrunkAsync = createAsyncThunk(
  "trunks/deleteTrunk",
  async (trunkId, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/users/trunk/delete/${trunkId}`);
      return { trunkId, message: response.data.message }; // Return both the ID and success message
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete trunk!"
      );
    }
  }
);

// Fetch Single Trunk
export const fetchTrunkById = createAsyncThunk(
  "trunks/fetchTrunkById",
  async (trunkId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/users/trunk/${trunkId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't fetch trunk details!"
      );
    }
  }
);

// Get Trunk Balance
export const getTrunkBalance = createAsyncThunk(
  "trunks/getTrunkBalance",
  async (trunkId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/users/trunk/${trunkId}/balance`);
      return { trunkId, balance: response.data.balance };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't fetch trunk balance!"
      );
    }
  }
);

// Check Trunk Balance (refresh from provider)
export const checkTrunkBalance = createAsyncThunk(
  "trunks/checkTrunkBalance",
  async (trunkId, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/users/trunk/${trunkId}/balance/check`
      );
      return { trunkId, balance: response.data.balance };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't check trunk balance!"
      );
    }
  }
);

// Update Trunk Balance Info
export const updateTrunkBalanceInfo = createAsyncThunk(
  "trunks/updateTrunkBalanceInfo",
  async ({ trunkId, accountNumber, phoneNumber }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/users/trunk/${trunkId}/balance/info`,
        {
          account_number: accountNumber,
          phone_number: phoneNumber,
        }
      );
      return { trunkId, message: response.data.message };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't update trunk balance info!"
      );
    }
  }
);

const initialState = {
  trunks: [],
  currentTrunk: null,
  loading: false,
  error: null,
};

const trunkSlice = createSlice({
  name: "trunk",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createTrunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTrunk.fulfilled, (state, action) => {
        console.log("Create Trunk Payload:", action.payload);
        state.loading = false;
        state.error = null;
        if (!state.trunks) {
          state.trunks = [];
        }
        // Pending some better way to handle this to ensure trunk data loads correctly
        if (action.payload && action.payload.trunk) {
          state.trunks.unshift({
            name: action.payload.trunk.endpoint.id,
            ...action.payload.trunk.endpoint,
            auth: action.payload.trunk.auth,
            aor: action.payload.trunk.aor,
          });
        }
      })
      .addCase(createTrunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTrunks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrunks.fulfilled, (state, action) => {
        state.loading = false;
        state.trunks = (action.payload || []).map((trunk) => ({
          ...trunk,
          id: trunk.name,
          active: trunk.endpoint?.enabled ? 1 : 0,
          status: trunk.status || "Unknown",
          registry: trunk.registration
            ? `${trunk.registration.server_uri}`
            : "-",
        }));
      })
      .addCase(fetchTrunks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTrunkDetailsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTrunkDetailsAsync.fulfilled, (state, action) => {
        console.log("Update Trunk Payload:", action.payload);
        state.loading = false;
        const updatedTrunk = action.payload;
        const existingIndex = state.trunks.findIndex(
          (trunk) => trunk.name === updatedTrunk.endpoint.id
        );
        if (existingIndex !== -1) {
          state.trunks[existingIndex] = {
            name: updatedTrunk.endpoint.id,
            ...updatedTrunk.endpoint,
            active: updatedTrunk.endpoint.active,
            enabled: updatedTrunk.endpoint.enabled,
            auth: updatedTrunk.auth,
            aor: updatedTrunk.aor,
          };
        }
      })
      .addCase(updateTrunkDetailsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteTrunkAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTrunkAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the trunk by name (which is the actual endpoint ID)
        state.trunks = state.trunks.filter(
          (trunk) => trunk.name !== action.payload.trunkId
        );
        state.successMessage = action.payload.message; // Store the success message
      })
      .addCase(deleteTrunkAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTrunkById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrunkById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTrunk = action.payload.trunk;
      })
      .addCase(fetchTrunkById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getTrunkBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTrunkBalance.fulfilled, (state, action) => {
        state.loading = false;
        const { trunkId, balance } = action.payload;
        const trunkIndex = state.trunks.findIndex(
          (trunk) => trunk.name === trunkId
        );
        if (trunkIndex !== -1) {
          state.trunks[trunkIndex].balance = balance;
        }
      })
      .addCase(getTrunkBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkTrunkBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkTrunkBalance.fulfilled, (state, action) => {
        state.loading = false;
        const { trunkId, balance } = action.payload;
        const trunkIndex = state.trunks.findIndex(
          (trunk) => trunk.name === trunkId
        );
        if (trunkIndex !== -1) {
          state.trunks[trunkIndex].balance = balance;
        }
      })
      .addCase(checkTrunkBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTrunkBalanceInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTrunkBalanceInfo.fulfilled, (state, action) => {
        state.loading = false;
        const { trunkId } = action.payload;
        const trunkIndex = state.trunks.findIndex(
          (trunk) => trunk.name === trunkId
        );
        if (trunkIndex !== -1) {
          // Update the trunk with new balance info
          state.trunks[trunkIndex].account_number =
            action.payload.accountNumber;
          state.trunks[trunkIndex].phone_number = action.payload.phoneNumber;
        }
      })
      .addCase(updateTrunkBalanceInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default trunkSlice.reducer;
