import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";
import { decodeToken } from "../../utils/jwtUtils";

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/users/login", {
        username: userData.username,
        password: userData.password,
        isSoftphone: false,
      });

      const decodedToken = decodeToken(response.data.token);

      const user = {
        loggedIn: true,
        id: decodedToken.userId,
        username: decodedToken.username,
        role: decodedToken.role,
      };

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      return {
        token: response.data.token,
        user: user,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not login!"
      );
    }
  }
);

export const restoreUser = createAsyncThunk(
  "auth/restore",
  async ({ user, token }) => {
    // Set the token in apiClient
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return { user, token };
  }
);

const initialState = {
  user: null,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  token: null,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.status = "idle";
      state.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(restoreUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "succeeded";
      });
  },
});

export const { logoutUser } = authSlice.actions;

export default authSlice.reducer;
