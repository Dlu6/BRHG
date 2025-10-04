import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Alert, ActivityIndicator } from "react-native";
import Constants from "expo-constants";
import { getApiBaseUrl } from "../../config/endpoints";
import { useSelector } from "react-redux";
// Dynamically require to avoid crashing when native module isn't present
let RNWebRTC = null;
try {
  // eslint-disable-next-line global-require
  RNWebRTC = require("react-native-webrtc");
} catch (e) {
  RNWebRTC = null;
}
import {
  requestAudioPermission,
  getSavedMicPermission,
} from "../../services/webrtc";
import * as SecureStore from "expo-secure-store";
import { useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { disconnect as sipDisconnect } from "../../services/sipClient";
// Safely read version from package.json
let APP_VERSION = "dev";
try {
  // eslint-disable-next-line global-require
  const pkg = require("../../../package.json");
  APP_VERSION = pkg?.version || APP_VERSION;
} catch {}

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const extra = Constants?.expoConfig?.extra || {};
  const { registered, registering, domain } = useSelector((s) => s.sip);
  const { user } = useSelector((s) => s.auth);

  const [micResult, setMicResult] = useState(null);
  const [wssResult, setWssResult] = useState(null);
  const [iceResult, setIceResult] = useState(null);
  const [running, setRunning] = useState({
    mic: false,
    wss: false,
    ice: false,
  });
  const [micPref, setMicPref] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getSavedMicPermission();
      if (saved) setMicPref(saved);
    })();
  }, []);

  const webrtcUnavailableMsg =
    "WebRTC native module not found. Use an Expo Dev Client build that includes react-native-webrtc.";

  const testMicrophone = async () => {
    try {
      setRunning((r) => ({ ...r, mic: true }));
      if (!RNWebRTC || !RNWebRTC.mediaDevices) {
        throw new Error(webrtcUnavailableMsg);
      }
      const granted = await requestAudioPermission();
      if (!granted) throw new Error("Microphone permission denied");
      const stream = await RNWebRTC.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      // Stop immediately – this is only a capability check
      stream.getTracks().forEach((t) => t.stop());
      setMicResult({ ok: true, message: "Microphone is accessible" });
    } catch (e) {
      setMicResult({
        ok: false,
        message: e?.message || "Microphone test failed",
      });
    } finally {
      setRunning((r) => ({ ...r, mic: false }));
    }
  };

  const testWSS = async () => {
    const apiBase = getApiBaseUrl();
    let derivedHost = "";
    try {
      derivedHost = new URL(apiBase).hostname;
    } catch {}
    const sipHost = domain || extra.SIP_DOMAIN || derivedHost || "";
    const wsUri = sipHost ? `wss://${sipHost}:8089/ws` : "";
    return new Promise((resolve) => {
      setRunning((r) => ({ ...r, wss: true }));
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        setWssResult({
          ok: false,
          message: wsUri ? `Timeout reaching ${wsUri}` : "Missing SIP host",
        });
        setRunning((r) => ({ ...r, wss: false }));
        resolve();
      }, 5000);
      try {
        if (!wsUri) throw new Error("No SIP host configured");
        const ws = new WebSocket(wsUri, "sip");
        ws.onopen = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          setWssResult({ ok: true, message: `WSS reachable: ${wsUri}` });
          ws.close();
          setRunning((r) => ({ ...r, wss: false }));
          resolve();
        };
        ws.onerror = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          setWssResult({ ok: false, message: `Failed to reach ${wsUri}` });
          setRunning((r) => ({ ...r, wss: false }));
          resolve();
        };
      } catch (e) {
        clearTimeout(timer);
        setWssResult({ ok: false, message: e?.message || "WSS test failed" });
        setRunning((r) => ({ ...r, wss: false }));
        resolve();
      }
    });
  };

  const testICE = async () => {
    setRunning((r) => ({ ...r, ice: true }));
    let pc;
    try {
      if (!RNWebRTC || !RNWebRTC.RTCPeerConnection) {
        throw new Error(webrtcUnavailableMsg);
      }
      let candidates = 0;
      pc = new RNWebRTC.RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pc.onicecandidate = (e) => {
        if (e.candidate) candidates += 1;
      };
      pc.createDataChannel("probe");
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      await new Promise((res) => setTimeout(res, 2500));
      setIceResult({
        ok: candidates > 0,
        message:
          candidates > 0
            ? `${candidates} ICE candidates found`
            : "No ICE candidates discovered",
      });
    } catch (e) {
      setIceResult({ ok: false, message: e?.message || "ICE test failed" });
    } finally {
      pc && pc.close && pc.close();
      setRunning((r) => ({ ...r, ice: false }));
    }
  };

  const year = new Date().getFullYear();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>SIP Status</Text>
        <Text style={styles.value}>
          {registering
            ? "Registering…"
            : registered
            ? "Registered"
            : "Not Registered"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>User</Text>
        <Text style={styles.value}>{user?.email || "—"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>API Base URL</Text>
        <Text style={styles.value}>{getApiBaseUrl()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>SIP Domain</Text>
        <Text style={styles.value}>{extra.SIP_DOMAIN || domain || "—"}</Text>
      </View>

      {/* Media Tests */}
      <View style={styles.card}>
        <Text style={styles.section}>Media Tests</Text>

        <Text style={styles.label}>Microphone Permission</Text>
        <Text style={styles.value}>
          {micPref === "granted"
            ? "Granted"
            : micPref === "denied"
            ? "Denied"
            : "Not set"}
        </Text>

        <TouchableOpacity
          onPress={testMicrophone}
          style={styles.btn}
          disabled={running.mic}
        >
          <Text style={styles.btnText}>
            {running.mic ? "Testing Mic…" : "Test Microphone"}
          </Text>
        </TouchableOpacity>
        {micResult && (
          <Text style={[styles.result, micResult.ok ? styles.ok : styles.err]}>
            {micResult.message}
          </Text>
        )}

        <TouchableOpacity
          onPress={testWSS}
          style={styles.btn}
          disabled={running.wss}
        >
          <Text style={styles.btnText}>
            {running.wss ? "Testing WSS…" : "Test SIP WSS Reachability"}
          </Text>
        </TouchableOpacity>
        {wssResult && (
          <Text style={[styles.result, wssResult.ok ? styles.ok : styles.err]}>
            {wssResult.message}
          </Text>
        )}

        <TouchableOpacity
          onPress={testICE}
          style={styles.btn}
          disabled={running.ice}
        >
          <Text style={styles.btnText}>
            {running.ice ? "Testing ICE…" : "Test ICE (STUN)"}
          </Text>
        </TouchableOpacity>
        {iceResult && (
          <Text style={[styles.result, iceResult.ok ? styles.ok : styles.err]}>
            {iceResult.message}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>App Info</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>{APP_VERSION}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Expo SDK</Text>
          <Text style={styles.value}>{Constants?.expoVersion || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Project ID</Text>
          <Text style={styles.value}>{extra?.eas?.projectId || "—"}</Text>
        </View>
      </View>

      {/* Session */}
      <View style={styles.card}>
        <Text style={styles.section}>Session</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Logged in as</Text>
          <Text style={styles.value}>{user?.email || "—"}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                  setLoggingOut(true);
                  try {
                    // Clear saved auth prefs except host
                    await SecureStore.deleteItemAsync("mayday_password");
                    await SecureStore.deleteItemAsync("mayday_remember");
                  } catch {}
                  try {
                    await sipDisconnect();
                  } catch {}
                  dispatch(logout());
                  // Navigate back to Login and reset stack
                  try {
                    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                  } catch {}
                  setLoggingOut(false);
                },
              },
            ]);
          }}
          style={[styles.btn, styles.dangerBtn]}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.inlineRow}>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.btnText, styles.dangerText]}>Logout</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footnote}>Mayday Mobile</Text>
      <Text style={styles.copy}>© {year} MM-iCT. All rights reserved.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", padding: 24 },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { color: "#9CA3AF", marginBottom: 6 },
  value: { color: "#FFFFFF", fontWeight: "600" },
  section: { color: "#FFFFFF", fontWeight: "700", marginBottom: 8 },
  btn: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 8,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dangerBtn: {
    backgroundColor: "#B91C1C",
    borderColor: "#7F1D1D",
  },
  dangerText: { color: "#FFFFFF", fontWeight: "700" },
  result: { marginTop: 6 },
  ok: { color: "#34D399" },
  err: { color: "#F87171" },
  testBtn: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 8,
  },
  testText: { color: "#FFFFFF", fontWeight: "700" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  footnote: {
    color: "#9CA3AF",
    marginTop: 16,
    textAlign: "center",
  },
  copy: {
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
});
