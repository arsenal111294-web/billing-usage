import type { ForecastMonth } from "./billing";
import { monthLabel } from "./dates";

const SERIES_COLORS = [1, 2, 3, 4, 5, 6].map((i) => `var(--series-${i})`);
const OTHER = { key: "other", label: "Другое", color: "var(--series-other)" };

/**
 * Готовит данные прогноза для графика: категории упорядочены по сумме,
 * максимум 6 цветов, остальное сворачивается в «Другое» (новые цвета не генерируются).
 */
export function buildForecastChart(forecast: ForecastMonth[]) {
  const totals = new Map<string, number>();
  for (const month of forecast) {
    for (const [category, value] of Object.entries(month.byCategory)) {
      totals.set(category, (totals.get(category) ?? 0) + value);
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const needsOther = ranked.length > SERIES_COLORS.length;
  const main = needsOther ? ranked.slice(0, SERIES_COLORS.length - 1) : ranked;

  const series = main.map((category, i) => ({ key: `c${i}`, label: category, color: SERIES_COLORS[i] }));
  if (needsOther) series.push(OTHER);
  const keyOf = new Map(main.map((category, i) => [category, `c${i}`]));

  const data = forecast.map((month) => {
    const row: Record<string, number | string> = { label: monthLabel(month.month), total: month.total };
    for (const s of series) row[s.key] = 0;
    for (const [category, value] of Object.entries(month.byCategory)) {
      const key = keyOf.get(category) ?? OTHER.key;
      row[key] = Math.round(((row[key] as number) + value) * 100) / 100;
    }
    return row;
  });

  return { data, series };
}
