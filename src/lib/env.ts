import "server-only";

/** Значения читаются при каждом обращении, чтобы не «запекать» их на этапе сборки. */
function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const env = {
  get supabaseUrl() {
    return read("SUPABASE_URL") ?? read("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseServiceKey() {
    return read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get encryptionKey() {
    return read("ENCRYPTION_KEY");
  },
  get appPassword() {
    return read("APP_PASSWORD");
  },
  get sessionSecret() {
    return read("SESSION_SECRET");
  },
  get cronSecret() {
    return read("CRON_SECRET");
  },
  get appUrl() {
    // На Netlify переменная URL выставляется автоматически.
    return read("APP_URL") ?? read("URL") ?? "http://localhost:3000";
  },
  get baseCurrency() {
    return (read("BASE_CURRENCY") ?? "USD").toUpperCase();
  },
  get exchangeRates() {
    return read("EXCHANGE_RATES");
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  get emailFrom() {
    return read("EMAIL_FROM");
  },
  get emailTo() {
    return read("EMAIL_TO");
  },
  get telegramBotToken() {
    return read("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId() {
    return read("TELEGRAM_CHAT_ID");
  },
};

/** Демо-режим: Supabase не настроен, данные хранятся в памяти процесса. */
export function isDemoMode(): boolean {
  return !(env.supabaseUrl && env.supabaseServiceKey);
}
