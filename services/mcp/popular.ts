/**
 * Catálogo de servidores MCP conhecidos.
 *
 * Só o *ponteiro*: nome, URL e uma dica de como o usuário obtém o bearer
 * token de cada um. Não incluímos credenciais nem token nenhum aqui — o
 * usuário cola o dele na tela de adicionar.
 *
 * Isso é conveniência, não spec. Um servidor não precisa estar aqui pra
 * funcionar — o usuário pode adicionar qualquer URL na tela "Custom
 * MCP server" e o handshake decide se rola. Este catálogo só evita o
 * usuário ter que descobrir a URL de cada um sozinho.
 *
 * Regra pra entrar aqui:
 *  - Servidor MCP oficial ou reconhecido publicamente.
 *  - URL estável e documentada.
 *  - Instruções de token que caibam em uma linha.
 */

export type PopularServer = {
  /** Slug estável, usado como id padrão. */
  id: string;
  name: string;
  url: string;
  /**
   * Descrição curta do que o servidor traz (1 linha). Aparece embaixo do
   * nome no catálogo.
   */
  description: string;
  /**
   * Ícone Feather pra UI. Reutiliza os ícones que já temos no
   * `INTEGRATION_META` quando possível.
   */
  icon:
    | "package"
    | "database"
    | "alert-triangle"
    | "book-open"
    | "credit-card"
    | "zap"
    | "cloud"
    | "layers"
    | "code"
    | "activity"
    | "hash";
  /**
   * Instrução curta pra o usuário obter o bearer token. Aparece embaixo do
   * campo de token na tela de adicionar. Mantém em inglês porque URLs e
   * nomes de configuração do provedor são em inglês.
   */
  tokenHint: string;
  /** URL da doc oficial pra abrir se quiser mais detalhe. */
  docsUrl?: string;
};

export const POPULAR_MCP_SERVERS: PopularServer[] = [
  {
    id: "linear",
    name: "Linear",
    url: "https://mcp.linear.app/mcp",
    description: "Issues, projects, comments, cycles.",
    icon: "layers",
    tokenHint: "Settings → Security & access → Personal API keys → New key.",
    docsUrl: "https://linear.app/docs/mcp",
  },
  {
    id: "sentry",
    name: "Sentry",
    url: "https://mcp.sentry.dev/mcp",
    description: "Errors, issues, projects, releases.",
    icon: "alert-triangle",
    tokenHint: "Settings → Auth Tokens → Create New Token (scope: read).",
    docsUrl: "https://docs.sentry.io/product/sentry-mcp/",
  },
  {
    id: "notion",
    name: "Notion",
    url: "https://mcp.notion.com/mcp",
    description: "Pages, databases, search, comments.",
    icon: "book-open",
    tokenHint: "Create an internal integration and use its Internal Integration Secret.",
    docsUrl: "https://developers.notion.com/docs/mcp",
  },
  {
    id: "stripe",
    name: "Stripe",
    url: "https://mcp.stripe.com",
    description: "Customers, subscriptions, invoices, payments.",
    icon: "credit-card",
    tokenHint: "Dashboard → Developers → API keys → Restricted key (read-only recommended).",
    docsUrl: "https://docs.stripe.com/mcp",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    url: "https://observability.mcp.cloudflare.com/sse",
    description: "Workers logs, analytics, DNS, R2.",
    icon: "cloud",
    tokenHint: "Dashboard → My Profile → API Tokens → Create Token.",
    docsUrl: "https://developers.cloudflare.com/agents/model-context-protocol/",
  },
  {
    id: "zapier",
    name: "Zapier",
    url: "https://mcp.zapier.com/api/mcp/mcp",
    description: "Gateway to 5000+ apps: Gmail, Trello, Airtable, Calendly...",
    icon: "zap",
    tokenHint: "mcp.zapier.com → New MCP server → copy the URL with your token embedded.",
    docsUrl: "https://zapier.com/mcp",
  },
  {
    id: "github",
    name: "GitHub",
    url: "https://api.githubcopilot.com/mcp",
    description: "Repos, issues, PRs, code search. Read + write.",
    icon: "code",
    tokenHint: "github.com → Settings → Developer settings → Personal access tokens (fine-grained).",
    docsUrl: "https://github.com/github/github-mcp-server",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    url: "https://your-server.example.com/mcp",
    description: "Query and inspect a Postgres database. Self-hosted.",
    icon: "database",
    tokenHint: "Deploy your own instance — this is not a hosted service. See docs.",
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
  },
];

export function getPopularServerById(id: string): PopularServer | undefined {
  return POPULAR_MCP_SERVERS.find((s) => s.id === id);
}
