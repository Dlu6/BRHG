import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function AudioDevicesScreen() {
  const [speaker, setSpeaker] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Devices</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Output</Text>
        <Text style={styles.value}>{speaker ? "Speaker" : "Earpiece"}</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setSpeaker(true)} style={styles.btn}>
            <Text style={styles.btnText}>Speaker</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSpeaker(false)}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Earpiece</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Echo Cancellation</Text>
        <Text style={styles.value}>{echoCancellation ? "On" : "Off"}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setEchoCancellation(true)}
            style={styles.btn}
          >
            <Text style={styles.btnText}>On</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEchoCancellation(false)}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Off</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  },
  label: { color: "#9CA3AF", marginBottom: 6 },
  value: { color: "#FFFFFF", fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },
  btnText: { color: "#FFFFFF", fontWeight: "700" },
});
