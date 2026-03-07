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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GmailScreen() {
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [syncEmails, setSyncEmails] = useState(true);
  const [syncDrafts, setSyncDrafts] = useState(false);

  // Carrega os dados ao abrir a tela
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem("@gmail_email");
        const storedPassword = await AsyncStorage.getItem("@gmail_app_password");
        const storedSyncEmails = await AsyncStorage.getItem("@gmail_sync_emails");
        const storedSyncDrafts = await AsyncStorage.getItem("@gmail_sync_drafts");

        if (storedEmail) setEmail(storedEmail);
        if (storedPassword) setAppPassword(storedPassword);
        if (storedSyncEmails !== null) setSyncEmails(JSON.parse(storedSyncEmails));
        if (storedSyncDrafts !== null) setSyncDrafts(JSON.parse(storedSyncDrafts));
      } catch (error) {
        console.error("Erro ao carregar os dados", error);
      }
    };
    carregarDados();
  }, []);

  const handleSave = async () => {
    if (!email || !appPassword) {
      Alert.alert("Error", "Email and App Password are required.");
      return;
    }

    try {
      // Save data to AsyncStorage
      await AsyncStorage.setItem("@gmail_email", email);
      await AsyncStorage.setItem("@gmail_app_password", appPassword);
      await AsyncStorage.setItem("@gmail_sync_emails", JSON.stringify(syncEmails));
      await AsyncStorage.setItem("@gmail_sync_drafts", JSON.stringify(syncDrafts));

      Alert.alert("Success", "Gmail settings saved successfully!");
      
      // Here you would make a call to your Backend to start the synchronization
      // fetchEmailsFromBackend(email, appPassword);

    } catch (error) {
      Alert.alert("Error", "Failed to save Gmail settings.");
    }
  };

  // ... (The rest of your return and styles remain exactly the same)
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Gmail</Text>
          <Text style={styles.description}>
            Connect your Gmail account to sync your emails and drafts directly
            into the app
          </Text>
        </View>

        {/* Account Credentials Section */}
        <Text style={styles.sectionTitle}>ACCOUNT CREDENTIALS</Text>
        <View style={styles.section}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="example@gmail.com"
              placeholderTextColor="#C7C7CC"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>App Password</Text>
            <TextInput
              style={styles.input}
              placeholder="xxxx xxxx xxxx xxxx"
              placeholderTextColor="#C7C7CC"
              value={appPassword}
              onChangeText={setAppPassword}
              secureTextEntry 
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <Text style={styles.sectionFooter}>
          You can generate an App Password in your Google Account settings under "Security" > "App Passwords". This is required for third-party apps to access your Gmail account securely.
        </Text>

        {/* Sync Preferences Section */}
        <Text style={styles.sectionTitle}>SYNC PREFERENCES</Text>
        <View style={styles.section}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>Sync Inbox</Text>
            <Switch
              value={syncEmails}
              onValueChange={setSyncEmails}
              trackColor={{ false: "#D1D1D6", true: "#34C759" }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sync Drafts</Text>
            <Switch
              value={syncDrafts}
              onValueChange={setSyncDrafts}
              trackColor={{ false: "#D1D1D6", true: "#34C759" }}
            />
          </View>
        </View>

        {/* Connect Button */}
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Connect to Gmail</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F2F7" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  header: { marginBottom: 32, paddingHorizontal: 8 },
  title: { fontSize: 34, fontWeight: "bold", color: "#000", marginBottom: 8 },
  description: { fontSize: 15, color: "#8E8E93" },
  sectionTitle: { fontSize: 13, color: "#8E8E93", marginLeft: 16, marginBottom: 8, textTransform: "uppercase" },
  sectionFooter: { fontSize: 13, color: "#8E8E93", marginLeft: 16, marginTop: 8, marginBottom: 24 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 10, overflow: "hidden", marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#FFFFFF", minHeight: 44 },
  borderBottom: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#C6C6C8" },
  label: { fontSize: 17, color: "#000" },
  input: { flex: 1, fontSize: 17, color: "#8E8E93", textAlign: "right", marginLeft: 16 },
  button: { backgroundColor: "#4285F4", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});