/**
 * Persistência das configs de servidores MCP.
 *
 * Guarda a lista inteira sob uma chave só do AsyncStorage. Chegar a 10-20
 * servidores parece extremo, então nem me preocupei em fazer índice — pega
 * tudo, mexe, salva de volta. Se algum dia der problema de perf, dá pra
 * migrar pra uma chave por servidor sem quebrar API.
 *
 * Convenção de `id`: slug estável derivado do nome na primeira criação. Vira
 * parte do nome interno das tools (`mcp__linear__get_issue`), então precisa
 * ser `[a-z0-9_-]`, curto, e imutável.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MCPServerConfig, MCPToolDefinition } from "./types";

const STORAGE_KEY = "@mcp_servers";

async function readAll(): Promise<MCPServerConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(servers: MCPServerConfig[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
}

/** Lista todos os servidores salvos (habilitados + desabilitados). */
export async function listMCPServers(): Promise<MCPServerConfig[]> {
  return readAll();
}

/** Lista só os servidores habilitados. Usado pelo `registry` a cada turno. */
export async function listEnabledMCPServers(): Promise<MCPServerConfig[]> {
  const all = await readAll();
  return all.filter((s) => !s.disabled);
}

export async function getMCPServer(
  id: string,
): Promise<MCPServerConfig | undefined> {
  const all = await readAll();
  return all.find((s) => s.id === id);
}

/**
 * Salva/atualiza um servidor pelo `id`. Se já existe, faz merge — assim uma
 * atualização de `toolsCache` não pisa em `trustedTools` que o usuário já
 * configurou, e vice-versa.
 */
export async function saveMCPServer(config: MCPServerConfig): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex((s) => s.id === config.id);

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...config };
  } else {
    all.push(config);
  }

  await writeAll(all);
}

export async function deleteMCPServer(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((s) => s.id !== id));
}

/** Atualiza só o cache de tools de um servidor, preservando o resto. */
export async function updateMCPToolsCache(
  id: string,
  tools: MCPToolDefinition[],
): Promise<void> {
  const server = await getMCPServer(id);
  if (!server) return;
  await saveMCPServer({
    ...server,
    toolsCache: tools,
    lastConnectedAt: new Date().toISOString(),
  });
}

/**
 * Marca uma tool como confiável — a partir daqui, chamadas dela pulam a
 * aprovação humana. Usado pelo botão "Sempre confiar nessa tool" no modal
 * de aprovação. Reverte pela tela de detalhes do servidor.
 */
export async function trustMCPTool(
  serverId: string,
  toolName: string,
): Promise<void> {
  const server = await getMCPServer(serverId);
  if (!server) return;
  const trusted = new Set(server.trustedTools ?? []);
  trusted.add(toolName);
  await saveMCPServer({ ...server, trustedTools: [...trusted] });
}

export async function untrustMCPTool(
  serverId: string,
  toolName: string,
): Promise<void> {
  const server = await getMCPServer(serverId);
  if (!server) return;
  const trusted = (server.trustedTools ?? []).filter((n) => n !== toolName);
  await saveMCPServer({ ...server, trustedTools: trusted });
}

// ---------------------------------------------------------------------------
// Utilitários de id / slug
// ---------------------------------------------------------------------------

/**
 * Gera um slug a partir do nome do servidor. Se colidir com outro já salvo,
 * anexa `-2`, `-3` etc. Slugs entram no nome interno das tools, então
 * precisam ser únicos e URL-safe.
 */
export async function generateServerId(name: string): Promise<string> {
  const base = slugify(name) || "mcp-server";
  const existing = new Set((await readAll()).map((s) => s.id));

  if (!existing.has(base)) return base;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }

  // Fallback improvável — 1000 servidores com o mesmo nome.
  return `${base}-${Date.now()}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
