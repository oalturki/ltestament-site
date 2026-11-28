-- A profile's own Mushaf data that is not a khatma (reminders, bookmarks), one row per kind, kept whole as JSON
-- (js/sync.js). The account is the person; the profiles are him and the children he adds.
create table public.profile_data (
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  key text not null check (key in ('reminders', 'marks')),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 20000),
  updated_at timestamptz not null default now(),
  primary key (profile_id, key)
);
create index profile_data_account on public.profile_data(account_id);
alter table public.profile_data enable row level security;
create policy "own profile data" on public.profile_data for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));

-- A code for each profile (applied as migration "profile_pin"): asked before the profile is opened on a shared device.
alter table public.family_profiles add column pin_hash text check (pin_hash is null or char_length(pin_hash) = 64);

-- The reader's own plans (js/plans.js) kept the same way (migration "profile_data_plans").
alter table public.profile_data drop constraint profile_data_key_check;
alter table public.profile_data add constraint profile_data_key_check check (key in ('reminders', 'marks', 'plans'));
alter table public.profile_data drop constraint profile_data_data_check;
alter table public.profile_data add constraint profile_data_data_check check (pg_column_size(data) < 60000);

-- The study plans (المنهج المقرر) moved into the plans above (2026-11-22): each active study plan became a plan in
-- its profile's profile_data row ('plans'), its holidays as days off; the study plans were set inactive (kept).

-- «مصاحفي» (js/mushafs.js): the reader's own Mushafs, kept the same way (migration "profile_data_mushafs", Nov 28 2026).
alter table public.profile_data drop constraint profile_data_key_check;
alter table public.profile_data add constraint profile_data_key_check check (key in ('reminders', 'marks', 'plans', 'mushafs'));
