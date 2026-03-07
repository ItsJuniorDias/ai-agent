import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DiscordScreen() {
  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.7");

  // --- NOVOS CAMPOS PARA DISCORD ---
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [botToken, setBotToken] = useState("");

  const STORAGE_KEY = "@ai_agent_config";

  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          const savedData = JSON.parse(jsonValue);
          setAgentName(savedData.agentName || "");
          setSystemPrompt(savedData.systemPrompt || "");
          setTemperature(savedData.temperature || "0.7");
          // Carregar novos campos
          setDiscordWebhook(savedData.discordWebhook || "");
          setBotToken(savedData.botToken || "");
        }
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!agentName.trim() || !systemPrompt.trim() || !discordWebhook.trim()) {
      Alert.alert(
        "Attention Required",
        "Please fill in the agent name, behavior, and Webhook URL.",
      );
      return;
    }

    try {
      const agentData = {
        agentName,
        systemPrompt,
        temperature,
        discordWebhook,
        botToken,
      };
      const jsonValue = JSON.stringify(agentData);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);

      Alert.alert("Success", "Agent and Discord settings saved!");
    } catch (e) {
      Alert.alert("Error", "Failed to save settings.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.largeTitle}>Discord</Text>
            <Text style={styles.subtitle}>
              Connect your agent to a Discord channel using a Webhook URL.
              Optionally, provide a Bot Token for enhanced features.
            </Text>
          </View>

          {/* SECTION 1: IDENTIFICATION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AGENT IDENTIFICATION</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                placeholder="Agent Name"
                placeholderTextColor="#C7C7CC"
                value={agentName}
                onChangeText={setAgentName}
              />
              <View style={styles.separator} />
              <TextInput
                style={styles.input}
                placeholder="Temperature (e.g., 0.7)"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                value={temperature}
                onChangeText={setTemperature}
              />
            </View>
          </View>

          {/* SECTION 2: DISCORD (NEW) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DISCORD INTEGRATION</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                placeholder="Webhook URL (https://discord.com/api/webhooks/...)"
                placeholderTextColor="#C7C7CC"
                value={discordWebhook}
                onChangeText={setDiscordWebhook}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.separator} />
              <TextInput
                style={styles.input}
                placeholder="Bot Token (Optional)"
                placeholderTextColor="#C7C7CC"
                secureTextEntry={true} // Esconde o token por segurança
                value={botToken}
                onChangeText={setBotToken}
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.footerText}>
              The Webhook allows the AI to send messages to a specific channel.
            </Text>
          </View>

          {/* SECTION 3: BEHAVIOR */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BEHAVIOR (SYSTEM PROMPT)</Text>
            <View style={styles.card}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Personality instructions..."
                placeholderTextColor="#C7C7CC"
                value={systemPrompt}
                onChangeText={setSystemPrompt}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>Save and Connect</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Classic iOS background color
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#000000",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 17,
    color: "#8E8E93",
    marginTop: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#6D6D72",
    marginLeft: 36,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: -0.1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  input: {
    fontSize: 17,
    color: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#C6C6C8",
    marginLeft: 16, // Linha não encosta na borda esquerda (estilo iOS)
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  footerText: {
    fontSize: 13,
    color: "#8E8E93",
    marginHorizontal: 36,
    marginTop: 8,
    textAlign: "justify",
  },
  primaryButton: {
    backgroundColor: "#007AFF", // Azul da Apple
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 40,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
});
