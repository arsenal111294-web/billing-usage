import { getCatalogService } from "@/lib/catalog";
import { cn } from "./ui";

/** Кружок с первой буквой сервиса — без логотипов (это чужие товарные знаки). */
export function ServiceAvatar({ name, serviceKey, size = "md" }: { name: string; serviceKey?: string | null; size?: "sm" | "md" }) {
  const color = getCatalogService(serviceKey)?.color ?? "var(--muted)";
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        size === "sm" ? "size-7 text-xs" : "size-9 text-sm",
      )}
      style={{ background: color, textShadow: "0 1px 1px rgb(0 0 0 / 0.35)" }}
    >
      {letter}
    </span>
  );
}
