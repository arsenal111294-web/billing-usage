"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ExternalLink, Lock } from "lucide-react";
import { saveIntegrationAction, type IntegrationFormState } from "@/app/(app)/integrations/actions";
import type { ProviderMeta } from "@/lib/integrations/types";
import type { Integration } from "@/lib/types";
import { Button, buttonClass, cn, Field, Input, Select } from "./ui";

interface Props {
  providers: ProviderMeta[];
  integration?: Omit<Integration, "usage"> | null;
}

export function IntegrationForm({ providers, integration }: Props) {
  const [state, action, pending] = useActionState<IntegrationFormState, FormData>(saveIntegrationAction, {});
  const [providerId, setProviderId] = useState(integration?.provider ?? providers[0]?.id);
  const provider = providers.find((p) => p.id === providerId)!;
  const editing = Boolean(integration);

  return (
    <div className="flex flex-col gap-5">
      {!editing ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Сервис</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors",
                  p.id === providerId ? "border-accent bg-accent-track/30" : "border-line hover:bg-surface-2",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="radio"
                    name="providerPicker"
                    value={p.id}
                    checked={p.id === providerId}
                    onChange={() => setProviderId(p.id)}
                    className="accent-[var(--accent)]"
                  />
                  {p.name}
                </span>
                <span className="text-xs text-muted">{p.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <form action={action} className="flex flex-col gap-5">
        {integration ? <input type="hidden" name="id" value={integration.id} /> : <input type="hidden" name="provider" value={providerId} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название" htmlFor="name" hint="Как интеграция будет подписана на дашборде" error={state.fieldErrors?.name}>
            <Input id="name" name="name" defaultValue={integration?.name} placeholder={provider.name} key={`name-${providerId}`} />
          </Field>
          {provider.fields.map((field) => {
            const id = `field_${field.key}`;
            const error = state.fieldErrors?.[field.key];
            const savedSecret = field.secret && integration?.hasCredentials;
            return (
              <Field
                key={`${providerId}-${field.key}`}
                label={field.label + (field.required && !savedSecret ? " *" : "")}
                htmlFor={id}
                error={error}
                hint={savedSecret ? "Ключ сохранён. Оставьте пустым, чтобы не менять." : field.help}
              >
                {field.type === "select" ? (
                  <Select id={id} name={id} defaultValue={integration?.config[field.key] ?? field.options?.[0]?.value}>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={id}
                    name={id}
                    type={field.type === "password" ? "password" : "text"}
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    // "new-password" — иначе Chrome подставляет сюда сохранённый пароль от входа
                    autoComplete={field.secret ? "new-password" : "off"}
                    placeholder={savedSecret ? "••••••••" : field.placeholder}
                    defaultValue={field.secret ? undefined : integration?.config[field.key]}
                    aria-invalid={Boolean(error)}
                  />
                )}
              </Field>
            );
          })}
        </div>
        <p className="flex items-start gap-2 text-xs text-muted">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Ключи шифруются (AES-256-GCM) на сервере перед сохранением и никогда не передаются обратно в браузер.
          {provider.docsUrl ? (
            <a href={provider.docsUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent-strong hover:underline">
              Где взять ключ <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </p>
        {state.error ? (
          <p className="rounded-lg bg-critical-track/60 px-3 py-2 text-sm text-critical-ink" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2" role="status">
            {state.message}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Проверяем ключ…" : editing ? "Сохранить" : "Подключить и синхронизировать"}
          </Button>
          {editing ? (
            <Link href="/integrations" className={buttonClass("ghost")}>
              Отмена
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
