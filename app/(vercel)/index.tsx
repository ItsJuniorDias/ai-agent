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
import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

export default function VercelScreen() {
  const { t } = useTranslation();
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
      Alert.alert(t("common.error"), t("common.loadError"));
    }
  };

  const saveSettings = async () => {
    setLoadingSave(true);
    try {
      await AsyncStorage.setItem("@vercel_token", token);
      await AsyncStorage.setItem("@vercel_project_id", projectId);
      await AsyncStorage.setItem("@vercel_team_id", teamId);

      Alert.alert(t("common.success"), t("common.savedOnDevice"));
    } catch (e) {
      Alert.alert(t("common.error"), t("common.saveError"));
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDeploy = async () => {
    if (!token || !projectId) {
      Alert.alert(t("common.attention"), t("conn.vercel.tokenProjectRequired"));
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
          data.error?.message || t("conn.vercel.unknownVercelError"),
        );
      }

      // Success! Show the generated URL in the alert
      Alert.alert(
        t("conn.vercel.deployStarted"),
        t("conn.vercel.deployStartedBody", { url: data.url }),
      );
    } catch (error) {
      Alert.alert(
        t("conn.vercel.deploymentError"),
        error instanceof Error ? error.message : t("conn.vercel.unknownError"),
      );
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
          <Text style={styles.title}>{t("conn.vercel.title")}</Text>
<Text style={styles.description}>{t("conn.vercel.description")}</Text>
        </View>

        {/* iOS Style Input Group */}
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>{t("conn.vercel.token")}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., m9H1..."
              placeholderTextColor={Color.placeholder}
              value={token}
              onChangeText={setToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <Text style={styles.label}>{t("conn.vercel.projectId")}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., prj_123..."
              placeholderTextColor={Color.placeholder}
              value={projectId}
              onChangeText={setProjectId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <Text style={styles.label}>{t("conn.vercel.teamId")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("common.optional")}
              placeholderTextColor={Color.placeholder}
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
            <Text style={styles.primaryButtonText}>{t("common.saveSettings")}</Text>
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
            <Text style={styles.deployButtonText}>{t("conn.vercel.startDeployment")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.bg, // Default iOS background color (Grouped Background)
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
    color: Color.label,
    letterSpacing: 0.41,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Color.secondary, // iOS secondary gray
    lineHeight: 20,
  },
  inputGroup: {
    backgroundColor: Color.surface,
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
    color: Color.label,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: Color.label,
    padding: 0, // Removes default Android padding
  },
  separator: {
    height: StyleSheet.hairlineWidth, // Exact 1-pixel line of the device
    backgroundColor: Color.hairline,
    marginLeft: 16, // The line doesn't go all the way to the left edge (Apple standard)
  },
  primaryButton: {
    backgroundColor: Color.accent, // Official iOS Blue
    paddingVertical: 16,
    borderRadius: 14, // Modern iOS buttons use rounder corners
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Color.onAccent,
    fontSize: 17,
    fontWeight: "600",
  },
  deployButton: {
    backgroundColor: Color.surface, // Kept black as it's Vercel's visual identity
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  deployButtonText: {
    color: Color.onAccent,
    fontSize: 17,
    fontWeight: "600",
  },
});
