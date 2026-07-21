import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  Alert, // <-- Importado para dar feedback de sucesso/erro
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Importação do AsyncStorage
import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

export default function TeamsScreen() {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  // Carrega as credenciais salvas assim que a tela abre
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedConfig = await AsyncStorage.getItem("@teams_config");
        if (savedConfig) {
          const { clientId, tenantId, clientSecret } = JSON.parse(savedConfig);
          setClientId(clientId || "");
          setTenantId(tenantId || "");
          setClientSecret(clientSecret || "");
        }
      } catch (error) {
        console.error("Erro ao carregar credenciais:", error);
      }
    };

    loadCredentials();
  }, []);

  // Função para salvar as credenciais
  const handleSaveCredentials = async () => {
    // Validação simples para não salvar vazio
    if (!clientId || !tenantId || !clientSecret) {
      Alert.alert(t("common.attention"), t("conn.teams.fillAll"));
      return;
    }

    try {
      // Monta o objeto com as chaves
      const teamsConfig = {
        clientId,
        tenantId,
        clientSecret,
      };

      // Salva no AsyncStorage transformando o objeto em string
      await AsyncStorage.setItem("@teams_config", JSON.stringify(teamsConfig));

      Alert.alert(t("common.success"), t("conn.teams.savedBody"));
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      Alert.alert(t("common.error"), t("common.saveError"));
    }
  };

  const openAzurePortal = async () => {
    const url =
      "https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps";

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log("Não foi possível abrir o link: ", url);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("conn.teams.title")}</Text>
<Text style={styles.description}>{t("conn.teams.description")}</Text>
        </View>

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>{t("conn.teams.tipTitle")}</Text>
          <Text style={styles.tipText}>
            {t("conn.teams.tipBefore")}
            <Text style={styles.linkText} onPress={openAzurePortal}>
              {t("conn.teams.tipLink")}
            </Text>
            {t("conn.teams.tipAfter")}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t("conn.teams.clientId")}</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 11111111-2222-3333-4444-555555555555"
            placeholderTextColor={Color.placeholder}
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t("conn.teams.tenantId")}</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
            placeholderTextColor={Color.placeholder}
            value={tenantId}
            onChangeText={setTenantId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t("conn.teams.clientSecret")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("conn.teams.clientSecretPlaceholder")}
            placeholderTextColor={Color.placeholder}
            value={clientSecret}
            onChangeText={setClientSecret}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={true}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveCredentials}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t("conn.teams.connectToTeams")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.bg },
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: Color.label,
    marginBottom: 8,
    letterSpacing: 0.35,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: Color.secondary,
    lineHeight: 22,
  },
  tipContainer: {
    backgroundColor: Color.accentSoft,
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Color.hairline,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Color.secondary,
    marginBottom: 6,
  },
  tipText: { fontSize: 14, color: Color.secondary, lineHeight: 20 },
  linkText: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    color: Color.accent,
  },
  form: { width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Color.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Color.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Color.label,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    backgroundColor: "#5B5FC7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: Color.onAccent, fontSize: 17, fontWeight: "600" },
});
