import { Stack } from "expo-router";
import { Color } from "@/constants/theme";

export default function MCPLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Color.bg },
      }}
    />
  );
}
