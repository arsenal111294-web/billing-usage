"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Record<string, number | string>[];
  series: ChartSeries[];
  currency: string;
}

function money(value: number, currency: string, compact = false) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

/** Прогноз списаний: столбцы по месяцам, сегменты — категории (цвет закреплён за категорией). */
export function SpendingChart({ data, series, currency }: Props) {
  const lastKey = series.at(-1)?.key;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(v: number) => money(v, currency, true)}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} payload={payload} label={label} series={series} currency={currency} />
            )}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="spend"
              fill={s.color}
              // 2px зазор цвета поверхности между сегментами стопки.
              stroke="var(--surface)"
              strokeWidth={2}
              radius={s.key === lastKey ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  label?: string | number;
  series: ChartSeries[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, number>;
  const items = series.filter((s) => (row[s.key] ?? 0) > 0).reverse();
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {items.length === 0 ? <p className="text-muted">Списаний нет</p> : null}
      {items.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
          <span className="tabular text-ink">{money(row[s.key], currency)}</span>
        </div>
      ))}
      {items.length > 1 ? (
        <div className="mt-1 flex justify-between border-t border-line pt-1 font-medium text-ink">
          <span>Итого</span>
          <span className="tabular">{money(row.total, currency)}</span>
        </div>
      ) : null}
    </div>
  );
}
