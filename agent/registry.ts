/**
 * Registro de tools.
 *
 * Decide *quais* tools o modelo enxerga em cada execução. Três fontes:
 *
 *  1. Tools nativas hardcoded (`ALL_TOOLS`). Filtradas por (a) integração
 *     habilitada no onboarding e (b) credenciais salvas.
 *  2. Tools MCP: uma por tool exposta por cada servidor MCP habilitado.
 *     Materializadas em tempo real a partir do `toolsCache` de cada servidor.
 *  3. Custom HTTP tools: uma por config em `@custom_tools`.
 *
 * Filosofia: tools que o modelo não pode usar não existem. Mandar uma tool
 * que o usuário não configurou faz o modelo tentar usá-la, falhar e gastar
 * uma iteração inteira do loop. Melhor ela simplesmente não estar no payload.
 *
 * Cache de resolução: NÃO tem. É chamado uma vez por turno, e cada leitura de
 * AsyncStorage é ~1ms. Se algum dia a lista de servidores MCP crescer muito,
 * cachear em memória com invalidação por evento é a saída — nas telas de
 * MCP/custom-tools, disparar um bus event ao salvar/deletar.
 */

import type { ORFunctionTool, ORTool } from "@/services/openrouter";
import type { AgentConfig } from "@/services/config";
import { loadEnabledIntegrations } from "@/services/config";
import type { AgentTool, IntegrationId } from "@/agent/types";
import { ALL_TOOLS } from "./tools";
import { listEnabledMCPServers } from "@/services/mcp/storage";
import { toolsFromServers } from "@/services/mcp/adapter";
import { listEnabledCustomTools } from "@/services/custom-tools/storage";
import { toolsFromCustom } from "@/services/custom-tools/adapter";

/** Nunca são filtradas — não dependem de credencial nem de integração. */
const ALWAYS_ON: IntegrationId[] = ["core"];

/**
 * Cache das tools resolvidas do turno atual. Escopo de módulo, mas o
 * `resolveTools` a cada turno faz overwrite completo — não fica stale entre
 * runs. Usado pelo `getToolByName` durante o loop, porque o `run-agent`
 * chama por nome pra cada `tool_call` que o modelo retorna e não temos como
 * passar a lista adiante sem mudar assinatura.
 */
let lastResolved: AgentTool[] = ALL_TOOLS;

export function getToolByName(name: string): AgentTool | undefined {
  return lastResolved.find((t) => t.name === name);
}

/**
 * Monta a lista de tools disponíveis agora. Nativas + MCP + custom, tudo
 * peneirado. Chamado no início de cada `runAgent`.
 */
export async function resolveTools(config: AgentConfig): Promise<AgentTool[]> {
  const [nativeAvailable, mcpTools, customTools] = await Promise.all([
    resolveNativeTools(),
    resolveMCPTools(),
    resolveCustomTools(),
  ]);

  const merged = [...nativeAvailable, ...mcpTools, ...customTools];

  // Sem memória de longo prazo, as tools de memória não fazem sentido.
  const filtered = config.longTermMemory
    ? merged
    : merged.filter((t) => !t.name.startsWith("memory_"));

  lastResolved = filtered;
  return filtered;
}

async function resolveNativeTools(): Promise<AgentTool[]> {
  const enabled = await loadEnabledIntegrations();

  const candidates = ALL_TOOLS.filter((tool) => {
    if (ALWAYS_ON.includes(tool.integration)) return true;
    // `null` = usuário nunca escolheu; libera tudo que tiver credencial.
    if (!enabled) return true;
    return enabled.includes(tool.integration);
  });

  const checks = await Promise.all(
    candidates.map(async (tool) => {
      try {
        return await tool.isConfigured();
      } catch {
        return false;
      }
    }),
  );

  return candidates.filter((_, i) => checks[i]);
}

async function resolveMCPTools(): Promise<AgentTool[]> {
  try {
    const servers = await listEnabledMCPServers();
    return toolsFromServers(servers);
  } catch {
    // Storage corrompido não deve derrubar o agente. Pula MCP e loga na
    // próxima refresh.
    return [];
  }
}

async function resolveCustomTools(): Promise<AgentTool[]> {
  try {
    const configs = await listEnabledCustomTools();
    return toolsFromCustom(configs);
  } catch {
    return [];
  }
}

/** Converte para o schema de function calling que o OpenRouter espera. */
export function toOpenRouterTool(tool: AgentTool): ORFunctionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * Lista final mandada na request, já com as server tools.
 *
 * `openrouter:web_search` e `openrouter:web_fetch` rodam no servidor do
 * OpenRouter — o modelo decide quando buscar e nós não escrevemos uma linha
 * de código para isso. Substituem o plugin `web` antigo, que era uma busca
 * fixa colada em toda request, buscando o usuário quisesse ou não.
 */
export function buildToolPayload(
  tools: AgentTool[],
  config: AgentConfig,
): ORTool[] {
  const payload: ORTool[] = tools.map(toOpenRouterTool);

  if (config.webSearch) {
    payload.push({ type: "openrouter:web_search" });
    payload.push({ type: "openrouter:web_fetch" });
  }

  return payload;
}

/** Agrupa por integração — usado na tela de Ajustes. */
export function groupToolsByIntegration(
  tools: AgentTool[],
): Record<string, AgentTool[]> {
  return tools.reduce<Record<string, AgentTool[]>>((acc, tool) => {
    (acc[tool.integration] ??= []).push(tool);
    return acc;
  }, {});
}
