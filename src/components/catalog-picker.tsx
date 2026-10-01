"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Plus, PlugZap, Search } from "lucide-react";
import { bundlesContaining, CATALOG_CATEGORIES, searchCatalog } from "@/lib/catalog";
import { ServiceAvatar } from "./service-avatar";
import { cn, Input } from "./ui";

function priceLabel(cost: number, currency: string, cycle: "monthly" | "yearly") {
  const amount = currency === "RUB" ? `${cost} ₽` : currency === "USD" ? `$${cost}` : `${cost} ${currency}`;
  return `${amount}/${cycle === "monthly" ? "мес" : "год"}`;
}

/** Каталог сервисов: выбор карточки открывает форму с подставленными данными. */
export function CatalogPicker({ addedKeys }: { addedKeys: string[] }) {
  const [query, setQuery] = useState("");
  const added = useMemo(() => new Set(addedKeys), [addedKeys]);
  const results = useMemo(() => searchCatalog(query), [query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="catalog-search" className="sr-only">
          Найти сервис
        </label>
        <Input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти сервис: Okko, Яндекс, Claude…"
          className="pl-9"
          autoFocus
        />
      </div>

      {CATALOG_CATEGORIES.map((category) => {
        const services = results.filter((s) => s.category === category);
        if (services.length === 0) return null;
        return (
          <section key={category} aria-label={category}>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">{category}</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const isAdded = added.has(service.key);
                const bundles = bundlesContaining(service.key);
                const plan = service.plans[0];
                return (
                  <li key={service.key} className="min-w-0">
                    <Link
                      href={`/subscriptions?new=1&service=${service.key}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:bg-surface-2",
                        isAdded && "opacity-70",
                      )}
                    >
                      <ServiceAvatar name={service.name} serviceKey={service.key} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-ink">{service.name}</span>
                          {service.integration ? (
                            <span className="inline-flex items-center gap-0.5 rounded bg-accent-track px-1 text-[10px] font-medium text-accent-strong" title="Есть интеграция по API">
                              <PlugZap className="size-3" aria-hidden /> API
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {service.usageBased ? "по потреблению" : `от ${priceLabel(plan.cost, plan.currency, plan.cycle)}`}
                          {bundles.length ? ` · входит в ${bundles.map((b) => b.name).join(", ")}` : ""}
                        </span>
                      </span>
                      {isAdded ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-good-ink">
                          <Check className="size-3.5" aria-hidden /> добавлено
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {results.length === 0 ? <p className="text-sm text-muted">Ничего не найдено — добавьте сервис вручную.</p> : null}

      <Link
        href="/subscriptions?new=1&service=custom"
        className="flex items-center gap-3 rounded-lg border border-dashed border-line p-3 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-2">
          <Plus className="size-4" aria-hidden />
        </span>
        Свой сервис — нет в каталоге
      </Link>
    </div>
  );
}
