import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function AIPrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho */}
        <View style={styles.headerContainer}>
          <Ionicons
            name="shield-checkmark"
            size={60}
            color="#007AFF"
            style={styles.headerIcon}
          />
          <Text style={styles.title}>Artificial Intelligence & Privacy</Text>
          <Text style={styles.subtitle}>
            To provide our AI features, we need to share some data. Here is how
            we protect your privacy.
          </Text>
        </View>

        {/* Requisito 1: Disclose what data will be sent */}
        <View style={styles.infoBlock}>
          <Ionicons name="document-text" size={36} color="#007AFF" />
          <View style={styles.textContainer}>
            <Text style={styles.infoTitle}>What data is sent</Text>
            <Text style={styles.infoDescription}>
              Only the text you type in the chat [OR the photos you upload] is
              sent for processing. We do not send your name, email, or location
              data.
            </Text>
          </View>
        </View>

        {/* Requisito 2: Specify who the data is sent to */}
        <View style={styles.infoBlock}>
          <Ionicons name="cloud-upload" size={36} color="#007AFF" />
          <View style={styles.textContainer}>
            <Text style={styles.infoTitle}>Who we send it to</Text>
            <Text style={styles.infoDescription}>
              Your data is securely sent to [INSERT AI NAME, e.g., OpenAI /
              Google Gemini], our partnered Artificial Intelligence service
              provider.
            </Text>
          </View>
        </View>

        {/* Requisito 3 e 4: Como é usado e segurança */}
        <View style={styles.infoBlock}>
          <Ionicons name="lock-closed" size={36} color="#007AFF" />
          <View style={styles.textContainer}>
            <Text style={styles.infoTitle}>Data Use & Protection</Text>
            <Text style={styles.infoDescription}>
              The data is used exclusively to generate responses within the app.
              Our partners do not use your data to train public AI models.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Requisito: Obtain the user's permission */}
      <View style={styles.footer}>
        <Text style={styles.footerDisclaimer}>
          By continuing, you agree to share the data described above with our AI
          partners. Read our <Text style={styles.linkText}>Privacy Policy</Text>
          .
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(onboarding)")}
        >
          <Text style={styles.primaryButtonText}>Agree & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Alert.alert(
              "Exit AI Features",
              "You have chosen not to share data with our AI partners. You can still use the app, but AI features will be disabled.",
              [
                {
                  text: "OK",
                },
              ],
            );
          }}
        >
          <Text style={styles.secondaryButtonText}>Do Not Share (Exit)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  headerIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#000000",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666666",
    lineHeight: 22,
  },
  infoBlock: {
    flexDirection: "row",
    marginBottom: 32,
    alignItems: "flex-start",
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 10 : 24,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  footerDisclaimer: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 16,
  },
  linkText: {
    color: "#007AFF",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "400",
  },
});
