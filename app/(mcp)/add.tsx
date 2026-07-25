/**
 * Adicionar servidor MCP.
 *
 * Duas rotas paralelas na mesma tela:
 *
 *  1. Catálogo de servidores populares — usuário toca num card, a gente
 *     pré-preenche nome, URL e mostra a dica de token. Ele cola o token.
 *  2. "Custom MCP server" — usuário digita URL e nome livres. Serve pra
 *     servidor próprio ou servidor não catalogado.
 *
 * Ao salvar, tenta o handshake (`initialize` + `tools/list`). Falhou?
 * Mostra o erro e não salva — não faz sentido persistir servidor que a gente
 * sabe que não responde. Passou? Grava e volta pra lista.
 */

import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Color, Radius } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { POPULAR_MCP_SERVERS, type PopularServer } from "@/services/mcp/popular";
import { initialize, listTools, MCPError } from "@/services/mcp/client";
import {
  generateServerId,
  saveMCPServer,
} from "@/services/mcp/storage";

type Mode = "browse" | "form";

export default function MCPAddScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("browse");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [selectedPopular, setSelectedPopular] = useState<PopularServer | null>(null);
  const [tokenHint, setTokenHint] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const pickPopular = (server: PopularServer) => {
    setSelectedPopular(server);
    setName(server.name);
    setUrl(server.url);
    setTokenHint(server.tokenHint);
    setMode("form");
  };

  const pickCustom = () => {
    setSelectedPopular(null);
    setName("");
    setUrl("");
    setTokenHint(null);
    setMode("form");
  };

  const testAndSave = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    const trimmedToken = token.trim();

    if (!trimmedName || !trimmedUrl) {
      Alert.alert(t("common.requiredTitle"), t("mcp.errNameOrUrl"));
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      Alert.alert(t("common.error"), t("mcp.errInvalidUrl"));
      return;
    }

    setTesting(true);
    try {
      const info = await initialize(trimmedUrl, trimmedToken || undefined);
      const tools = await listTools(trimmedUrl, trimmedToken || undefined);

      const id = selectedPopular?.id ?? (await generateServerId(trimmedName));
      await saveMCPServer({
        id,
        name: info.serverName ?? trimmedName,
        url: trimmedUrl,
        bearerToken: trimmedToken || undefined,
        lastConnectedAt: new Date().toISOString(),
        toolsCache: tools,
      });

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        t("mcp.connectedTitle"),
        t(tools.length === 1 ? "mcp.connectedToolOne" : "mcp.connectedToolOther", {
          count: tools.length,
        }),
        [{ text: t("common.ok"), onPress: () => router.back() }],
      );
    } catch (err) {
      const msg =
        err instanceof MCPError
          ? `${err.kind}: ${err.message}`
          : (err as Error).message;
      Alert.alert(t("mcp.errConnectTitle"), msg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={26} color={Color.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {mode === "browse" ? (
            <>
              <Text style={styles.title}>{t("mcp.addTitle")}</Text>
              <Text style={styles.subtitle}>{t("mcp.addSubtitle")}</Text>

              <Text style={styles.sectionLabel}>{t("mcp.popular")}</Text>
              <View style={styles.group}>
                {POPULAR_MCP_SERVERS.map((s, i) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.row,
                      i === POPULAR_MCP_SERVERS.length - 1 && styles.noBorder,
                    ]}
                    onPress={() => pickPopular(s)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.serverIcon}>
                        <Feather name={s.icon} size={16} color={Color.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{s.name}</Text>
                        <Text style={styles.rowSub} numberOfLines={2}>
                          {s.description}
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={Color.tertiary} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.customBtn} onPress={pickCustom}>
                <Feather name="link" size={18} color={Color.accent} />
                <Text style={styles.customBtnText}>{t("mcp.addCustom")}</Text>
              </TouchableOpacity>

              <Text style={styles.footer}>{t("mcp.addFooter")}</Text>
            </>
          ) : (
            <>
              <View style={styles.formHeader}>
                <TouchableOpacity onPress={() => setMode("browse")}>
                  <Ionicons name="chevron-back" size={22} color={Color.accent} />
                </TouchableOpacity>
                <Text style={styles.formTitle}>
                  {selectedPopular ? selectedPopular.name : t("mcp.customFormTitle")}
                </Text>
                <View style={{ width: 22 }} />
              </View>

              <Text style={styles.sectionLabel}>{t("mcp.serverDetails")}</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("mcp.serverName")}
                    placeholderTextColor={Color.placeholder}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("mcp.serverUrl")}
                    placeholderTextColor={Color.placeholder}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    editable={!selectedPopular}
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>{t("mcp.auth")}</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("mcp.bearerOptional")}
                    placeholderTextColor={Color.placeholder}
                    value={token}
                    onChangeText={setToken}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
              {tokenHint && <Text style={styles.hint}>{tokenHint}</Text>}
              {selectedPopular?.docsUrl && (
                <Text style={styles.hint}>{selectedPopular.docsUrl}</Text>
              )}

              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={[styles.primaryButton, testing && styles.buttonDisabled]}
                  onPress={testAndSave}
                  disabled={testing}
                >
                  {testing ? (
                    <ActivityIndicator color={Color.onAccent} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t("mcp.testAndConnect")}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.footer}>{t("mcp.testFooter")}</Text>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topBarBtn: { padding: 8, minWidth: 44 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "700", color: Color.label, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Color.secondary, marginTop: 6, lineHeight: 21 },
  sectionLabel: {
    fontSize: 13,
    color: Color.secondary,
    marginLeft: 16,
    marginTop: 28,
    marginBottom: 8,
  },
  group: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.hairline,
  },
  noBorder: { borderBottomWidth: 0 },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  serverIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Color.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "500", color: Color.label },
  rowSub: { fontSize: 13, color: Color.secondary, marginTop: 2 },
  customBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    borderRadius: Radius.lg,
    marginTop: 12,
  },
  customBtnText: { color: Color.accent, fontSize: 15, fontWeight: "600" },
  footer: {
    fontSize: 12,
    color: Color.tertiary,
    marginTop: 16,
    lineHeight: 18,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  formTitle: { fontSize: 20, fontWeight: "700", color: Color.label },
  inputGroup: {
    backgroundColor: Color.surface,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  inputWrapper: { paddingHorizontal: 16, height: 50, justifyContent: "center" },
  input: { fontSize: 17, color: Color.label },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Color.hairline,
    marginLeft: 16,
  },
  hint: { fontSize: 13, color: Color.secondary, marginTop: 8, marginLeft: 16, lineHeight: 18 },
  actionContainer: { gap: 12, marginTop: 32 },
  primaryButton: {
    backgroundColor: Color.accent,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { color: Color.onAccent, fontSize: 17, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  secondaryButton: { height: 52, justifyContent: "center", alignItems: "center" },
  secondaryButtonText: { color: Color.accent, fontSize: 17, fontWeight: "400" },
});
