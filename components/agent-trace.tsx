/**
 * Trace de execução do agente.
 *
 * Mostra, dentro da própria bolha da resposta, cada tool que o agente chamou,
 * com quais argumentos e o que voltou. É o que separa "a IA fez alguma coisa"
 * de "a IA fez exatamente isto".
 *
 * Colapsado por padrão — quem quiser auditar, toca e abre.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Color, MonoFont, Radius, Type, alpha } from "@/constants/theme";
import type { AgentStep, IntegrationId } from "@/agent/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * `color` is the vivid brand color — used as a solid tile background with a white
 * glyph (Settings). `onDark` is the legible-on-dark variant — used as the glyph
 * color when it sits on a faint tinted background (trace, approval), where a
 * near-black brand like GitHub or Vercel would otherwise disappear.
 */
export const INTEGRATION_META: Record<
  IntegrationId,
  {
    label: string;
    color: string;
    onDark: string;
    icon: keyof typeof Feather.glyphMap;
  }
> = {
  core: { label: "Agente", color: Color.accent, onDark: Color.accent, icon: "cpu" },
  github: { label: "GitHub", color: "#24292E", onDark: "#E6EDF3", icon: "github" },
  gitlab: { label: "GitLab", color: "#FC6D26", onDark: "#FC6D26", icon: "git-merge" },
  jira: { label: "Jira", color: "#0052CC", onDark: "#4C9AFF", icon: "trello" },
  linear: { label: "Linear", color: "#5E6AD2", onDark: "#8B92F0", icon: "target" },
  slack: { label: "Slack", color: "#4A154B", onDark: "#CE93D8", icon: "hash" },
  discord: { label: "Discord", color: "#5865F2", onDark: "#7A85FF", icon: "message-circle" },
  teams: { label: "Teams", color: "#6264A7", onDark: "#8B8CC7", icon: "users" },
  whatsapp: { label: "WhatsApp", color: "#25D366", onDark: "#25D366", icon: "message-square" },
  gmail: { label: "Gmail", color: "#EA4335", onDark: "#FF6A5C", icon: "mail" },
  figma: { label: "Figma", color: "#F24E1E", onDark: "#F98B6B", icon: "figma" },
  vercel: { label: "Vercel", color: "#0B0B0B", onDark: "#EDEEFB", icon: "triangle" },
  notion: { label: "Notion", color: "#141414", onDark: "#EDEEFB", icon: "book-open" },
};

/** Formata os argumentos em uma linha legível: `repo: ai-agent · number: 12` */
function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";

  return entries
    .map(([key, value]) => {
      const text =
        typeof value === "string" ? value : (JSON.stringify(value) ?? "");
      const short = text.length > 60 ? `${text.slice(0, 60)}…` : text;
      return `${key}: ${short.replace(/\n/g, " ")}`;
    })
    .join(" · ");
}

function StatusIcon({ status }: { status: AgentStep["status"] }) {
  switch (status) {
    case "running":
      return <ActivityIndicator size="small" color={Color.secondary} />;
    case "done":
      return <Feather name="check-circle" size={15} color={Color.success} />;
    case "failed":
      return <Feather name="alert-circle" size={15} color={Color.danger} />;
    case "rejected":
      return <Feather name="slash" size={15} color={Color.warning} />;
  }
}

function StepRow({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);
  const meta = INTEGRATION_META[step.integration] ?? INTEGRATION_META.core;
  const args = formatArgs(step.args);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.step}>
      <TouchableOpacity
        style={styles.stepHeader}
        onPress={toggle}
        activeOpacity={0.6}
      >
        <View style={[styles.dot, { backgroundColor: alpha(meta.onDark, 0.16) }]}>
          <Feather name={meta.icon} size={12} color={meta.onDark} />
        </View>

        <View style={styles.stepTitleWrap}>
          <Text style={styles.stepTitle} numberOfLines={1}>
            {step.label}
          </Text>
          {!!args && (
            <Text style={styles.stepArgs} numberOfLines={1}>
              {args}
            </Text>
          )}
        </View>

        <StatusIcon status={step.status} />
      </TouchableOpacity>

      {open && (
        <View style={styles.stepBody}>
          <Text style={styles.mono}>{step.name}</Text>

          {Object.keys(step.args).length > 0 && (
            <Text style={styles.monoDim}>
              {JSON.stringify(step.args, null, 2)}
            </Text>
          )}

          {step.result && (
            <Text
              style={[
                styles.resultText,
                !step.result.ok && styles.resultError,
              ]}
            >
              {step.result.ok
                ? (step.result.summary ?? "Concluído")
                : (step.result.error ?? "Falhou")}
            </Text>
          )}

          {!!step.result?.url && step.result.url.startsWith("http") && (
            <TouchableOpacity
              onPress={() => Linking.openURL(step.result!.url!)}
              style={styles.linkButton}
            >
              <Feather name="external-link" size={12} color={Color.accent} />
              <Text style={styles.linkText}>Abrir</Text>
            </TouchableOpacity>
          )}

          {step.durationMs !== undefined && (
            <Text style={styles.duration}>
              {step.durationMs < 1000
                ? `${step.durationMs} ms`
                : `${(step.durationMs / 1000).toFixed(1)} s`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export function AgentTrace({ steps }: { steps: AgentStep[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!steps.length) return null;

  const failed = steps.filter((s) => s.status === "failed").length;
  const running = steps.some((s) => s.status === "running");

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.summary}
        onPress={toggle}
        activeOpacity={0.6}
      >
        <Feather
          name={expanded ? "chevron-down" : "chevron-right"}
          size={13}
          color={Color.secondary}
        />
        <Text style={styles.summaryText}>
          {steps.length} {steps.length === 1 ? "ação" : "ações"}
          {failed > 0 ? ` · ${failed} com erro` : ""}
        </Text>
        {running && <ActivityIndicator size="small" color={Color.secondary} />}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Versão sempre aberta, usada enquanto o agente ainda está rodando. */
export function LiveTrace({
  steps,
  status,
}: {
  steps: AgentStep[];
  status: string;
}) {
  return (
    <View style={styles.live}>
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}

      {!!status && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={Color.accent} />
          <Text style={styles.statusText}>{status}…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Color.hairline,
    paddingTop: 6,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryText: { ...Type.footnote, color: Color.secondary, flex: 1 },
  list: { marginTop: 4 },
  live: { paddingHorizontal: 4, paddingVertical: 2 },
  step: { marginVertical: 2 },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  stepTitleWrap: { flex: 1 },
  stepTitle: { fontSize: 14, color: Color.label, fontWeight: "500" },
  stepArgs: { ...Type.caption, color: Color.secondary, marginTop: 1 },
  stepBody: {
    marginLeft: 30,
    marginBottom: 6,
    padding: 10,
    backgroundColor: Color.surface2,
    borderRadius: Radius.sm,
    gap: 6,
  },
  mono: { fontFamily: MonoFont, fontSize: 11, color: Color.accent },
  monoDim: { fontFamily: MonoFont, fontSize: 11, color: Color.secondary },
  resultText: { ...Type.footnote, color: Color.secondary },
  resultError: { color: Color.danger },
  linkButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { ...Type.footnote, color: Color.accent, fontWeight: "500" },
  duration: { ...Type.caption2, color: Color.tertiary },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 4,
  },
  statusText: { fontSize: 14, color: Color.secondary, fontStyle: "italic" },
});
