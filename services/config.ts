/**
 * Configuração do agente, persistida em AsyncStorage.
 *
 * Antes, a tela de Ajustes tinha um seletor de modelo que só mexia em
 * `useState` — nada era salvo nem usado. Agora tudo aqui é lido pelo agente
 * a cada execução.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  agentConfig: "@agent_config",
  enabledIntegrations: "@enabled_integrations",
  primaryIntegration: "@primary_integration", // legado do onboarding antigo
  chatHistory: "@chat_history",
  vectorMemory: "@vector_memory",
  // -- Assistente pessoal / notificações ---------------------------------
  assistantConfig: "@assistant_config",
  /** Última varredura: timestamp, resumo e quantas notificações saíram. */
  assistantState: "@assistant_state",
  /** Log de dedupe do notify_now — evita pingar duas vezes pelo mesmo item. */
  notifyLog: "@notify_log",
  /**
   * Transcript completo da última varredura em background (mensagens ORMessage
   * + steps). Persistido pra permitir debug depois — quando uma notificação
   * sai errada, tu abre a tela de Ajustes → Debug e vê o passo a passo real.
   */
  lastScanTranscript: "@last_scan_transcript",
} as const;

// ---------------------------------------------------------------------------
// Catálogo de modelos
// ---------------------------------------------------------------------------

export type ModelInfo = {
  id: string;
  name: string;
  /** Chave i18n da descrição curta (namespace `models`). */
  descKey: string;
  color: string;
  /**
   * Preço só para exibir na UI, separado em valor + unidade para permitir
   * tradução da unidade. O valor (moeda/número) é universal e fica literal;
   * a unidade (`per1M`/`perToken`/`perImage`) vem do dicionário. String vazia
   * em `priceAmount` renderiza só a unidade (ex.: "per token").
   */
  priceAmount: string;
  priceUnitKey: string;
};

/**
 * Modelos de raciocínio do agente. Todos suportam tool calling — requisito
 * obrigatório aqui, porque o loop inteiro depende de `tools`.
 * Verifique o catálogo vivo em openrouter.ai/models?supported_parameters=tools
 */
export const AGENT_MODELS: ModelInfo[] = [
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    descKey: "models.descGeminiFlash",
    color: "#4285F4",
    priceAmount: "$0.50 / $3",
    priceUnitKey: "models.per1M",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    descKey: "models.descClaudeSonnet",
    color: "#D97757",
    priceAmount: "$3 / $15",
    priceUnitKey: "models.per1M",
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    descKey: "models.descGrok",
    color: "#111111",
    priceAmount: "$0.20 / $0.50",
    priceUnitKey: "models.per1M",
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    descKey: "models.descDeepseek",
    color: "#4D6BFE",
    priceAmount: "$0.25 / $0.38",
    priceUnitKey: "models.per1M",
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    descKey: "models.descClaudeOpus",
    color: "#8B5CF6",
    priceAmount: "$5 / $25",
    priceUnitKey: "models.per1M",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    descKey: "models.descGeminiLite",
    color: "#10B981",
    priceAmount: "$0.10 / $0.40",
    priceUnitKey: "models.per1M",
  },
];

export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: "google/gemini-2.5-flash-image",
    name: "Nano Banana",
    descKey: "models.descNanoBanana",
    color: "#FBBC04",
    priceAmount: "",
    priceUnitKey: "models.perToken",
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    name: "Nano Banana 2",
    descKey: "models.descNanoBanana2",
    color: "#EA4335",
    priceAmount: "",
    priceUnitKey: "models.perToken",
  },
  {
    id: "bytedance-seed/seedream-4.5",
    name: "Seedream 4.5",
    descKey: "models.descSeedream",
    color: "#EC4899",
    priceAmount: "$0.04",
    priceUnitKey: "models.perImage",
  },
];

/**
 * O OpenRouter passou a expor /embeddings com schema OpenAI.
 * 1536 dimensões, 8191 tokens de entrada.
 */
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type AgentConfig = {
  /** Modelo de raciocínio do loop do agente. Usado no passo 0 (planejamento
   * inicial) e na síntese final forçada quando o teto de passos estoura. */
  model: string;
  /**
   * Modelo mais barato/rápido usado nos passos intermediários do loop, quando
   * já entramos em modo "orquestração" (o modelo só está decidindo qual tool
   * chamar em seguida com base em resultados de leitura). Se `undefined`, todos
   * os passos usam `model`. Ativa opt-in em Ajustes.
   *
   * Padrão que costuma render 40-60% de economia em runs de 3+ passos:
   * `model = anthropic/claude-sonnet-4.6` + `orchestrationModel = google/gemini-2.5-flash-lite`.
   */
  orchestrationModel?: string;
  /** Modelo do Studio de imagens. */
  imageModel: string;
  /** Modelo usado para ler PDFs/documentos. */
  documentModel: string;
  /** Deixa o agente pesquisar na web sozinho (server tools do OpenRouter). */
  webSearch: boolean;
  /** Memória vetorial de longo prazo entre conversas. */
  longTermMemory: boolean;
  /** Pede confirmação antes de qualquer ação que escreve em serviço externo. */
  requireApproval: boolean;
  /** Teto de iterações do loop, evita agente em loop infinito queimando crédito. */
  maxSteps: number;
  haptics: boolean;
};

export const DEFAULT_CONFIG: AgentConfig = {
  model: "google/gemini-3-flash-preview",
  orchestrationModel: undefined,
  imageModel: "google/gemini-2.5-flash-image",
  documentModel: "google/gemini-3-flash-preview",
  webSearch: true,
  longTermMemory: true,
  requireApproval: true,
  maxSteps: 8,
  haptics: true,
};

let cache: AgentConfig | null = null;

export async function loadConfig(): Promise<AgentConfig> {
  if (cache) return cache;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.agentConfig);
    cache = raw
      ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AgentConfig>) }
      : { ...DEFAULT_CONFIG };
  } catch {
    cache = { ...DEFAULT_CONFIG };
  }

  return cache;
}

export async function saveConfig(
  patch: Partial<AgentConfig>,
): Promise<AgentConfig> {
  const current = await loadConfig();
  const next = { ...current, ...patch };
  cache = next;
  await AsyncStorage.setItem(STORAGE_KEYS.agentConfig, JSON.stringify(next));
  return next;
}

/** Invalida o cache — chame se mexer no AsyncStorage por fora. */
export function resetConfigCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Integrações habilitadas
// ---------------------------------------------------------------------------

/**
 * Lê quais integrações o usuário ligou no onboarding.
 *
 * `null` = nenhuma preferência salva, o agente usa tudo que estiver
 * configurado com credenciais. Também aceita o formato antigo
 * (`@primary_integration`, uma string só) para não quebrar quem já instalou.
 */
export async function loadEnabledIntegrations(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.enabledIntegrations);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }

    const legacy = await AsyncStorage.getItem(STORAGE_KEYS.primaryIntegration);
    if (legacy && legacy !== "chat") return [legacy];

    return null;
  } catch {
    return null;
  }
}

export async function saveEnabledIntegrations(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.enabledIntegrations,
    JSON.stringify(ids),
  );
}

// ---------------------------------------------------------------------------
// Assistente pessoal proativo
// ---------------------------------------------------------------------------

/**
 * Integrações que fazem sentido *vigiar* em segundo plano. Precisam ter uma
 * tool de leitura de verdade (a varredura só olha, nunca escreve) e produzir
 * algo acionável: PR/MR esperando review, deploy quebrado, issue recém-atribuída.
 *
 * Slack/Discord/WhatsApp/Teams/Gmail são orientadas a *enviar* — não há o que
 * monitorar — então ficam de fora do monitor, mesmo conectadas.
 */
export const MONITORABLE_INTEGRATIONS = [
  "github",
  "gitlab",
  "jira",
  "linear",
  "vercel",
] as const;

export type MonitorableIntegration =
  (typeof MONITORABLE_INTEGRATIONS)[number];

/** Opções de intervalo mínimo (minutos) oferecidas na UI do assistente. */
export const ASSISTANT_INTERVALS = [15, 30, 60, 240] as const;

export type AssistantConfig = {
  /** Chave-mestra: liga o monitor em background e as varreduras automáticas. */
  enabled: boolean;
  /**
   * Intervalo mínimo entre varreduras, em minutos. É só uma dica — o SO decide
   * quando de fato acordar o app (iOS costuma agrupar em janelas próprias).
   */
  frequencyMinutes: number;
  /** Silencia varreduras automáticas dentro da janela. Lembretes explícitos
   * agendados por você continuam disparando. */
  quietHoursEnabled: boolean;
  quietStartHour: number; // 0-23
  quietEndHour: number; // 0-23
  /**
   * Quais integrações o monitor observa. Chave ausente = observa se estiver
   * conectada. Só as de MONITORABLE_INTEGRATIONS entram aqui.
   */
  watch: Partial<Record<MonitorableIntegration, boolean>>;
  /** Teto de rounds do loop durante uma varredura — mantém custo/latência baixos. */
  scanStepBudget: number;
  /**
   * Máximo de notificações que uma única varredura pode disparar. O prompt já
   * pede prudência, mas isso é hard-limit — a tool `notify_now` recusa depois
   * do N-ésimo. Notificação em excesso destrói confiança pra sempre; melhor
   * o modelo priorizar o que é realmente urgente.
   */
  scanNotificationCap: number;
};

export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  enabled: false, // opt-in: nada de background sem o usuário ligar
  frequencyMinutes: 60,
  quietHoursEnabled: true,
  quietStartHour: 22,
  quietEndHour: 7,
  watch: {},
  scanStepBudget: 5,
  scanNotificationCap: 3,
};

let assistantCache: AssistantConfig | null = null;

export async function loadAssistantConfig(): Promise<AssistantConfig> {
  if (assistantCache) return assistantCache;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.assistantConfig);
    assistantCache = raw
      ? {
          ...DEFAULT_ASSISTANT_CONFIG,
          ...(JSON.parse(raw) as Partial<AssistantConfig>),
        }
      : { ...DEFAULT_ASSISTANT_CONFIG };
  } catch {
    assistantCache = { ...DEFAULT_ASSISTANT_CONFIG };
  }

  return assistantCache;
}

export async function saveAssistantConfig(
  patch: Partial<AssistantConfig>,
): Promise<AssistantConfig> {
  const current = await loadAssistantConfig();
  const next = { ...current, ...patch };
  assistantCache = next;
  await AsyncStorage.setItem(
    STORAGE_KEYS.assistantConfig,
    JSON.stringify(next),
  );
  return next;
}

/** Decide se uma integração está sendo observada, respeitando o default. */
export function isWatched(
  cfg: AssistantConfig,
  id: MonitorableIntegration,
): boolean {
  return cfg.watch[id] ?? true;
}

// -- Estado da última varredura (não é configuração, é telemetria) ---------

export type AssistantState = {
  lastScanAt?: string;
  lastScanSummary?: string;
  lastScanNotified?: number;
  /** 'background' | 'manual' — de onde veio a última varredura. */
  lastScanReason?: string;
};

export async function loadAssistantState(): Promise<AssistantState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.assistantState);
    return raw ? (JSON.parse(raw) as AssistantState) : {};
  } catch {
    return {};
  }
}

export async function saveAssistantState(
  patch: Partial<AssistantState>,
): Promise<AssistantState> {
  const current = await loadAssistantState();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(
    STORAGE_KEYS.assistantState,
    JSON.stringify(next),
  );
  return next;
}
