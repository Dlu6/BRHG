import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  audio: { speaker: true, echoCancellation: true },
  codecs: { preferred: 'opus' },
  theme: 'dark'
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setAudio(state, action) { state.audio = { ...state.audio, ...action.payload }; },
    setCodec(state, action) { state.codecs.preferred = action.payload; },
    setTheme(state, action) { state.theme = action.payload; }
  }
});

export const { setAudio, setCodec, setTheme } = settingsSlice.actions;
export default settingsSlice.reducer;
