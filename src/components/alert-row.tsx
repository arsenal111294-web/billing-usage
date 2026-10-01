import Link from "next/link";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { Alert } from "@/lib/alerts";

export function AlertRow({ alert }: { alert: Alert }) {
  const icon =
    alert.severity === "critical" ? (
      <OctagonAlert className="size-4 text-critical-ink" aria-label="Критично" />
    ) : alert.severity === "warning" ? (
      <AlertTriangle className="size-4 text-warning-ink" aria-label="Предупреждение" />
    ) : (
      <Info className="size-4 text-accent-strong" aria-label="Информация" />
    );
  return (
    <li>
      <Link href={alert.href} className="flex gap-2.5 rounded-lg p-2 hover:bg-surface-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{alert.title}</span>
          <span className="block text-xs text-muted">{alert.message}</span>
        </span>
      </Link>
    </li>
  );
}
