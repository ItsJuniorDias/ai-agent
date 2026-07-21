/**
 * Configuração do Notion.
 *
 * A versão anterior desta tela guardava o token em `useState` e, ao salvar,
 * mostrava `Alert.alert("Success", "Notion settings saved successfully!")` —
 * sem escrever em lugar nenhum. Fechou a tela, perdeu tudo. O toggle
 * "Sincronizar Notas" também não fazia nada.
 *
 * Agora persiste em `@notion_config`, que é exatamente a chave que as tools
 * `notion_create_page` e `notion_search` leem.
 */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

const STORAGE_KEY = "@notion_config";
const NOTION_VERSION = "2022-06-28";

type NotionConfig = { token?: string; databaseId?: string };

export default function NotionScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [testing, setTesting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (!raw) return;
        try {
          const cfg: NotionConfig = JSON.parse(raw);
          setToken(cfg.token ?? "");
          setDatabaseId(cfg.databaseId ?? "");
        } catch {
          // config corrompida, começa do zero
        }
      });
    }, []),
  );

  const save = async () => {
    if (!token.trim()) {
      Alert.alert(t("common.error"), t("conn.notion.tokenRequired"));
      return;
    }

    const config: NotionConfig = {
      token: token.trim(),
      databaseId: databaseId.trim() || undefined,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    Alert.alert(t("common.success"), t("conn.notion.connectedBody"), [
      { text: t("common.ok"), onPress: () => router.back() },
    ]);
  };

  /** Testa antes de salvar — melhor errar aqui do que no meio de uma tarefa. */
  const test = async () => {
    if (!token.trim()) return;

    setTesting(true);
    try {
      const res = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Notion-Version": NOTION_VERSION,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert(t("conn.notion.failed"), data?.message ?? `HTTP ${res.status}`);
        return;
      }

      Alert.alert(
        t("conn.notion.connected"),
        t("conn.notion.connectedAs", {
          who: data?.bot?.owner?.workspace
            ? t("conn.notion.workspaceBot")
            : (data?.name ?? t("conn.notion.integration")),
        }),
      );
    } catch (err: any) {
      Alert.alert(t("conn.notion.failed"), err?.message ?? t("conn.notion.reachError"));
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setToken("");
    setDatabaseId("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("conn.notion.title")}</Text>
<Text style={styles.description}>{t("conn.notion.description")}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t("conn.notion.authentication")}</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("conn.notion.secretToken")}</Text>
              <TextInput
                style={styles.input}
                placeholder="ntn_… or secret_…"
                placeholderTextColor={Color.placeholder}
                value={token}
                onChangeText={setToken}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
<Text style={styles.sectionFooter}>{t("conn.notion.tokenHint")}</Text>

          <Text style={styles.sectionTitle}>{t("conn.notion.workspace")}</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("conn.notion.databaseId")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("common.optional")}
                placeholderTextColor={Color.placeholder}
                value={databaseId}
                onChangeText={setDatabaseId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
<Text style={styles.sectionFooter}>{t("conn.notion.databaseHint")}</Text>

          <TouchableOpacity
            style={[styles.button, !token.trim() && styles.buttonDisabled]}
            onPress={save}
            disabled={!token.trim()}
          >
            <Text style={styles.buttonText}>{t("common.save")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={test}
            disabled={!token.trim() || testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color={Color.accent} />
            ) : (
              <>
                <Feather name="zap" size={15} color={Color.accent} />
                <Text style={styles.secondaryText}>{t("conn.notion.testConnection")}</Text>
              </>
            )}
          </TouchableOpacity>

          {!!token && (
            <TouchableOpacity style={styles.dangerButton} onPress={disconnect}>
              <Text style={styles.dangerText}>{t("common.disconnect")}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  container: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
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
    marginLeft: 16,
    marginRight: 8,
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
    backgroundColor: Color.surface,
    minHeight: 44,
  },
  label: { fontSize: 17, color: Color.label },
  input: {
    flex: 1,
    fontSize: 17,
    color: Color.secondary,
    textAlign: "right",
    marginLeft: 16,
  },
  button: {
    backgroundColor: Color.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: Color.surface2 },
  buttonText: { color: Color.onAccent, fontSize: 17, fontWeight: "600" },
  secondaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  secondaryText: { color: Color.accent, fontSize: 16, fontWeight: "500" },
  dangerButton: { paddingVertical: 12, alignItems: "center", marginTop: 8 },
  dangerText: { color: Color.danger, fontSize: 16 },
});
