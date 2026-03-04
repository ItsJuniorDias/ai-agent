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

export default function SlackScreen() {
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSave = () => {
    if (!botToken) {
      Alert.alert("Error", "The Bot Token is required.");
      return;
    }
    Alert.alert("Success", "Slack configuration saved successfully!");
  };

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
              trackColor={{ false: "#D1D1D6", true: "#34C759" }} // iOS official colors
            />
          </View>
        </View>

        {/* Save/Connect Button */}
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Connect to Slack</Text>
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
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
