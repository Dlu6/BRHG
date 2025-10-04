import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { navigate } from '../navigation/navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannel(channelId = 'calls') {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [250, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true
    });
  }
}

export async function registerPushToken() {
  if (!Device.isDevice) return null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export function subscribeIncomingNotifications() {
  const subReceived = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification?.request?.content?.data || {};
    if (data.type === 'incoming_call') {
      navigate('IncomingCall', { caller: data.from });
    }
  });

  const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    if (data.type === 'incoming_call') {
      navigate('IncomingCall', { caller: data.from });
    }
  });

  return () => {
    subReceived && Notifications.removeNotificationSubscription(subReceived);
    subResponse && Notifications.removeNotificationSubscription(subResponse);
  };
}
