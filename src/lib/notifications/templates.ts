import type { UpcomingCharge } from "../billing";
import type { LimitBreach } from "../alerts";
import { formatMoney } from "../currency";
import { formatDate, relativeDays } from "../dates";
import { formatMetricValue, formatPercent } from "../format";

export interface DigestInput {
  charges: UpcomingCharge[];
  limits: LimitBreach[];
  appUrl: string;
}

export interface RenderedMessage {
  subject: string;
  text: string;
  html: string;
  /** HTML-подмножество, которое понимает Telegram (parse_mode=HTML). */
  telegram: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function chargeLine(c: UpcomingCharge) {
  return {
    name: c.subscription.name,
    amount: formatMoney(c.subscription.cost, c.subscription.currency),
    when: `${relativeDays(c.daysLeft)} (${formatDate(c.date)})`,
  };
}

function limitLine(l: LimitBreach) {
  return {
    name: `${l.integration.name} — ${l.metric.label}`,
    value: `${formatMetricValue(l.metric.used, l.metric.unit)} из ${formatMetricValue(l.metric.limit ?? 0, l.metric.unit)}`,
    percent: formatPercent(l.ratio),
  };
}

export function renderSubject({ charges, limits }: Pick<DigestInput, "charges" | "limits">): string {
  if (charges.length === 1 && limits.length === 0) {
    const c = chargeLine(charges[0]);
    return `Скоро списание: ${c.name} — ${c.amount} ${relativeDays(charges[0].daysLeft)}`;
  }
  const parts: string[] = [];
  if (charges.length) parts.push(`списаний: ${charges.length}`);
  if (limits.length) parts.push(`лимитов на исходе: ${limits.length}`);
  return `Billing Tracker — ${parts.join(", ")}`;
}

export function renderDigest(input: DigestInput): RenderedMessage {
  const charges = input.charges.map(chargeLine);
  const limits = input.limits.map(limitLine);
  const subject = renderSubject(input);

  const text = [
    charges.length ? "Предстоящие списания:" : "",
    ...charges.map((c) => `• ${c.name}: ${c.amount} — ${c.when}`),
    limits.length ? "\nЛимиты на исходе:" : "",
    ...limits.map((l) => `• ${l.name}: ${l.percent} (${l.value})`),
    `\nОткрыть дашборд: ${input.appUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const row = (cells: string[]) =>
    `<tr>${cells.map((c, i) => `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;${i > 0 ? "text-align:right;white-space:nowrap;" : ""}">${c}</td>`).join("")}</tr>`;
  const section = (title: string, rows: string[]) =>
    rows.length
      ? `<h3 style="margin:24px 0 8px;font-size:15px;color:#111827">${title}</h3><table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">${rows.join("")}</table>`
      : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111827">${escapeHtml(subject)}</h2>
    <p style="margin:0;color:#6b7280;font-size:13px">Напоминание от Billing Tracker</p>
    ${section("Предстоящие списания", charges.map((c) => row([escapeHtml(c.name), `<b>${escapeHtml(c.amount)}</b>`, escapeHtml(c.when)])))}
    ${section("Лимиты на исходе", limits.map((l) => row([escapeHtml(l.name), `<b>${l.percent}</b>`, escapeHtml(l.value)])))}
    <p style="margin:24px 0 0"><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">Открыть дашборд</a></p>
  </div>
</div></body></html>`;

  const telegram = [
    `<b>${escapeHtml(subject)}</b>`,
    charges.length ? "\n💳 <b>Предстоящие списания</b>" : "",
    ...charges.map((c) => `• ${escapeHtml(c.name)} — <b>${escapeHtml(c.amount)}</b>, ${escapeHtml(c.when)}`),
    limits.length ? "\n⚠️ <b>Лимиты на исходе</b>" : "",
    ...limits.map((l) => `• ${escapeHtml(l.name)}: <b>${l.percent}</b> (${escapeHtml(l.value)})`),
    `\n<a href="${escapeHtml(input.appUrl)}">Открыть дашборд</a>`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, text, html, telegram };
}
