-- Reading statistics (إحصاءات القراءة) — applied to the ltestament project as migration "reading_log".
-- One row per profile per day: the Mushaf pages read that day (a page counts each time it stayed open
-- long enough to be read). Words and letters are worked out from data/page-stats.json, so only pages are kept.
create table public.reading_log (
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  d date not null,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pages smallint[] not null default '{}' check (cardinality(pages) <= 604),
  updated_at timestamptz not null default now(),
  primary key (profile_id, d)
);
create index reading_log_account on public.reading_log(account_id);
alter table public.reading_log enable row level security;
create policy "own reading" on public.reading_log for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));

-- migration "reading_log_repeats": a page read again the same day counts again, so a day may hold more than 604 pages
alter table public.reading_log drop constraint if exists reading_log_pages_check;
alter table public.reading_log add constraint reading_log_pages_check check (cardinality(pages) <= 3000);
