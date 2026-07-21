/**
 * Onboarding / gerenciador de integrações.
 *
 * Antes: escolha **única**. Você elegia "sua ferramenta principal" e o app
 * salvava em `@primary_integration`; a tela de chat lia isso e mostrava um
 * botão que disparava uma ação fixa daquele serviço. Só dava para usar uma
 * integração por vez, e trocar exigia voltar ao onboarding.
 *
 * Agora: seleção **múltipla** → `@enabled_integrations`. O agente enxerga todas
 * de uma vez e decide qual usar por conta própria. Ler um PR do GitHub e postar
 * o resumo no Slack, na mesma mensagem, virou possível.
 *
 * O modal falso de "Sign in with Google" também saiu: ele não fazia OAuth
 * nenhum, só chamava `proceedToNextScreen("gmail")`. A tela do Gmail explica
 * o que realmente é necessário.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  loadEnabledIntegrations,
  saveEnabledIntegrations,
} from "@/services/config";
import { ALL_TOOLS } from "@/agent/tools";
import { GlassSurface } from "@/components/ui/glass-surface";
import { GradientButton } from "@/components/ui/gradient-button";
import { Color, Palette, Radius, Spacing, Type } from "@/constants/theme";
import type { IntegrationId } from "@/agent/types";
import { useTranslation } from "@/i18n";

type Option = {
  id: IntegrationId;
  /** Nome da marca — literal, não traduzido. */
  title: string;
  /** Chave i18n da descrição curta (namespace `onboarding`). */
  descKey: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  route: string;
};

const CATEGORIES: { id: string; titleKey: string; options: Option[] }[] = [
  {
    id: "dev",
    titleKey: "onboarding.catDev",
    options: [
      { id: "github", title: "GitHub", descKey: "onboarding.descGithub", icon: "github", color: "#181717", route: "/(github)" },
      { id: "gitlab", title: "GitLab", descKey: "onboarding.descGitlab", icon: "gitlab", color: "#FC6D26", route: "/(gitlab)" },
      { id: "vercel", title: "Vercel", descKey: "onboarding.descVercel", icon: "triangle-outline", color: "#111111", route: "/(vercel)" },
    ],
  },
  {
    id: "planning",
    titleKey: "onboarding.catPlanning",
    options: [
      { id: "jira", title: "Jira", descKey: "onboarding.descJira", icon: "jira", color: "#0052CC", route: "/(jira)" },
      { id: "linear", title: "Linear", descKey: "onboarding.descLinear", icon: "vector-triangle", color: "#5E6AD2", route: "/(linear)" },
      { id: "notion", title: "Notion", descKey: "onboarding.descNotion", icon: "notebook-outline", color: "#111111", route: "/(notion)" },
    ],
  },
  {
    id: "design",
    titleKey: "onboarding.catDesign",
    options: [
      { id: "figma", title: "Figma", descKey: "onboarding.descFigma", icon: "vector-square", color: "#F24E1E", route: "/(figma)" },
    ],
  },
  {
    id: "communication",
    titleKey: "onboarding.catCommunication",
    options: [
      { id: "slack", title: "Slack", descKey: "onboarding.descSlack", icon: "slack", color: "#4A154B", route: "/(slack)" },
      { id: "discord", title: "Discord", descKey: "onboarding.descDiscord", icon: "chat-processing", color: "#5865F2", route: "/(discord)" },
      { id: "teams", title: "Microsoft Teams", descKey: "onboarding.descTeams", icon: "microsoft-teams", color: "#6264A7", route: "/(teams)" },
      { id: "whatsapp", title: "WhatsApp", descKey: "onboarding.descWhatsapp", icon: "whatsapp", color: "#25D366", route: "/(whatsapp)" },
      { id: "gmail", title: "Gmail", descKey: "onboarding.descGmail", icon: "gmail", color: "#EA4335", route: "/(gmail)" },
    ],
  },
];

const ALL_IDS = CATEGORIES.flatMap((c) => c.options.map((o) => o.id));

/** Quantas tools cada integração traz — dado real, direto do catálogo. */
const TOOL_COUNT = ALL_TOOLS.reduce<Record<string, number>>((acc, tool) => {
  acc[tool.integration] = (acc[tool.integration] ?? 0) + 1;
  return acc;
}, {});

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<IntegrationId[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadEnabledIntegrations().then((saved) => {
        setSelected((saved as IntegrationId[]) ?? []);
      });
    }, []),
  );

  const toggle = (id: IntegrationId) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id],
    );
  };

  const handleContinue = async () => {
    if (!selected.length) {
      Alert.alert(
        t("onboarding.nothingSelectedTitle"),
        t("onboarding.nothingSelectedBody"),
        [
          { text: t("common.back"), style: "cancel" },
          {
            text: t("onboarding.skip"),
            onPress: async () => {
              await saveEnabledIntegrations([]);
              router.replace("/(tabs)");
            },
          },
        ],
      );
      return;
    }

    await saveEnabledIntegrations(selected);
    router.replace("/(tabs)");
  };

  const selectAll = () => {
    setSelected(selected.length === ALL_IDS.length ? [] : ALL_IDS);
  };

  const totalTools = selected.reduce(
    (sum, id) => sum + (TOOL_COUNT[id] ?? 0),
    ALL_TOOLS.filter((t) => t.integration === "core").length,
  );

  return (
    <View style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>{t("onboarding.setup")}</Text>
          <Text style={styles.title}>{t("onboarding.title")}</Text>
          <Text style={styles.subtitle}>{t("onboarding.subtitle")}</Text>

          <TouchableOpacity onPress={selectAll} style={styles.selectAll}>
            <Text style={styles.selectAllText}>
              {selected.length === ALL_IDS.length
                ? t("onboarding.deselectAll")
                : t("onboarding.selectAll")}
            </Text>
          </TouchableOpacity>
        </View>

        {CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{t(category.titleKey)}</Text>

            <View style={styles.optionsGrid}>
              {category.options.map((option) => {
                const isSelected = selected.includes(option.id);

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => toggle(option.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={20}
                        color={option.color}
                      />
                    </View>

                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isSelected && styles.textSelected,
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text style={styles.cardDescription} numberOfLines={1}>
                        {t(option.descKey)}
                      </Text>
                    </View>

                    {isSelected ? (
                      <TouchableOpacity
                        onPress={() => router.push(option.route as never)}
                        style={styles.setupButton}
                        hitSlop={8}
                      >
                        <Text style={styles.setupText}>{t("onboarding.setUp")}</Text>
                        <Feather name="chevron-right" size={14} color={Color.accent} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.checkbox} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.note}>{t("onboarding.note")}</Text>
      </ScrollView>

      <View
        style={[
          styles.footerDock,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
        ]}
      >
        <GlassSurface radius={Radius.xxl} style={styles.footer}>
          <Text style={styles.footerCount}>
            {t("onboarding.toolsCount", { count: totalTools })}
          </Text>
          <GradientButton
            label={t("onboarding.continue")}
            onPress={handleContinue}
          />
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 200,
  },
  header: { marginBottom: Spacing.xxl },
  kicker: {
    ...Type.caption2,
    color: Color.accent,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: { ...Type.title1, color: Color.label, marginBottom: Spacing.sm },
  subtitle: { ...Type.callout, color: Color.secondary, lineHeight: 22 },
  selectAll: { marginTop: 14 },
  selectAllText: { ...Type.subhead, color: Color.accent, fontWeight: "500" },
  categorySection: { marginBottom: Spacing.xxl },
  categoryTitle: {
    ...Type.eyebrow,
    color: Color.secondary,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  optionsGrid: { gap: Spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Color.surface,
    borderWidth: 1.5,
    borderColor: Color.hairline,
  },
  cardSelected: { backgroundColor: Color.accentSoft, borderColor: Color.accent },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Palette.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: { flex: 1 },
  cardTitle: { ...Type.callout, fontWeight: "600", color: Color.label },
  cardDescription: { ...Type.footnote, color: Color.secondary },
  textSelected: { color: Color.accent },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Color.hairlineStrong,
  },
  setupButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  setupText: { fontSize: 14, color: Color.accent, fontWeight: "500" },
  note: { ...Type.footnote, color: Color.secondary, lineHeight: 19, paddingHorizontal: 4 },
  footerDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  footer: { padding: Spacing.lg, gap: Spacing.md },
  footerCount: { ...Type.footnote, color: Color.secondary, textAlign: "center" },
});
