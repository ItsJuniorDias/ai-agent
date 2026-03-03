import { GoogleGenerativeAI } from "@google/generative-ai";
import * as DocumentPicker from "expo-document-picker";
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
import Markdown from "react-native-markdown-display";

import RNFS from "react-native-fs";

const API_KEY = process?.env?.EXPO_PUBLIC_GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export default function FileAnalyzer() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Aceitando os 5 tipos mais comuns compatíveis com a API do Gemini
        type: [
          "application/pdf", // PDFs
          "text/plain", // Arquivos de texto (.txt)
          "text/csv", // Planilhas e dados (.csv)
          "image/jpeg", // Imagens JPG/JPEG
          "image/png", // Imagens PNG
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setFile(result.assets[0]);
        setSummary("");
      }
    } catch (err) {
      Alert.alert("Error", "Could not select the document. Please try again.");
    }
  };

  const analyzeFile = async () => {
    if (!file) return;

    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

      const base64Data = await RNFS.readFile(file.uri, "base64");

      // Prompt atualizado para ser genérico e focado em resumo
      const prompt =
        "Analise este arquivo detalhadamente e gere um resumo estruturado com os pontos mais importantes e principais aprendizados ou conclusões.";

      // Pegando o mimeType dinamicamente do arquivo selecionado
      const filePart = {
        inlineData: {
          data: base64Data,
          mimeType: file.mimeType || "application/octet-stream",
        },
      };

      const result = await model.generateContent([prompt, filePart]);
      const response = result.response;
      const text = response.text();

      console.log("Resumo Gerado:", text);

      setSummary(text);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Please try again. Ensure the file is supported and not corrupted.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
              {/* Texto atualizado para abranger mais arquivos */}
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
                here.
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
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#F2F2F7",
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
    fontFamily: "Courier",
  },
  blockquote: {
    backgroundColor: "#F9F9F9",
    borderLeftColor: "#C7C7CC",
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
};
