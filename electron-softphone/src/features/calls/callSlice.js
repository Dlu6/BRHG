// NOT USING THIS CURRENTLY
// src/features/calls/callSlice.js
import { createSlice } from "@reduxjs/toolkit";

const callSlice = createSlice({
  name: "calls",
  initialState: {
    active: null,
    history: [],
    status: "idle", // 'idle', 'ringing', 'ongoing'
  },
  reducers: {
    setActiveCall(state, action) {
      state.active = action.payload;
      state.status = action.payload ? "ongoing" : "idle";
    },
    addToHistory(state, action) {
      state.history.unshift(action.payload);
    },
  },
});

export const { setActiveCall, addToHistory } = callSlice.actions;
export default callSlice.reducer;
