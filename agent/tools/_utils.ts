/**
 * Utilidades compartilhadas pelas tools.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ToolResult } from "@/agent/types";

// ---------------------------------------------------------------------------
// base64
// ---------------------------------------------------------------------------

const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Base64 de string UTF-8, sem depender de `Buffer` nem de `btoa`.
 *
 * O Hermes não tem `btoa`, e o polyfill global de `Buffer` que o app fazia no
 * topo da tela de chat vazava para todo mundo. Aqui é autocontido.
 */
export function toBase64(input: string): string {
  // UTF-8 encode
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // par surrogate
      const next = input.charCodeAt(++i);
      code = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64_CHARS[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64_CHARS[b2 & 0x3f];
  }

  return out;
}

/** base64url, sem padding — formato exigido pela Gmail API. */
export function toBase64Url(input: string): string {
  return toBase64(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** True se todas as chaves existirem e não estiverem vazias. */
export async function hasKeys(...keys: string[]): Promise<boolean> {
  for (const key of keys) {
    const value = await getItem(key);
    if (!value || !value.trim()) return false;
  }
  return true;
}

/** True se o objeto salvo em `key` tiver todos os campos preenchidos. */
export async function hasFields(
  key: string,
  ...fields: string[]
): Promise<boolean> {
  const obj = await getJson<Record<string, unknown>>(key);
  if (!obj) return false;
  return fields.every((f) => {
    const v = obj[f];
    return typeof v === "string" ? v.trim().length > 0 : v != null;
  });
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export function ok(
  summary: string,
  data?: unknown,
  url?: string,
): ToolResult {
  return { ok: true, summary, data, url };
}

export function fail(error: string): ToolResult {
  return { ok: false, error, summary: error };
}

/**
 * Erro de configuração ausente. A mensagem é escrita *para o modelo* —
 * ele repassa ao usuário e sugere abrir a tela certa.
 */
export function notConfigured(service: string, what: string): ToolResult {
  return fail(
    `${service} não está configurado. Faltando: ${what}. Diga ao usuário para abrir a tela de ajustes do ${service} no app e preencher esses campos. Não tente essa ação de novo.`,
  );
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/** Corta strings longas antes de mandar pro modelo — cada char vira token. */
export function truncate(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[...truncado, ${text.length - max} caracteres omitidos]`;
}

type ApiCallOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  /** Alguns endpoints (diff do GitHub) devolvem texto puro. */
  raw?: boolean;
};

export type ApiResponse<T = any> = {
  ok: boolean;
  status: number;
  data: T;
  text: string;
};

/**
 * fetch com tratamento de erro consistente.
 *
 * Nunca lança em resposta HTTP de erro — devolve `ok: false` para a tool poder
 * montar uma mensagem que o modelo consiga usar para se corrigir.
 */
export async function apiCall<T = any>(
  url: string,
  options: ApiCallOptions = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();

  if (options.raw) {
    return { ok: response.ok, status: response.status, data: text as T, text };
  }

  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // APIs como o GitLab devolvem HTML de login quando a URL está errada.
      data = null;
    }
  }

  return { ok: response.ok, status: response.status, data, text };
}

/** Extrai a mensagem de erro de um payload de API, tentando os formatos comuns. */
export function extractApiError(res: ApiResponse): string {
  const d = res.data;

  if (!d) {
    const snippet = res.text.slice(0, 180).replace(/\s+/g, " ").trim();
    return `HTTP ${res.status}. A API não devolveu JSON${snippet ? `: ${snippet}` : "."}`;
  }

  const message =
    d.message ??
    d.error?.message ??
    d.error ??
    d.errorMessages?.join?.(", ") ??
    d.errors?.map?.((e: any) => e.message ?? JSON.stringify(e)).join(", ");

  if (Array.isArray(message)) return `HTTP ${res.status}: ${message.join(", ")}`;
  if (typeof message === "string") return `HTTP ${res.status}: ${message}`;

  return `HTTP ${res.status}: ${JSON.stringify(d).slice(0, 200)}`;
}
