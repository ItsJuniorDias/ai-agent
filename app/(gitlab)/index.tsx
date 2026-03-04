import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function GitLabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    accessToken: "",
    baseUrl: "https://gitlab.com", // Default
    projectId: "",
  });

  // Carrega dados existentes ao abrir a tela
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const saved = await AsyncStorage.getItem("@gitlab_config");
        if (saved) setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar config", e);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    if (!config.accessToken || !config.projectId || !config.baseUrl) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem("@gitlab_config", JSON.stringify(config));

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      Alert.alert("Sucesso", "Configurações do GitLab salvas!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <FontAwesome5 name="gitlab" size={50} color="#FC6D26" />
            <Text style={styles.title}>GitLab Setup</Text>
            <Text style={styles.subtitle}>
              Configure as credenciais para realizar Code Reviews via IA.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Instância GitLab (Base URL)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://gitlab.com"
              value={config.baseUrl}
              onChangeText={(txt) => setConfig({ ...config, baseUrl: txt })}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.label}>Personal Access Token</Text>
            <TextInput
              style={styles.input}
              placeholder="glpat-xxxxxxxxxxxxxxxx"
              value={config.accessToken}
              onChangeText={(txt) => setConfig({ ...config, accessToken: txt })}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Project ID (ou Path encodado)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 12345678"
              value={config.projectId}
              onChangeText={(txt) => setConfig({ ...config, projectId: txt })}
              keyboardType="numeric"
            />

            <Text style={styles.helperText}>
              O Project ID pode ser encontrado na home do seu projeto no GitLab.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveConfig}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar Configurações</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F2F7" },
  container: { flex: 1 },
  scrollContent: { padding: 24, alignItems: "center" },
  header: { alignItems: "center", marginBottom: 30, marginTop: 20 },
  title: { fontSize: 28, fontWeight: "700", color: "#1C1C1E", marginTop: 15 },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
  },
  form: { width: "100%", marginBottom: 30 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A3A3C",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C6C6C8",
  },
  helperText: { fontSize: 12, color: "#8E8E93", marginTop: -10, marginLeft: 4 },
  saveButton: {
    backgroundColor: "#FC6D26",
    width: "100%",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: { color: "#FFF", fontSize: 17, fontWeight: "600" },
  backButton: { width: "100%", padding: 12, alignItems: "center" },
  backButtonText: { color: "#007AFF", fontSize: 16 },
});
