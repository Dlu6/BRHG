import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { registerForPushNotifications } from "../../store/slices/notificationsSlice";

export default function NotificationsCenterScreen() {
  const dispatch = useDispatch();
  const { status, token, error } = useSelector((s) => s.notifications);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Expo Push Token</Text>
        <Text style={styles.value}>{token || "—"}</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
      <TouchableOpacity
        onPress={() => dispatch(registerForPushNotifications())}
        style={styles.btn}
      >
        <Text style={styles.btnText}>
          {status === "loading" ? "Requesting…" : "Register for Push"}
        </Text>
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
  error: { color: "#F87171", marginTop: 6 },
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
