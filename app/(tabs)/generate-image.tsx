/**
 * Image Studio.
 *
 * Mudanças em relação à versão anterior:
 *
 *  - Gemini SDK → OpenRouter. O modelo agora vem dos Ajustes (`config.imageModel`)
 *    em vez de estar chumbado.
 *  - **Cloudinary foi embora.** A versão antiga recebia a imagem em base64 e
 *    subia para uma conta Cloudinary só para conseguir uma URL e conseguir
 *    exibi-la — uma ida à rede desnecessária que ainda por cima mandava toda
 *    imagem gerada pelos usuários para um bucket público de terceiro. Agora a
 *    imagem é escrita no cache local e exibida com `file://`.
 *  - Seletor de proporção e edição por imagem de referência.
 *  - Painel de prompt em liquid glass.
 */

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as DocumentPicker from "expo-document-picker";

import { generateImage } from "@/services/openrouter";
import { IMAGE_MODELS, loadConfig } from "@/services/config";
import { GlassSurface } from "@/components/ui/glass-surface";
import { AuroraGlow } from "@/components/ui/aurora";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import { Color, Palette, Radius, Shadow, Spacing, Type, alpha } from "@/constants/theme";

const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

// NativeTabs overlap route content; reserve their full footprint rather than
// relying solely on the smaller home-indicator safe-area inset.
const NATIVE_TAB_BAR_CLEARANCE = Platform.OS === "ios" ? 96 : 80;

export default function ImageStudio() {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [modelId, setModelId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadConfig().then((c) => setModelId(c.imageModel));
    }, []),
  );

  const modelName =
    IMAGE_MODELS.find((m) => m.id === modelId)?.name ?? "Image model";

  const canGenerate = !!prompt.trim() && !loading;

  /** Imagem de referência → data URL, para o modelo poder editá-la. */
  const pickReference = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64",
      });

      setReference(`data:${asset.mimeType ?? "image/png"};base64,${base64}`);
    } catch {
      Alert.alert("Error", "Could not read that image.");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    setImage(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const config = await loadConfig();

      const result = await generateImage({
        model: config.imageModel,
        prompt: prompt.trim(),
        referenceImage: reference ?? undefined,
        aspectRatio: ratio,
        signal: controller.signal,
      });

      const base64 = result.dataUrl.split(",")[1] ?? "";
      const uri = `${FileSystem.cacheDirectory}studio-${Date.now()}.png`;

      await FileSystem.writeAsStringAsync(uri, base64, { encoding: "base64" });

      setImage(uri);
    } catch (err: any) {
      const message =
        err?.name === "AbortError"
          ? "A geração demorou demais e foi cancelada. Tente de novo ou troque o modelo em Ajustes."
          : (err?.message ?? String(err));
      setError(message);
      Alert.alert("Generation failed", message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!image) return;

    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);

      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "We need permission to save the image to your library.",
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(image);
      Alert.alert("Saved", "The image is in your photo library.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not save the image.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      // Android uses the native resize mode declared in app.json. This avoids
      // double-adjusting the bottom composer when the keyboard opens.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              (keyboardVisible
                ? Spacing.md
                : Math.max(insets.bottom, NATIVE_TAB_BAR_CLEARANCE)) + Spacing.lg,
          },
        ]}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>STUDIO</Text>
          <Text style={styles.title}>Image Studio</Text>
          <Text style={styles.subtitle}>{modelName} · via OpenRouter</Text>
        </View>

        <View style={styles.previewContainer}>
          {loading ? (
            <View style={styles.loadingState}>
              <AuroraGlow size={180} style={StyleSheet.absoluteFill as any} />
              <ActivityIndicator size="large" color={Color.accent} />
              <Text style={styles.loadingText}>Generating…</Text>
            </View>
          ) : image ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.image} />

              <TouchableOpacity
                style={styles.iconButtonOverlay}
                onPress={handleDownload}
                disabled={downloading}
                activeOpacity={0.7}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={Color.label} />
                ) : (
                  <Ionicons
                    name="download-outline"
                    size={22}
                    color={Color.label}
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={Color.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleGenerate}
                activeOpacity={0.7}
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderState}>
              <AuroraGlow size={160} style={styles.placeholderGlow} />
              <Ionicons name="sparkles" size={30} color={Color.accent} />
              <Text style={styles.placeholderText}>
                Your creation will appear here
              </Text>
            </View>
          )}
        </View>

        <GlassSurface radius={Radius.xxl} style={styles.bottomBar}>
          <View style={[styles.ratioRow, loading && styles.controlsLocked]}>
            {RATIOS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.ratioChip, ratio === r && styles.ratioChipActive]}
                onPress={() => setRatio(r)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.ratioText,
                    ratio === r && styles.ratioTextActive,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!reference && (
            <View style={styles.referenceRow}>
              <Image source={{ uri: reference }} style={styles.referenceThumb} />
              <Text style={styles.referenceText}>
                Editing this image with your prompt
              </Text>
              <TouchableOpacity
                onPress={() => setReference(null)}
                disabled={loading}
              >
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={Color.tertiary}
                />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Describe the image — composition, lighting, style"
            placeholderTextColor={Color.placeholder}
            value={prompt}
            onChangeText={(t) => {
              setPrompt(t);
              if (error) setError(null);
            }}
            multiline
            maxLength={800}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, loading && styles.controlsLocked]}
              onPress={pickReference}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={20} color={Color.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonWrap}
              onPress={handleGenerate}
              disabled={loading || !prompt.trim()}
              activeOpacity={0.85}
            >
              {canGenerate || loading ? (
                <LinearGradient
                  colors={
                    Color.auroraButton as unknown as [
                      string,
                      string,
                      ...string[],
                    ]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, !loading && Shadow.glow]}
                >
                  {loading ? (
                    <View style={styles.buttonBusy}>
                      <ActivityIndicator size="small" color={Color.onAccent} />
                      <Text style={styles.buttonText}>Generating…</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>
                      {reference ? "Edit" : "Generate"}
                    </Text>
                  )}
                </LinearGradient>
              ) : (
                <View style={[styles.button, styles.buttonDisabled]}>
                  <Text style={styles.buttonTextDisabled}>
                    {reference ? "Edit" : "Generate"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </GlassSurface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.bg },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: { alignItems: "center", marginBottom: Spacing.xxl },
  kicker: {
    ...Type.caption2,
    color: Color.accent,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: { ...Type.title1, color: Color.label },
  subtitle: { ...Type.subhead, color: Color.secondary, marginTop: 5 },
  previewContainer: {
    flex: 1,
    backgroundColor: Color.surface,
    borderRadius: Radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: Spacing.xxl,
    minHeight: 300,
    ...Shadow.card,
  },
  imageWrapper: { width: "100%", height: "100%", position: "relative" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  iconButtonOverlay: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: alpha(Palette.black, 0.55),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingState: { alignItems: "center", gap: 10 },
  loadingText: { ...Type.footnote, color: Color.secondary, fontWeight: "500" },
  placeholderState: { alignItems: "center", gap: Spacing.md },
  placeholderGlow: { position: "absolute" },
  placeholderText: {
    color: Color.secondary,
    ...Type.subhead,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  errorState: { alignItems: "center", paddingHorizontal: 28, gap: 12 },
  errorText: {
    color: Color.danger,
    ...Type.subhead,
    textAlign: "center",
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    backgroundColor: Color.surface2,
  },
  retryText: { color: Color.accent, ...Type.subhead, fontWeight: "600" },
  bottomBar: { width: "100%", gap: Spacing.md, padding: Spacing.md },
  ratioRow: { flexDirection: "row", gap: Spacing.sm },
  ratioChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: Color.surface2,
    alignItems: "center",
  },
  ratioChipActive: { backgroundColor: Color.accent },
  ratioText: { ...Type.footnote, color: Color.secondary, fontWeight: "600" },
  ratioTextActive: { color: Color.onAccent },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Color.surface2,
    borderRadius: Radius.md,
    padding: 8,
  },
  referenceThumb: { width: 34, height: 34, borderRadius: 6 },
  referenceText: { flex: 1, ...Type.footnote, color: Color.secondary },
  input: {
    width: "100%",
    minHeight: 50,
    maxHeight: 100,
    backgroundColor: Color.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    borderRadius: Radius.md,
    paddingHorizontal: 15,
    paddingVertical: 14,
    ...Type.callout,
    color: Color.label,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Color.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonWrap: { flex: 1 },
  button: {
    flex: 1,
    height: 52,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  buttonDisabled: { backgroundColor: Color.surface2 },
  buttonBusy: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { color: Color.onAccent, ...Type.headline },
  buttonTextDisabled: { color: Color.tertiary, ...Type.headline },
  controlsLocked: { opacity: 0.4 },
});
