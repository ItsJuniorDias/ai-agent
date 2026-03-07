import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(app)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(jira)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(github)/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="(onboarding)/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="(vercel)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(linear)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(notion)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(gmail)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(slack)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(gitlab)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(teams)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(figma)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(discord)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(excel)/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="(whatsapp)/index"
          options={{ headerShown: false }}
        />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
