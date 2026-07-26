/**
 * Sub-agente.
 *
 * Um mini-loop ReAct isolado, disparado pelo agente principal via a tool
 * `spawn_subagent`. Existe por três motivos:
 *
 *   1. **Economia de contexto.** O main pode estar com 15k tokens de história.
 *      Delegar "revise esses 5 PRs" para um sub-agent com contexto novo custa
 *      uma fração do que empilhar essa varredura no transcript do main. O
 *      main recebe de volta apenas um sumário curto — o transcript do
 *      sub-agent nunca entra no contexto principal.
 *
 *   2. **Paralelização real.** Como `spawn_subagent` é `mutates: false`, o
 *      `run-agent.ts` já joga múltiplas chamadas no bucket de `Promise.all`
 *      de leituras. "Revisa cada um destes 5 PRs" vira 5 sub-agents rodando
 *      em paralelo — sem uma linha nova no loop principal.
 *
 *   3. **Especialização e blast radius.** O sub-agent enxerga só as tools da
 *      allowlist do main (ou o subconjunto read-only inteiro), com system
 *      prompt focado na task. Menos tools = menos ruído = decisões melhores.
 *
 * Restrições intencionais (fail-closed):
 *
 *   - **Sub-agents são read-only.** Só executam tools `mutates: false`. Writes
 *     são responsabilidade do main, que é quem passa pelo modal de aprovação
 *     do usuário. Aprovação aninhada seria confusa e perigosa — o user vê o
 *     payload de uma ação sem saber que foi um sub-agent que decidiu.
 *
 *   - **Sem tools de memória.** Memória é sobre o *user*, não sobre a task de
 *     um sub-agent. O main é quem decide o que salvar depois de receber o
 *     sumário. As `memory_*` são removidas silenciosamente.
 *
 *   - **Sem spawn recursivo.** Sub-agent não pode chamar `spawn_subagent`. A
 *     profundidade é rastreada via `sharedState.subagentDepth`. Depth ≥ 1
 *     no `ToolContext` significa "já sou sub-agent", e a tool retorna erro.
 *     Isso previne loops de spawn queimando crédito.
 *
 *   - **Sem histórico externo.** O sub-agent não recebe `ChatMessage[]` do
 *     main. Contexto único = a task + o brief opcional. É o ponto de
 *     economia.
 *
 *   - **Herda o AbortSignal.** Cancelar o main cancela todos os sub-agents
 *     em voo. Timeout do sub-agent = timeout do main.
 */

import { chatCompletion, OpenRouterError } from "@/services/openrouter";
import type { ORMessage, ORToolCall, ORUsage } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import { buildToolPayload, getToolByName, resolveTools } from "@/agent/registry";
import type {
  AgentEvent,
  AgentStep,
  AgentTool,
  ToolResult,
} from "@/agent/types";
import { serializeResult } from "@/agent/run-agent";

/** Passos deste sub-agent, incluído no retorno pra debug/trace da UI. */
export type SubagentStep = AgentStep;

export type SubagentResult = {
  /** Texto final produzido pelo sub-agent — o "sumário" que volta pro main. */
  text: string;
  /** Steps executados. Servem pra UI mostrar o detalhe se o user expandir. */
  steps: SubagentStep[];
  /** Tokens/cost consumidos. Somados ao total do main na UI. */
  usage?: ORUsage;
  /** Motivo pelo qual o loop terminou — útil pra o main entender o estado. */
  stopReason: "final" | "max_steps" | "error";
  /** Nomes das tools que o sub-agent teve disponíveis. */
  availableTools: string[];
};

export type RunSubagentOptions = {
  /** A missão. Escrita pelo main como se fosse uma instrução pro sub-agent. */
  task: string;
  /**
   * Contexto adicional (fatos, decisões, restrições) que o main quer passar.
   * Vira um bloco `<brief>` no system do sub-agent. Opcional.
   */
  brief?: string;
  /**
   * Allowlist de tools por nome. Se vazio/undefined, o sub-agent enxerga todas
   * as tools read-only disponíveis (menos memória e spawn). Se preenchido,
   * ainda filtramos por `mutates: false` — allowlist não abre exceção pra write.
   */
  toolsAllowlist?: string[];
  /** Recebe status/tool_call/tool_result do sub-agent — a UI conecta no trace. */
  onEvent?: (event: AgentEvent) => void;
  /** Herda do parent — cancelar o main mata o sub-agent. */
  signal?: AbortSignal;
  /** Sobrescreve o teto de rounds. Se ausente, usa `config.subagentMaxSteps`. */
  maxStepsOverride?: number;
};

/** Nomes de tools que um sub-agent nunca enxerga, independente da allowlist. */
const FORBIDDEN_TOOLS = new Set([
  "spawn_subagent", // sem recursão
  "memory_save", // memória é do main
  "memory_search",
  "memory_forget",
]);

/**
 * Máximo de caracteres do sumário retornado ao main. O sub-agent produziu texto
 * livre; se ele resolveu escrever meia biografia, cortamos com aviso pra não
 * inchar o contexto do main — que é justamente o que queríamos evitar.
 */
const MAX_SUMMARY_CHARS = 6000;

// ---------------------------------------------------------------------------
// System prompt do sub-agent
// ---------------------------------------------------------------------------

function buildSubagentSystem(
  tools: AgentTool[],
  brief: string | undefined,
): string {
  const inventory = tools.length
    ? tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")
    : "(no tools available — respond from reasoning alone)";

  return `You are a specialist sub-agent spawned by a main AI agent to complete ONE focused task.

# Rules
- You are read-only. Every tool you can call is a read tool. There are no side effects, no writes, no notifications.
- Do the task, then stop. Return a concise, structured summary of what you found — not a play-by-play of every tool call.
- Reply in the same language as the task. Default to English if unclear.
- Do not ask clarifying questions. If a detail is ambiguous, make the best reasonable assumption and note it in the summary.
- Do not spawn other sub-agents. That capability is disabled here.
- Ground every claim in a tool result. If a tool returns nothing useful, say so plainly — do not invent.
- Keep the final summary tight: bullet points for lists, short paragraphs for explanation, numbers when possible. No preamble. No "I did X then Y".

# Tools available
${inventory}

${brief ? `# Brief from main agent\n${brief.trim()}\n` : ""}
# Output
Your final message will be sent verbatim to the main agent as the tool result. Write it as a report to a peer who needs to act on it, not as a chat reply.`;
}

// ---------------------------------------------------------------------------
// Resolução das tools disponíveis no sub-agent
// ---------------------------------------------------------------------------

/**
 * Aplica as três camadas de filtro: (1) tools proibidas, (2) apenas read
 * (`mutates: false`), (3) allowlist opcional do main. Ordem importa: allowlist
 * roda por último pra que um item na lista mas mutante ainda seja rejeitado.
 */
function filterSubagentTools(
  allResolved: AgentTool[],
  allowlist: string[] | undefined,
): AgentTool[] {
  const allow = allowlist?.length
    ? new Set(allowlist.map((n) => n.trim()).filter(Boolean))
    : null;

  return allResolved.filter((tool) => {
    if (FORBIDDEN_TOOLS.has(tool.name)) return false;
    if (tool.mutates) return false;
    if (allow && !allow.has(tool.name)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Helpers do loop (versões enxutas do que existe em run-agent.ts)
//
// Não reusamos o runAgent inteiro por três motivos:
//   1. Sub-agent não tem approval, não tem memória, não tem histórico. Passar
//      esses parâmetros como null e depender de branches internos poluiria o
//      run-agent.
//   2. O prompt e o formato de saída do sub-agent são diferentes.
//   3. A depth tracking é mais limpa como parâmetro explícito aqui do que como
//      efeito colateral do sharedState do main.
// ---------------------------------------------------------------------------

function parseArgs(call: ORToolCall): {
  args: Record<string, unknown>;
  error?: string;
} {
  const raw = call.function.arguments?.trim();
  if (!raw) return { args: {} };
  try {
    const parsed = JSON.parse(raw);
    return { args: parsed && typeof parsed === "object" ? parsed : {} };
  } catch {
    return {
      args: {},
      error: `Argumentos não são JSON válido: ${raw.slice(0, 200)}. Refaça a chamada.`,
    };
  }
}

function sumUsage(a: ORUsage | undefined, b: ORUsage | undefined): ORUsage {
  return {
    prompt_tokens: (a?.prompt_tokens ?? 0) + (b?.prompt_tokens ?? 0),
    completion_tokens:
      (a?.completion_tokens ?? 0) + (b?.completion_tokens ?? 0),
    total_tokens: (a?.total_tokens ?? 0) + (b?.total_tokens ?? 0),
    cost: (a?.cost ?? 0) + (b?.cost ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Loop principal do sub-agent
// ---------------------------------------------------------------------------

export async function runSubagent(
  options: RunSubagentOptions,
): Promise<SubagentResult> {
  const { task, brief, toolsAllowlist, onEvent, signal, maxStepsOverride } =
    options;

  const config = await loadConfig();
  const steps: SubagentStep[] = [];
  let usage: ORUsage | undefined;

  const maxSteps = maxStepsOverride ?? config.subagentMaxSteps;

  // Escolha do modelo: subagentModel > orchestrationModel > model.
  // Rationale: sub-agent é tarefa focada e curta, casa com modelo mais barato.
  // Se o user não configurou nada específico, cai no orchestrationModel (que
  // ele já pode ter setado pra economia dos passos intermediários), e na
  // ausência disso, no principal.
  const model =
    config.subagentModel ?? config.orchestrationModel ?? config.model;

  const emit = (event: AgentEvent) => onEvent?.(event);
  emit({ type: "status", text: "Sub-agent: iniciando" });

  // Resolve tudo, filtra, monta payload.
  const allResolved = await resolveTools(config);
  const tools = filterSubagentTools(allResolved, toolsAllowlist);
  const toolPayload = buildToolPayload(tools, {
    ...config,
    webSearch: config.webSearch, // sub-agent pode pesquisar se o main pode
  });

  const systemPrompt = buildSubagentSystem(tools, brief);

  const messages: ORMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: task.trim() || "(no task provided)" },
  ];

  const availableTools = tools.map((t) => t.name);

  // -- Loop -----------------------------------------------------------------
  for (let step = 0; step < maxSteps; step++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    emit({ type: "status", text: `Sub-agent: passo ${step + 1}/${maxSteps}` });

    let completion;
    try {
      completion = await chatCompletion({
        model,
        messages,
        tools: toolPayload,
        tool_choice: "auto",
        parallel_tool_calls: true,
        temperature: 0.4, // levemente mais determinístico que o main (0.7)
        signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      const message =
        err instanceof OpenRouterError
          ? err.message
          : `Erro no sub-agent: ${err?.message ?? err}`;
      emit({ type: "error", message });
      return {
        text: `Sub-agent falhou: ${message}`,
        steps,
        usage,
        stopReason: "error",
        availableTools,
      };
    }

    usage = sumUsage(usage, completion.usage);

    const choice = completion.choices[0];
    const message = choice.message;
    const toolCalls = message.tool_calls ?? [];

    // Sem tool calls = terminou.
    if (!toolCalls.length) {
      let text = (message.content ?? "").trim();
      if (!text) {
        text = "Sub-agent terminou sem produzir texto.";
      } else if (text.length > MAX_SUMMARY_CHARS) {
        text =
          text.slice(0, MAX_SUMMARY_CHARS) +
          `\n\n[sumário cortado: ${text.length} chars, teto ${MAX_SUMMARY_CHARS}]`;
      }
      return {
        text,
        steps,
        usage,
        stopReason: "final",
        availableTools,
      };
    }

    // Preserva a mensagem do assistant com os tool_calls no histórico do
    // sub-agent (âncora dos tool_call_id).
    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls,
    });

    // Execução das tools. Sub-agent é read-only — tudo é `Promise.all`, nada
    // é serial, nada passa por approval. Se o modelo pediu uma tool que a
    // gente filtrou (ex: mutante ou proibida), erro estruturado retorna e o
    // modelo se corrige no próximo passo.
    const results = await Promise.all(
      toolCalls.map(async (call): Promise<ORMessage> => {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const tool = getToolByName(call.function.name);
        const startedAt = Date.now();

        const finish = (
          status: AgentStep["status"],
          result: ToolResult,
          args: Record<string, unknown>,
        ): ORMessage => {
          const step: AgentStep = {
            id: call.id,
            name: tool?.name ?? call.function.name,
            label: tool?.label ?? call.function.name,
            integration: tool?.integration ?? "core",
            args,
            result,
            durationMs: Date.now() - startedAt,
            status,
          };
          steps.push(step);
          emit({
            type: "tool_result",
            id: call.id,
            name: step.name,
            result,
            durationMs: step.durationMs ?? 0,
          });
          return {
            role: "tool",
            tool_call_id: call.id,
            name: tool?.name ?? call.function.name,
            content: serializeResult(result),
          };
        };

        // Tool não existe (alucinada) OU foi filtrada.
        if (!tool || !tools.find((t) => t.name === tool.name)) {
          const available = tools.map((t) => t.name).join(", ") || "(nenhuma)";
          const result: ToolResult = {
            ok: false,
            error: `A tool "${call.function.name}" não está disponível neste sub-agent (é write, foi filtrada pela allowlist, ou não existe). Disponíveis: ${available}. Não tente essa. Termine a task com o que tem.`,
          };
          return finish("failed", result, {});
        }

        const { args, error: parseError } = parseArgs(call);

        emit({
          type: "tool_call",
          id: call.id,
          name: tool.name,
          label: `Sub-agent: ${tool.label}`,
          integration: tool.integration,
          args,
        });

        if (parseError) {
          return finish("failed", { ok: false, error: parseError }, args);
        }

        let result: ToolResult;
        try {
          result = await tool.execute(args, {
            signal,
            progress: (text) =>
              emit({ type: "status", text: `Sub-agent: ${text}` }),
            // Marca `subagentDepth: 1` no sharedState de todas as tools que
            // rodam aqui dentro. É a segunda camada de defesa contra recursão:
            // mesmo que um bug futuro deixe `spawn_subagent` vazar pra lista
            // de tools do sub-agent, a checagem `depth >= 1` no execute da
            // tool aborta antes de disparar outro loop. Se o main um dia
            // precisar propagar outro estado (ex.: budget de tokens
            // agregado), adiciona aqui.
            sharedState: { subagentDepth: 1 },
          });
        } catch (err: any) {
          if (err?.name === "AbortError") throw err;
          result = {
            ok: false,
            error: `Tool lançou exceção: ${err?.message ?? String(err)}`,
          };
        }

        return finish(result.ok ? "done" : "failed", result, args);
      }),
    );

    for (const toolMessage of results) messages.push(toolMessage);
  }

  // -- Estourou o teto ------------------------------------------------------
  // Uma última chamada sem tools força uma síntese. É o mesmo padrão do main.
  emit({ type: "status", text: "Sub-agent: fechando" });

  messages.push({
    role: "system",
    content: `You have reached the maximum of ${maxSteps} tool rounds. Stop calling tools. Write a concise final summary of what you found and what remains unknown.`,
  });

  try {
    const completion = await chatCompletion({
      model,
      messages,
      temperature: 0.4,
      signal,
    });

    usage = sumUsage(usage, completion.usage);

    let text =
      (completion.choices[0]?.message?.content ?? "").trim() ||
      `Sub-agent atingiu o limite de ${maxSteps} passos sem concluir.`;

    if (text.length > MAX_SUMMARY_CHARS) {
      text =
        text.slice(0, MAX_SUMMARY_CHARS) +
        `\n\n[sumário cortado: ${text.length} chars, teto ${MAX_SUMMARY_CHARS}]`;
    }

    return {
      text,
      steps,
      usage,
      stopReason: "max_steps",
      availableTools,
    };
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;

    return {
      text: `Sub-agent atingiu ${maxSteps} passos e falhou na síntese final: ${err?.message ?? err}`,
      steps,
      usage,
      stopReason: "error",
      availableTools,
    };
  }
}
