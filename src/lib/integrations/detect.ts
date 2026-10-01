import type { ProviderId } from "../types";

/** Префиксы ключей, по которым сервис определяется автоматически. Порядок важен: более длинные — раньше. */
const KEY_PATTERNS: { test: (key: string) => boolean; provider: ProviderId; field: string }[] = [
  { test: (k) => k.startsWith("sk-ant-admin"), provider: "anthropic", field: "adminKey" },
  { test: (k) => k.startsWith("sk-admin-"), provider: "openai", field: "adminKey" },
  { test: (k) => k.startsWith("sk-or-"), provider: "openrouter", field: "apiKey" },
  // Ключи DeepSeek: sk- и ровно 32 шестнадцатеричных символа.
  { test: (k) => /^sk-[0-9a-f]{32}$/.test(k), provider: "deepseek", field: "apiKey" },
  { test: (k) => k.startsWith("nfp_"), provider: "netlify", field: "token" },
  { test: (k) => k.startsWith("sbp_"), provider: "supabase", field: "token" },
  { test: (k) => k.startsWith("y0_"), provider: "yandex_cloud", field: "oauthToken" },
];

export interface DetectedKey {
  provider: ProviderId;
  field: string;
}

export type KeyDetection = DetectedKey | { error: string };

export function detectKey(raw: string): KeyDetection {
  const key = raw.trim();
  if (!key) return { error: "Вставьте ключ" };
  const match = KEY_PATTERNS.find((p) => p.test(key));
  if (match) return { provider: match.provider, field: match.field };
  if (key.startsWith("sk-ant-api")) {
    return { error: "Это обычный API-ключ Anthropic. Для расходов нужен Admin-ключ (sk-ant-admin01-…) из Console → Settings → Admin keys." };
  }
  if (key.startsWith("sb_secret_") || key.startsWith("sb_publishable_")) {
    return { error: "Это ключ проекта Supabase. Нужен Personal Access Token аккаунта (sbp_…): supabase.com/dashboard/account/tokens." };
  }
  if (key.startsWith("eyJ")) {
    return {
      error:
        "Такие ключи (eyJ…) бывают у Timeweb Cloud и у проектов Supabase — сервис не определить автоматически. Выберите Timeweb Cloud в ручной настройке ниже.",
    };
  }
  if (key.startsWith("sk-")) {
    return { error: "Похоже на обычный ключ OpenAI. Для расходов нужен Admin key (sk-admin-…)." };
  }
  return { error: "Не удалось определить сервис по ключу (Selectel, Beget и другие — через ручную настройку ниже)." };
}
