import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// Async thunk for adding network configurations
export const addNetworkConfig = createAsyncThunk(
  "network/addNetworkConfig",
  async ({ networkType, networkConfig }, { rejectWithValue }) => {
    try {
      let endpoint;
      switch (networkType) {
        case "externip":
          endpoint = "/users/network-config/extern-ip";
          break;
        case "stun":
          endpoint = "/users/network-config/stun";
          break;
        case "turn":
          endpoint = "/users/network-config/turn";
          break;
        case "localnet":
          endpoint = "/users/network-config/local-net";
          break;
        default:
          throw new Error("Invalid network type");
      }
      const response = await apiClient.post(endpoint, networkConfig);
      //   console.log(response.data.data, "response.data data ???");
      return {
        ...response.data.data,
        type: networkType,
        success: response.data.success,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Async thunk for fetching network configurations
export const fetchNetworkConfigs = createAsyncThunk(
  "network/fetchNetworkConfigs",
  async (_, { rejectWithValue }) => {
    try {
      const [externIps, stuns, turns, localNets] = await Promise.all([
        apiClient.get("/users/network-config/extern-ip"),
        apiClient.get("/users/network-config/stun"),
        apiClient.get("/users/network-config/turn"),
        apiClient.get("/users/network-config/local-net"),
      ]);

      return [
        ...externIps.data.data.map((ip) => ({ ...ip, type: "externip" })),
        ...stuns.data.data.map((stun) => ({ ...stun, type: "stun" })),
        ...turns.data.data.map((turn) => ({ ...turn, type: "turn" })),
        ...localNets.data.data.map((net) => ({ ...net, type: "localnet" })),
      ];
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Async thunk for updating network configurations
export const updateNetworkConfig = createAsyncThunk(
  "network/updateNetworkConfig",
  async ({ networkType, id, networkConfig }, { rejectWithValue }) => {
    try {
      let endpoint;
      switch (networkType) {
        case "externip":
          endpoint = "/users/network-config/extern-ip";
          break;
        case "stun":
          endpoint = "/users/network-config/stun";
          break;
        case "turn":
          endpoint = "/users/network-config/turn";
          break;
        case "localnet":
          endpoint = "/users/network-config/local-net";
          break;
        default:
          throw new Error("Invalid network type");
      }
      const response = await apiClient.put(`${endpoint}/${id}`, networkConfig);
      return { ...response.data.data, type: networkType };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Async thunk for deleting network configurations
export const deleteNetworkConfig = createAsyncThunk(
  "network/deleteNetworkConfig",
  async ({ networkType, id }, { rejectWithValue }) => {
    try {
      let endpoint;
      switch (networkType) {
        case "externip":
          endpoint = "/users/network-config/extern-ip";
          break;
        case "stun":
          endpoint = "/users/network-config/stun";
          break;
        case "turn":
          endpoint = "/users/network-config/turn";
          break;
        case "localnet":
          endpoint = "/users/network-config/local-net";
          break;
        default:
          throw new Error("Invalid network type");
      }
      await apiClient.delete(`${endpoint}/${id}`);
      return { id, type: networkType };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const networkSlice = createSlice({
  name: "network",
  initialState: {
    networkConfigs: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(addNetworkConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNetworkConfig.fulfilled, (state, action) => {
        const { ...networkConfig } = action.payload;
        state.networkConfigs.push(networkConfig);
        state.loading = false;
      })
      .addCase(addNetworkConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchNetworkConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNetworkConfigs.fulfilled, (state, action) => {
        state.networkConfigs = action.payload;
        state.loading = false;
      })
      .addCase(fetchNetworkConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateNetworkConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNetworkConfig.fulfilled, (state, action) => {
        const index = state.networkConfigs.findIndex(
          (config) =>
            config.id === action.payload.id &&
            config.type === action.payload.type
        );
        if (index !== -1) {
          state.networkConfigs[index] = action.payload;
        }
        state.loading = false;
      })
      .addCase(updateNetworkConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteNetworkConfig.fulfilled, (state, action) => {
        state.networkConfigs = state.networkConfigs.filter((config) => {
          if (action.payload.type === "localnet") {
            return !(
              config.id === action.payload.id && config.type === "localnet"
            );
          }
          return !(
            config.id === action.payload.id &&
            config.type === action.payload.type
          );
        });
        state.loading = false;
      })
      .addCase(deleteNetworkConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default networkSlice.reducer;
