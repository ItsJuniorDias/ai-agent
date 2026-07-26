/**
 * Tela do Sub-agent.
 *
 * Antes essa config vivia como duas seções gigantes dentro de Ajustes — uma
 * lista inteira de modelos duplicada logo abaixo da lista do agente principal.
 * Ruim visualmente e ruim como sinal: pra 90% dos usuários, a config do
 * sub-agent é "deixa no auto e vamo embora"; enfiar isso na tela principal
 * cria fricção. Agora é uma linha só em Ajustes → Sub-agents com chevron,
 * seguindo o mesmo padrão do Personal Assistant, MCP e Custom tools.
 *
 * O que se ajusta aqui:
 *   - modelo do mini-loop (com "Auto" no topo que serializa como `undefined`
 *     e cai em `orchestrationModel` → `model`);
 *   - teto de rounds do sub-loop (3 / 5 / 8 / 12).
 *
 * A explicação de *quando* delegar fica no `intro` — é o único ponto do app
 * onde o user encontra a feature explicada em prosa, então vale caprichar.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AGENT_MODELS,
  AgentConfig,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
} from "@/services/config";
import { Color, Palette, Radius, Spacing, Type } from "@/constants/theme";
import { useTranslation } from "@/i18n";

const SUBAGENT_STEP_OPTIONS = [3, 5, 8, 12];

function formatPrice(amount: string, unit: string): string {
  return `${amount} ${unit}`.trim();
}

export default function SubagentScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setConfig(await loadConfig());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const update = async (patch: Partial<AgentConfig>) => {
    setConfig(await saveConfig(patch));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Color.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={26} color={Color.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("subagent.title")}</Text>
      </View>

      <Text style={styles.intro}>{t("subagent.intro")}</Text>

      {/* -- Modelo do sub-agent ------------------------------------------- */}
      <Text style={styles.sectionTitle}>{t("subagent.modelSection")}</Text>
      <View style={styles.group}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => update({ subagentModel: undefined })}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <View
              style={[styles.iconContainer, { backgroundColor: Color.secondary }]}
            >
              <Ionicons name="git-branch" size={16} color={Palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t("subagent.auto")}</Text>
              <Text style={styles.rowSubtext}>{t("subagent.autoSub")}</Text>
            </View>
          </View>
          {config.subagentModel === undefined && (
            <Ionicons name="checkmark" size={22} color={Color.accent} />
          )}
        </TouchableOpacity>
        {AGENT_MODELS.map((model, index) => (
          <TouchableOpacity
            key={model.id}
            style={[
              styles.row,
              index === AGENT_MODELS.length - 1 && styles.noBorder,
            ]}
            onPress={() => update({ subagentModel: model.id })}
            activeOpacity={0.6}
          >
            <View style={styles.rowLeft}>
              <View
                style={[styles.iconContainer, { backgroundColor: model.color }]}
              >
                <Ionicons name="sparkles" size={16} color={Palette.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{model.name}</Text>
                <Text style={styles.rowSubtext}>
                  {t(model.descKey)} ·{" "}
                  {formatPrice(model.priceAmount, t(model.priceUnitKey))}
                </Text>
              </View>
            </View>
            {config.subagentModel === model.id && (
              <Ionicons name="checkmark" size={22} color={Color.accent} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footerText}>{t("subagent.modelFooter")}</Text>

      {/* -- Max rounds do sub-loop --------------------------------------- */}
      <Text style={styles.sectionTitle}>{t("subagent.maxRoundsSection")}</Text>
      <View style={styles.segmented}>
        {SUBAGENT_STEP_OPTIONS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              styles.segment,
              config.subagentMaxSteps === n && styles.segmentActive,
            ]}
            onPress={() => update({ subagentMaxSteps: n })}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                config.subagentMaxSteps === n && styles.segmentTextActive,
              ]}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footerText}>{t("subagent.maxRoundsFooter")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.bg },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: 6,
  },
  back: { padding: 4, marginRight: 2 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: Color.label,
  },
  intro: {
    ...Type.footnote,
    color: Color.secondary,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    ...Type.eyebrow,
    color: Color.secondary,
    marginLeft: Spacing.xxxl,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xxl,
  },
  group: {
    backgroundColor: Color.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    marginHorizontal: Spacing.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.hairline,
    gap: Spacing.md,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rowText: { ...Type.body, color: Color.label },
  rowSubtext: {
    ...Type.caption,
    color: Color.secondary,
    marginTop: 1,
    lineHeight: 16,
  },
  noBorder: { borderBottomWidth: 0 },
  footerText: {
    ...Type.footnote,
    color: Color.secondary,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    lineHeight: 18,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: Color.surface2,
    borderRadius: Radius.sm,
    padding: 3,
    marginHorizontal: Spacing.lg,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: Color.surface3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
  },
  segmentText: { ...Type.subhead, color: Color.secondary, fontWeight: "500" },
  segmentTextActive: { color: Color.label, fontWeight: "600" },
});
