import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function ContactsScreen() {
  const [query, setQuery] = useState("");
  const contacts = [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contacts</Text>
      <TextInput
        style={styles.search}
        placeholder="Search by name or extension"
        placeholderTextColor="#9CA3AF"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={contacts}
        keyExtractor={(i, idx) => String(idx)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>ext {item.extension}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No contacts</Text>}
      />
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
  search: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
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
  name: { color: "#FFFFFF", fontWeight: "700" },
  meta: { color: "#9CA3AF", marginTop: 4 },
  empty: { color: "#9CA3AF" },
});
