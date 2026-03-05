import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Chaves para o AsyncStorage
const STORAGE_KEYS = {
  BOT_TOKEN: "@slack_bot_token",
  CHANNEL_ID: "@slack_channel_id",
  NOTIFICATIONS: "@slack_notifications",
};

export default function SlackScreen() {
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar dados ao iniciar a tela
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.BOT_TOKEN);
        const storedChannel = await AsyncStorage.getItem(
          STORAGE_KEYS.CHANNEL_ID,
        );
        const storedNotifs = await AsyncStorage.getItem(
          STORAGE_KEYS.NOTIFICATIONS,
        );

        if (storedToken) setBotToken(storedToken);
        if (storedChannel) setChannelId(storedChannel);
        if (storedNotifs !== null)
          setNotificationsEnabled(JSON.parse(storedNotifs));
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar as configurações.");
        console.error("Failed to load Slack settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Salvar dados
  const handleSave = async () => {
    if (!botToken) {
      Alert.alert("Error", "The Bot Token is required.");
      return;
    }

    setIsSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BOT_TOKEN, botToken);
      await AsyncStorage.setItem(STORAGE_KEYS.CHANNEL_ID, channelId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(notificationsEnabled),
      );

      Alert.alert("Success", "Slack configuration saved successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to save configuration.");
      console.error("Failed to save Slack settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color="#8E8E93" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Slack</Text>
          <Text style={styles.description}>
            Configure your Slack integration to send notifications and sync
            messages directly to your channels.
          </Text>
        </View>

        {/* Authentication Section */}
        <Text style={styles.sectionTitle}>AUTHENTICATION</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Bot Token</Text>
            <TextInput
              style={styles.input}
              placeholder="xoxb-..."
              placeholderTextColor="#C7C7CC"
              value={botToken}
              onChangeText={setBotToken}
              secureTextEntry // Hides the token
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <Text style={styles.sectionFooter}>
          You can generate a Bot Token in your Slack App configuration under
          "OAuth & Permissions".
        </Text>

        {/* Workspace Configuration Section */}
        <Text style={styles.sectionTitle}>WORKSPACE</Text>
        <View style={styles.section}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>Channel ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: C01234567"
              placeholderTextColor="#C7C7CC"
              value={channelId}
              onChangeText={setChannelId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Enable Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#D1D1D6", true: "#34C759" }}
            />
          </View>
        </View>

        {/* Save/Connect Button */}
        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Connect to Slack</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Default iOS grouped background
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
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
    minHeight: 44, // Minimum tap target size for iOS
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
    backgroundColor: "#4A154B", // Slack official brand purple
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    height: 50, // Fixa a altura para não encolher durante o loading
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
