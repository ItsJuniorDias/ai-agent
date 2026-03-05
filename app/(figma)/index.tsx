import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FigmaScreen() {
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [fileKey, setFileKey] = useState("");

  // Carrega os dados salvos quando a tela é montada
  useEffect(() => {
    const loadFigmaData = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("@figma_token");
        const savedFileKey = await AsyncStorage.getItem("@figma_file_key");

        if (savedToken) setPersonalAccessToken(savedToken);
        if (savedFileKey) setFileKey(savedFileKey);
      } catch (error) {
        console.error("Erro ao carregar dados do AsyncStorage:", error);
      }
    };

    loadFigmaData();
  }, []);

  const handleConnect = async () => {
    if (!personalAccessToken || !fileKey) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    try {
      // Salva os dados localmente no dispositivo
      await AsyncStorage.setItem("@figma_token", personalAccessToken);
      await AsyncStorage.setItem("@figma_file_key", fileKey);

      // Lógica de integração com a API do Figma entraria aqui
      Alert.alert(
        "Conectando...",
        "Dados salvos com sucesso. Iniciando integração.",
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar os dados.");
      console.error("Erro ao salvar no AsyncStorage:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Figma Integration</Text>
          <Text style={styles.description}>
            Enter your Personal Access Token and File Key to connect your Figma
          </Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Personal Access Token"
              placeholderTextColor="#999"
              value={personalAccessToken}
              onChangeText={setPersonalAccessToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <Text style={styles.label}>File Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: jF98xV..."
              placeholderTextColor="#999"
              value={fileKey}
              onChangeText={setFileKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <Text style={styles.footerText}>
          You can find your Personal Access Token in your Figma account settings
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleConnect}>
          <Text style={styles.buttonText}>Connect to Figma</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  formGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: {
    width: 80,
    fontSize: 16,
    color: "#000",
    fontWeight: "400",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#C6C6C8",
    marginLeft: 16,
  },
  footerText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 8,
    marginHorizontal: 32,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
