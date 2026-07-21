/**
 * Configuração do Gmail.
 *
 * A tela antiga pedia e-mail + "senha de app" para mandar e-mail por SMTP.
 * Isso nunca teve como funcionar: SMTP precisa de socket TCP e o React Native
 * não tem socket. O próprio código admitia — tinha um comentário
 * `// Aqui você faria a chamada para o seu Backend iniciar a sincronização`
 * apontando para um backend que não existe. Os toggles de "Sync Inbox" e
 * "Sync Drafts" também não faziam nada.
 *
 * Agora a tela é honesta sobre os dois caminhos que realmente existem:
 *
 *  1. Sem access token → a tool `gmail_send_email` abre o app de e-mail do
 *     celular já preenchido (`mailto:`). Você aperta enviar. Funciona sempre.
 *  2. Com access token OAuth → o agente manda pela Gmail API sem você tocar.
 *     O token é de vida curta (~1h), então serve para testar; para produção
 *     o certo é refresh token, que exige client secret e portanto um backend.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

const EMAIL_KEY = "@gmail_email";
const TOKEN_KEY = "@gmail_access_token";

/** Chaves da tela antiga que não são mais lidas por ninguém. */
const LEGACY_KEYS = [
  "@gmail_app_password",
  "@gmail_sync_emails",
  "@gmail_sync_drafts",
];

const PLAYGROUND_URL = "https://developers.google.com/oauthplayground";

export default function GmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.multiGet([EMAIL_KEY, TOKEN_KEY]).then((pairs) => {
        const map = Object.fromEntries(pairs);
        setEmail(map[EMAIL_KEY] ?? "");
        setToken(map[TOKEN_KEY] ?? "");
      });
      // Limpa a senha de app que a versão anterior possa ter guardado.
      AsyncStorage.multiRemove(LEGACY_KEYS);
    }, []),
  );

  /** Confere se o token ainda vale antes de o agente depender dele. */
  const testToken = async () => {
    if (!token.trim()) return;

    setChecking(true);
    try {
      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        { headers: { Authorization: `Bearer ${token.trim()}` } },
      );

      if (res.status === 401) {
        Alert.alert(
          t("conn.gmail.tokenExpiredTitle"),
          t("conn.gmail.tokenExpiredBody"),
        );
        return;
      }

      if (!res.ok) {
        Alert.alert(t("common.error"), t("conn.gmail.apiRespondedFail", { status: res.status }));
        return;
      }

      const data = await res.json();
      if (data.emailAddress && !email) setEmail(data.emailAddress);

      Alert.alert(
        t("conn.gmail.connected"),
        t("conn.gmail.connectedBody", { email: data.emailAddress }),
      );
    } catch {
      Alert.alert(t("conn.gmail.networkError"), t("conn.gmail.networkErrorBody"));
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!email.trim()) {
      Alert.alert(t("conn.gmail.missingEmail"), t("conn.gmail.missingEmailBody"));
      return;
    }

    await AsyncStorage.setItem(EMAIL_KEY, email.trim());

    if (token.trim()) await AsyncStorage.setItem(TOKEN_KEY, token.trim());
    else await AsyncStorage.removeItem(TOKEN_KEY);

    Alert.alert(
      t("conn.gmail.saved"),
      token.trim()
        ? t("conn.gmail.savedTokenBody")
        : t("conn.gmail.savedNoTokenBody"),
      [{ text: t("common.ok"), onPress: () => router.back() }],
    );
  };

  const handleDisconnect = async () => {
    await AsyncStorage.multiRemove([EMAIL_KEY, TOKEN_KEY, ...LEGACY_KEYS]);
    setEmail("");
    setToken("");
    Alert.alert(t("conn.gmail.disconnected"), t("conn.gmail.disconnectedBody"));
  };

  const connected = !!email;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("conn.gmail.title")}</Text>
<Text style={styles.description}>{t("conn.gmail.description")}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t("conn.gmail.account")}</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("conn.gmail.email")}</Text>
              <TextInput
                style={styles.input}
                placeholder="you@gmail.com"
                placeholderTextColor={Color.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
<Text style={styles.sectionFooter}>{t("conn.gmail.accountHint")}</Text>

          <Text style={styles.sectionTitle}>{t("conn.gmail.autoSending")}</Text>
          <View style={styles.section}>
            <View style={styles.stackedRow}>
              <Text style={styles.label}>{t("conn.gmail.oauthToken")}</Text>
              <TextInput
                style={styles.stackedInput}
                placeholder="ya29.…"
                placeholderTextColor={Color.placeholder}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
            </View>
          </View>
<Text style={styles.sectionFooter}>{t("conn.gmail.oauthHint")}</Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(PLAYGROUND_URL)}
          >
            <Feather name="external-link" size={16} color={Color.accent} />
            <Text style={styles.linkText}>{t("conn.gmail.getToken")}</Text>
          </TouchableOpacity>

          {!!token.trim() && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={testToken}
              disabled={checking}
            >
              <Text style={styles.secondaryButtonText}>
                {checking ? t("conn.gmail.checking") : t("conn.gmail.testToken")}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>{t("common.save")}</Text>
          </TouchableOpacity>

          {connected && (
            <TouchableOpacity
              style={styles.disconnect}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectText}>{t("common.disconnect")}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  header: { marginBottom: 32, paddingHorizontal: 8 },
  title: { fontSize: 34, fontWeight: "bold", color: Color.label, marginBottom: 8 },
  description: { fontSize: 15, color: Color.secondary },
  sectionTitle: {
    fontSize: 13,
    color: Color.secondary,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionFooter: {
    fontSize: 13,
    color: Color.secondary,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 18,
  },
  section: {
    backgroundColor: Color.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  stackedRow: { paddingVertical: 12, paddingHorizontal: 16 },
  label: { fontSize: 17, color: Color.label },
  input: {
    flex: 1,
    fontSize: 17,
    color: Color.secondary,
    textAlign: "right",
    marginLeft: 16,
  },
  stackedInput: {
    fontSize: 15,
    color: Color.secondary,
    marginTop: 8,
    minHeight: 44,
    textAlignVertical: "top",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 16,
    marginBottom: 24,
  },
  linkText: { fontSize: 15, color: Color.accent },
  button: {
    backgroundColor: Color.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: Color.onAccent, fontSize: 17, fontWeight: "600" },
  secondaryButton: { backgroundColor: Color.surface2 },
  secondaryButtonText: { color: Color.accent, fontSize: 17, fontWeight: "600" },
  disconnect: { alignItems: "center", paddingVertical: 16, marginTop: 8 },
  disconnectText: { fontSize: 17, color: Color.danger },
});
