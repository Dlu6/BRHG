import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

export default function FavoritesScreen() {
  const favorites = [];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorites</Text>
      <FlatList
        data={favorites}
        keyExtractor={(i, idx) => String(idx)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>ext {item.extension}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No favorites yet</Text>}
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
