import { Platform, PermissionsAndroid } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function requestAudioPermission() {
  if (Platform.OS === "android") {
    try {
      // Check existing permission first to avoid re-prompting
      const already = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (already) {
        await SecureStore.setItemAsync("mayday_mic_permission", "granted");
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Permission",
          message: "Mayday needs access to your microphone for calls.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      await SecureStore.setItemAsync(
        "mayday_mic_permission",
        ok ? "granted" : "denied"
      );
      return ok;
    } catch (_) {
      // Fall through to default false on error
      return false;
    }
  }
  // iOS handled by Expo permissions flow later
  try {
    await SecureStore.setItemAsync("mayday_mic_permission", "granted");
  } catch {}
  return true;
}

export async function getSavedMicPermission() {
  try {
    const v = await SecureStore.getItemAsync("mayday_mic_permission");
    return v; // 'granted' | 'denied' | null
  } catch {
    return null;
  }
}
