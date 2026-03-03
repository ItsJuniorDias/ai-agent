// 1. INJEÇÃO DOS POLYFILLS (Deve ficar no topo absoluto do arquivo)
import "react-native-url-polyfill/auto";
import { TextEncoder, TextDecoder } from "text-encoding";
import { ReadableStream, TransformStream } from "web-streams-polyfill";

import { Buffer } from "buffer"; // Adiciona o Buffer globalmente para a SDK do Gemini

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from "@react-native-voice/voice";

// 2. IMPORTS NORMAIS
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Adicionamos o useRouter aqui:
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { FontAwesome5 } from "@expo/vector-icons";

global.Buffer = Buffer;

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
});

// --- TIPOS ---
type MemoryVector = {
  id: string;
  text: string;
  embedding: number[];
};

type ChatMessage = { role: "user" | "model"; text: string };
type GeminiHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

type StoredConversation = {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
};

// Tipo para as configurações do Jira que virão do AsyncStorage
type JiraSettings = {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default function App() {
  const router = useRouter(); // Instanciando o router para o redirecionamento
  const { conversationId: paramConversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isJiraLoading, setIsJiraLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [conversationId, setConversationId] = useState(
    paramConversationId || Date.now().toString(),
  );

  const model = useRef<ReturnType<typeof genAI.getGenerativeModel> | null>(
    null,
  );
  const embeddingModel = useRef<ReturnType<
    typeof genAI.getGenerativeModel
  > | null>(null);
  const chatRef = useRef<ChatSession | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log("Erro de voz:", e);
      setIsListening(false);
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setPrompt(e.value[0]);
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    if (!genAI) {
      Alert.alert("Missing API key", "Configure EXPO_PUBLIC_GOOGLE_API_KEY.");
      return;
    }

    model.current = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "Você é um assistente virtual sarcástico, mas muito útil. Use os 'Fatos Antigos' fornecidos para personalizar suas respostas.",
      tools: [{ googleSearch: {} }],
    });

    embeddingModel.current = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    const initializeChat = async () => {
      const nextConversationId = paramConversationId || Date.now().toString();
      setConversationId(nextConversationId);

      let initialMessages: ChatMessage[] = [];
      let history: GeminiHistoryItem[] = [];

      if (paramConversationId) {
        try {
          const storedHistory = await AsyncStorage.getItem("@chat_history");
          const historyArray: StoredConversation[] = storedHistory
            ? JSON.parse(storedHistory)
            : [];
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

  // --- FUNÇÃO JIRA ATUALIZADA (Agora recebe os dados ao invés do .env) ---
  const handleCreateTaskJira = async ({
    summary,
    description,
    projectKey,
    domain,
    email,
    apiToken,
    issueType = "Story",
  }: {
    summary: string;
    description: string;
    projectKey: string;
    domain: string;
    email: string;
    apiToken: string;
    issueType?: "Story" | "Bug" | "Task";
  }) => {
    const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

    const bodyData = {
      fields: {
        project: { key: projectKey },
        summary: summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description }],
            },
          ],
        },
        issuetype: { name: issueType },
      },
    };

    const response = await fetch(
      `https://${domain}.atlassian.net/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro no Jira: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  };

  // --- GATILHO DO JIRA ATUALIZADO ---
  const triggerJiraTask = async () => {
    if (!prompt.trim() || isJiraLoading) return;

    // 1. Busca as configurações salvas do usuário no AsyncStorage
    let jiraSettings: JiraSettings | null = null;

    try {
      const storedSettings = await AsyncStorage.getItem("@jira_settings");
      if (storedSettings) {
        jiraSettings = JSON.parse(storedSettings);
      }
    } catch (error) {
      console.error("Erro ao buscar configurações do Jira:", error);
    }

    // 2. Se não houver configurações, redireciona para a tela JiraSettings
    if (
      !jiraSettings ||
      !jiraSettings.domain ||
      !jiraSettings.email ||
      !jiraSettings.apiToken ||
      !jiraSettings.projectKey
    ) {
      Alert.alert(
        "Need Jira Credentials",
        "You need to configure your Jira credentials before creating a task.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Configure",
            onPress: () => router.push("/(jira)"), // Ajuste a rota se for diferente
          },
        ],
      );
      return;
    }

    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsJiraLoading(true);
    const taskContent = prompt.trim();

    try {
      // 3. Usa os dados dinâmicos salvos pelo usuário para criar a task
      const response = await handleCreateTaskJira({
        summary:
          taskContent.length > 50
            ? taskContent.substring(0, 50) + "..."
            : taskContent,
        description: taskContent,
        projectKey: jiraSettings.projectKey,
        domain: jiraSettings.domain,
        email: jiraSettings.email,
        apiToken: jiraSettings.apiToken,
      });

      const issueKey = response.key;
      const issueUrl = `https://${jiraSettings.domain}.atlassian.net/browse/${issueKey}`;

      Alert.alert(
        "Task Created",
        `The task ${issueKey} has been created! Do you want to view it?`,
        [
          { text: "∂No", style: "cancel" },
          { text: "Yes", onPress: () => Linking.openURL(issueUrl) },
        ],
      );

      setPrompt(""); // Limpa o campo após sucesso
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Jira Error",
        "Unable to create the task. Please check if your credentials in the settings are correct.",
        ßß,
      );
    } finally {
      setIsJiraLoading(false);
    }
  };

  // --- RAG ---
  const saveMemoryToVectorDB = async (text: string) => {
    if (!embeddingModel.current) return;
    try {
      const result = await embeddingModel.current.embedContent(text);
      const embedding = result.embedding.values;
      const storedMemories = await AsyncStorage.getItem("@vector_memory");
      const memoryArray: MemoryVector[] = storedMemories
        ? JSON.parse(storedMemories)
        : [];
      memoryArray.push({ id: Date.now().toString(), text, embedding });
      await AsyncStorage.setItem("@vector_memory", JSON.stringify(memoryArray));
    } catch (error) {
      console.error("Erro ao salvar vetor:", error);
    }
  };

  const searchLongTermMemory = async (
    promptText: string,
  ): Promise<string[]> => {
    if (!embeddingModel.current) return [];
    try {
      const result = await embeddingModel.current.embedContent(promptText);
      const promptEmbedding = result.embedding.values;
      const storedMemories = await AsyncStorage.getItem("@vector_memory");
      if (!storedMemories) return [];
      const memoryArray: MemoryVector[] = JSON.parse(storedMemories);
      const scoredMemories = memoryArray.map((memory) => ({
        text: memory.text,
        score: cosineSimilarity(promptEmbedding, memory.embedding),
      }));
      return scoredMemories
        .filter((m) => m.score > 0.65)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((m) => m.text);
    } catch (error) {
      return [];
    }
  };

  const saveConversation = async (
    id: string,
    updatedMessages: ChatMessage[],
  ) => {
    if (!id || updatedMessages.length === 0) return;
    try {
      const storedHistory = await AsyncStorage.getItem("@chat_history");
      let historyArray: StoredConversation[] = storedHistory
        ? JSON.parse(storedHistory)
        : [];
      const existingIndex = historyArray.findIndex((item) => item.id === id);
      const firstUserMsg =
        updatedMessages.find((m) => m.role === "user")?.text || "New Chat";
      const title =
        firstUserMsg.length > 30
          ? firstUserMsg.substring(0, 30) + "..."
          : firstUserMsg;

      const conversationData: StoredConversation = {
        id,
        title,
        date: new Date().toLocaleDateString("pt-BR"),
        messages: updatedMessages,
      };

      if (existingIndex >= 0) historyArray[existingIndex] = conversationData;
      else historyArray.unshift(conversationData);

      await AsyncStorage.setItem("@chat_history", JSON.stringify(historyArray));
    } catch (e) {}
  };

  const clearChat = () => {
    Alert.alert("Limpar Conversa", "Deletar histórico atual?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpar",
        style: "destructive",
        onPress: async () => {
          setMessages([]);
          if (model.current)
            chatRef.current = model.current.startChat({ history: [] });
        },
      },
    ]);
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // --- ENVIAR MENSAGEM (GEMINI APENAS) ---
  const sendMessage = async () => {
    if (!prompt.trim() || isLoading) return;
    if (!chatRef.current) return;

    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentPrompt = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    const userMessage: ChatMessage = { role: "user", text: currentPrompt };
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "model", text: "..." },
    ]);

    try {
      const retrievedMemories = await searchLongTermMemory(currentPrompt);
      let enrichedPrompt = currentPrompt;
      if (retrievedMemories.length > 0) {
        enrichedPrompt = `[FATOS ANTIGOS: ${retrievedMemories.join(" | ")}]\n\nPergunta: ${currentPrompt}`;
      }

      saveMemoryToVectorDB(currentPrompt);

      const result = await chatRef.current.sendMessage(enrichedPrompt);
      const fullText = result.response.text();

      setMessages((prev) => {
        const finalMessages = [
          ...prev.slice(0, -1),
          { role: "model", text: fullText },
        ];
        saveConversation(conversationId, finalMessages);
        return finalMessages;
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "model", text: "Erro ao conectar ao assistente." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = async () => {
    try {
      if (isListening) await Voice.stop();
      else {
        setPrompt("");
        await Voice.start("pt-BR");
        if (Platform.OS !== "web")
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {}
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
                ) : msg.text === "..." ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 4,
                    }}
                  >
                    <ActivityIndicator size="small" color="#5F6368" />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 15,
                        color: "#5F6368",
                        fontStyle: "italic",
                      }}
                    >
                      Lembrando...
                    </Text>
                  </View>
                ) : (
                  <Markdown style={markdownStyles}>{msg.text}</Markdown>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.hintText}>
                Can I help you with something?
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            {/* Botão de Microfone */}
            <TouchableOpacity
              onPress={toggleListening}
              style={styles.voiceButton}
            >
              <FontAwesome5
                name="microphone"
                size={20}
                color={isListening ? "#FF3B30" : "#8E8E93"}
              />
            </TouchableOpacity>

            {/* BOTÃO DO JIRA */}
            <TouchableOpacity
              onPress={triggerJiraTask}
              style={styles.jiraButton}
              disabled={isJiraLoading || !prompt.trim()}
            >
              {isJiraLoading ? (
                <ActivityIndicator size="small" color="#0052CC" />
              ) : (
                <FontAwesome5
                  name="atlassian"
                  size={20}
                  color={!prompt.trim() ? "#C6C6C8" : "#0052CC"}
                />
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type your message..."
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
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.5,
  },
  clearButton: {},
  clearButtonText: { color: "#007AFF", fontSize: 17, marginBottom: 6 },
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
  hintText: { fontSize: 17, color: "#8E8E93" },
  bubble: {
    maxWidth: "85%",
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
    paddingBottom: Platform.OS === "ios" ? 10 : 20,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#C6C6C8",
  },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end" },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 8,
    marginBottom: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#E9E9EB" },
  sendIcon: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
  voiceButton: { padding: 8, marginBottom: 4 },
  jiraButton: { padding: 8, marginBottom: 4, marginRight: 2 },
});

const markdownStyles = StyleSheet.create({
  body: { fontSize: 17, color: "#000000", lineHeight: 22 },
  code_inline: {
    backgroundColor: "rgba(0,0,0,0.05)",
    color: "#D70015",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block: {
    backgroundColor: "#000000",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
});
