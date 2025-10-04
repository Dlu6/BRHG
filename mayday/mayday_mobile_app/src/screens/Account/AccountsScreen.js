import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";

export default function AccountsScreen() {
  const accounts = [];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIP Accounts</Text>
      <FlatList
        data={accounts}
        keyExtractor={(i, idx) => String(idx)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.value}>{item.label}</Text>
            <Text style={styles.meta}>
              {item.username}@{item.domain}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No additional accounts</Text>
        }
      />
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>Add Account</Text>
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
    marginBottom: 12,
  },
  item: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 10,
  },
  value: { color: "#FFFFFF", fontWeight: "600" },
  meta: { color: "#9CA3AF", marginTop: 4 },
  empty: { color: "#9CA3AF" },
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
