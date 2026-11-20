-- Khatmas and phone reminders — applied to the ltestament project as migrations "khatmas", "push_reminders", "push_cron".

-- A khatma of a family profile, kept whole as JSON (js/khatma.js); a device without an account keeps its own.
create table public.khatmas (
  id uuid primary key,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 20000),
  updated_at timestamptz not null default now()
);
create index khatmas_profile on public.khatmas(profile_id);
create index khatmas_account on public.khatmas(account_id);
alter table public.khatmas enable row level security;
create policy "own khatmas" on public.khatmas for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));

-- Web Push: the VAPID keys and the cron secret (made by the push function on its first call), and the devices with
-- their reminders. No policies: only the edge function (service role) reads or writes them.
create table public.push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  cron_secret text not null,
  created_at timestamptz not null default now()
);
alter table public.push_keys enable row level security;
create table public.push_subs (
  endpoint text primary key check (char_length(endpoint) < 1000),
  sub jsonb not null check (pg_column_size(sub) < 4000),
  tz text not null default 'Asia/Riyadh' check (char_length(tz) < 64),
  lang text not null default 'ar' check (char_length(lang) < 8),
  reminders jsonb not null default '[]' check (pg_column_size(reminders) < 20000),
  sent jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;

-- every 5 minutes the push function sends the reminders whose time has come
create extension if not exists pg_cron;
select cron.schedule('push-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://nikwwjswwlwcqekbnpzq.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_secret from public.push_keys where id = 1)),
    body := '{"action":"send"}'::jsonb,
    timeout_milliseconds := 30000
  ) where exists (select 1 from public.push_keys where id = 1);
$$);
