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
 * Formato: ReAct clássico (raciocina → chama tool → observa resultado → repete).
 */

import type { ORMessage, ORToolCall, ORUsage } from "@/services/openrouter";
import { chatCompletion, OpenRouterError } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import { searchMemory } from "@/agent/memory";
import { buildMemoryBlock, buildSystemPrompt } from "@/agent/prompt";
import { buildToolPayload, getToolByName, resolveTools } from "@/agent/registry";
import type {
  AgentStep,
  ChatMessage,
  RunAgentOptions,
  RunAgentResult,
  ToolResult,
} from "@/agent/types";

/** Quantos turnos anteriores entram no contexto. */
const HISTORY_WINDOW = 12;

/** Teto de caracteres de um resultado de tool devolvido ao modelo. */
const MAX_TOOL_RESULT_CHARS = 12000;

function toORHistory(history: ChatMessage[]): ORMessage[] {
  return history
    .slice(-HISTORY_WINDOW)
    .filter((m) => m.text.trim().length > 0)
    .map((m) =>
      m.role === "user"
        ? ({ role: "user", content: m.text } as ORMessage)
        : ({ role: "assistant", content: m.text } as ORMessage),
    );
}

/** Os argumentos vêm como string JSON — e às vezes o modelo erra a sintaxe. */
function parseArgs(call: ORToolCall): {
  args: Record<string, unknown>;
  error?: string;
} {
  const raw = call.function.arguments?.trim();
  if (!raw) return { args: {} };

  try {
    const parsed = JSON.parse(raw);
    return {
      args: parsed && typeof parsed === "object" ? parsed : {},
    };
  } catch {
    return {
      args: {},
      error: `Não consegui interpretar os argumentos como JSON: ${raw.slice(0, 200)}`,
    };
  }
}

/** Serializa o resultado para o modelo. Erro vira texto legível, não stack. */
function serializeResult(result: ToolResult): string {
  if (!result.ok) {
    return JSON.stringify({ error: result.error ?? "Falha desconhecida." });
  }

  const payload: Record<string, unknown> = {};
  if (result.summary) payload.summary = result.summary;
  if (result.data !== undefined) payload.data = result.data;
  if (result.url) payload.url = result.url;

  const json = JSON.stringify(payload);
  return json.length > MAX_TOOL_RESULT_CHARS
    ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}... [truncado]`
    : json;
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

export async function runAgent(
  options: RunAgentOptions,
): Promise<RunAgentResult> {
  const { input, history, onEvent, requestApproval, signal } = options;

  const config = await loadConfig();
  const steps: AgentStep[] = [];
  let usage: ORUsage | undefined;

  onEvent({ type: "status", text: "Pensando" });

  // -- Tools disponíveis agora ---------------------------------------------
  const tools = await resolveTools(config);
  const toolPayload = buildToolPayload(tools, config);
  const systemPrompt = buildSystemPrompt(tools, config);

  const messages: ORMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // -- RAG: memórias relevantes ---------------------------------------------
  // Leitura é automática; escrita é deliberada (tool memory_save). O app antigo
  // fazia o contrário: gravava tudo e lia sem filtro.
  if (config.longTermMemory) {
    try {
      const hits = await searchMemory(input, 4, signal);
      if (hits.length) {
        onEvent({ type: "status", text: "Consultando memória" });
        messages.push({ role: "system", content: buildMemoryBlock(hits) });
      }
    } catch {
      // Memória é um bônus. Se o embedding falhar, o turno continua sem ela.
    }
  }

  messages.push(...toORHistory(history));
  messages.push({ role: "user", content: input });

  // -- Loop ReAct -----------------------------------------------------------
  for (let step = 0; step < config.maxSteps; step++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({ type: "status", text: step === 0 ? "Pensando" : "Analisando resultado" });

    let completion;
    try {
      completion = await chatCompletion({
        model: config.model,
        messages,
        tools: toolPayload,
        tool_choice: "auto",
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

    for (const call of toolCalls) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const tool = getToolByName(call.function.name);
      const startedAt = Date.now();

      // O modelo alucinou uma tool que não existe.
      if (!tool) {
        const available = tools.map((t) => t.name).join(", ");
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify({
            error: `A tool "${call.function.name}" não existe. Disponíveis: ${available}. Use uma dessas ou explique ao usuário que não dá para fazer isso.`,
          }),
        });
        continue;
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

      const pushStep = (
        status: AgentStep["status"],
        result?: ToolResult,
      ) => {
        steps.push({
          id: call.id,
          name: tool.name,
          label: tool.label,
          integration: tool.integration,
          args,
          result,
          durationMs: Date.now() - startedAt,
          status,
        });

        if (result) {
          onEvent({
            type: "tool_result",
            id: call.id,
            name: tool.name,
            result,
            durationMs: Date.now() - startedAt,
          });
        }
      };

      const reply = (result: ToolResult) => {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: tool.name,
          content: serializeResult(result),
        });
      };

      if (parseError) {
        const result: ToolResult = { ok: false, error: parseError };
        pushStep("failed", result);
        reply(result);
        continue;
      }

      // -- Human-in-the-loop --------------------------------------------
      // Só para tools que escrevem em sistema externo. Ler um diff não precisa
      // de permissão; abrir um PR precisa.
      if (tool.mutates && config.requireApproval) {
        onEvent({ type: "status", text: "Aguardando sua aprovação" });

        const decision = await requestApproval({
          id: call.id,
          toolName: tool.name,
          label: tool.label,
          integration: tool.integration,
          args,
        });

        // Fail-closed de propósito: só `"approve"` executa. Se a decisão vier
        // undefined, vazia ou qualquer coisa inesperada (modal dispensado, bug
        // futuro em quem chama), a ação NÃO acontece. O contrário — executar em
        // caso de dúvida — significaria abrir PR ou postar no Slack sem
        // ninguém ter dito sim.
        if (decision !== "approve") {
          const result: ToolResult = {
            ok: false,
            error:
              "O usuário recusou esta ação. Não tente de novo nem contorne por outro caminho. Pergunte o que ele quer mudar.",
            summary: "Recusado pelo usuário",
          };
          pushStep("rejected", result);
          reply(result);
          continue;
        }
      }

      // -- Execução ------------------------------------------------------
      onEvent({ type: "status", text: tool.label });

      let result: ToolResult;
      try {
        result = await tool.execute(args, {
          signal,
          progress: (text) => onEvent({ type: "status", text }),
        });
      } catch (err: any) {
        if (err?.name === "AbortError") throw err;
        result = {
          ok: false,
          error: `A tool lançou uma exceção: ${err?.message ?? String(err)}`,
        };
      }

      pushStep(result.ok ? "done" : "failed", result);
      reply(result);
    }
  }

  // -- Estourou o teto de passos -------------------------------------------
  // Uma última chamada sem tools força o modelo a resumir o que conseguiu, em
  // vez de o usuário levar um erro seco depois de N ações já executadas.
  onEvent({ type: "status", text: "Fechando" });

  messages.push({
    role: "system",
    content: `You have reached the maximum of ${config.maxSteps} tool rounds. Stop calling tools. Summarize for the user what you accomplished, what is still pending, and what they should do next.`,
  });

  try {
    const completion = await chatCompletion({
      model: config.model,
      messages,
      temperature: 0.7,
      signal,
    });

    usage = sumUsage(usage, completion.usage);

    // Fallback: se o resumo vier vazio, o usuário levaria uma bolha em branco
    // depois de o agente ter executado N ações. Melhor dizer o que houve.
    const text =
      (completion.choices[0]?.message?.content ?? "").trim() ||
      `Atingi o limite de ${config.maxSteps} passos. Executei ${steps.length} ${steps.length === 1 ? "ação" : "ações"}, mas não fechei a tarefa. Você pode subir esse limite em Ajustes ou quebrar o pedido em partes menores.`;

    onEvent({ type: "final", text, usage, steps: steps.length });
    return { text, steps, usage, transcript: messages };
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;

    const text = `Atingi o limite de ${config.maxSteps} passos sem concluir. Você pode aumentar esse limite em Ajustes ou dividir o pedido em partes menores.`;
    onEvent({ type: "final", text, usage, steps: steps.length });
    return { text, steps, usage, transcript: messages };
  }
}
