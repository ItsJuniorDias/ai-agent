/**
 * Tools de notificação — o agente ganha a capacidade de alcançar o usuário fora
 * da tela do chat: um lembrete agendado, um aviso quando termina uma tarefa
 * longa, um alerta que a varredura em background achou importante.
 *
 * Todas são `core` (não dependem de credencial, só de permissão do SO) e
 * `mutates: false` — uma notificação local é on-device e reversível, então não
 * faz sentido travar num modal de aprovação. Pedir "me lembra em 10 minutos" e
 * ter que aprovar seria absurdo.
 *
 * O corte fino: se a permissão não foi concedida, a tool devolve um erro
 * acionável (para o modelo mandar o usuário à tela do Assistente), em vez de
 * agendar em silêncio algo que nunca vai tocar.
 */

import type { AgentTool } from "@/agent/types";
import {
  CHANNEL_ALERTS,
  cancelAllScheduled,
  cancelScheduled,
  getPermissionStatus,
  listScheduled,
  markNotified,
  presentNow,
  scheduleAt,
  scheduleInSeconds,
  wasRecentlyNotified,
} from "@/services/notifications";
import { fail, ok } from "./_utils";

/** Mensagem única para o caso "permissão negada", escrita para o modelo. */
const NEEDS_PERMISSION =
  "As notificações não estão autorizadas. Diga ao usuário para abrir a aba Ajustes → Personal Assistant e tocar em ativar notificações. Não tente agendar de novo até isso ser resolvido.";

export const notifyNow: AgentTool = {
  name: "notify_now",
  integration: "core",
  label: "Notificando",
  description:
    "Dispara uma notificação local imediata no dispositivo do usuário. Use para avisar que uma tarefa longa terminou, ou — quando rodando em background — para alertar sobre algo que realmente precisa de atenção agora (um PR esperando review, um deploy quebrado). Escreva um título curto e específico e um corpo com o essencial. Passe sempre um dedupe_key estável (ex.: a URL do PR ou a chave da issue) para o mesmo item não notificar duas vezes.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Título curto e direto. Ex.: 'PR #42 esperando review'.",
      },
      body: {
        type: "string",
        description:
          "Uma ou duas linhas com o que importa. Sem enrolação — cabe na tela de bloqueio.",
      },
      dedupe_key: {
        type: "string",
        description:
          "Chave estável do item (URL, chave da issue, id do deploy). Se já notificado nas últimas 6h, a notificação é suprimida.",
      },
    },
    required: ["title", "body"],
  },
  async execute(args) {
    if ((await getPermissionStatus()) !== "granted") return fail(NEEDS_PERMISSION);

    const key = typeof args.dedupe_key === "string" ? args.dedupe_key : "";

    if (key && (await wasRecentlyNotified(key))) {
      return ok(
        `Já havia notificado sobre "${key}" recentemente — pulei para não repetir.`,
      );
    }

    const id = await presentNow({
      title: String(args.title),
      body: String(args.body),
      data: { kind: "alert", route: "/(assistant)" },
      channelId: CHANNEL_ALERTS,
    });

    if (!id) return fail("Não foi possível disparar a notificação neste ambiente.");

    if (key) await markNotified(key);
    return ok(`Notificação enviada: ${args.title}`);
  },
};

export const scheduleReminder: AgentTool = {
  name: "schedule_reminder",
  integration: "core",
  label: "Agendando lembrete",
  description:
    "Agenda um lembrete local para o futuro. Informe o horário de UM modo: `at_iso` (data/hora absoluta ISO 8601) OU `in_minutes` (daqui a N minutos). Se o usuário disser algo relativo ('amanhã 9h', 'daqui 2h'), chame get_current_datetime antes para resolver a data correta. Escreva o título e o corpo prontos, como você quer que apareçam na tela.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título do lembrete." },
      body: {
        type: "string",
        description: "Detalhe do lembrete, uma ou duas linhas.",
      },
      at_iso: {
        type: "string",
        description:
          "Data/hora absoluta em ISO 8601, ex.: '2026-07-22T09:00:00-03:00'. Use este OU in_minutes.",
      },
      in_minutes: {
        type: "number",
        description: "Minutos a partir de agora. Use este OU at_iso.",
      },
    },
    required: ["title", "body"],
  },
  async execute(args) {
    if ((await getPermissionStatus()) !== "granted") return fail(NEEDS_PERMISSION);

    const title = String(args.title);
    const body = String(args.body);

    // Caminho relativo: em N minutos.
    if (typeof args.in_minutes === "number" && !args.at_iso) {
      if (args.in_minutes <= 0)
        return fail("in_minutes precisa ser um número positivo.");

      const seconds = args.in_minutes * 60;
      const id = await scheduleInSeconds({ title, body, seconds });
      if (!id) return fail("Não foi possível agendar neste ambiente.");

      const when = new Date(Date.now() + seconds * 1000);
      return ok(
        `Lembrete agendado para daqui a ${args.in_minutes} min (${when.toLocaleString("pt-BR")}).`,
        { id, fireAt: when.toISOString() },
      );
    }

    // Caminho absoluto: data ISO.
    if (typeof args.at_iso === "string" && args.at_iso.trim()) {
      const date = new Date(args.at_iso);
      if (Number.isNaN(date.getTime()))
        return fail(
          `Não consegui interpretar a data "${args.at_iso}". Use ISO 8601, ex.: 2026-07-22T09:00:00-03:00.`,
        );

      if (date.getTime() <= Date.now())
        return fail(
          "Essa data já passou. Cheque a hora atual com get_current_datetime e escolha um horário no futuro.",
        );

      const id = await scheduleAt({ title, body, date });
      if (!id) return fail("Não foi possível agendar neste ambiente.");

      return ok(
        `Lembrete agendado para ${date.toLocaleString("pt-BR")}.`,
        { id, fireAt: date.toISOString() },
      );
    }

    return fail(
      "Faltou o horário. Passe at_iso (data absoluta) ou in_minutes (relativo).",
    );
  },
};

export const listReminders: AgentTool = {
  name: "list_reminders",
  integration: "core",
  label: "Listando lembretes",
  description:
    "Lista os lembretes e notificações que estão agendados para o futuro. Use quando o usuário perguntar o que ele tem marcado ou antes de cancelar algo, para pegar o id certo.",
  mutates: false,
  isConfigured: async () => true,
  parameters: { type: "object", properties: {} },
  async execute() {
    const items = await listScheduled();
    if (!items.length) return ok("Nenhum lembrete agendado.", []);

    return ok(
      `${items.length} lembrete(s) agendado(s).`,
      items.map((i) => ({
        id: i.id,
        title: i.title,
        body: i.body,
        fireAt: i.fireAt,
      })),
    );
  },
};

export const cancelReminder: AgentTool = {
  name: "cancel_reminder",
  integration: "core",
  label: "Cancelando lembrete",
  description:
    "Cancela um lembrete agendado pelo id, ou todos de uma vez com all=true. Para pegar o id, use list_reminders antes.",
  mutates: false,
  isConfigured: async () => true,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "Id do lembrete a cancelar." },
      all: {
        type: "boolean",
        description: "Se true, cancela todos os lembretes agendados.",
      },
    },
  },
  async execute(args) {
    if (args.all === true) {
      const n = await cancelAllScheduled();
      return ok(
        n ? `${n} lembrete(s) cancelado(s).` : "Não havia lembretes para cancelar.",
      );
    }

    if (typeof args.id === "string" && args.id.trim()) {
      await cancelScheduled(args.id);
      return ok(`Lembrete ${args.id} cancelado.`);
    }

    return fail("Informe o id do lembrete ou all=true.");
  },
};

export const notificationTools = [
  notifyNow,
  scheduleReminder,
  listReminders,
  cancelReminder,
];
