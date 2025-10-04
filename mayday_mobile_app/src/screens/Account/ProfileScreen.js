import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";

export default function ProfileScreen() {
  const { user, extension } = useSelector((s) => s.auth);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || "—"}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || "—"}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Extension</Text>
        <Text style={styles.value}>{extension || "—"}</Text>
      </View>
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
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
