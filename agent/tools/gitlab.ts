/**
 * Tools do GitLab.
 *
 * A versão antiga tinha o project ID "79990056" chumbado no código e as
 * branches invertidas (source: "main", target: "feat/integration"), o que
 * abria MR de main para a feature. Aqui tudo vem de argumento ou config.
 */

import type { AgentTool } from "@/agent/types";
import {
  apiCall,
  extractApiError,
  fail,
  getItem,
  hasKeys,
  notConfigured,
  ok,
  truncate,
} from "./_utils";

const URL_KEY = "@gitlab_url";
const TOKEN_KEY = "@gitlab_token";
const PROJECT_KEY = "@gitlab_project_id";

type GitLabConfig = { apiBase: string; token: string; projectId: string | null };

async function config(): Promise<GitLabConfig | null> {
  const url = await getItem(URL_KEY);
  const token = await getItem(TOKEN_KEY);
  if (!url || !token) return null;

  return {
    apiBase: `${url.replace(/\/+$/, "")}/api/v4`,
    token,
    projectId: await getItem(PROJECT_KEY),
  };
}

function headers(token: string) {
  return { "PRIVATE-TOKEN": token };
}

const isConfigured = () => hasKeys(URL_KEY, TOKEN_KEY);

const projectArg = {
  project_id: {
    type: "string",
    description:
      "ID numérico do projeto ou caminho URL-encoded (grupo%2Fprojeto). Omita para usar o projeto padrão configurado.",
  },
};

export const gitlabListMergeRequests: AgentTool = {
  name: "gitlab_list_merge_requests",
  integration: "gitlab",
  label: "Listando Merge Requests",
  description:
    "Lista Merge Requests de um projeto do GitLab. Use para achar o IID de um MR.",
  mutates: false,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...projectArg,
      state: {
        type: "string",
        enum: ["opened", "closed", "merged", "all"],
        description: "Filtro de estado. Padrão: opened.",
      },
    },
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("GitLab", "URL da instância e token");

    const projectId = args.project_id || cfg.projectId;
    if (!projectId)
      return fail("Nenhum project ID informado nem configurado no app.");

    const res = await apiCall(
      `${cfg.apiBase}/projects/${encodeURIComponent(projectId)}/merge_requests?state=${args.state ?? "opened"}&per_page=10`,
      { headers: headers(cfg.token), signal: ctx.signal },
    );

    if (!res.ok) return fail(extractApiError(res));

    const mrs = (res.data as any[]).map((mr) => ({
      iid: mr.iid,
      title: mr.title,
      author: mr.author?.username,
      state: mr.state,
      source_branch: mr.source_branch,
      target_branch: mr.target_branch,
      url: mr.web_url,
    }));

    return ok(`${mrs.length} merge request(s) encontrado(s)`, mrs);
  },
};

export const gitlabGetMergeRequestDiff: AgentTool = {
  name: "gitlab_get_merge_request_diff",
  integration: "gitlab",
  label: "Lendo o diff do MR",
  description:
    "Busca as alterações de código de um Merge Request. Chame antes de revisar código no GitLab.",
  mutates: false,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...projectArg,
      merge_request_iid: { type: "number", description: "IID do MR." },
    },
    required: ["merge_request_iid"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("GitLab", "URL da instância e token");

    const projectId = args.project_id || cfg.projectId;
    if (!projectId) return fail("Nenhum project ID informado nem configurado.");

    const res = await apiCall(
      `${cfg.apiBase}/projects/${encodeURIComponent(projectId)}/merge_requests/${args.merge_request_iid}/changes`,
      { headers: headers(cfg.token), signal: ctx.signal },
    );

    if (!res.ok) return fail(extractApiError(res));

    const diff = (res.data.changes as any[])
      .map((c) => `--- ${c.old_path}\n+++ ${c.new_path}\n${c.diff}`)
      .join("\n\n");

    return ok(`Diff do MR !${args.merge_request_iid} carregado`, {
      title: res.data.title,
      diff: truncate(diff, 24000),
    });
  },
};

export const gitlabCommentOnMergeRequest: AgentTool = {
  name: "gitlab_comment_on_merge_request",
  integration: "gitlab",
  label: "Comentando no MR",
  description: "Posta um comentário (note) em um Merge Request do GitLab.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...projectArg,
      merge_request_iid: { type: "number", description: "IID do MR." },
      body: { type: "string", description: "Comentário em Markdown." },
    },
    required: ["merge_request_iid", "body"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("GitLab", "URL da instância e token");

    const projectId = args.project_id || cfg.projectId;
    if (!projectId) return fail("Nenhum project ID informado nem configurado.");

    const res = await apiCall(
      `${cfg.apiBase}/projects/${encodeURIComponent(projectId)}/merge_requests/${args.merge_request_iid}/notes`,
      {
        method: "POST",
        headers: headers(cfg.token),
        body: { body: args.body },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(`Comentário postado no MR !${args.merge_request_iid}`);
  },
};

export const gitlabCreateMergeRequest: AgentTool = {
  name: "gitlab_create_merge_request",
  integration: "gitlab",
  label: "Criando Merge Request",
  description: "Abre um novo Merge Request no GitLab.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...projectArg,
      title: { type: "string", description: "Título do MR." },
      description: { type: "string", description: "Descrição em Markdown." },
      source_branch: {
        type: "string",
        description: "Branch com as alterações.",
      },
      target_branch: {
        type: "string",
        description: "Branch de destino, ex.: main.",
      },
    },
    required: ["title", "source_branch", "target_branch"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg) return notConfigured("GitLab", "URL da instância e token");

    const projectId = args.project_id || cfg.projectId;
    if (!projectId) return fail("Nenhum project ID informado nem configurado.");

    const res = await apiCall(
      `${cfg.apiBase}/projects/${encodeURIComponent(projectId)}/merge_requests`,
      {
        method: "POST",
        headers: headers(cfg.token),
        body: {
          title: args.title,
          description: args.description ?? "",
          source_branch: args.source_branch,
          target_branch: args.target_branch,
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      `MR !${res.data.iid} aberto: ${args.title}`,
      { iid: res.data.iid },
      res.data.web_url,
    );
  },
};

export const gitlabTools = [
  gitlabListMergeRequests,
  gitlabGetMergeRequestDiff,
  gitlabCommentOnMergeRequest,
  gitlabCreateMergeRequest,
];
