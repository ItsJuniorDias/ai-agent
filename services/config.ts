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
} as const;

// ---------------------------------------------------------------------------
// Catálogo de modelos
// ---------------------------------------------------------------------------

export type ModelInfo = {
  id: string;
  name: string;
  desc: string;
  color: string;
  /** Preço aproximado por 1M de tokens, só para exibir na UI. */
  price: string;
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
    desc: "Rápido, barato e ótimo em tool calling",
    color: "#4285F4",
    price: "$0.50 / $3 por 1M",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    desc: "Melhor raciocínio para tarefas de múltiplos passos",
    color: "#D97757",
    price: "$3 / $15 por 1M",
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    desc: "Custo baixíssimo, contexto de 2M",
    color: "#111111",
    price: "$0.20 / $0.50 por 1M",
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    desc: "Forte em código, preço agressivo",
    color: "#4D6BFE",
    price: "$0.25 / $0.38 por 1M",
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    desc: "O mais capaz para refactors e planos longos",
    color: "#8B5CF6",
    price: "$5 / $25 por 1M",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    desc: "Ultra barato para tarefas simples",
    color: "#10B981",
    price: "$0.10 / $0.40 por 1M",
  },
];

export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: "google/gemini-2.5-flash-image",
    name: "Nano Banana",
    desc: "Gemini 2.5 Flash Image — estável e rápido",
    color: "#FBBC04",
    price: "por token",
  },
  {
    id: "google/gemini-3.1-flash-image",
    name: "Nano Banana 2",
    desc: "Qualidade Pro na velocidade Flash",
    color: "#EA4335",
    price: "por token",
  },
  {
    id: "bytedance-seed/seedream-4.5",
    name: "Seedream 4.5",
    desc: "Preço fixo por imagem, ótimo em composição",
    color: "#EC4899",
    price: "$0.04 / imagem",
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
  /** Modelo de raciocínio do loop do agente. */
  model: string;
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
