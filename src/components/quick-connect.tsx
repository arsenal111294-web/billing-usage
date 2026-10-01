"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { quickConnectAction, type IntegrationFormState } from "@/app/(app)/integrations/actions";
import { Button, Input } from "./ui";

export function QuickConnect() {
  const [state, action, pending] = useActionState<IntegrationFormState, FormData>(quickConnectAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="quick-key" className="sr-only">
          API-ключ сервиса
        </label>
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            id="quick-key"
            name="key"
            type="password"
            // "new-password" — иначе браузер подставляет сюда сохранённый пароль от входа
            autoComplete="new-password"
            placeholder="nfp_… · sbp_… · sk-ant-admin01-… · sk-admin-…"
            className="pl-9"
            required
            aria-invalid={Boolean(state.error)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Подключаем…" : "Подключить"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-sm text-critical-ink" role="alert">
          {state.error}
        </p>
      ) : state.warning ? (
        <p className="text-sm text-warning-ink" role="status">
          {state.warning}
        </p>
      ) : state.message ? (
        <p className="text-sm text-good-ink" role="status">
          {state.message}
        </p>
      ) : (
        <p className="text-xs text-muted">
          Сервис определяется по ключу автоматически: Netlify, Supabase, Anthropic или OpenAI. Ключ шифруется на сервере и в браузер не
          возвращается.
        </p>
      )}
    </form>
  );
}
