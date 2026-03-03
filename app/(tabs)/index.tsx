// 1. INJEÇÃO DOS POLYFILLS (Deve ficar no topo absoluto do arquivo)
import "react-native-url-polyfill/auto";
import { TextEncoder, TextDecoder } from "text-encoding";
import { ReadableStream, TransformStream } from "web-streams-polyfill";

// 2. IMPORTS NORMAIS
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

// Adicionando os objetos globais que a SDK do Gemini espera encontrar
Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
});

type ChatMessage = { role: "user" | "model"; text: string };
type GeminiHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

function createModelOrNull() {
  if (!API_KEY) return null;

  const genAI = new GoogleGenerativeAI(API_KEY);

  return genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    systemInstruction:
      "You are a sarcastic but very helpful virtual assistant focused on helping developers debug code. Keep your answers short and direct.",
  });
}

export default function App() {
  const { conversationId: paramConversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [conversationId, setConversationId] = useState(
    paramConversationId || Date.now().toString(),
  );

  const model = useRef<ReturnType<typeof createModelOrNull> | null>(null);
  const chatRef = useRef<ChatSession | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    model.current = createModelOrNull();

    if (!model.current) {
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your environment to use the assistant.",
      );
      return;
    }

    const initializeChat = async () => {
      const nextConversationId = paramConversationId || Date.now().toString();
      setConversationId(nextConversationId);

      let initialMessages: ChatMessage[] = [];
      let history: GeminiHistoryItem[] = [];

      if (paramConversationId) {
        try {
          const storedHistory = await AsyncStorage.getItem("@chat_history");
          const historyArray: {
            id: string;
            messages?: ChatMessage[];
          }[] = storedHistory ? JSON.parse(storedHistory) : [];

          const currentChat = historyArray.find(
            (item) => item.id === paramConversationId,
          );

          if (currentChat?.messages?.length) {
            initialMessages = currentChat.messages;

            history = currentChat.messages.map((msg) => ({
              role: msg.role,
              parts: [{ text: msg.text }],
            }));
          }
        } catch (e) {
          console.error("Failed to load history:", e);
        }
      }

      setMessages(initialMessages);
      chatRef.current = model.current!.startChat({ history });
    };

    initializeChat();
  }, [paramConversationId]);

  const saveConversation = async (updatedMessages: ChatMessage[]) => {
    if (updatedMessages.length === 0) return;

    try {
      const storedHistory = await AsyncStorage.getItem("@chat_history");
      let historyArray: {
        id: string;
        title: string;
        date: string;
        messages: ChatMessage[];
      }[] = storedHistory ? JSON.parse(storedHistory) : [];

      const existingIndex = historyArray.findIndex(
        (item) => item.id === conversationId,
      );

      const firstUserMsg =
        updatedMessages.find((m) => m.role === "user")?.text || "New Chat";
      const title =
        firstUserMsg.length > 30
          ? firstUserMsg.substring(0, 30) + "..."
          : firstUserMsg;

      const conversationData = {
        id: conversationId,
        title,
        date: new Date().toLocaleDateString("en-US"),
        messages: updatedMessages,
      };

      if (existingIndex >= 0) historyArray[existingIndex] = conversationData;
      else historyArray.unshift(conversationData);

      await AsyncStorage.setItem("@chat_history", JSON.stringify(historyArray));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  const clearChat = () => {
    Alert.alert(
      "Clear Conversation",
      "Are you sure you want to delete all messages?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }

            setMessages([]);
            if (model.current) {
              chatRef.current = model.current.startChat({ history: [] });
            }

            try {
              const storedHistory = await AsyncStorage.getItem("@chat_history");
              if (storedHistory) {
                const historyArray = JSON.parse(storedHistory).filter(
                  (item: any) => item.id !== conversationId,
                );
                await AsyncStorage.setItem(
                  "@chat_history",
                  JSON.stringify(historyArray),
                );
              }
            } catch (e) {
              console.error("Failed to clear history:", e);
            }
          },
        },
      ],
    );
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const sendMessage = async () => {
    if (!prompt.trim()) return;

    if (!chatRef.current) {
      Alert.alert("Chat not ready", "Try again in a second.");
      return;
    }

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const currentPrompt = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    // Adiciona a mensagem do usuário e um placeholder pro modelo (que vai exibir o loading se quiser)
    setMessages((prev) => [
      ...prev,
      { role: "user", text: currentPrompt },
      { role: "model", text: "..." }, // Mostrando que está pensando
    ]);

    try {
      // Usando sendMessage em vez de sendMessageStream
      const result = await chatRef.current.sendMessage(currentPrompt);
      const fullText = result.response.text();

      setIsLoading(false);

      let finalMessages: ChatMessage[] = [];
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        // Substitui o "..." pela resposta final
        if (lastIdx >= 0 && updated[lastIdx].role === "model") {
          updated[lastIdx] = { role: "model", text: fullText };
        }
        finalMessages = updated;
        return updated;
      });

      saveConversation(finalMessages);
    } catch (error) {
      console.error(error);

      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const errorMsg =
          "Error: Unable to reach the assistant. (Check your API key / network.)";

        if (lastIdx >= 0 && updated[lastIdx].role === "model") {
          updated[lastIdx] = { role: "model", text: errorMsg };
        } else {
          updated.push({ role: "model", text: errorMsg });
        }
        return updated;
      });

      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.largeTitle}>Chat</Text>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatBox}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
        >
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <TouchableOpacity
                key={`${msg.role}-${index}`}
                activeOpacity={0.9}
                onLongPress={() => copyToClipboard(msg.text)}
                style={[
                  styles.bubble,
                  msg.role === "user" ? styles.userBubble : styles.modelBubble,
                ]}
              >
                {msg.role === "user" ? (
                  <Text style={styles.userText}>{msg.text}</Text>
                ) : (
                  <Markdown style={markdownStyles}>{msg.text}</Markdown>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.hintText}>How can I help you today?</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#A9A9AC"
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />
            {isLoading ? (
              <ActivityIndicator
                style={styles.loader}
                size="small"
                color="#007AFF"
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !prompt.trim() && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={!prompt.trim()}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.5,
  },
  clearButtonText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "400",
    marginBottom: 6,
  },
  chatBox: {
    flex: 1,
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#C6C6C8",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "60%",
  },
  hintText: { fontSize: 17, color: "#8E8E93", textAlign: "center" },

  bubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  modelBubble: {
    backgroundColor: "#E9E9EB",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  userText: { fontSize: 17, color: "#FFFFFF", lineHeight: 22 },

  inputArea: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 15,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#C6C6C8",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 17,
    color: "#000000",
    minHeight: 40,
    maxHeight: 150,
  },
  loader: { marginHorizontal: 12, marginBottom: 8 },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#E9E9EB" },
  sendIcon: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 17,
    color: "#000000",
    lineHeight: 22,
  },
  code_inline: {
    backgroundColor: "rgba(0,0,0,0.05)",
    color: "#D70015",
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  code_block: {
    backgroundColor: "#000000",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: "#1C1C1E",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
  },
});
