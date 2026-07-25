/**
 * Detalhes de um servidor MCP conectado.
 *
 * Mostra:
 *  - Nome, URL, quantas tools no cache.
 *  - Botão "Refresh tools" — refaz o handshake e atualiza o cache.
 *  - Lista de tools com toggle "Trusted" (roda sem aprovação).
 *  - Toggle "Paused" no header (desliga o servidor todo sem apagar).
 *  - Botão "Disconnect" no fundo, com confirmação — deleta a config.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { Color, Palette, Radius } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import {
  deleteMCPServer,
  getMCPServer,
  saveMCPServer,
  trustMCPTool,
  untrustMCPTool,
  updateMCPToolsCache,
} from "@/services/mcp/storage";
import { initialize, listTools, MCPError } from "@/services/mcp/client";
import type { MCPServerConfig, MCPToolDefinition } from "@/services/mcp/types";

const switchProps = {
  trackColor: { false: Color.surface3, true: Color.success },
  ios_backgroundColor: Color.surface3,
  thumbColor: Palette.white,
};

export default function MCPServerScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [server, setServer] = useState<MCPServerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!serverId) return;
    setLoading(true);
    setServer((await getMCPServer(serverId)) ?? null);
    setLoading(false);
  }, [serverId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ marginTop: 40 }} color={Color.accent} />
      </SafeAreaView>
    );
  }

  if (!server) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ padding: 24 }}>
          <Text style={styles.title}>{t("mcp.notFoundTitle")}</Text>
          <Text style={styles.subtitle}>{t("mcp.notFoundBody")}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    try {
      await initialize(server.url, server.bearerToken);
      const tools = await listTools(server.url, server.bearerToken);
      await updateMCPToolsCache(server.id, tools);
      await load();
    } catch (err) {
      const msg = err instanceof MCPError ? err.message : (err as Error).message;
      Alert.alert(t("mcp.errRefreshTitle"), msg);
    } finally {
      setRefreshing(false);
    }
  };

  const togglePaused = async (paused: boolean) => {
    await saveMCPServer({ ...server, disabled: paused });
    await load();
  };

  const toggleTrusted = async (toolName: string, next: boolean) => {
    if (next) await trustMCPTool(server.id, toolName);
    else await untrustMCPTool(server.id, toolName);
    await load();
  };

  const disconnect = () => {
    Alert.alert(
      t("mcp.disconnectTitle"),
      t("mcp.disconnectBody", { name: server.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.disconnect"),
          style: "destructive",
          onPress: async () => {
            await deleteMCPServer(server.id);
            router.back();
          },
        },
      ],
    );
  };

  const tools = server.toolsCache ?? [];
  const trustedSet = new Set(server.trustedTools ?? []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={Color.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {server.name}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* -- Info do servidor --------------------------------------------- */}
        <Text style={styles.sectionLabel}>{t("mcp.serverInfo")}</Text>
        <View style={styles.group}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>{t("mcp.url")}</Text>
            <Text style={styles.infoVal} numberOfLines={2}>
              {server.url}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>{t("mcp.lastSync")}</Text>
            <Text style={styles.infoVal}>
              {server.lastConnectedAt
                ? new Date(server.lastConnectedAt).toLocaleString()
                : t("mcp.never")}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rowSwitch}>
            <Text style={styles.rowTitle}>{t("mcp.paused")}</Text>
            <Switch
              value={Boolean(server.disabled)}
              onValueChange={togglePaused}
              {...switchProps}
            />
          </View>
        </View>
        <Text style={styles.hint}>{t("mcp.pausedHint")}</Text>

        {/* -- Refresh ------------------------------------------------------ */}
        <TouchableOpacity
          style={[styles.refreshBtn, refreshing && styles.buttonDisabled]}
          onPress={refresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color={Color.accent} />
          ) : (
            <>
              <Feather name="refresh-cw" size={16} color={Color.accent} />
              <Text style={styles.refreshText}>
                {t("mcp.refresh", { count: tools.length })}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* -- Tools -------------------------------------------------------- */}
        <Text style={styles.sectionLabel}>
          {t(tools.length === 1 ? "mcp.toolOne" : "mcp.toolOther", { count: tools.length })}
        </Text>
        {tools.length === 0 ? (
          <View style={styles.group}>
            <View style={styles.emptyRow}>
              <Text style={styles.rowSub}>{t("mcp.noToolsCached")}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.group}>
            {tools.map((tool: MCPToolDefinition, i: number) => {
              const trusted = trustedSet.has(tool.name);
              const readOnly = tool.annotations?.readOnlyHint === true;
              return (
                <View
                  key={tool.name}
                  style={[styles.toolRow, i === tools.length - 1 && styles.noBorder]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toolName}>{tool.name}</Text>
                    {tool.description ? (
                      <Text style={styles.rowSub} numberOfLines={2}>
                        {tool.description}
                      </Text>
                    ) : null}
                    <View style={styles.badges}>
                      {readOnly && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{t("mcp.readOnly")}</Text>
                        </View>
                      )}
                      {trusted && (
                        <View style={[styles.badge, styles.badgeAccent]}>
                          <Text style={[styles.badgeText, styles.badgeAccentText]}>
                            {t("mcp.trusted")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {!readOnly && (
                    <Switch
                      value={trusted}
                      onValueChange={(v: boolean) => toggleTrusted(tool.name, v)}
                      {...switchProps}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
        <Text style={styles.hint}>{t("mcp.trustedHint")}</Text>

        {/* -- Disconnect --------------------------------------------------- */}
        <TouchableOpacity style={styles.dangerBtn} onPress={disconnect}>
          <Text style={styles.dangerText}>{t("common.disconnect")}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerBtn: { padding: 8, minWidth: 44 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: Color.label, flex: 1, textAlign: "center" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: Color.label },
  subtitle: { fontSize: 15, color: Color.secondary, marginTop: 8 },
  sectionLabel: {
    fontSize: 13,
    color: Color.secondary,
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  group: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  infoKey: { fontSize: 15, color: Color.secondary, flexShrink: 0 },
  infoVal: {
    fontSize: 14,
    color: Color.label,
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Color.hairline,
    marginLeft: 16,
  },
  rowSwitch: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTitle: { fontSize: 15, color: Color.label, fontWeight: "500" },
  rowSub: { fontSize: 13, color: Color.secondary, marginTop: 4 },
  hint: { fontSize: 12, color: Color.tertiary, marginTop: 8, marginLeft: 16, lineHeight: 18 },
  refreshBtn: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    borderRadius: Radius.lg,
    marginTop: 16,
  },
  refreshText: { color: Color.accent, fontSize: 15, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.hairline,
    gap: 12,
  },
  noBorder: { borderBottomWidth: 0 },
  toolName: {
    fontSize: 14,
    color: Color.label,
    fontFamily: "Menlo",
    fontWeight: "500",
  },
  badges: { flexDirection: "row", gap: 6, marginTop: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Color.surface2,
  },
  badgeAccent: { backgroundColor: Color.accent },
  badgeText: { fontSize: 11, color: Color.secondary, fontWeight: "600" },
  badgeAccentText: { color: Color.onAccent },
  emptyRow: { padding: 16 },
  dangerBtn: {
    marginTop: 32,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
  },
  dangerText: { color: Color.danger, fontSize: 17, fontWeight: "600" },
  primaryButton: {
    marginTop: 24,
    backgroundColor: Color.accent,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { color: Color.onAccent, fontSize: 17, fontWeight: "600" },
});
