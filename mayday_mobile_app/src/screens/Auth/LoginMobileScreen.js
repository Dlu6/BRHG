import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../store/slices/authSlice";
import { registerSip } from "../../store/slices/sipSlice";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  normalizeApiBaseUrl,
} from "../../config/endpoints";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";

export default function LoginMobileScreen({ navigation }) {
  const [email, setEmail] = useState("mobile@gmail.com");
  const [password, setPassword] = useState("12345");
  const [host, setHost] = useState(getApiBaseUrl());
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hostSaveTimer = useRef(null);
  const dispatch = useDispatch();
  const authStatus = useSelector((s) => s.auth.status);
  const sipConnecting = useSelector((s) => s.sip.connecting);

  const isLoading = authStatus === "loading" || sipConnecting;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remembered = await SecureStore.getItemAsync("mayday_remember");
        if (remembered === "true") {
          const savedHost = await SecureStore.getItemAsync("mayday_host");
          const savedEmail = await SecureStore.getItemAsync("mayday_email");
          const savedPassword = await SecureStore.getItemAsync(
            "mayday_password"
          );
          if (!mounted) return;
          if (savedHost) {
            const normalized = normalizeApiBaseUrl(savedHost);
            setHost(normalized);
            setApiBaseUrl(normalized);
          }
          if (savedEmail) setEmail(savedEmail);
          if (savedPassword) setPassword(savedPassword);
          setRemember(true);
        }
        // Restore UI preferences
        const savedShow = await SecureStore.getItemAsync(
          "mayday_show_password"
        );
        if (mounted && (savedShow === "true" || savedShow === "false")) {
          setShowPassword(savedShow === "true");
        }
      } catch (_) {
        // ignore secure store read errors
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onLogin = async () => {
    try {
      // Apply tenant host before attempting login
      if (host && typeof host === "string") {
        setApiBaseUrl(normalizeApiBaseUrl(host));
      }
      const loginResult = await dispatch(login({ email, password })).unwrap();
      const data = loginResult?.data || loginResult;

      if (data && data.user && data.user.pjsip) {
        const pjsip = data.user.pjsip;
        const sipConfig = {
          server: pjsip.server,
          extension: data.user.extension,
          password: pjsip.password, // Use the specific SIP password from the payload
          wsServers: pjsip.ws_servers || [],
          iceServers: pjsip.ice_servers || [],
        };

        // Persist credentials if requested
        try {
          if (remember) {
            await SecureStore.setItemAsync("mayday_remember", "true");
            await SecureStore.setItemAsync("mayday_host", host || "");
            await SecureStore.setItemAsync("mayday_email", email || "");
            await SecureStore.setItemAsync("mayday_password", password || "");
          } else {
            await SecureStore.deleteItemAsync("mayday_remember");
            await SecureStore.deleteItemAsync("mayday_host");
            await SecureStore.deleteItemAsync("mayday_email");
            await SecureStore.deleteItemAsync("mayday_password");
          }
        } catch (_) {
          // ignore secure store write errors
        }

        // Dispatch the thunk to handle SIP registration
        await dispatch(registerSip(sipConfig)).unwrap();

        // Navigate to the main app screen on successful login and SIP registration
        navigation.replace("Main");
      } else {
        throw new Error(
          "Login response did not include valid SIP credentials."
        );
      }
    } catch (e) {
      console.warn("Login or SIP Registration Error:", e?.message || e);
      // Here you could show an alert to the user
      // Alert.alert("Login Failed", e?.message || "An unknown error occurred.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mayday Mobile</Text>
      <TextInput
        style={styles.input}
        placeholder="Host (e.g. https://tenant.example.com/mayday-api)"
        placeholderTextColor="#9CA3AF"
        value={host}
        onChangeText={(text) => {
          setHost(text);
          // Debounced persist + apply normalized base URL for subsequent requests
          if (hostSaveTimer.current) clearTimeout(hostSaveTimer.current);
          hostSaveTimer.current = setTimeout(async () => {
            try {
              const normalized = normalizeApiBaseUrl(text);
              await SecureStore.setItemAsync("mayday_host", normalized);
              setApiBaseUrl(normalized);
            } catch {}
          }, 400);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={async (t) => {
          setEmail(t);
          if (remember) {
            try {
              await SecureStore.setItemAsync("mayday_email", t || "");
            } catch {}
          }
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <View style={styles.passwordWrap}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={async (t) => {
            setPassword(t);
            if (remember) {
              try {
                await SecureStore.setItemAsync("mayday_password", t || "");
              } catch {}
            }
          }}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={async () => {
            setShowPassword((v) => !v);
            try {
              await SecureStore.setItemAsync(
                "mayday_show_password",
                (!showPassword).toString()
              );
            } catch {}
          }}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={async () => {
          const next = !remember;
          setRemember(next);
          try {
            if (next) {
              await SecureStore.setItemAsync("mayday_remember", "true");
              await SecureStore.setItemAsync("mayday_email", email || "");
              await SecureStore.setItemAsync("mayday_password", password || "");
            } else {
              await SecureStore.setItemAsync("mayday_remember", "false");
              await SecureStore.deleteItemAsync("mayday_email");
              await SecureStore.deleteItemAsync("mayday_password");
            }
          } catch {}
        }}
        style={styles.rememberRow}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
          {remember && <Ionicons name="checkmark" size={14} color="#0A0A0A" />}
        </View>
        <Text style={styles.rememberText}>Remember me</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onLogin}
        style={styles.button}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
  },
  checkboxChecked: {
    backgroundColor: "#34D399",
    borderColor: "#34D399",
  },
  rememberText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#1D4ED8", // A more prominent blue
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginTop: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
});
