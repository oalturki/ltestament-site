-- Reading statistics, by source — applied to the ltestament project as migration "reading_stats".
-- One row per profile, day and source (read: Mushaf pages open 20 s; listen: ayahs heard; recite: words recited
-- right, and ayahs repeated in talqeen), with the pages (a share of a page for heard or recited text), words and
-- letters. The page adds to it with add_reading (one call per few seconds of reading). Replaces reading_log.
create table public.reading_stats (
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  d date not null,
  kind text not null check (kind in ('read', 'listen', 'recite')),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pages numeric(8,2) not null default 0 check (pages >= 0),
  words int not null default 0 check (words >= 0),
  letters int not null default 0 check (letters >= 0),
  updated_at timestamptz not null default now(),
  primary key (profile_id, d, kind)
);
create index reading_stats_account on public.reading_stats(account_id);
alter table public.reading_stats enable row level security;
create policy "own reading stats" on public.reading_stats for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));

-- add to the day's row (row level security applies: the caller's own profiles only); each call is capped
create or replace function public.add_reading(p_profile uuid, p_d date, p_kind text, p_pages numeric, p_words int, p_letters int)
returns void language sql security invoker set search_path = '' as $$
  insert into public.reading_stats as r (profile_id, d, kind, pages, words, letters)
  values (p_profile, p_d, p_kind, greatest(0, least(p_pages, 100)), greatest(0, least(p_words, 20000)), greatest(0, least(p_letters, 100000)))
  on conflict (profile_id, d, kind) do update
    set pages = r.pages + excluded.pages, words = r.words + excluded.words, letters = r.letters + excluded.letters, updated_at = now();
$$;
revoke all on function public.add_reading(uuid, date, text, numeric, int, int) from public, anon;
grant execute on function public.add_reading(uuid, date, text, numeric, int, int) to authenticated;

-- migration "drop_reading_log": the first version (pages only, table reading_log) removed after its one day of
-- rows (2026-11-20, 3 pages) was carried into reading_stats as 'read'.
-- drop table public.reading_log;
