import { DefaultTheme, ThemeProvider, type Theme } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import "react-native-reanimated";

import { Color } from "@/constants/theme";
import { initNotifications } from "@/services/notifications";

// Single light identity — never follows the device appearance.
const DaylightTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: Color.accent,
    background: Color.bg,
    card: Color.bg,
    text: Color.label,
    border: Color.hairline,
    notification: Color.accent,
  },
};
// Efeito colateral: registra o TaskManager.defineTask do assistente. Precisa
// acontecer no escopo de módulo, antes de qualquer tela montar.
import "@/services/background-tasks";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const router = useRouter();

  // Handler + canais de notificação, uma vez, cedo.
  useEffect(() => {
    initNotifications();
  }, []);

  // Toque na notificação → abre a rota que veio no payload (data.route).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const route = (response.notification.request.content.data as any)?.route;
        if (typeof route === "string" && route) {
          router.push(route as never);
        }
      },
    );
    return () => sub.remove();
  }, [router]);

  return (
    <ThemeProvider value={DaylightTheme}>
      <Stack
        screenOptions={{ contentStyle: { backgroundColor: Color.bg } }}
      >
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
        <Stack.Screen
          name="(whatsapp)/index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(ai-terms)/index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(assistant)/index"
          options={{ headerShown: false }}
        />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
