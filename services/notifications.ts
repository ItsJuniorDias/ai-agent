/**
 * Infraestrutura de notificações locais.
 *
 * Camada única usada pelas tools do agente (notify_now, schedule_reminder…) e
 * pelo monitor em background. Tudo aqui é notificação **local** — agendada e
 * disparada no próprio dispositivo, sem servidor de push e sem projectId. Isso
 * é de propósito: um assistente que só funciona com backend não funciona no
 * avião, no metrô, nem no primeiro run antes de você configurar EAS. O registro
 * de push token existe como bônus opcional e falha em silêncio se não der.
 *
 * Web não tem essas APIs de forma confiável, então toda chamada é guardada por
 * `Platform.OS !== "web"` e degrada para no-op.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/services/config";
import type { AssistantConfig } from "@/services/config";

// ---------------------------------------------------------------------------
// Canais (Android) e tipos
// ---------------------------------------------------------------------------

/** Alertas proativos do monitor: PR esperando, deploy quebrado, issue nova. */
export const CHANNEL_ALERTS = "agent-alerts";
/** Lembretes que você (via agente) pediu explicitamente. */
export const CHANNEL_REMINDERS = "agent-reminders";

export type PermissionStatus = "granted" | "denied" | "undetermined";

/** Payload que viaja na notificação e é lido no listener de toque. */
export type NotificationRoute = {
  /** Rota do expo-router para abrir ao tocar, ex.: "/(assistant)". */
  route?: string;
  /** Marcador de origem, útil para depurar. */
  kind?: "reminder" | "alert" | "manual";
};

const isWeb = Platform.OS === "web";

// ---------------------------------------------------------------------------
// Handler + canais (init idempotente)
// ---------------------------------------------------------------------------

let handlerSet = false;

/**
 * Define como uma notificação recebida com o app em primeiro plano se comporta.
 * No SDK 54 o shape trocou: `shouldShowAlert` está depreciado em favor de
 * `shouldShowBanner` + `shouldShowList`. Mostramos os dois — quando o agente
 * dispara um notify_now é porque há algo a comunicar mesmo com o app aberto.
 */
function ensureHandler(): void {
  if (handlerSet || isWeb) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

let channelsSet = false;

async function ensureChannels(): Promise<void> {
  if (channelsSet || Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ALERTS, {
    name: "Alertas do assistente",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0A3D91",
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
    name: "Lembretes",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0A3D91",
  });

  channelsSet = true;
}

/** Chame cedo (no _layout). Configura handler e canais, sem pedir permissão. */
export async function initNotifications(): Promise<void> {
  if (isWeb) return;
  ensureHandler();
  await ensureChannels();
}

// ---------------------------------------------------------------------------
// Permissão
// ---------------------------------------------------------------------------

/** Tipo real do `.status` devolvido pelo expo-notifications, sem depender de o
 * nome do enum ser re-exportado pelo pacote. */
type RawPermissionStatus = Awaited<
  ReturnType<typeof Notifications.getPermissionsAsync>
>["status"];

/**
 * Reduz o status do Expo às três strings que usamos. Comparo via `String()` de
 * propósito: o `.status` é um enum de string do expo-modules-core, e comparar o
 * enum direto com um literal dispara "no overlap" no tsc. Normalizar primeiro
 * mantém o resto do código comparando string com string.
 */
function normalizeStatus(status: RawPermissionStatus): PermissionStatus {
  const s = String(status);
  if (s === "granted") return "granted";
  if (s === "denied") return "denied";
  return "undetermined";
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (isWeb) return "denied";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return normalizeStatus(status);
  } catch {
    return "undetermined";
  }
}

/**
 * Pede permissão. Retorna `true` se concedida. Também garante handler+canais e
 * tenta registrar o push token (opcional). Nunca lança.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;

  await initNotifications();

  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = normalizeStatus(current.status) === "granted";

    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = normalizeStatus(req.status) === "granted";
    }

    if (!granted) return false;

    // Push token é bônus — não bloqueia o fluxo local se falhar.
    void registerPushTokenSafely();
    return true;
  } catch {
    return false;
  }
}

/**
 * Tenta obter e persistir o Expo push token. Só faz sentido em device físico e
 * com projectId configurado (EAS). Sem isso, sai em silêncio — as notificações
 * locais funcionam do mesmo jeito.
 */
export async function registerPushTokenSafely(): Promise<string | null> {
  if (isWeb || !Device.isDevice) return null;

  // `easConfig` existe em builds EAS e some em dev puro; o cast evita tanto o
  // erro de propriedade desconhecida quanto o de diretiva não usada.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  if (!projectId) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Agendamento / apresentação
// ---------------------------------------------------------------------------

export type ScheduleInput = {
  title: string;
  body: string;
  data?: NotificationRoute;
  /** Canal Android. Padrão: alertas. */
  channelId?: string;
};

/** Dispara imediatamente (trigger null). Retorna o id da notificação. */
export async function presentNow(input: ScheduleInput): Promise<string | null> {
  if (isWeb) return null;
  await initNotifications();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: true,
    },
    trigger: null,
  });
}

/** Agenda para uma data absoluta. */
export async function scheduleAt(
  input: ScheduleInput & { date: Date },
): Promise<string | null> {
  if (isWeb) return null;
  await initNotifications();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
      channelId: input.channelId ?? CHANNEL_REMINDERS,
    },
  });
}

/** Agenda após N segundos (usado para "em X minutos"). */
export async function scheduleInSeconds(
  input: ScheduleInput & { seconds: number },
): Promise<string | null> {
  if (isWeb) return null;
  await initNotifications();

  // iOS exige >= 1s; abaixo disso, dispara na hora.
  if (input.seconds < 1) return presentNow(input);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(input.seconds),
      repeats: false,
      channelId: input.channelId ?? CHANNEL_REMINDERS,
    },
  });
}

/** Agenda um lembrete diário recorrente (para um briefing, por ex.). */
export async function scheduleDaily(
  input: ScheduleInput & { hour: number; minute: number },
): Promise<string | null> {
  if (isWeb) return null;
  await initNotifications();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
      channelId: input.channelId ?? CHANNEL_REMINDERS,
    },
  });
}

export type ScheduledItem = {
  id: string;
  title: string;
  body: string;
  /** ISO da próxima disparada, quando dá para calcular. */
  fireAt?: string;
};

/** Lista notificações agendadas, normalizadas para a UI. */
export async function listScheduled(): Promise<ScheduledItem[]> {
  if (isWeb) return [];

  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();

    return all.map((n) => {
      const content = n.content;
      const trigger: any = n.trigger;

      let fireAt: string | undefined;
      // Cada tipo de trigger guarda a data de formas diferentes.
      if (trigger?.type === "date" && trigger.value) {
        fireAt = new Date(trigger.value).toISOString();
      } else if (typeof trigger?.seconds === "number") {
        fireAt = new Date(Date.now() + trigger.seconds * 1000).toISOString();
      } else if (
        typeof trigger?.hour === "number" &&
        typeof trigger?.minute === "number"
      ) {
        const d = new Date();
        d.setHours(trigger.hour, trigger.minute, 0, 0);
        if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
        fireAt = d.toISOString();
      }

      return {
        id: n.identifier,
        title: content.title ?? "(sem título)",
        body: content.body ?? "",
        fireAt,
      };
    });
  } catch {
    return [];
  }
}

export async function cancelScheduled(id: string): Promise<void> {
  if (isWeb) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // idempotente: cancelar algo que já não existe não é erro
  }
}

export async function cancelAllScheduled(): Promise<number> {
  if (isWeb) return 0;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
    return all.length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Dedupe do notify_now
// ---------------------------------------------------------------------------

type NotifyLog = Record<string, number>; // dedupe_key -> timestamp ms

/** Janela padrão de silêncio por chave: não repinga o mesmo item por 6h. */
export const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
const LOG_TTL_MS = 48 * 60 * 60 * 1000;

async function readNotifyLog(): Promise<NotifyLog> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.notifyLog);
    return raw ? (JSON.parse(raw) as NotifyLog) : {};
  } catch {
    return {};
  }
}

async function writeNotifyLog(log: NotifyLog): Promise<void> {
  // Poda entradas velhas para o objeto não crescer sem limite.
  const now = Date.now();
  const pruned: NotifyLog = {};
  for (const [key, ts] of Object.entries(log)) {
    if (now - ts < LOG_TTL_MS) pruned[key] = ts;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.notifyLog, JSON.stringify(pruned));
}

/** True se `key` foi notificada dentro da janela — nesse caso, pule. */
export async function wasRecentlyNotified(
  key: string,
  windowMs = DEDUPE_WINDOW_MS,
): Promise<boolean> {
  if (!key) return false;
  const log = await readNotifyLog();
  const ts = log[key];
  return typeof ts === "number" && Date.now() - ts < windowMs;
}

export async function markNotified(key: string): Promise<void> {
  if (!key) return;
  const log = await readNotifyLog();
  log[key] = Date.now();
  await writeNotifyLog(log);
}

// ---------------------------------------------------------------------------
// Quiet hours
// ---------------------------------------------------------------------------

/**
 * True se o horário atual cai dentro da janela silenciosa. Suporta janela que
 * cruza a meia-noite (ex.: 22h → 7h).
 */
export function isWithinQuietHours(
  cfg: Pick<AssistantConfig, "quietHoursEnabled" | "quietStartHour" | "quietEndHour">,
  now = new Date(),
): boolean {
  if (!cfg.quietHoursEnabled) return false;

  const h = now.getHours();
  const { quietStartHour: start, quietEndHour: end } = cfg;

  if (start === end) return false; // janela nula
  if (start < end) return h >= start && h < end; // mesma data
  return h >= start || h < end; // cruza a meia-noite
}
