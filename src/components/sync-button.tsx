"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncAllAction, syncIntegrationAction } from "@/app/(app)/integrations/actions";
import { Button, cn } from "./ui";

export function SyncButton({ integrationId, label }: { integrationId?: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={integrationId ? "ghost" : "secondary"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (integrationId) await syncIntegrationAction(integrationId);
          else await syncAllAction();
        })
      }
      aria-label={label ?? "Обновить данные"}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      {label ?? (pending ? "Обновляем…" : "Обновить")}
    </Button>
  );
}
