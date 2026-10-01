-- Каталог сервисов, пробные периоды и новые провайдеры интеграций.
-- Только добавление: существующие строки и данные не меняются.

-- Связь подписки с карточкой каталога (okko, yandex-plus, …) — для подсказок о дублях.
alter table public.subscriptions add column if not exists service_key text;

-- Дата окончания пробного периода: до неё подписка бесплатна, затем — первое списание.
alter table public.subscriptions add column if not exists trial_ends_at date;

-- Новые провайдеры: Timeweb Cloud, Selectel, Yandex Cloud, Beget, DeepSeek, OpenRouter.
alter table public.integrations drop constraint if exists integrations_provider_check;
alter table public.integrations add constraint integrations_provider_check check (
  provider in (
    'netlify', 'supabase', 'anthropic', 'openai', 'manual',
    'timeweb', 'selectel', 'yandex_cloud', 'beget', 'deepseek', 'openrouter'
  )
);
