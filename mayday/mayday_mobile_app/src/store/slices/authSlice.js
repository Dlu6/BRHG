import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ENDPOINTS, setApiBaseUrl } from "../../config/endpoints";

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }) => {
    const url = `${ENDPOINTS.BASE_URL}${ENDPOINTS.LOGIN}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, isSoftphone: true }),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}
    if (!res.ok) {
      const msg =
        data?.message || data?.error || `Login failed (${res.status})`;
      throw new Error(msg);
    }
    // If backend provides per-user API base, set it; otherwise resolve from server public-config
    try {
      const d = data?.data || data;
      const mobileApiBaseUrl = d?.user?.mobileApiBaseUrl || d?.mobileApiBaseUrl;
      const chromeHost =
        d?.user?.phoneBarChromeExtensionHost || d?.phoneBarChromeExtensionHost;

      if (mobileApiBaseUrl && typeof mobileApiBaseUrl === "string") {
        setApiBaseUrl(mobileApiBaseUrl);
      } else {
        // Try to discover from server public-config at the same API origin
        try {
          const baseRoot = (ENDPOINTS.BASE_URL || "").replace(/\/api$/, "");
          if (baseRoot) {
            const pcRes = await fetch(`${baseRoot}/system/public-config`);
            if (pcRes.ok) {
              const pcJson = await pcRes.json();
              const server = pcJson?.server || pcJson?.data?.server;
              if (server?.publicApiBase) {
                setApiBaseUrl(server.publicApiBase);
              }
            }
          }
        } catch {}

        // Fallback: if a full URL was provided for chrome extension host, use as-is
        if (chromeHost && /^https?:\/\//i.test(chromeHost)) {
          setApiBaseUrl(chromeHost.replace(/\/$/, ""));
        }
      }
    } catch {}
    return data;
  }
);

const initialState = {
  status: "idle",
  error: null,
  token: null,
  user: null,
  extension: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.extension = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        const payload = action.payload;
        const data = payload?.data || payload;
        state.token = data?.tokens?.sip || data?.token || null;
        state.user = data?.user || null;
        state.extension = data?.user?.extension || data?.extension || null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
