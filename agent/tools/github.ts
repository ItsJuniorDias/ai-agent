/**
 * Tools do GitHub.
 *
 * O ponto principal do refactor: o antigo `runCodeReview.tsx` era um bloco
 * monolítico — pegava o texto do input, mandava pro Gemini e abria um PR com a
 * resposta, sempre nessa ordem, sem nunca ler o código de verdade.
 *
 * Aqui as capacidades são atômicas. O agente compõe sozinho:
 *   listar PRs → ler o diff → raciocinar sobre o código → comentar a review.
 * Esse encadeamento é decisão do modelo, não uma sequência hardcoded.
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
  truncate,
} from "./_utils";

const GITHUB_API = "https://api.github.com";
const STORAGE_KEY = "@github_config";

type GitHubConfig = {
  accessToken?: string;
  baseUrl?: string;
  repoOwner?: string;
  repoName?: string;
  sourceBranch?: string;
  targetBranch?: string;
  title?: string;
  description?: string;
};

async function config(): Promise<GitHubConfig | null> {
  // Só lê do AsyncStorage. O fallback anterior para EXPO_PUBLIC_GITHUB_TOKEN
  // era perigoso: variáveis EXPO_PUBLIC_* são *inlined no bundle JS* na build,
  // então qualquer token colocado no .env de desenvolvimento acabaria embarcado
  // num release publicado na App Store, extraível por qualquer curioso.
  // Credencial só pela tela do app, gravada no storage seguro do device.
  const stored = await getJson<GitHubConfig>(STORAGE_KEY);
  if (!stored?.accessToken) return null;
  return stored;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Resolve owner/repo a partir do argumento ou da config salva. */
function resolveRepo(
  cfg: GitHubConfig,
  args: { owner?: string; repo?: string },
): { owner: string; repo: string } | null {
  const owner = args.owner || cfg.repoOwner;
  const repo = args.repo || cfg.repoName;
  if (!owner || !repo) return null;
  return { owner, repo };
}

const isConfigured = () => hasFields(STORAGE_KEY, "accessToken");

const repoArgs = {
  owner: {
    type: "string",
    description:
      "Dono do repositório. Omita para usar o repositório padrão configurado no app.",
  },
  repo: {
    type: "string",
    description:
      "Nome do repositório. Omita para usar o repositório padrão configurado no app.",
  },
};

export const githubListPullRequests: AgentTool = {
  name: "github_list_pull_requests",
  integration: "github",
  label: "Listando Pull Requests",
  description:
    "Lista Pull Requests de um repositório do GitHub. Use para descobrir o número de um PR antes de ler o diff ou comentar.",
  mutates: false,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...repoArgs,
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "Filtro de estado. Padrão: open.",
      },
      limit: {
        type: "number",
        description: "Quantos PRs retornar (1-20). Padrão: 10.",
      },
    },
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg?.accessToken) return notConfigured("GitHub", "access token");

    const target = resolveRepo(cfg, args);
    if (!target)
      return fail(
        "Nenhum repositório informado nem configurado. Peça ao usuário o owner e o repo.",
      );

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 20);
    const state = args.state ?? "open";

    const res = await apiCall(
      `${GITHUB_API}/repos/${target.owner}/${target.repo}/pulls?state=${state}&per_page=${limit}`,
      { headers: headers(cfg.accessToken), signal: ctx.signal },
    );

    if (!res.ok) return fail(extractApiError(res));

    const pulls = (res.data as any[]).map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login,
      state: pr.state,
      draft: pr.draft,
      head: pr.head?.ref,
      base: pr.base?.ref,
      changed_files: pr.changed_files,
      url: pr.html_url,
    }));

    return ok(
      `${pulls.length} PR(s) ${state} em ${target.owner}/${target.repo}`,
      pulls,
    );
  },
};

export const githubGetPullRequestDiff: AgentTool = {
  name: "github_get_pull_request_diff",
  integration: "github",
  label: "Lendo o diff do PR",
  description:
    "Busca o diff unificado completo de um Pull Request. Chame ANTES de fazer code review — você precisa ler o código real para revisar, nunca invente o conteúdo do diff.",
  mutates: false,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...repoArgs,
      pull_number: { type: "number", description: "Número do PR." },
    },
    required: ["pull_number"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg?.accessToken) return notConfigured("GitHub", "access token");

    const target = resolveRepo(cfg, args);
    if (!target) return fail("Nenhum repositório informado nem configurado.");

    ctx.progress(`Baixando diff do PR #${args.pull_number}...`);

    const res = await apiCall<string>(
      `${GITHUB_API}/repos/${target.owner}/${target.repo}/pulls/${args.pull_number}`,
      {
        headers: {
          ...headers(cfg.accessToken),
          Accept: "application/vnd.github.v3.diff",
        },
        raw: true,
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    // Diffs grandes estouram contexto e custam caro. 24k chars ~= 6k tokens.
    return ok(
      `Diff do PR #${args.pull_number} carregado (${res.data.length} caracteres)`,
      { diff: truncate(res.data, 24000) },
    );
  },
};

export const githubCommentOnPullRequest: AgentTool = {
  name: "github_comment_on_pull_request",
  integration: "github",
  label: "Comentando no PR",
  description:
    "Posta um comentário em um Pull Request. Use para entregar o resultado de um code review depois de ter lido o diff.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...repoArgs,
      pull_number: { type: "number", description: "Número do PR." },
      body: {
        type: "string",
        description: "Conteúdo do comentário em Markdown.",
      },
    },
    required: ["pull_number", "body"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg?.accessToken) return notConfigured("GitHub", "access token");

    const target = resolveRepo(cfg, args);
    if (!target) return fail("Nenhum repositório informado nem configurado.");

    // Comentário de PR usa o endpoint de issues — PR é uma issue no GitHub.
    const res = await apiCall(
      `${GITHUB_API}/repos/${target.owner}/${target.repo}/issues/${args.pull_number}/comments`,
      {
        method: "POST",
        headers: headers(cfg.accessToken),
        body: { body: args.body },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      `Comentário postado no PR #${args.pull_number}`,
      { id: res.data.id },
      res.data.html_url,
    );
  },
};

export const githubCreatePullRequest: AgentTool = {
  name: "github_create_pull_request",
  integration: "github",
  label: "Criando Pull Request",
  description:
    "Abre um novo Pull Request. As branches informadas precisam existir no repositório.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...repoArgs,
      title: { type: "string", description: "Título do PR." },
      body: { type: "string", description: "Descrição do PR em Markdown." },
      head: {
        type: "string",
        description: "Branch de origem, com as alterações.",
      },
      base: {
        type: "string",
        description: "Branch de destino, ex.: main.",
      },
      draft: { type: "boolean", description: "Abrir como rascunho." },
    },
    required: ["title", "body"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg?.accessToken) return notConfigured("GitHub", "access token");

    const target = resolveRepo(cfg, args);
    if (!target) return fail("Nenhum repositório informado nem configurado.");

    const head = args.head || cfg.sourceBranch;
    const base = args.base || cfg.targetBranch;

    if (!head || !base)
      return fail(
        "Faltando branch de origem (head) e/ou destino (base). Pergunte ao usuário ou configure na tela do GitHub.",
      );

    const res = await apiCall(
      `${GITHUB_API}/repos/${target.owner}/${target.repo}/pulls`,
      {
        method: "POST",
        headers: headers(cfg.accessToken),
        body: {
          title: args.title,
          body: args.body,
          head,
          base,
          draft: args.draft ?? false,
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      `PR #${res.data.number} aberto: ${args.title}`,
      { number: res.data.number },
      res.data.html_url,
    );
  },
};

export const githubCreateIssue: AgentTool = {
  name: "github_create_issue",
  integration: "github",
  label: "Criando issue no GitHub",
  description: "Cria uma issue em um repositório do GitHub.",
  mutates: true,
  isConfigured,
  parameters: {
    type: "object",
    properties: {
      ...repoArgs,
      title: { type: "string", description: "Título da issue." },
      body: { type: "string", description: "Corpo em Markdown." },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Labels a aplicar.",
      },
    },
    required: ["title", "body"],
  },
  async execute(args, ctx) {
    const cfg = await config();
    if (!cfg?.accessToken) return notConfigured("GitHub", "access token");

    const target = resolveRepo(cfg, args);
    if (!target) return fail("Nenhum repositório informado nem configurado.");

    const res = await apiCall(
      `${GITHUB_API}/repos/${target.owner}/${target.repo}/issues`,
      {
        method: "POST",
        headers: headers(cfg.accessToken),
        body: {
          title: args.title,
          body: args.body,
          ...(args.labels?.length ? { labels: args.labels } : {}),
        },
        signal: ctx.signal,
      },
    );

    if (!res.ok) return fail(extractApiError(res));

    return ok(
      `Issue #${res.data.number} criada`,
      { number: res.data.number },
      res.data.html_url,
    );
  },
};

export const githubTools = [
  githubListPullRequests,
  githubGetPullRequestDiff,
  githubCommentOnPullRequest,
  githubCreatePullRequest,
  githubCreateIssue,
];
