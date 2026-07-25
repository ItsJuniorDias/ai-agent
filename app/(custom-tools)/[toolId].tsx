/**
 * Editor de custom tool.
 *
 * Formulário completo pra ajustar tudo:
 *  - Metadata: nome, label, descrição.
 *  - Request: método, URL template.
 *  - Headers: key/value pairs (add/remove).
 *  - Body template: multiline.
 *  - Parameters: schema pro modelo — nome, type, description, required.
 *  - Aprovação: toggle `mutates`.
 *  - Pause: toggle `disabled`.
 *  - Delete: com confirmação.
 *
 * O layout prioriza altura vertical porque é bastante campo. Cada bloco em
 * card separado.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Color, Palette, Radius } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import {
  deleteCustomTool,
  getCustomTool,
  saveCustomTool,
} from "@/services/custom-tools/storage";
import type {
  CustomToolConfig,
  CustomToolParameter,
} from "@/services/custom-tools/types";

const METHODS: CustomToolConfig["method"][] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PARAM_TYPES: CustomToolParameter["type"][] = [
  "string",
  "number",
  "boolean",
  "integer",
];

const switchProps = {
  trackColor: { false: Color.surface3, true: Color.success },
  ios_backgroundColor: Color.surface3,
  thumbColor: Palette.white,
};

export default function CustomToolEditor() {
  const { toolId } = useLocalSearchParams<{ toolId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [tool, setTool] = useState<CustomToolConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!toolId) return;
    setLoading(true);
    setTool((await getCustomTool(toolId)) ?? null);
    setLoading(false);
  }, [toolId]);

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

  if (!tool) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ padding: 24 }}>
          <Text style={styles.title}>{t("customTools.notFoundTitle")}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const patch = (p: Partial<CustomToolConfig>) => setTool({ ...tool, ...p });

  const setHeaderKey = (oldKey: string, newKey: string) => {
    const entries = Object.entries(tool.headers).map(([k, v]) =>
      k === oldKey ? [newKey, v] : [k, v],
    );
    patch({ headers: Object.fromEntries(entries) });
  };

  const setHeaderValue = (key: string, value: string) => {
    patch({ headers: { ...tool.headers, [key]: value } });
  };

  const removeHeader = (key: string) => {
    const next = { ...tool.headers };
    delete next[key];
    patch({ headers: next });
  };

  const addHeader = () => {
    let base = "Header-Name";
    let name = base;
    let n = 2;
    while (tool.headers[name] !== undefined) name = `${base}-${n++}`;
    patch({ headers: { ...tool.headers, [name]: "" } });
  };

  const addParameter = () => {
    patch({
      parameters: [
        ...tool.parameters,
        { name: `param_${tool.parameters.length + 1}`, description: "", type: "string", required: false },
      ],
    });
  };

  const updateParam = (idx: number, patchParam: Partial<CustomToolParameter>) => {
    const next = [...tool.parameters];
    next[idx] = { ...next[idx], ...patchParam };
    patch({ parameters: next });
  };

  const removeParam = (idx: number) => {
    patch({ parameters: tool.parameters.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!tool.name.trim() || !tool.urlTemplate.trim()) {
      Alert.alert(t("common.requiredTitle"), t("customTools.errNameOrUrl"));
      return;
    }
    await saveCustomTool(tool);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const remove = () => {
    Alert.alert(
      t("customTools.deleteTitle"),
      t("customTools.deleteBody", { name: tool.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteCustomTool(tool.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={Color.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tool.name}
        </Text>
        <TouchableOpacity onPress={save} style={styles.headerBtn}>
          <Text style={styles.headerSave}>{t("common.save")}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* -- Meta ---------------------------------------------------------- */}
          <Text style={styles.sectionLabel}>{t("customTools.meta")}</Text>
          <View style={styles.group}>
            <FormRow
              label={t("customTools.name")}
              value={tool.name}
              onChangeText={(v) => patch({ name: v })}
              mono
            />
            <View style={styles.divider} />
            <FormRow
              label={t("customTools.label")}
              value={tool.label}
              onChangeText={(v) => patch({ label: v })}
            />
            <View style={styles.divider} />
            <FormRow
              label={t("customTools.description")}
              value={tool.description}
              onChangeText={(v) => patch({ description: v })}
              multiline
            />
          </View>
          <Text style={styles.hint}>{t("customTools.descHint")}</Text>

          {/* -- Request ------------------------------------------------------- */}
          <Text style={styles.sectionLabel}>{t("customTools.request")}</Text>
          <View style={styles.group}>
            <View style={styles.methodPickerRow}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodPill,
                    tool.method === m && styles.methodPillActive,
                  ]}
                  onPress={() => patch({ method: m })}
                >
                  <Text
                    style={[
                      styles.methodPillText,
                      tool.method === m && styles.methodPillTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.divider} />
            <FormRow
              label={t("customTools.url")}
              value={tool.urlTemplate}
              onChangeText={(v) => patch({ urlTemplate: v })}
              mono
              autoCapitalize="none"
              keyboardType="url"
            />
            {tool.method !== "GET" && (
              <>
                <View style={styles.divider} />
                <FormRow
                  label={t("customTools.body")}
                  value={tool.bodyTemplate ?? ""}
                  onChangeText={(v) => patch({ bodyTemplate: v })}
                  multiline
                  mono
                />
              </>
            )}
          </View>
          <Text style={styles.hint}>{t("customTools.placeholdersHint")}</Text>

          {/* -- Headers ------------------------------------------------------- */}
          <Text style={styles.sectionLabel}>{t("customTools.headers")}</Text>
          <View style={styles.group}>
            {Object.keys(tool.headers).length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.rowSub}>{t("customTools.noHeaders")}</Text>
              </View>
            )}
            {Object.entries(tool.headers).map(([key, value], i, arr) => (
              <React.Fragment key={key + i}>
                <View style={styles.headerEditRow}>
                  <TextInput
                    style={[styles.headerInput, styles.mono]}
                    value={key}
                    onChangeText={(v) => setHeaderKey(key, v)}
                    autoCapitalize="none"
                    placeholder="Header-Name"
                    placeholderTextColor={Color.placeholder}
                  />
                  <TextInput
                    style={[styles.headerInput, styles.mono, { flex: 2 }]}
                    value={value}
                    onChangeText={(v) => setHeaderValue(key, v)}
                    autoCapitalize="none"
                    placeholder="value or {{param}}"
                    placeholderTextColor={Color.placeholder}
                  />
                  <TouchableOpacity onPress={() => removeHeader(key)}>
                    <Feather name="x" size={18} color={Color.danger} />
                  </TouchableOpacity>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.addRow} onPress={addHeader}>
              <Feather name="plus" size={16} color={Color.accent} />
              <Text style={styles.addRowText}>{t("customTools.addHeader")}</Text>
            </TouchableOpacity>
          </View>

          {/* -- Parameters ---------------------------------------------------- */}
          <Text style={styles.sectionLabel}>{t("customTools.parameters")}</Text>
          <Text style={styles.hint}>{t("customTools.paramsHint")}</Text>
          <View style={styles.group}>
            {tool.parameters.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.rowSub}>{t("customTools.noParams")}</Text>
              </View>
            )}
            {tool.parameters.map((p, idx) => (
              <View key={idx} style={styles.paramCard}>
                <View style={styles.paramHeader}>
                  <TextInput
                    style={[styles.paramNameInput, styles.mono]}
                    value={p.name}
                    onChangeText={(v) => updateParam(idx, { name: v })}
                    autoCapitalize="none"
                    placeholder="param_name"
                    placeholderTextColor={Color.placeholder}
                  />
                  <TouchableOpacity onPress={() => removeParam(idx)}>
                    <Feather name="trash-2" size={16} color={Color.danger} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.paramDescInput}
                  value={p.description}
                  onChangeText={(v) => updateParam(idx, { description: v })}
                  placeholder={t("customTools.paramDescPh")}
                  placeholderTextColor={Color.placeholder}
                  multiline
                />
                <View style={styles.paramFooter}>
                  <View style={styles.typePicker}>
                    {PARAM_TYPES.map((typ) => (
                      <TouchableOpacity
                        key={typ}
                        style={[
                          styles.typePill,
                          p.type === typ && styles.typePillActive,
                        ]}
                        onPress={() => updateParam(idx, { type: typ })}
                      >
                        <Text
                          style={[
                            styles.typePillText,
                            p.type === typ && styles.typePillTextActive,
                          ]}
                        >
                          {typ}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.requiredRow}>
                    <Text style={styles.requiredLabel}>
                      {t("customTools.required")}
                    </Text>
                    <Switch
                      value={p.required}
                      onValueChange={(v) => updateParam(idx, { required: v })}
                      {...switchProps}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addRow} onPress={addParameter}>
              <Feather name="plus" size={16} color={Color.accent} />
              <Text style={styles.addRowText}>{t("customTools.addParam")}</Text>
            </TouchableOpacity>
          </View>

          {/* -- Behavior ------------------------------------------------------ */}
          <Text style={styles.sectionLabel}>{t("customTools.behavior")}</Text>
          <View style={styles.group}>
            <View style={styles.rowSwitch}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t("customTools.mutates")}</Text>
                <Text style={styles.rowSub}>{t("customTools.mutatesHint")}</Text>
              </View>
              <Switch
                value={tool.mutates}
                onValueChange={(v) => patch({ mutates: v })}
                {...switchProps}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.rowSwitch}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t("customTools.pauseTitle")}</Text>
                <Text style={styles.rowSub}>{t("customTools.pauseHint")}</Text>
              </View>
              <Switch
                value={Boolean(tool.disabled)}
                onValueChange={(v) => patch({ disabled: v })}
                {...switchProps}
              />
            </View>
          </View>

          {/* -- Danger -------------------------------------------------------- */}
          <TouchableOpacity style={styles.dangerBtn} onPress={remove}>
            <Text style={styles.dangerText}>{t("common.delete")}</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormRow({
  label,
  value,
  onChangeText,
  multiline,
  mono,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  mono?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "url";
}) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && styles.multilineInput, mono && styles.mono]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        keyboardType={keyboardType ?? "default"}
        placeholderTextColor={Color.placeholder}
      />
    </View>
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
  headerBtn: { padding: 8, minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: Color.label, flex: 1, textAlign: "center" },
  headerSave: { color: Color.accent, fontSize: 17, fontWeight: "600", textAlign: "right" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    color: Color.secondary,
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  group: {
    backgroundColor: Color.surface,
    borderRadius: Radius.card,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Color.hairline,
    marginLeft: 16,
  },
  formRow: { paddingHorizontal: 16, paddingVertical: 10 },
  formLabel: { fontSize: 12, color: Color.secondary, marginBottom: 4 },
  formInput: { fontSize: 15, color: Color.label, minHeight: 24 },
  multilineInput: { minHeight: 60 },
  mono: { fontFamily: "Menlo", fontSize: 13 },
  hint: { fontSize: 12, color: Color.tertiary, marginTop: 8, marginLeft: 16, lineHeight: 18 },
  title: { fontSize: 24, fontWeight: "700", color: Color.label },
  methodPickerRow: {
    flexDirection: "row",
    padding: 12,
    gap: 6,
    flexWrap: "wrap",
  },
  methodPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Color.surface2,
  },
  methodPillActive: { backgroundColor: Color.accent },
  methodPillText: { fontSize: 12, color: Color.secondary, fontWeight: "700" },
  methodPillTextActive: { color: Color.onAccent },
  emptyRow: { padding: 16 },
  rowSub: { fontSize: 13, color: Color.secondary },
  rowTitle: { fontSize: 15, color: Color.label, fontWeight: "500" },
  rowSwitch: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  headerEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerInput: {
    flex: 1,
    fontSize: 13,
    color: Color.label,
    padding: 0,
  },
  addRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addRowText: { color: Color.accent, fontSize: 15, fontWeight: "500" },
  paramCard: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.hairline,
    gap: 8,
  },
  paramHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paramNameInput: {
    fontSize: 14,
    color: Color.label,
    flex: 1,
    padding: 0,
  },
  paramDescInput: {
    fontSize: 13,
    color: Color.secondary,
    minHeight: 34,
  },
  paramFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  typePicker: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Color.surface2,
  },
  typePillActive: { backgroundColor: Color.accent },
  typePillText: { fontSize: 11, color: Color.secondary, fontWeight: "600" },
  typePillTextActive: { color: Color.onAccent },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  requiredLabel: { fontSize: 13, color: Color.secondary },
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
