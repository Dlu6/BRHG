import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons"; // Using Expo's built-in icon library

// Screens
import DialerScreen from "../screens/Calls/DialerScreen";
import CallHistoryScreen from "../screens/History/CallHistoryScreen";
import ContactsScreen from "../screens/Contacts/ContactsScreen";
import AgentStatusScreen from "../screens/Agent/AgentStatusScreen";
import DashboardScreen from "../screens/Dashboard/DashboardScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dialer: { focused: "keypad", unfocused: "keypad-outline" },
  History: { focused: "time", unfocused: "time-outline" },
  Contacts: { focused: "people", unfocused: "people-outline" },
  Status: { focused: "person-circle", unfocused: "person-circle-outline" },
  Dashboard: { focused: "stats-chart", unfocused: "stats-chart-outline" },
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0A0A0A",
          borderTopColor: "#1F2937",
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = focused
            ? ICONS[route.name].focused
            : ICONS[route.name].unfocused;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={CallHistoryScreen} />
      <Tab.Screen name="Dialer" component={DialerScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Status" component={AgentStatusScreen} />
    </Tab.Navigator>
  );
}
