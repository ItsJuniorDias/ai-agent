/**
 * Lista de servidores MCP conectados.
 *
 * - Vazia? Empty state + CTA "Add a server".
 * - Tem? Cada linha mostra o servidor, quantas tools ele expõe, e um dot de
 *   status (verde = handshake recente, amarelo = cache stale > 24h, cinza =
 *   nunca conectou). Tap abre a tela de detalhes.
 * - Header direita: botão "+" abre a tela de escolher/adicionar.
 */

import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { Color, Radius, Spacing } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { listMCPServers } from "@/services/mcp/storage";
import type { MCPServerConfig } from "@/services/mcp/types";

function statusOf(server: MCPServerConfig): "ok" | "stale" | "unknown" {
  if (!server.lastConnectedAt) return "unknown";
  const age = Date.now() - new Date(server.lastConnectedAt).getTime();
  const DAY = 24 * 3600 * 1000;
  return age < DAY ? "ok" : "stale";
}

const STATUS_COLOR: Record<"ok" | "stale" | "unknown", string> = {
  ok: Color.success,
  stale: Color.warning,
  unknown: Color.tertiary,
};

export default function MCPListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [servers, setServers] = useState<MCPServerConfig[]>([]);

  const refresh = useCallback(async () => {
    setServers(await listMCPServers());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={Color.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("mcp.listTitle")}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(mcp)/add" as never)}
          style={styles.headerBtn}
        >
          <Ionicons name="add" size={28} color={Color.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Text style={styles.intro}>{t("mcp.listIntro")}</Text>

        {servers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="server" size={32} color={Color.tertiary} />
            <Text style={styles.emptyTitle}>{t("mcp.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("mcp.emptyBody")}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(mcp)/add" as never)}
            >
              <Text style={styles.emptyBtnText}>{t("mcp.addFirst")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.group}>
            {servers.map((s: MCPServerConfig, i: number) => {
              const status = statusOf(s);
              const toolCount = s.toolsCache?.length ?? 0;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.row, i === servers.length - 1 && styles.noBorder]}
                  onPress={() => router.push(`/(mcp)/${s.id}` as never)}
                  activeOpacity={0.6}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.serverIcon}>
                      <Feather name="server" size={16} color={Color.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.rowTitle}>{s.name}</Text>
                        <View
                          style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]}
                        />
                      </View>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {toolCount === 0
                          ? t("mcp.noToolsYet")
                          : t(toolCount === 1 ? "mcp.toolOne" : "mcp.toolOther", {
                              count: toolCount,
                            })}
                        {s.disabled ? ` · ${t("mcp.paused")}` : ""}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={Color.tertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>{t("mcp.listFooter")}</Text>
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
  headerTitle: { fontSize: 17, fontWeight: "600", color: Color.label },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  intro: {
    fontSize: 15,
    color: Color.secondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Color.label,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: Color.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: Color.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyBtnText: { color: Color.onAccent, fontSize: 15, fontWeight: "600" },
  group: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.hairline,
  },
  noBorder: { borderBottomWidth: 0 },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  serverIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Color.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { fontSize: 16, fontWeight: "500", color: Color.label },
  rowSub: { fontSize: 13, color: Color.secondary, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: {
    fontSize: 12,
    color: Color.tertiary,
    marginTop: 16,
    lineHeight: 18,
  },
});
