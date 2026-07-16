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
import { Ionicons } from "@expo/vector-icons";

import { STORAGE_KEYS } from "@/services/config";
import type { StoredConversation } from "@/agent/types";

/** Primeira resposta do agente na conversa, para o preview do card. */
function previewOf(conversation: StoredConversation): string {
  const reply = conversation.messages.find((m) => m.role !== "user");
  return reply?.text?.trim() || "No response yet";
}

export default function History() {
  const [history, setHistory] = useState<StoredConversation[]>([]);
  const router = useRouter();

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
              // Relê do storage em vez de confiar no estado da tela — assim o
              // que não está renderizado não some junto.
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
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>Nothing saved yet.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={<Text style={styles.title}>History</Text>}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F8",
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 32,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    // Shadows for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Shadows for Android
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: "400",
    color: "#1A1A1A",
  },
  cardDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 40,
    fontSize: 16,
  },
});
