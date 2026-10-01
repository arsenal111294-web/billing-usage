"use client";

import { useEffect, useRef, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshStaleAction } from "@/app/(app)/integrations/actions";

/**
 * Рендерится только когда на сервере есть устаревшие данные: один раз подтягивает
 * свежие показатели в фоне, страница обновится сама после revalidate.
 */
export function AutoRefresh() {
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startTransition(async () => {
      await refreshStaleAction();
    });
  }, []);

  if (!pending) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" role="status">
      <RefreshCw className="size-3.5 animate-spin" aria-hidden />
      Обновляем данные сервисов…
    </span>
  );
}
