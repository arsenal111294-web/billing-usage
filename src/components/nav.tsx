"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, LayoutDashboard, PlugZap } from "lucide-react";
import { cn } from "./ui";

const LINKS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Подписки", icon: CreditCard },
  { href: "/integrations", label: "Интеграции", icon: PlugZap },
  { href: "/alerts", label: "Уведомления", icon: Bell },
];

export function Nav({ alertCount }: { alertCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Основная навигация" className="flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {href === "/alerts" && alertCount > 0 ? (
              <span className="tabular rounded-full bg-critical px-1.5 text-xs leading-5 text-white">{alertCount}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
