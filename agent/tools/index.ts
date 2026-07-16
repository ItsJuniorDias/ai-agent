/**
 * Catálogo completo de tools.
 *
 * Adicionar uma capacidade nova ao agente = escrever uma `AgentTool` e
 * incluir aqui. Mais nada. Nenhum `switch`, nenhum `if` em tela de UI.
 */

import type { AgentTool } from "@/agent/types";
import { coreTools } from "./core";
import { githubTools } from "./github";
import { gitlabTools } from "./gitlab";
import { jiraTools } from "./jira";
import { communicationTools } from "./communication";
import { productivityTools } from "./productivity";

export const ALL_TOOLS: AgentTool[] = [
  ...coreTools,
  ...githubTools,
  ...gitlabTools,
  ...jiraTools,
  ...communicationTools,
  ...productivityTools,
];

export {
  coreTools,
  githubTools,
  gitlabTools,
  jiraTools,
  communicationTools,
  productivityTools,
};
