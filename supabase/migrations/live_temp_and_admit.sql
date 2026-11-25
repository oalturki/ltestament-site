-- Live circles, two kinds (Othman 2026-11-25):
-- · حلقة مؤقتة (temporary): no class, a new code each time, participants join with a first name only, nothing kept
--   after it ends (live_sessions.kind = 'temp', class_id null, no report).
-- · حلقة دائمة (permanent, a live_classes row): a fixed code of its own (live_classes.code, changed on request), a roster
--   from a list or by self-registration; a self-registered student waits for the teacher's approval
--   (live_students.status = 'pending' → 'ok'); with live_classes.admit = 'approve' a student picking his name from the
--   list also waits the first time (the approval travels over the live channel, the device remembers it).

-- a 6-digit code used by no class and no open session
create or replace function public.live_free_code() returns text
language plpgsql volatile security definer set search_path = public as $$
declare c text; n int := 0;
begin
  loop
    c := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    exit when not exists (select 1 from public.live_classes where code = c)
          and not exists (select 1 from public.live_sessions where code = c and ended_at is null);
    n := n + 1; if n > 50 then raise exception 'no free code'; end if;
  end loop;
  return c;
end $$;
revoke all on function public.live_free_code() from public, anon;
grant execute on function public.live_free_code() to authenticated;

alter table public.live_classes add column if not exists code text;
alter table public.live_classes add column if not exists admit text not null default 'auto';
alter table public.live_classes add constraint live_classes_admit check (admit in ('auto', 'approve'));
alter table public.live_classes add constraint live_classes_code check (code ~ '^[0-9]{6}$');
update public.live_classes set code = public.live_free_code() where code is null;
alter table public.live_classes alter column code set default public.live_free_code();
alter table public.live_classes alter column code set not null;
create unique index if not exists live_classes_code_u on public.live_classes(code);

alter table public.live_students add column if not exists status text not null default 'ok';
alter table public.live_students add constraint live_students_status check (status in ('ok', 'pending'));

alter table public.live_sessions add column if not exists kind text not null default 'perm';
alter table public.live_sessions add constraint live_sessions_kind check (kind in ('perm', 'temp'));

-- joining by code: temporary (no roster) or permanent (the approved roster, and how students are admitted)
create or replace function public.live_join_info(p_code text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'session', s.id, 'title', coalesce(s.title, c.name), 'class', c.id, 'temp', s.kind = 'temp', 'admit', coalesce(c.admit, 'auto'),
    'roster', case when s.kind = 'temp' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id', st.id,
        'name', concat_ws(' ', st.first, st.second, st.third, st.family), 'sid', st.sid) order by st.first, st.family)
      from public.live_students st where st.class_id = c.id and st.status = 'ok'), '[]'::jsonb) end)
  from public.live_sessions s left join public.live_classes c on c.id = s.class_id
  where s.code = p_code and s.ended_at is null and s.started_at > now() - interval '12 hours'
  limit 1;
$$;

-- self-registration in a permanent circle: the student waits for the teacher (status 'pending'); an existing match
-- (same ID, or same names) is returned as it is
create or replace function public.live_register(p_code text, p_first text, p_second text, p_third text, p_family text, p_sid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cid uuid; nid uuid; n int; st text;
begin
  select s.class_id into cid from public.live_sessions s
   where s.code = p_code and s.ended_at is null and s.started_at > now() - interval '12 hours' and s.kind = 'perm' limit 1;
  if cid is null then raise exception 'no open session for this code'; end if;
  select count(*) into n from public.live_students where class_id = cid;
  if n >= 200 then raise exception 'class full'; end if;
  if char_length(trim(coalesce(p_first,''))) = 0 or char_length(trim(coalesce(p_family,''))) = 0 then raise exception 'first and family names required'; end if;
  select id, status into nid, st from public.live_students where class_id = cid
    and ((nullif(trim(p_sid),'') is not null and sid = trim(p_sid))
      or (first = trim(p_first) and coalesce(second,'') = coalesce(trim(p_second),'') and coalesce(third,'') = coalesce(trim(p_third),'') and coalesce(family,'') = coalesce(trim(p_family),'')))
    limit 1;
  if nid is null then
    insert into public.live_students(class_id, first, second, third, family, sid, self_added, status)
    values (cid, trim(p_first), nullif(trim(p_second),''), nullif(trim(p_third),''), trim(p_family), nullif(trim(p_sid),''), true, 'pending')
    returning id, status into nid, st;
  end if;
  return jsonb_build_object('id', nid, 'status', st,
    'name', concat_ws(' ', trim(p_first), nullif(trim(p_second),''), nullif(trim(p_third),''), nullif(trim(p_family),'')));
end $$;
revoke all on function public.live_join_info(text) from public;
revoke all on function public.live_register(text, text, text, text, text, text) from public;
grant execute on function public.live_join_info(text) to anon, authenticated;
grant execute on function public.live_register(text, text, text, text, text, text) to anon, authenticated;
