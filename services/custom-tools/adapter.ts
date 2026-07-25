/**
 * Adapter: CustomToolConfig → AgentTool.
 *
 * Executa a request HTTP descrita pelo usuário, interpola os placeholders com
 * os argumentos do modelo, e devolve o corpo da resposta em texto.
 *
 * Segurança:
 *   - Só `http:` e `https:` na URL. Nada de `file:`, `data:`, `javascript:`.
 *   - Tamanho de resposta capado em 200KB. Um endpoint retornando um dump
 *     absurdo virava atolamento de contexto. Truncamos com hint pro modelo.
 *   - Sem redirecionamento entre domínios silencioso — o `fetch` do RN segue
 *     o redirect por default, é aceitável. Se algum dia der problema, dá pra
 *     controlar com `redirect: "manual"`.
 */

import type { AgentTool, IntegrationId, ToolResult } from "@/agent/types";
import type { CustomToolConfig, CustomToolParameter } from "./types";

/** Prefixo do nome interno pro registry saber que é custom. */
const NAME_PREFIX = "custom__";
const MAX_RESPONSE_BYTES = 200_000;

export function encodeCustomToolName(id: string): string {
  return `${NAME_PREFIX}${id}`;
}

export function isCustomToolName(name: string): boolean {
  return name.startsWith(NAME_PREFIX);
}

/**
 * Interpola `{{param}}` num template com valores. Faltando: substitui por
 * string vazia (não deixamos `{{ }}` chegar na request — melhor uma URL
 * malformada e erro claro do que uma call bizarra).
 */
function interpolate(
  template: string,
  values: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined || v === null) return "";
    return typeof v === "string" ? v : String(v);
  });
}

/** Constrói o JSON Schema pra function calling a partir da lista de params. */
function buildJsonSchema(params: CustomToolParameter[]): AgentTool["parameters"] {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const p of params) {
    properties[p.name] = {
      type: p.type,
      description: p.description,
    };
    if (p.required) required.push(p.name);
  }

  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
  };
}

function validateUrl(url: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: `URL inválida: ${url}` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `Protocolo não permitido: ${parsed.protocol}` };
  }
  return { ok: true };
}

export function toAgentTool(config: CustomToolConfig): AgentTool {
  return {
    name: encodeCustomToolName(config.id),
    integration: "custom" as IntegrationId,
    label: config.label || config.name,
    description: config.description,
    mutates: config.mutates,
    parameters: buildJsonSchema(config.parameters),
    isConfigured: async () => !config.disabled && Boolean(config.urlTemplate),
    async execute(args, ctx) {
      const values = (args ?? {}) as Record<string, unknown>;

      const url = interpolate(config.urlTemplate, values);
      const check = validateUrl(url);
      if (!check.ok) {
        return { ok: false, error: check.error } satisfies ToolResult;
      }

      const headers: Record<string, string> = {};
      for (const [key, tmpl] of Object.entries(config.headers ?? {})) {
        headers[key] = interpolate(tmpl, values);
      }

      let body: string | undefined;
      if (config.method !== "GET" && config.bodyTemplate) {
        body = interpolate(config.bodyTemplate, values);
        // Auto-adiciona Content-Type se parece JSON e ninguém setou.
        if (!headers["Content-Type"] && !headers["content-type"]) {
          const trimmed = body.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            headers["Content-Type"] = "application/json";
          }
        }
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: config.method,
          headers,
          body,
          signal: ctx.signal,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return { ok: false, error: "Requisição cancelada." };
        }
        return {
          ok: false,
          error: `Falha de rede: ${err?.message ?? String(err)}`,
        } satisfies ToolResult;
      }

      const raw = await response.text();
      const truncated = raw.length > MAX_RESPONSE_BYTES;
      const bodyText = truncated
        ? `${raw.slice(0, MAX_RESPONSE_BYTES)}\n\n[response truncated at ${MAX_RESPONSE_BYTES} bytes; total ${raw.length}]`
        : raw;

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${bodyText.slice(0, 500)}`,
          summary: `${config.name}: HTTP ${response.status}`,
        } satisfies ToolResult;
      }

      // Tenta parsear como JSON pra devolver estruturado; se não for JSON,
      // manda o texto cru. O `run-agent` já cuida do budget final.
      let data: unknown = bodyText;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("json")) {
        try {
          data = JSON.parse(bodyText);
        } catch {
          // Fica como texto.
        }
      }

      return {
        ok: true,
        summary: `${config.name}: ${response.status}`,
        data,
      } satisfies ToolResult;
    },
  };
}

export function toolsFromCustom(configs: CustomToolConfig[]): AgentTool[] {
  return configs.filter((c) => !c.disabled).map(toAgentTool);
}
