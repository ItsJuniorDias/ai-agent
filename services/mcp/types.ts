/**
 * Tipos do MCP (Model Context Protocol).
 *
 * Baseados na spec 2025-06-18. Só cobrimos o subset que o app usa hoje:
 * `initialize`, `tools/list`, `tools/call`. Prompts e Resources ficaram de
 * fora — features separadas do protocolo, sem uso imediato para o agente.
 *
 * A convenção de nomes: uma tool MCP `get_issue` de um servidor com id
 * `linear` vira `mcp__linear__get_issue` no registry do agente. Isso resolve
 * colisão (dois servidores com `search`) e deixa o modelo saber a origem
 * lendo o próprio nome. Ver `adapter.ts`.
 */

/**
 * Config persistida de um servidor MCP conectado.
 *
 * `id` é slug estável (`linear`, `sentry`, `meu-servidor-custom`). Vira parte
 * do nome interno das tools, então precisa casar `[a-z0-9_-]`. Gerado a
 * partir do nome do servidor na primeira conexão e nunca muda.
 *
 * `toolsCache` guarda o último resultado de `tools/list` bem-sucedido. Serve
 * pra dois casos: (1) pre-render da tela de detalhes sem esperar rede, e
 * (2) offline resiliente — se o servidor cair no meio de uma sessão, ainda
 * temos o schema pra o modelo até a próxima refresh. O contract com o loop
 * do agente é: se o servidor não respondeu no handshake do turno, tools desse
 * servidor não entram; se respondeu, usamos o cache atualizado.
 */
export type MCPServerConfig = {
  id: string;
  /** Nome amigável exibido na UI. Livre. */
  name: string;
  /** URL do endpoint HTTP do servidor MCP (ex: https://mcp.linear.app/mcp). */
  url: string;
  /** Bearer token, opcional. Guardado em AsyncStorage. */
  bearerToken?: string;
  /** ISO timestamp do último handshake bem-sucedido. */
  lastConnectedAt?: string;
  /** Tools descobertas na última chamada de tools/list. */
  toolsCache?: MCPToolDefinition[];
  /**
   * Tools que o usuário marcou como "confio, roda sem aprovação".
   * Guarda `name` (ex: "get_issue"). Default: toda tool MCP pede aprovação.
   */
  trustedTools?: string[];
  /**
   * Se `true`, o servidor inteiro está pausado — tools somem do registry sem
   * precisar remover a config. Útil quando o servidor tá com problema e o
   * usuário quer voltar depois.
   */
  disabled?: boolean;
};

/**
 * Definição de uma tool devolvida por `tools/list`, spec MCP.
 *
 * `inputSchema` é JSON Schema Draft 2020-12 no papel, mas na prática todos
 * os servidores mandam algo compatível com o subset que OpenAI/Anthropic
 * usam em function calling. Passamos direto pro modelo — se algum servidor
 * mandar coisa exótica, o modelo pode falhar na chamada e o loop de
 * auto-correção lida com isso.
 */
export type MCPToolDefinition = {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    [k: string]: unknown;
  };
  /**
   * Annotations opcionais do MCP (spec 2025-06-18). O importante pra nós é
   * `readOnlyHint` — se o servidor jurar que a tool não muda estado, podemos
   * pular a aprovação automática. Se ausente, tratamos como write (default
   * seguro, HITL fail-closed).
   */
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

/** Resposta de `tools/call`, spec MCP. */
export type MCPToolCallResult = {
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
    | { type: "resource"; resource: { uri: string; text?: string; mimeType?: string } }
  >;
  /** Servidor sinalizando que a tool falhou. Continua sendo response de sucesso do JSON-RPC. */
  isError?: boolean;
};

/** Envelope JSON-RPC 2.0, base da comunicação MCP. */
export type JSONRPCRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
};

export type JSONRPCResponse<T = unknown> = {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};
