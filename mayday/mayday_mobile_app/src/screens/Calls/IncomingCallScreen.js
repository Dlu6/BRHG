import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { answerCall, hangupCall } from "../../services/sipClient";

export default function IncomingCallScreen({ navigation, route }) {
  const caller = route?.params?.caller || "Unknown";

  const handleAnswer = () => {
    answerCall();
    navigation.replace("Call", { number: caller });
  };

  const handleDecline = () => {
    hangupCall();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming Call</Text>
      <Text style={styles.sub}>{caller}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={handleAnswer}
          style={[styles.btn, styles.answer]}
        >
          <Text style={styles.btnText}>Answer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDecline}
          style={[styles.btn, styles.reject]}
        >
          <Text style={styles.btnText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  sub: { color: "#9CA3AF", marginTop: 8, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 80,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  answer: { backgroundColor: "#0B9246", marginRight: 12 },
  reject: { backgroundColor: "#B91C1C" },
  btnText: { color: "#FFFFFF", fontWeight: "700" },
});
