import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Color } from "@/constants/theme";

const STORAGE_KEYS = {
  EMAIL: "@jira_email",
  TOKEN: "@jira_token",
  DOMAIN: "@jira_domain",
};

export default function JiraSettings() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [emailValue, tokenValue, domainValue] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.DOMAIN),
      ]);

      if (emailValue) setEmail(emailValue);
      if (tokenValue) setToken(tokenValue);
      if (domainValue) setDomain(domainValue);
    } catch (e) {
      Alert.alert("Error", "Could not load settings.");
    }
  };

  const handleSave = async () => {
    if (!email || !token || !domain) {
      Alert.alert("Required Fields", "Please complete all fields to continue.");
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.EMAIL, email.trim()),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token.trim()),
        AsyncStorage.setItem(STORAGE_KEYS.DOMAIN, domain.toLowerCase().trim()),
      ]);
      Alert.alert("Success", "Settings saved securely.");
    } catch (e) {
      Alert.alert("Error", "Failed to save configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Jira Integration</Text>
            <Text style={styles.subtitle}>
              Configure your Atlassian Cloud credentials to sync your workspace.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
            <View style={styles.group}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={Color.placeholder}
                />
              </View>

              <View style={[styles.inputWrapper, styles.noBorder]}>
                <TextInput
                  style={styles.input}
                  placeholder="API Token"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  placeholderTextColor={Color.placeholder}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WORKSPACE</Text>
            <View style={styles.group}>
              <View
                style={[
                  styles.inputWrapper,
                  styles.domainContainer,
                  styles.noBorder,
                ]}
              >
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="your-company"
                  value={domain}
                  onChangeText={setDomain}
                  autoCapitalize="none"
                  placeholderTextColor={Color.placeholder}
                />
              </View>
            </View>
            <Text style={styles.footerText}>
              Find your domain in your Jira browser URL.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Settings</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.bg, // iOS System Background
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: Color.label,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Color.secondary,
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    color: Color.secondary,
    marginLeft: 16,
    marginBottom: 8,
    fontWeight: "400",
  },
  group: {
    backgroundColor: Color.surface,
    borderRadius: 12,
    overflow: "hidden", // Ensures children don't bleed out of radius
  },
  inputWrapper: {
    paddingLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  input: {
    height: 48,
    fontSize: 17,
    color: Color.label,
  },
  domainContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  domainSuffix: {
    color: Color.secondary,
    fontSize: 17,
  },
  footerText: {
    fontSize: 13,
    color: Color.secondary,
    marginTop: 8,
    marginLeft: 16,
  },
  button: {
    backgroundColor: Color.accent, // San Francisco Blue
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: Color.accentSoft,
  },
  buttonText: {
    color: Color.onAccent,
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: { color: Color.accent, fontSize: 17, fontWeight: "400" },
});
