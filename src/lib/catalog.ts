import type { BillingCycle, ProviderId } from "./types";

/**
 * Каталог популярных в РФ платных сервисов.
 * Цены — ориентир на сентябрь 2026 г. (без промо и персональных скидок): при добавлении их можно поправить.
 */

export interface CatalogPlan {
  label: string;
  cost: number;
  currency: string;
  cycle: BillingCycle;
}

export interface CatalogService {
  key: string;
  name: string;
  category: CatalogCategory;
  color: string;
  plans: CatalogPlan[];
  /** Страница управления подпиской (оплата, отмена). */
  manageUrl?: string;
  /** Сервисы, которые уже входят в эту подписку. */
  includes?: string[];
  /** Есть интеграция по API — расход и лимиты можно подтягивать автоматически. */
  integration?: ProviderId;
  /** Оплата по факту потребления: сумма в подписке — ориентир. */
  usageBased?: boolean;
  /** Сервис указан по категории, а не по бренду (например, VPN). */
  generic?: boolean;
}

/** Альтернативные написания для поиска (кириллица/латиница). */
const ALIASES: Record<string, string[]> = {
  "yandex-plus": ["yandex plus", "плюс"],
  sberprime: ["sber", "сбер"],
  "mts-premium": ["mts"],
  "tbank-pro": ["тинькофф", "tinkoff", "tbank"],
  "ozon-premium": ["озон"],
  kinopoisk: ["kinopoisk"],
  okko: ["окко"],
  ivi: ["ivi"],
  kion: ["kion"],
  wink: ["винк"],
  start: ["старт"],
  premier: ["премьер"],
  amediateka: ["amediateka"],
  "more-tv": ["мор тв", "море тв"],
  "vk-music": ["вк музыка", "vk"],
  zvuk: ["zvuk", "сбер звук"],
  litres: ["litres", "литрес"],
  chatgpt: ["чатгпт", "openai", "gpt"],
  claude: ["клод", "anthropic"],
  gemini: ["гемини", "джемини"],
  midjourney: ["миджорни"],
  "github-copilot": ["копайлот"],
  "telegram-premium": ["телеграм"],
  "xbox-game-pass": ["иксбокс"],
  "ms-365": ["office", "офис"],
  "adobe-cc": ["photoshop", "фотошоп"],
  "timeweb-cloud": ["таймвеб"],
  selectel: ["селектел"],
  beget: ["бегет"],
  "reg-ru": ["рег ру", "домен"],
  "yandex-cloud": ["яндекс облако"],
  netlify: ["нетлифай"],
  supabase: ["супабейс"],
};

export const CATALOG_CATEGORIES = [
  "Экосистемы",
  "Кино и ТВ",
  "Музыка",
  "Книги",
  "AI",
  "Облака",
  "Связь и безопасность",
  "Игры",
  "Софт и работа",
  "Обучение",
  "Хостинг и разработка",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

const m = (label: string, cost: number, currency = "RUB"): CatalogPlan => ({ label, cost, currency, cycle: "monthly" });
const y = (label: string, cost: number, currency = "RUB"): CatalogPlan => ({ label, cost, currency, cycle: "yearly" });

export const CATALOG: CatalogService[] = [
  // ── Экосистемы ──
  {
    key: "yandex-plus",
    name: "Яндекс Плюс",
    category: "Экосистемы",
    color: "#fc3f1d",
    plans: [m("Плюс", 449), y("Плюс на год", 4490), m("Плюс с Амедиатекой и START", 799)],
    manageUrl: "https://plus.yandex.ru/my",
    includes: ["kinopoisk", "yandex-music", "yandex-books"],
  },
  {
    key: "sberprime",
    name: "СберПрайм",
    category: "Экосистемы",
    color: "#21a038",
    plans: [m("СберПрайм", 399), m("СберПрайм+", 599)],
    manageUrl: "https://sberprime.sber.ru/",
    includes: ["okko", "zvuk"],
  },
  {
    key: "mts-premium",
    name: "МТС Premium",
    category: "Экосистемы",
    color: "#e30611",
    plans: [m("МТС Premium", 349), m("КИОН + Premium", 299)],
    manageUrl: "https://premium.mts.ru/",
    includes: ["kion", "kion-music"],
  },
  { key: "tbank-pro", name: "Т-Банк Pro", category: "Экосистемы", color: "#ffdd2d", plans: [m("Pro", 299)], manageUrl: "https://www.tbank.ru/pro/" },
  {
    key: "gazprom-bonus",
    name: "Газпром Бонус",
    category: "Экосистемы",
    color: "#0079c2",
    plans: [m("Газпром Бонус", 399)],
    manageUrl: "https://gazprombonus.ru/",
    includes: ["premier"],
  },
  { key: "ozon-premium", name: "Ozon Premium", category: "Экосистемы", color: "#005bff", plans: [m("Premium", 299)], manageUrl: "https://www.ozon.ru/premium/" },

  // ── Кино и ТВ ──
  {
    key: "kinopoisk",
    name: "Кинопоиск",
    category: "Кино и ТВ",
    color: "#ff6600",
    plans: [m("Через Яндекс Плюс", 449)],
    manageUrl: "https://hd.kinopoisk.ru/",
  },
  {
    key: "okko",
    name: "Okko",
    category: "Кино и ТВ",
    color: "#5b2cff",
    plans: [m("Прайм", 399), m("Прайм + Премиум", 899)],
    manageUrl: "https://okko.tv/",
  },
  {
    key: "ivi",
    name: "Иви",
    category: "Кино и ТВ",
    color: "#ea003d",
    plans: [m("Иви", 399), m("Иви с рекламой", 199), y("Иви на год", 2990), m("Иви + Амедиатека", 699)],
    manageUrl: "https://www.ivi.ru/profile/subscriptions",
  },
  { key: "kion", name: "КИОН", category: "Кино и ТВ", color: "#7b2cbf", plans: [m("КИОН", 299)], manageUrl: "https://kion.ru/" },
  { key: "wink", name: "Wink", category: "Кино и ТВ", color: "#ff4f12", plans: [m("Wink", 349), y("Wink на год", 1190)], manageUrl: "https://wink.ru/" },
  { key: "start", name: "START", category: "Кино и ТВ", color: "#111111", plans: [m("START", 499), y("START на год", 2990)], manageUrl: "https://start.ru/" },
  {
    key: "premier",
    name: "PREMIER",
    category: "Кино и ТВ",
    color: "#ffb400",
    plans: [m("PREMIER", 399), y("PREMIER на год", 1799), m("PREMIER + START", 599)],
    manageUrl: "https://premier.one/",
  },
  {
    key: "amediateka",
    name: "Амедиатека",
    category: "Кино и ТВ",
    color: "#1a1a1a",
    plans: [m("Амедиатека", 599), y("Амедиатека на год", 4999)],
    manageUrl: "https://www.amediateka.ru/",
  },
  { key: "more-tv", name: "more.tv", category: "Кино и ТВ", color: "#e6007e", plans: [m("more.tv", 299)], manageUrl: "https://more.tv/" },

  // ── Музыка ──
  { key: "yandex-music", name: "Яндекс Музыка", category: "Музыка", color: "#ffcc00", plans: [m("Через Яндекс Плюс", 449)], manageUrl: "https://music.yandex.ru/" },
  {
    key: "vk-music",
    name: "VK Музыка",
    category: "Музыка",
    color: "#0077ff",
    plans: [m("Индивидуальная", 199), m("На четверых", 249), y("На год", 1599)],
    manageUrl: "https://vk.com/music",
  },
  { key: "zvuk", name: "Звук", category: "Музыка", color: "#ff3b30", plans: [m("Звук", 199)], manageUrl: "https://zvuk.com/" },
  { key: "kion-music", name: "КИОН Музыка", category: "Музыка", color: "#9b5de5", plans: [m("КИОН Музыка", 169)], manageUrl: "https://kion.ru/" },

  // ── Книги ──
  { key: "litres", name: "Литрес", category: "Книги", color: "#ff5c00", plans: [m("Абонемент", 399)], manageUrl: "https://www.litres.ru/abonement/" },
  { key: "yandex-books", name: "Яндекс Книги", category: "Книги", color: "#ff8a00", plans: [m("Через Яндекс Плюс", 449)], manageUrl: "https://books.yandex.ru/" },
  { key: "mybook", name: "MyBook", category: "Книги", color: "#00a86b", plans: [m("Премиум", 449)], manageUrl: "https://mybook.ru/" },

  // ── AI ──
  {
    key: "chatgpt",
    name: "ChatGPT",
    category: "AI",
    color: "#10a37f",
    plans: [m("Plus", 20, "USD"), m("Pro", 200, "USD")],
    manageUrl: "https://chatgpt.com/",
  },
  {
    key: "claude",
    name: "Claude",
    category: "AI",
    color: "#d97757",
    plans: [m("Pro", 20, "USD"), y("Pro на год", 200, "USD"), m("Max 5×", 100, "USD"), m("Max 20×", 200, "USD")],
    manageUrl: "https://claude.ai/settings/billing",
  },
  { key: "gemini", name: "Google Gemini", category: "AI", color: "#4285f4", plans: [m("Google AI Pro", 19.99, "USD")], manageUrl: "https://one.google.com/" },
  { key: "perplexity", name: "Perplexity", category: "AI", color: "#20808d", plans: [m("Pro", 20, "USD")], manageUrl: "https://www.perplexity.ai/settings/account" },
  {
    key: "midjourney",
    name: "Midjourney",
    category: "AI",
    color: "#2b2b2b",
    plans: [m("Basic", 10, "USD"), m("Standard", 30, "USD")],
    manageUrl: "https://www.midjourney.com/account",
  },
  { key: "cursor", name: "Cursor", category: "AI", color: "#3a3a3a", plans: [m("Pro", 20, "USD")], manageUrl: "https://cursor.com/dashboard" },
  {
    key: "github-copilot",
    name: "GitHub Copilot",
    category: "AI",
    color: "#24292f",
    plans: [m("Pro", 10, "USD"), y("Pro на год", 100, "USD"), m("Pro+", 39, "USD")],
    manageUrl: "https://github.com/settings/billing",
  },

  // ── Облака ──
  { key: "yandex-360", name: "Яндекс 360", category: "Облака", color: "#fc3f1d", plans: [m("Премиум", 349)], manageUrl: "https://360.yandex.ru/premium-plans/" },
  { key: "icloud", name: "iCloud+", category: "Облака", color: "#3693f3", plans: [m("50 ГБ", 149), m("200 ГБ", 299)], manageUrl: "https://www.icloud.com/" },
  { key: "google-one", name: "Google One", category: "Облака", color: "#34a853", plans: [m("100 ГБ", 1.99, "USD"), m("2 ТБ", 9.99, "USD")], manageUrl: "https://one.google.com/" },
  { key: "cloud-mail", name: "Облако Mail", category: "Облака", color: "#005ff9", plans: [m("100 ГБ", 149)], manageUrl: "https://cloud.mail.ru/" },

  // ── Связь и безопасность ──
  { key: "telegram-premium", name: "Telegram Premium", category: "Связь и безопасность", color: "#2aabee", plans: [m("Premium", 299), y("Premium на год", 2490)] },
  { key: "vpn", name: "VPN-сервис", category: "Связь и безопасность", color: "#6b7280", plans: [m("Месяц", 299)], generic: true },

  // ── Игры ──
  {
    key: "xbox-game-pass",
    name: "Xbox Game Pass",
    category: "Игры",
    color: "#107c10",
    plans: [m("Ultimate", 29.99, "USD"), m("PC Game Pass", 16.49, "USD")],
    manageUrl: "https://account.microsoft.com/services",
  },

  // ── Софт и работа ──
  {
    key: "ms-365",
    name: "Microsoft 365",
    category: "Софт и работа",
    color: "#d83b01",
    plans: [m("Personal", 9.99, "USD"), y("Personal на год", 99.99, "USD")],
    manageUrl: "https://account.microsoft.com/services",
  },
  { key: "adobe-cc", name: "Adobe Creative Cloud", category: "Софт и работа", color: "#fa0f00", plans: [m("Creative Cloud Pro", 69.99, "USD")], manageUrl: "https://account.adobe.com/plans" },
  { key: "figma", name: "Figma", category: "Софт и работа", color: "#a259ff", plans: [m("Professional", 16, "USD")], manageUrl: "https://www.figma.com/settings" },
  { key: "notion", name: "Notion", category: "Софт и работа", color: "#000000", plans: [m("Plus", 12, "USD")], manageUrl: "https://www.notion.so/" },
  { key: "canva", name: "Canva", category: "Софт и работа", color: "#00c4cc", plans: [m("Pro", 15, "USD")], manageUrl: "https://www.canva.com/settings/billing-and-teams" },
  {
    key: "jetbrains",
    name: "JetBrains",
    category: "Софт и работа",
    color: "#ff318c",
    plans: [m("All Products Pack", 28.9, "USD"), y("All Products Pack на год", 289, "USD")],
    manageUrl: "https://account.jetbrains.com/licenses",
  },

  // ── Обучение ──
  { key: "duolingo", name: "Duolingo", category: "Обучение", color: "#58cc02", plans: [m("Super", 12.99, "USD")], manageUrl: "https://www.duolingo.com/settings/super" },

  // ── Хостинг и разработка ──
  {
    key: "timeweb-cloud",
    name: "Timeweb Cloud",
    category: "Хостинг и разработка",
    color: "#2563eb",
    plans: [m("По потреблению", 0)],
    manageUrl: "https://timeweb.cloud/my/finances",
    integration: "timeweb",
    usageBased: true,
  },
  {
    key: "selectel",
    name: "Selectel",
    category: "Хостинг и разработка",
    color: "#ff0000",
    plans: [m("По потреблению", 0)],
    manageUrl: "https://my.selectel.ru/balance",
    integration: "selectel",
    usageBased: true,
  },
  {
    key: "beget",
    name: "Beget",
    category: "Хостинг и разработка",
    color: "#0d8bf2",
    plans: [m("Хостинг", 300)],
    manageUrl: "https://cp.beget.com/",
    integration: "beget",
  },
  { key: "reg-ru", name: "Reg.ru", category: "Хостинг и разработка", color: "#e4002b", plans: [y("Домен .ru", 300)], manageUrl: "https://www.reg.ru/user/account/" },
  {
    key: "yandex-cloud",
    name: "Yandex Cloud",
    category: "Хостинг и разработка",
    color: "#2e7cf6",
    plans: [m("По потреблению", 0)],
    manageUrl: "https://console.yandex.cloud/billing",
    integration: "yandex_cloud",
    usageBased: true,
  },
  {
    key: "netlify",
    name: "Netlify",
    category: "Хостинг и разработка",
    color: "#00ad9f",
    plans: [m("Personal", 9, "USD"), m("Pro", 20, "USD")],
    manageUrl: "https://app.netlify.com/",
    integration: "netlify",
  },
  {
    key: "supabase",
    name: "Supabase",
    category: "Хостинг и разработка",
    color: "#3ecf8e",
    plans: [m("Pro", 25, "USD")],
    manageUrl: "https://supabase.com/dashboard/org/_/billing",
    integration: "supabase",
  },
];

const BY_KEY = new Map(CATALOG.map((s) => [s.key, s]));

export function getCatalogService(key: string | null | undefined): CatalogService | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/** В какие подписки каталога входит сервис (например, Кинопоиск → Яндекс Плюс). */
export function bundlesContaining(key: string): CatalogService[] {
  return CATALOG.filter((s) => s.includes?.includes(key));
}

export function catalogByCategory(): { category: CatalogCategory; services: CatalogService[] }[] {
  return CATALOG_CATEGORIES.map((category) => ({ category, services: CATALOG.filter((s) => s.category === category) }));
}

/** Поиск без учёта регистра и «ё». */
export function searchCatalog(query: string): CatalogService[] {
  const norm = (v: string) => v.toLowerCase().replace(/ё/g, "е").trim();
  const q = norm(query);
  if (!q) return CATALOG;
  return CATALOG.filter(
    (s) =>
      norm(s.name).includes(q) ||
      s.key.includes(q) ||
      norm(s.category).includes(q) ||
      (ALIASES[s.key] ?? []).some((alias) => norm(alias).includes(q)),
  );
}
