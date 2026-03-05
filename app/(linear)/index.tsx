import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";

export default function LinearScreen() {
  const [apiKey, setApiKey] = useState("");
  const [teamId, setTeamId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(true);

  const handleSave = () => {
    // Aqui você implementaria a chamada para a API do Linear ou salvaria os dados no SecureStore
    if (!apiKey) {
      Alert.alert("Erro", "A API Key é obrigatória.");
      return;
    }
    Alert.alert("Sucesso", "Configurações do Linear salvas com sucesso!");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Linear</Text>
          <Text style={styles.description}>
            Configure your integration with Linear to sync your issues and
            projects.
          </Text>
        </View>

        {/* Authentication Section */}
        <Text style={styles.sectionTitle}>AUTHENTICATION</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="lin_api_..."
              placeholderTextColor="#C7C7CC"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry // Hide the API key
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <Text style={styles.sectionFooter}>
          You can generate an API Key in your Linear account settings.
        </Text>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.section}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>Default Team ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: ENG"
              placeholderTextColor="#C7C7CC"
              value={teamId}
              onChangeText={setTeamId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Active Sync</Text>
            <Switch
              value={syncEnabled}
              onValueChange={setSyncEnabled}
              trackColor={{ false: "#D1D1D6", true: "#34C759" }} // iOS official colors
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Connect to Linear</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7", // iOS grouped background
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 34, // iOS Large Title
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#8E8E93", // Cinza secundário da Apple
  },
  sectionTitle: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionFooter: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden", // Garante que as bordas arredondadas não sejam sobrescritas
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    minHeight: 44, // Altura mínima de toque da Apple
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8", // Divisor padrão do iOS
  },
  label: {
    fontSize: 17,
    color: "#000",
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "right", // No iOS, os inputs costumam alinhar à direita
    marginLeft: 16,
  },
  button: {
    backgroundColor: "#007AFF", // Azul do iOS
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
