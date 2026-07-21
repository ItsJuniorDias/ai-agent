/**
 * Native tab bar.
 *
 * Keep the platform-native, translucent tab treatment. Keyboard avoidance is
 * handled by each screen's composer and Android's resize window mode rather
 * than replacing this navigator with JavaScript tabs.
 */

import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import { Color } from "@/constants/theme";

export default function TabLayout() {
  return (
    <NativeTabs tintColor={Color.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <Label>Ask AI</Label>
        <Icon sf="sparkles" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <Label>History</Label>
        <Icon sf="clock.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="generate-image">
        <Label>Studio</Label>
        <Icon sf="paintbrush.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="convert-pdf">
        <Label>Files</Label>
        <Icon sf="doc.text.magnifyingglass" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
