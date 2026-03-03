import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Settings() {
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);

  // Lista de Modelos Gemini com Metadados para a UI
  const models = [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      desc: "Rápido e eficiente",
      color: "#4285F4",
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash (Preview)",
      desc: "O mais rápido, para testes",
      color: "#F59E0B",
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      desc: "Melhor para documentos longos",
      color: "#10B981",
    },
    {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro (Preview)",
      desc: "O mais avançado, para tarefas complexas",
      color: "#8B5CF6",
    },
    {
      id: "veo-3.0-fast-generate-001",
      name: "Veo 3.0 Fast Generate",
      desc: "Especializado em geração de imagens",
      color: "#EC4899",
    },
  ];

  return (
    <ScrollView style={styles.container} bounces={true}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      {/* SEÇÃO: MODELO DE IA */}
      <Text style={styles.sectionTitle}>MODELO DE INTELIGÊNCIA</Text>
      <View style={styles.group}>
        {models.map((model, index) => (
          <TouchableOpacity
            key={model.id}
            style={[styles.row, index === models.length - 1 && styles.noBorder]}
            onPress={() => setSelectedModel(model.id)}
            activeOpacity={0.6}
          >
            <View style={styles.rowLeft}>
              <View
                style={[styles.iconContainer, { backgroundColor: model.color }]}
              >
                <Ionicons name="sparkles" size={16} color="white" />
              </View>
              <View>
                <Text style={styles.rowText}>{model.name}</Text>
                <Text style={styles.rowSubtext}>{model.desc}</Text>
              </View>
            </View>
            {selectedModel === model.id && (
              <Ionicons name="checkmark" size={22} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* SEÇÃO: EXPERIÊNCIA */}
      <Text style={styles.sectionTitle}>EXPERIÊNCIA</Text>
      <View style={styles.group}>
        <View style={[styles.row, styles.noBorder]}>
          <View style={styles.rowLeft}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#5856D6" }]}
            >
              <Ionicons name="finger-print" size={18} color="white" />
            </View>
            <Text style={styles.rowText}>Haptic Feedback</Text>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#34C759" }}
            ios_backgroundColor="#E9E9EA"
            onValueChange={setIsHapticEnabled}
            value={isHapticEnabled}
          />
        </View>
      </View>

      <Text style={styles.footerText}>
        Os modelos Flash são otimizados para velocidade, enquanto os modelos Pro
        lidam melhor com tarefas complexas e documentos longos.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Fundo cinza claro padrão iOS
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#6E6E73",
    marginLeft: 36,
    marginBottom: 8,
    marginTop: 24,
    fontWeight: "400",
  },
  group: {
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowText: {
    fontSize: 17,
    letterSpacing: -0.4,
    fontWeight: "400",
  },
  rowSubtext: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 1,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  footerText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 12,
    paddingHorizontal: 36,
    lineHeight: 18,
  },
});
