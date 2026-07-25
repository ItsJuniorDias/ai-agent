/**
 * Gerador de custom tool a partir de descrição em linguagem natural.
 *
 * O usuário digita: "Conecta com https://api.meuapp.com/orders, bearer XYZ,
 * tem GET /orders e POST /orders com { status, total }". Manda pro LLM e
 * volta a config estruturada, pronta pra revisão.
 *
 * Diferença pro `runAgent`: aqui não queremos raciocínio nem tool calling, só
 * conversão texto → JSON estruturado. Uma completion única, `response_format`
 * pedindo JSON, e parse. Se o modelo alucinar campo faltando, a UI mostra pro
 * usuário revisar antes de salvar — não gravamos direto.
 */

import { chatCompletion } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import type { CustomToolConfig, CustomToolParameter } from "./types";
import { generateCustomToolId } from "./storage";

const SYSTEM_PROMPT = `You convert an informal description of an HTTP API into a structured tool definition. Reply with ONE JSON object matching this exact shape:

{
  "name": "short_snake_case_name",
  "label": "Short human label (2-4 words, imperative form)",
  "description": "One sentence telling the model when to call this. Start with a verb.",
  "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  "urlTemplate": "https://... with {{param}} placeholders",
  "headers": { "Header-Name": "value or {{param}}" },
  "bodyTemplate": "JSON string or empty",
  "parameters": [
    { "name": "param_name", "description": "what it is", "type": "string" | "number" | "boolean" | "integer", "required": true }
  ],
  "mutates": true | false
}

Rules:
- If the description mentions a token/key, put it in headers.Authorization as "Bearer {{token}}" and add a "token" parameter with required:true.
- mutates = false ONLY for GET requests. All others are true.
- Every {{placeholder}} in urlTemplate/headers/bodyTemplate MUST have a matching entry in parameters.
- description should be actionable ("Get an order by its ID from MyApp") not descriptive ("Endpoint for orders").
- If the API is ambiguous (e.g. no clear method), infer the most likely one and add a note field. If you cannot determine URL or method at all, respond with { "error": "brief reason" }.

Reply with the JSON only. No prose, no markdown fence.`;

export type GenerateResult =
  | { ok: true; config: CustomToolConfig }
  | { ok: false; error: string };

export async function generateCustomToolFromText(
  description: string,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const trimmed = description.trim();
  if (!trimmed) return { ok: false, error: "Descrição vazia." };

  const cfg = await loadConfig();

  let completion;
  try {
    completion = await chatCompletion({
      model: cfg.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      temperature: 0.2,
      signal,
    });
  } catch (err: any) {
    return {
      ok: false,
      error: `Falha ao consultar o modelo: ${err?.message ?? String(err)}`,
    };
  }

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) return { ok: false, error: "Modelo devolveu resposta vazia." };

  // Remove possíveis fences de markdown se o modelo insistir.
  const jsonText = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error: `Resposta do modelo não é JSON válido: ${jsonText.slice(0, 200)}`,
    };
  }

  if (parsed.error && typeof parsed.error === "string") {
    return { ok: false, error: parsed.error };
  }

  // Sanitiza os campos que o modelo pode ter enviado errado.
  const validated = validate(parsed);
  if (!validated.ok) return validated;

  const id = await generateCustomToolId(validated.data.name);

  return {
    ok: true,
    config: {
      id,
      name: validated.data.name,
      label: validated.data.label,
      description: validated.data.description,
      method: validated.data.method,
      urlTemplate: validated.data.urlTemplate,
      headers: validated.data.headers,
      bodyTemplate: validated.data.bodyTemplate,
      parameters: validated.data.parameters,
      mutates: validated.data.mutates,
      createdAt: new Date().toISOString(),
    },
  };
}

type ValidatedFields = Omit<CustomToolConfig, "id" | "createdAt" | "disabled">;

function validate(
  input: any,
): { ok: true; data: ValidatedFields } | { ok: false; error: string } {
  if (typeof input !== "object" || !input) {
    return { ok: false, error: "Resposta não é um objeto." };
  }

  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
  const method = methods.includes(input.method) ? input.method : "GET";

  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : "custom_tool";
  const label = typeof input.label === "string" && input.label.trim() ? input.label.trim() : name;
  const description =
    typeof input.description === "string" && input.description.trim()
      ? input.description.trim()
      : `Custom HTTP tool: ${name}`;
  const urlTemplate = typeof input.urlTemplate === "string" ? input.urlTemplate.trim() : "";

  if (!urlTemplate) return { ok: false, error: "urlTemplate ausente na resposta." };

  const headers: Record<string, string> = {};
  if (input.headers && typeof input.headers === "object") {
    for (const [k, v] of Object.entries(input.headers)) {
      if (typeof v === "string") headers[k] = v;
    }
  }

  const bodyTemplate = typeof input.bodyTemplate === "string" ? input.bodyTemplate : undefined;

  const rawParams = Array.isArray(input.parameters) ? input.parameters : [];
  const parameters: CustomToolParameter[] = [];
  for (const p of rawParams) {
    if (!p || typeof p !== "object" || typeof p.name !== "string") continue;
    const type =
      p.type === "number" || p.type === "boolean" || p.type === "integer"
        ? p.type
        : "string";
    parameters.push({
      name: p.name,
      description:
        typeof p.description === "string" ? p.description : `Parameter ${p.name}`,
      type,
      required: Boolean(p.required),
    });
  }

  const mutates =
    typeof input.mutates === "boolean" ? input.mutates : method !== "GET";

  return {
    ok: true,
    data: {
      name,
      label,
      description,
      method,
      urlTemplate,
      headers,
      bodyTemplate,
      parameters,
      mutates,
    },
  };
}
