/**
 * Tela do Assistente Pessoal.
 *
 * Um lugar só para: autorizar notificações, ligar/desligar o monitor proativo,
 * dizer com que frequência (piso) e em que horário ele pode te incomodar, quais
 * serviços vigiar, rodar uma varredura na hora e ver/limpar os lembretes que o
 * agente agendou. Segue o visual de Ajustes: grupos brancos, linhas com switch.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ASSISTANT_INTERVALS,
  AssistantConfig,
  DEFAULT_ASSISTANT_CONFIG,
  MONITORABLE_INTEGRATIONS,
  MonitorableIntegration,
  isWatched,
  loadAssistantConfig,
  loadAssistantState,
  loadConfig,
  saveAssistantConfig,
  type AssistantState,
} from "@/services/config";
import { resolveTools } from "@/agent/registry";
import {
  cancelAllScheduled,
  cancelScheduled,
  getPermissionStatus,
  listScheduled,
  requestNotificationPermission,
  type PermissionStatus,
  type ScheduledItem,
} from "@/services/notifications";
import {
  getBackgroundAvailability,
  syncAssistantTask,
  type BackgroundAvailability,
} from "@/services/background-tasks";
import { runAssistantScan, type ScanOutcome } from "@/services/assistant";
import { hasApiKey } from "@/services/openrouter";
import { INTEGRATION_META } from "@/components/agent-trace";
import { Color, Radius, Shadow, Spacing, Type } from "@/constants/theme";
import { localeTag, useTranslation, type Language } from "@/i18n";

function formatWhen(iso: string | undefined, language: Language): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(localeTag(language), {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

function scanMessage(out: ScanOutcome, t: TFunc): string {
  switch (out.status) {
    case "ok":
      return out.notified > 0
        ? t("assistant.scanOkNotified", { count: out.notified })
        : t("assistant.scanOkClear");
    case "needs-permission":
      return t("assistant.scanNeedsPermission");
    case "no-key":
      return t("assistant.scanNoKey");
    case "no-targets":
      return t("assistant.scanNoTargets");
    case "skipped-quiet":
      return t("assistant.scanQuiet");
    case "skipped-disabled":
      return t("assistant.scanDisabled");
    default:
      return out.summary || t("assistant.scanFail");
  }
}

export default function AssistantScreen() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_ASSISTANT_CONFIG);
  const [state, setState] = useState<AssistantState>({});
  const [permission, setPermission] = useState<PermissionStatus>("undetermined");
  const [connected, setConnected] = useState<MonitorableIntegration[]>([]);
  const [availability, setAvailability] =
    useState<BackgroundAvailability>("unavailable");
  const [reminders, setReminders] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [cfg, agentCfg, st, perm, avail, rem] = await Promise.all([
      loadAssistantConfig(),
      loadConfig(),
      loadAssistantState(),
      getPermissionStatus(),
      getBackgroundAvailability(),
      listScheduled(),
    ]);

    const tools = await resolveTools(agentCfg);
    const present = new Set(tools.map((t) => t.integration));

    setConfig(cfg);
    setState(st);
    setPermission(perm);
    setAvailability(avail);
    setReminders(rem);
    setConnected(
      MONITORABLE_INTEGRATIONS.filter((id) => present.has(id)),
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // -- Permissão ------------------------------------------------------------
  const enablePermission = async () => {
    if (permission === "denied") {
      // Já negou uma vez: só o app de Ajustes do sistema reverte.
      Linking.openSettings();
      return;
    }
    const granted = await requestNotificationPermission();
    setPermission(granted ? "granted" : await getPermissionStatus());
  };

  // -- Monitor on/off -------------------------------------------------------
  const toggleEnabled = async (value: boolean) => {
    if (value) {
      let granted = permission === "granted";
      if (!granted) granted = await requestNotificationPermission();
      if (!granted) {
        setPermission(await getPermissionStatus());
        Alert.alert(
          t("assistant.notifDisabledTitle"),
          t("assistant.notifDisabledBody"),
        );
        return;
      }
      setPermission("granted");
    }

    const next = await saveAssistantConfig({ enabled: value });
    setConfig(next);
    await syncAssistantTask(next.enabled, next.frequencyMinutes);
  };

  const setFrequency = async (minutes: number) => {
    const next = await saveAssistantConfig({ frequencyMinutes: minutes });
    setConfig(next);
    if (next.enabled) await syncAssistantTask(true, minutes);
  };

  const toggleQuiet = async (value: boolean) => {
    setConfig(await saveAssistantConfig({ quietHoursEnabled: value }));
  };

  const shiftHour = async (which: "start" | "end", delta: number) => {
    const key = which === "start" ? "quietStartHour" : "quietEndHour";
    const current = config[key];
    const next = (current + delta + 24) % 24;
    setConfig(await saveAssistantConfig({ [key]: next } as Partial<AssistantConfig>));
  };

  const toggleWatch = async (id: MonitorableIntegration) => {
    const next = await saveAssistantConfig({
      watch: { ...config.watch, [id]: !isWatched(config, id) },
    });
    setConfig(next);
  };

  // -- Scan now -------------------------------------------------------------
  const scanNow = async () => {
    setScanning(true);
    setScanMsg(null);
    const out = await runAssistantScan("manual");
    setScanMsg(scanMessage(out, t));
    setScanning(false);
    // Recarrega estado + lembretes; a varredura pode ter atualizado a telemetria.
    const [st, rem] = await Promise.all([loadAssistantState(), listScheduled()]);
    setState(st);
    setReminders(rem);
  };

  // -- Lembretes ------------------------------------------------------------
  const removeReminder = async (id: string) => {
    await cancelScheduled(id);
    setReminders(await listScheduled());
  };

  const clearReminders = () => {
    if (!reminders.length) return;
    Alert.alert(
      t("assistant.clearRemindersTitle"),
      t("assistant.clearRemindersBody", { count: reminders.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("assistant.clearAll"),
          style: "destructive",
          onPress: async () => {
            await cancelAllScheduled();
            setReminders([]);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Color.secondary} />
      </View>
    );
  }

  const availabilityLabel =
    availability === "available"
      ? t("assistant.available")
      : availability === "restricted"
        ? t("assistant.restricted")
        : t("assistant.unavailable");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={26} color={Color.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("assistant.title")}</Text>
      </View>

      <Text style={styles.intro}>{t("assistant.intro")}</Text>

      {/* Chave ausente */}
      {!hasApiKey() && (
        <View style={styles.banner}>
          <Feather name="alert-triangle" size={18} color={Color.warning} />
          <Text style={styles.bannerText}>
            {t("assistant.missingKeyBanner")}
          </Text>
        </View>
      )}

      {/* Permissão */}
      {permission !== "granted" && (
        <View style={styles.permCard}>
          <Ionicons name="notifications" size={22} color={Color.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>{t("assistant.enableNotifications")}</Text>
            <Text style={styles.permSub}>
              {t("assistant.enableNotificationsSub")}
            </Text>
          </View>
          <TouchableOpacity style={styles.permBtn} onPress={enablePermission}>
            <Text style={styles.permBtnText}>
              {permission === "denied"
                ? t("assistant.settingsBtn")
                : t("assistant.enableBtn")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Monitor proativo */}
      <Text style={styles.sectionTitle}>{t("assistant.proactiveMonitoring")}</Text>
      <View style={styles.group}>
        <View style={[styles.row, styles.noBorder]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: Color.success }]}>
              <Ionicons name="pulse" size={17} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t("assistant.monitorBackground")}</Text>
              <Text style={styles.rowSubtext}>
                {t("assistant.monitorBackgroundSub")}
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: Color.surface3, true: Color.success }}
            ios_backgroundColor={Color.surface3}
            onValueChange={toggleEnabled}
            value={config.enabled}
          />
        </View>
      </View>
      <Text style={styles.footerText}>
        {t("assistant.statusLine", {
          status: availabilityLabel,
          when: formatWhen(state.lastScanAt, language),
          summary: state.lastScanSummary
            ? ` · ${state.lastScanSummary}`
            : "",
        })}
      </Text>

      {/* Frequência */}
      <Text style={styles.sectionTitle}>{t("assistant.minInterval")}</Text>
      <View style={styles.segmented}>
        {ASSISTANT_INTERVALS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.segment, config.frequencyMinutes === n && styles.segmentActive]}
            onPress={() => setFrequency(n)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                config.frequencyMinutes === n && styles.segmentTextActive,
              ]}
            >
              {n < 60 ? `${n}m` : `${n / 60}h`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footerText}>{t("assistant.intervalFooter")}</Text>

      {/* Horário silencioso */}
      <Text style={styles.sectionTitle}>{t("assistant.quietHours")}</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: Color.accent }]}>
              <Ionicons name="moon" size={16} color="white" />
            </View>
            <Text style={styles.rowText}>{t("assistant.silenceNight")}</Text>
          </View>
          <Switch
            trackColor={{ false: Color.surface3, true: Color.success }}
            ios_backgroundColor={Color.surface3}
            onValueChange={toggleQuiet}
            value={config.quietHoursEnabled}
          />
        </View>

        <View style={[styles.row, styles.noBorder, !config.quietHoursEnabled && styles.dim]}>
          <Text style={styles.rowText}>{t("assistant.from")}</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => shiftHour("start", -1)}
              disabled={!config.quietHoursEnabled}
              style={styles.stepBtn}
            >
              <Feather name="minus" size={16} color={Color.accent} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>
              {String(config.quietStartHour).padStart(2, "0")}:00
            </Text>
            <TouchableOpacity
              onPress={() => shiftHour("start", 1)}
              disabled={!config.quietHoursEnabled}
              style={styles.stepBtn}
            >
              <Feather name="plus" size={16} color={Color.accent} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.rowText, { marginLeft: 12 }]}>{t("assistant.to")}</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => shiftHour("end", -1)}
              disabled={!config.quietHoursEnabled}
              style={styles.stepBtn}
            >
              <Feather name="minus" size={16} color={Color.accent} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>
              {String(config.quietEndHour).padStart(2, "0")}:00
            </Text>
            <TouchableOpacity
              onPress={() => shiftHour("end", 1)}
              disabled={!config.quietHoursEnabled}
              style={styles.stepBtn}
            >
              <Feather name="plus" size={16} color={Color.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Text style={styles.footerText}>{t("assistant.quietFooter")}</Text>

      {/* Serviços vigiados */}
      <Text style={styles.sectionTitle}>{t("assistant.watchedServices")}</Text>
      <View style={styles.group}>
        {connected.length === 0 ? (
          <View style={[styles.row, styles.noBorder]}>
            <Text style={styles.rowSubtext}>
              {t("assistant.noMonitorable")}
            </Text>
          </View>
        ) : (
          connected.map((id, index) => {
            const meta = INTEGRATION_META[id];
            return (
              <View
                key={id}
                style={[styles.row, index === connected.length - 1 && styles.noBorder]}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBox, { backgroundColor: meta.color }]}>
                    <Feather name={meta.icon} size={15} color="white" />
                  </View>
                  <Text style={styles.rowText}>{meta.label}</Text>
                </View>
                <Switch
                  trackColor={{ false: Color.surface3, true: Color.success }}
                  ios_backgroundColor={Color.surface3}
                  onValueChange={() => toggleWatch(id)}
                  value={isWatched(config, id)}
                />
              </View>
            );
          })
        )}
      </View>
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => router.push("/(onboarding)" as never)}
        activeOpacity={0.6}
      >
        <Text style={styles.linkText}>{t("assistant.connectMore")}</Text>
        <Feather name="chevron-right" size={18} color={Color.accent} />
      </TouchableOpacity>

      {/* Scan now */}
      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnBusy]}
        onPress={scanNow}
        disabled={scanning}
        activeOpacity={0.8}
      >
        {scanning ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Feather name="radio" size={18} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>{t("assistant.scanNow")}</Text>
          </>
        )}
      </TouchableOpacity>
      {!!scanMsg && <Text style={styles.scanMsg}>{scanMsg}</Text>}

      {/* Lembretes agendados */}
      <Text style={styles.sectionTitle}>
        {t("assistant.scheduledReminders", { count: reminders.length })}
      </Text>
      <View style={styles.group}>
        {reminders.length === 0 ? (
          <View style={[styles.row, styles.noBorder]}>
            <Text style={styles.rowSubtext}>{t("assistant.noReminders")}</Text>
          </View>
        ) : (
          reminders.map((r, index) => (
            <View
              key={r.id}
              style={[styles.row, index === reminders.length - 1 && styles.noBorder]}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: Color.warning }]}>
                  <Ionicons name="alarm" size={16} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={styles.rowSubtext}>{formatWhen(r.fireAt, language)}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeReminder(r.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x-circle" size={20} color={Color.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
      {reminders.length > 0 && (
        <TouchableOpacity
          style={styles.clearRow}
          onPress={clearReminders}
          activeOpacity={0.6}
        >
          <Text style={styles.clearText}>{t("assistant.clearAll")}</Text>
        </TouchableOpacity>
      )}
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
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8, color: Color.label },
  intro: {
    ...Type.footnote,
    color: Color.secondary,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 4,
  },
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Color.warningSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.warning,
    marginHorizontal: Spacing.lg,
    marginTop: 10,
    padding: 14,
    borderRadius: Radius.md,
  },
  bannerText: { flex: 1, ...Type.footnote, color: Color.label, lineHeight: 18 },
  permCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Color.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.accent,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  permTitle: { ...Type.callout, fontWeight: "600", color: Color.label },
  permSub: { ...Type.footnote, color: Color.secondary, marginTop: 2 },
  permBtn: {
    backgroundColor: Color.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  permBtnText: { color: Color.onAccent, fontWeight: "600", fontSize: 14 },
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
    gap: 10,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: {
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
  dim: { opacity: 0.4 },
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
  segment: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: "center" },
  segmentActive: {
    backgroundColor: Color.surface3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
  },
  segmentText: { ...Type.subhead, color: Color.secondary, fontWeight: "500" },
  segmentTextActive: { color: Color.label, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Color.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    ...Type.subhead,
    fontWeight: "600",
    color: Color.label,
    minWidth: 46,
    textAlign: "center",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Color.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
  },
  linkText: { ...Type.callout, color: Color.accent },
  scanBtn: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.accent,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    paddingVertical: 15,
    borderRadius: Radius.md,
    ...Shadow.glow,
  },
  scanBtnBusy: { opacity: 0.7 },
  scanBtnText: { color: Color.onAccent, ...Type.headline },
  scanMsg: {
    ...Type.footnote,
    color: Color.secondary,
    textAlign: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    lineHeight: 19,
  },
  clearRow: {
    backgroundColor: Color.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
    alignItems: "center",
  },
  clearText: { ...Type.callout, color: Color.danger, fontWeight: "500" },
});
