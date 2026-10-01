import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/auth";
import { runDailyCheck } from "@/lib/jobs";

// Синхронизация может занимать время: несколько внешних API подряд.
export const maxDuration = 60;

/**
 * Ежедневная проверка. Вызывается Netlify Scheduled Function (netlify/functions/daily-check.mts)
 * или любым внешним кроном: curl -X POST -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/daily
 */
async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDailyCheck());
  } catch (error) {
    console.error("daily check failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
