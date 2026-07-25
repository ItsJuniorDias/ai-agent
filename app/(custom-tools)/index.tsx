/**
 * Lista de custom HTTP tools do usuário.
 *
 * Cada tool tem nome, método (badge colorido) e endpoint. Toque abre o
 * editor. Botão "+" abre o "new" que oferece AI-generate ou form manual.
 */

import React, { useCallback, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { Color, Radius } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { listCustomTools } from "@/services/custom-tools/storage";
import type { CustomToolConfig } from "@/services/custom-tools/types";

const METHOD_COLOR: Record<CustomToolConfig["method"], string> = {
  GET: "#0891B2",
  POST: "#16803B",
  PUT: "#B85B00",
  PATCH: "#7C3AED",
  DELETE: "#C9342C",
};

export default function CustomToolsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tools, setTools] = useState<CustomToolConfig[]>([]);

  const refresh = useCallback(async () => {
    setTools(await listCustomTools());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={Color.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("customTools.listTitle")}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(custom-tools)/new" as never)}
          style={styles.headerBtn}
        >
          <Ionicons name="add" size={28} color={Color.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>{t("customTools.listIntro")}</Text>

        {tools.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="sliders" size={32} color={Color.tertiary} />
            <Text style={styles.emptyTitle}>{t("customTools.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("customTools.emptyBody")}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(custom-tools)/new" as never)}
            >
              <Text style={styles.emptyBtnText}>{t("customTools.addFirst")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.group}>
            {tools.map((tool: CustomToolConfig, i: number) => (
              <TouchableOpacity
                key={tool.id}
                style={[styles.row, i === tools.length - 1 && styles.noBorder]}
                onPress={() => router.push(`/(custom-tools)/${tool.id}` as never)}
                activeOpacity={0.6}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.methodBadge,
                      { backgroundColor: METHOD_COLOR[tool.method] },
                    ]}
                  >
                    <Text style={styles.methodText}>{tool.method}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {tool.name}
                      {tool.disabled ? ` · ${t("customTools.paused")}` : ""}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {tool.urlTemplate}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={Color.tertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.footer}>{t("customTools.listFooter")}</Text>
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
  intro: { fontSize: 15, color: Color.secondary, lineHeight: 21, marginBottom: 20 },
  emptyCard: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: Color.label, marginTop: 8 },
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
  methodBadge: {
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: "center",
  },
  methodText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  rowTitle: { fontSize: 16, fontWeight: "500", color: Color.label },
  rowSub: {
    fontSize: 12,
    color: Color.secondary,
    marginTop: 2,
    fontFamily: "Menlo",
  },
  footer: {
    fontSize: 12,
    color: Color.tertiary,
    marginTop: 16,
    lineHeight: 18,
  },
});
