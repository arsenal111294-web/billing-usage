"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getCatalogService } from "@/lib/catalog";
import { getRepository } from "@/lib/db";
import { BILLING_CYCLES, SUBSCRIPTION_STATUSES } from "@/lib/types";

export interface SubscriptionFormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
}

const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

const schema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(100, "Не длиннее 100 символов"),
  category: z.preprocess(emptyToNull, z.string().trim().max(50, "Не длиннее 50 символов").nullable()),
  cost: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
    z.coerce.number({ message: "Введите сумму" }).min(0, "Сумма не может быть отрицательной").max(1_000_000_000),
  ),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Код валюты из трёх букв, например USD"),
  billingCycle: z.enum(BILLING_CYCLES, { message: "Выберите периодичность" }),
  nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату следующего списания"),
  status: z.enum(SUBSCRIPTION_STATUSES),
  remindDaysBefore: z.coerce.number().int().min(0).max(30),
  url: z.preprocess(emptyToNull, z.url({ message: "Некорректная ссылка", protocol: /^https?$/ }).nullable()),
  notes: z.preprocess(emptyToNull, z.string().trim().max(1000).nullable()),
  integrationId: z.preprocess(emptyToNull, z.uuid().nullable()),
  serviceKey: z.preprocess(
    emptyToNull,
    z
      .string()
      .refine((key) => getCatalogService(key) !== null, "Неизвестный сервис каталога")
      .nullable(),
  ),
  trialEndsAt: z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату окончания пробного периода").nullable()),
});

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveSubscriptionAction(_prev: SubscriptionFormState, formData: FormData): Promise<SubscriptionFormState> {
  await requireAuth();
  const raw = Object.fromEntries(formData);
  // Галочка «пробный период» снята — дату триала не сохраняем.
  if (raw.trial !== "on") raw.trialEndsAt = "";
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // На пробном периоде первое платное списание — в день его окончания.
  const data = parsed.data.trialEndsAt ? { ...parsed.data, nextBillingDate: parsed.data.trialEndsAt } : parsed.data;

  const repo = getRepository();
  const id = String(formData.get("id") ?? "");
  try {
    if (id) await repo.updateSubscription(id, data);
    else await repo.createSubscription(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось сохранить подписку" };
  }
  refresh();
  redirect("/subscriptions");
}

export async function deleteSubscriptionAction(id: string): Promise<void> {
  await requireAuth();
  await getRepository().deleteSubscription(id);
  refresh();
}

export async function toggleSubscriptionStatusAction(id: string): Promise<void> {
  await requireAuth();
  const repo = getRepository();
  const sub = await repo.getSubscription(id);
  if (!sub) return;
  await repo.updateSubscription(id, { status: sub.status === "active" ? "paused" : "active" });
  refresh();
}
