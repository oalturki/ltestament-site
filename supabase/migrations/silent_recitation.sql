-- silent recitation: the words appear at the reciter's pace with no sound, the reader recites in himself and marks the
-- words he missed. Its sessions are kind 'silent' and its marked words kind 'self' (a self-assessment, kept apart from the
-- mistakes the listening model found). record_recital takes the session kind (default 'recite', as before).
alter table public.recite_sessions drop constraint recite_sessions_kind_check;
alter table public.recite_sessions add constraint recite_sessions_kind_check check (kind in ('recite', 'hifz', 'talqeen', 'listen', 'silent'));
alter table public.recite_mistakes drop constraint recite_mistakes_kind_check;
alter table public.recite_mistakes add constraint recite_mistakes_kind_check check (kind in ('wrong', 'missing', 'skip', 'self'));
drop function public.record_recital(uuid, int, int, int, int, int, boolean, text[], text[]);
create or replace function public.record_recital(
  p_profile uuid, p_page int, p_words int, p_total int, p_mistakes int, p_seconds int,
  p_complete boolean, p_locs text[] default '{}', p_kinds text[] default '{}', p_kind text default 'recite')
returns public.page_state
language plpgsql security invoker set search_path = '' as $$
declare
  lim int; ps public.page_state; days int[] := array[1, 3, 7, 14, 30]; ok boolean; st int;
begin
  select mastery_max into lim from public.family_profiles where id = p_profile and account_id = (select auth.uid());
  if lim is null then raise exception 'no such profile' using errcode = 'P0002'; end if;
  if p_kind not in ('recite', 'silent') then raise exception 'bad kind' using errcode = '22023'; end if;
  insert into public.recite_sessions(profile_id, kind, page, words, words_total, mistakes, complete, seconds)
    values (p_profile, p_kind, p_page, p_words, p_total, p_mistakes, coalesce(p_complete, false), p_seconds);
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
revoke all on function public.record_recital(uuid, int, int, int, int, int, boolean, text[], text[], text) from public, anon;
grant execute on function public.record_recital(uuid, int, int, int, int, int, boolean, text[], text[], text) to authenticated;
