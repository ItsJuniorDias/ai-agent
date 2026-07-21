/**
 * Ajustes.
 *
 * A versão antiga listava modelos Gemini em um `useState` e não salvava nada —
 * escolher "Gemini 2.5 Pro" ali não mudava absolutamente nada no app, porque a
 * tela de chat instanciava `gemini-2.5-pro` chumbado no código. Um dos modelos
 * da lista (`veo-3.0-fast-generate-001`) nem era um modelo de chat.
 *
 * Agora tudo aqui é lido pelo agente a cada execução, via `loadConfig()`.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AGENT_MODELS,
  AgentConfig,
  DEFAULT_CONFIG,
  IMAGE_MODELS,
  loadAssistantConfig,
  loadConfig,
  saveConfig,
} from "@/services/config";
import { resolveTools } from "@/agent/registry";
import { clearMemory, countMemories } from "@/agent/memory";
import { getPermissionStatus } from "@/services/notifications";
import { hasApiKey } from "@/services/openrouter";
import { INTEGRATION_META } from "@/components/agent-trace";
import { Color, Palette, Radius, Spacing, Type } from "@/constants/theme";
import type { AgentTool } from "@/agent/types";
import { useTranslation } from "@/i18n";

const STEP_OPTIONS = [4, 6, 8, 12, 16];

/** Switch styling shared by every toggle — iris "on", quiet "off". */
const switchProps = {
  trackColor: { false: Color.surface3, true: Color.success },
  ios_backgroundColor: Color.surface3,
  thumbColor: Palette.white,
};

export default function Settings() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [assistantOn, setAssistantOn] = useState(false);
  const [notifOn, setNotifOn] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const cfg = await loadConfig();
    setConfig(cfg);

    const [available, count, assistant, perm] = await Promise.all([
      resolveTools(cfg),
      countMemories(),
      loadAssistantConfig(),
      getPermissionStatus(),
    ]);

    setTools(available);
    setMemoryCount(count);
    setAssistantOn(assistant.enabled);
    setNotifOn(perm === "granted");
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  /** Salva e atualiza o cache na hora — o próximo turno já usa o valor novo. */
  const update = async (patch: Partial<AgentConfig>) => {
    const next = await saveConfig(patch);
    setConfig(next);
    setTools(await resolveTools(next));
  };

  const confirmClearMemory = () => {
    Alert.alert(
      "Clear long-term memory",
      `Delete all ${memoryCount} remembered facts? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await clearMemory();
            setMemoryCount(0);
          },
        },
      ],
    );
  };

  const connected = Array.from(
    new Set(
      tools.filter((t) => t.integration !== "core").map((t) => t.integration),
    ),
  );

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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.kicker}>{t("preferences")}</Text>
        <Text style={styles.title}>{t("settings")}</Text>
      </View>

      {/* Chave ausente é a causa nº 1 de "o app não faz nada" */}
      {!hasApiKey() && (
        <View style={styles.banner}>
          <Feather name="alert-triangle" size={18} color={Color.warning} />
          <Text style={styles.bannerText}>
            No OpenRouter key found. Add EXPO_PUBLIC_OPENROUTER_API_KEY to your
            .env and restart with `npx expo start -c`.
          </Text>
        </View>
      )}

      {/* -- Assistente pessoal ------------------------------------------ */}
      <Text style={styles.sectionTitle}>{t("personalAssistant")}</Text>
      <View style={styles.group}>
        <TouchableOpacity
          style={[styles.row, styles.noBorder]}
          onPress={() => router.push("/(assistant)" as never)}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: Color.success }]}>
              <Ionicons name="notifications" size={17} color={Palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t("proactiveAssistant")}</Text>
              <Text style={styles.rowSubtext}>
                {assistantOn
                  ? notifOn
                    ? t("enabledWatching")
                    : t("notificationsBlocked")
                  : t("disabledConfigure")}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={Color.tertiary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.footerText}>
        Alertas em segundo plano e lembretes agendados. O agente te avisa sobre
        PRs esperando review, deploys quebrados e issues novas.
      </Text>

      {/* -- Modelo do agente ------------------------------------------- */}
      <Text style={styles.sectionTitle}>{t("agentModel")}</Text>
      <View style={styles.group}>
        {AGENT_MODELS.map((model, index) => (
          <TouchableOpacity
            key={model.id}
            style={[
              styles.row,
              index === AGENT_MODELS.length - 1 && styles.noBorder,
            ]}
            onPress={() => update({ model: model.id })}
            activeOpacity={0.6}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: model.color }]}>
                <Ionicons name="sparkles" size={16} color={Palette.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{model.name}</Text>
                <Text style={styles.rowSubtext}>
                  {model.desc} · {model.price}
                </Text>
              </View>
            </View>
            {config.model === model.id && (
              <Ionicons name="checkmark" size={22} color={Color.accent} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footerText}>
        Every model listed supports tool calling — without it the agent cannot
        act at all. Pricing is input / output per 1M tokens.
      </Text>

      {/* -- Comportamento ----------------------------------------------- */}
      <Text style={styles.sectionTitle}>{t("agentBehavior")}</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: Color.warning }]}>
              <Ionicons name="shield-checkmark" size={17} color={Palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t("askBeforeActing")}</Text>
              <Text style={styles.rowSubtext}>
                {t("approveWrites")}
              </Text>
            </View>
          </View>
          <Switch
            {...switchProps}
            onValueChange={(v) => update({ requireApproval: v })}
            value={config.requireApproval}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: Color.accent }]}>
              <Ionicons name="globe" size={17} color={Palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Web access</Text>
              <Text style={styles.rowSubtext}>
                Let the agent search and read pages on its own
              </Text>
            </View>
          </View>
          <Switch
            {...switchProps}
            onValueChange={(v) => update({ webSearch: v })}
            value={config.webSearch}
          />
        </View>

        <View style={[styles.row, styles.noBorder]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: Color.accent }]}>
              <Ionicons name="finger-print" size={18} color={Palette.white} />
            </View>
            <Text style={styles.rowText}>Haptic feedback</Text>
          </View>
          <Switch
            {...switchProps}
            onValueChange={(v) => update({ haptics: v })}
            value={config.haptics}
          />
        </View>
      </View>
      {!config.requireApproval && (
        <Text style={[styles.footerText, styles.warningText]}>
          Approval is off. The agent will open pull requests, send messages and
          trigger deploys without asking you first.
        </Text>
      )}

      {/* -- Limite de passos -------------------------------------------- */}
      <Text style={styles.sectionTitle}>MAX TOOL ROUNDS</Text>
      <View style={styles.segmented}>
        {STEP_OPTIONS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.segment, config.maxSteps === n && styles.segmentActive]}
            onPress={() => update({ maxSteps: n })}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                config.maxSteps === n && styles.segmentTextActive,
              ]}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footerText}>
        How many times the agent may call tools before it must answer. Higher
        handles harder tasks; it also costs more per message.
      </Text>

      {/* -- Memória ------------------------------------------------------ */}
      <Text style={styles.sectionTitle}>MEMORY</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: Color.accent }]}>
              <Ionicons name="library" size={17} color={Palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Long-term memory</Text>
              <Text style={styles.rowSubtext}>
                {memoryCount} fact{memoryCount === 1 ? "" : "s"} remembered
              </Text>
            </View>
          </View>
          <Switch
            {...switchProps}
            onValueChange={(v) => update({ longTermMemory: v })}
            value={config.longTermMemory}
          />
        </View>

        <TouchableOpacity
          style={[styles.row, styles.noBorder]}
          onPress={confirmClearMemory}
          disabled={memoryCount === 0}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: Color.danger }]}>
              <Ionicons name="trash" size={17} color={Palette.white} />
            </View>
            <Text
              style={[
                styles.rowText,
                { color: memoryCount === 0 ? Color.tertiary : Color.danger },
              ]}
            >
              Clear memory
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* -- Studio de imagens -------------------------------------------- */}
      <Text style={styles.sectionTitle}>IMAGE MODEL</Text>
      <View style={styles.group}>
        {IMAGE_MODELS.map((model, index) => (
          <TouchableOpacity
            key={model.id}
            style={[
              styles.row,
              index === IMAGE_MODELS.length - 1 && styles.noBorder,
            ]}
            onPress={() => update({ imageModel: model.id })}
            activeOpacity={0.6}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: model.color }]}>
                <Ionicons name="image" size={16} color={Palette.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{model.name}</Text>
                <Text style={styles.rowSubtext}>
                  {model.desc} · {model.price}
                </Text>
              </View>
            </View>
            {config.imageModel === model.id && (
              <Ionicons name="checkmark" size={22} color={Color.accent} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* -- Integrações ativas ------------------------------------------- */}
      <Text style={styles.sectionTitle}>
        CONNECTED SERVICES · {tools.length} TOOLS
      </Text>
      <View style={styles.group}>
        {connected.length === 0 ? (
          <View style={[styles.row, styles.noBorder]}>
            <Text style={styles.rowSubtext}>
              No service connected yet. The agent can still chat, remember,
              search the web and generate images.
            </Text>
          </View>
        ) : (
          connected.map((id, index) => {
            const meta = INTEGRATION_META[id];
            const count = tools.filter((t) => t.integration === id).length;

            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.row,
                  index === connected.length - 1 && styles.noBorder,
                ]}
                onPress={() => router.push(`/(${id})` as never)}
                activeOpacity={0.6}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[styles.iconContainer, { backgroundColor: meta.color }]}
                  >
                    <Feather name={meta.icon} size={16} color={Palette.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{meta.label}</Text>
                    <Text style={styles.rowSubtext}>
                      {count} tool{count === 1 ? "" : "s"} available
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={Color.tertiary} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
      <Text style={styles.footerText}>
        A service shows up here once its credentials are saved. Tools you have
        not configured are never offered to the model — it cannot try and fail
        on them.
      </Text>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => router.push("/(onboarding)" as never)}
        activeOpacity={0.6}
      >
        <Text style={styles.linkText}>Manage integrations</Text>
        <Feather name="chevron-right" size={18} color={Color.accent} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.bg },
  center: { justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  kicker: {
    ...Type.caption2,
    color: Color.accent,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: { ...Type.largeTitle, color: Color.label },
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Color.warningSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.warning,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: 14,
    borderRadius: Radius.md,
  },
  bannerText: { flex: 1, ...Type.footnote, color: Color.label, lineHeight: 18 },
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
  rowSubtext: { ...Type.caption, color: Color.secondary, marginTop: 1, lineHeight: 16 },
  noBorder: { borderBottomWidth: 0 },
  footerText: {
    ...Type.footnote,
    color: Color.secondary,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    lineHeight: 18,
  },
  warningText: { color: Color.warning },
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
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Color.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  linkText: { ...Type.body, color: Color.accent },
});
