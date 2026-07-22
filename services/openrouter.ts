/**
 * Cliente OpenRouter.
 *
 * Toda a comunicação com IA do app passa por aqui. A API do OpenRouter é
 * compatível com o schema da OpenAI, então usamos `fetch` puro — sem SDK.
 * Isso evita polyfills de stream/Buffer que quebram no Hermes.
 *
 * Docs: https://openrouter.ai/docs
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Headers de atribuição — aparecem no ranking de apps do OpenRouter. */
const APP_REFERER = "https://github.com/ItsJuniorDias/ai-agent";
const APP_TITLE = "AI Agent";

// ---------------------------------------------------------------------------
// Tipos do protocolo (subset do schema OpenAI/OpenRouter que usamos)
// ---------------------------------------------------------------------------

export type ORToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ORContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export type ORMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ORContentPart[] }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ORToolCall[];
      images?: { type: string; image_url: { url: string } }[];
    }
  | { role: "tool"; tool_call_id: string; name?: string; content: string };

export type ORFunctionTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/**
 * Server tools do OpenRouter: executam no servidor deles, sem código do cliente.
 * O modelo decide quando chamar. Substituem o antigo plugin `web`, que era
 * uma busca fixa por request.
 */
export type ORServerTool = {
  type: "openrouter:web_search" | "openrouter:web_fetch";
  parameters?: Record<string, unknown>;
};

export type ORTool = ORFunctionTool | ORServerTool;

export type ORUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
};

export type ORChoice = {
  finish_reason: string | null;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ORToolCall[];
    images?: { type: string; image_url: { url: string } }[];
    annotations?: unknown[];
  };
};

export type ORCompletion = {
  id: string;
  model: string;
  provider?: string;
  choices: ORChoice[];
  usage?: ORUsage;
};

export type ChatCompletionParams = {
  model: string;
  messages: ORMessage[];
  tools?: ORTool[];
  tool_choice?: "auto" | "none" | "required";
  parallel_tool_calls?: boolean;
  temperature?: number;
  max_tokens?: number;
  modalities?: ("text" | "image")[];
  plugins?: Record<string, unknown>[];
  reasoning?: { enabled?: boolean; effort?: "low" | "medium" | "high" };
  signal?: AbortSignal;
};

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export class OpenRouterError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.code = code;
  }
}

/** Traduz os erros mais comuns do OpenRouter para algo acionável. */
function describeStatus(status: number, fallback: string): string {
  switch (status) {
    case 401:
      return "Chave do OpenRouter inválida ou ausente. Confira EXPO_PUBLIC_OPENROUTER_API_KEY no .env.";
    case 402:
      return "Créditos insuficientes no OpenRouter. Adicione saldo em openrouter.ai/credits.";
    case 403:
      return "Acesso negado a este modelo. Verifique as permissões da sua chave.";
    case 408:
      return "O provedor demorou demais para responder. Tente novamente.";
    case 429:
      return "Limite de requisições atingido. Aguarde alguns segundos.";
    case 502:
    case 503:
      return "O provedor do modelo está indisponível no momento. Tente outro modelo em Ajustes.";
    default:
      return fallback;
  }
}

export function getApiKey(): string {
  return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? "";
}

export function hasApiKey(): boolean {
  return getApiKey().trim().length > 0;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": APP_REFERER,
    "X-Title": APP_TITLE,
  };
}

/**
 * Status HTTP que consideramos transientes — vale a pena repetir a request.
 * 429 é rate limit, 408/502/503/504 são timeouts/indisponibilidade do provedor.
 * 401/402/403 NÃO entram aqui: chave inválida, sem crédito ou sem permissão
 * não vão se resolver sozinhos, retry só atrasa o erro real chegar ao usuário.
 */
const RETRY_STATUS = new Set([408, 429, 502, 503, 504]);
const MAX_RETRY_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Backoff exponencial com jitter para não sincronizar retries de vários
 * clients contra o mesmo provedor.
 */
function backoffDelay(attempt: number, retryAfterHeader: string | null): number {
  // O 429 do OpenRouter às vezes traz Retry-After em segundos. Respeite.
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  const base = BASE_BACKOFF_MS * Math.pow(3, attempt);
  const jitter = Math.random() * base * 0.3;
  return Math.floor(base + jitter);
}

async function request<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (!hasApiKey()) {
    throw new OpenRouterError(
      "Nenhuma chave do OpenRouter configurada. Defina EXPO_PUBLIC_OPENROUTER_API_KEY no .env e reinicie o bundler.",
      401,
    );
  }

  let lastError: OpenRouterError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    let response: Response;
    try {
      response = await fetch(`${OPENROUTER_BASE_URL}${path}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      // Falha de rede pura (sem status): trata como transiente, dá mais uma chance.
      lastError = new OpenRouterError(
        `Falha de rede ao falar com o OpenRouter: ${err?.message ?? "desconhecido"}`,
        0,
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(backoffDelay(attempt, null), signal);
        continue;
      }
      throw lastError;
    }

    const raw = await response.text();

    let parsed: any;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      throw new OpenRouterError(
        `Resposta não-JSON do OpenRouter (${response.status}): ${raw.slice(0, 200)}`,
        response.status,
      );
    }

    if (response.ok && !parsed?.error) return parsed as T;

    const apiMessage = parsed?.error?.message ?? response.statusText;
    lastError = new OpenRouterError(
      describeStatus(response.status, apiMessage),
      response.status,
      parsed?.error?.code,
    );

    // Só retry em transiente e se ainda temos tentativa.
    if (!RETRY_STATUS.has(response.status) || attempt >= MAX_RETRY_ATTEMPTS) {
      throw lastError;
    }

    const retryAfter = response.headers.get("Retry-After");
    await sleep(backoffDelay(attempt, retryAfter), signal);
  }

  // Inatingível na prática — o loop sempre retorna ou lança. Guarda semântica.
  throw lastError ?? new OpenRouterError("Erro desconhecido no OpenRouter.", 0);
}

// ---------------------------------------------------------------------------
// Chat completions
// ---------------------------------------------------------------------------

export async function chatCompletion(
  params: ChatCompletionParams,
): Promise<ORCompletion> {
  const { signal, ...body } = params;

  const payload: Record<string, unknown> = {
    model: body.model,
    messages: body.messages,
  };

  if (body.tools?.length) {
    payload.tools = body.tools;
    payload.tool_choice = body.tool_choice ?? "auto";
    if (body.parallel_tool_calls !== undefined) {
      payload.parallel_tool_calls = body.parallel_tool_calls;
    }
  }
  if (body.temperature !== undefined) payload.temperature = body.temperature;
  if (body.max_tokens !== undefined) payload.max_tokens = body.max_tokens;
  if (body.modalities) payload.modalities = body.modalities;
  if (body.plugins) payload.plugins = body.plugins;
  if (body.reasoning) payload.reasoning = body.reasoning;

  const completion = await request<ORCompletion>(
    "/chat/completions",
    payload,
    signal,
  );

  if (!completion.choices?.length) {
    throw new OpenRouterError("O modelo retornou uma resposta vazia.", 502);
  }

  return completion;
}

// ---------------------------------------------------------------------------
// Embeddings (usado pela memória de longo prazo)
// ---------------------------------------------------------------------------

type OREmbeddingResponse = {
  data: { embedding: number[]; index: number }[];
  usage?: ORUsage;
};

export async function createEmbeddings(
  input: string[],
  model: string,
  signal?: AbortSignal,
): Promise<number[][]> {
  const res = await request<OREmbeddingResponse>(
    "/embeddings",
    { model, input },
    signal,
  );

  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function createEmbedding(
  input: string,
  model: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const [embedding] = await createEmbeddings([input], model, signal);
  return embedding;
}

// ---------------------------------------------------------------------------
// Geração de imagem
// ---------------------------------------------------------------------------

export type GeneratedImage = {
  /** data URL: `data:image/png;base64,...` */
  dataUrl: string;
  /** Mantido por compatibilidade — a Image API não devolve texto junto. */
  text: string | null;
  cost?: number;
};

/** Resposta da Image API. A imagem vem como base64 puro em `b64_json`. */
type ORImageResponse = {
  created?: number;
  data?: { b64_json: string; media_type?: string }[];
  usage?: ORUsage;
};

/**
 * Gera (ou edita) uma imagem via `POST /api/v1/images` — a Image API dedicada.
 *
 * Por que trocamos de `chat/completions` + `modalities` para esta rota:
 * o OpenRouter unificou geração de imagem aqui e passou a adicionar os modelos
 * novos exclusivamente nesta API. Modelos que só produzem imagem — Seedream 4.5,
 * a família FLUX — nem aparecem na rota de chat, então a versão anterior gerava
 * imagem só enquanto o modelo era um Gemini; trocar o modelo nos Ajustes deixava
 * o Studio sem gerar nada. Por esta rota, `google/gemini-2.5-flash-image`,
 * `google/gemini-3.1-flash-image-preview` e `bytedance-seed/seedream-4.5`
 * funcionam pelo mesmo caminho.
 *
 * `aspect_ratio` é parâmetro de topo aqui (não mais `image_config`), e a imagem
 * de referência para edição vai em `input_references`, aceitando data URL.
 *
 * Docs: https://openrouter.ai/docs/features/multimodal/image-generation
 */
export async function generateImage(opts: {
  model: string;
  prompt: string;
  /** Imagem-base em data URL (ou http(s)) para edição image-to-image. */
  referenceImage?: string;
  /** Proporção normalizada: 1:1, 16:9, 9:16, 4:3, 3:4… ou `auto`. */
  aspectRatio?: string;
  signal?: AbortSignal;
}): Promise<GeneratedImage> {
  const payload: Record<string, unknown> = {
    model: opts.model,
    prompt: opts.prompt,
  };

  if (opts.aspectRatio) payload.aspect_ratio = opts.aspectRatio;

  if (opts.referenceImage) {
    payload.input_references = [
      { type: "image_url", image_url: { url: opts.referenceImage } },
    ];
  }

  const res = await request<ORImageResponse>("/images", payload, opts.signal);

  const first = res.data?.[0];
  if (!first?.b64_json) {
    throw new OpenRouterError(
      "Nenhuma imagem retornada. O prompt pode ter sido bloqueado por filtro de segurança, ou o modelo escolhido não gera imagens.",
      502,
    );
  }

  const mediaType = first.media_type ?? "image/png";

  return {
    dataUrl: `data:${mediaType};base64,${first.b64_json}`,
    text: null,
    cost: res.usage?.cost,
  };
}

// ---------------------------------------------------------------------------
// Análise de arquivos (PDF / imagem / texto)
// ---------------------------------------------------------------------------

export type PdfEngine = "pdf-text" | "mistral-ocr" | "native";

/**
 * Manda um arquivo para qualquer modelo do OpenRouter.
 *
 * PDFs vão como `type: "file"` — o OpenRouter usa o suporte nativo do modelo
 * quando existe, e cai para o parser configurado quando não existe.
 * Imagens vão como `type: "image_url"`.
 */
export async function analyzeFile(opts: {
  model: string;
  prompt: string;
  filename: string;
  mimeType: string;
  /** Conteúdo do arquivo em base64 puro (sem prefixo data:). */
  base64: string;
  pdfEngine?: PdfEngine;
  signal?: AbortSignal;
}): Promise<{ text: string; usage?: ORUsage }> {
  const isImage = opts.mimeType.startsWith("image/");
  const isPdf = opts.mimeType === "application/pdf";
  const dataUrl = `data:${opts.mimeType};base64,${opts.base64}`;

  const content: ORContentPart[] = [{ type: "text", text: opts.prompt }];

  if (isImage) {
    content.push({ type: "image_url", image_url: { url: dataUrl } });
  } else {
    content.push({
      type: "file",
      file: { filename: opts.filename, file_data: dataUrl },
    });
  }

  const payload: Record<string, unknown> = {
    model: opts.model,
    messages: [{ role: "user", content }],
  };

  // `pdf-text` é gratuito e resolve PDFs com camada de texto.
  // `mistral-ocr` custa ~$2/1000 páginas, mas lê PDF escaneado.
  if (isPdf) {
    payload.plugins = [
      { id: "file-parser", pdf: { engine: opts.pdfEngine ?? "pdf-text" } },
    ];
  }

  const res = await request<ORCompletion>(
    "/chat/completions",
    payload,
    opts.signal,
  );

  return {
    text: res.choices[0]?.message?.content ?? "",
    usage: res.usage,
  };
}
