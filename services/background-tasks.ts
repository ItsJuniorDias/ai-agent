/**
 * Registro do background task do assistente.
 *
 * `TaskManager.defineTask` PRECISA rodar em escopo de módulo, antes de qualquer
 * componente montar — por isso este arquivo é importado só pelo efeito colateral
 * no `_layout.tsx`. A tarefa em si delega para `runAssistantScan`.
 *
 * Realidade do iOS (dita sem enrolar, e a UI repete isso ao usuário): o SO
 * decide quando acordar o app. `minimumInterval` é piso, não relógio — o iOS
 * costuma agrupar execuções em janelas próprias (muitas vezes de madrugada) e
 * pode nunca rodar se o app vive fechado ou a bateria está baixa. Por isso o
 * recurso não depende só disto: há o botão "Scan now" e o próprio agente
 * responde "cheque minhas coisas" na hora.
 */

import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { runAssistantScan } from "@/services/assistant";

export const ASSISTANT_TASK = "agent-assistant-scan";

const isWeb = Platform.OS === "web";

// -- Definição da tarefa (efeito colateral no import) -----------------------
// Não redefine em web: TaskManager tolera, mas não há o que rodar.
if (!isWeb) {
  TaskManager.defineTask(ASSISTANT_TASK, async () => {
    const controller = new AbortController();

    // iOS avisa quando a janela vai fechar; abortamos para não morrer no meio de
    // uma request e deixar estado sujo. O runner é reagendado automaticamente.
    const expiration = BackgroundTask.addExpirationListener(() => {
      controller.abort();
    });

    try {
      await runAssistantScan("background", controller.signal);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    } finally {
      expiration.remove();
    }
  });
}

export type BackgroundAvailability = "available" | "restricted" | "unavailable";

export async function getBackgroundAvailability(): Promise<BackgroundAvailability> {
  if (isWeb) return "unavailable";
  try {
    const status = await BackgroundTask.getStatusAsync();
    return status === BackgroundTask.BackgroundTaskStatus.Available
      ? "available"
      : "restricted";
  } catch {
    return "unavailable";
  }
}

export async function isAssistantTaskRegistered(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(ASSISTANT_TASK);
  } catch {
    return false;
  }
}

/**
 * (Re)registra a tarefa com o intervalo mínimo pedido, em minutos. Chamar de
 * novo com outro intervalo apenas atualiza o registro.
 */
export async function registerAssistantTask(
  minutes: number,
): Promise<boolean> {
  if (isWeb) return false;
  try {
    await BackgroundTask.registerTaskAsync(ASSISTANT_TASK, {
      minimumInterval: Math.max(15, Math.round(minutes)),
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterAssistantTask(): Promise<void> {
  if (isWeb) return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(ASSISTANT_TASK)) {
      await BackgroundTask.unregisterTaskAsync(ASSISTANT_TASK);
    }
  } catch {
    // idempotente
  }
}

/**
 * Sincroniza o registro do SO com a config: liga se `enabled`, desliga se não,
 * usando o intervalo escolhido. Chame após salvar a config do assistente.
 */
export async function syncAssistantTask(
  enabled: boolean,
  minutes: number,
): Promise<void> {
  if (enabled) await registerAssistantTask(minutes);
  else await unregisterAssistantTask();
}
