/**
 * Tools do Jira Cloud (REST API v3).
 *
 * A versão antiga tinha o summary chumbado em "Implementar nova funcionalidade
 * do STP" e um e-mail de outra empresa como default — toda task saía com o
 * mesmo título. Agora o modelo escreve o summary a partir do pedido real.
 */

import type { AgentTool } from "@/agent/types";
import {
  apiCall,
  extractApiError,
  fail,
  getJson,
  hasFields,
  notConfigured,
  ok,
  toBase64,
} from "./_utils";

const STORAGE_KEY = "@jira_config";

type JiraConfig = {
  domain?: string;
  email?: string;
  apiToken?: string;
  projectKey?: string;
};

async function config(): Promise<Required<JiraConfig> | null> {
  const cfg = await getJson<JiraConfig>(STORAGE_KEY);
  if (!cfg?.domain || !cfg?.email || !cfg?.apiToken) return null;
  return {
    domain: cfg.domain.replace(/\.atlassian\.net$/, ""),
    email: cfg.email,
    apiToken: cfg.apiToken,
    projectKey: cfg.projectKey ?? "",
  };
}

function headers(email: string, token: string) {
  return {
    Authorization: `Basic ${toBase64(`${email}:${token}`)}`,
    Accept: "application/json",
  };
}

/** O Jira v3 exige descrição no formato ADF, não texto puro. */
function toADF(text: string) {
  return {
    type: "doc",
    version: 1,
    content: text.split("\n\n").map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph || " " }],
    })),
  };
}

const isConfigured = () =>
  hasFields(STORAGE_KEY, "domain", "email", "apiToken");

export const jiraCreateIssue: AgentTool = {
  name: "jira_create_issue",
  integration: "jira",
  label: "Criando task no Jira",
  description:
    "Cria uma issue no Jira. Escreva um summary específico e descritivo a partir do pedido do usuário — nunca use título genérico.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Título da issue. Curto e específico.",
      },
      description: {
        type: "string",
        description: "Descrição completa. Quebras de parágrafo com \\n\\n.",
      },
      project_key: {
        type: "string",
        description: "Chave do projeto, ex.: ENG. Omita para usar a padrão.",
      },
      issue_type: {
        type: "string",
        description: "Tipo: Story, Task, Bug, Epic. Padrão: Task.",
      },
      priority: {
        type: "string",
        description: "Nome da prioridade, ex.: High. Opcional.",
      },
    },
    required: ["summary", "description"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("Jira", "domínio, e-mail e API token");

    const projectKey = args.project_key || cfg.projectKey;
    if (!projectKey)
      return fail(
        "Nenhuma chave de projeto informada nem configurada. Pergunte ao usuário qual projeto usar.",
      );

    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      summary: args.summary,
      description: toADF(args.description),
      issuetype: { name: args.issue_type ?? "Task" },
    };

    if (args.priority) fields.priority = { name: args.priority };

    const res = await apiCall(
      `https://${cfg.domain}.atlassian.net/rest/api/3/issue`,
      {
        method: "POST",
        headers: headers(cfg.email, cfg.apiToken),
        body: { fields },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    const url = `https://${cfg.domain}.atlassian.net/browse/${res.data.key}`;
    return ok(`Issue ${res.data.key} criada`, { key: res.data.key }, url);
  },
};

export const jiraSearchIssues: AgentTool = {
  name: "jira_search_issues",
  integration: "jira",
  label: "Buscando no Jira",
  description:
    "Busca issues no Jira usando JQL. Exemplos: 'project = ENG AND status = \"In Progress\"', 'assignee = currentUser() ORDER BY created DESC'.",
  mutates: false,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      jql: { type: "string", description: "Query JQL." },
      limit: { type: "number", description: "Máximo de resultados. Padrão: 10." },
    },
    required: ["jql"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("Jira", "domínio, e-mail e API token");

    const res = await apiCall(
      `https://${cfg.domain}.atlassian.net/rest/api/3/search/jql`,
      {
        method: "POST",
        headers: headers(cfg.email, cfg.apiToken),
        body: {
          jql: args.jql,
          maxResults: Math.min(args.limit ?? 10, 25),
          fields: ["summary", "status", "assignee", "priority", "created"],
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    const issues = (res.data.issues as any[]).map((i) => ({
      key: i.key,
      summary: i.fields?.summary,
      status: i.fields?.status?.name,
      assignee: i.fields?.assignee?.displayName ?? "Não atribuída",
      priority: i.fields?.priority?.name,
    }));

    return ok(`${issues.length} issue(s) encontrada(s)`, issues);
  },
};

export const jiraAddComment: AgentTool = {
  name: "jira_add_comment",
  integration: "jira",
  label: "Comentando no Jira",
  description: "Adiciona um comentário a uma issue existente do Jira.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      issue_key: { type: "string", description: "Chave da issue, ex.: ENG-42." },
      body: { type: "string", description: "Texto do comentário." },
    },
    required: ["issue_key", "body"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("Jira", "domínio, e-mail e API token");

    const res = await apiCall(
      `https://${cfg.domain}.atlassian.net/rest/api/3/issue/${args.issue_key}/comment`,
      {
        method: "POST",
        headers: headers(cfg.email, cfg.apiToken),
        body: { body: toADF(args.body) },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      `Comentário adicionado em ${args.issue_key}`,
      undefined,
      `https://${cfg.domain}.atlassian.net/browse/${args.issue_key}`,
    );
  },
};

export const jiraTools = [jiraCreateIssue, jiraSearchIssues, jiraAddComment];
