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

export default function TeamsScreen() {
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
      Alert.alert("Atenção", "Por favor, preencha todos os campos.");
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

      Alert.alert("Sucesso!", "Suas credenciais foram salvas no dispositivo.");
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      Alert.alert("Erro", "Não foi possível salvar as credenciais.");
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
          <Text style={styles.title}>Teams Integration</Text>
          <Text style={styles.description}>
            Insira as credenciais da sua aplicação registada no Microsoft Entra
            ID.
          </Text>
        </View>

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 Onde encontrar estas chaves?</Text>
          <Text style={styles.tipText}>
            Aceda ao{" "}
            <Text style={styles.linkText} onPress={openAzurePortal}>
              Portal do Azure (Registos de aplicações)
            </Text>
            . Crie uma nova aplicação para obter o{" "}
            <Text style={{ fontStyle: "italic" }}>Client ID</Text> e o{" "}
            <Text style={{ fontStyle: "italic" }}>Tenant ID</Text>. Depois, vá a
            "Certificados e segredos" para gerar o seu{" "}
            <Text style={{ fontStyle: "italic" }}>Client Secret</Text>.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Client ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 11111111-2222-3333-4444-555555555555"
            placeholderTextColor="#999"
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Tenant ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
            placeholderTextColor="#999"
            value={tenantId}
            onChangeText={setTenantId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Client Secret</Text>
          <TextInput
            style={styles.input}
            placeholder="Insira o segredo do cliente"
            placeholderTextColor="#999"
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
            <Text style={styles.buttonText}>Ligar ao Teams</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    letterSpacing: 0.35,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: "#8E8E93",
    lineHeight: 22,
  },
  tipContainer: {
    backgroundColor: "#E5F0FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#CCE0FF",
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#004080",
    marginBottom: 6,
  },
  tipText: { fontSize: 14, color: "#004080", lineHeight: 20 },
  linkText: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    color: "#0056b3",
  },
  form: { width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3A3A3C",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
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
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
});
