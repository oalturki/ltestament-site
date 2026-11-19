-- Student record, study plans (المنهج المقرر) — applied to the ltestament project as migration "study_plans".
-- A parent sets one active plan per child profile: the new-memorization range, its order, the daily amount
-- (in verses or in Mushaf lines), the study days and the start date, plus the previously memorized range that
-- feeds the distant review. The browser splits the range into lessons and stores them, so a lesson the parent
-- edits, and each lesson's completion, stay put. Special days (holiday, consolidation, exam) are stored per date.
-- Verse references are 'surah:ayah' strings.

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  active boolean not null default true,
  new_from text not null check (new_from ~ '^[0-9]{1,3}:[0-9]{1,3}$'),
  new_to text not null check (new_to ~ '^[0-9]{1,3}:[0-9]{1,3}$'),
  ord text not null default 'mushaf' check (ord in ('mushaf', 'reverse')),
  unit text not null default 'line' check (unit in ('ayah', 'line')),
  amount numeric(5,1) not null check (amount > 0 and amount <= 300),
  days int not null default 31 check (days between 1 and 127),   -- bit 0 = Sunday … bit 6 = Saturday
  start_date date not null,
  recent_n int not null default 5 check (recent_n between 0 and 30),
  old_from text check (old_from is null or old_from ~ '^[0-9]{1,3}:[0-9]{1,3}$'),
  old_to text check (old_to is null or old_to ~ '^[0-9]{1,3}:[0-9]{1,3}$'),
  old_days int not null default 5 check (old_days between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_plans_account on public.study_plans(account_id);
create unique index study_plans_one_active on public.study_plans(profile_id) where active;

create table public.plan_lessons (
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  idx int not null check (idx between 0 and 2000),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  a_from text not null check (a_from ~ '^[0-9]{1,3}:[0-9]{1,3}$'),
  a_to text not null check (a_to ~ '^[0-9]{1,3}:[0-9]{1,3}$'),
  edited boolean not null default false,
  done_at timestamptz,
  done_how text check (done_how in ('auto', 'manual')),
  mistakes int check (mistakes between 0 and 999),
  primary key (plan_id, idx)
);
create index plan_lessons_account on public.plan_lessons(account_id);

create table public.plan_days (
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  d date not null,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('off', 'fix', 'exam')),
  primary key (plan_id, d)
);
create index plan_days_account on public.plan_days(account_id);

alter table public.study_plans enable row level security;
alter table public.plan_lessons enable row level security;
alter table public.plan_days enable row level security;

create or replace function public.owns_plan(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.study_plans s where s.id = p and s.account_id = (select auth.uid()));
$$;
revoke all on function public.owns_plan(uuid) from public, anon;
grant execute on function public.owns_plan(uuid) to authenticated;

create policy "own plans" on public.study_plans for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));
create policy "own plan lessons" on public.plan_lessons for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_plan(plan_id));
create policy "own plan days" on public.plan_days for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_plan(plan_id));

grant select, insert, update, delete on public.study_plans, public.plan_lessons, public.plan_days to authenticated;

-- Migration "study_plan_files": the school's own plan (PDF or image) kept beside the plan, private to the account.
alter table public.study_plans add column file_path text check (file_path is null or char_length(file_path) <= 200);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-files', 'plan-files', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;
create policy "own plan files read" on storage.objects for select to authenticated
  using (bucket_id = 'plan-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own plan files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'plan-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own plan files update" on storage.objects for update to authenticated
  using (bucket_id = 'plan-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own plan files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'plan-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
