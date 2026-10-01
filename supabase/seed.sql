-- Пример данных для локальной разработки (supabase db reset применит этот файл).
insert into public.subscriptions (name, category, cost, currency, billing_cycle, next_billing_date, status, remind_days_before, url)
values
  ('Claude Pro',         'AI',        20.00, 'USD', 'monthly', current_date + 2,  'active', 3, 'https://claude.ai/settings/billing'),
  ('Netlify Pro',        'Хостинг',   19.00, 'USD', 'monthly', current_date + 12, 'active', 3, 'https://app.netlify.com'),
  ('Supabase Pro',       'Хостинг',   25.00, 'USD', 'monthly', current_date + 20, 'active', 3, 'https://supabase.com/dashboard'),
  ('GitHub Copilot',     'Разработка',100.00,'USD', 'yearly',  current_date + 140,'active', 3, 'https://github.com/settings/billing'),
  ('Домен example.com',  'Домены',    12.00, 'USD', 'yearly',  current_date + 75, 'active', 7, null),
  ('Figma Professional', 'Дизайн',    15.00, 'USD', 'monthly', current_date + 6,  'paused', 3, 'https://figma.com');
