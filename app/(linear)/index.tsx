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

const STORAGE_KEY = "@linear_config";
const LINEAR_API = "https://api.linear.app/graphql";

type LinearConfig = { apiKey?: string; teamId?: string };
type Team = { id: string; key: string; name: string };

export default function LinearScreen() {
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
        Alert.alert("Failed", data.errors[0].message);
        return;
      }

      const nodes: Team[] = data?.data?.teams?.nodes ?? [];
      setTeams(nodes);

      if (!nodes.length) {
        Alert.alert("No teams", "This key has no teams attached to it.");
      } else if (!teamId) {
        setTeamId(nodes[0].id);
      }
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Could not reach Linear.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "The API Key is required.");
      return;
    }

    const config: LinearConfig = {
      apiKey: apiKey.trim(),
      teamId: teamId.trim() || undefined,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    Alert.alert("Saved", "Linear is connected. The agent can use it now.", [
      { text: "OK", onPress: () => router.back() },
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
            <Text style={styles.title}>Linear</Text>
            <Text style={styles.description}>
              Let the agent list and create issues in your workspace.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Authentication</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>API Key</Text>
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
          <Text style={styles.sectionFooter}>
            Linear → Settings → Security & access → Personal API keys.
          </Text>

          <Text style={styles.sectionTitle}>Team</Text>
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
                <Text style={styles.label}>Team ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Load teams below"
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
            Linear identifies teams by UUID, not by the key you see in the UI
            (“ENG”). Load them from your account instead of typing it.
            {selectedTeam ? `\n\nSelected: ${selectedTeam.name}.` : ""}
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
                <Text style={styles.secondaryText}>Load my teams</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !apiKey.trim() && styles.buttonDisabled]}
            onPress={save}
            disabled={!apiKey.trim()}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>

          {!!apiKey && (
            <TouchableOpacity style={styles.dangerButton} onPress={disconnect}>
              <Text style={styles.dangerText}>Disconnect</Text>
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
