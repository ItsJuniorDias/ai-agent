/**
 * Tela de chat — agora um front-end para o agente.
 *
 * O que saiu daqui:
 *  - Os polyfills globais no topo do arquivo (Buffer, TextEncoder,
 *    web-streams). Existiam só para o SDK do Gemini rodar no Hermes e vazavam
 *    para todo o app. O cliente do OpenRouter é `fetch` puro, não precisa.
 *  - As 8 funções `processXAction` (~700 linhas) que mandavam o texto cru do
 *    input para uma API hardcoded.
 *  - O `switch (activeIntegration)` e o botão de ação fixa.
 *  - A memória vetorial inline.
 *
 * O que entrou: `useAgent()`. A tela só desenha.
 */

import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from "@react-native-voice/voice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
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
import { Feather } from "@expo/vector-icons";

import { useAgent } from "@/hooks/use-agent";
import { AgentTrace, LiveTrace } from "@/components/agent-trace";
import { ToolApprovalSheet } from "@/components/tool-approval-sheet";
import { hasApiKey } from "@/services/openrouter";
import { loadConfig, STORAGE_KEYS } from "@/services/config";
import type { AgentStep, ChatMessage, StoredConversation } from "@/agent/types";

const SUGGESTIONS = [
  "Review the open pull requests on my repo",
  "Summarize what changed this week and post it to Slack",
  "Create a Jira ticket for the login bug",
  "Generate an app icon: a fox reading a book, flat vector",
];

/** Encontra a imagem gerada num turno, se houver, para exibir na bolha. */
function findGeneratedImage(steps?: AgentStep[]): string | null {
  const step = steps?.find(
    (s) => s.name === "generate_image" && s.status === "done" && s.result?.url,
  );
  return step?.result?.url ?? null;
}

export default function ChatScreen() {
  const { conversationId: paramConversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState(
    paramConversationId || Date.now().toString(),
  );
  const [isListening, setIsListening] = useState(false);
  const [haptics, setHaptics] = useState(true);

  const agent = useAgent();
  const scrollRef = useRef<ScrollView | null>(null);

  // -- Config ---------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      loadConfig().then((c) => setHaptics(c.haptics));
    }, []),
  );

  // -- Aviso de chave ausente -----------------------------------------------
  useEffect(() => {
    if (!hasApiKey()) {
      Alert.alert(
        "Missing OpenRouter key",
        "Set EXPO_PUBLIC_OPENROUTER_API_KEY in your .env and restart the bundler with `npx expo start -c`.",
      );
    }
  }, []);

  // -- Voz ------------------------------------------------------------------
  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.log("Speech error:", e);
      setIsListening(false);
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value?.length) setPrompt(e.value[0]);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const toggleListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
      } else {
        setPrompt("");
        await Voice.start("pt-BR");
      }
    } catch (err) {
      console.log("Voice error:", err);
      setIsListening(false);
    }
  };

  // -- Carrega conversa do histórico ----------------------------------------
  useEffect(() => {
    const load = async () => {
      const nextId = paramConversationId || Date.now().toString();
      setConversationId(nextId);

      if (!paramConversationId) {
        setMessages([]);
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.chatHistory);
        const all: StoredConversation[] = raw ? JSON.parse(raw) : [];
        const found = all.find((c) => c.id === paramConversationId);
        setMessages(found?.messages ?? []);
      } catch {
        setMessages([]);
      }
    };

    load();
  }, [paramConversationId]);

  // -- Persistência ---------------------------------------------------------
  const saveConversation = useCallback(
    async (id: string, updated: ChatMessage[]) => {
      if (!id || !updated.length) return;

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.chatHistory);
        const all: StoredConversation[] = raw ? JSON.parse(raw) : [];

        const firstUser = updated.find((m) => m.role === "user")?.text ?? "New Chat";
        const title =
          firstUser.length > 30 ? `${firstUser.slice(0, 30)}...` : firstUser;

        const data: StoredConversation = {
          id,
          title,
          date: new Date().toLocaleDateString("en-US"),
          messages: updated,
        };

        const index = all.findIndex((c) => c.id === id);
        if (index >= 0) all[index] = data;
        else all.unshift(data);

        await AsyncStorage.setItem(
          STORAGE_KEYS.chatHistory,
          JSON.stringify(all),
        );
      } catch (err) {
        console.log("Failed to save conversation:", err);
      }
    },
    [],
  );

  // -- Envio ----------------------------------------------------------------
  const send = async () => {
    const input = prompt.trim();
    if (!input || agent.running) return;

    if (haptics && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const history = messages;
    const withUser: ChatMessage[] = [...history, { role: "user", text: input }];

    setMessages(withUser);
    setPrompt("");

    try {
      const result = await agent.send(input, history);

      const final: ChatMessage[] = [
        ...withUser,
        {
          role: "model",
          text: result.text,
          steps: result.steps.length ? result.steps : undefined,
        },
      ];

      setMessages(final);
      saveConversation(conversationId, final);

      if (haptics && Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages([
          ...withUser,
          { role: "model", text: "_Cancelado._" },
        ]);
        return;
      }

      setMessages([
        ...withUser,
        { role: "model", text: `**Erro**\n\n${err?.message ?? String(err)}` },
      ]);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (haptics && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
  };

  const clearChat = () => {
    Alert.alert(
      "Clear conversation",
      "Delete the current conversation? Long-term memory is not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem(STORAGE_KEYS.chatHistory);
              const all: StoredConversation[] = raw ? JSON.parse(raw) : [];
              await AsyncStorage.setItem(
                STORAGE_KEYS.chatHistory,
                JSON.stringify(all.filter((c) => c.id !== conversationId)),
              );
            } catch {
              // se falhar, a conversa some da tela do mesmo jeito
            }

            setMessages([]);
            setConversationId(Date.now().toString());
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.largeTitle}>Agent</Text>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatBox}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
        >
          {messages.length > 0 ? (
            messages.map((msg, index) => {
              const image = findGeneratedImage(msg.steps);

              return (
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
                    <>
                      {!!image && (
                        <Image
                          source={{ uri: image }}
                          style={styles.generatedImage}
                          resizeMode="cover"
                        />
                      )}
                      {!!msg.text && (
                        <Markdown style={markdownStyles}>{msg.text}</Markdown>
                      )}
                      {!!msg.steps?.length && <AgentTrace steps={msg.steps} />}
                    </>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="cpu" size={26} color="#007AFF" />
              </View>
              <Text style={styles.hintText}>What should I do for you?</Text>
              <Text style={styles.hintSub}>
                I can use your connected tools on my own.
              </Text>

              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.chip}
                    onPress={() => setPrompt(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Turno em andamento: trace ao vivo dentro de uma bolha */}
          {agent.running && (
            <View style={[styles.bubble, styles.modelBubble, styles.liveBubble]}>
              <LiveTrace steps={agent.steps} status={agent.status} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              onPress={toggleListening}
              style={styles.voiceButton}
              disabled={agent.running}
            >
              <Feather
                name="mic"
                size={20}
                color={
                  agent.running ? "#C7C7CC" : isListening ? "#FF3B30" : "#007AFF"
                }
              />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Ask the agent to do something"
              placeholderTextColor="#A9A9AC"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              editable={!agent.running}
            />

            {agent.running ? (
              <TouchableOpacity
                style={[styles.sendButton, styles.stopButton]}
                onPress={agent.cancel}
              >
                <View style={styles.stopIcon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !prompt.trim() && styles.sendButtonDisabled,
                ]}
                onPress={send}
                disabled={!prompt.trim()}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <ToolApprovalSheet
        request={agent.pendingApproval}
        onDecide={agent.resolveApproval}
        haptics={haptics}
      />
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
    marginTop: "30%",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  hintText: { fontSize: 22, fontWeight: "600", color: "#000000" },
  hintSub: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 6,
    textAlign: "center",
  },
  suggestions: { marginTop: 28, gap: 8, alignSelf: "stretch" },
  chip: {
    backgroundColor: "#F2F2F7",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 15, color: "#3C3C43" },
  bubble: {
    maxWidth: "88%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    maxWidth: "80%",
  },
  modelBubble: {
    backgroundColor: "#E9E9EB",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  liveBubble: { paddingVertical: 6, minWidth: "60%" },
  userText: { fontSize: 17, color: "#FFFFFF", lineHeight: 22 },
  generatedImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#D1D1D6",
  },
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
  voiceButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
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
  stopButton: { backgroundColor: "#3C3C43" },
  stopIcon: {
    width: 11,
    height: 11,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
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
