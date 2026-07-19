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
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as DocumentPicker from "expo-document-picker";

import { generateImage } from "@/services/openrouter";
import { IMAGE_MODELS, loadConfig } from "@/services/config";

const colors = {
  background: "#F2F2F7",
  content: "#FFFFFF",
  text: "#000000",
  textSecondary: "#8E8E93",
  accent: "#007AFF",
  placeholder: "#C7C7CC",
  inputBg: "#E3E3E8",
};

const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export default function ImageStudio() {
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

  // O botão só fica cinza (desabilitado) quando não há nada para gerar.
  // Durante o loading ele continua azul e mostra o spinner — assim o clique
  // sempre dá um retorno visual claro em vez de parecer que nada aconteceu.
  const idleDisabled = !prompt.trim() && !loading;

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

    // Fecha o teclado antes de gerar. Some plataformas engolem o primeiro toque
    // no botão só para dispensar o teclado; o `keyboardShouldPersistTaps` no
    // ScrollView já entrega o toque, mas dispensar aqui evita o teclado tapar o
    // resultado quando ele chega.
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    setImage(null);

    // Timeout de segurança. Geração de imagem leva alguns segundos; se o provedor
    // travar, o AbortController evita spinner eterno e vira um erro visível.
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

      // A imagem chega como data URL. Gravar em disco e usar `file://` mantém a
      // string gigante fora do estado do React — data URLs de vários MB dentro
      // de um `useState` travam a thread de JS a cada re-render.
      const base64 = result.dataUrl.split(",")[1] ?? "";
      const uri = `${FileSystem.cacheDirectory}studio-${Date.now()}.png`;

      await FileSystem.writeAsStringAsync(uri, base64, { encoding: "base64" });

      setImage(uri);
    } catch (err: any) {
      // Erro mostrado na própria tela, não só em Alert — no web o Alert do
      // react-native é silencioso, e aí a falha vira "não acontece nada".
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

      // O arquivo já está local — nada para baixar, é só copiar para a galeria.
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Image Studio</Text>
          <Text style={styles.subtitle}>{modelName} via OpenRouter</Text>
        </View>

        <View style={styles.previewContainer}>
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.accent} />
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color="#FF3B30"
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
              <Text style={styles.placeholderIcon}>✨</Text>
              <Text style={styles.placeholderText}>
                Your creation will appear here
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomBar}>
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
                <Ionicons name="close-circle" size={22} color={colors.placeholder} />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Describe the image — composition, lighting, style"
            placeholderTextColor={colors.placeholder}
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
              <Ionicons name="image-outline" size={20} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, idleDisabled && styles.buttonDisabled]}
              onPress={handleGenerate}
              disabled={loading || !prompt.trim()}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.buttonBusy}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.buttonText}>Generating…</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    idleDisabled && styles.buttonTextDisabled,
                  ]}
                >
                  {reference ? "Edit" : "Generate"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: { alignItems: "center", marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.35,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 5,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.content,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 24,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrapper: { width: "100%", height: "100%", position: "relative" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  iconButtonOverlay: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingState: { alignItems: "center", gap: 10 },
  loadingText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  placeholderState: { alignItems: "center" },
  placeholderIcon: { fontSize: 40, marginBottom: 15 },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  errorState: { alignItems: "center", paddingHorizontal: 28, gap: 12 },
  errorText: {
    color: "#FF3B30",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.inputBg,
  },
  retryText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  bottomBar: { width: "100%", gap: 12 },
  ratioRow: { flexDirection: "row", gap: 8 },
  ratioChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.inputBg,
    alignItems: "center",
  },
  ratioChipActive: { backgroundColor: colors.accent },
  ratioText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  ratioTextActive: { color: "#FFFFFF" },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.content,
    borderRadius: 12,
    padding: 8,
  },
  referenceThumb: { width: 34, height: 34, borderRadius: 6 },
  referenceText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  input: {
    width: "100%",
    minHeight: 50,
    maxHeight: 100,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    flex: 1,
    backgroundColor: colors.accent,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: colors.inputBg },
  buttonBusy: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: {
    color: colors.content,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  buttonTextDisabled: { color: colors.placeholder },
  controlsLocked: { opacity: 0.4 },
});
