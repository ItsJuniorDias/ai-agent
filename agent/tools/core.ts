/**
 * Tools nativas do agente — não dependem de nenhuma integração externa.
 */

import * as FileSystem from "expo-file-system/legacy";
import type { AgentTool } from "@/agent/types";
import { forgetMemory, saveMemory, searchMemory } from "@/agent/memory";
import { generateImage } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import { runSubagent } from "@/agent/subagent";
import { fail, ok } from "./_utils";

export const memorySave: AgentTool = {
  name: "memory_save",
  integration: "core",
  label: "Memorizando",
  description:
    "Guarda um fato sobre o usuário na memória de longo prazo, disponível em todas as conversas futuras. Use para preferências duráveis, nomes de projetos, stack, convenções de equipe. NÃO use para conversa passageira nem para o conteúdo da mensagem atual.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      fact: {
        type: "string",
        description:
          "O fato, em uma frase autocontida. Ex.: 'O usuário prefere Fastify a Express em projetos de backend.'",
      },
    },
    required: ["fact"],
  },
  async execute(args, ctx) {
    const cfg = await loadConfig();
    if (!cfg.longTermMemory)
      return fail(
        "A memória de longo prazo está desligada nos Ajustes. Avise o usuário.",
      );

    try {
      await saveMemory(args.fact, ctx.signal);
      return ok(`Memorizado: ${args.fact}`);
    } catch (err: any) {
      return fail(`Falha ao salvar memória: ${err.message}`);
    }
  },
};

export const memorySearch: AgentTool = {
  name: "memory_search",
  integration: "core",
  label: "Consultando memória",
  description:
    "Busca na memória de longo prazo por assunto. As memórias mais relevantes já são injetadas automaticamente a cada turno — só chame isso se precisar procurar algo específico que não apareceu.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "O que procurar." },
    },
    required: ["query"],
  },
  async execute(args, ctx) {
    try {
      const hits = await searchMemory(args.query, 6, ctx.signal);
      if (!hits.length) return ok("Nada relevante na memória", []);

      return ok(
        `${hits.length} memória(s) encontrada(s)`,
        hits.map((h) => ({ fact: h.text, relevance: h.score.toFixed(2) })),
      );
    } catch (err: any) {
      return fail(`Falha ao buscar na memória: ${err.message}`);
    }
  },
};

export const memoryForget: AgentTool = {
  name: "memory_forget",
  integration: "core",
  label: "Esquecendo",
  description:
    "Apaga da memória de longo prazo tudo que contiver um termo (busca por substring, case-insensitive). Use quando o usuário pedir para esquecer algo. O usuário verá o termo exato que será usado e precisa aprovar antes — ação irreversível.",
  // mutates:true porque apagar memória não tem undo. O modal de aprovação
  // mostra ao usuário exatamente qual termo vai casar antes do apagamento,
  // evitando que "esquece o projeto Pedagogy" nuke memórias tangencialmente
  // relacionadas sem confirmação.
  mutates: true,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Termo. Toda memória que contiver isso é apagada.",
      },
    },
    required: ["query"],
  },
  async execute(args) {
    const removed = await forgetMemory(args.query);
    return ok(
      removed
        ? `${removed} memória(s) apagada(s)`
        : "Nenhuma memória correspondia a esse termo",
    );
  },
};

export const generateImageTool: AgentTool = {
  name: "generate_image",
  integration: "core",
  label: "Gerando imagem",
  description:
    "Gera uma imagem a partir de uma descrição textual e salva no dispositivo. Escreva um prompt visual rico — descreva composição, iluminação e estilo, não só o objeto.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Descrição visual detalhada da imagem.",
      },
      aspect_ratio: {
        type: "string",
        description: "Ex.: 1:1, 16:9, 9:16, 4:3. Padrão: 1:1.",
      },
    },
    required: ["prompt"],
  },
  async execute(args, ctx) {
    const cfg = await loadConfig();

    try {
      ctx.progress("Renderizando imagem...");

      const image = await generateImage({
        model: cfg.imageModel,
        prompt: args.prompt,
        aspectRatio: args.aspect_ratio,
        signal: ctx.signal,
      });

      // A imagem volta como data URL. Grava em cache e devolve um file:// URI —
      // data URLs de vários MB dentro do estado do React travam a UI.
      const base64 = image.dataUrl.split(",")[1] ?? "";
      const uri = `${FileSystem.cacheDirectory}agent-image-${Date.now()}.png`;

      await FileSystem.writeAsStringAsync(uri, base64, { encoding: "base64" });

      return ok(
        "Imagem gerada",
        {
          // Só o caminho vai para o contexto do modelo. Mandar o base64 de volta
          // custaria milhares de tokens sem nenhum ganho.
          saved_to: uri,
          note: "A imagem já foi mostrada ao usuário no chat. Descreva o que você criou, não repita o caminho do arquivo.",
        },
        uri,
      );
    } catch (err: any) {
      return fail(`Falha ao gerar imagem: ${err.message}`);
    }
  },
};

export const getCurrentDateTime: AgentTool = {
  name: "get_current_datetime",
  integration: "core",
  label: "Checando a data",
  description:
    "Retorna a data e hora atuais do dispositivo. Use antes de qualquer raciocínio sobre prazos, 'hoje', 'esta semana' ou agendamento.",
  mutates: false,
  isConfigured: async () => true,
  parameters: { type: "object", properties: {} },
  async execute() {
    const now = new Date();
    return ok(now.toISOString(), {
      iso: now.toISOString(),
      local: now.toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      unix: Math.floor(now.getTime() / 1000),
    });
  },
};

/**
 * spawn_subagent — delega uma sub-tarefa isolada a outro loop do agente.
 *
 * Por que existe:
 *
 *   - Contexto isolado: o sub-agent começa com history vazio. Se o main já
 *     acumulou muitos tokens de conversa, delegar "revise esses N PRs"
 *     custa uma fração do que empilhar a varredura no contexto do main.
 *
 *   - Paralelização: como esta tool é `mutates: false`, o loop principal já
 *     joga múltiplas chamadas de spawn_subagent no bucket de `Promise.all`
 *     de leituras. "Um sub-agent por PR" roda de fato em paralelo sem
 *     código novo no run-agent.
 *
 *   - Especialização: dá pra restringir as tools que o sub-agent enxerga
 *     via `tools`, e escrever um brief focado — menos ruído = decisão melhor.
 *
 * Guarda contra recursão: se este `execute` é chamado *dentro* de um
 * sub-agent (mesmo que a resolução de tools tenha vazado a spawn_subagent
 * pra ele por algum bug futuro), o `sharedState.subagentDepth ≥ 1`
 * imediatamente falha. Sub-agents não abrem outros sub-agents.
 */
export const spawnSubagent: AgentTool = {
  name: "spawn_subagent",
  integration: "core",
  label: "Delegando ao sub-agente",
  description:
    "Delega uma sub-tarefa focada a um sub-agent isolado. O sub-agent tem contexto próprio (não vê seu histórico), pode chamar apenas tools de leitura, e devolve UM sumário estruturado com o que encontrou. Use quando: (a) a tarefa pode ser feita por outro agente sem intervenção sua no meio do caminho — típico de 'colete essas N infos independentes' — ou (b) a subtarefa envolveria muitos passos de leitura que iriam inchar seu contexto atual. Para trabalho em paralelo (ex.: revisar 5 PRs), chame spawn_subagent 5 vezes na mesma resposta — eles rodam simultaneamente. Não use para writes; qualquer ação que altera algo externo é sua responsabilidade, com aprovação do usuário.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description:
          "A missão do sub-agent. Escreva como uma instrução curta e concreta, com critério de sucesso ('liste', 'compare', 'identifique', 'me diga se X'). Ex.: 'Liste todos os PRs abertos no repo octocat/hello-world com pelo menos 200 linhas de diff, e para cada um retorne número, título e URL.'",
      },
      brief: {
        type: "string",
        description:
          "Opcional. Contexto extra que o sub-agent precisa saber pra decidir bem: fatos que só você tem, restrições, conveções da equipe. NÃO copie aqui o histórico da conversa — o valor do sub-agent está justamente em começar com contexto enxuto.",
      },
      tools: {
        type: "array",
        items: { type: "string" },
        description:
          "Opcional. Allowlist de tools por nome (ex.: ['github_list_pull_requests', 'github_get_pull_request_diff']). Se omitido, o sub-agent enxerga todas as tools de leitura disponíveis. Sempre filtramos writes fora — allowlist não abre exceção pra tools mutantes.",
      },
    },
    required: ["task"],
  },
  async execute(args, ctx) {
    // Guarda contra spawn dentro de sub-agent (recursão).
    const depth = Number(ctx.sharedState?.subagentDepth ?? 0);
    if (depth >= 1) {
      return fail(
        "spawn_subagent não pode ser chamado de dentro de um sub-agent. Termine sua task com o que tem e retorne ao agente principal.",
      );
    }

    const task = typeof args?.task === "string" ? args.task.trim() : "";
    if (!task) {
      return fail(
        "task é obrigatória e não pode ser vazia. Descreva o que o sub-agent precisa fazer.",
      );
    }

    const brief = typeof args?.brief === "string" ? args.brief : undefined;
    const toolsAllowlist = Array.isArray(args?.tools)
      ? (args.tools as unknown[]).filter(
          (t): t is string => typeof t === "string" && !!t.trim(),
        )
      : undefined;

    ctx.progress("Delegando ao sub-agent...");

    try {
      const result = await runSubagent({
        task,
        brief,
        toolsAllowlist,
        signal: ctx.signal,
        // Encaminha status/steps do sub-agent como progress do main.
        // Não emitimos tool_call/tool_result do sub aqui pro trace do main
        // porque poluiria a UI — o main já mostra "Sub-agent: ..." em texto
        // e o detalhe fica exposto na resposta estruturada abaixo.
        onEvent: (event) => {
          if (event.type === "status") ctx.progress(event.text);
        },
      });

      const stepSummary = result.steps
        .map((s) => {
          const badge = s.status === "done" ? "✓" : s.status === "failed" ? "✗" : "…";
          return `${badge} ${s.name}`;
        })
        .join(", ");

      // O payload que volta pro modelo. Deliberadamente enxuto: sumário +
      // metadados. O modelo do main lê o `summary`; os outros campos ajudam
      // ele a decidir se precisa spawnar outro sub-agent complementar.
      const dataForModel = {
        summary: result.text,
        steps_taken: result.steps.length,
        stop_reason: result.stopReason,
        step_trace: stepSummary || "(sem tool calls)",
        usage: result.usage
          ? {
              prompt_tokens: result.usage.prompt_tokens,
              completion_tokens: result.usage.completion_tokens,
              total_tokens: result.usage.total_tokens,
              cost: result.usage.cost,
            }
          : undefined,
      };

      // O payload rico só pra UI: steps completos, com args/results/timings.
      // Vive em `uiData` porque a serialização pro modelo ignora esse campo —
      // se estes steps voltassem via `data`, inflariam o contexto do main
      // (justamente o que a delegação queria evitar).
      const dataForUi = {
        summary: result.text,
        steps: result.steps,
        stop_reason: result.stopReason,
        usage: result.usage,
      };

      return {
        ok: true,
        summary: `Sub-agent finalizou (${result.steps.length} passos, ${result.stopReason})`,
        data: dataForModel,
        uiData: dataForUi,
      };
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      return fail(`Sub-agent falhou: ${err?.message ?? String(err)}`);
    }
  },
};

export const coreTools = [
  memorySave,
  memorySearch,
  memoryForget,
  generateImageTool,
  getCurrentDateTime,
  spawnSubagent,
];
