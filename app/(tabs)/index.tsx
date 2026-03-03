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
import { useLocalSearchParams, useRouter } from "expo-router"; // <-- ADICIONADO useRouter
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

// Adicionando os objetos globais que a SDK do Gemini espera encontrar
Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
});

// --- NOVOS TIPOS PARA O RAG (MEMÓRIA VETORIAL) ---
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

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

// Inicializa a API do Google (agora fora do componente para reuso)
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// --- FUNÇÃO MATEMÁTICA: SIMILARIDADE DE COSSENO ---
// Mede a "distância" semântica entre dois arrays de números (vetores)
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
  const router = useRouter(); // <-- NOVO: Hook de navegação
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
    // Configura os listeners do Voice
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log("Erro de voz:", e);
      setIsListening(false);
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setPrompt(e.value[0]); // Pega o resultado mais provável e joga no input
      }
    };

    return () => {
      // Limpeza ao desmontar
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    if (!genAI) {
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your environment to use the assistant.",
      );
      return;
    }

    // Modelo de Chat
    model.current = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction:
        "Você é um assistente virtual sarcástico, mas muito útil. Use os 'Fatos Antigos' fornecidos no prompt para personalizar suas respostas, se forem relevantes para a pergunta atual.",
      tools: [{ googleSearch: {} }],
    });

    // Novo: Modelo especializado em transformar texto em Vetores (Embeddings)
    embeddingModel.current = genAI.getGenerativeModel({
      model: "gemini-embedding-001",
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

  const jiraTool = {
    functionDeclarations: [
      {
        name: "createJiraTask",
        description:
          "Cria uma nova task ou story no Jira do Tribanco baseada em uma user story ou descrição técnica.",
        parameters: {
          type: "OBJECT",
          properties: {
            summary: {
              type: "string",
              description: "Um título conciso e profissional para a task.",
            },
            description: {
              type: "string",
              description:
                "O detalhamento técnico, incluindo contexto e critérios de aceitação.",
            },
            projectKey: {
              type: "string",
              description:
                "A chave do projeto no Jira (ex: 'PROJ', 'WEB', 'API').",
            },
            issueType: {
              type: "string",
              description:
                "O tipo da tarefa. Padrão: 'Story'. Opções: 'Bug', 'Task', 'Story'.",
              enum: ["Story", "Bug", "Task"],
            },
          },
          required: ["summary", "description", "projectKey"],
        },
      },
    ],
  };

  // Exemplo de payload para criar a task via API do Jira (Cloud)
  const handleCreateTaskJira = async ({
    summary,
    description,
    projectKey,
    apiJiraToken,
    domain,
    email = "user_t10tec102@tribanco.com.br", // <-- Adicionado com fallback
    issueType = "Story",
  }: {
    summary: string;
    description: string;
    projectKey: string;
    apiJiraToken: string;
    domain: string;
    email?: string; // <-- Opcional para suportar o que vem do storage
    issueType?: "Story" | "Bug" | "Task";
  }) => {
    const auth = Buffer.from(`${email}:${apiJiraToken}`).toString("base64");

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

  // --- NOVA FUNÇÃO: Dispara a criação no Jira baseada no input atual ---
  const handleJiraPress = async () => {
    if (!prompt.trim()) {
      Alert.alert(
        "Aviso",
        "Digite a descrição da task no campo de texto primeiro.",
      );
      return;
    }

    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsJiraLoading(true);

    try {
      // --- NOVO: VALIDAÇÃO DE DADOS CADASTRADOS ---
      const jiraConfigString = await AsyncStorage.getItem("@jira_config");

      if (!jiraConfigString) {
        // Se não existir nenhuma configuração, redireciona
        setIsJiraLoading(false);
        router.push("/(jira)");
        return;
      }

      const jiraConfig = JSON.parse(jiraConfigString);

      // Validação de segurança para garantir que as chaves essenciais existem
      if (!jiraConfig.apiToken || !jiraConfig.domain) {
        setIsJiraLoading(false);
        router.push("/(jira)");
        return;
      }
      // ---------------------------------------------

      const response = await handleCreateTaskJira({
        summary: "Implementar nova funcionalidade do STP",
        description: prompt,
        projectKey: jiraConfig.projectKey || "STP", // Pega do config ou usa fallback
        apiJiraToken: jiraConfig.apiToken,
        domain: jiraConfig.domain,
        email: jiraConfig.email, // Repassa se existir no config
      });

      console.log("Tarefa criada no Jira:", response);
      const issueKey = response.key;
      // Ajustado para usar o domínio salvo
      const issueUrl = `https://${jiraConfig.domain}.atlassian.net/browse/${issueKey}`;

      Alert.alert(
        "Task Created",
        `A Jira task was created successfully! Do you want to view it?`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            onPress: () => {
              if (Platform.OS === "web") {
                window.open(issueUrl, "_blank");
              } else {
                Linking.openURL(issueUrl);
              }
            },
          },
        ],
      );

      setPrompt(""); // Limpa o input após enviar para o Jira
    } catch (error) {
      console.error("Erro ao criar tarefa no Jira:", error);
      Alert.alert(
        "Erro",
        "Não foi possível criar a task no Jira. Verifique os logs e se as suas credenciais estão corretas.",
      );
    } finally {
      setIsJiraLoading(false);
    }
  };

  // --- MOTOR RAG: SALVAR E BUSCAR MEMÓRIAS ---
  const saveMemoryToVectorDB = async (text: string) => {
    if (!embeddingModel.current) return;
    try {
      // 1. Transforma o texto em vetor
      const result = await embeddingModel.current.embedContent(text);
      const embedding = result.embedding.values;

      // 2. Busca o banco atual
      const storedMemories = await AsyncStorage.getItem("@vector_memory");
      const memoryArray: MemoryVector[] = storedMemories
        ? JSON.parse(storedMemories)
        : [];

      // 3. Adiciona a nova memória
      memoryArray.push({ id: Date.now().toString(), text, embedding });
      await AsyncStorage.setItem("@vector_memory", JSON.stringify(memoryArray));

      console.log("Memória salva no banco vetorial local!");
    } catch (error) {
      console.error("Erro ao salvar vetor:", error);
    }
  };

  const searchLongTermMemory = async (
    promptText: string,
  ): Promise<string[]> => {
    if (!embeddingModel.current) return [];
    try {
      // 1. Transforma a pergunta atual em vetor
      const result = await embeddingModel.current.embedContent(promptText);
      const promptEmbedding = result.embedding.values;

      // 2. Carrega as memórias passadas
      const storedMemories = await AsyncStorage.getItem("@vector_memory");
      if (!storedMemories) return [];

      const memoryArray: MemoryVector[] = JSON.parse(storedMemories);

      // 3. Calcula a similaridade de todas as memórias com a pergunta atual
      const scoredMemories = memoryArray.map((memory) => ({
        text: memory.text,
        score: cosineSimilarity(promptEmbedding, memory.embedding),
      }));

      // 4. Ordena pelas maiores pontuações e pega as que têm similaridade razoável (ex: > 0.65)
      const topMemories = scoredMemories
        .filter((m) => m.score > 0.65)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3) // Pega o Top 3 para não estourar o limite de tokens
        .map((m) => m.text);

      return topMemories;
    } catch (error) {
      console.error("Erro ao buscar memórias:", error);
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
        date: new Date().toLocaleDateString("en-US"),
        messages: updatedMessages,
      };

      if (existingIndex >= 0) {
        historyArray[existingIndex] = conversationData;
      } else {
        historyArray.unshift(conversationData);
      }
      await AsyncStorage.setItem("@chat_history", JSON.stringify(historyArray));
    } catch (e) {
      console.error("Falha ao salvar o histórico:", e);
    }
  };

  const clearChat = () => {
    Alert.alert(
      "Clear Conversation",
      "Deletar a conversa atual? (A Memória de Longo Prazo não será afetada)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web")
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            setMessages([]);
            if (model.current)
              chatRef.current = model.current.startChat({ history: [] });

            try {
              const storedHistory = await AsyncStorage.getItem("@chat_history");
              if (storedHistory) {
                const historyArray: StoredConversation[] =
                  JSON.parse(storedHistory);
                const updatedHistory = historyArray.filter(
                  (item) => item.id !== conversationId,
                );
                await AsyncStorage.setItem(
                  "@chat_history",
                  JSON.stringify(updatedHistory),
                );
              }
            } catch (e) {}
          },
        },
      ],
    );
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const sendMessage = async () => {
    if (!prompt.trim() || isLoading) return;
    if (!chatRef.current) {
      Alert.alert("Chat not ready", "Try again in a second.");
      return;
    }

    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentPrompt = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    const userMessage: ChatMessage = { role: "user", text: currentPrompt };
    const placeholderMessage: ChatMessage = { role: "model", text: "..." };

    // Atualiza a UI com a mensagem LIMPA do usuário
    setMessages((prev) => [...prev, userMessage, placeholderMessage]);

    try {
      // --- INÍCIO DO FLUXO RAG ---
      // 1. Busca fatos antigos relevantes no banco local
      const retrievedMemories = await searchLongTermMemory(currentPrompt);

      // 2. Monta o Prompt Enriquecido (invisível para o usuário)
      let enrichedPrompt = currentPrompt;
      if (retrievedMemories.length > 0) {
        enrichedPrompt = `[FATOS ANTIGOS RESGATADOS DA MEMÓRIA DO USUÁRIO: ${retrievedMemories.join(" | ")}]\n\nPergunta atual do usuário: ${currentPrompt}`;
        console.log("RAG Ativado. Injetando:", retrievedMemories);
      }

      // 3. Salva a nova mensagem do usuário para o futuro, paralelamente
      saveMemoryToVectorDB(currentPrompt);
      // --- FIM DO FLUXO RAG ---

      // Envia o prompt turbinado para o Gemini
      const result = await chatRef.current.sendMessage(enrichedPrompt);
      const fullText = result.response.text();

      setMessages((prev) => {
        const withoutPlaceholder = prev.slice(0, -1);
        const finalMessages = [
          ...withoutPlaceholder,
          { role: "model" as const, text: fullText },
        ];

        setTimeout(() => saveConversation(conversationId, finalMessages), 0);
        return finalMessages;
      });
    } catch (error) {
      console.error(error);
      setMessages((prev) => {
        const withoutPlaceholder = prev.slice(0, -1);
        return [
          ...withoutPlaceholder,
          {
            role: "model" as const,
            text: "Error: Unable to reach the assistant.",
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
      } else {
        setPrompt(""); // Opcional: limpa o texto antes de começar

        await Voice.start("pt-BR"); // Força o idioma para Português Brasil

        if (Platform.OS !== "web")
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      console.error(e);
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
                ) : msg.text === "..." ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 4,
                    }}
                  >
                    <FontAwesome5 name="google" size={16} color="#5F6368" />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 15,
                        color: "#5F6368",
                        fontStyle: "italic",
                      }}
                    >
                      Thinking & Remembering...
                    </Text>
                  </View>
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
            <TouchableOpacity
              onPress={toggleListening}
              style={styles.voiceButton}
            >
              <FontAwesome5
                name="microphone"
                size={20}
                color={isListening ? "#FF3B30" : "#007AFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleJiraPress}
              style={styles.jiraButton}
              disabled={!prompt.trim() || isJiraLoading}
            >
              {isJiraLoading ? (
                <ActivityIndicator size="small" color="#0052CC" />
              ) : (
                <FontAwesome5
                  name="jira"
                  size={20}
                  color={!prompt.trim() ? "#A9A9AC" : "#0052CC"}
                />
              )}
            </TouchableOpacity>

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
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  jiraButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    marginRight: 4,
  },
  sendButtonDisabled: { backgroundColor: "#E9E9EB" },
  sendIcon: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
});

const markdownStyles = StyleSheet.create({
  body: { fontSize: 17, color: "#000000", lineHeight: 22 },
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
