/**
 * Configuração do Linear.
 *
 * Mesmo problema da tela do Notion: guardava a API key em `useState`, mostrava
 * "saved successfully" e não escrevia nada. Agora persiste em `@linear_config`.
 *
 * O "Team ID" também era pedido como "Ex: ENG" — mas a API do Linear espera um
 * UUID, não a sigla do time. Este botão resolve isso: busca os times pela API e
 * deixa você escolher, em vez de você ter que caçar o UUID na URL.
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

const STORAGE_KEY = "@linear_config";
const LINEAR_API = "https://api.linear.app/graphql";

type LinearConfig = { apiKey?: string; teamId?: string };
type Team = { id: string; key: string; name: string };

export default function LinearScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [apiKey, setApiKey] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (!raw) return;
        try {
          const cfg: LinearConfig = JSON.parse(raw);
          setApiKey(cfg.apiKey ?? "");
          setTeamId(cfg.teamId ?? "");
        } catch {
          // config corrompida
        }
      });
    }, []),
  );

  /** Busca os times reais — assim ninguém precisa adivinhar o UUID. */
  const fetchTeams = async () => {
    if (!apiKey.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(LINEAR_API, {
        method: "POST",
        headers: {
          // A key do Linear vai crua no Authorization, sem "Bearer".
          Authorization: apiKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{ teams(first: 50) { nodes { id key name } } }`,
        }),
      });

      const data = await res.json();

      if (data.errors?.length) {
        Alert.alert(t("conn.linear.failed"), data.errors[0].message);
        return;
      }

      const nodes: Team[] = data?.data?.teams?.nodes ?? [];
      setTeams(nodes);

      if (!nodes.length) {
        Alert.alert(t("conn.linear.noTeams"), t("conn.linear.noTeamsBody"));
      } else if (!teamId) {
        setTeamId(nodes[0].id);
      }
    } catch (err: any) {
      Alert.alert(t("conn.linear.failed"), err?.message ?? t("conn.linear.reachError"));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!apiKey.trim()) {
      Alert.alert(t("common.error"), t("conn.linear.apiKeyRequired"));
      return;
    }

    const config: LinearConfig = {
      apiKey: apiKey.trim(),
      teamId: teamId.trim() || undefined,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    Alert.alert(t("common.success"), t("conn.linear.connectedBody"), [
      { text: t("common.ok"), onPress: () => router.back() },
    ]);
  };

  const disconnect = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setTeamId("");
    setTeams([]);
  };

  const selectedTeam = teams.find((t) => t.id === teamId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("conn.linear.title")}</Text>
<Text style={styles.description}>{t("conn.linear.description")}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t("conn.linear.authentication")}</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("conn.linear.apiKey")}</Text>
              <TextInput
                style={styles.input}
                placeholder="lin_api_…"
                placeholderTextColor={Color.placeholder}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
<Text style={styles.sectionFooter}>{t("conn.linear.apiKeyHint")}</Text>

          <Text style={styles.sectionTitle}>{t("conn.linear.team")}</Text>
          <View style={styles.section}>
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.row,
                    index < teams.length - 1 && styles.borderBottom,
                  ]}
                  onPress={() => setTeamId(team.id)}
                  activeOpacity={0.6}
                >
                  <View>
                    <Text style={styles.label}>{team.name}</Text>
                    <Text style={styles.sublabel}>{team.key}</Text>
                  </View>
                  {teamId === team.id && (
                    <Feather name="check" size={19} color={Color.accent} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.row}>
                <Text style={styles.label}>{t("conn.linear.teamId")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("conn.linear.loadTeamsPlaceholder")}
                  placeholderTextColor={Color.placeholder}
                  value={teamId}
                  onChangeText={setTeamId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
          </View>
          <Text style={styles.sectionFooter}>
            {t("conn.linear.teamHint")}
            {selectedTeam
              ? t("conn.linear.selected", { name: selectedTeam.name })
              : ""}
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={fetchTeams}
            disabled={!apiKey.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Color.accent} />
            ) : (
              <>
                <Feather name="download-cloud" size={15} color={Color.accent} />
                <Text style={styles.secondaryText}>{t("conn.linear.loadTeams")}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !apiKey.trim() && styles.buttonDisabled]}
            onPress={save}
            disabled={!apiKey.trim()}
          >
            <Text style={styles.buttonText}>{t("common.save")}</Text>
          </TouchableOpacity>

          {!!apiKey && (
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
  section: { backgroundColor: Color.surface, borderRadius: 10, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Color.surface,
    minHeight: 44,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  label: { fontSize: 17, color: Color.label },
  sublabel: { fontSize: 13, color: Color.secondary, marginTop: 1 },
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
  },
  secondaryText: { color: Color.accent, fontSize: 16, fontWeight: "500" },
  dangerButton: { paddingVertical: 12, alignItems: "center", marginTop: 8 },
  dangerText: { color: Color.danger, fontSize: 16 },
});
