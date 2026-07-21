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

import { GradientButton } from "@/components/ui/gradient-button";
import { Color, MonoFont, Radius, Spacing, Type, alpha } from "@/constants/theme";
import type { ApprovalDecision, ApprovalRequest } from "@/agent/types";
import { INTEGRATION_META } from "./agent-trace";

/** Campos longos viram bloco; campos curtos viram linha. */
const LONG_FIELD_THRESHOLD = 60;

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
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
            <View
              style={[styles.icon, { backgroundColor: alpha(meta.onDark, 0.16) }]}
            >
              <Feather name={meta.icon} size={18} color={meta.onDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{request.label}</Text>
              <Text style={styles.subtitle}>
                {meta.label} · {request.toolName}
              </Text>
            </View>
          </View>

          <View style={styles.warning}>
            <Feather name="alert-triangle" size={15} color={Color.warning} />
            <Text style={styles.warningText}>
              O agente quer executar esta ação. Ela é real e não dá para
              desfazer.
            </Text>
          </View>

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
              style={styles.reject}
              onPress={() => decide("reject")}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectText}>Recusar</Text>
            </TouchableOpacity>

            <GradientButton
              label="Executar"
              onPress={() => decide("approve")}
              icon={<Feather name="check" size={17} color={Color.onAccent} />}
              height={50}
              style={styles.approve}
            />
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
    backgroundColor: alpha("#01030F", 0.7),
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Color.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 34 : Spacing.xl,
    paddingTop: Spacing.sm,
    maxHeight: "82%",
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: Color.hairlineStrong,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { ...Type.title3, color: Color.label },
  subtitle: { ...Type.footnote, color: Color.secondary, marginTop: 2 },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Color.warningSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  warningText: { flex: 1, ...Type.footnote, color: Color.label, lineHeight: 18 },
  argsScroll: { marginTop: Spacing.lg, maxHeight: 320 },
  argsContent: { gap: 1, borderRadius: Radius.md, overflow: "hidden" },
  argRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Color.surface2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  argRowLong: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  argKey: { ...Type.subhead, color: Color.secondary },
  argValue: {
    ...Type.subhead,
    color: Color.label,
    flexShrink: 1,
    textAlign: "right",
  },
  argValueLong: {
    textAlign: "left",
    fontFamily: MonoFont,
    fontSize: 12,
    lineHeight: 17,
  },
  noArgs: { ...Type.subhead, color: Color.secondary, padding: 14 },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    alignItems: "stretch",
  },
  reject: {
    flex: 1,
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Color.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectText: { ...Type.headline, color: Color.danger },
  approve: { flex: 1 },
  footnote: {
    ...Type.caption,
    color: Color.tertiary,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
