import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { env } from "./env";

const COOKIE = "bu_session";
const MAX_AGE = 60 * 60 * 24 * 30;

/** Однопользовательский режим: доступ закрыт паролем APP_PASSWORD (если он задан). */
export function isAuthEnabled(): boolean {
  return Boolean(env.appPassword);
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Токен сессии — HMAC от секрета; смена пароля/секрета инвалидирует все сессии. */
function sessionToken(): string {
  const secret = env.sessionSecret ?? `password:${env.appPassword}`;
  return createHmac("sha256", secret).update("billing-usage:session:v1").digest("base64url");
}

export function checkPassword(password: string): boolean {
  return isAuthEnabled() && safeEqual(password, env.appPassword!);
}

export async function isAuthenticated(): Promise<boolean> {
  // Данные всегда динамические: не даём Next.js пререндерить страницы на этапе сборки.
  await connection();
  if (!isAuthEnabled()) return true;
  const token = (await cookies()).get(COOKIE)?.value;
  return Boolean(token) && safeEqual(token!, sessionToken());
}

/** Вызывается в каждом layout/page/server action, работающем с данными. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}

export async function createSession(): Promise<void> {
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Авторизация служебных запросов (крон): заголовок Authorization: Bearer <CRON_SECRET>. */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  return safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
