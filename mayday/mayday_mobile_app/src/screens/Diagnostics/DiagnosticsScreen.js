import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function DiagnosticsScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={styles.title}>Diagnostics</Text>
      <View style={styles.card}>
        <Text style={styles.label}>SIP Registration</Text>
        <Text style={styles.value}>Pending integration</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>WebSocket (WSS) Reachability</Text>
        <Text style={styles.value}>Pending integration</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>ICE/TURN Checks</Text>
        <Text style={styles.value}>Pending integration</Text>
      </View>
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>Run Quick Test</Text>
      </TouchableOpacity>
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
  },
  label: { color: "#9CA3AF", marginBottom: 6 },
  value: { color: "#FFFFFF", fontWeight: "600" },
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
});
