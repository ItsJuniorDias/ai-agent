import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
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
        lib: "MaterialCommunityIcons",
        desc: "Pull Requests & Issues",
        color: "#181717",
      },
      {
        id: "gitlab",
        title: "GitLab",
        icon: "gitlab",
        lib: "MaterialCommunityIcons",
        desc: "CI/CD & Repositories",
        color: "#FC6D26",
      },
      {
        id: "vercel",
        title: "Vercel",
        icon: "triangle",
        lib: "Feather",
        desc: "Deployments & Edge Logs",
        color: "#000000",
      },
    ],
  },
  {
    id: "project_mgmt",
    title: "Management & Planning",
    options: [
      {
        id: "jira",
        title: "Jira",
        icon: "jira",
        lib: "MaterialCommunityIcons",
        desc: "Enterprise Agile workflows",
        color: "#0052CC",
      },
    ],
  },
  {
    id: "design_docs",
    title: "Design & Knowledge",
    options: [
      {
        id: "figma",
        title: "Figma",
        icon: "figma",
        lib: "Feather",
        desc: "Design files & prototypes",
        color: "#F24E1E",
      },
    ],
  },
  {
    id: "excel",
    title: "Data & Spreadsheets",
    options: [
      {
        id: "excel",
        title: "Excel",
        icon: "file-excel",
        lib: "FontAwesome6",
        desc: "Spreadsheets & data analysis",
        color: "#217346",
      },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    options: [
      {
        id: "whatsapp",
        title: "WhatsApp",
        icon: "whatsapp",
        lib: "MaterialCommunityIcons",
        desc: "Personal & Business messages",
        color: "#25D366",
      },
      {
        id: "discord",
        title: "Discord",
        icon: "discord",
        lib: "FontAwesome6",
        desc: "Server communities & voice",
        color: "#5865F2",
      },
      {
        id: "slack",
        title: "Slack",
        icon: "slack",
        lib: "MaterialCommunityIcons",
        desc: "Channels & Direct Messages",
        color: "#4A154B",
      },
      {
        id: "chat",
        title: "Chat",
        icon: "chat",
        lib: "MaterialCommunityIcons",
        desc: "Chat messages & threads",
        color: "#007AFF",
      },
    ],
  },
];

export default function OnboardingScreen() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isGoogleModalVisible, setGoogleModalVisible] = useState(false);
  const router = useRouter();

  const proceedToNextScreen = async (optionId) => {
    try {
      await AsyncStorage.setItem("@primary_integration", optionId);
      router.push("/(tabs)");
    } catch (error) {
      console.error("Storage Error:", error);
    }
  };

  const handleContinue = () => {
    if (!selectedOption) {
      Alert.alert("Selection Required", "Please choose a primary tool.");
      return;
    }
    if (selectedOption === "gmail") {
      setGoogleModalVisible(true);
    } else {
      proceedToNextScreen(selectedOption);
    }
  };

  // Helper para renderizar o ícone correto baseado na biblioteca definida
  const renderIcon = (option, isSelected) => {
    const IconLib =
      option.lib === "MaterialCommunityIcons"
        ? MaterialCommunityIcons
        : option.lib === "FontAwesome6"
          ? FontAwesome6
          : Feather;

    return <IconLib name={option.icon} size={20} color={option.color} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>How do you want to start?</Text>
            <Text style={styles.subtitle}>
              Choose your primary workspace to set up your AI Agent's context.
            </Text>
          </View>

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
                      onPress={() => setSelectedOption(option.id)}
                    >
                      <View style={styles.iconContainer}>
                        {renderIcon(option, isSelected)}
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !selectedOption && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedOption}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL GMAIL */}
      <Modal visible={isGoogleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="gmail" size={40} color="#DB4437" />
              <Text style={styles.modalTitle}>Connect Gmail</Text>
              <Text style={styles.modalSubtitle}>
                Allow the AI Agent to access your emails to assist you better.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => proceedToNextScreen("gmail")}
            >
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setGoogleModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 120 },
  header: { marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 16, color: "#8E8E93", lineHeight: 22 },
  categorySection: { marginBottom: 24 },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  optionsGrid: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardSelected: { backgroundColor: "#E5F0FF", borderColor: "#007AFF" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconContainerSelected: { backgroundColor: "#FFFFFF" },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  cardDescription: { fontSize: 13, color: "#8E8E93" },
  textSelected: { color: "#007AFF" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 34,
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
  buttonDisabled: { backgroundColor: "#D1D1D6" },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },

  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", // Modal aparece na parte inferior
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40, // Espaço para a safe area do iPhone
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#4285F4", // Azul oficial do Google
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  cancelButton: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#8E8E93",
    fontSize: 17,
    fontWeight: "500",
  },
});
