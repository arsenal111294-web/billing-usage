import { NextResponse } from "next/server";
import { connection } from "next/server";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  await connection();
  return NextResponse.json({ status: "ok", storage: isDemoMode() ? "memory" : "supabase", time: new Date().toISOString() });
}
