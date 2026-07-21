/**
 * Tela de chat — front-end do agente.
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
 * O que entrou: `useAgent()` e a barra de composição em liquid glass. A tela
 * só desenha.
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { useAgent } from "@/hooks/use-agent";
import { AgentTrace, LiveTrace } from "@/components/agent-trace";
import { ToolApprovalSheet } from "@/components/tool-approval-sheet";
import { GlassSurface } from "@/components/ui/glass-surface";
import { AuroraGlow } from "@/components/ui/aurora";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import { hasApiKey } from "@/services/openrouter";
import { loadConfig, STORAGE_KEYS } from "@/services/config";
import {
  Color,
  MonoFont,
  Palette,
  Radius,
  Spacing,
  Type,
  alpha,
} from "@/constants/theme";
import type { AgentStep, ChatMessage, StoredConversation } from "@/agent/types";
import { localeTag, useTranslation } from "@/i18n";

// `NativeTabs` are rendered over the route content. The safe-area inset only
// covers the home indicator, so it is not enough to keep a composer clear of
// the translucent tab bar. These values include that safe area and leave a
// small visual gap above the bar on compact and regular devices.
const NATIVE_TAB_BAR_CLEARANCE = Platform.OS === "ios" ? 96 : 80;

/** Encontra a imagem gerada num turno, se houver, para exibir na bolha. */
function findGeneratedImage(steps?: AgentStep[]): string | null {
  const step = steps?.find(
    (s) => s.name === "generate_image" && s.status === "done" && s.result?.url,
  );
  return step?.result?.url ?? null;
}

export default function ChatScreen() {
  const { language, t } = useTranslation();
  const { conversationId: paramConversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
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
      Alert.alert(t("chat.missingKeyTitle"), t("chat.missingKey"));
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
        await Voice.start(language === "zh" ? "zh-CN" : language === "pt" ? "pt-BR" : language);
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

        const firstUser =
          updated.find((m) => m.role === "user")?.text ?? t("chat.newChat");
        const title =
          firstUser.length > 30 ? `${firstUser.slice(0, 30)}...` : firstUser;

        const data: StoredConversation = {
          id,
          title,
          date: new Date().toLocaleDateString(localeTag(language)),
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
    [t],
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
        setMessages([...withUser, { role: "model", text: `_${t("chat.cancelled")}_` }]);
        return;
      }

      setMessages([
        ...withUser,
        { role: "model", text: `**${t("chat.errorLabel")}**\n\n${err?.message ?? String(err)}` },
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
      t("chat.clearTitle"),
      t("chat.clearBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.clear"),
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

  const canSend = !!prompt.trim() && !agent.running;

  // Sugestões de exemplo, traduzidas — recalculadas quando o idioma muda.
  const suggestions = [
    t("chat.s1"),
    t("chat.s2"),
    t("chat.s3"),
    t("chat.s4"),
  ];

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        // Android resizes the window (configured in app.json); applying the
        // "height" strategy as well can produce a second, incorrect offset.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Text style={styles.kicker}>{t("chat.onDuty")}</Text>
            <Text style={styles.largeTitle}>{t("chat.agent")}</Text>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} hitSlop={8}>
              <Text style={styles.clearButtonText}>{t("chat.clear")}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatBox}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                    msg.role === "user"
                      ? styles.userBubble
                      : styles.modelBubble,
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
              <View style={styles.emptyMark}>
                <AuroraGlow size={200} style={styles.emptyGlow} />
                <View style={styles.emptyIcon}>
                  <Feather name="command" size={26} color={Color.label} />
                </View>
              </View>
              <Text style={styles.hintText}>{t("chat.promptHint")}</Text>
              <Text style={styles.hintSub}>{t("chat.hintSub")}</Text>

              <View style={styles.suggestions}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.chip}
                    onPress={() => setPrompt(s)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="arrow-up-right"
                      size={15}
                      color={Color.accent}
                    />
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Turno em andamento: trace ao vivo dentro de uma bolha destacada */}
          {agent.running && (
            <View style={[styles.bubble, styles.liveBubble]}>
              <LiveTrace steps={agent.steps} status={agent.status} />
            </View>
          )}
        </ScrollView>

        {/* -- Barra de composição em liquid glass ------------------------- */}
        <View
          style={[
            styles.composerDock,
            {
              paddingBottom: Math.max(
                keyboardVisible
                  ? Spacing.md
                  : Math.max(insets.bottom, NATIVE_TAB_BAR_CLEARANCE),
              ),
            },
          ]}
        >
          <GlassSurface radius={Radius.xxl} style={styles.composer}>
            <TouchableOpacity
              onPress={toggleListening}
              style={styles.voiceButton}
              disabled={agent.running}
              activeOpacity={0.7}
            >
              <Feather
                name="mic"
                size={20}
                color={
                  agent.running
                    ? Color.quaternary
                    : isListening
                      ? Color.danger
                      : Color.accent
                }
              />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={t("chat.askPlaceholder")}
              placeholderTextColor={Color.placeholder}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              editable={!agent.running}
            />

            {agent.running ? (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={agent.cancel}
                activeOpacity={0.8}
              >
                <View style={styles.stopIcon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={send}
                disabled={!canSend}
                activeOpacity={0.85}
              >
                {canSend ? (
                  <LinearGradient
                    colors={
                      Color.auroraButton as unknown as [
                        string,
                        string,
                        ...string[],
                      ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButton}
                  >
                    <Feather name="arrow-up" size={20} color={Color.onAccent} />
                  </LinearGradient>
                ) : (
                  <View style={[styles.sendButton, styles.sendButtonDisabled]}>
                    <Feather name="arrow-up" size={20} color={Color.tertiary} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </GlassSurface>
        </View>
      </KeyboardAvoidingView>

      <ToolApprovalSheet
        request={agent.pendingApproval}
        onDecide={agent.resolveApproval}
        haptics={haptics}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Color.bg },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  kicker: {
    ...Type.caption2,
    color: Color.accent,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  largeTitle: { ...Type.largeTitle, color: Color.label },
  clearButtonText: { ...Type.body, color: Color.accent, marginBottom: 4 },
  chatBox: { flex: 1, paddingHorizontal: Spacing.lg },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "24%",
    paddingHorizontal: Spacing.xl,
  },
  emptyMark: {
    width: 200,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyGlow: { position: "absolute" },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Color.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  hintText: { ...Type.title2, color: Color.label },
  hintSub: {
    ...Type.subhead,
    color: Color.secondary,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 21,
  },
  suggestions: { marginTop: 28, gap: Spacing.sm, alignSelf: "stretch" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
  },
  chipText: { ...Type.subhead, color: Color.label, flex: 1 },

  bubble: {
    maxWidth: "88%",
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    marginVertical: 5,
  },
  userBubble: {
    backgroundColor: Color.accent,
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
    maxWidth: "82%",
  },
  modelBubble: {
    backgroundColor: Color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  liveBubble: {
    alignSelf: "flex-start",
    backgroundColor: Color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.accentSoft,
    borderBottomLeftRadius: 6,
    paddingVertical: 8,
    minWidth: "62%",
  },
  userText: { ...Type.body, color: Color.onAccent, lineHeight: 23 },
  generatedImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Color.surface3,
  },

  composerDock: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  input: {
    flex: 1,
    ...Type.body,
    color: Color.label,
    paddingHorizontal: 6,
    paddingTop: Platform.OS === "ios" ? 10 : 6,
    paddingBottom: Platform.OS === "ios" ? 10 : 6,
    minHeight: 40,
    maxHeight: 140,
  },
  voiceButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Color.surface3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Color.surface3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairlineStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Color.label,
  },
});

const markdownStyles = StyleSheet.create({
  body: { ...Type.body, color: Color.label, lineHeight: 23 },
  strong: { fontWeight: "700", color: Color.label },
  link: { color: Color.accent },
  bullet_list_icon: { color: Color.accent },
  code_inline: {
    backgroundColor: Color.accentSoft,
    color: Palette.cyan,
    borderRadius: 5,
    paddingHorizontal: 5,
    fontFamily: MonoFont,
    fontSize: 15,
  },
  code_block: {
    backgroundColor: alpha(Palette.black, 0.35),
    color: Color.label,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    padding: 12,
    marginVertical: 8,
    fontFamily: MonoFont,
  },
  fence: {
    backgroundColor: alpha(Palette.black, 0.35),
    color: Color.label,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Color.hairline,
    padding: 12,
    marginVertical: 8,
    fontFamily: MonoFont,
  },
});
