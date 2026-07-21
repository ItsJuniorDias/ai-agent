/**
 * Tabs shared by the main app screens.
 *
 * JavaScript tabs deliberately replace the experimental native-tab layout
 * here. They make the tab-bar height part of each screen's layout and can hide
 * the bar while the IME is open, so a composer is never covered by a tab.
 */

import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { Color } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Color.accent,
        tabBarInactiveTintColor: Color.tertiary,
        // Reclaim the tab-bar area while typing. The KeyboardAvoidingViews in
        // the chat and Studio screens then place their composers above the IME.
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ask AI",
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate-image"
        options={{
          title: "Studio",
          tabBarIcon: ({ color, size }) => (
            <Feather name="image" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="convert-pdf"
        options={{
          title: "Files",
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
