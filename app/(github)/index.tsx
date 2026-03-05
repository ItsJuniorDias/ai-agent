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
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function GitHubScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    accessToken: "",
    baseUrl: "https://api.github.com", // Base URL padrão do GitHub
    repoOwner: "", // Ex: facebook
    repoName: "", // Ex: react-native
    sourceBranch: "",
    targetBranch: "",
    title: "",
    description: "",
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const saved = await AsyncStorage.getItem("@github_config");
        if (saved) setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar config", e);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    // Validação básica para os campos do GitHub
    if (
      !config.accessToken ||
      !config.repoOwner ||
      !config.repoName ||
      !config.baseUrl ||
      !config.sourceBranch ||
      !config.targetBranch ||
      !config.title
    ) {
      Alert.alert(
        "Campos obrigatórios",
        "Por favor, preencha todas as informações essenciais para continuar.",
      );
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem("@github_config", JSON.stringify(config));
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      router.back();
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Minimalista */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="logo-github" size={44} color="#181717" />
            </View>
            <Text style={styles.title}>GitHub Setup</Text>
            <Text style={styles.subtitle}>
              Configuration for AI-Powered Code Reviews
            </Text>
          </View>

          {/* Grupo 1: Conexão */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONNECTION SETTINGS</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="API Base URL"
                  placeholderTextColor="#C7C7CC"
                  value={config.baseUrl}
                  onChangeText={(txt) => setConfig({ ...config, baseUrl: txt })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Personal Access Token"
                  placeholderTextColor="#C7C7CC"
                  value={config.accessToken}
                  onChangeText={(txt) =>
                    setConfig({ ...config, accessToken: txt })
                  }
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Owner (ex: facebook)"
                  placeholderTextColor="#C7C7CC"
                  value={config.repoOwner}
                  onChangeText={(txt) =>
                    setConfig({ ...config, repoOwner: txt })
                  }
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Repository (ex: react-native)"
                  placeholderTextColor="#C7C7CC"
                  value={config.repoName}
                  onChangeText={(txt) =>
                    setConfig({ ...config, repoName: txt })
                  }
                  autoCapitalize="none"
                />
              </View>
            </View>
            <Text style={styles.footerText}>
              The Owner and Repository form the project path. Ex:
              github.com/owner/repository
            </Text>
          </View>

          {/* Group 2: Pull Request Details */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PULL REQUEST DETAILS </Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Source Branch / Head (ex: feature/nova-tela)"
                  placeholderTextColor="#C7C7CC"
                  value={config.sourceBranch}
                  onChangeText={(txt) =>
                    setConfig({ ...config, sourceBranch: txt })
                  }
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Target Branch / Base (ex: main)"
                  placeholderTextColor="#C7C7CC"
                  value={config.targetBranch}
                  onChangeText={(txt) =>
                    setConfig({ ...config, targetBranch: txt })
                  }
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Título do PR"
                  placeholderTextColor="#C7C7CC"
                  value={config.title}
                  onChangeText={(txt) => setConfig({ ...config, title: txt })}
                />
              </View>
              <View style={styles.divider} />
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrição do PR"
                  placeholderTextColor="#C7C7CC"
                  value={config.description}
                  onChangeText={(txt) =>
                    setConfig({ ...config, description: txt })
                  }
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={saveConfig}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F2F7" },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 40 },

  header: { alignItems: "center", marginBottom: 32 },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#FFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#636366",
    textAlign: "center",
    marginTop: 4,
  },

  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 13,
    color: "#6e6e73",
    marginLeft: 16,
    marginBottom: 8,
    fontWeight: "400",
  },
  inputGroup: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  inputWrapper: {
    paddingHorizontal: 16,
    height: 50,
    justifyContent: "center",
  },
  textAreaWrapper: {
    height: 100,
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
  },
  input: { fontSize: 17, color: "#000" },
  textArea: {
    height: "100%",
    width: "100%",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#C6C6C8",
    marginLeft: 16,
  },
  footerText: { fontSize: 13, color: "#8E8E93", marginTop: 8, marginLeft: 16 },

  actionContainer: { gap: 12 },
  primaryButton: {
    backgroundColor: "#007AFF", // Azul estilo iOS
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFF", fontSize: 17, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  secondaryButton: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: { color: "#007AFF", fontSize: 17, fontWeight: "400" },
});
