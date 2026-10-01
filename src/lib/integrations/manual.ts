import { optionalNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { MetricUnit } from "../types";

const UNITS: { value: MetricUnit; label: string }[] = [
  { value: "count", label: "Штуки / сообщения" },
  { value: "tokens", label: "Токены" },
  { value: "minutes", label: "Минуты" },
  { value: "requests", label: "Запросы" },
  { value: "usd", label: "Доллары" },
  { value: "bytes", label: "Байты" },
];

/**
 * Лимит без API: значения вводятся вручную (например, лимит сообщений Claude.ai
 * или кредиты сервиса, у которого нет публичного API).
 */
export const manualProvider: ProviderDefinition = {
  id: "manual",
  name: "Ручной лимит",
  description: "Для сервисов без API: укажите использовано/лимит вручную и обновляйте при необходимости.",
  docsUrl: "",
  fields: [
    { key: "metricLabel", label: "Название метрики", type: "text", secret: false, required: true, placeholder: "Сообщения Claude.ai за 5 часов" },
    { key: "used", label: "Использовано", type: "number", secret: false, required: true, placeholder: "30" },
    { key: "limit", label: "Лимит", type: "number", secret: false, required: false, placeholder: "45" },
    { key: "unit", label: "Единицы", type: "select", secret: false, required: true, options: UNITS },
    { key: "plan", label: "Тариф", type: "text", secret: false, required: false, placeholder: "Pro" },
  ],

  async fetchUsage({ config }) {
    const used = Number((config.used ?? "").replace(",", "."));
    if (!Number.isFinite(used) || used < 0) throw new ProviderError("Укажите корректное значение «Использовано»");
    const unit = (UNITS.find((u) => u.value === config.unit)?.value ?? "count") as MetricUnit;
    return {
      plan: config.plan || null,
      metrics: [{ key: "manual", label: config.metricLabel || "Использование", used, limit: optionalNumber(config.limit), unit }],
    };
  },
};
