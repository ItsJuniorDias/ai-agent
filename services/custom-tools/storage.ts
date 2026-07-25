/**
 * Persistência das custom HTTP tools.
 *
 * Mesmo padrão do storage MCP: uma chave só, JSON com o array inteiro.
 * Escala bem até dezenas de tools.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomToolConfig } from "./types";

const STORAGE_KEY = "@custom_tools";

async function readAll(): Promise<CustomToolConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(tools: CustomToolConfig[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}

export async function listCustomTools(): Promise<CustomToolConfig[]> {
  return readAll();
}

export async function listEnabledCustomTools(): Promise<CustomToolConfig[]> {
  return (await readAll()).filter((t) => !t.disabled);
}

export async function getCustomTool(
  id: string,
): Promise<CustomToolConfig | undefined> {
  return (await readAll()).find((t) => t.id === id);
}

export async function saveCustomTool(tool: CustomToolConfig): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex((t) => t.id === tool.id);

  if (idx >= 0) {
    all[idx] = tool;
  } else {
    all.push(tool);
  }

  await writeAll(all);
}

export async function deleteCustomTool(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((t) => t.id !== id));
}

/**
 * Gera um id único. Slug do nome + suffix numérico se colidir. Igual ao
 * padrão do MCP.
 */
export async function generateCustomToolId(name: string): Promise<string> {
  const base = slugify(name) || "custom-tool";
  const existing = new Set((await readAll()).map((t) => t.id));

  if (!existing.has(base)) return base;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
