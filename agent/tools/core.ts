/**
 * Tools nativas do agente — não dependem de nenhuma integração externa.
 */

import * as FileSystem from "expo-file-system/legacy";
import type { AgentTool } from "@/agent/types";
import { forgetMemory, saveMemory, searchMemory } from "@/agent/memory";
import { generateImage } from "@/services/openrouter";
import { loadConfig } from "@/services/config";
import { fail, ok } from "./_utils";

export const memorySave: AgentTool = {
  name: "memory_save",
  integration: "core",
  label: "Memorizando",
  description:
    "Guarda um fato sobre o usuário na memória de longo prazo, disponível em todas as conversas futuras. Use para preferências duráveis, nomes de projetos, stack, convenções de equipe. NÃO use para conversa passageira nem para o conteúdo da mensagem atual.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      fact: {
        type: "string",
        description:
          "O fato, em uma frase autocontida. Ex.: 'O usuário prefere Fastify a Express em projetos de backend.'",
      },
    },
    required: ["fact"],
  },
  async execute(args, ctx) {
    const cfg = await loadConfig();
    if (!cfg.longTermMemory)
      return fail(
        "A memória de longo prazo está desligada nos Ajustes. Avise o usuário.",
      );

    try {
      await saveMemory(args.fact, ctx.signal);
      return ok(`Memorizado: ${args.fact}`);
    } catch (err: any) {
      return fail(`Falha ao salvar memória: ${err.message}`);
    }
  },
};

export const memorySearch: AgentTool = {
  name: "memory_search",
  integration: "core",
  label: "Consultando memória",
  description:
    "Busca na memória de longo prazo por assunto. As memórias mais relevantes já são injetadas automaticamente a cada turno — só chame isso se precisar procurar algo específico que não apareceu.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "O que procurar." },
    },
    required: ["query"],
  },
  async execute(args, ctx) {
    try {
      const hits = await searchMemory(args.query, 6, ctx.signal);
      if (!hits.length) return ok("Nada relevante na memória", []);

      return ok(
        `${hits.length} memória(s) encontrada(s)`,
        hits.map((h) => ({ fact: h.text, relevance: h.score.toFixed(2) })),
      );
    } catch (err: any) {
      return fail(`Falha ao buscar na memória: ${err.message}`);
    }
  },
};

export const memoryForget: AgentTool = {
  name: "memory_forget",
  integration: "core",
  label: "Esquecendo",
  description:
    "Apaga da memória de longo prazo tudo que contiver um termo. Use quando o usuário pedir para esquecer algo.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Termo. Toda memória que contiver isso é apagada.",
      },
    },
    required: ["query"],
  },
  async execute(args) {
    const removed = await forgetMemory(args.query);
    return ok(
      removed
        ? `${removed} memória(s) apagada(s)`
        : "Nenhuma memória correspondia a esse termo",
    );
  },
};

export const generateImageTool: AgentTool = {
  name: "generate_image",
  integration: "core",
  label: "Gerando imagem",
  description:
    "Gera uma imagem a partir de uma descrição textual e salva no dispositivo. Escreva um prompt visual rico — descreva composição, iluminação e estilo, não só o objeto.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Descrição visual detalhada da imagem.",
      },
      aspect_ratio: {
        type: "string",
        description: "Ex.: 1:1, 16:9, 9:16, 4:3. Padrão: 1:1.",
      },
    },
    required: ["prompt"],
  },
  async execute(args, ctx) {
    const cfg = await loadConfig();

    try {
      ctx.progress("Renderizando imagem...");

      const image = await generateImage({
        model: cfg.imageModel,
        prompt: args.prompt,
        aspectRatio: args.aspect_ratio,
        signal: ctx.signal,
      });

      // A imagem volta como data URL. Grava em cache e devolve um file:// URI —
      // data URLs de vários MB dentro do estado do React travam a UI.
      const base64 = image.dataUrl.split(",")[1] ?? "";
      const uri = `${FileSystem.cacheDirectory}agent-image-${Date.now()}.png`;

      await FileSystem.writeAsStringAsync(uri, base64, { encoding: "base64" });

      return ok(
        "Imagem gerada",
        {
          // Só o caminho vai para o contexto do modelo. Mandar o base64 de volta
          // custaria milhares de tokens sem nenhum ganho.
          saved_to: uri,
          note: "A imagem já foi mostrada ao usuário no chat. Descreva o que você criou, não repita o caminho do arquivo.",
        },
        uri,
      );
    } catch (err: any) {
      return fail(`Falha ao gerar imagem: ${err.message}`);
    }
  },
};

export const getCurrentDateTime: AgentTool = {
  name: "get_current_datetime",
  integration: "core",
  label: "Checando a data",
  description:
    "Retorna a data e hora atuais do dispositivo. Use antes de qualquer raciocínio sobre prazos, 'hoje', 'esta semana' ou agendamento.",
  mutates: false,
  isConfigured: async () => true,
  parameters: { type: "object", properties: {} },
  async execute() {
    const now = new Date();
    return ok(now.toISOString(), {
      iso: now.toISOString(),
      local: now.toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      unix: Math.floor(now.getTime() / 1000),
    });
  },
};

export const coreTools = [
  memorySave,
  memorySearch,
  memoryForget,
  generateImageTool,
  getCurrentDateTime,
];
