import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

export default function CallHistoryScreen() {
  const { history } = useSelector((s) => s.call);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call History</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.number}>{item.number}</Text>
            <Text style={styles.meta}>{item.direction} • {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No calls yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  item: { backgroundColor: '#111827', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', marginBottom: 10 },
  number: { color: '#FFFFFF', fontWeight: '700' },
  meta: { color: '#9CA3AF', marginTop: 4 },
  empty: { color: '#9CA3AF' }
});
