-- Billing Usage Tracker: начальная схема
-- Приложение обращается к БД только с сервера через service_role ключ.
-- RLS включён без политик, поэтому anon/authenticated ключи доступа к данным не имеют.

create extension if not exists pgcrypto;

-- ─── Интеграции (API-ключи / сессии для динамического отслеживания остатков) ───
create table if not exists public.integrations (
  id                    uuid primary key default gen_random_uuid(),
  provider              text not null check (provider in ('netlify', 'supabase', 'anthropic', 'openai', 'manual')),
  name                  text not null check (char_length(name) between 1 and 100),
  -- Несекретные параметры (slug аккаунта, ref проекта, бюджет и т.п.)
  config                jsonb not null default '{}'::jsonb,
  -- Секреты (токены), зашифрованные AES-256-GCM на стороне приложения
  credentials_encrypted text,
  status                text not null default 'pending' check (status in ('pending', 'ok', 'error')),
  last_synced_at        timestamptz,
  last_error            text,
  -- Последний снимок метрик: { fetchedAt, plan, periodStart, periodEnd, metrics: [...] }
  usage                 jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── Подписки ───
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 100),
  category            text,
  cost                numeric(12, 2) not null check (cost >= 0),
  currency            char(3) not null default 'USD',
  billing_cycle       text not null check (billing_cycle in ('monthly', 'yearly')),
  next_billing_date   date not null,
  status              text not null default 'active' check (status in ('active', 'paused')),
  remind_days_before  smallint not null default 3 check (remind_days_before between 0 and 30),
  url                 text,
  notes               text,
  integration_id      uuid references public.integrations (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists subscriptions_next_billing_idx
  on public.subscriptions (next_billing_date) where status = 'active';

-- ─── История снимков использования (для трендов) ───
create table if not exists public.usage_snapshots (
  id              bigint generated always as identity primary key,
  integration_id  uuid not null references public.integrations (id) on delete cascade,
  snapshot        jsonb not null,
  fetched_at      timestamptz not null default now()
);

create index if not exists usage_snapshots_integration_idx
  on public.usage_snapshots (integration_id, fetched_at desc);

-- ─── Журнал отправленных уведомлений (дедупликация напоминаний) ───
create table if not exists public.notification_log (
  id               bigint generated always as identity primary key,
  dedupe_key       text not null unique,
  kind             text not null check (kind in ('charge', 'limit', 'test')),
  channel          text not null check (channel in ('email', 'telegram')),
  subscription_id  uuid references public.subscriptions (id) on delete cascade,
  integration_id   uuid references public.integrations (id) on delete cascade,
  sent_at          timestamptz not null default now()
);

-- ─── updated_at ───
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- ─── Row Level Security: доступ только у service_role ───
alter table public.integrations     enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.usage_snapshots  enable row level security;
alter table public.notification_log enable row level security;

revoke all on public.integrations, public.subscriptions, public.usage_snapshots, public.notification_log
  from anon, authenticated;
