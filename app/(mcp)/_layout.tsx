import { Stack } from "expo-router";
import { Color } from "@/constants/theme";

export default function MCPLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Color.bg },
        headerTintColor: Color.label,
        headerTitleStyle: { color: Color.label },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: "Add MCP server" }} />
      <Stack.Screen name="[serverId]" options={{ title: "MCP server" }} />
    </Stack>
  );
}
