import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function HelpScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text style={styles.title}>Help & Feedback</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Quick Tips</Text>
        <Text style={styles.value}>
          - Swipe from the left edge to open the drawer. - Use Agent Status to
          sign into queues. - Dialer shows registration state on top.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Version</Text>
        <Text style={styles.value}>Mayday Mobile • Dev Build</Text>
      </View>
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
  value: { color: "#FFFFFF", fontWeight: "600", lineHeight: 20 },
});
