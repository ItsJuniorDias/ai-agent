/**
 * Registro de tools.
 *
 * Decide *quais* tools o modelo enxerga em cada execução. Duas peneiras:
 *
 *  1. Integração habilitada no onboarding (`@enabled_integrations`).
 *  2. Credenciais realmente salvas (`isConfigured()`).
 *
 * Isso importa: mandar uma tool que o usuário não configurou faz o modelo
 * tentar usá-la, falhar e gastar uma iteração inteira do loop. Melhor ela
 * simplesmente não existir.
 */

import type { ORFunctionTool, ORTool } from "@/services/openrouter";
import type { AgentConfig } from "@/services/config";
import { loadEnabledIntegrations } from "@/services/config";
import type { AgentTool, IntegrationId } from "@/agent/types";
import { ALL_TOOLS } from "./tools";

/** Nunca são filtradas — não dependem de credencial nem de integração. */
const ALWAYS_ON: IntegrationId[] = ["core"];

export function getToolByName(name: string): AgentTool | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

/**
 * Monta a lista de tools disponíveis agora.
 * Roda os `isConfigured()` em paralelo — são leituras de AsyncStorage e
 * serializar isso adicionaria latência visível antes de cada turno.
 */
export async function resolveTools(config: AgentConfig): Promise<AgentTool[]> {
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

  const available = candidates.filter((_, i) => checks[i]);

  // Sem memória de longo prazo, as tools de memória não fazem sentido.
  return config.longTermMemory
    ? available
    : available.filter((t) => !t.name.startsWith("memory_"));
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
