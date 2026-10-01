"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Пароль" htmlFor="password" error={state.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={Boolean(state.error)}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
