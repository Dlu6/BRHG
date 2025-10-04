import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { fetchMyPerformanceStats } from "../../store/slices/dashboardSlice";
import io from "socket.io-client";
import Constants from "expo-constants";
import { getApiBaseUrl } from "../../config/endpoints";

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const { stats, status, error } = useSelector((s) => s.dashboard);

  useEffect(() => {
    dispatch(fetchMyPerformanceStats("today"));

    // Realtime updates via Socket.IO (best-effort)
    const extra = Constants?.expoConfig?.extra || {};
    const baseUrl = getApiBaseUrl() || extra.API_BASE_URL || "";
    const socketUrl = baseUrl.replace(/\/api$/, "");

    let socket;
    try {
      socket = io(socketUrl, { transports: ["websocket"], path: "/socket.io" });
      socket.on("connect", () => {
        // Optionally authenticate/identify here if backend supports it
      });
      // If backend emits call updates, re-fetch quick personal stats
      const refresh = () => dispatch(fetchMyPerformanceStats("today"));
      socket.on("call_started", refresh);
      socket.on("call_ended", refresh);
      socket.on("stats_updated", refresh);
    } catch (e) {
      // Ignore socket wiring errors; fallback interval below covers updates
    }

    // Fallback polling every 60s to keep numbers fresh if socket is unavailable
    const id = setInterval(
      () => dispatch(fetchMyPerformanceStats("today")),
      60000
    );

    return () => {
      clearInterval(id);
      if (socket && socket.connected) socket.close();
    };
  }, [dispatch]);

  const onRefresh = () => {
    dispatch(fetchMyPerformanceStats("today"));
  };

  const errorMessage =
    typeof error === "string" ? error : error?.message || "Failed to load";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32, paddingTop: 10 }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Dashboard</Text>
        <TouchableOpacity onPress={onRefresh} disabled={status === "loading"}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {status === "loading" && <ActivityIndicator color="#FFFFFF" />}
      {status === "failed" && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {status === "succeeded" && (
        <View style={styles.grid}>
          <MetricCard
            icon="call"
            iconColor="#34D399"
            title="Total Calls Today"
            value={String(stats.totalCalls || 0)}
          />
          <MetricCard
            icon="timer"
            iconColor="#F59E0B"
            title="Avg. Handle Time"
            value={String(stats.avgHandleTime || "0:00")}
          />
          <MetricCard
            icon="arrow-down-circle"
            iconColor="#22C55E"
            title="Inbound"
            value={String(stats.inbound || 0)}
          />
          <MetricCard
            icon="arrow-up-circle"
            iconColor="#3B82F6"
            title="Outbound"
            value={String(stats.outbound || 0)}
          />
          <MetricCard
            icon="close-circle"
            iconColor="#EF4444"
            title="Abandoned"
            value={String((stats.abandoned ?? stats.missed) || 0)}
          />
          <MetricCard
            icon="radio"
            iconColor="#8B5CF6"
            title="Active Calls"
            value={String(stats.active || 0)}
          />
        </View>
      )}
    </ScrollView>
  );
}

function MetricCard({ icon, title, value, iconColor }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={iconColor || "#9CA3AF"} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", padding: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  refreshText: {
    color: "#3B82F6",
    fontSize: 16,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    marginVertical: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: { color: "#9CA3AF", fontWeight: "600" },
  cardValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 22 },
});
