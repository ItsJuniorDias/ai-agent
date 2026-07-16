/**
 * Tools de produtividade: Vercel, Figma, Notion, Linear e Gmail.
 */

import * as Linking from "expo-linking";
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
  toBase64Url,
} from "./_utils";

// ---------------------------------------------------------------------------
// Vercel
// ---------------------------------------------------------------------------

const VERCEL_TOKEN_KEY = "@vercel_token";
const VERCEL_PROJECT_KEY = "@vercel_project_id";
const VERCEL_TEAM_KEY = "@vercel_team_id";

async function vercelConfig() {
  const token = await getItem(VERCEL_TOKEN_KEY);
  const projectId = await getItem(VERCEL_PROJECT_KEY);
  if (!token || !projectId) return null;
  return { token, projectId, teamId: await getItem(VERCEL_TEAM_KEY) };
}

function teamQuery(teamId: string | null, prefix: "?" | "&" = "?") {
  return teamId ? `${prefix}teamId=${teamId}` : "";
}

export const vercelListDeployments: AgentTool = {
  name: "vercel_list_deployments",
  integration: "vercel",
  label: "Consultando deploys da Vercel",
  description:
    "Lista os deploys recentes do projeto na Vercel com estado e timestamp. Use para checar se o último deploy passou.",
  mutates: false,
  isConfigured: () => hasKeys(VERCEL_TOKEN_KEY, VERCEL_PROJECT_KEY),
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Quantos deploys. Padrão: 5." },
    },
  },
  async execute(args, ctx) {
    const cfg = await vercelConfig();
    if (!cfg) return notConfigured("Vercel", "token e project ID");

    const res = await apiCall(
      `https://api.vercel.com/v6/deployments?projectId=${cfg.projectId}&limit=${Math.min(args.limit ?? 5, 20)}${teamQuery(cfg.teamId, "&")}`,
      {
        headers: { Authorization: `Bearer ${cfg.token}` },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    const deployments = (res.data.deployments as any[]).map((d) => ({
      uid: d.uid,
      state: d.state,
      target: d.target,
      created: new Date(d.created).toISOString(),
      url: `https://${d.url}`,
      creator: d.creator?.username,
    }));

    return ok(`${deployments.length} deploy(s) encontrado(s)`, deployments);
  },
};

export const vercelTriggerDeploy: AgentTool = {
  name: "vercel_trigger_deploy",
  integration: "vercel",
  label: "Disparando deploy na Vercel",
  description:
    "Dispara um novo deploy de produção clonando a configuração do último deploy de produção. Ação destrutiva — sempre confirme antes.",
  mutates: true,
  isConfigured: () => hasKeys(VERCEL_TOKEN_KEY, VERCEL_PROJECT_KEY),
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Nome identificando o deploy. Opcional.",
      },
    },
  },
  async execute(args, ctx) {
    const cfg = await vercelConfig();
    if (!cfg) return notConfigured("Vercel", "token e project ID");

    ctx.progress("Buscando o último deploy de produção...");

    const project = await apiCall(
      `https://api.vercel.com/v9/projects/${cfg.projectId}${teamQuery(cfg.teamId)}`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, signal: ctx.signal },
    );

    if (!project.ok) return fail(extractApiError(project));

    const lastDeployId = project.data?.targets?.production?.id;
    if (!lastDeployId)
      return fail(
        "Nenhum deploy de produção anterior para clonar. Faça o primeiro deploy pelo dashboard da Vercel ou via git push.",
      );

    ctx.progress("Disparando novo deploy...");

    const res = await apiCall(
      `https://api.vercel.com/v13/deployments?forceNew=1${teamQuery(cfg.teamId, "&")}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
        body: {
          name: args.name ?? `Deploy via AI Agent`,
          deploymentId: lastDeployId,
          target: "production",
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      "Deploy de produção iniciado",
      { id: res.data.id, state: res.data.readyState },
      res.data.url ? `https://${res.data.url}` : undefined,
    );
  },
};

// ---------------------------------------------------------------------------
// Figma
// ---------------------------------------------------------------------------

const FIGMA_TOKEN_KEY = "@figma_token";
const FIGMA_FILE_KEY = "@figma_file_key";

export const figmaGetFile: AgentTool = {
  name: "figma_get_file",
  integration: "figma",
  label: "Lendo arquivo do Figma",
  description:
    "Busca metadados e a lista de páginas/frames de um arquivo do Figma. Use para entender a estrutura antes de comentar.",
  mutates: false,
  isConfigured: () => hasKeys(FIGMA_TOKEN_KEY, FIGMA_FILE_KEY),
  parameters: {
    type: "object",
    properties: {
      file_key: {
        type: "string",
        description: "Chave do arquivo. Omita para usar a configurada.",
      },
    },
  },
  async execute(args, ctx) {
    const token = await getItem(FIGMA_TOKEN_KEY);
    const fileKey = args.file_key || (await getItem(FIGMA_FILE_KEY));
    if (!token || !fileKey) return notConfigured("Figma", "token e file key");

    const res = await apiCall(
      `https://api.figma.com/v1/files/${fileKey}?depth=2`,
      { headers: { "X-Figma-Token": token }, signal: ctx.signal },
    );

    if (!res.ok) return fail(extractApiError(res));

    const pages = (res.data.document?.children ?? []).map((page: any) => ({
      name: page.name,
      frames: (page.children ?? []).slice(0, 20).map((c: any) => c.name),
    }));

    return ok(`Arquivo "${res.data.name}" carregado`, {
      name: res.data.name,
      lastModified: res.data.lastModified,
      pages,
    });
  },
};

export const figmaPostComment: AgentTool = {
  name: "figma_post_comment",
  integration: "figma",
  label: "Comentando no Figma",
  description: "Posta um comentário no canvas de um arquivo do Figma.",
  mutates: true,
  isConfigured: () => hasKeys(FIGMA_TOKEN_KEY, FIGMA_FILE_KEY),
  parameters: {
    type: "object",
    properties: {
      file_key: {
        type: "string",
        description: "Chave do arquivo. Omita para usar a configurada.",
      },
      message: { type: "string", description: "Texto do comentário." },
      x: { type: "number", description: "Coordenada X do pin. Padrão: 0." },
      y: { type: "number", description: "Coordenada Y do pin. Padrão: 0." },
    },
    required: ["message"],
  },
  async execute(args, ctx) {
    const token = await getItem(FIGMA_TOKEN_KEY);
    const fileKey = args.file_key || (await getItem(FIGMA_FILE_KEY));
    if (!token || !fileKey) return notConfigured("Figma", "token e file key");

    const res = await apiCall(
      `https://api.figma.com/v1/files/${fileKey}/comments`,
      {
        method: "POST",
        headers: { "X-Figma-Token": token },
        body: {
          message: args.message,
          client_meta: { x: args.x ?? 0, y: args.y ?? 0 },
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      "Comentário postado no Figma",
      { id: res.data.id },
      `https://www.figma.com/file/${fileKey}`,
    );
  },
};

// ---------------------------------------------------------------------------
// Notion
// ---------------------------------------------------------------------------

const NOTION_CONFIG_KEY = "@notion_config";
const NOTION_VERSION = "2022-06-28";

type NotionConfig = { token?: string; databaseId?: string };

async function notionConfig() {
  const cfg = await getJson<NotionConfig>(NOTION_CONFIG_KEY);
  if (!cfg?.token) return null;
  return cfg;
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
  };
}

/** Converte texto em blocos de parágrafo do Notion (limite de 2000 chars/bloco). */
function toNotionBlocks(text: string) {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, 90)
    .map((line) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: line.slice(0, 2000) } }],
      },
    }));
}

export const notionCreatePage: AgentTool = {
  name: "notion_create_page",
  integration: "notion",
  label: "Salvando no Notion",
  description:
    "Cria uma página em um database do Notion. O database precisa estar compartilhado com a integração.",
  mutates: true,
  isConfigured: () => hasFields(NOTION_CONFIG_KEY, "token"),
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título da página." },
      content: {
        type: "string",
        description: "Corpo da página. Uma linha por parágrafo.",
      },
      database_id: {
        type: "string",
        description: "ID do database. Omita para usar o configurado.",
      },
    },
    required: ["title", "content"],
  },
  async execute(args, ctx) {
    const cfg = await notionConfig();
    if (!cfg) return notConfigured("Notion", "integration token");

    const databaseId = args.database_id || cfg.databaseId;
    if (!databaseId)
      return fail(
        "Nenhum database ID informado nem configurado. Peça ao usuário o ID do database do Notion.",
      );

    const res = await apiCall("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionHeaders(cfg.token!),
      body: {
        parent: { database_id: databaseId },
        properties: {
          // "Name" é o nome padrão da propriedade título em databases do Notion.
          Name: { title: [{ text: { content: args.title } }] },
        },
        children: toNotionBlocks(args.content),
      },
      signal: ctx.signal,
    });

    if (!res.ok) return fail(extractApiError(res));

    return ok(`Página "${args.title}" criada`, { id: res.data.id }, res.data.url);
  },
};

export const notionSearch: AgentTool = {
  name: "notion_search",
  integration: "notion",
  label: "Buscando no Notion",
  description:
    "Busca páginas e databases no workspace do Notion pelo título.",
  mutates: false,
  isConfigured: () => hasFields(NOTION_CONFIG_KEY, "token"),
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Termo de busca." },
    },
    required: ["query"],
  },
  async execute(args, ctx) {
    const cfg = await notionConfig();
    if (!cfg) return notConfigured("Notion", "integration token");

    const res = await apiCall("https://api.notion.com/v1/search", {
      method: "POST",
      headers: notionHeaders(cfg.token!),
      body: { query: args.query, page_size: 10 },
      signal: ctx.signal,
    });

    if (!res.ok) return fail(extractApiError(res));

    const results = (res.data.results as any[]).map((r) => ({
      id: r.id,
      type: r.object,
      title:
        r.properties?.Name?.title?.[0]?.plain_text ??
        r.title?.[0]?.plain_text ??
        "Sem título",
      url: r.url,
    }));

    return ok(`${results.length} resultado(s)`, results);
  },
};

// ---------------------------------------------------------------------------
// Linear
// ---------------------------------------------------------------------------

const LINEAR_CONFIG_KEY = "@linear_config";
const LINEAR_API = "https://api.linear.app/graphql";

type LinearConfig = { apiKey?: string; teamId?: string };

async function linearGraphQL(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
) {
  // A API key do Linear vai no Authorization sem o prefixo "Bearer".
  const res = await apiCall(LINEAR_API, {
    method: "POST",
    headers: { Authorization: apiKey },
    body: { query, variables },
    signal,
  });

  if (!res.ok) throw new Error(extractApiError(res));
  if (res.data?.errors?.length)
    throw new Error(res.data.errors.map((e: any) => e.message).join(", "));

  return res.data.data;
}

export const linearCreateIssue: AgentTool = {
  name: "linear_create_issue",
  integration: "linear",
  label: "Criando issue no Linear",
  description: "Cria uma issue no Linear.",
  mutates: true,
  isConfigured: () => hasFields(LINEAR_CONFIG_KEY, "apiKey"),
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título da issue." },
      description: {
        type: "string",
        description: "Descrição em Markdown.",
      },
      team_id: {
        type: "string",
        description: "UUID do time. Omita para usar o configurado.",
      },
      priority: {
        type: "number",
        description: "0=nenhuma, 1=urgente, 2=alta, 3=média, 4=baixa.",
      },
    },
    required: ["title"],
  },
  async execute(args, ctx) {
    const cfg = await getJson<LinearConfig>(LINEAR_CONFIG_KEY);
    if (!cfg?.apiKey) return notConfigured("Linear", "API key");

    let teamId = args.team_id || cfg.teamId;

    try {
      // Sem team configurado, pega o primeiro do workspace.
      if (!teamId) {
        const teams = await linearGraphQL(
          cfg.apiKey,
          `query { teams(first: 1) { nodes { id name } } }`,
          {},
          ctx.signal,
        );
        teamId = teams?.teams?.nodes?.[0]?.id;
        if (!teamId)
          return fail("Nenhum time encontrado no workspace do Linear.");
      }

      const data = await linearGraphQL(
        cfg.apiKey,
        `mutation Create($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { id identifier title url }
          }
        }`,
        {
          input: {
            teamId,
            title: args.title,
            description: args.description ?? "",
            ...(args.priority !== undefined ? { priority: args.priority } : {}),
          },
        },
        ctx.signal,
      );

      const issue = data?.issueCreate?.issue;
      if (!data?.issueCreate?.success || !issue)
        return fail("O Linear rejeitou a criação da issue.");

      return ok(
        `Issue ${issue.identifier} criada`,
        { identifier: issue.identifier },
        issue.url,
      );
    } catch (err: any) {
      return fail(`Linear: ${err.message}`);
    }
  },
};

export const linearListIssues: AgentTool = {
  name: "linear_list_issues",
  integration: "linear",
  label: "Listando issues do Linear",
  description: "Lista as issues abertas mais recentes do Linear.",
  mutates: false,
  isConfigured: () => hasFields(LINEAR_CONFIG_KEY, "apiKey"),
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Máximo de issues. Padrão: 10." },
    },
  },
  async execute(args, ctx) {
    const cfg = await getJson<LinearConfig>(LINEAR_CONFIG_KEY);
    if (!cfg?.apiKey) return notConfigured("Linear", "API key");

    try {
      const data = await linearGraphQL(
        cfg.apiKey,
        `query List($first: Int!) {
          issues(first: $first, orderBy: updatedAt) {
            nodes {
              identifier title url priority
              state { name }
              assignee { name }
            }
          }
        }`,
        { first: Math.min(args.limit ?? 10, 25) },
        ctx.signal,
      );

      const issues = (data?.issues?.nodes ?? []).map((i: any) => ({
        identifier: i.identifier,
        title: i.title,
        state: i.state?.name,
        assignee: i.assignee?.name ?? "Não atribuída",
        url: i.url,
      }));

      return ok(`${issues.length} issue(s)`, issues);
    } catch (err: any) {
      return fail(`Linear: ${err.message}`);
    }
  },
};

// ---------------------------------------------------------------------------
// Gmail
// ---------------------------------------------------------------------------

const GMAIL_TOKEN_KEY = "@gmail_access_token";
const GMAIL_EMAIL_KEY = "@gmail_email";

/** Monta uma mensagem RFC 2822 codificada em base64url, como a API pede. */
function buildRawEmail(to: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${toBase64Url(subject)}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");

  return toBase64Url(message);
}

export const gmailSendEmail: AgentTool = {
  name: "gmail_send_email",
  integration: "gmail",
  label: "Enviando e-mail",
  description:
    "Envia um e-mail. Com um access token OAuth configurado, envia direto pela Gmail API. Sem token, abre o app de e-mail do celular com tudo preenchido para o usuário só apertar enviar.",
  mutates: true,
  isConfigured: async () => hasKeys(GMAIL_TOKEN_KEY) || hasKeys(GMAIL_EMAIL_KEY),
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "E-mail do destinatário." },
      subject: { type: "string", description: "Assunto." },
      body: { type: "string", description: "Corpo do e-mail em texto puro." },
    },
    required: ["to", "subject", "body"],
  },
  async execute(args, ctx) {
    const accessToken = await getItem(GMAIL_TOKEN_KEY);

    // Sem OAuth: cai para o compositor nativo.
    //
    // SMTP com senha de app (o que a tela do Gmail coletava antes) precisa de
    // socket TCP, que o React Native não tem. Era um campo que nunca poderia
    // funcionar. Isso aqui pelo menos entrega o rascunho pronto.
    if (!accessToken) {
      const url = `mailto:${encodeURIComponent(args.to)}?subject=${encodeURIComponent(args.subject)}&body=${encodeURIComponent(args.body)}`;

      const supported = await Linking.canOpenURL(url);
      if (!supported)
        return fail(
          "Nenhum app de e-mail disponível e nenhum access token do Gmail configurado.",
        );

      await Linking.openURL(url);
      return ok(
        `Rascunho aberto no app de e-mail para ${args.to}. Avise que precisa apertar enviar — o app não tem OAuth do Gmail configurado, então não dá para enviar automaticamente.`,
      );
    }

    const res = await apiCall(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { raw: buildRawEmail(args.to, args.subject, args.body) },
        signal: ctx.signal,
      },
    );

    if (!res.ok) {
      if (res.status === 401)
        return fail(
          "O access token do Gmail expirou. Peça ao usuário para reconectar a conta Google na tela do Gmail.",
        );
      return fail(extractApiError(res));
    }

    return ok(`E-mail enviado para ${args.to}`, { id: res.data.id });
  },
};

export const productivityTools = [
  vercelListDeployments,
  vercelTriggerDeploy,
  figmaGetFile,
  figmaPostComment,
  notionCreatePage,
  notionSearch,
  linearCreateIssue,
  linearListIssues,
  gmailSendEmail,
];
