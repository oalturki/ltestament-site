-- Student record (سجل الطالب), phase 1 — applied to the ltestament project as migration "student_record_phase1".
-- One family account (auth.users), profiles under it (the parent's own and the children's), what each profile
-- recited or practised, the state of each Mushaf page for each profile, and the words a profile got wrong.
-- Every row carries its account; row level security keeps each account to its own rows.

create table public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  avatar text not null default 'star' check (char_length(avatar) <= 20),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  is_parent boolean not null default false,
  mastery_max int not null default 2 check (mastery_max between 0 and 20),
  last_page int check (last_page between 1 and 604),
  created_at timestamptz not null default now()
);
create index family_profiles_account on public.family_profiles(account_id);

create table public.recite_sessions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('recite', 'hifz', 'talqeen', 'listen')),
  page int check (page between 1 and 604),
  surah int check (surah between 1 and 114),
  ayah_from int, ayah_to int,
  words int, words_total int, mistakes int,
  complete boolean not null default false,
  seconds int check (seconds between 0 and 86400),
  created_at timestamptz not null default now()
);
create index recite_sessions_profile on public.recite_sessions(profile_id, created_at desc);
create index recite_sessions_account on public.recite_sessions(account_id);

create table public.page_state (
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  page int not null check (page between 1 and 604),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  state text not null check (state in ('learning', 'mastered')),
  stage int not null default 0 check (stage between 0 and 4),
  due date,
  last_recited timestamptz,
  last_mistakes int,
  updated_at timestamptz not null default now(),
  primary key (profile_id, page)
);
create index page_state_account on public.page_state(account_id);
create index page_state_due on public.page_state(profile_id, due);

create table public.recite_mistakes (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loc text not null check (loc ~ '^[0-9]{1,3}:[0-9]{1,3}:[0-9]{1,3}$'),
  kind text not null check (kind in ('wrong', 'missing')),
  created_at timestamptz not null default now()
);
create index recite_mistakes_profile on public.recite_mistakes(profile_id, created_at desc);
create index recite_mistakes_account on public.recite_mistakes(account_id);

alter table public.family_profiles enable row level security;
alter table public.recite_sessions enable row level security;
alter table public.page_state enable row level security;
alter table public.recite_mistakes enable row level security;

create policy "own profiles" on public.family_profiles for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

create or replace function public.owns_profile(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_profiles f where f.id = p and f.account_id = (select auth.uid()));
$$;
revoke all on function public.owns_profile(uuid) from public, anon;
grant execute on function public.owns_profile(uuid) to authenticated;

create policy "own sessions" on public.recite_sessions for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));
create policy "own page state" on public.page_state for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));
create policy "own mistakes" on public.recite_mistakes for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));

-- at most 10 profiles in an account
create or replace function public.family_profiles_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.family_profiles where account_id = new.account_id) >= 10 then
    raise exception 'profile limit reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger family_profiles_limit before insert on public.family_profiles
  for each row execute function public.family_profiles_limit();
revoke all on function public.family_profiles_limit() from public, anon, authenticated;

-- a page recited: the session, its mistakes, and the page's state with spaced review.
-- Mastered = recited whole with no more mistakes than the profile's limit. Review intervals: 1, 3, 7, 14, 30 days,
-- then every 30. A review not mastered goes back to the first interval (the page stays memorized).
create or replace function public.record_recital(
  p_profile uuid, p_page int, p_words int, p_total int, p_mistakes int, p_seconds int,
  p_complete boolean, p_locs text[] default '{}', p_kinds text[] default '{}')
returns public.page_state
language plpgsql security invoker set search_path = '' as $$
declare
  lim int; ps public.page_state; days int[] := array[1, 3, 7, 14, 30]; ok boolean; st int;
begin
  select mastery_max into lim from public.family_profiles where id = p_profile and account_id = (select auth.uid());
  if lim is null then raise exception 'no such profile' using errcode = 'P0002'; end if;
  insert into public.recite_sessions(profile_id, kind, page, words, words_total, mistakes, complete, seconds)
    values (p_profile, 'recite', p_page, p_words, p_total, p_mistakes, coalesce(p_complete, false), p_seconds);
  if coalesce(array_length(p_locs, 1), 0) > 0 then
    insert into public.recite_mistakes(profile_id, loc, kind)
      select p_profile, l, coalesce(p_kinds[i], 'wrong') from unnest(p_locs) with ordinality as t(l, i) limit 200;
  end if;
  select * into ps from public.page_state where profile_id = p_profile and page = p_page;
  ok := coalesce(p_complete, false) and p_mistakes <= lim;
  if ok then
    st := case when ps.state = 'mastered' then least(ps.stage + 1, 4) else 0 end;
    insert into public.page_state(profile_id, page, state, stage, due, last_recited, last_mistakes, updated_at)
      values (p_profile, p_page, 'mastered', st, current_date + days[st + 1], now(), p_mistakes, now())
      on conflict (profile_id, page) do update set state = 'mastered', stage = excluded.stage, due = excluded.due,
        last_recited = now(), last_mistakes = excluded.last_mistakes, updated_at = now();
  elsif ps.state = 'mastered' and coalesce(p_complete, false) then
    update public.page_state set stage = 0, due = current_date + 1, last_recited = now(), last_mistakes = p_mistakes,
      updated_at = now() where profile_id = p_profile and page = p_page;
  elsif ps.state is null then
    insert into public.page_state(profile_id, page, state, last_recited, last_mistakes)
      values (p_profile, p_page, 'learning', now(), p_mistakes);
  else
    update public.page_state set last_recited = now(), last_mistakes = p_mistakes, updated_at = now()
      where profile_id = p_profile and page = p_page;
  end if;
  update public.family_profiles set last_page = p_page where id = p_profile;
  select * into ps from public.page_state where profile_id = p_profile and page = p_page;
  return ps;
end $$;
revoke all on function public.record_recital(uuid, int, int, int, int, int, boolean, text[], text[]) from public, anon;
grant execute on function public.record_recital(uuid, int, int, int, int, int, boolean, text[], text[]) to authenticated;

-- practice (memorization by repetition, talqeen): the session, and its pages marked "learning" if not yet started
create or replace function public.record_practice(
  p_profile uuid, p_kind text, p_surah int, p_from int, p_to int, p_pages int[], p_seconds int)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.owns_profile(p_profile) then raise exception 'no such profile' using errcode = 'P0002'; end if;
  insert into public.recite_sessions(profile_id, kind, page, surah, ayah_from, ayah_to, seconds, complete)
    values (p_profile, p_kind, p_pages[1], p_surah, p_from, p_to, p_seconds, true);
  insert into public.page_state(profile_id, page, state)
    select p_profile, pg, 'learning' from unnest(p_pages) pg where pg between 1 and 604
    on conflict (profile_id, page) do nothing;
end $$;
revoke all on function public.record_practice(uuid, text, int, int, int, int[], int) from public, anon;
grant execute on function public.record_practice(uuid, text, int, int, int, int[], int) to authenticated;
