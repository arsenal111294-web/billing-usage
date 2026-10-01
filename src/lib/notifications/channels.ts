import "server-only";
import { env } from "../env";
import type { NotificationChannel } from "../types";
import type { RenderedMessage } from "./templates";

export interface ChannelStatus {
  channel: NotificationChannel;
  label: string;
  configured: boolean;
  missing: string[];
}

export function channelStatuses(): ChannelStatus[] {
  const emailMissing = [
    !env.resendApiKey && "RESEND_API_KEY",
    !env.emailFrom && "EMAIL_FROM",
    !env.emailTo && "EMAIL_TO",
  ].filter(Boolean) as string[];
  const telegramMissing = [!env.telegramBotToken && "TELEGRAM_BOT_TOKEN", !env.telegramChatId && "TELEGRAM_CHAT_ID"].filter(
    Boolean,
  ) as string[];
  return [
    { channel: "email", label: "Email (Resend)", configured: emailMissing.length === 0, missing: emailMissing },
    { channel: "telegram", label: "Telegram-бот", configured: telegramMissing.length === 0, missing: telegramMissing },
  ];
}

/** Отправка письма через Resend REST API: https://resend.com/docs/api-reference/emails/send-email */
export async function sendEmail(message: RenderedMessage): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.emailFrom,
      to: env.emailTo!.split(",").map((s) => s.trim()),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Resend: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
}

/** Отправка через Telegram Bot API: https://core.telegram.org/bots/api#sendmessage */
export async function sendTelegram(message: RenderedMessage): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.telegramChatId,
      text: message.telegram,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { description?: string };
    throw new Error(`Telegram: HTTP ${response.status} ${body.description ?? ""}`.trim());
  }
}

export const SENDERS: Record<NotificationChannel, (message: RenderedMessage) => Promise<void>> = {
  email: sendEmail,
  telegram: sendTelegram,
};
