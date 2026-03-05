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

export default function NotionScreen() {
  const [notionToken, setNotionToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(true);

  const handleSave = () => {
    if (!notionToken) {
      Alert.alert("Error", "The Integration Token is required.");
      return;
    }
    Alert.alert("Success", "Notion settings saved successfully!");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notion</Text>
          <Text style={styles.description}>
            Configure your integration with Notion to sync your notes and
            databases.
          </Text>
        </View>

        {/* Authentication Section */}
        <Text style={styles.sectionTitle}>AUTHENTICATION</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Secret Token</Text>
            <TextInput
              style={styles.input}
              placeholder="secret_..."
              placeholderTextColor="#C7C7CC"
              value={notionToken}
              onChangeText={setNotionToken}
              secureTextEntry // Hide the token
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <Text style={styles.sectionFooter}>
          Create a new integration at notion.so/my-integrations to obtain your
          Secret Token.
        </Text>

        {/* Seção de Configuração do Workspace */}
        <Text style={styles.sectionTitle}>WORKSPACE</Text>
        <View style={styles.section}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>Database ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: a8aec43387b04..."
              placeholderTextColor="#C7C7CC"
              value={databaseId}
              onChangeText={setDatabaseId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sincronizar Notas</Text>
            <Switch
              value={syncEnabled}
              onValueChange={setSyncEnabled}
              trackColor={{ false: "#D1D1D6", true: "#34C759" }} // Cores oficiais do iOS
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Connect to Notion</Text>
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#8E8E93",
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
    overflow: "hidden",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    minHeight: 44,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  label: {
    fontSize: 17,
    color: "#000",
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "right",
    marginLeft: 16,
  },
  button: {
    backgroundColor: "#007AFF",
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
