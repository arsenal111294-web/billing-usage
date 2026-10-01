"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSubscriptionAction, type SubscriptionFormState } from "@/app/(app)/subscriptions/actions";
import type { Subscription } from "@/lib/types";
import { Button, buttonClass, Field, Input, Select, Textarea } from "./ui";

interface Props {
  subscription?: Subscription | null;
  currencies: string[];
  defaultCurrency: string;
  defaultDate: string;
  integrations: { id: string; name: string }[];
  categories: string[];
}

export function SubscriptionForm({ subscription, currencies, defaultCurrency, defaultDate, integrations, categories }: Props) {
  const [state, action, pending] = useActionState<SubscriptionFormState, FormData>(saveSubscriptionAction, {});
  const err = (key: string) => state.fieldErrors?.[key]?.[0];
  const s = subscription;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      {s ? <input type="hidden" name="id" value={s.id} /> : null}

      <Field label="Название сервиса" htmlFor="name" error={err("name")} className="sm:col-span-2">
        <Input id="name" name="name" defaultValue={s?.name} placeholder="Claude Pro" required aria-invalid={Boolean(err("name"))} />
      </Field>

      <Field label="Стоимость" htmlFor="cost" error={err("cost")}>
        <Input
          id="cost"
          name="cost"
          inputMode="decimal"
          defaultValue={s?.cost ?? ""}
          placeholder="20"
          required
          aria-invalid={Boolean(err("cost"))}
        />
      </Field>

      <Field label="Валюта" htmlFor="currency" error={err("currency")}>
        <Select id="currency" name="currency" defaultValue={s?.currency ?? defaultCurrency}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Периодичность" htmlFor="billingCycle" error={err("billingCycle")}>
        <Select id="billingCycle" name="billingCycle" defaultValue={s?.billingCycle ?? "monthly"}>
          <option value="monthly">Ежемесячно</option>
          <option value="yearly">Ежегодно</option>
        </Select>
      </Field>

      <Field label="Дата следующего списания" htmlFor="nextBillingDate" error={err("nextBillingDate")}>
        <Input
          id="nextBillingDate"
          name="nextBillingDate"
          type="date"
          defaultValue={s?.nextBillingDate ?? defaultDate}
          required
          aria-invalid={Boolean(err("nextBillingDate"))}
        />
      </Field>

      <Field label="Статус" htmlFor="status">
        <Select id="status" name="status" defaultValue={s?.status ?? "active"}>
          <option value="active">Активна</option>
          <option value="paused">На паузе</option>
        </Select>
      </Field>

      <Field label="Напомнить заранее" htmlFor="remindDaysBefore" hint="Алерт в интерфейсе и уведомление" error={err("remindDaysBefore")}>
        <Select id="remindDaysBefore" name="remindDaysBefore" defaultValue={String(s?.remindDaysBefore ?? 3)}>
          {[0, 1, 2, 3, 5, 7, 14].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "В день списания" : `За ${d} дн.`}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Категория" htmlFor="category" error={err("category")}>
        <Input id="category" name="category" list="categories" defaultValue={s?.category ?? ""} placeholder="AI, Хостинг…" />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label="Связанная интеграция" htmlFor="integrationId" hint="Чтобы видеть лимиты рядом с подпиской">
        <Select id="integrationId" name="integrationId" defaultValue={s?.integrationId ?? ""}>
          <option value="">Нет</option>
          {integrations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Ссылка на биллинг" htmlFor="url" error={err("url")} className="sm:col-span-2">
        <Input id="url" name="url" type="url" defaultValue={s?.url ?? ""} placeholder="https://…" aria-invalid={Boolean(err("url"))} />
      </Field>

      <Field label="Заметки" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
        <Textarea id="notes" name="notes" defaultValue={s?.notes ?? ""} rows={2} />
      </Field>

      {state.error ? (
        <p className="text-sm text-critical-ink sm:col-span-2" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : s ? "Сохранить изменения" : "Добавить подписку"}
        </Button>
        <Link href="/subscriptions" className={buttonClass("ghost")}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
