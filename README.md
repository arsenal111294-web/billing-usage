# Billing Tracker

Трекер платных подписок и лимитов облачных сервисов (Netlify, Supabase, Claude / Anthropic, OpenAI и любых других).

- **Подписки**: стоимость, валюта, периодичность (месяц/год), дата следующего списания, статус (активна/пауза), напоминание за N дней.
- **Лимиты в реальном времени**: интеграции стягивают по API минуты сборки, трафик, размер БД, токены и расходы за месяц.
- **Аналитика**: итоги за месяц и год в базовой валюте, прогноз списаний на 12 месяцев по категориям.
- **Напоминания**: алерты в UI о скором списании и исчерпании лимитов, рассылка по Email (Resend) и в Telegram.

**Стек:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Postgres) · Recharts · Netlify.

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:3000
```

Без переменных окружения приложение запускается в **демо-режиме**: данные хранятся в памяти процесса и заполнены примерами.

## Развёртывание

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. Примените схему из `supabase/migrations/20261001000000_init.sql`: через SQL Editor или `supabase db push`.
3. Возьмите `Project URL` и ключ `service_role` (Settings → API).

Приложение работает с БД только на сервере через `service_role`. На всех таблицах включён RLS без политик, поэтому публичный `anon`-ключ доступа к данным не имеет.

### 2. Netlify

1. Add new site → Import from Git → этот репозиторий. Сборку настраивает `netlify.toml` (Next.js runtime подключается автоматически).
2. В Site configuration → Environment variables задайте переменные (см. `.env.example`):

| Переменная | Обязательна | Назначение |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | да | Хранилище данных |
| `ENCRYPTION_KEY` | да | Шифрование API-ключей интеграций (`openssl rand -base64 32`). **Не меняйте после сохранения ключей**, иначе их придётся привязать заново |
| `APP_PASSWORD` | да | Пароль для входа в приложение |
| `CRON_SECRET` | да | Защита `/api/cron/daily` |
| `BASE_CURRENCY` | нет | Валюта итогов (по умолчанию `USD`) |
| `EXCHANGE_RATES` | нет | Курсы к USD в JSON, например `{"EUR":0.86,"RUB":82}` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` | нет | Email-уведомления |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | нет | Telegram-уведомления |

Секретные переменные (`is_secret`) Netlify не позволяет задавать для контекста «All» — указывайте контекст **Production**. Изменения переменных применяются только после нового деплоя.

3. Каждый push в основную ветку разворачивается автоматически.

### 3. Ежедневная проверка

`netlify/functions/daily-check.mts` — Netlify Scheduled Function. Она запускается каждый день в 06:00 UTC и вызывает `POST /api/cron/daily`, который:

1. переносит прошедшие даты списаний на следующий период;
2. синхронизирует все интеграции;
3. отправляет напоминания о списаниях (в пределах «напомнить за N дней») и о лимитах ≥ 95%.

Каждое напоминание уходит в канал один раз (таблица `notification_log`). Вне Netlify подойдёт любой крон:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/daily
```

Проверку можно запустить вручную на странице «Уведомления».

## Интеграции: где взять ключи

| Сервис | Ключ | Что отслеживается |
|---|---|---|
| **Netlify** | [Personal Access Token](https://app.netlify.com/user/applications#personal-access-tokens) | Минуты сборки, трафик, сайты и участники относительно лимитов тарифа |
| **Supabase** | [Personal Access Token](https://supabase.com/dashboard/account/tokens) | Активные проекты, размер БД, хранилище, MAU относительно квот Free/Pro |
| **Anthropic** | [Admin API key](https://console.anthropic.com/settings/admin-keys) (`sk-ant-admin01-…`) | Расходы ($) и токены за текущий месяц, Usage & Cost Admin API |
| **OpenAI** | [Admin key](https://platform.openai.com/settings/organization/admin-keys) | Расходы ($) и токены за текущий месяц |
| **Timeweb Cloud** | [API-токен](https://timeweb.cloud/my/api-keys) | Баланс, расход в месяц, на сколько дней хватит денег |
| **Selectel** | [API-ключ X-Token](https://my.selectel.ru/profile/apikeys) | Баланс и задолженность |
| **Yandex Cloud** | [OAuth-токен](https://yandex.cloud/ru/docs/iam/concepts/authorization/oauth-token) (`y0_…`) | Баланс платёжных аккаунтов |
| **Beget** | Логин + пароль API (Настройки → Доступ к API) | Баланс, тариф, дни до блокировки |
| **DeepSeek** | [API-ключ](https://platform.deepseek.com/api_keys) | Остаток на балансе API |
| **OpenRouter** | [API-ключ](https://openrouter.ai/settings/keys) (`sk-or-…`) | Потрачено кредитов из купленных |
| **Ручной лимит** | — | Любая метрика без API (например, лимит сообщений Claude.ai) |

**Про Anthropic.** Нужен именно Admin-ключ организации: обычный API-ключ (`sk-ant-api03-…`) не имеет доступа к отчётам об использовании. Создать Admin-ключ может только администратор организации в Console, у индивидуальных аккаунтов их нет. Укажите «Месячный бюджет»: он станет лимитом для индикатора расходов. Подписки Claude.ai (Pro/Max) не отражаются в API, добавьте их вручную как подписку.

Ключи шифруются AES-256-GCM на сервере и никогда не отдаются в браузер. На странице «Интеграции» достаточно вставить ключ — сервис определяется по префиксу (`nfp_`, `sbp_`, `sk-ant-admin`, `sk-admin-`, `sk-or-`, `y0_`, ключ DeepSeek); Timeweb, Selectel и Beget подключаются через ручную настройку.

## Каталог подписок

`src/lib/catalog.ts` — 50 популярных в РФ платных сервисов (экосистемы, кино, музыка, книги, AI, облака, софт, хостинг) с тарифами, ориентировочными ценами (сентябрь 2026) и ссылками на управление подпиской. При добавлении подписки достаточно выбрать сервис и указать дату списания.

- **Пробный период** — отметка «сейчас пробный период»: напоминание приходит до конца триала, первое списание ставится на дату его окончания.
- **Дубли** — если сервис уже входит в оплаченный пакет (Кинопоиск в Яндекс Плюс, Okko в СберПрайм, КИОН в МТС Premium…), приложение подскажет, что вы платите дважды.

**Telegram:** создайте бота у [@BotFather](https://t.me/BotFather), напишите ему любое сообщение и возьмите `chat.id` из `https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Структура

```
src/
  app/
    (app)/            дашборд, подписки, интеграции, уведомления + server actions
    login/            вход по паролю
    api/cron/daily    ежедневная проверка (Bearer CRON_SECRET)
    api/health        healthcheck
  components/         UI: карточки, формы, график, индикаторы лимитов
  lib/
    billing.ts        расчёты: перенос дат, итоги, прогноз, напоминания
    alerts.ts         алерты для UI
    db/               репозиторий: Supabase и in-memory (демо)
    integrations/     провайдеры (netlify, supabase, anthropic, openai, manual) + синхронизация
    notifications/    шаблоны и отправка (Resend, Telegram)
    jobs.ts           ежедневная задача
supabase/migrations   схема БД
netlify/functions     scheduled function
```

### Как добавить новый сервис

1. Создайте `src/lib/integrations/<service>.ts`, реализующий `ProviderDefinition`: поля формы и `fetchUsage()`, который возвращает метрики `{ used, limit, unit }`.
2. Зарегистрируйте его в `src/lib/integrations/index.ts`.
3. Добавьте id в `PROVIDER_IDS` (`src/lib/types.ts`) и в `check` таблицы `integrations` новой миграцией.

## Скрипты

```bash
npm run dev         # разработка
npm run build       # production-сборка
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # unit-тесты (Vitest)
```
