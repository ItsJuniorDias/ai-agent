import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Color } from "@/constants/theme";
import { useTranslation } from "@/i18n";

export default function AIPrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho */}
        <View style={styles.headerContainer}>
          <Ionicons
            name="shield-checkmark"
            size={60}
            color={Color.accent}
            style={styles.headerIcon}
          />
          <Text style={styles.title}>{t("aiTerms.title")}</Text>
          <Text style={styles.subtitle}>{t("aiTerms.subtitle")}</Text>
        </View>

        {/* Requisito 1: Disclose what data will be sent */}
        <View style={styles.infoBlock}>
          <Ionicons name="document-text" size={36} color={Color.accent} />
          <View style={styles.textContainer}>
            <Text style={styles.infoTitle}>{t("aiTerms.whatTitle")}</Text>
            <Text style={styles.infoDescription}>{t("aiTerms.whatBody")}</Text>
          </View>
        </View>

        {/* Requisito 2: Specify who the data is sent to */}
        <View style={styles.infoBlock}>
          <Ionicons name="cloud-upload" size={36} color={Color.accent} />
          <View style={styles.textContainer}>
            <Text style={styles.infoTitle}>{t("aiTerms.whoTitle")}</Text>
            <Text style={styles.infoDescription}>{t("aiTerms.whoBody")}</Text>
          </View>
        </View>

        {/* Requisito 3 e 4: Como é usado e segurança */}
        <View style={styles.infoBlock}>
          <Ionicons name="lock-closed" size={36} color={Color.accent} />
          <View style={styles.textContainer}>
            <Text style={styles.infoTitle}>{t("aiTerms.useTitle")}</Text>
            <Text style={styles.infoDescription}>{t("aiTerms.useBody")}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Requisito: Obtain the user's permission */}
      <View style={styles.footer}>
        <Text style={styles.footerDisclaimer}>
          {t("aiTerms.disclaimer")}
          <Text style={styles.linkText}>{t("aiTerms.privacyPolicy")}</Text>.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(onboarding)")}
        >
          <Text style={styles.primaryButtonText}>{t("aiTerms.agree")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Alert.alert(t("aiTerms.exitTitle"), t("aiTerms.exitBody"), [
              { text: t("common.ok") },
            ]);
          }}
        >
          <Text style={styles.secondaryButtonText}>{t("aiTerms.doNotShare")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.surface,
    paddingTop: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  headerIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: Color.label,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: Color.secondary,
    lineHeight: 22,
  },
  infoBlock: {
    flexDirection: "row",
    marginBottom: 32,
    alignItems: "flex-start",
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Color.label,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 15,
    color: Color.secondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 10 : 24,
    paddingTop: 16,
    backgroundColor: Color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
  },
  footerDisclaimer: {
    fontSize: 12,
    color: Color.secondary,
    textAlign: "center",
    marginBottom: 16,
  },
  linkText: {
    color: Color.accent,
  },
  primaryButton: {
    backgroundColor: Color.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Color.onAccent,
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Color.accent,
    fontSize: 17,
    fontWeight: "400",
  },
});
