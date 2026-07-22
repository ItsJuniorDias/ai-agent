/**
 * Memória de longo prazo.
 *
 * Continua sendo um índice vetorial em AsyncStorage com similaridade de
 * cosseno, mas com duas mudanças importantes:
 *
 * 1. Embeddings vêm do OpenRouter (/embeddings, schema OpenAI) em vez do
 *    gemini-embedding-001.
 * 2. A escrita virou deliberada. O código antigo dava embed em *todo* prompt
 *    do usuário — "oi", "e aí", "obrigado" — e enchia o índice de ruído que
 *    depois voltava como "fatos antigos" no contexto. Agora o agente decide o
 *    que guardar chamando `memory_save`. A leitura continua automática.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createEmbedding } from "@/services/openrouter";
import { EMBEDDING_MODEL, STORAGE_KEYS } from "@/services/config";

export type MemoryVector = {
  id: string;
  text: string;
  embedding: number[];
  createdAt: string;
  /**
   * Última vez que essa memória foi retornada como hit relevante numa busca.
   * Serve para eviction por LRU: quando lotamos o `MAX_MEMORIES`, descartamos
   * as *menos usadas* em vez das mais antigas. Uma memória de "stack preferido
   * do usuário" salva há 6 meses e consultada toda semana continua útil e não
   * deve ser sobrescrita por uma pergunta única sobre uma issue X aleatória.
   * Campo opcional para retrocompatibilidade — legado cai no `createdAt`.
   */
  lastAccessedAt?: string;
};

/** Guarda no máximo isso de memórias; as mais antigas são descartadas. */
const MAX_MEMORIES = 200;

/** Abaixo disso a "memória" não tem relação real com a pergunta. */
const SIMILARITY_THRESHOLD = 0.35;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function readAll(): Promise<MemoryVector[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.vectorMemory);
    return raw ? (JSON.parse(raw) as MemoryVector[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(memories: MemoryVector[]): Promise<void> {
  // Eviction por LRU: ordena ascendente por "último toque" (acesso ou criação)
  // e mantém as N mais recentemente tocadas. Uma memória acessada agora vai
  // para o fim da lista mesmo que tenha sido criada há meses.
  const sorted = [...memories].sort((a, b) => {
    const aTouch = a.lastAccessedAt ?? a.createdAt;
    const bTouch = b.lastAccessedAt ?? b.createdAt;
    return aTouch.localeCompare(bTouch);
  });

  await AsyncStorage.setItem(
    STORAGE_KEYS.vectorMemory,
    JSON.stringify(sorted.slice(-MAX_MEMORIES)),
  );
}

export async function saveMemory(
  text: string,
  signal?: AbortSignal,
): Promise<MemoryVector> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Não dá para salvar memória vazia.");

  const embedding = await createEmbedding(trimmed, EMBEDDING_MODEL, signal);
  const memories = await readAll();

  // Deduplica: se já existe algo quase idêntico, atualiza em vez de duplicar.
  const duplicate = memories.find(
    (m) => cosineSimilarity(m.embedding, embedding) > 0.95,
  );

  if (duplicate) {
    duplicate.text = trimmed;
    duplicate.createdAt = new Date().toISOString();
    await writeAll(memories);
    return duplicate;
  }

  const now = new Date().toISOString();
  const memory: MemoryVector = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    embedding,
    createdAt: now,
    lastAccessedAt: now,
  };

  memories.push(memory);
  await writeAll(memories);

  return memory;
}

export type MemoryHit = { text: string; score: number; createdAt: string };

export async function searchMemory(
  query: string,
  limit = 4,
  signal?: AbortSignal,
): Promise<MemoryHit[]> {
  const memories = await readAll();
  if (!memories.length) return [];

  const queryEmbedding = await createEmbedding(query, EMBEDDING_MODEL, signal);

  const scored = memories.map((m, index) => ({
    index,
    text: m.text,
    score: cosineSimilarity(queryEmbedding, m.embedding),
    createdAt: m.createdAt,
  }));

  const hits = scored
    .filter((s) => s.score > SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Toca o `lastAccessedAt` das memórias que retornaram como relevantes. Faz o
  // eviction futuro preservar o que é *usado*, não só o que é *recente*.
  // Fire-and-forget: se falhar, o turno continua — não bloqueia o agente.
  if (hits.length) {
    const now = new Date().toISOString();
    for (const hit of hits) memories[hit.index].lastAccessedAt = now;
    writeAll(memories).catch(() => {});
  }

  return hits.map(({ text, score, createdAt }) => ({ text, score, createdAt }));
}

export async function forgetMemory(query: string): Promise<number> {
  const memories = await readAll();
  const needle = query.toLowerCase();

  const kept = memories.filter((m) => !m.text.toLowerCase().includes(needle));
  const removed = memories.length - kept.length;

  if (removed > 0) await writeAll(kept);
  return removed;
}

export async function clearMemory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.vectorMemory);
}

export async function countMemories(): Promise<number> {
  return (await readAll()).length;
}

export async function listMemories(): Promise<
  { id: string; text: string; createdAt: string }[]
> {
  const memories = await readAll();
  return memories
    .map(({ id, text, createdAt }) => ({ id, text, createdAt }))
    .reverse();
}
