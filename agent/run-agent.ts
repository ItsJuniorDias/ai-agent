/**
 * O loop do agente.
 *
 * Este arquivo é o coração do refactor. O app antigo tinha isto aqui:
 *
 *     switch (activeIntegration) {
 *       case "github": await processGitHubAction(input); break;
 *       case "jira":   await processJiraAction(input);   break;
 *       ...
 *     }
 *
 * A IA nunca decidia nada — o usuário escolhia a integração no onboarding e o
 * texto cru ia para uma função hardcoded. Agora o modelo recebe o catálogo de
 * tools e ele mesmo decide o quê chamar, com quais argumentos, em que ordem, e
 * quando parar. Isso é a diferença entre um chat com atalhos e um agente.
 *
 * Formato: ReAct clássico (raciocina → chama tool → observa resultado → repete),
 * com quatro decisões finas que valem explicação:
 *
 *   1. **Continuidade multi-turno via reconstrução.** O histórico da conversa
 *      é convertido em `ORMessage[]` completo — assistant + tool_calls + tool
 *      results — a partir dos `steps` gravados em cada mensagem. Turnos futuros
 *      enxergam exatamente o que foi lido/executado antes, não só o texto do
 *      resumo. Sem isso, "e aquele PR que tu revisou?" vira alucinação.
 *
 *   2. **Reads em paralelo, writes serial.** Quando o modelo pede N tools num
 *      turno, separamos por `mutates`: leituras (`false`) rodam em `Promise.all`
 *      e writes (`true`) ficam serial porque cada uma precisa passar pelo
 *      handler de aprovação humana — abrir 3 modais ao mesmo tempo seria caos.
 *
 *   3. **Roteamento de modelo.** Se `config.orchestrationModel` estiver setado,
 *      o passo 0 (planejamento inicial) e a síntese final forçada usam o
 *      `model` principal; os passos intermediários usam o mais barato. Padrão
 *      que economiza 40-60% em runs de 3+ passos sem perder qualidade.
 *
 *   4. **Truncação estruturada.** Resultados grandes viram `{data, meta:{truncated,
 *      total, shown, hint}}` em vez de uma string cortada no meio, para o modelo
 *      saber que precisa refinar a chamada em vez de trabalhar com lixo.
 */

import type { ORMessage, ORToolCall, ORUsage } from "@/services/openrouter";
import { chatCompletion, OpenRouterError } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import { searchMemory } from "@/agent/memory";
import { buildMemoryBlock, buildSystemPrompt } from "@/agent/prompt";
import {
  buildToolPayload,
  getToolByName,
  resolveTools,
} from "@/agent/registry";
import type {
  AgentStep,
  ChatMessage,
  RunAgentOptions,
  RunAgentResult,
  ToolResult,
} from "@/agent/types";

/**
 * Budget de caracteres do histórico que vai para o modelo. Substitui o antigo
 * `HISTORY_WINDOW = 12` (contagem de mensagens): com 12 turnos curtos cabia
 * folgado, com 12 turnos que anexaram diffs de PR o contexto explodia. Agora
 * pegamos do mais novo para o mais antigo até bater o teto — o turno atual do
 * usuário sempre entra, e cortamos os mais antigos.
 * ~40k chars ≈ 10k tokens, sobra espaço para system + tools + resposta.
 */
const HISTORY_BUDGET_CHARS = 40000;

/** Teto de caracteres de um resultado de tool devolvido ao modelo. */
const MAX_TOOL_RESULT_CHARS = 12000;

/** Quantos itens preservar quando `data` é um array longo demais. */
const ARRAY_TRUNCATE_KEEP = 20;

// ---------------------------------------------------------------------------
// Reconstrução do histórico ORMessage[] a partir dos ChatMessage persistidos
// ---------------------------------------------------------------------------

/**
 * Uma mensagem do modelo pode ter usado várias tools naquele turno. Aqui
 * reconstituímos aquilo em formato ORMessage — assistant com `tool_calls`,
 * seguido de N `tool` results, seguido opcionalmente do texto final do
 * assistant. O `tool_call_id` de cada step é o mesmo que veio da API na hora,
 * então a âncora bate.
 */
function chatMessageToOR(msg: ChatMessage): ORMessage[] {
  if (msg.role === "user") {
    return msg.text.trim().length ? [{ role: "user", content: msg.text }] : [];
  }

  const out: ORMessage[] = [];

  if (msg.steps?.length) {
    out.push({
      role: "assistant",
      content: null,
      tool_calls: msg.steps.map((step) => ({
        id: step.id,
        type: "function" as const,
        function: {
          name: step.name,
          arguments: JSON.stringify(step.args ?? {}),
        },
      })),
    });

    for (const step of msg.steps) {
      out.push({
        role: "tool",
        tool_call_id: step.id,
        name: step.name,
        content: step.result
          ? serializeResult(step.result)
          : JSON.stringify({ error: "Sem resultado registrado." }),
      });
    }
  }

  if (msg.text?.trim()) {
    out.push({ role: "assistant", content: msg.text });
  }

  return out;
}

/**
 * Monta o histórico em ORMessage[] respeitando o budget de caracteres.
 * Percorre do mais recente para o mais antigo, acumulando até bater o teto —
 * a mensagem mais nova nunca é descartada.
 */
function toORHistory(history: ChatMessage[]): ORMessage[] {
  const collected: ORMessage[][] = [];
  let total = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const chunk = chatMessageToOR(history[i]);
    if (!chunk.length) continue;

    const size = chunk.reduce(
      (n, m) => n + JSON.stringify(m).length,
      0,
    );

    // Sempre inclui pelo menos a mensagem mais recente, mesmo se estourar.
    if (total + size > HISTORY_BUDGET_CHARS && collected.length > 0) break;

    collected.unshift(chunk);
    total += size;
  }

  return collected.flat();
}

// ---------------------------------------------------------------------------
// Parse e serialização de argumentos/resultados
// ---------------------------------------------------------------------------

/** Os argumentos vêm como string JSON — e às vezes o modelo erra a sintaxe. */
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
      error: `Não consegui interpretar os argumentos como JSON: ${raw.slice(0, 200)}. Refaça a chamada com um objeto JSON válido, mais enxuto.`,
    };
  }
}

/**
 * Serializa o resultado para o modelo.
 *
 * Três correções em cima da versão anterior:
 *
 *   1. Erros agora carregam também o `summary` — antes só `{error}` ia, e um
 *      step "Recusado pelo usuário" chegava ao modelo apenas como erro genérico,
 *      perdendo o sinal forte de que a intenção do usuário foi *não fazer*.
 *
 *   2. Arrays grandes viram `{data: primeiros N, meta: {truncated, total,
 *      shown, hint}}` — o modelo lê o `hint` e sabe refinar `limit`/filtros na
 *      próxima chamada em vez de trabalhar com um pedaço arbitrário.
 *
 *   3. Strings longas em `data` (típico: diff de PR gigante) cortam com hint
 *      acionável indicando o que chamar em seguida, em vez de virar `...
 *      [truncado]` sem contexto.
 */
export function serializeResult(result: ToolResult): string {
  if (!result.ok) {
    const payload: Record<string, unknown> = {
      error: result.error ?? "Falha desconhecida.",
    };
    if (result.summary) payload.summary = result.summary;
    return JSON.stringify(payload);
  }

  const payload: Record<string, unknown> = {};
  if (result.summary) payload.summary = result.summary;
  if (result.url) payload.url = result.url;

  if (result.data !== undefined) {
    if (Array.isArray(result.data) && result.data.length > ARRAY_TRUNCATE_KEEP) {
      payload.data = result.data.slice(0, ARRAY_TRUNCATE_KEEP);
      payload.meta = {
        truncated: true,
        total: result.data.length,
        shown: ARRAY_TRUNCATE_KEEP,
        hint: `Só os primeiros ${ARRAY_TRUNCATE_KEEP} de ${result.data.length}. Se o item que você procura pode não estar aqui, chame de novo com filtros/argumentos mais estreitos.`,
      };
    } else {
      payload.data = result.data;
    }
  }

  let json = JSON.stringify(payload);
  if (json.length <= MAX_TOOL_RESULT_CHARS) return json;

  // Se o gigante é uma string dentro de data (diff de PR, corpo de doc),
  // trunca ela especificamente com hint estruturado.
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    const data = payload.data as Record<string, unknown>;
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (typeof val === "string" && val.length > 4000) {
        const originalLen = val.length;
        const overshoot = json.length - MAX_TOOL_RESULT_CHARS;
        const cutTo = Math.max(2000, val.length - overshoot - 500);
        data[key] = val.slice(0, cutTo);
        payload.meta = {
          truncated: true,
          field: key,
          original_chars: originalLen,
          shown_chars: cutTo,
          hint: `O campo "${key}" foi cortado (${originalLen} chars). Se precisar do resto, chame a tool de novo com argumentos que estreitem o escopo (ex.: file path específico, range de linhas) em vez de tentar processar tudo.`,
        };
        json = JSON.stringify(payload);
        if (json.length <= MAX_TOOL_RESULT_CHARS) return json;
      }
    }
  }

  // Último fallback: corte cego com aviso — evita crescer indefinidamente.
  return `${json.slice(0, MAX_TOOL_RESULT_CHARS)}... [truncado; resultado excedeu ${MAX_TOOL_RESULT_CHARS} chars]`;
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
// Guarda: memória só quando faz sentido
// ---------------------------------------------------------------------------

/**
 * Padrões de confirmação curta em PT/EN que não trazem contexto novo pra
 * pesquisar. Antes fazíamos embed em *todo* input, gastando um /embeddings
 * request por "ok"/"vai" — dinheiro e latência à toa.
 */
const CONFIRMATION_PATTERN =
  /^(sim|ok|okay|blz|beleza|show|top|fechou|isso|isso mesmo|exato|correto|certo|obrigad[oa]|obg|valeu|vlw|thanks|thx|yes|yeah|yep|nope|n[aã]o|no|cancela|cancel|pode|pode ir|vai|manda|manda ver)[\s!.,?]*$/i;

function shouldSearchMemory(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 20) return false;
  if (CONFIRMATION_PATTERN.test(trimmed)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------------------

export async function runAgent(
  options: RunAgentOptions,
): Promise<RunAgentResult> {
  const {
    input,
    history,
    onEvent,
    requestApproval,
    signal,
    toolFilter,
    extraSystem,
    maxStepsOverride,
    sharedState: initialSharedState,
  } = options;

  const config = await loadConfig();
  const steps: AgentStep[] = [];
  let usage: ORUsage | undefined;

  /** Estado compartilhado entre tools no turno atual (não persistido). */
  const sharedState: Record<string, unknown> = { ...(initialSharedState ?? {}) };

  /** Teto efetivo de rounds — a varredura em background passa um valor menor. */
  const maxSteps = maxStepsOverride ?? config.maxSteps;

  onEvent({ type: "status", text: "Pensando" });

  // -- Tools disponíveis agora ---------------------------------------------
  const resolved = await resolveTools(config);
  const tools = toolFilter ? resolved.filter(toolFilter) : resolved;
  const toolPayload = buildToolPayload(tools, config);
  const systemPrompt = buildSystemPrompt(tools, config);

  const messages: ORMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  if (extraSystem?.trim()) {
    messages.push({ role: "system", content: extraSystem.trim() });
  }

  // -- RAG: memórias relevantes --------------------------------------------
  // Só faz embed se o input tem substância. Confirmações curtas ("ok", "sim")
  // não trazem contexto novo — pesquisar por elas gasta request e devolve ruído.
  if (config.longTermMemory && shouldSearchMemory(input)) {
    try {
      const hits = await searchMemory(input, 4, signal);
      if (hits.length) {
        onEvent({ type: "status", text: "Consultando memória" });
        messages.push({ role: "system", content: buildMemoryBlock(hits) });
      }
    } catch {
      // Memória é bônus. Falhou o embedding, o turno continua sem ela.
    }
  }

  messages.push(...toORHistory(history));
  messages.push({ role: "user", content: input });

  // -- Loop ReAct -----------------------------------------------------------
  for (let step = 0; step < maxSteps; step++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({
      type: "status",
      text: step === 0 ? "Pensando" : "Analisando resultado",
    });

    // Roteamento de modelo: passo 0 usa o principal (planejamento inicial
    // ganha com o modelo forte); passos intermediários, se um modelo de
    // orquestração está configurado, usam ele (mais barato). Síntese final
    // fora do loop também usa o principal.
    const modelForStep =
      step === 0 || !config.orchestrationModel
        ? config.model
        : config.orchestrationModel;

    let completion;
    try {
      completion = await chatCompletion({
        model: modelForStep,
        messages,
        tools: toolPayload,
        tool_choice: "auto",
        // Deixa o modelo pedir várias tools num mesmo turno quando faz sentido —
        // rodamos as leituras em paralelo abaixo.
        parallel_tool_calls: true,
        temperature: 0.7,
        signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;

      const message =
        err instanceof OpenRouterError
          ? err.message
          : `Erro inesperado: ${err?.message ?? err}`;

      onEvent({ type: "error", message });
      throw err;
    }

    usage = sumUsage(usage, completion.usage);

    const choice = completion.choices[0];
    const message = choice.message;
    const toolCalls = message.tool_calls ?? [];

    // Sem tool calls = o modelo terminou.
    if (!toolCalls.length) {
      const text = (message.content ?? "").trim();

      messages.push({ role: "assistant", content: text });

      onEvent({
        type: "final",
        text: text || "Terminei, mas não gerei nenhum texto de resposta.",
        usage,
        steps: steps.length,
      });

      return { text, steps, usage, transcript: messages };
    }

    // Preserva a mensagem do assistente *com* os tool_calls. Obrigatório:
    // toda mensagem `tool` precisa ancorar num `tool_call_id` que existe no
    // histórico, senão a API rejeita a próxima request.
    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls,
    });

    // ---------------------------------------------------------------------
    // Executa as tool calls. Separação leituras vs writes:
    //   - leituras (mutates:false) → Promise.all, sem aprovação
    //   - writes (mutates:true)    → serial, cada uma pelo requestApproval
    //   - tools inexistentes       → tratamos serial junto com writes por
    //                                 segurança e simplicidade
    // ---------------------------------------------------------------------

    type Outcome = { toolMessage: ORMessage };

    const executeSingle = async (call: ORToolCall): Promise<Outcome> => {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const tool = getToolByName(call.function.name);
      const startedAt = Date.now();

      const registerStep = (
        status: AgentStep["status"],
        result?: ToolResult,
      ): AgentStep => {
        const registered: AgentStep = {
          id: call.id,
          name: tool?.name ?? call.function.name,
          label: tool?.label ?? call.function.name,
          integration: tool?.integration ?? "core",
          args: {},
          result,
          durationMs: Date.now() - startedAt,
          status,
        };
        steps.push(registered);
        if (result) {
          onEvent({
            type: "tool_result",
            id: call.id,
            name: registered.name,
            result,
            durationMs: registered.durationMs ?? 0,
          });
        }
        return registered;
      };

      const asToolMessage = (result: ToolResult): ORMessage => ({
        role: "tool",
        tool_call_id: call.id,
        name: tool?.name ?? call.function.name,
        content: serializeResult(result),
      });

      // Tool alucinada.
      if (!tool) {
        const available = tools.map((t) => t.name).join(", ");
        const result: ToolResult = {
          ok: false,
          error: `A tool "${call.function.name}" não existe. Disponíveis: ${available}. Use uma dessas ou explique ao usuário que não dá para fazer isso.`,
        };
        registerStep("failed", result);
        return { toolMessage: asToolMessage(result) };
      }

      const { args, error: parseError } = parseArgs(call);

      onEvent({
        type: "tool_call",
        id: call.id,
        name: tool.name,
        label: tool.label,
        integration: tool.integration,
        args,
      });

      // Registrar args no step:
      const stepArgsPatch = (registered: AgentStep) => {
        registered.args = args;
      };

      if (parseError) {
        const result: ToolResult = { ok: false, error: parseError };
        stepArgsPatch(registerStep("failed", result));
        return { toolMessage: asToolMessage(result) };
      }

      if (tool.mutates && config.requireApproval) {
        onEvent({ type: "status", text: "Aguardando sua aprovação" });

        const decision = await requestApproval({
          id: call.id,
          toolName: tool.name,
          label: tool.label,
          integration: tool.integration,
          args,
        });

        // Fail-closed: só "approve" executa.
        if (decision !== "approve") {
          const result: ToolResult = {
            ok: false,
            error:
              "O usuário recusou esta ação. Não tente de novo nem contorne por outro caminho. Pergunte o que ele quer mudar.",
            summary: "Recusado pelo usuário",
          };
          stepArgsPatch(registerStep("rejected", result));
          return { toolMessage: asToolMessage(result) };
        }
      }

      onEvent({ type: "status", text: tool.label });

      let result: ToolResult;
      try {
        result = await tool.execute(args, {
          signal,
          progress: (text) => onEvent({ type: "status", text }),
          sharedState,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") throw err;
        result = {
          ok: false,
          error: `A tool lançou uma exceção: ${err?.message ?? String(err)}`,
        };
      }

      stepArgsPatch(registerStep(result.ok ? "done" : "failed", result));
      return { toolMessage: asToolMessage(result) };
    };

    // Particiona as calls. Tool desconhecida entra no "serial" só por
    // conservadorismo — não custa nada rodar uma a uma nesses casos raros.
    const readCalls: ORToolCall[] = [];
    const writeCalls: ORToolCall[] = [];
    for (const call of toolCalls) {
      const tool = getToolByName(call.function.name);
      if (tool && !tool.mutates) readCalls.push(call);
      else writeCalls.push(call);
    }

    // Leituras: Promise.all. Todas rodam em paralelo, ganho de latência
    // quando o modelo pediu, ex., PRs do GitHub + MRs do GitLab de uma vez.
    const readOutcomes = readCalls.length
      ? await Promise.all(readCalls.map(executeSingle))
      : [];

    // Writes: serial, para o handler de aprovação humana processar uma por
    // vez — abrir vários modais simultâneos seria caótico.
    const writeOutcomes: Outcome[] = [];
    for (const call of writeCalls) {
      writeOutcomes.push(await executeSingle(call));
    }

    // Anexa os `tool` messages preservando a ordem original dos tool_calls,
    // que é o que a API espera pra fazer bater os tool_call_id.
    const byId = new Map<string, Outcome>();
    for (let i = 0; i < readCalls.length; i++)
      byId.set(readCalls[i].id, readOutcomes[i]);
    for (let i = 0; i < writeCalls.length; i++)
      byId.set(writeCalls[i].id, writeOutcomes[i]);

    for (const call of toolCalls) {
      const outcome = byId.get(call.id);
      if (outcome) messages.push(outcome.toolMessage);
    }
  }

  // -- Estourou o teto de passos -------------------------------------------
  // Uma última chamada sem tools força o modelo a resumir o que conseguiu.
  // Sempre com o modelo principal — a síntese final não é lugar de economizar.
  onEvent({ type: "status", text: "Fechando" });

  messages.push({
    role: "system",
    content: `You have reached the maximum of ${maxSteps} tool rounds. Stop calling tools. Summarize for the user what you accomplished, what is still pending, and what they should do next.`,
  });

  try {
    const completion = await chatCompletion({
      model: config.model,
      messages,
      temperature: 0.7,
      signal,
    });

    usage = sumUsage(usage, completion.usage);

    const text =
      (completion.choices[0]?.message?.content ?? "").trim() ||
      `Atingi o limite de ${maxSteps} passos. Executei ${steps.length} ${steps.length === 1 ? "ação" : "ações"}, mas não fechei a tarefa. Você pode subir esse limite em Ajustes ou quebrar o pedido em partes menores.`;

    onEvent({ type: "final", text, usage, steps: steps.length });
    return { text, steps, usage, transcript: messages };
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;

    const text = `Atingi o limite de ${maxSteps} passos sem concluir. Você pode aumentar esse limite em Ajustes ou dividir o pedido em partes menores.`;
    onEvent({ type: "final", text, usage, steps: steps.length });
    return { text, steps, usage, transcript: messages };
  }
}
