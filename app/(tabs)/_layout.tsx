/**
 * Native tab bar.
 *
 * Keep the platform-native, translucent tab treatment. Keyboard avoidance is
 * handled by each screen's composer and Android's resize window mode rather
 * than replacing this navigator with JavaScript tabs.
 */

import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <NativeTabs tintColor={Color.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <Label>{t("askAI")}</Label>
        <Icon sf="sparkles" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <Label>{t("history")}</Label>
        <Icon sf="clock.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="generate-image">
        <Label>{t("studio")}</Label>
        <Icon sf="paintbrush.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="convert-pdf">
        <Label>{t("files")}</Label>
        <Icon sf="doc.text.magnifyingglass" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>{t("settings")}</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
