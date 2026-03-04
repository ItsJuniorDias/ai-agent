import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function VercelScreen() {
  const [token, setToken] = useState("");
  const [projectId, setProjectId] = useState("");
  const [teamId, setTeamId] = useState("");

  // Separate loading states for each action
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDeploy, setLoadingDeploy] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedToken = await AsyncStorage.getItem("@vercel_token");
      const savedProject = await AsyncStorage.getItem("@vercel_project_id");
      const savedTeam = await AsyncStorage.getItem("@vercel_team_id");

      if (savedToken) setToken(savedToken);
      if (savedProject) setProjectId(savedProject);
      if (savedTeam) setTeamId(savedTeam);
    } catch (e) {
      Alert.alert("Error", "Could not load the settings.");
    }
  };

  const saveSettings = async () => {
    setLoadingSave(true);
    try {
      await AsyncStorage.setItem("@vercel_token", token);
      await AsyncStorage.setItem("@vercel_project_id", projectId);
      await AsyncStorage.setItem("@vercel_team_id", teamId);

      Alert.alert("Success", "Settings saved successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to save data.");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDeploy = async () => {
    if (!token || !projectId) {
      Alert.alert("Attention", "Token and Project ID are required.");
      return;
    }

    setLoadingDeploy(true);

    try {
      // Vercel API URL (v13 is the current recommended version for deployments)
      let apiUrl = "https://api.vercel.com/v13/deployments";

      // If the account belongs to a team, Vercel requires the teamId in the URL
      if (teamId && teamId.trim() !== "") {
        apiUrl += `?teamId=${teamId.trim()}`;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "app-deployment", // Generic name, Vercel maps it to your Project ID
          project: projectId.trim(),
          target: "production", // Can be 'staging' or 'production'
        }),
      });

      const data = await response.json();

      // Check if the Vercel API returned an error (e.g., Invalid token, missing permissions)
      if (!response.ok) {
        throw new Error(
          data.error?.message || "Unknown error communicating with Vercel.",
        );
      }

      // Success! Show the generated URL in the alert
      Alert.alert(
        "Deploy Started 🚀",
        `The process has started successfully!\n\nURL: ${data.url}`,
      );
    } catch (error) {
      Alert.alert("Deployment Error", error.message);
    } finally {
      setLoadingDeploy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Vercel Integration</Text>
          <Text style={styles.description}>
            Configure your credentials to trigger a deployment via API.
          </Text>
        </View>

        {/* iOS Style Input Group */}
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Token</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., m9H1..."
              placeholderTextColor="#C7C7CC"
              value={token}
              onChangeText={setToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <Text style={styles.label}>Project ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., prj_123..."
              placeholderTextColor="#C7C7CC"
              value={projectId}
              onChangeText={setProjectId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <Text style={styles.label}>Team ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor="#C7C7CC"
              value={teamId}
              onChangeText={setTeamId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={saveSettings}
          disabled={loadingSave || loadingDeploy}
        >
          {loadingSave ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deployButton}
          onPress={handleDeploy}
          disabled={loadingSave || loadingDeploy}
        >
          {loadingDeploy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deployButtonText}>Start Deployment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Default iOS background color (Grouped Background)
    paddingTop: 40,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 34, // Standard iOS "Large Title" size
    fontWeight: "bold",
    color: "#000",
    letterSpacing: 0.41,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#8A8A8E", // iOS secondary gray
    lineHeight: 20,
  },
  inputGroup: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginBottom: 30,
    overflow: "hidden", // Ensures inputs respect the container's border radius
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  label: {
    width: 90, // Fixed width to align inputs
    fontSize: 17, // Standard iOS text size
    color: "#000",
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: "#000",
    padding: 0, // Removes default Android padding
  },
  separator: {
    height: StyleSheet.hairlineWidth, // Exact 1-pixel line of the device
    backgroundColor: "#C6C6C8",
    marginLeft: 16, // The line doesn't go all the way to the left edge (Apple standard)
  },
  primaryButton: {
    backgroundColor: "#007AFF", // Official iOS Blue
    paddingVertical: 16,
    borderRadius: 14, // Modern iOS buttons use rounder corners
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
  deployButton: {
    backgroundColor: "#000", // Kept black as it's Vercel's visual identity
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  deployButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
