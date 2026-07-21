/**
 * Tipos centrais do agente.
 *
 * O modelo mental: uma `AgentTool` é uma função pura com um contrato JSON
 * Schema. O agente (runAgent) não sabe o que cada tool faz — ele só passa a
 * lista pro modelo, recebe de volta `tool_calls` e executa.
 */

import type { ORMessage, ORUsage } from "@/services/openrouter";

/** IDs das integrações. Casam com as rotas em app/(nome)/index.tsx. */
export type IntegrationId =
  | "github"
  | "gitlab"
  | "jira"
  | "linear"
  | "slack"
  | "discord"
  | "teams"
  | "whatsapp"
  | "gmail"
  | "figma"
  | "vercel"
  | "notion"
  | "core";

export type ToolResult = {
  ok: boolean;
  /** Payload devolvido ao modelo. Mantenha enxuto — vira token. */
  data?: unknown;
  /** Mensagem de erro devolvida ao modelo para ele se corrigir. */
  error?: string;
  /** Resumo curto de uma linha, exibido no trace da UI. */
  summary?: string;
  /** Link para o recurso criado, se houver. Vira botão na UI. */
  url?: string;
};

export type ToolContext = {
  signal?: AbortSignal;
  /** Manda um status para a UI durante uma execução longa. */
  progress: (text: string) => void;
};

export type AgentTool = {
  name: string;
  integration: IntegrationId;
  /** Rótulo curto pra UI, ex.: "Criando Pull Request". */
  label: string;
  description: string;
  /** JSON Schema dos argumentos (formato function calling da OpenAI). */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /**
   * `true` quando a tool escreve em um sistema externo — abrir PR, mandar
   * mensagem, subir deploy. Essas passam pelo fluxo de aprovação humana.
   * Tools de leitura rodam direto.
   */
  mutates: boolean;
  /** Checa se as credenciais dessa integração estão salvas. */
  isConfigured: () => Promise<boolean>;
  execute: (args: any, ctx: ToolContext) => Promise<ToolResult>;
};

// ---------------------------------------------------------------------------
// Aprovação humana
// ---------------------------------------------------------------------------

export type ApprovalRequest = {
  id: string;
  toolName: string;
  label: string;
  integration: IntegrationId;
  args: Record<string, unknown>;
};

export type ApprovalDecision = "approve" | "reject";

export type ApprovalHandler = (
  request: ApprovalRequest,
) => Promise<ApprovalDecision>;

// ---------------------------------------------------------------------------
// Eventos emitidos durante a execução
// ---------------------------------------------------------------------------

export type AgentEvent =
  /** Mudou o estágio: "Pensando", "Consultando memória"... */
  | { type: "status"; text: string }
  /** O modelo pediu uma tool. Ainda não executou. */
  | {
      type: "tool_call";
      id: string;
      name: string;
      label: string;
      integration: IntegrationId;
      args: Record<string, unknown>;
    }
  /** A tool terminou (com sucesso, erro ou recusada pelo usuário). */
  | {
      type: "tool_result";
      id: string;
      name: string;
      result: ToolResult;
      durationMs: number;
    }
  /** Resposta final em texto. */
  | { type: "final"; text: string; usage?: ORUsage; steps: number }
  | { type: "error"; message: string };

export type AgentStep = {
  id: string;
  name: string;
  label: string;
  integration: IntegrationId;
  args: Record<string, unknown>;
  result?: ToolResult;
  durationMs?: number;
  status: "running" | "done" | "failed" | "rejected";
};

// ---------------------------------------------------------------------------
// Conversa
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: "user" | "model";
  text: string;
  /** Trace das tools usadas para produzir esta mensagem. */
  steps?: AgentStep[];
};

export type StoredConversation = {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
};

export type RunAgentOptions = {
  input: string;
  /** Histórico da conversa atual, na ordem cronológica. */
  history: ChatMessage[];
  onEvent: (event: AgentEvent) => void;
  requestApproval: ApprovalHandler;
  signal?: AbortSignal;
  /**
   * Peneira extra sobre as tools resolvidas. Usada pelo assistente em background
   * para expor só tools de leitura + notificação — nada que escreva num sistema
   * externo roda sem um humano na frente da tela.
   */
  toolFilter?: (tool: AgentTool) => boolean;
  /**
   * Bloco de sistema adicional, injetado logo após o system prompt base. É por
   * onde o modo background diz ao modelo que ele não está num chat ao vivo e que
   * a única forma de alcançar o usuário é a tool notify_now.
   */
  extraSystem?: string;
  /** Sobrescreve o teto de rounds do config (a varredura usa um número baixo). */
  maxStepsOverride?: number;
};

export type RunAgentResult = {
  text: string;
  steps: AgentStep[];
  usage?: ORUsage;
  /** Transcript cru, útil para debug. */
  transcript: ORMessage[];
};
