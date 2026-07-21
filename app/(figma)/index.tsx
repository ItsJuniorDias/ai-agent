import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

export default function FigmaScreen() {
  const { t } = useTranslation();
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [fileKey, setFileKey] = useState("");

  // Carrega os dados salvos quando a tela é montada
  useEffect(() => {
    const loadFigmaData = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("@figma_token");
        const savedFileKey = await AsyncStorage.getItem("@figma_file_key");

        if (savedToken) setPersonalAccessToken(savedToken);
        if (savedFileKey) setFileKey(savedFileKey);
      } catch (error) {
        console.error("Erro ao carregar dados do AsyncStorage:", error);
      }
    };

    loadFigmaData();
  }, []);

  const handleConnect = async () => {
    if (!personalAccessToken || !fileKey) {
      Alert.alert(t("common.error"), t("conn.figma.fillAll"));
      return;
    }

    try {
      // Salva os dados localmente no dispositivo
      await AsyncStorage.setItem("@figma_token", personalAccessToken);
      await AsyncStorage.setItem("@figma_file_key", fileKey);

      // Lógica de integração com a API do Figma entraria aqui
      Alert.alert(
        t("conn.figma.connecting"),
        t("conn.figma.connectingBody"),
      );
    } catch (error) {
      Alert.alert(t("common.error"), t("conn.figma.saveError"));
      console.error("Erro ao salvar no AsyncStorage:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t("conn.figma.title")}</Text>
<Text style={styles.description}>{t("conn.figma.description")}</Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>{t("conn.figma.token")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("conn.figma.tokenPlaceholder")}
              placeholderTextColor={Color.placeholder}
              value={personalAccessToken}
              onChangeText={setPersonalAccessToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <Text style={styles.label}>{t("conn.figma.fileKey")}</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: jF98xV..."
              placeholderTextColor={Color.placeholder}
              value={fileKey}
              onChangeText={setFileKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

<Text style={styles.footerText}>{t("conn.figma.footerHint")}</Text>

        <TouchableOpacity style={styles.button} onPress={handleConnect}>
          <Text style={styles.buttonText}>{t("conn.figma.connectToFigma")}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Color.bg,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: Color.label,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Color.secondary,
    lineHeight: 22,
  },
  formGroup: {
    backgroundColor: Color.surface,
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: {
    width: 80,
    fontSize: 16,
    color: Color.label,
    fontWeight: "400",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Color.label,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Color.hairline,
    marginLeft: 16,
  },
  footerText: {
    fontSize: 13,
    color: Color.secondary,
    marginTop: 8,
    marginHorizontal: 32,
    textAlign: "center",
  },
  button: {
    backgroundColor: Color.accent,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Color.onAccent,
    fontSize: 17,
    fontWeight: "600",
  },
});
