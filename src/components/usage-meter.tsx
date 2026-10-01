import { AlertTriangle, CircleCheck, OctagonAlert } from "lucide-react";
import { LIMIT_CRITICAL, LIMIT_WARNING } from "@/lib/alerts";
import { formatDateTime } from "@/lib/dates";
import { formatMetricValue, formatPercent, usageRatio } from "@/lib/format";
import type { UsageMetric } from "@/lib/types";
import { cn } from "./ui";

/** Индикатор лимита: заливка несёт уровень (норма → предупреждение → критично), трек — светлый шаг той же гаммы. */
export function UsageMeter({ metric }: { metric: UsageMetric }) {
  const ratio = usageRatio(metric);
  const level = ratio === null ? "none" : ratio >= LIMIT_CRITICAL ? "critical" : ratio >= LIMIT_WARNING ? "warning" : "ok";
  const styles = {
    none: { fill: "bg-accent", track: "bg-accent-track" },
    ok: { fill: "bg-accent", track: "bg-accent-track" },
    warning: { fill: "bg-warning", track: "bg-warning-track" },
    critical: { fill: "bg-critical", track: "bg-critical-track" },
  }[level];
  const remaining = metric.limit !== null ? Math.max(metric.limit - metric.used, 0) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-ink-2">{metric.label}</span>
        <span className="tabular shrink-0 text-ink">
          {formatMetricValue(metric.used, metric.unit)}
          {metric.limit !== null ? <span className="text-muted"> / {formatMetricValue(metric.limit, metric.unit)}</span> : null}
        </span>
      </div>
      {ratio !== null ? (
        <>
          <div
            className={cn("h-2 w-full overflow-hidden rounded-full", styles.track)}
            role="meter"
            aria-label={metric.label}
            aria-valuemin={0}
            aria-valuemax={metric.limit ?? undefined}
            aria-valuenow={metric.used}
            aria-valuetext={`${formatPercent(ratio)} использовано`}
          >
            <div className={cn("h-full rounded-full transition-[width]", styles.fill)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <LevelLabel level={level} ratio={ratio} />
            <span className="text-muted">
              {remaining !== null ? `осталось ${formatMetricValue(remaining, metric.unit)}` : null}
              {metric.resetsAt ? ` · сброс ${formatDateTime(metric.resetsAt)}` : null}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">{metric.note ?? "Лимит не задан"}</p>
      )}
    </div>
  );
}

function LevelLabel({ level, ratio }: { level: string; ratio: number }) {
  if (level === "critical")
    return (
      <span className="inline-flex items-center gap-1 font-medium text-critical-ink">
        <OctagonAlert className="size-3.5" aria-hidden /> {formatPercent(ratio)} — критично
      </span>
    );
  if (level === "warning")
    return (
      <span className="inline-flex items-center gap-1 font-medium text-warning-ink">
        <AlertTriangle className="size-3.5" aria-hidden /> {formatPercent(ratio)} — близко к лимиту
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-ink-2">
      <CircleCheck className="size-3.5 text-good-ink" aria-hidden /> {formatPercent(ratio)}
    </span>
  );
}
