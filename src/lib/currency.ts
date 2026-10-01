/**
 * Ориентировочные курсы: сколько единиц валюты за 1 USD.
 * Для точных итогов переопределите через переменную окружения EXCHANGE_RATES (JSON).
 */
export const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.86,
  GBP: 0.75,
  RUB: 82,
  KZT: 520,
  UAH: 41.5,
  BYN: 3.3,
  TRY: 41,
  CNY: 7.15,
  JPY: 148,
  INR: 88,
  PLN: 3.65,
  GEL: 2.7,
};

export const SUPPORTED_CURRENCIES = Object.keys(DEFAULT_RATES);

export type Rates = Record<string, number>;

export function parseRates(raw: string | undefined): Rates {
  if (!raw) return DEFAULT_RATES;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rates: Rates = { ...DEFAULT_RATES };
    for (const [code, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) rates[code.toUpperCase()] = n;
    }
    return rates;
  } catch {
    return DEFAULT_RATES;
  }
}

/** Конвертация через USD. Неизвестная валюта считается 1:1 к USD. */
export function convert(amount: number, from: string, to: string, rates: Rates = DEFAULT_RATES): number {
  if (from === to) return amount;
  const fromRate = rates[from.toUpperCase()] ?? 1;
  const toRate = rates[to.toUpperCase()] ?? 1;
  return (amount / fromRate) * toRate;
}

export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}): string {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: opts.compact ? 0 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
