import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSelector } from "react-redux";
import { makeCall } from "../../services/sipClient";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

export default function DialerScreen({ navigation }) {
  const [number, setNumber] = useState("");
  const { registered, connecting } = useSelector((s) => s.sip);
  const soundRef = useRef(null);

  const call = () => {
    if (!registered || !number) return;
    // The useSIP hook will now handle dispatching the call action and navigating
    makeCall(number);
  };

  const playKeyTone = async () => {
    try {
      // Lazily create a short tone from a tiny embedded wav (100ms 440Hz)
      const uri =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQgAAAAgICAfHx8eHh4eHh4dHR0cHBwcG9vb25ubm1tbGxsbGtra2pqampqampqa2tra2xsbG1tbm5ub29vcHBwcHR0dHh4eHh4eH4fHyAgICA=";
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { volume: 0.5 }
        );
        soundRef.current = sound;
      }
      await soundRef.current.replayAsync();
    } catch (_) {}
  };

  const append = async (digit) => {
    setNumber((prev) => `${prev}${digit}`);
    Haptics.selectionAsync();
    playKeyTone();
  };
  const backspace = () => setNumber((prev) => prev.slice(0, -1));
  const clearAll = () => setNumber("");

  let statusText = registered ? "Registered" : "Not Registered";
  let statusColor = registered ? "#22C55E" : "#9CA3AF";
  if (connecting) {
    statusText = "Registering…";
    statusColor = "#F59E0B";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dialer</Text>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <View style={styles.numberDisplayWrap}>
        <TextInput
          style={styles.numberDisplay}
          value={number}
          onChangeText={setNumber}
          placeholder="Enter number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
        <View style={styles.editRow}>
          <TouchableOpacity
            onPress={backspace}
            onLongPress={clearAll}
            style={styles.editBtn}
          >
            <Text style={styles.editText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
          (d) => (
            <TouchableOpacity
              key={d}
              onPress={() => append(d)}
              style={styles.key}
            >
              <Text style={styles.keyText}>{d}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <TouchableOpacity
        onPress={call}
        style={[styles.callBtn, (!registered || !number) && styles.disabledBtn]}
        disabled={!registered || !number}
      >
        <Text style={styles.callText}>Call</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => navigation.navigate("History")}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    padding: 24,
    paddingTop: 32,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 10 },
  statusText: { color: "#FFFFFF", fontWeight: "600" },
  numberDisplayWrap: {
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  numberDisplay: {
    color: "#FFFFFF",
    fontSize: 22,
    paddingVertical: 10,
    textAlignVertical: "center",
  },
  editRow: { flexDirection: "row", justifyContent: "flex-end" },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  editText: { color: "#FFFFFF", fontWeight: "700" },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: 12,
    rowGap: 12,
    marginTop: 8,
  },
  key: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "#0F172A",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  keyText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    textAlignVertical: "center",
  },
  callBtn: {
    backgroundColor: "#0B9246",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  callText: { color: "#FFFFFF", fontWeight: "700" },
  disabledBtn: { opacity: 0.5 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  secondaryText: { color: "#FFFFFF", fontWeight: "600" },
});
