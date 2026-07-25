/**
 * Criar custom tool.
 *
 * Dois modos:
 *
 *  1. AI-generate: usuário digita "Conecta com https://api.meuapp.com,
 *     bearer XYZ, GET /orders, POST /orders". Rodamos o `generator` e o
 *     resultado vira uma config editável. Ele revisa, ajusta e salva.
 *  2. Manual: form vazio, ele preenche tudo. O formulário fica em
 *     `[toolId].tsx` — depois de gerar, redirecionamos pra lá pra edição.
 *
 * Estratégia: sempre passar pelo editor. Este arquivo só é "gerador +
 * chooser". Isso evita duplicar UI de form.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

import { Color, Radius } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { generateCustomToolFromText } from "@/services/custom-tools/generator";
import {
  saveCustomTool,
  generateCustomToolId,
} from "@/services/custom-tools/storage";

export default function CustomToolNew() {
  const { t } = useTranslation();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!description.trim()) {
      Alert.alert(t("common.requiredTitle"), t("customTools.errNeedDescription"));
      return;
    }

    setGenerating(true);
    try {
      const result = await generateCustomToolFromText(description);
      if (!result.ok) {
        Alert.alert(t("customTools.errGenerate"), result.error);
        return;
      }
      await saveCustomTool(result.config);
      router.replace(`/(custom-tools)/${result.config.id}` as never);
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const startBlank = async () => {
    const id = await generateCustomToolId("new");
    await saveCustomTool({
      id,
      name: "new_tool",
      label: "New tool",
      description: "",
      method: "GET",
      urlTemplate: "https://",
      headers: {},
      parameters: [],
      mutates: false,
      createdAt: new Date().toISOString(),
    });
    router.replace(`/(custom-tools)/${id}` as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={26} color={Color.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconWrap}>
            <Feather name="sliders" size={36} color={Color.accent} />
          </View>
          <Text style={styles.title}>{t("customTools.newTitle")}</Text>
          <Text style={styles.subtitle}>{t("customTools.newSubtitle")}</Text>

          <Text style={styles.sectionLabel}>{t("customTools.aiGenerate")}</Text>
          <View style={styles.textAreaGroup}>
            <TextInput
              style={styles.textArea}
              placeholder={t("customTools.aiPlaceholder")}
              placeholderTextColor={Color.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              editable={!generating}
            />
          </View>
          <Text style={styles.hint}>{t("customTools.aiHint")}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, generating && styles.buttonDisabled]}
            onPress={generate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={Color.onAccent} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t("customTools.generateBtn")}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{t("customTools.orDivider")}</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity style={styles.secondaryOutlined} onPress={startBlank}>
            <Feather name="edit-2" size={18} color={Color.accent} />
            <Text style={styles.secondaryOutlinedText}>
              {t("customTools.startBlank")}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topBarBtn: { padding: 8, minWidth: 44 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  iconWrap: { alignItems: "center", marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Color.label,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Color.secondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 21,
  },
  sectionLabel: {
    fontSize: 13,
    color: Color.secondary,
    marginLeft: 16,
    marginTop: 28,
    marginBottom: 8,
  },
  textAreaGroup: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    minHeight: 140,
    padding: 12,
  },
  textArea: {
    fontSize: 15,
    color: Color.label,
    minHeight: 120,
  },
  hint: {
    fontSize: 12,
    color: Color.tertiary,
    marginTop: 8,
    marginLeft: 16,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: Color.accent,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  primaryButtonText: { color: Color.onAccent, fontSize: 17, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Color.hairline },
  separatorText: { fontSize: 12, color: Color.tertiary, textTransform: "uppercase" },
  secondaryOutlined: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    borderRadius: Radius.lg,
  },
  secondaryOutlinedText: { color: Color.accent, fontSize: 15, fontWeight: "600" },
});
