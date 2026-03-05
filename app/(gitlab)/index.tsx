import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GitlabScreen() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Carrega os dados ao montar a tela
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem("@gitlab_url");
      const savedToken = await AsyncStorage.getItem("@gitlab_token");

      if (savedUrl) setUrl(savedUrl);
      if (savedToken) setToken(savedToken);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as informações salvas.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem("@gitlab_url", url);
      await AsyncStorage.setItem("@gitlab_token", token);
      Alert.alert("Sucesso", "Configurações salvas no dispositivo!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.title}>GitLab</Text>
        <Text style={styles.description}>
          Configure your integration with GitLab to sync your repositories and
          issues.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>CREDENCIAIS</Text>

      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholder="https://gitlab.com"
          placeholderTextColor="#C7C7CC"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.separator} />
        <TextInput
          style={styles.input}
          placeholder="Personal Access Token"
          placeholderTextColor="#C7C7CC"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.buttonContainer} onPress={saveSettings}>
        <Text style={styles.buttonText}>Save Settings</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Fundo padrão agrupado do iOS
    paddingTop: 40,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#6C6C70",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#6C6C70",
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 10,
  },
  inputGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: "hidden", // Garante que o input respeite o border radius do container
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 17, // Tamanho de fonte padrão do iOS para inputs
    color: "#000000",
  },
  separator: {
    height: StyleSheet.hairlineWidth, // Linha fina padrão do iOS
    backgroundColor: "#C6C6C8",
    marginLeft: 16, // A linha geralmente começa alinhada com o texto, não na borda
  },
  buttonContainer: {
    marginTop: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#007AFF", // Azul padrão do iOS
  },
});
