/**
 * Hook que liga o agente à UI.
 *
 * Responsabilidades: rodar o loop, acumular os passos em estado, expor o
 * status corrente e — a parte delicada — transformar a aprovação humana em uma
 * Promise que o loop pode dar `await`, mas que só resolve quando o usuário
 * toca em um botão.
 */

import { useCallback, useRef, useState } from "react";
import { runAgent } from "@/agent/run-agent";
import type {
  AgentEvent,
  AgentStep,
  ApprovalDecision,
  ApprovalRequest,
  ChatMessage,
} from "@/agent/types";
import type { ORUsage } from "@/services/openrouter";

export type AgentRunState = {
  running: boolean;
  status: string;
  steps: AgentStep[];
  pendingApproval: ApprovalRequest | null;
};

const IDLE: AgentRunState = {
  running: false,
  status: "",
  steps: [],
  pendingApproval: null,
};

export type SendResult = {
  text: string;
  steps: AgentStep[];
  usage?: ORUsage;
};

export function useAgent() {
  const [state, setState] = useState<AgentRunState>(IDLE);

  const abortRef = useRef<AbortController | null>(null);
  /**
   * Guarda o `resolve` da Promise de aprovação enquanto o modal está aberto.
   * O loop fica parado no `await` até a UI chamar isso.
   */
  const approvalRef = useRef<((d: ApprovalDecision) => void) | null>(null);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "status":
        setState((s) => ({ ...s, status: event.text }));
        break;

      case "tool_call":
        setState((s) => ({
          ...s,
          steps: [
            ...s.steps,
            {
              id: event.id,
              name: event.name,
              label: event.label,
              integration: event.integration,
              args: event.args,
              status: "running",
            },
          ],
        }));
        break;

      case "tool_result":
        setState((s) => ({
          ...s,
          steps: s.steps.map((step) =>
            step.id === event.id
              ? {
                  ...step,
                  result: event.result,
                  durationMs: event.durationMs,
                  status: event.result.ok
                    ? "done"
                    : event.result.summary === "Recusado pelo usuário"
                      ? "rejected"
                      : "failed",
                }
              : step,
          ),
        }));
        break;

      default:
        break;
    }
  }, []);

  const requestApproval = useCallback(
    (request: ApprovalRequest): Promise<ApprovalDecision> => {
      setState((s) => ({ ...s, pendingApproval: request }));

      return new Promise<ApprovalDecision>((resolve) => {
        approvalRef.current = (decision) => {
          setState((s) => ({ ...s, pendingApproval: null }));
          approvalRef.current = null;
          resolve(decision);
        };
      });
    },
    [],
  );

  /** Chamado pelos botões do modal de aprovação. */
  const resolveApproval = useCallback((decision: ApprovalDecision) => {
    approvalRef.current?.(decision);
  }, []);

  const send = useCallback(
    async (input: string, history: ChatMessage[]): Promise<SendResult> => {
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ running: true, status: "Pensando", steps: [], pendingApproval: null });

      try {
        const result = await runAgent({
          input,
          history,
          onEvent: handleEvent,
          requestApproval,
          signal: controller.signal,
        });

        return { text: result.text, steps: result.steps, usage: result.usage };
      } finally {
        abortRef.current = null;
        // Se o usuário cancelou com o modal aberto, a Promise ficaria pendurada.
        approvalRef.current?.("reject");
        setState(IDLE);
      }
    },
    [handleEvent, requestApproval],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    approvalRef.current?.("reject");
  }, []);

  return {
    ...state,
    send,
    cancel,
    resolveApproval,
  };
}
