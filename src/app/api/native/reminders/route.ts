import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { loadAppData } from "@/lib/data";
import { buildNativeReminders } from "@/lib/native-reminders";

/** Расписание напоминаний для Android-приложения (доступно только после входа). */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { today, subscriptions, integrations } = await loadAppData();
  return NextResponse.json(
    { today, reminders: buildNativeReminders(subscriptions, integrations, today) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
