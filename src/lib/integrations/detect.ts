import type { ProviderId } from "../types";

/** Префиксы ключей, по которым сервис определяется автоматически. Порядок важен: более длинные — раньше. */
const KEY_PATTERNS: { prefix: string; provider: ProviderId; field: string }[] = [
  { prefix: "sk-ant-admin", provider: "anthropic", field: "adminKey" },
  { prefix: "sk-admin-", provider: "openai", field: "adminKey" },
  { prefix: "nfp_", provider: "netlify", field: "token" },
  { prefix: "sbp_", provider: "supabase", field: "token" },
];

export interface DetectedKey {
  provider: ProviderId;
  field: string;
}

export type KeyDetection = DetectedKey | { error: string };

export function detectKey(raw: string): KeyDetection {
  const key = raw.trim();
  if (!key) return { error: "Вставьте ключ" };
  const match = KEY_PATTERNS.find((p) => key.startsWith(p.prefix));
  if (match) return { provider: match.provider, field: match.field };
  if (key.startsWith("sk-ant-api")) {
    return { error: "Это обычный API-ключ Anthropic. Для расходов нужен Admin-ключ (sk-ant-admin01-…) из Console → Settings → Admin keys." };
  }
  if (key.startsWith("sb_secret_") || key.startsWith("sb_publishable_") || key.startsWith("eyJ")) {
    return { error: "Это ключ проекта Supabase. Нужен Personal Access Token аккаунта (sbp_…): supabase.com/dashboard/account/tokens." };
  }
  if (key.startsWith("sk-")) {
    return { error: "Похоже на обычный ключ OpenAI. Для расходов нужен Admin key (sk-admin-…)." };
  }
  return { error: "Не удалось определить сервис по ключу. Выберите его вручную в расширенной форме ниже." };
}
