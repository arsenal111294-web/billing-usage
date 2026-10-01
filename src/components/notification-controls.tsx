"use client";

import { useState, useTransition } from "react";
import { PlayCircle, Send } from "lucide-react";
import { runCheckAction, sendTestAction, type ActionResult } from "@/app/(app)/alerts/actions";
import type { NotificationChannel } from "@/lib/types";
import { Button } from "./ui";

function ResultMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p role="status" className={result.ok ? "text-xs text-good-ink" : "text-xs text-critical-ink"}>
      {result.message}
    </p>
  );
}

export function TestNotificationButton({ channel, disabled }: { channel: NotificationChannel; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        onClick={() => startTransition(async () => setResult(await sendTestAction(channel)))}
      >
        <Send className="size-4" aria-hidden />
        {pending ? "Отправляем…" : "Отправить тест"}
      </Button>
      <ResultMessage result={result} />
    </div>
  );
}

export function RunCheckButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" disabled={pending} onClick={() => startTransition(async () => setResult(await runCheckAction()))}>
        <PlayCircle className="size-4" aria-hidden />
        {pending ? "Проверяем…" : "Запустить проверку сейчас"}
      </Button>
      <ResultMessage result={result} />
    </div>
  );
}
