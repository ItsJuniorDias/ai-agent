/**
 * Conversas salvas.
 *
 * Correções em relação à versão anterior:
 *
 *  1. Perda de dados no delete. O estado guardava só `parsedHistory.slice(0, 10)`
 *     e o `handleDelete` filtrava esse recorte e gravava o resultado por cima do
 *     `@chat_history` inteiro. Ou seja: apagar uma conversa apagava junto tudo
 *     da 11ª em diante, sem aviso. Agora o delete relê a lista completa do
 *     storage, tira só o id pedido e devolve o resto.
 *  2. O `.slice(0, 10)` também escondia as conversas mais antigas sem nenhuma
 *     forma de chegar nelas. A FlatList é virtualizada, então renderizar tudo
 *     não custa nada.
 *  3. `router.push` mandava `params: { screen: "index", ... }`. Esse `screen` é
 *     sintaxe de navegação aninhada do React Navigation e o expo-router ignora.
 *     Só o `conversationId` importa — é o que a tela de chat lê.
 *  4. Estado tipado. `useState([])` virava `never[]` e todo acesso a `item.id`
 *     era erro de tipo silenciado pelo `any` implícito.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";

import { STORAGE_KEYS } from "@/services/config";
import { Color, Radius, Shadow, Spacing, Type } from "@/constants/theme";
import type { StoredConversation } from "@/agent/types";

/** Primeira resposta do agente na conversa, para o preview do card. */
function previewOf(conversation: StoredConversation): string {
  const reply = conversation.messages.find((m) => m.role !== "user");
  return reply?.text?.trim() || "No response yet";
}

export default function History() {
  const [history, setHistory] = useState<StoredConversation[]>([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const loadHistory = async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.chatHistory);
          setHistory(stored ? JSON.parse(stored) : []);
        } catch (err) {
          console.log("Error loading history:", err);
          setHistory([]);
        }
      };

      loadHistory();
    }, []),
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete conversation",
      "Are you sure you want to delete this conversation from your history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem(
                STORAGE_KEYS.chatHistory,
              );
              const all: StoredConversation[] = stored ? JSON.parse(stored) : [];
              const updated = all.filter((item) => item.id !== id);

              await AsyncStorage.setItem(
                STORAGE_KEYS.chatHistory,
                JSON.stringify(updated),
              );
              setHistory(updated);
            } catch (err) {
              console.log("Error deleting history:", err);
              Alert.alert("Error", "Could not delete the conversation.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: StoredConversation }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(tabs)",
          params: { conversationId: item.id },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {previewOf(item)}
          </Text>

          <Text style={styles.cardDate}>{item.date}</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={Color.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="clock" size={24} color={Color.secondary} />
          </View>
          <Text style={styles.emptyText}>Nothing saved yet.</Text>
          <Text style={styles.emptySub}>
            Conversations you have with the agent show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.kicker}>ARCHIVE</Text>
              <Text style={styles.title}>History</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.bg },
  listHeader: { marginBottom: Spacing.xxl },
  kicker: {
    ...Type.caption2,
    color: Color.accent,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: { ...Type.largeTitle, color: Color.label },
  listContainer: { paddingHorizontal: Spacing.xl, paddingBottom: 96 },
  card: {
    backgroundColor: Color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  headerTextContainer: { flex: 1, gap: 4 },
  cardTitle: { ...Type.headline, color: Color.label },
  cardDescription: { ...Type.callout, color: Color.secondary, lineHeight: 21 },
  cardDate: { ...Type.caption, color: Color.tertiary, marginTop: 6 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Color.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyText: { ...Type.title3, color: Color.label },
  emptySub: { ...Type.subhead, color: Color.secondary, textAlign: "center", lineHeight: 21 },
});
