import { Stack } from "expo-router";
import { Color } from "@/constants/theme";

export default function CustomToolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Color.bg },
        headerTintColor: Color.label,
        headerTitleStyle: { color: Color.label },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: "New custom tool" }} />
      <Stack.Screen name="[toolId]" options={{ title: "Edit tool" }} />
    </Stack>
  );
}
