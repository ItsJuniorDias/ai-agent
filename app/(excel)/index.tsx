import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Chaves para o AsyncStorage
const STORAGE_KEYS = {
  PROMPT: "@excel_agent_prompt",
  TOKEN: "@excel_agent_token",
  FILE_ID: "@excel_agent_fileid",
};

export default function ExcelScreen() {
  const [prompt, setPrompt] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [fileId, setFileId] = useState("");

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  // Carrega os dados salvos quando a tela abre
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedPrompt = await AsyncStorage.getItem(STORAGE_KEYS.PROMPT);
        const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const savedFileId = await AsyncStorage.getItem(STORAGE_KEYS.FILE_ID);

        if (savedPrompt) setPrompt(savedPrompt);
        if (savedToken) setAccessToken(savedToken);
        if (savedFileId) setFileId(savedFileId);
      } catch (e) {
        console.error("Error loading saved data:", e);
      }
    };

    loadSavedData();
  }, []);

  const handleSave = async () => {
    // Basic validation
    if (!prompt.trim() || !accessToken.trim() || !fileId.trim()) {
      setError("Please fill in the Token, File ID, and Command.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse("");

    try {
      // Save the current data to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PROMPT, prompt),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.FILE_ID, fileId),
      ]);

      setResponse("Settings saved successfully!");

      // TIP: If using React Navigation, you can redirect the user here:
      // navigation.navigate('ChatScreen');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while saving data locally.",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    setPrompt("");
    setAccessToken("");
    setFileId("");
    setResponse("");
    setError("");
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.PROMPT),
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.FILE_ID),
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Microsoft Graph</Text>
            <Text style={styles.description}>
              Configure your credentials and set the initial command.
            </Text>
          </View>

          {/* API Settings Card */}
          <Text style={styles.sectionTitle}>Credentials</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.inputSingleLine}
              placeholder="Microsoft Access Token"
              placeholderTextColor="#8E8E93"
              value={accessToken}
              onChangeText={setAccessToken}
              autoCorrect={false}
              autoCapitalize="none"
              secureTextEntry // Esconde o token gigante na tela
            />
            <View style={styles.divider} />
            <TextInput
              style={styles.inputSingleLine}
              placeholder="File ID (OneDrive/SharePoint)"
              placeholderTextColor="#8E8E93"
              value={fileId}
              onChangeText={setFileId}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Command Card */}
          <Text style={styles.sectionTitle}>Agent Command</Text>
          <View style={[styles.card, styles.promptCard]}>
            <TextInput
              style={styles.inputMultiline}
              placeholder="Ex: Summarize the sales table..."
              placeholderTextColor="#8E8E93"
              multiline
              value={prompt}
              onChangeText={setPrompt}
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!prompt.trim() || !accessToken.trim() || !fileId.trim()) &&
                styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={
              loading || !prompt.trim() || !accessToken.trim() || !fileId.trim()
            }
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Save and Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={clearData} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear all saved data</Text>
          </TouchableOpacity>

          {error ? (
            <View style={[styles.responseContainer, styles.errorContainer]}>
              <Text style={[styles.responseTitle, styles.errorTitle]}>
                Error Saving
              </Text>
              <Text style={styles.responseText}>{error}</Text>
            </View>
          ) : null}

          {response ? (
            <View style={styles.responseContainer}>
              <Text style={styles.responseTitle}>Success</Text>
              <Text style={styles.responseText}>{response}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F2F7" },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 60 },
  header: { marginBottom: 24 },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  description: { fontSize: 17, color: "#3C3C43", lineHeight: 22 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  promptCard: { minHeight: 120 },
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 12 },
  inputSingleLine: { fontSize: 17, color: "#000000", paddingVertical: 4 },
  inputMultiline: {
    flex: 1,
    fontSize: 17,
    color: "#000000",
    textAlignVertical: "top",
    minHeight: 80,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#A1C8FF",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  clearButton: { marginTop: 24, alignItems: "center", paddingVertical: 8 },
  clearButtonText: { color: "#FF3B30", fontSize: 15, fontWeight: "500" },
  responseContainer: {
    marginTop: 32,
    backgroundColor: "#E5F0FF",
    padding: 16,
    borderRadius: 12,
  },
  errorContainer: { backgroundColor: "#FFE5E5" },
  responseTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  errorTitle: { color: "#FF3B30" },
  responseText: { fontSize: 16, color: "#000000", lineHeight: 22 },
});
