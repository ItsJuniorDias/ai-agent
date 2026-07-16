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

import {
  AGENT_MODELS,
  AgentConfig,
  DEFAULT_CONFIG,
  IMAGE_MODELS,
  loadConfig,
  saveConfig,
} from "@/services/config";
import { resolveTools } from "@/agent/registry";
import { clearMemory, countMemories } from "@/agent/memory";
import { hasApiKey } from "@/services/openrouter";
import { INTEGRATION_META } from "@/components/agent-trace";
import type { AgentTool } from "@/agent/types";

const STEP_OPTIONS = [4, 6, 8, 12, 16];

export default function Settings() {
  const router = useRouter();

  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const cfg = await loadConfig();
    setConfig(cfg);

    const [available, count] = await Promise.all([
      resolveTools(cfg),
      countMemories(),
    ]);

    setTools(available);
    setMemoryCount(count);
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
    // Ligar/desligar memória muda a lista de tools disponíveis.
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
    new Set(tools.filter((t) => t.integration !== "core").map((t) => t.integration)),
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#8E8E93" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Chave ausente é a causa nº 1 de "o app não faz nada" */}
      {!hasApiKey() && (
        <View style={styles.banner}>
          <Feather name="alert-triangle" size={18} color="#FF9500" />
          <Text style={styles.bannerText}>
            No OpenRouter key found. Add EXPO_PUBLIC_OPENROUTER_API_KEY to your
            .env and restart with `npx expo start -c`.
          </Text>
        </View>
      )}

      {/* -- Modelo do agente ------------------------------------------- */}
      <Text style={styles.sectionTitle}>AGENT MODEL</Text>
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
                <Ionicons name="sparkles" size={16} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{model.name}</Text>
                <Text style={styles.rowSubtext}>
                  {model.desc} · {model.price}
                </Text>
              </View>
            </View>
            {config.model === model.id && (
              <Ionicons name="checkmark" size={22} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footerText}>
        Every model listed supports tool calling — without it the agent cannot
        act at all. Pricing is input / output per 1M tokens.
      </Text>

      {/* -- Comportamento ----------------------------------------------- */}
      <Text style={styles.sectionTitle}>AGENT BEHAVIOR</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="shield-checkmark" size={17} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Ask before acting</Text>
              <Text style={styles.rowSubtext}>
                Approve every write to an external service
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#34C759" }}
            ios_backgroundColor="#E9E9EA"
            onValueChange={(v) => update({ requireApproval: v })}
            value={config.requireApproval}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: "#007AFF" }]}>
              <Ionicons name="globe" size={17} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Web access</Text>
              <Text style={styles.rowSubtext}>
                Let the agent search and read pages on its own
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#34C759" }}
            ios_backgroundColor="#E9E9EA"
            onValueChange={(v) => update({ webSearch: v })}
            value={config.webSearch}
          />
        </View>

        <View style={[styles.row, styles.noBorder]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: "#5856D6" }]}>
              <Ionicons name="finger-print" size={18} color="white" />
            </View>
            <Text style={styles.rowText}>Haptic feedback</Text>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#34C759" }}
            ios_backgroundColor="#E9E9EA"
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
            style={[
              styles.segment,
              config.maxSteps === n && styles.segmentActive,
            ]}
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
            <View style={[styles.iconContainer, { backgroundColor: "#AF52DE" }]}>
              <Ionicons name="library" size={17} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Long-term memory</Text>
              <Text style={styles.rowSubtext}>
                {memoryCount} fact{memoryCount === 1 ? "" : "s"} remembered
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#34C759" }}
            ios_backgroundColor="#E9E9EA"
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
            <View style={[styles.iconContainer, { backgroundColor: "#FF3B30" }]}>
              <Ionicons name="trash" size={17} color="white" />
            </View>
            <Text
              style={[
                styles.rowText,
                { color: memoryCount === 0 ? "#C7C7CC" : "#FF3B30" },
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
                <Ionicons name="image" size={16} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{model.name}</Text>
                <Text style={styles.rowSubtext}>
                  {model.desc} · {model.price}
                </Text>
              </View>
            </View>
            {config.imageModel === model.id && (
              <Ionicons name="checkmark" size={22} color="#007AFF" />
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
                    <Feather name={meta.icon} size={16} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>{meta.label}</Text>
                    <Text style={styles.rowSubtext}>
                      {count} tool{count === 1 ? "" : "s"} available
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#C7C7CC" />
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
        <Feather name="chevron-right" size={18} color="#007AFF" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FFF4E5",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
  },
  bannerText: { flex: 1, fontSize: 13, color: "#8A5A00", lineHeight: 18 },
  sectionTitle: {
    fontSize: 13,
    color: "#6E6E73",
    marginLeft: 36,
    marginBottom: 8,
    marginTop: 24,
    fontWeight: "400",
  },
  group: {
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
    gap: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowText: { fontSize: 17, letterSpacing: -0.4, fontWeight: "400" },
  rowSubtext: { fontSize: 12, color: "#8E8E93", marginTop: 1, lineHeight: 16 },
  noBorder: { borderBottomWidth: 0 },
  footerText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 12,
    paddingHorizontal: 36,
    lineHeight: 18,
  },
  warningText: { color: "#FF9500" },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#E3E3E8",
    borderRadius: 9,
    padding: 2,
    marginHorizontal: 16,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 15, color: "#3C3C43", fontWeight: "500" },
  segmentTextActive: { color: "#000000", fontWeight: "600" },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkText: { fontSize: 17, color: "#007AFF" },
});
