"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, isAuthEnabled } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAuthEnabled()) redirect("/");
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    // Небольшая задержка усложняет перебор пароля.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Неверный пароль" };
  }
  await createSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
