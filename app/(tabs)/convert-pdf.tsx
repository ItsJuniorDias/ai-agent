import { GoogleGenerativeAI } from "@google/generative-ai";
import * as DocumentPicker from "expo-document-picker";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
} from "react-native";
import Markdown from "react-native-markdown-display";
import RNFS from "react-native-fs";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@last_ai_summary";
const API_KEY_STORAGE = "@gemini_api_key";

export default function FileAnalyzer() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  // 1. Carrega o último resumo e a API Key salvos ao abrir a tela
  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Salva automaticamente sempre que o resumo for atualizado
  useEffect(() => {
    if (summary) {
      saveSummary(summary);
    }
  }, [summary]);

  const loadInitialData = async () => {
    try {
      const [savedSummary, savedApiKey] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(API_KEY_STORAGE),
      ]);

      if (savedSummary !== null) {
        setSummary(savedSummary);
      }
      if (savedApiKey !== null) {
        setApiKeyInput(savedApiKey);
      }
    } catch (e) {
      console.error("Erro ao carregar dados salvos:", e);
    }
  };

  const saveApiKey = async (key) => {
    setApiKeyInput(key);
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE, key);
    } catch (e) {
      console.error("Erro ao salvar API Key:", e);
    }
  };

  const saveSummary = async (value) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      console.error("Erro ao salvar resumo localmente:", e);
    }
  };

  const clearSummary = async () => {
    setSummary("");
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "text/csv",
          "image/jpeg",
          "image/png",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setFile(result.assets[0]);
        // Limpa o resumo atual da tela ao selecionar um novo arquivo para evitar confusão
        setSummary("");
      }
    } catch (err) {
      Alert.alert("Error", "Could not select the document. Please try again.");
    }
  };

  const analyzeFile = async () => {
    if (!apiKeyInput) {
      Alert.alert(
        "API Key Missing",
        "Please enter your Gemini API Key in the Settings section.",
      );
      return;
    }

    if (!file) return;

    setIsLoading(true);

    try {
      // Inicializa a IA dinamicamente usando a chave que está no estado/storage
      const genAI = new GoogleGenerativeAI(apiKeyInput);

      // Ajustado para um modelo atualmente estável (2.5 Pro )
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

      // Tratamento rigoroso do caminho do arquivo no iOS
      const filePath =
        Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri;

      const base64Data = await RNFS.readFile(decodeURI(filePath), "base64");

      const prompt =
        "Analise este arquivo detalhadamente e gere um resumo estruturado com os pontos mais importantes e principais aprendizados ou conclusões.";

      const filePart = {
        inlineData: {
          data: base64Data,
          // Fallback de segurança para garantir que a API não recuse o arquivo
          mimeType: file.mimeType || "application/octet-stream",
        },
      };

      const result = await model.generateContent([prompt, filePart]);

      // Await na resposta garante que o texto foi totalmente recebido antes de setar
      const response = await result.response;
      const text = response.text();

      setSummary(text);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Analysis Error",
        `Details: ${error.message || JSON.stringify(error)}\n\nPlease double check if your Gemini API Key is correct and has billing enabled.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} stickyHeaderIndices={[0]}>
      <StatusBar barStyle="dark-content" />

      {/* Header Estilo Apple */}
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
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Insights</Text>
          {summary ? (
            <TouchableOpacity onPress={clearSummary}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Settings Card - API Key */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste your Gemini API Key here"
            placeholderTextColor="#8E8E93"
            value={apiKeyInput}
            onChangeText={saveApiKey}
            secureTextEntry={true} // Oculta a chave como se fosse senha
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            Your key is safely stored only on your device.
          </Text>
        </View>

        {/* Upload Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Document</Text>
          <TouchableOpacity
            style={[styles.dropZone, file && styles.dropZoneActive]}
            onPress={pickDocument}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.dropZoneText, file && styles.dropZoneTextActive]}
            >
              {file ? file.name : "Tap to select a file (PDF, TXT, CSV, IMG)"}
            </Text>
          </TouchableOpacity>

          {file && (
            <TouchableOpacity
              style={styles.mainButton}
              onPress={analyzeFile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainButtonText}>Analyze Now</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Result Area */}
        <View style={styles.resultContainer}>
          {summary ? (
            <View style={styles.summaryCard}>
              <Markdown style={markdownStyles}>{summary}</Markdown>
            </View>
          ) : (
            !isLoading && (
              <Text style={styles.placeholderText}>
                Select a file and tap Analyze Now to see the insights summary
                here. Your summary will be saved automatically.
              </Text>
            )
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60, // Ajustado para dar espaço na área segura do iPhone (notch/Dynamic Island)
    paddingBottom: 10,
    backgroundColor: "#F2F2F7",
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.5,
  },
  clearButton: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    color: "#1C1C1E",
  },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  helperText: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 8,
    fontStyle: "italic",
  },
  dropZone: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  dropZoneActive: {
    backgroundColor: "#E8F2FF",
    borderColor: "#007AFF",
  },
  dropZoneText: {
    color: "#8E8E93",
    fontWeight: "500",
  },
  dropZoneTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  mainButton: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    alignItems: "center",
  },
  mainButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
  resultContainer: {
    marginTop: 5,
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
  },
  placeholderText: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 15,
    marginTop: 40,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});

const markdownStyles = {
  body: {
    color: "#2C2C2E",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  heading1: {
    color: "#000",
    fontWeight: "800",
    fontSize: 32,
    marginTop: 24,
    marginBottom: 12,
  },
  heading2: {
    color: "#1C1C1E",
    fontWeight: "700",
    fontSize: 24,
    marginTop: 20,
    marginBottom: 10,
  },
  strong: {
    fontWeight: "700",
    color: "#000",
  },
  bullet_list: {
    marginVertical: 12,
  },
  list_item: {
    marginVertical: 4,
  },
  link: {
    color: "#007AFF",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  code_inline: {
    backgroundColor: "#F2F2F7",
    color: "#D70015",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  blockquote: {
    backgroundColor: "#F9F9F9",
    borderLeftColor: "#C7C7CC",
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
};
