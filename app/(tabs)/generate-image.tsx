import { GoogleGenerativeAI } from "@google/generative-ai";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Novo import para o ícone de download
import { Ionicons } from "@expo/vector-icons";

import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

const colors = {
  light: {
    background: "#F2F2F7",
    content: "#FFFFFF",
    text: "#000000",
    textSecondary: "#8E8E93",
    accent: "#007AFF",
    border: "#E5E5EA",
    placeholder: "#C7C7CC",
    inputBg: "#E3E3E8",
  },
};

const curColor = colors.light;

// Lembre-se de esconder sua chave em produção!
const API_KEY = process?.env?.EXPO_PUBLIC_GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export default function GenerateImageApple() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setGeneratedImage(null);
    console.log("Gerando imagem para:", prompt);

    try {
      const geminiImage = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
      });

      const storyImageResult = await geminiImage.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      });

      const storyImagePart =
        storyImageResult?.response?.candidates[0]?.content.parts.find(
          (p) => p.inlineData,
        );

      if (!storyImagePart?.inlineData?.data) {
        throw new Error("Nenhuma imagem retornada pela API.");
      }

      const permanentUrl = await uploadGeminiToCloudinary(
        storyImagePart.inlineData.data,
      );

      console.log("Imagem gerada, URL permanente:", permanentUrl);
      setGeneratedImage(permanentUrl);
    } catch (error) {
      console.error("Erro na geração:", error);
      Alert.alert(
        "Erro",
        "Falha ao gerar a imagem. Verifique sua API Key ou conexão.",
      );
    } finally {
      setLoading(false);
    }
  };

  const uploadGeminiToCloudinary = async (base64String) => {
    const CLOUD_NAME = "dqvujibkn";
    const UPLOAD_PRESET = "ai-generated-images";
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    const formData = new FormData();
    formData.append("file", `data:image/png;base64,${base64String}`);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const response = await fetch(url, { method: "POST", body: formData });
      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary Error:", err);
      throw err;
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    setIsDownloading(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);

      if (status !== "granted") {
        Alert.alert(
          "Permissão Negada",
          "Precisamos da sua permissão para salvar a imagem na galeria.",
        );
        setIsDownloading(false);
        return;
      }

      const filename = `gemini_image_${Date.now()}.png`;

      const downloadedFile = await FileSystem.downloadAsync(
        generatedImage,
        `${FileSystem.cacheDirectory}${filename}`,
      );

      console.log("Imagem baixada para:", downloadedFile.uri);

      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);

      Alert.alert("Sucesso!", "A imagem foi salva na sua galeria.");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Não foi possível baixar a imagem.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Image Studio</Text>
            <Text style={styles.subtitle}>
              Transformation of your imagination into visuals
            </Text>
          </View>

          <View style={styles.previewContainer}>
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={curColor.accent} />
                <Text style={styles.loadingText}>Generating...</Text>
              </View>
            ) : generatedImage ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: generatedImage }} style={styles.image} />

                {/* --- NOVO ÍCONE DE DOWNLOAD SOBRE A IMAGEM --- */}
                <TouchableOpacity
                  style={styles.iconButtonOverlay}
                  onPress={handleDownload}
                  disabled={isDownloading}
                  activeOpacity={0.7}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="download-outline"
                      size={24}
                      color="#FFFFFF"
                    />
                  )}
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
            <TextInput
              style={styles.input}
              placeholder="Describe the image (e.g., 'a space cat')"
              placeholderTextColor={curColor.placeholder}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={200}
            />

            <TouchableOpacity
              style={[
                styles.button,
                (!prompt || loading) && styles.buttonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={loading || !prompt}
            >
              <Text
                style={[
                  styles.buttonText,
                  (!prompt || loading) && styles.buttonTextDisabled,
                ]}
              >
                {loading ? "Please wait..." : "Generate"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: curColor.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.35,
    color: curColor.text,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: curColor.textSecondary,
    marginTop: 5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: curColor.content,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // Importante: mantém a imagem e o botão dentro das bordas arredondadas
    marginBottom: 30,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  // --- NOVOS ESTILOS DE LAYOUT DA IMAGEM ---
  imageWrapper: {
    width: "100%",
    height: "100%",
    position: "relative", // Necessário para o botão 'absolute' alinhar por ele
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  iconButtonOverlay: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fundo preto semi-transparente
    width: 44,
    height: 44,
    borderRadius: 22, // Fica perfeitamente redondo
    justifyContent: "center",
    alignItems: "center",
    // Blur sutil na sombra do ícone
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // -----------------------------------------

  loadingState: {
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: curColor.textSecondary,
    fontWeight: "500",
  },
  placeholderState: {
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  placeholderText: {
    color: curColor.textSecondary,
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  bottomBar: {
    width: "100%",
    gap: 15,
  },
  input: {
    width: "100%",
    minHeight: 50,
    maxHeight: 100,
    backgroundColor: curColor.inputBg,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 15,
    fontSize: 16,
    color: curColor.text,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: curColor.accent,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  buttonDisabled: {
    backgroundColor: curColor.inputBg,
  },
  buttonText: {
    color: curColor.content,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  buttonTextDisabled: {
    color: curColor.placeholder,
  },
});
