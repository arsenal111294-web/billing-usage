import { ProviderError } from "./types";

interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

/** JSON-запрос к внешнему API с таймаутом и понятными ошибками (без утечки заголовков). */
export async function requestJson<T>(
  fetchImpl: typeof fetch,
  service: string,
  url: string,
  { method = "GET", headers = {}, body, timeoutMs = 15_000 }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "таймаут запроса" : "сеть недоступна";
    throw new ProviderError(`${service}: ${reason}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const text = await response.text();
      const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } | string; msg?: string };
      detail =
        (typeof parsed.error === "string" ? parsed.error : parsed.error?.message) ?? parsed.message ?? parsed.msg ?? "";
    } catch {
      // тело не JSON — достаточно статуса
    }
    const hint =
      response.status === 401 || response.status === 403
        ? "неверный или недостаточный по правам токен"
        : `HTTP ${response.status}`;
    throw new ProviderError(`${service}: ${hint}${detail ? ` — ${detail.slice(0, 200)}` : ""}`, response.status);
  }

  return (await response.json()) as T;
}

export function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Начало текущего календарного месяца (UTC). */
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function nextMonthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function optionalNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
