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
          "Token expirado",
          "Access tokens do Google valem cerca de 1 hora. Gere outro no OAuth Playground.",
        );
        return;
      }

      if (!res.ok) {
        Alert.alert("Falhou", `A Gmail API respondeu ${res.status}.`);
        return;
      }

      const data = await res.json();
      if (data.emailAddress && !email) setEmail(data.emailAddress);

      Alert.alert(
        "Conectado",
        `Token válido para ${data.emailAddress}. O agente vai enviar e-mails direto pela API.`,
      );
    } catch {
      Alert.alert("Erro de rede", "Não deu para falar com a Gmail API.");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!email.trim()) {
      Alert.alert("Falta o e-mail", "Informe o endereço da conta.");
      return;
    }

    await AsyncStorage.setItem(EMAIL_KEY, email.trim());

    if (token.trim()) await AsyncStorage.setItem(TOKEN_KEY, token.trim());
    else await AsyncStorage.removeItem(TOKEN_KEY);

    Alert.alert(
      "Salvo",
      token.trim()
        ? "O agente vai enviar pela Gmail API enquanto o token valer."
        : "O agente vai abrir seu app de e-mail com a mensagem pronta.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const handleDisconnect = async () => {
    await AsyncStorage.multiRemove([EMAIL_KEY, TOKEN_KEY, ...LEGACY_KEYS]);
    setEmail("");
    setToken("");
    Alert.alert("Desconectado", "As credenciais do Gmail foram apagadas.");
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
            <Text style={styles.title}>Gmail</Text>
            <Text style={styles.description}>
              Let the agent draft and send email on your behalf.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
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
          <Text style={styles.sectionFooter}>
            With just an email address, the agent opens your mail app with the
            message already written — you tap send.
          </Text>

          <Text style={styles.sectionTitle}>AUTOMATIC SENDING (OPTIONAL)</Text>
          <View style={styles.section}>
            <View style={styles.stackedRow}>
              <Text style={styles.label}>OAuth access token</Text>
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
          <Text style={styles.sectionFooter}>
            Paste a token with the gmail.send scope and the agent sends without
            asking. Google tokens expire in about an hour, so this is for
            testing — surviving that needs a refresh token, which needs a client
            secret, which needs a backend. This app never had one.
          </Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(PLAYGROUND_URL)}
          >
            <Feather name="external-link" size={16} color="#6E7BFF" />
            <Text style={styles.linkText}>Get a token in OAuth Playground</Text>
          </TouchableOpacity>

          {!!token.trim() && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={testToken}
              disabled={checking}
            >
              <Text style={styles.secondaryButtonText}>
                {checking ? "Checking…" : "Test token"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>

          {connected && (
            <TouchableOpacity
              style={styles.disconnect}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectText}>Disconnect</Text>
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
