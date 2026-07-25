/**
 * Adapter: MCP tool → AgentTool do agente.
 *
 * Cada servidor MCP conectado vira N `AgentTool` pro `registry.resolveTools`.
 * A conversão é direta:
 *
 *   MCP `get_issue` de servidor `linear`
 *   →  AgentTool com:
 *      - `name`: `mcp__linear__get_issue` (namespace evita colisão)
 *      - `label`: "Linear · Get issue" (o trace mostra a origem)
 *      - `integration`: "mcp" (bucket guarda-chuva)
 *      - `parameters`: `inputSchema` do servidor, sem modificação
 *      - `mutates`: fail-closed. `true` a não ser que:
 *          (a) o servidor sinalizou `annotations.readOnlyHint: true`, OU
 *          (b) o usuário marcou a tool como confiável em `trustedTools`.
 *      - `execute`: chama `callTool` e serializa o content pro modelo.
 *
 * O parse do nome é o inverso: quando o modelo pede `mcp__linear__get_issue`,
 * o executor decodifica o `linear` como serverId e o resto como toolName.
 */

import type { AgentTool, IntegrationId, ToolResult } from "@/agent/types";
import { callTool, MCPError } from "./client";
import type { MCPServerConfig, MCPToolCallResult, MCPToolDefinition } from "./types";

const NAME_PREFIX = "mcp__";
const NAME_SEP = "__";

/** Codifica `{server, tool}` no nome interno da AgentTool. */
export function encodeMCPToolName(serverId: string, toolName: string): string {
  return `${NAME_PREFIX}${serverId}${NAME_SEP}${toolName}`;
}

/**
 * Decodifica o nome de uma AgentTool MCP de volta em `{server, tool}`.
 * Retorna `null` se o nome não for uma tool MCP. Usado pra descobrir se um
 * `AgentTool` genérico é MCP (útil pro fluxo de aprovação em `run-agent.ts`
 * se algum dia precisar tratamento especial — hoje não precisa).
 */
export function decodeMCPToolName(
  name: string,
): { serverId: string; toolName: string } | null {
  if (!name.startsWith(NAME_PREFIX)) return null;

  const rest = name.slice(NAME_PREFIX.length);
  const sepAt = rest.indexOf(NAME_SEP);
  if (sepAt <= 0) return null;

  return {
    serverId: rest.slice(0, sepAt),
    toolName: rest.slice(sepAt + NAME_SEP.length),
  };
}

/**
 * Determina se uma tool MCP precisa de aprovação humana.
 *
 * Ordem de precedência:
 *  1. `trustedTools` do usuário sempre vence — se ele explicitamente
 *     marcou como confiável, roda direto.
 *  2. `readOnlyHint: true` do servidor: rodamos direto. Servidores bem
 *     comportados marcam corretamente; se algum mentir, o problema é do
 *     servidor. Confiar aqui evita chuva de modais em servidores enormes
 *     (Zapier tem centenas de tools de leitura).
 *  3. Default: `mutates: true`. Fail-closed, igual às tools nativas de
 *     escrita.
 */
function isMutating(
  server: MCPServerConfig,
  def: MCPToolDefinition,
): boolean {
  const isTrusted = server.trustedTools?.includes(def.name) ?? false;
  if (isTrusted) return false;

  if (def.annotations?.readOnlyHint === true) return false;

  return true;
}

/**
 * Constrói o label da UI: "Linear · Get issue". Usa `annotations.title` do
 * servidor quando presente, senão o `name` transformado em Title Case.
 */
function buildLabel(server: MCPServerConfig, def: MCPToolDefinition): string {
  const toolLabel =
    def.annotations?.title?.trim() ||
    def.name
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return `${server.name} · ${toolLabel}`;
}

/**
 * Serializa o content MCP no formato que o modelo consome.
 *
 * MCP devolve um array de blocos (text, image, resource). Pro modelo, damos
 * tudo em texto — imagens viram menções e resources viram texto de URI +
 * texto embarcado. Isso é suficiente pro modelo raciocinar. Se um dia
 * quisermos exibir imagens no trace da UI, tem que estender o `ToolResult`
 * pra carregar assets — hoje é só string.
 */
function contentToText(result: MCPToolCallResult): string {
  return result.content
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "image")
        return `[image ${block.mimeType}, ${Math.round(block.data.length / 1024)} KB inline]`;
      if (block.type === "resource") {
        const { resource } = block;
        const head = `[resource ${resource.uri}]`;
        return resource.text ? `${head}\n${resource.text}` : head;
      }
      return "[unsupported content block]";
    })
    .join("\n\n");
}

/**
 * Converte uma tool MCP num AgentTool pronto pro registry.
 *
 * A closure captura `server` (URL + token). Se o usuário editar/deletar o
 * servidor, as tools antigas viram inertes — mas o `registry.resolveTools`
 * é chamado a cada turno, então tools stale nunca chegam ao modelo.
 */
export function toAgentTool(
  server: MCPServerConfig,
  def: MCPToolDefinition,
): AgentTool {
  const description = def.description?.trim() || `Tool exposed by MCP server "${server.name}".`;

  return {
    name: encodeMCPToolName(server.id, def.name),
    integration: "mcp" as IntegrationId,
    label: buildLabel(server, def),
    description,
    mutates: isMutating(server, def),
    parameters:
      def.inputSchema && def.inputSchema.type === "object"
        ? (def.inputSchema as AgentTool["parameters"])
        : { type: "object", properties: {} },
    isConfigured: async () => Boolean(server.url && !server.disabled),
    async execute(args, ctx) {
      try {
        const result = await callTool(
          server.url,
          server.bearerToken,
          def.name,
          args ?? {},
          { signal: ctx.signal },
        );

        const text = contentToText(result);

        // MCP pode devolver `isError: true` na resposta de sucesso do
        // JSON-RPC — isso é o servidor dizendo "aceitei o request mas a
        // tool falhou". Tratamos como erro pro modelo tentar se corrigir.
        if (result.isError) {
          return {
            ok: false,
            error: text || `Tool "${def.name}" reported an error.`,
            summary: `${server.name}: erro na tool`,
          } satisfies ToolResult;
        }

        return {
          ok: true,
          summary: `${server.name}: ${def.name}`,
          data: text,
        } satisfies ToolResult;
      } catch (err) {
        if (err instanceof MCPError) {
          return {
            ok: false,
            error: `MCP (${err.kind}): ${err.message}`,
          } satisfies ToolResult;
        }
        return {
          ok: false,
          error: `Falha inesperada ao chamar MCP: ${(err as Error).message}`,
        } satisfies ToolResult;
      }
    },
  };
}

/**
 * Materializa todas as tools de todos os servidores conectados. Chamada pelo
 * `registry.resolveTools` a cada turno do agente.
 */
export function toolsFromServers(servers: MCPServerConfig[]): AgentTool[] {
  const out: AgentTool[] = [];
  for (const server of servers) {
    if (server.disabled) continue;
    const defs = server.toolsCache ?? [];
    for (const def of defs) {
      out.push(toAgentTool(server, def));
    }
  }
  return out;
}
