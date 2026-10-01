"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, ExternalLink, PlugZap } from "lucide-react";
import { saveSubscriptionAction, type SubscriptionFormState } from "@/app/(app)/subscriptions/actions";
import type { CatalogService } from "@/lib/catalog";
import type { BillingCycle, Subscription } from "@/lib/types";
import { ServiceAvatar } from "./service-avatar";
import { Button, buttonClass, Field, Input, Select, Textarea } from "./ui";

interface Props {
  subscription?: Subscription | null;
  /** Карточка каталога, из которой добавляется подписка (или к которой привязана редактируемая). */
  service?: CatalogService | null;
  /** Пакеты из каталога, которые у пользователя уже есть и включают этот сервис. */
  coveredBy?: string[];
  currencies: string[];
  defaultCurrency: string;
  defaultDate: string;
  integrations: { id: string; name: string }[];
  categories: string[];
}

export function SubscriptionForm({
  subscription,
  service,
  coveredBy = [],
  currencies,
  defaultCurrency,
  defaultDate,
  integrations,
  categories,
}: Props) {
  const [state, action, pending] = useActionState<SubscriptionFormState, FormData>(saveSubscriptionAction, {});
  const err = (key: string) => state.fieldErrors?.[key]?.[0];
  const s = subscription;
  const firstPlan = service?.plans[0];

  // Тариф из каталога заполняет стоимость, валюту и периодичность — их можно поправить.
  const [cost, setCost] = useState(String(s?.cost ?? (firstPlan && !service?.usageBased ? firstPlan.cost : "")));
  const [currency, setCurrency] = useState(s?.currency ?? firstPlan?.currency ?? defaultCurrency);
  const [cycle, setCycle] = useState<BillingCycle>(s?.billingCycle ?? firstPlan?.cycle ?? "monthly");
  const [trial, setTrial] = useState(Boolean(s?.trialEndsAt));
  const [trialEndsAt, setTrialEndsAt] = useState(s?.trialEndsAt ?? defaultDate);
  const currencyOptions = currencies.includes(currency) ? currencies : [currency, ...currencies];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <input type="hidden" name="serviceKey" value={service?.key ?? ""} />

      {service ? (
        <div className="flex items-center gap-3 sm:col-span-2">
          <ServiceAvatar name={service.name} serviceKey={service.key} />
          <div className="min-w-0">
            <p className="font-medium text-ink">{service.name}</p>
            <p className="text-xs text-muted">
              {service.category}
              {service.manageUrl ? (
                <>
                  {" · "}
                  <a href={service.manageUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent-strong hover:underline">
                    управление подпиской <ExternalLink className="size-3" aria-hidden />
                  </a>
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {coveredBy.length ? (
        <p className="flex items-start gap-2 rounded-lg bg-warning-track/60 px-3 py-2 text-sm text-ink-2 sm:col-span-2" role="note">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden />
          <span>
            {service?.name} уже входит в {coveredBy.join(", ")}. Отдельная подписка, скорее всего, не нужна.
          </span>
        </p>
      ) : null}

      {service?.integration ? (
        <p className="flex items-start gap-2 rounded-lg bg-accent-track/40 px-3 py-2 text-sm text-ink-2 sm:col-span-2">
          <PlugZap className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
          <span>
            У {service.name} есть API: баланс и расход можно подтягивать автоматически.{" "}
            <Link href="/integrations" className="text-accent-strong hover:underline">
              Подключить на вкладке «Интеграции»
            </Link>
          </span>
        </p>
      ) : null}

      {service && service.plans.length > 1 ? (
        <Field label="Тариф" htmlFor="plan" hint="Цены ориентировочные (сентябрь 2026) — поправьте, если у вас другая" className="sm:col-span-2">
          <Select
            id="plan"
            defaultValue="0"
            onChange={(e) => {
              const plan = service.plans[Number(e.target.value)];
              setCost(String(plan.cost));
              setCurrency(plan.currency);
              setCycle(plan.cycle);
            }}
          >
            {service.plans.map((plan, i) => (
              <option key={plan.label} value={i}>
                {plan.label} — {plan.cost} {plan.currency === "RUB" ? "₽" : plan.currency} {plan.cycle === "monthly" ? "в месяц" : "в год"}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="Название" htmlFor="name" error={err("name")} className="sm:col-span-2">
        <Input
          id="name"
          name="name"
          defaultValue={s?.name ?? service?.name}
          placeholder="Например, Claude Pro"
          required
          aria-invalid={Boolean(err("name"))}
        />
      </Field>

      <Field
        label="Стоимость"
        htmlFor="cost"
        error={err("cost")}
        hint={service?.usageBased ? "Оплата по потреблению — укажите примерный расход в месяц" : undefined}
      >
        <Input
          id="cost"
          name="cost"
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="399"
          required
          aria-invalid={Boolean(err("cost"))}
        />
      </Field>

      <Field label="Валюта" htmlFor="currency" error={err("currency")}>
        <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {currencyOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Периодичность" htmlFor="billingCycle" error={err("billingCycle")}>
        <Select id="billingCycle" name="billingCycle" value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}>
          <option value="monthly">Ежемесячно</option>
          <option value="yearly">Ежегодно</option>
        </Select>
      </Field>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="trial"
            checked={trial}
            onChange={(e) => setTrial(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Сейчас пробный период
        </label>
        <p className="text-xs text-muted">Напомним до того, как начнут списывать деньги</p>
      </div>

      {trial ? (
        <Field label="Пробный период до" htmlFor="trialEndsAt" error={err("trialEndsAt")} hint="Первое списание — в этот день">
          <Input
            id="trialEndsAt"
            name="trialEndsAt"
            type="date"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
            required
            aria-invalid={Boolean(err("trialEndsAt"))}
          />
          {/* Первое платное списание совпадает с концом пробного периода. */}
          <input type="hidden" name="nextBillingDate" value={trialEndsAt} />
        </Field>
      ) : (
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
      )}

      <Field label="Напомнить заранее" htmlFor="remindDaysBefore" hint="Алерт в интерфейсе и уведомление" error={err("remindDaysBefore")}>
        <Select id="remindDaysBefore" name="remindDaysBefore" defaultValue={String(s?.remindDaysBefore ?? 3)}>
          {[0, 1, 2, 3, 5, 7, 14].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "В день списания" : `За ${d} дн.`}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Статус" htmlFor="status">
        <Select id="status" name="status" defaultValue={s?.status ?? "active"}>
          <option value="active">Активна</option>
          <option value="paused">На паузе</option>
        </Select>
      </Field>

      <Field label="Категория" htmlFor="category" error={err("category")}>
        <Input id="category" name="category" list="categories" defaultValue={s?.category ?? service?.category ?? ""} placeholder="Кино и ТВ, AI…" />
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

      <Field label="Ссылка на управление подпиской" htmlFor="url" error={err("url")} className="sm:col-span-2">
        <Input
          id="url"
          name="url"
          type="url"
          defaultValue={s?.url ?? service?.manageUrl ?? ""}
          placeholder="https://…"
          aria-invalid={Boolean(err("url"))}
        />
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
        <Link href={s ? "/subscriptions" : "/subscriptions?new=1"} className={buttonClass("ghost")}>
          {s ? "Отмена" : "Назад к каталогу"}
        </Link>
      </div>
    </form>
  );
}
