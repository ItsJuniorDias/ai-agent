/**
 * Tools HTTP customizadas do usuário.
 *
 * O modelo mental: o usuário descreve uma request HTTP (URL, método, headers,
 * body template com placeholders) e a descrição / schema dos parâmetros. Isso
 * vira um `AgentTool` no registry, indistinguível pro modelo das tools
 * nativas ou MCP.
 *
 * Cobertura: literalmente qualquer API REST. Se o servidor não é MCP nem
 * está no catálogo, o usuário pode conectar a API do banco dele, a API
 * interna da empresa, etc. Isso é o que MCP client sozinho não resolve.
 *
 * Interpolação: o body e a URL podem ter placeholders `{{param_name}}` que
 * são substituídos pelos valores que o modelo passar. `{{ }}` foi escolhido
 * por não conflitar com JSON, YAML nem query strings comuns.
 */

/** Definição de um parâmetro que o modelo passa. Vira propriedade no JSON Schema. */
export type CustomToolParameter = {
  name: string;
  /** Descrição pro modelo. Instrução clara aqui é o que faz o modelo acertar. */
  description: string;
  type: "string" | "number" | "boolean" | "integer";
  required: boolean;
};

export type CustomToolConfig = {
  id: string;
  name: string;
  /** Descrição pro modelo — quando chamar essa tool. Crítica. */
  description: string;
  /** Rótulo curto pra UI ("Fetching orders"). Livre. */
  label: string;
  /** GET/POST/PUT/PATCH/DELETE. */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * URL. Pode conter placeholders `{{param}}`. Ex:
   *   https://api.meusite.com/orders/{{order_id}}
   */
  urlTemplate: string;
  /**
   * Headers a mandar. Valores podem conter placeholders. `Authorization`
   * canonicamente vai aqui (`Bearer {{token}}` ou hardcoded).
   */
  headers: Record<string, string>;
  /**
   * Body template. String livre — o usuário pode escrever JSON, form-urlencoded
   * ou XML. Placeholders são interpolados no lugar. Se `method` for GET, é
   * ignorado. Vazio = sem body.
   */
  bodyTemplate?: string;
  /**
   * Schema dos parâmetros que o modelo vai passar. Ordem preservada — a UI
   * lista assim.
   */
  parameters: CustomToolParameter[];
  /**
   * Se `true`, precisa aprovação humana antes de rodar. Auto-marcado como
   * `false` para GET, `true` para os outros métodos — o usuário pode
   * sobrescrever no builder.
   */
  mutates: boolean;
  /**
   * `true` = tool desligada, some do registry sem apagar a config. Útil pra
   * testar sem deletar.
   */
  disabled?: boolean;
  createdAt: string;
};
