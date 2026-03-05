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
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  ActionSheetIOS,
} from "react-native";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

// IMPORT DO GITHUB
import { createPullRequest, getAIAnalysis } from "@/service/runCodeReview";

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

type GitHubConfig = {
  accessToken: string;
  baseUrl: string;
  repoOwner: string;
  repoName: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description: string;
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// --- DICIONÁRIO DE INTEGRAÇÕES (Regra de Ouro) ---
const INTEGRATION_CONFIG = {
  github: {
    icon: "github",
    color: "#181717",
    actionText: "Create Pull Request",
    route: "/(github)",
  },
  jira: {
    icon: "jira",
    color: "#0052CC",
    actionText: "Create Task",
    route: "/(jira)",
  },
  gitlab: {
    icon: "gitlab",
    color: "#FC6D26",
    actionText: "Create Merge Request",
    route: "/(gitlab)",
  },
  slack: {
    icon: "slack",
    color: "#4A154B",
    actionText: "Send to Channel",
    route: "/(slack)",
  },
  linear: {
    icon: "vector-line",
    color: "#5E6AD2",
    actionText: "Create Issue",
    route: "/(linear)",
  },
  vercel: {
    icon: "triangle",
    color: "#000000",
    actionText: "Deploy to Vercel",
    route: "/(vercel)",
  },

  notion: {
    icon: "notebook",
    color: "#000000",
    actionText: "Save to Notion",
    route: "/(notion)",
  },

  gmail: {
    icon: "email-outline",
    color: "#D14836",
    actionText: "Send Email",
    route: "/(gmail)",
  },

  chat: null, // Chat não renderiza botão extra
};

// --- FUNÇÃO MATEMÁTICA ---
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
  const router = useRouter();
  const { conversationId: paramConversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // NOVO: Estado único de loading para qualquer integração
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Guarda qual foi a integração escolhida no Onboarding
  const [activeIntegration, setActiveIntegration] = useState<string>("chat");

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

  // Define as propriedades visuais da ferramenta atual baseada no dicionário
  const currentTool =
    activeIntegration !== "chat"
      ? INTEGRATION_CONFIG[activeIntegration as keyof typeof INTEGRATION_CONFIG]
      : null;

  // Carrega a integração selecionada
  useFocusEffect(
    useCallback(() => {
      const loadIntegration = async () => {
        try {
          // Atualizado para a mesma key que usamos no inglês OnboardingScreen (@primary_integration)
          const selected =
            (await AsyncStorage.getItem("@primary_integration")) ||
            (await AsyncStorage.getItem("@selected_integration"));
          if (selected) {
            setActiveIntegration(selected);
          }
        } catch (error) {
          console.error("Erro ao carregar a integração:", error);
        }
      };
      loadIntegration();
    }, []),
  );

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
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your environment to use the assistant.",
      );
      return;
    }

    model.current = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction:
        "Você é um assistente virtual sarcástico, mas muito útil. Use os 'Fatos Antigos' fornecidos no prompt para personalizar suas respostas, se forem relevantes para a pergunta atual.",
      tools: [{ googleSearch: {} }],
    });

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

  // --- ROTEADOR DINÂMICO DE AÇÕES ---
  const executeIntegrationAction = async () => {
    if (!prompt.trim()) {
      Alert.alert(
        "Aviso",
        `Digite a descrição no chat primeiro para usar o ${activeIntegration}.`,
      );
      return;
    }

    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsActionLoading(true);

    try {
      switch (activeIntegration) {
        case "github":
          await processGitHubAction();
          break;
        case "jira":
          await processJiraAction();
          break;
        case "gitlab":
          await processGitlabAction({
            title: `MR: ${prompt.substring(0, 50)}`,
            description: prompt,
            projectId: "79990056",
            sourceBranch: "main",
            targetBranch: "feat/integration",
          });
          break;
        case "notion":
          const notionResult = await handleCreateNotion({
            title: `Nova Nota - ${new Date().toLocaleString()}`,
            content: prompt,
          });

          if (notionResult) {
            Alert.alert("Sucesso", "Nota salva no Notion com sucesso!");
            setPrompt(""); // Limpa o input após enviar
          }
          break;
        case "gmail":
          await handleSendEmail();
          break;
        default:
          Alert.alert("Attention", "Action not implemented for this tool yet.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const showDynamicMenu = () => {
    if (!currentTool) return;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            currentTool.actionText,
            `${activeIntegration} Settings`,
          ],
          cancelButtonIndex: 0,
          userInterfaceStyle: "light",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) executeIntegrationAction();
          else if (buttonIndex === 2) router.push(currentTool.route as any);
        },
      );
    } else {
      Alert.alert(
        `${activeIntegration} Options`,
        "What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: currentTool.actionText,
            onPress: () => executeIntegrationAction(),
          },
          {
            text: "Settings",
            onPress: () => router.push(currentTool.route as any),
          },
        ],
      );
    }
  };

  // --- LÓGICA ESPECÍFICA DAS INTEGRAÇÕES ---
  const processGitHubAction = async () => {
    const ghConfigString = await AsyncStorage.getItem("@github_config");
    if (!ghConfigString) {
      router.push("/(github)");
      return;
    }
    const ghConfig: GitHubConfig = JSON.parse(ghConfigString);
    const aiAnalysis = await getAIAnalysis(prompt);
    await createPullRequest(
      ghConfig.sourceBranch,
      ghConfig.targetBranch,
      ghConfig.title || "Review by AI",
      aiAnalysis,
    );
    Alert.alert("Sucesso", "Pull Request enviado ao GitHub com sucesso!");
    setPrompt("");
  };

  const handleCreateTaskJira = async ({
    summary,
    description,
    projectKey,
    apiJiraToken,
    domain,
    email = "user_t10tec102@tribanco.com.br",
    issueType = "Story",
  }: any) => {
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

  const processJiraAction = async () => {
    const jiraConfigString = await AsyncStorage.getItem("@jira_config");
    if (!jiraConfigString) {
      router.push("/(jira)");
      return;
    }

    const jiraConfig = JSON.parse(jiraConfigString);
    if (!jiraConfig.apiToken || !jiraConfig.domain) {
      router.push("/(jira)");
      return;
    }

    const response = await handleCreateTaskJira({
      summary: "Implementar nova funcionalidade do STP",
      description: prompt,
      projectKey: jiraConfig.projectKey || "STP",
      apiJiraToken: jiraConfig.apiToken,
      domain: jiraConfig.domain,
      email: jiraConfig.email,
    });

    const issueUrl = `https://${jiraConfig.domain}.atlassian.net/browse/${response.key}`;

    Alert.alert(
      "Task Created",
      `A Jira task was created successfully! Do you want to view it?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            Platform.OS === "web"
              ? window.open(issueUrl, "_blank")
              : Linking.openURL(issueUrl);
          },
        },
      ],
    );
    setPrompt("");
  };

  const handleCreateNotion = async ({ title, content }: any) => {
    const notionToken = process.env.EXPO_PUBLIC_NOTION_TOKEN;
    const databaseId = process.env.EXPO_PUBLIC_NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      Alert.alert(
        "Erro",
        "As credenciais do Notion (Token ou Database ID) estão faltando.",
      );
      return null;
    }

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          // "Name" é o identificador padrão da coluna de título no Notion
          Name: {
            title: [{ text: { content: title } }],
          },
        },
        // O corpo da página deve ir como blocos dentro de "children"
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: content },
                },
              ],
            },
          },
        ],
      }),
    });

    console.log("Notion API response:", await response.json());
  };

  // --- MEMÓRIA E CHAT ---
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

  const handleSendEmail = async () => {
    const tokenGmail = "AIzaSyDl3hLKCgAeG81SuH2JMWbgaGDx8xh6JMQ";

    // Aqui você implementaria a lógica para enviar o e-mail usando o appPassword
    //implementar chamada a API da google pra ter acesso a minha caixa de email e enviar o email usando o prompt como corpo da mensagem

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenGmail}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: btoa(
            `To: its_juniordias1997@icloud.com
            Subject: Mensagem do Assistente Virtual

            ${prompt}`,
          ),
        }),
      },
    );

    if (!response.ok) {
      Alert.alert("Error", "Failed to send email.");
      return;
    }

    Alert.alert("Success", "Email sent successfully!");
    setPrompt("");
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
        date: new Date().toLocaleDateString("en-US"),
        messages: updatedMessages,
      };

      if (existingIndex >= 0) {
        historyArray[existingIndex] = conversationData;
      } else {
        historyArray.unshift(conversationData);
      }
      await AsyncStorage.setItem("@chat_history", JSON.stringify(historyArray));
    } catch (e) {}
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

    setMessages((prev) => [...prev, userMessage, placeholderMessage]);

    try {
      const retrievedMemories = await searchLongTermMemory(currentPrompt);
      let enrichedPrompt = currentPrompt;
      if (retrievedMemories.length > 0) {
        enrichedPrompt = `[FATOS ANTIGOS RESGATADOS DA MEMÓRIA DO USUÁRIO: ${retrievedMemories.join(" | ")}]\n\nPergunta atual do usuário: ${currentPrompt}`;
      }

      saveMemoryToVectorDB(currentPrompt);

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
        setPrompt("");
        await Voice.start("pt-BR");
        if (Platform.OS !== "web")
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {}
  };

  const processGitlabAction = async ({
    title,
    description,
    projectId,
    sourceBranch,
    targetBranch,
  }: {
    title: string;
    description: string;
    projectId: string;
    sourceBranch: string;
    targetBranch: string;
  }) => {
    try {
      // 1. Recuperar as credenciais salvas
      const savedUrl = await AsyncStorage.getItem("@gitlab_url");
      const savedToken = await AsyncStorage.getItem("@gitlab_token");

      if (!savedUrl || !savedToken) {
        Alert.alert(
          "Atenção",
          "Por favor, configure sua URL e Token do GitLab primeiro.",
        );
        return;
      }

      // Formatar a URL base da API (remove barra no final se houver)
      const apiBaseUrl = `${savedUrl.replace(/\/$/, "")}/api/v4`;
      const headers = {
        "PRIVATE-TOKEN": savedToken,
        "Content-Type": "application/json",
      };

      // 2. Criar o Merge Request
      const mrResponse = await fetch(
        `${apiBaseUrl}/projects/${projectId}/merge_requests`,
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            source_branch: sourceBranch,
            target_branch: targetBranch,
            title: title,
          }),
        },
      );

      const responseText = await mrResponse.text();

      console.log("Resposta bruta da API do GitLab:", responseText);

      let mrData;
      try {
        // 2. Tentamos converter esse texto para JSON
        mrData = JSON.parse(responseText);
      } catch (parseError) {
        // 3. Se quebrar aqui, nós mostramos o que realmente veio do servidor!
        console.log("RESPOSTA HTML QUE CAUSOU O ERRO:", responseText);
        throw new Error(
          "A API não retornou um JSON válido. Verifique o console para ver o HTML retornado (pode ser tela de login ou erro 404).",
        );
      }

      if (!mrResponse.ok) {
        const errorMsg = mrData.message
          ? Array.isArray(mrData.message)
            ? mrData.message.join(", ")
            : mrData.message
          : "Erro desconhecido";
        throw new Error(`Erro na API (${mrResponse.status}): ${errorMsg}`);
      }

      // 3. Fazer o Code Review (Adicionar um comentário/nota)
      const reviewResponse = await fetch(
        `${apiBaseUrl}/projects/${projectId}/merge_requests/${mrData.iid}/notes`,
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            body:
              description ||
              "Revisão automática: O código atende aos padrões. Aprovado! ✅",
          }),
        },
      );

      if (!reviewResponse.ok) {
        throw new Error("MR criado, mas falhou ao adicionar a revisão.");
      }

      Alert.alert(
        "Sucesso!",
        "Merge Request criado e revisado com sucesso no GitLab.",
      );
    } catch (error) {
      Alert.alert("Falha na Integração", error.message);
      console.error(error);
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

            {/* RENDERIZAÇÃO DINÂMICA DA FERRAMENTA */}
            {currentTool && (
              <TouchableOpacity
                onPress={showDynamicMenu}
                style={styles.actionIconButton}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color={currentTool.color} />
                ) : (
                  //validar se estiver o icone
                  <>
                    <MaterialCommunityIcons
                      name={currentTool.icon}
                      size={22}
                      color={currentTool.color}
                    />
                  </>
                )}
              </TouchableOpacity>
            )}

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
  actionIconButton: {
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
