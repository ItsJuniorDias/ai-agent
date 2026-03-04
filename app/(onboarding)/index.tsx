import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const INTEGRATION_CATEGORIES = [
  {
    id: "dev_tools",
    title: "Development & Code",
    options: [
      {
        id: "github",
        title: "GitHub",
        icon: "github",
        desc: "Pull Requests & Issues",
        color: "#181717", // Preto do GitHub
      },
      {
        id: "gitlab",
        title: "GitLab",
        icon: "gitlab",
        desc: "CI/CD & Repositories",
        color: "#FC6D26", // Laranja do GitLab
      },
      {
        id: "vercel",
        title: "Vercel",
        icon: "triangle",
        desc: "Deployments & Edge Logs",
        color: "#000000", // Preto do Vercel
      },
    ],
  },
  {
    id: "project_mgmt",
    title: "Management & Planning",
    options: [
      {
        id: "linear",
        title: "Linear",
        icon: "vector-line",
        desc: "High-performance tracking",
        color: "#5E6AD2", // Roxo do Linear
      },
      {
        id: "jira",
        title: "Jira",
        icon: "jira",
        desc: "Enterprise Agile workflows",
        color: "#0052CC", // Azul do Jira
      },
      {
        id: "notion",
        title: "Notion",
        icon: "notebook",
        desc: "Docs & Project Wiki",
        color: "#000000", // Preto do Notion
      },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    options: [
      {
        id: "slack",
        title: "Slack",
        icon: "slack",
        desc: "Team chat & notifications",
        color: "#E01E5A", // Rosa/Vermelho do Slack (ou #4A154B para roxo)
      },
      {
        id: "gmail",
        title: "Gmail",
        icon: "email-outline",
        desc: "Inbox & Thread triaging",
        color: "#EA4335", // Vermelho do Gmail
      },
    ],
  },
  {
    id: "chat", // Corrigi o ID duplicado aqui também
    title: "CHAT",
    options: [
      {
        id: "chat",
        title: "Chat",
        icon: "chat",
        desc: "General conversation",
        color: "#007AFF", // Azul genérico
      },
    ],
  },
];

export default function OnboardingScreen() {
  const [selectedOption, setSelectedOption] = useState(null);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selectedOption) {
      Alert.alert(
        "Selection Required",
        "Please choose a primary tool to configure your agent.",
      );
      return;
    }

    try {
      await AsyncStorage.setItem("@primary_integration", selectedOption);
      router.push("/(tabs)");
    } catch (error) {
      console.error("Storage Error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>How do you want to start?</Text>
            <Text style={styles.subtitle}>
              Choose your primary workspace to set up your AI Agent's context.
            </Text>
          </View>

          {/* Categories & Options */}
          {INTEGRATION_CATEGORIES.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.title}</Text>

              <View style={styles.optionsGrid}>
                {category.options.map((option) => {
                  const isSelected = selectedOption === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.card, isSelected && styles.cardSelected]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedOption(option.id)}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          isSelected && styles.iconContainerSelected,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={option.icon}
                          size={24}
                          color={option.color} /* <-- Alterado aqui */
                        />
                      </View>
                      <View style={styles.textContainer}>
                        <Text
                          style={[
                            styles.cardTitle,
                            isSelected && styles.textSelected,
                          ]}
                        >
                          {option.title}
                        </Text>
                        <Text style={styles.cardDescription} numberOfLines={1}>
                          {option.desc}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color="#007AFF"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !selectedOption && styles.buttonDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!selectedOption}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    lineHeight: 22,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  optionsGrid: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardSelected: {
    backgroundColor: "#E5F0FF",
    borderColor: "#007AFF",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: "#FFFFFF",
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  cardDescription: {
    fontSize: 13,
    color: "#8E8E93",
  },
  textSelected: {
    color: "#007AFF",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 34, // Extra padding for iPhone notch
    backgroundColor: "rgba(255,255,255,0.9)",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#D1D1D6",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
