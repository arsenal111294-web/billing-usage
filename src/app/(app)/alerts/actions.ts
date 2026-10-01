"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getRepository } from "@/lib/db";
import { runDailyCheck } from "@/lib/jobs";
import { sendTestNotification } from "@/lib/notifications";
import type { NotificationChannel } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function sendTestAction(channel: NotificationChannel): Promise<ActionResult> {
  await requireAuth();
  try {
    const subscriptions = await getRepository().listSubscriptions();
    await sendTestNotification(channel, subscriptions, todayISO());
    return { ok: true, message: "Тестовое уведомление отправлено" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Ошибка отправки" };
  }
}

export async function runCheckAction(): Promise<ActionResult> {
  await requireAuth();
  try {
    const result = await runDailyCheck();
    revalidatePath("/", "layout");
    const sent = result.notifications.filter((n) => n.sent).map((n) => n.channel);
    const failed = result.notifications.filter((n) => n.error).map((n) => `${n.channel}: ${n.error}`);
    const parts = [
      `Синхронизировано интеграций: ${result.sync.ok}/${result.sync.total}`,
      result.rolledSubscriptions ? `перенесено дат списаний: ${result.rolledSubscriptions}` : null,
      sent.length ? `отправлено: ${sent.join(", ")}` : "новых напоминаний для отправки нет",
      ...failed,
    ].filter(Boolean);
    return { ok: failed.length === 0, message: parts.join("; ") };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Ошибка проверки" };
  }
}
