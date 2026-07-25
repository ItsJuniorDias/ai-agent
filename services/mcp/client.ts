/**
 * Cliente HTTP MCP.
 *
 * Implementa o transporte "Streamable HTTP" da spec 2025-06-18 no modo mais
 * simples: um único POST JSON-RPC por request, response `application/json`
 * síncrono. Servidores que respondem `text/event-stream` para streaming de
 * notifications não são suportados aqui — o fetch do React Native não expõe
 * `response.body` sem lib extra, o mesmo motivo pelo qual `openrouter.ts` não
 * faz SSE de token. Para as duas operações que o app usa (`tools/list` e
 * `tools/call`), servidores em produção respondem síncrono, então funciona.
 *
 * Se um servidor MCP no futuro *exigir* SSE (ex: sampling bidirecional), este
 * arquivo é o lugar de trocar. Ver TODO em `openStream`.
 *
 * Autenticação: bearer token opcional via header `Authorization`. Igual às
 * outras integrações do app — nada de OAuth aqui, ficou de fora e tá
 * documentado no README.
 */

import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPToolCallResult,
  MCPToolDefinition,
} from "./types";

/**
 * Erro estruturado para o adapter distinguir "servidor caiu" de "servidor
 * rejeitou a tool call". A UI pode mostrar mensagens diferentes.
 */
export class MCPError extends Error {
  readonly kind: "transport" | "protocol" | "tool";
  readonly code?: number;

  constructor(
    kind: "transport" | "protocol" | "tool",
    message: string,
    code?: number,
  ) {
    super(message);
    this.name = "MCPError";
    this.kind = kind;
    this.code = code;
  }
}

/** Contador global de request id. Escopo de módulo — o servidor só compara. */
let requestCounter = 1;

function nextId(): number {
  return requestCounter++;
}

/** Timeout de request MCP. Curto pra descoberta, generoso pra `tools/call`. */
const DEFAULT_TIMEOUT_MS = 30_000;

type CallOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Faz uma chamada JSON-RPC única.
 *
 * A spec Streamable HTTP permite o servidor responder ou `application/json`
 * (um envelope) ou `text/event-stream` (stream de eventos). Aqui só tratamos
 * o primeiro. Se vier SSE, lemos o texto todo, procuramos o primeiro evento
 * `data:` que pareça JSON-RPC response e devolvemos — hacky, mas cobre
 * servidores que respondem SSE mesmo pra request simples.
 */
async function jsonRpcCall<T>(
  url: string,
  bearerToken: string | undefined,
  method: string,
  params: unknown,
  opts: CallOptions = {},
): Promise<T> {
  const body: JSONRPCRequest = {
    jsonrpc: "2.0",
    id: nextId(),
    method,
    params,
  };

  // Merge de sinais: AbortSignal do chamador + timeout local.
  const timeoutCtrl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);

  const signal = opts.signal
    ? combineSignals(opts.signal, timeoutCtrl.signal)
    : timeoutCtrl.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Spec 2025-06-18: cliente deve declarar que aceita ambos.
        Accept: "application/json, text/event-stream",
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new MCPError(
        "transport",
        opts.signal?.aborted
          ? "Requisição cancelada."
          : `Servidor MCP não respondeu em ${timeoutMs / 1000}s.`,
      );
    }
    throw new MCPError(
      "transport",
      `Falha de rede: ${err?.message ?? String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Alguns servidores mandam 401/403 com body descritivo, alguns só com
    // status. Tentamos ler o texto pra dar mensagem melhor.
    const text = await response.text().catch(() => "");
    throw new MCPError(
      "transport",
      `HTTP ${response.status}: ${text.slice(0, 200) || response.statusText}`,
      response.status,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  // Extrai o envelope JSON-RPC. Se veio SSE, pega o primeiro data: que
  // parseia. Isso é pragmático, não spec-perfeito.
  const envelope = extractJsonRpc(raw, contentType);

  if (envelope.error) {
    throw new MCPError(
      "protocol",
      envelope.error.message ?? "Erro do servidor MCP.",
      envelope.error.code,
    );
  }

  if (envelope.result === undefined) {
    throw new MCPError("protocol", "Resposta MCP sem `result`.");
  }

  return envelope.result as T;
}

/**
 * Junta AbortSignals — o fetch do React Native suporta um sinal só. Aborta o
 * combinado quando qualquer um dos originais aborta.
 */
function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }

  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

/**
 * Aceita `application/json` (envelope direto) ou `text/event-stream` (pega o
 * primeiro `data:` que parseia como JSON-RPC).
 */
function extractJsonRpc(raw: string, contentType: string): JSONRPCResponse {
  const trimmed = raw.trim();

  if (contentType.includes("application/json") || !contentType.includes("event-stream")) {
    try {
      return JSON.parse(trimmed) as JSONRPCResponse;
    } catch {
      throw new MCPError(
        "protocol",
        `Resposta não é JSON válido: ${trimmed.slice(0, 200)}`,
      );
    }
  }

  // SSE: procura linhas `data: {...}`.
  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());

  for (const line of dataLines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object" && "jsonrpc" in parsed) {
        return parsed as JSONRPCResponse;
      }
    } catch {
      // Tenta a próxima
    }
  }

  throw new MCPError(
    "protocol",
    "Servidor respondeu SSE sem envelope JSON-RPC reconhecível.",
  );
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Handshake `initialize`. Segundo a spec, é o primeiro método a chamar.
 * Alguns servidores permitem pular e ir direto pra `tools/list`, mas outros
 * rejeitam. Fazemos sempre — o custo é uma request só e evita edge cases.
 */
export async function initialize(
  url: string,
  bearerToken: string | undefined,
  opts: CallOptions = {},
): Promise<{ serverName?: string; serverVersion?: string }> {
  const result = await jsonRpcCall<{
    protocolVersion: string;
    capabilities: Record<string, unknown>;
    serverInfo?: { name?: string; version?: string };
  }>(
    url,
    bearerToken,
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "ai-agent-mobile", version: "2.0.0" },
    },
    opts,
  );

  return {
    serverName: result.serverInfo?.name,
    serverVersion: result.serverInfo?.version,
  };
}

/**
 * `tools/list`. Devolve o catálogo de tools desse servidor.
 *
 * Alguns servidores paginam com `nextCursor`. Seguimos até acabar (com um
 * hard cap de 5 páginas / 500 tools por servidor pra proteger o modelo de
 * catálogos absurdos — se algum servidor tiver mais que isso, o problema é
 * dele).
 */
export async function listTools(
  url: string,
  bearerToken: string | undefined,
  opts: CallOptions = {},
): Promise<MCPToolDefinition[]> {
  const MAX_PAGES = 5;
  const MAX_TOOLS = 500;
  const collected: MCPToolDefinition[] = [];
  let cursor: string | undefined = undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result: { tools: MCPToolDefinition[]; nextCursor?: string } =
      await jsonRpcCall(
        url,
        bearerToken,
        "tools/list",
        cursor ? { cursor } : {},
        opts,
      );

    if (Array.isArray(result.tools)) {
      collected.push(...result.tools);
    }

    if (collected.length >= MAX_TOOLS) break;
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return collected.slice(0, MAX_TOOLS);
}

/**
 * `tools/call`. Executa uma tool no servidor e devolve o `content` bruto.
 * O `adapter` cuida de converter o content MCP no `ToolResult` do agente.
 */
export async function callTool(
  url: string,
  bearerToken: string | undefined,
  name: string,
  args: Record<string, unknown>,
  opts: CallOptions = {},
): Promise<MCPToolCallResult> {
  return jsonRpcCall<MCPToolCallResult>(
    url,
    bearerToken,
    "tools/call",
    { name, arguments: args },
    { ...opts, timeoutMs: opts.timeoutMs ?? 60_000 },
  );
}

// TODO(mcp): stream via SSE / notifications reverso.
// Alguns servidores mandam `notifications/tools/list_changed` pra avisar que
// o catálogo mudou. Ignoramos hoje — o usuário refaz o handshake no botão
// "Reload tools" na tela de detalhes. Suportar isso exige abrir uma conexão
// SSE de longa duração, que o fetch do RN não suporta sem polyfill.
export function openStream(): never {
  throw new Error("MCP streaming/notifications not implemented in this client.");
}
