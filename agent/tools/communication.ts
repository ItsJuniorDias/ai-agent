/**
 * Tools de comunicação: Slack, Discord, WhatsApp e Microsoft Teams.
 *
 * O código antigo mandava o texto cru do input para o canal `#all-developer`,
 * chumbado. Agora o canal é argumento e o modelo compõe a mensagem.
 */

import type { AgentTool } from "@/agent/types";
import {
  apiCall,
  extractApiError,
  fail,
  getItem,
  getJson,
  hasFields,
  hasKeys,
  notConfigured,
  ok,
} from "./_utils";

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------

const SLACK_TOKEN_KEY = "@slack_bot_token";
const SLACK_CHANNEL_KEY = "@slack_default_channel";

export const slackListChannels: AgentTool = {
  name: "slack_list_channels",
  integration: "slack",
  label: "Listando canais do Slack",
  description:
    "Lista os canais públicos do workspace do Slack. Use quando não souber o nome exato do canal.",
  mutates: false,
  isConfigured: () => hasKeys(SLACK_TOKEN_KEY),
  parameters: { type: "object", properties: {} },
  async execute(_args, ctx) {
    const token = await getItem(SLACK_TOKEN_KEY);
    if (!token) return notConfigured("Slack", "bot token");

    const res = await apiCall(
      "https://slack.com/api/conversations.list?types=public_channel&limit=50&exclude_archived=true",
      { headers: { Authorization: `Bearer ${token}` }, signal: ctx.signal },
    );

    if (!res.ok || !res.data?.ok)
      return fail(`Slack: ${res.data?.error ?? extractApiError(res)}`);

    const channels = (res.data.channels as any[]).map((c) => ({
      id: c.id,
      name: `#${c.name}`,
      members: c.num_members,
    }));

    return ok(`${channels.length} canal(is) encontrado(s)`, channels);
  },
};

export const slackSendMessage: AgentTool = {
  name: "slack_send_message",
  integration: "slack",
  label: "Enviando mensagem no Slack",
  description:
    "Envia uma mensagem para um canal do Slack. Escreva a mensagem em tom natural — não repasse o prompt do usuário cru.",
  mutates: true,
  isConfigured: () => hasKeys(SLACK_TOKEN_KEY),
  parameters: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description:
          "Canal, ex.: #geral ou o ID (C0123ABC). Omita para o canal padrão.",
      },
      text: {
        type: "string",
        description: "Mensagem. Aceita mrkdwn do Slack.",
      },
    },
    required: ["text"],
  },
  async execute(args, ctx) {
    const token = await getItem(SLACK_TOKEN_KEY);
    if (!token) return notConfigured("Slack", "bot token");

    const channel =
      args.channel || (await getItem(SLACK_CHANNEL_KEY)) || "#general";

    const res = await apiCall("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { channel, text: args.text },
      signal: ctx.signal,
    });

    // O Slack devolve 200 mesmo em erro — a verdade está em `ok`.
    if (!res.data?.ok) {
      const code = res.data?.error ?? "unknown_error";
      const hint =
        code === "not_in_channel"
          ? " Convide o bot para o canal com /invite."
          : code === "channel_not_found"
            ? " Confira o nome do canal com slack_list_channels."
            : "";
      return fail(`Slack recusou: ${code}.${hint}`);
    }

    return ok(`Mensagem enviada para ${channel}`, { ts: res.data.ts });
  },
};

// ---------------------------------------------------------------------------
// Discord
// ---------------------------------------------------------------------------

const DISCORD_WEBHOOK_KEY = "@discord_webhook_url";

async function discordWebhook(): Promise<string | null> {
  return (
    (await getItem(DISCORD_WEBHOOK_KEY)) ||
    process.env.EXPO_PUBLIC_DISCORD_WEBHOOK_URL ||
    null
  );
}

export const discordSendMessage: AgentTool = {
  name: "discord_send_message",
  integration: "discord",
  label: "Enviando mensagem no Discord",
  description: "Envia uma mensagem para um canal do Discord via webhook.",
  mutates: true,
  isConfigured: async () => !!(await discordWebhook()),
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Mensagem. Máximo de 2000 caracteres.",
      },
      username: {
        type: "string",
        description: "Sobrescreve o nome exibido do webhook. Opcional.",
      },
    },
    required: ["content"],
  },
  async execute(args, ctx) {
    const webhook = await discordWebhook();
    if (!webhook) return notConfigured("Discord", "URL do webhook");

    if (args.content.length > 2000)
      return fail(
        "Discord limita mensagens a 2000 caracteres. Encurte e tente de novo.",
      );

    // Webhook do Discord não usa Authorization — o token está na própria URL.
    // O código antigo mandava `Bot ${token}` junto, o que fazia a request falhar.
    const res = await apiCall(webhook, {
      method: "POST",
      body: {
        content: args.content,
        ...(args.username ? { username: args.username } : {}),
      },
      signal: ctx.signal,
    });

    if (!res.ok) return fail(extractApiError(res));

    return ok("Mensagem enviada para o Discord");
  },
};

// ---------------------------------------------------------------------------
// WhatsApp (Cloud API)
// ---------------------------------------------------------------------------

const WA_TOKEN_KEY = "@whatsapp_token";
const WA_PHONE_ID_KEY = "@whatsapp_phone_number_id";
const WA_RECIPIENT_KEY = "@whatsapp_recipient";

async function waConfig() {
  const token =
    (await getItem(WA_TOKEN_KEY)) ||
    process.env.EXPO_PUBLIC_ACCESS_TOKEN_WHATSAPP;
  const phoneId =
    (await getItem(WA_PHONE_ID_KEY)) || process.env.EXPO_PUBLIC_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  return { token, phoneId };
}

export const whatsappSendMessage: AgentTool = {
  name: "whatsapp_send_message",
  integration: "whatsapp",
  label: "Enviando WhatsApp",
  description:
    "Envia uma mensagem de texto pela WhatsApp Cloud API. Só funciona dentro da janela de 24h de atendimento; fora dela o WhatsApp exige template aprovado.",
  mutates: true,
  isConfigured: async () => !!(await waConfig()),
  parameters: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description:
          "Número no formato internacional sem símbolos, ex.: 5511987654321. Omita para o destinatário padrão.",
      },
      text: { type: "string", description: "Mensagem." },
    },
    required: ["text"],
  },
  async execute(args, ctx) {
    const cfg = await waConfig();
    if (!cfg) return notConfigured("WhatsApp", "access token e phone number ID");

    const to =
      args.to ||
      (await getItem(WA_RECIPIENT_KEY)) ||
      process.env.EXPO_PUBLIC_WHATSAPP_RECIPIENT_NUMBER;

    if (!to)
      return fail("Nenhum destinatário informado. Pergunte o número ao usuário.");

    const res = await apiCall(
      `https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: String(to).replace(/\D/g, ""),
          type: "text",
          text: { preview_url: false, body: args.text },
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(`Mensagem enviada para ${to}`, {
      id: res.data?.messages?.[0]?.id,
    });
  },
};

// ---------------------------------------------------------------------------
// Microsoft Teams
// ---------------------------------------------------------------------------

const TEAMS_CONFIG_KEY = "@teams_config";
const TEAMS_WEBHOOK_KEY = "@teams_webhook_url";

type TeamsConfig = {
  clientId?: string;
  tenantId?: string;
  clientSecret?: string;
  teamId?: string;
  channelId?: string;
};

/** Client credentials flow — devolve um token de app do Microsoft Graph. */
async function graphToken(cfg: TeamsConfig, signal?: AbortSignal) {
  const body = new URLSearchParams({
    client_id: cfg.clientId!,
    client_secret: cfg.clientSecret!,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  }).toString();

  const response = await fetch(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal,
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description ?? "Falha ao autenticar no Azure AD");
  }

  return data.access_token as string;
}

export const teamsSendMessage: AgentTool = {
  name: "teams_send_message",
  integration: "teams",
  label: "Enviando mensagem no Teams",
  description:
    "Posta uma mensagem em um canal do Microsoft Teams. Usa Incoming Webhook quando configurado, senão a Graph API.",
  mutates: true,
  isConfigured: async () =>
    (await hasKeys(TEAMS_WEBHOOK_KEY)) ||
    (await hasFields(TEAMS_CONFIG_KEY, "clientId", "tenantId", "clientSecret")),
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Mensagem. Aceita HTML simples." },
    },
    required: ["text"],
  },
  async execute(args, ctx) {
    // Caminho 1: Incoming Webhook. Mais simples e não precisa de OAuth.
    const webhook = await getItem(TEAMS_WEBHOOK_KEY);
    if (webhook) {
      const res = await apiCall(webhook, {
        method: "POST",
        body: { text: args.text },
        signal: ctx.signal,
      });
      if (!res.ok) return fail(extractApiError(res));
      return ok("Mensagem enviada para o Teams via webhook");
    }

    // Caminho 2: Graph API com client credentials.
    const cfg = await getJson<TeamsConfig>(TEAMS_CONFIG_KEY);
    if (!cfg?.clientId || !cfg?.tenantId || !cfg?.clientSecret)
      return notConfigured(
        "Microsoft Teams",
        "URL de Incoming Webhook, ou client ID + tenant ID + client secret",
      );

    if (!cfg.teamId || !cfg.channelId)
      return fail(
        "Faltando team ID e channel ID na configuração do Teams. Peça ao usuário para preencher na tela do Teams, ou usar um Incoming Webhook (bem mais simples).",
      );

    try {
      ctx.progress("Autenticando no Microsoft Graph...");
      const token = await graphToken(cfg, ctx.signal);

      const res = await apiCall(
        `https://graph.microsoft.com/v1.0/teams/${cfg.teamId}/channels/${cfg.channelId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: { body: { contentType: "html", content: args.text } },
          signal: ctx.signal,
        },
      );

      if (!res.ok) return fail(extractApiError(res));

      return ok("Mensagem enviada para o canal do Teams");
    } catch (err: any) {
      return fail(`Teams: ${err.message}`);
    }
  },
};

export const communicationTools = [
  slackListChannels,
  slackSendMessage,
  discordSendMessage,
  whatsappSendMessage,
  teamsSendMessage,
];
