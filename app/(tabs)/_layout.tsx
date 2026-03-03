import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      // Optional: Set a global tint color for active tabs
      tintColor="#007AFF"
    >
      {/* 1. Central AI Agent (The primary CTA) */}
      <NativeTabs.Trigger name="index">
        <Label>Ask AI</Label>
        <Icon sf="sparkles.2" md="smart_toy" />
      </NativeTabs.Trigger>

      {/* 4. History / Saved Items (NOVA SEÇÃO) */}
      <NativeTabs.Trigger name="history">
        <Label>History</Label>
        <Icon sf="clock.fill" md="history" />
      </NativeTabs.Trigger>

      {/* 2. Image Generation */}
      <NativeTabs.Trigger name="generate-image">
        <Label>Studio</Label>
        <Icon sf="paintbrush.fill" md="palette" />
      </NativeTabs.Trigger>

      {/* 3. PDF/Document Processing */}
      <NativeTabs.Trigger name="convert-pdf">
        <Label>Files</Label>
        <Icon sf="doc.text.magnifyingglass" md="description" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
