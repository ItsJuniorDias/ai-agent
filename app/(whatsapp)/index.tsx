import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

const STORAGE_KEY = "@whatsapp_config";

export default function WhatsappScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Estado atualizado com os novos campos
  const [form, setForm] = useState({
    token: "",
    phoneId: "",
    recipientNumber: "",
  });

  // Carregar dados ao montar a tela
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        setForm(JSON.parse(savedData));
      }
    } catch (e) {
      Alert.alert(t("common.error"), t("common.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      Alert.alert(t("common.success"), t("common.savedOnDevice"));
    } catch (e) {
      Alert.alert(t("common.error"), t("common.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={Color.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("conn.whatsapp.title")}</Text>
<Text style={styles.subtitle}>{t("conn.whatsapp.subtitle")}</Text>
          </View>

          <View style={styles.group}>
            {/* Campo: Token */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("conn.whatsapp.token")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("conn.whatsapp.tokenPlaceholder")}
                placeholderTextColor={Color.placeholder}
                secureTextEntry // Esconde o token por segurança
                autoCapitalize="none"
                value={form.token}
                onChangeText={(val) => setForm({ ...form, token: val })}
              />
            </View>

            <View style={styles.divider} />

            {/* Campo: Phone Number ID */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("conn.whatsapp.phoneId")}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 1045678901234"
                placeholderTextColor={Color.placeholder}
                keyboardType="numeric" // Teclado numérico
                value={form.phoneId}
                onChangeText={(val) => setForm({ ...form, phoneId: val })}
              />
            </View>

            <View style={styles.divider} />

            {/* Campo: Recipient Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("conn.whatsapp.recipient")}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 5511999999999"
                placeholderTextColor={Color.placeholder}
                keyboardType="phone-pad" // Teclado otimizado para telefone
                value={form.recipientNumber}
                onChangeText={(val) =>
                  setForm({ ...form, recipientNumber: val })
                }
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t("common.save")}</Text>
            )}
          </TouchableOpacity>

<Text style={styles.footerText}>{t("conn.whatsapp.footerHint")}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.bg, // Cor de fundo padrão iOS
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    padding: 20,
    flex: 1,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: Color.label,
    letterSpacing: 0.37,
  },
  subtitle: {
    fontSize: 15,
    color: Color.secondary,
    marginTop: 5,
  },
  group: {
    backgroundColor: Color.surface,
    borderRadius: 12,
    overflow: "hidden", // Garante que o divider não vaze
    marginBottom: 25,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Color.secondary,
    marginBottom: 4,
  },
  input: {
    fontSize: 17,
    color: Color.label,
    paddingVertical: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Color.hairline,
    marginLeft: 16,
  },
  button: {
    backgroundColor: Color.accent, // Azul Apple
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: Color.onAccent,
    fontSize: 17,
    fontWeight: "600",
  },
  footerText: {
    textAlign: "center",
    color: Color.secondary,
    fontSize: 13,
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
