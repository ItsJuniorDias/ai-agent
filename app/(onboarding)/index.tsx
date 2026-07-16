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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  loadEnabledIntegrations,
  saveEnabledIntegrations,
} from "@/services/config";
import { ALL_TOOLS } from "@/agent/tools";
import type { IntegrationId } from "@/agent/types";

type Option = {
  id: IntegrationId;
  title: string;
  desc: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  /** Rota da tela de credenciais. */
  route: string;
};

const CATEGORIES: { id: string; title: string; options: Option[] }[] = [
  {
    id: "dev",
    title: "Development & Code",
    options: [
      {
        id: "github",
        title: "GitHub",
        desc: "Read diffs, review and open PRs, file issues",
        icon: "github",
        color: "#181717",
        route: "/(github)",
      },
      {
        id: "gitlab",
        title: "GitLab",
        desc: "Merge requests, diffs and comments",
        icon: "gitlab",
        color: "#FC6D26",
        route: "/(gitlab)",
      },
      {
        id: "vercel",
        title: "Vercel",
        desc: "Check deployments, trigger a redeploy",
        icon: "triangle-outline",
        color: "#000000",
        route: "/(vercel)",
      },
    ],
  },
  {
    id: "planning",
    title: "Management & Planning",
    options: [
      {
        id: "jira",
        title: "Jira",
        desc: "Search with JQL, create issues, comment",
        icon: "jira",
        color: "#0052CC",
        route: "/(jira)",
      },
      {
        id: "linear",
        title: "Linear",
        desc: "List and create issues",
        icon: "vector-triangle",
        color: "#5E6AD2",
        route: "/(linear)",
      },
      {
        id: "notion",
        title: "Notion",
        desc: "Search the workspace, create pages",
        icon: "notebook-outline",
        color: "#000000",
        route: "/(notion)",
      },
    ],
  },
  {
    id: "design",
    title: "Design",
    options: [
      {
        id: "figma",
        title: "Figma",
        desc: "Inspect a file's structure, leave comments",
        icon: "vector-square",
        color: "#F24E1E",
        route: "/(figma)",
      },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    options: [
      {
        id: "slack",
        title: "Slack",
        desc: "List channels, post messages",
        icon: "slack",
        color: "#4A154B",
        route: "/(slack)",
      },
      {
        id: "discord",
        title: "Discord",
        desc: "Post to a channel via webhook",
        icon: "chat-processing",
        color: "#5865F2",
        route: "/(discord)",
      },
      {
        id: "teams",
        title: "Microsoft Teams",
        desc: "Post to a channel",
        icon: "microsoft-teams",
        color: "#6264A7",
        route: "/(teams)",
      },
      {
        id: "whatsapp",
        title: "WhatsApp",
        desc: "Send messages via Cloud API",
        icon: "whatsapp",
        color: "#25D366",
        route: "/(whatsapp)",
      },
      {
        id: "gmail",
        title: "Gmail",
        desc: "Draft and send email",
        icon: "gmail",
        color: "#EA4335",
        route: "/(gmail)",
      },
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
  const router = useRouter();
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
        "Nothing selected",
        "Pick at least one service, or skip — the agent can still chat, remember, search the web and generate images.",
        [
          { text: "Back", style: "cancel" },
          {
            text: "Skip",
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>What can the agent touch?</Text>
            <Text style={styles.subtitle}>
              Pick every service you use. The agent decides on its own which one
              to reach for — you are not choosing one primary tool.
            </Text>

            <TouchableOpacity onPress={selectAll} style={styles.selectAll}>
              <Text style={styles.selectAllText}>
                {selected.length === ALL_IDS.length
                  ? "Deselect all"
                  : "Select all"}
              </Text>
            </TouchableOpacity>
          </View>

          {CATEGORIES.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.title}</Text>

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
                          {option.desc}
                        </Text>
                      </View>

                      {isSelected ? (
                        <TouchableOpacity
                          onPress={() => router.push(option.route as never)}
                          style={styles.setupButton}
                          hitSlop={8}
                        >
                          <Text style={styles.setupText}>Set up</Text>
                          <Feather
                            name="chevron-right"
                            size={14}
                            color="#007AFF"
                          />
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

          <Text style={styles.note}>
            Selecting a service here just tells the agent it exists. It only
            becomes usable once you save its credentials on its own screen —
            tap “Set up”.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerCount}>
            {totalTools} tools will be available to the agent
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 140 },
  header: { marginBottom: 28 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 16, color: "#8E8E93", lineHeight: 22 },
  selectAll: { marginTop: 14 },
  selectAllText: { fontSize: 15, color: "#007AFF", fontWeight: "500" },
  categorySection: { marginBottom: 24 },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  optionsGrid: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardSelected: { backgroundColor: "#E5F0FF", borderColor: "#007AFF" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  cardDescription: { fontSize: 13, color: "#8E8E93" },
  textSelected: { color: "#007AFF" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D1D6",
  },
  setupButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  setupText: { fontSize: 14, color: "#007AFF", fontWeight: "500" },
  note: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 34,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  footerCount: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
