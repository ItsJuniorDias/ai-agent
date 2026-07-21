/**
 * Assistente proativo.
 *
 * A ideia central do app é "a IA decide". O monitor não foge disso: em vez de um
 * poller determinístico que eu teria que reescrever a cada integração nova, ele
 * roda o *próprio agente* — o mesmo `runAgent` do chat — só que:
 *
 *   1. com as tools peneiradas para **somente leitura + notify_now** (nada que
 *      escreva num sistema externo roda sem um humano na tela);
 *   2. com um bloco de sistema extra que diz ao modelo que ele está em segundo
 *      plano, que ninguém vai responder, e que o único jeito de alcançar o
 *      usuário é o notify_now;
 *   3. com um teto de passos baixo, porque a janela de background do iOS é curta.
 *
 * O agente varre os serviços vigiados, decide o que é digno de interrupção e
 * dispara as notificações ele mesmo. Uma capacidade nova de monitoramento =
 * uma tool de leitura nova. Nenhuma linha aqui muda.
 */

import { runAgent } from "@/agent/run-agent";
import { resolveTools } from "@/agent/registry";
import type { AgentTool } from "@/agent/types";
import {
  loadConfig,
  loadAssistantConfig,
  isWatched,
  saveAssistantState,
  MONITORABLE_INTEGRATIONS,
  type MonitorableIntegration,
} from "@/services/config";
import { getPermissionStatus, isWithinQuietHours } from "@/services/notifications";
import { hasApiKey } from "@/services/openrouter";

/** Tools `core` liberadas na varredura — leitura e o canal de saída. */
const SCAN_CORE_ALLOW = new Set(["notify_now", "get_current_datetime"]);

const LABELS: Record<MonitorableIntegration, string> = {
  github: "GitHub (pull requests)",
  gitlab: "GitLab (merge requests)",
  jira: "Jira (issues)",
  linear: "Linear (issues)",
  vercel: "Vercel (deploys)",
};

export type ScanStatus =
  | "ok"
  | "skipped-disabled"
  | "skipped-quiet"
  | "needs-permission"
  | "no-key"
  | "no-targets"
  | "error";

export type ScanOutcome = {
  status: ScanStatus;
  /** Quantas notificações de fato saíram (deduplicadas não contam). */
  notified: number;
  /** Frase curta para a UI/telemetria. */
  summary: string;
};

export type ScanReason = "background" | "manual";

/**
 * Monta a peneira de tools da varredura sobre a lista já resolvida
 * (`resolveTools` filtrou por integração habilitada + credencial):
 *  - core: só as de SCAN_CORE_ALLOW;
 *  - demais: só integrações vigiadas E tools de leitura (`mutates === false`).
 */
function buildScanFilter(watched: Set<string>) {
  return (tool: AgentTool): boolean => {
    if (tool.integration === "core") return SCAN_CORE_ALLOW.has(tool.name);
    if (!watched.has(tool.integration)) return false;
    return tool.mutates === false;
  };
}

const SCAN_DIRECTIVE = `# Background assistant mode
You are running as a background personal assistant, not in a live chat. The user cannot see this run and will not reply. Your ONLY way to reach them is the notify_now tool.

Scan the connected services listed by the user for anything that genuinely needs attention right now: a pull/merge request waiting on their review, a failed or errored deployment, an issue newly assigned to them, anything blocking or time-sensitive. Only read-only tools are available — you cannot change anything, only look.

For each item that truly deserves interrupting someone's day, call notify_now with:
- a short, specific title (e.g. "PR #42 waiting for your review"),
- a one-line body with the essential detail,
- a stable dedupe_key (the PR/MR URL, the issue key, the deployment id) so the same item never pings twice.

Be conservative. Routine, old, or already-handled items are NOT worth a notification — a ping that wasn't worth it erodes trust. Do not notify about your own reasoning or about "nothing found".

You have very few tool rounds. Read what you need, fire the notifications that matter, and stop. When you are done, reply with a single short line summarizing what you found (this line is for logs, the user won't see it). If nothing was worth a notification, reply exactly: NOTHING.`;

/**
 * Executa uma varredura. Segura de chamar de qualquer lugar — decide sozinha se
 * deve rodar. `signal` permite ao background abortar quando a janela expira.
 */
export async function runAssistantScan(
  reason: ScanReason,
  signal?: AbortSignal,
): Promise<ScanOutcome> {
  const assistant = await loadAssistantConfig();

  // Automático só roda se o monitor está ligado. Manual (botão "Scan now")
  // roda mesmo desligado, para o usuário conseguir testar.
  if (reason === "background" && !assistant.enabled) {
    return { status: "skipped-disabled", notified: 0, summary: "Monitor desligado." };
  }

  if ((await getPermissionStatus()) !== "granted") {
    return {
      status: "needs-permission",
      notified: 0,
      summary: "Notificações não autorizadas.",
    };
  }

  if (!hasApiKey()) {
    return { status: "no-key", notified: 0, summary: "Sem chave do OpenRouter." };
  }

  // Silêncio noturno vale só para o automático; se você tocou "Scan now", quer
  // ver agora.
  if (reason === "background" && isWithinQuietHours(assistant)) {
    return {
      status: "skipped-quiet",
      notified: 0,
      summary: "Dentro do horário silencioso.",
    };
  }

  const config = await loadConfig();
  const resolved = await resolveTools(config);

  // Interseção: integrações monitoráveis, conectadas (presentes em `resolved`) e
  // marcadas para vigiar.
  const present = new Set(resolved.map((t) => t.integration));
  const watchedIds = MONITORABLE_INTEGRATIONS.filter(
    (id) => present.has(id) && isWatched(assistant, id),
  );

  if (!watchedIds.length) {
    await saveAssistantState({
      lastScanAt: new Date().toISOString(),
      lastScanSummary: "Nenhum serviço vigiado conectado.",
      lastScanNotified: 0,
      lastScanReason: reason,
    });
    return {
      status: "no-targets",
      notified: 0,
      summary: "Nenhum serviço monitorável conectado.",
    };
  }

  const watchedSet = new Set<string>(watchedIds);
  const targetList = watchedIds.map((id) => `- ${LABELS[id]}`).join("\n");
  const nowIso = new Date().toISOString();

  const input = `Run your background scan now.
Current time: ${nowIso}
Services to check:
${targetList}`;

  try {
    const result = await runAgent({
      input,
      history: [],
      onEvent: () => {},
      // Fail-closed: como só há tools de leitura + notify (nenhuma mutates),
      // este handler nunca é chamado; se for, recusa.
      requestApproval: async () => "reject",
      signal,
      toolFilter: buildScanFilter(watchedSet),
      extraSystem: SCAN_DIRECTIVE,
      maxStepsOverride: assistant.scanStepBudget,
    });

    // Notificações que de fato saíram (a tool marca as enviadas com este prefixo;
    // as deduplicadas retornam outra frase e não contam).
    const notified = result.steps.filter(
      (s) =>
        s.name === "notify_now" &&
        s.result?.ok === true &&
        typeof s.result.summary === "string" &&
        s.result.summary.startsWith("Notificação enviada"),
    ).length;

    const summary =
      notified > 0
        ? `${notified} alerta(s) enviado(s).`
        : "Nada urgente no momento.";

    await saveAssistantState({
      lastScanAt: new Date().toISOString(),
      lastScanSummary: summary,
      lastScanNotified: notified,
      lastScanReason: reason,
    });

    return { status: "ok", notified, summary };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { status: "error", notified: 0, summary: "Varredura interrompida." };
    }

    const summary = `Falha na varredura: ${err?.message ?? String(err)}`;
    await saveAssistantState({
      lastScanAt: new Date().toISOString(),
      lastScanSummary: summary,
      lastScanNotified: 0,
      lastScanReason: reason,
    });
    return { status: "error", notified: 0, summary };
  }
}
