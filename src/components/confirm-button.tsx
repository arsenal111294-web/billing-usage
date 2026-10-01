"use client";

import { useTransition, type ReactNode } from "react";
import { Button } from "./ui";

/** Кнопка, вызывающая server action после подтверждения (для удаления и т.п.). */
export function ConfirmButton({
  action,
  confirm: confirmText,
  children,
  label,
  variant = "danger",
}: {
  action: () => Promise<void>;
  confirm?: string;
  children: ReactNode;
  label: string;
  variant?: "danger" | "ghost";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        startTransition(() => action());
      }}
    >
      {children}
    </Button>
  );
}
