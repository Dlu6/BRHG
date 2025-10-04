import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginMobileScreen from "../screens/Auth/LoginMobileScreen";
import IncomingCallScreen from "../screens/Calls/IncomingCallScreen";
import CallScreen from "../screens/Calls/CallScreen";
import BottomTabNavigator from "./BottomTabNavigator"; // Import the new Tab Navigator
import SettingsScreen from "../screens/Settings/SettingsScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginMobileScreen} />
      {/* Replace the DrawerNavigator with the BottomTabNavigator */}
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="IncomingCall" component={IncomingCallScreen} />
      <Stack.Screen name="Call" component={CallScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
