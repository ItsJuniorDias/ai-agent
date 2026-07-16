/**
 * Modal de aprovação humana.
 *
 * Aparece quando o agente quer executar uma tool com `mutates: true` — abrir um
 * PR, mandar mensagem, subir deploy. Mostra exatamente o payload que vai sair.
 *
 * O loop do agente fica parado num `await` enquanto isto está na tela.
 */

import React from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ApprovalDecision, ApprovalRequest } from "@/agent/types";
import { INTEGRATION_META } from "./agent-trace";

/** Campos longos viram bloco; campos curtos viram linha. */
const LONG_FIELD_THRESHOLD = 60;

function prettify(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export function ToolApprovalSheet({
  request,
  onDecide,
  haptics = true,
}: {
  request: ApprovalRequest | null;
  onDecide: (decision: ApprovalDecision) => void;
  haptics?: boolean;
}) {
  if (!request) return null;

  const meta = INTEGRATION_META[request.integration] ?? INTEGRATION_META.core;

  const entries = Object.entries(request.args).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );

  const decide = (decision: ApprovalDecision) => {
    if (haptics) {
      Haptics.notificationAsync(
        decision === "approve"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
    onDecide(decision);
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => decide("reject")}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: `${meta.color}1A` }]}>
              <Feather name={meta.icon} size={18} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{request.label}</Text>
              <Text style={styles.subtitle}>
                {meta.label} · {request.toolName}
              </Text>
            </View>
          </View>

          <Text style={styles.warning}>
            O agente quer executar esta ação. Ela é real e não dá para desfazer.
          </Text>

          <ScrollView
            style={styles.argsScroll}
            contentContainerStyle={styles.argsContent}
          >
            {entries.length === 0 ? (
              <Text style={styles.noArgs}>Sem parâmetros.</Text>
            ) : (
              entries.map(([key, value]) => {
                const text =
                  typeof value === "string"
                    ? value
                    : JSON.stringify(value, null, 2);
                const long = text.length > LONG_FIELD_THRESHOLD;

                return (
                  <View
                    key={key}
                    style={[styles.argRow, long && styles.argRowLong]}
                  >
                    <Text style={styles.argKey}>{prettify(key)}</Text>
                    <Text
                      style={[styles.argValue, long && styles.argValueLong]}
                      selectable
                    >
                      {text}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.reject]}
              onPress={() => decide("reject")}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectText}>Recusar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.approve]}
              onPress={() => decide("approve")}
              activeOpacity={0.7}
            >
              <Feather name="check" size={17} color="#FFFFFF" />
              <Text style={styles.approveText}>Executar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footnote}>
            Você pode desligar essas confirmações em Ajustes.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 8,
    maxHeight: "82%",
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D1D6",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "600", color: "#000000" },
  subtitle: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  warning: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 14,
    lineHeight: 19,
  },
  argsScroll: { marginTop: 14, maxHeight: 320 },
  argsContent: { gap: 1 },
  argRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  argRowLong: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  argKey: { fontSize: 15, color: "#8E8E93" },
  argValue: {
    fontSize: 15,
    color: "#000000",
    flexShrink: 1,
    textAlign: "right",
  },
  argValueLong: {
    textAlign: "left",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 17,
  },
  noArgs: { fontSize: 15, color: "#8E8E93", padding: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  button: {
    flex: 1,
    flexDirection: "row",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  reject: { backgroundColor: "#F2F2F7" },
  rejectText: { fontSize: 17, fontWeight: "600", color: "#FF3B30" },
  approve: { backgroundColor: "#007AFF" },
  approveText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
  footnote: {
    fontSize: 12,
    color: "#C7C7CC",
    textAlign: "center",
    marginTop: 12,
  },
});
