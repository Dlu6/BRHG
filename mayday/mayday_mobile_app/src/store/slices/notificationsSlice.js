import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export const registerForPushNotifications = createAsyncThunk('notifications/register', async () => {
  if (!Device.isDevice) throw new Error('Must use physical device for Push Notifications');

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') throw new Error('Notification permission not granted');

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return { token };
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { status: 'idle', error: null, token: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(registerForPushNotifications.pending, (state) => {
        state.status = 'loading'; state.error = null;
      })
      .addCase(registerForPushNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded'; state.token = action.payload.token;
      })
      .addCase(registerForPushNotifications.rejected, (state, action) => {
        state.status = 'failed'; state.error = action.error.message;
      });
  }
});

export default notificationsSlice.reducer;
