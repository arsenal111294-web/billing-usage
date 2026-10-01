/**
 * Netlify Scheduled Function: раз в сутки вызывает /api/cron/daily приложения.
 * https://docs.netlify.com/build/functions/scheduled-functions/
 *
 * Требует переменную окружения CRON_SECRET (та же, что у приложения).
 * URL сайта Netlify подставляет автоматически.
 */
export default async function dailyCheck(): Promise<Response> {
  const baseUrl = process.env.URL ?? process.env.APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.error("daily-check: URL или CRON_SECRET не заданы — пропуск");
    return new Response("not configured", { status: 500 });
  }

  const response = await fetch(new URL("/api/cron/daily", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  console.log(`daily-check: HTTP ${response.status} ${body.slice(0, 2000)}`);
  return new Response(body, { status: response.status });
}

// Каждый день в 06:00 UTC.
export const config = { schedule: "0 6 * * *" };
