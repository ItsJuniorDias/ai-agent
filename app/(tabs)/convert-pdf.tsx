/**
 * Insights — análise de documentos.
 *
 * Mudanças:
 *  - Gemini SDK → OpenRouter (`analyzeFile`). PDF vai como `type: "file"` com o
 *    plugin `file-parser`, então funciona em qualquer modelo do catálogo, não
 *    só nos que têm suporte nativo a PDF.
 *  - `react-native-fs` → `expo-file-system`. Some uma dependência nativa que
 *    exigia rebuild e que já não é mantida ativamente; o Expo SDK 54 já traz
 *    `readAsStringAsync` fazendo exatamente a mesma coisa.
 *  - Escolha do tipo de análise, em vez do prompt de resumo único e fixo.
 */

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Markdown from "react-native-markdown-display";
import { Feather } from "@expo/vector-icons";

import { analyzeFile as runAnalysis } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import { Color, MonoFont, Radius, Shadow, Spacing, Type, alpha } from "@/constants/theme";
import { useTranslation } from "@/i18n";

type Mode = { id: string; label: string; prompt: string };

const MODES: Mode[] = [
  {
    id: "summary",
    label: "Summary",
    prompt:
      "Analyze this file and produce a structured summary in Markdown: the main points, the key takeaways, and the conclusions. Be specific — cite the actual numbers, names and claims in the document rather than describing them in the abstract.",
  },
  {
    id: "extract",
    label: "Key data",
    prompt:
      "Extract every concrete data point from this file — figures, dates, names, amounts, deadlines — and present them as a Markdown table. If the document has no tabular data, use a bulleted list grouped by theme. Do not summarize prose; extract facts.",
  },
  {
    id: "questions",
    label: "Critique",
    prompt:
      "Read this file critically. List: (1) claims that are unsupported or weakly supported, (2) internal contradictions, (3) important information that is missing, (4) the questions someone should ask before acting on this. Be direct.",
  },
  {
    id: "actions",
    label: "Action items",
    prompt:
      "Pull every action item, decision, commitment and deadline out of this file. Present as a Markdown checklist, with the owner and the due date where the document states them. If something is implied but not stated, mark it as inferred.",
  },
];

/**
 * PDF escaneado não tem camada de texto — o parser gratuito devolve vazio.
 * Nesse caso o `mistral-ocr` resolve, mas custa. Deixamos o usuário decidir.
 */
const OCR_HINT =
  "The parser found no text layer. This is usually a scanned PDF — turn on OCR and try again.";

export default function FileAnalyzer() {
  const { t } = useTranslation();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>(MODES[0]);
  const [ocr, setOcr] = useState(false);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "text/csv",
          "text/markdown",
          "image/jpeg",
          "image/png",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setFile(result.assets[0]);
      setSummary("");
    } catch {
      Alert.alert("Error", "Could not select the document. Please try again.");
    }
  };

  const analyze = async () => {
    if (!file || isLoading) return;

    setIsLoading(true);
    setSummary("");

    try {
      const config = await loadConfig();

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });

      const { text } = await runAnalysis({
        model: config.documentModel,
        prompt: mode.prompt,
        filename: file.name,
        mimeType: file.mimeType ?? "application/octet-stream",
        base64,
        pdfEngine: ocr ? "mistral-ocr" : "pdf-text",
      });

      setSummary(text || OCR_HINT);
    } catch (err: any) {
      Alert.alert("Analysis failed", err?.message ?? String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(summary);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.dateText}>
          {new Date()
            .toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
            .toUpperCase()}
        </Text>
        <Text style={styles.title}>{t("insights")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("document")}</Text>

          <TouchableOpacity
            style={[styles.dropZone, !!file && styles.dropZoneActive]}
            onPress={pickDocument}
            activeOpacity={0.7}
          >
            <Feather
              name={file ? "file-text" : "upload"}
              size={20}
              color={file ? Color.accent : Color.secondary}
            />
            <Text
              style={[styles.dropZoneText, !!file && styles.dropZoneTextActive]}
              numberOfLines={1}
            >
              {file ? file.name : "Tap to select a file (PDF, TXT, CSV, IMG)"}
            </Text>
          </TouchableOpacity>

          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeChip, mode.id === m.id && styles.modeChipActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode.id === m.id && styles.modeTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {file?.mimeType === "application/pdf" && (
            <TouchableOpacity
              style={styles.ocrRow}
              onPress={() => setOcr((v) => !v)}
              activeOpacity={0.7}
            >
              <Feather
                name={ocr ? "check-square" : "square"}
                size={18}
                color={ocr ? Color.accent : Color.tertiary}
              />
              <Text style={styles.ocrText}>
                Scanned PDF (use OCR — slower, costs more)
              </Text>
            </TouchableOpacity>
          )}

          {!!file && (
            <TouchableOpacity
              onPress={analyze}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={Color.auroraButton as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.mainButton, !isLoading && Shadow.glow]}
              >
                {isLoading ? (
                  <ActivityIndicator color={Color.onAccent} />
                ) : (
                  <Text style={styles.mainButtonText}>{t("analyzeNow")}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.resultContainer}>
          {summary ? (
            <View style={styles.summaryCard}>
              <TouchableOpacity style={styles.copyButton} onPress={copy}>
                <Feather name="copy" size={15} color={Color.secondary} />
              </TouchableOpacity>
              <Markdown style={markdownStyles}>{summary}</Markdown>
            </View>
          ) : (
            !isLoading && (
              <Text style={styles.placeholderText}>
                Select a file and tap Analyze now to see the insights summary
                here.
              </Text>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.bg },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  dateText: { ...Type.footnote, fontWeight: "600", color: Color.accent, letterSpacing: 0.8 },
  title: { ...Type.largeTitle, color: Color.label },
  scrollContent: { padding: Spacing.xl, paddingBottom: 60 },
  card: {
    backgroundColor: Color.surface,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    padding: Spacing.xl,
    ...Shadow.card,
    marginBottom: Spacing.xxl,
  },
  cardTitle: { ...Type.title3, color: Color.label, marginBottom: Spacing.lg },
  dropZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: Color.hairlineStrong,
    borderStyle: "dashed",
    borderRadius: Radius.md,
    paddingVertical: 24,
    paddingHorizontal: Spacing.lg,
  },
  dropZoneActive: {
    borderColor: Color.accent,
    backgroundColor: Color.accentSoft,
  },
  dropZoneText: { ...Type.subhead, color: Color.secondary, flexShrink: 1 },
  dropZoneTextActive: { color: Color.accent, fontWeight: "500" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.lg },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Color.surface2,
  },
  modeChipActive: { backgroundColor: Color.accent },
  modeText: { fontSize: 14, color: Color.secondary, fontWeight: "500" },
  modeTextActive: { color: Color.onAccent },
  ocrRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: Spacing.lg },
  ocrText: { ...Type.footnote, color: Color.secondary },
  mainButton: {
    height: 52,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    overflow: "hidden",
  },
  mainButtonText: { color: Color.onAccent, ...Type.headline },
  resultContainer: { flex: 1 },
  summaryCard: {
    backgroundColor: Color.surface,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  copyButton: { alignSelf: "flex-end", padding: 4 },
  placeholderText: {
    ...Type.subhead,
    color: Color.secondary,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 21,
  },
});

const markdownStyles = StyleSheet.create({
  body: { ...Type.callout, color: Color.label, lineHeight: 24 },
  heading1: { fontSize: 22, fontWeight: "700", color: Color.label, marginTop: 8, marginBottom: 6 },
  heading2: { fontSize: 19, fontWeight: "600", color: Color.label, marginTop: 8, marginBottom: 4 },
  strong: { fontWeight: "700", color: Color.label },
  link: { color: Color.accent },
  code_inline: {
    backgroundColor: Color.accentSoft,
    color: Color.accent,
    borderRadius: 5,
    paddingHorizontal: 5,
    fontFamily: MonoFont,
  },
  fence: {
    backgroundColor: Color.surface2,
    color: Color.label,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    padding: 12,
    fontFamily: MonoFont,
  },
  table: { borderColor: Color.hairlineStrong, borderRadius: 8 },
  tr: { borderColor: Color.hairline },
  th: { padding: 6, color: Color.label },
  td: { padding: 6, color: Color.secondary },
});
