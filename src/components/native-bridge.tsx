"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NativeReminder } from "@/lib/native-reminders";
import { notificationId } from "@/lib/native-reminders";

const CHANNEL_ID = "reminders";
const FIRED_KEY = "bt:fired-immediate";

export interface NativeStatus {
  scheduled: number;
  permission: "granted" | "denied" | "prompt";
  updatedAt: string;
}

/** Последний результат планирования — для карточки на странице «Уведомления». */
export const NATIVE_STATUS_EVENT = "bt:native-status";
/** Запрос на повторное планирование (кнопка на карточке). */
export const NATIVE_RESCHEDULE_EVENT = "bt:native-reschedule";

let lastStatus: NativeStatus | null = null;

export function getNativeStatus(): NativeStatus | null {
  return lastStatus;
}

function publishStatus(status: NativeStatus) {
  lastStatus = status;
  window.dispatchEvent(new CustomEvent<NativeStatus>(NATIVE_STATUS_EVENT, { detail: status }));
}

function readFired(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeFired(keys: Set<string>) {
  try {
    // Храним только последние ключи, чтобы список не рос бесконечно.
    localStorage.setItem(FIRED_KEY, JSON.stringify([...keys].slice(-200)));
  } catch {
    // хранилище недоступно — не критично
  }
}

/**
 * Мост к Android-приложению (Capacitor). В браузере ничего не делает.
 * В приложении: разрешение на уведомления, канал, планирование напоминаний,
 * переход по нажатию на уведомление и системная кнопка «Назад».
 */
export function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];

    async function setup() {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const [{ LocalNotifications }, { App }] = await Promise.all([
        import("@capacitor/local-notifications"),
        import("@capacitor/app"),
      ]);

      async function schedule() {
        let { display } = await LocalNotifications.checkPermissions();
        if (display === "prompt" || display === "prompt-with-rationale") {
          ({ display } = await LocalNotifications.requestPermissions());
        }
        if (display !== "granted") {
          publishStatus({ scheduled: 0, permission: display === "denied" ? "denied" : "prompt", updatedAt: new Date().toISOString() });
          return;
        }

        await LocalNotifications.createChannel({
          id: CHANNEL_ID,
          name: "Напоминания о списаниях",
          description: "Скорые списания, конец пробных периодов, лимиты и баланс",
          importance: 4,
          visibility: 1,
          vibration: true,
        });

        const response = await fetch("/api/native/reminders", { cache: "no-store" });
        if (!response.ok) return; // не вошли — расписание обновится после входа
        const { reminders } = (await response.json()) as { reminders: NativeReminder[] };

        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length) {
          await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
        }

        const now = Date.now();
        const localToday = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
        const fired = readFired();
        const notifications = [];
        for (const r of reminders) {
          const [y, m, d] = r.date.split("-").map(Number);
          let at = new Date(y, m - 1, d, r.hour, 0, 0);
          if (at.getTime() <= now) {
            // Время уже прошло: показываем сразу, но только один раз.
            if (fired.has(r.key) || (!r.immediate && r.date !== localToday)) continue;
            at = new Date(now + 3000);
          }
          // Сегодняшние уведомления запоминаем, чтобы при следующем открытии не показать их повторно.
          if (r.date <= localToday) fired.add(r.key);
          notifications.push({
            id: notificationId(r.key),
            title: r.title,
            body: r.body,
            largeBody: r.body,
            channelId: CHANNEL_ID,
            schedule: { at, allowWhileIdle: true },
            extra: { href: r.href },
          });
        }
        writeFired(fired);
        if (notifications.length) await LocalNotifications.schedule({ notifications });

        publishStatus({ scheduled: notifications.length, permission: "granted", updatedAt: new Date().toISOString() });
      }

      const tap = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        const href = (event.notification.extra as { href?: string } | undefined)?.href;
        if (href?.startsWith("/")) router.push(href);
      });
      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
      });
      const resume = await App.addListener("resume", () => void schedule().catch(() => undefined));
      const onReschedule = () => void schedule().catch(() => undefined);
      window.addEventListener(NATIVE_RESCHEDULE_EVENT, onReschedule);
      cleanups.push(
        () => void tap.remove(),
        () => void back.remove(),
        () => void resume.remove(),
        () => window.removeEventListener(NATIVE_RESCHEDULE_EVENT, onReschedule),
      );
      if (disposed) cleanups.forEach((fn) => fn());
      else await schedule().catch(() => undefined);
    }

    void setup();
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  return null;
}
