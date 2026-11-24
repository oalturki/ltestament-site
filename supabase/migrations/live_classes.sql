-- Live circles (الحلقة المباشرة): a teacher's saved classes, their students, and the sessions opened from them.
create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'halaqa' check (kind in ('halaqa','class','section')),
  level text check (char_length(level) <= 60),
  created_at timestamptz not null default now()
);
create table if not exists public.live_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.live_classes(id) on delete cascade,
  first text not null check (char_length(first) between 1 and 40),
  second text check (char_length(second) <= 40),
  third text check (char_length(third) <= 40),
  family text check (char_length(family) <= 40),
  sid text check (char_length(sid) <= 30),
  self_added boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists live_students_class on public.live_students(class_id);
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_id uuid references public.live_classes(id) on delete set null,
  code text not null check (code ~ '^[0-9]{6}$'),
  title text check (char_length(title) <= 80),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  report jsonb check (pg_column_size(report) < 200000)
);
create unique index if not exists live_sessions_open_code on public.live_sessions(code) where ended_at is null;

alter table public.live_classes enable row level security;
alter table public.live_students enable row level security;
alter table public.live_sessions enable row level security;
create policy "own classes" on public.live_classes for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own class students" on public.live_students for all to authenticated
  using (exists (select 1 from public.live_classes c where c.id = class_id and c.owner = auth.uid()))
  with check (exists (select 1 from public.live_classes c where c.id = class_id and c.owner = auth.uid()));
create policy "own sessions" on public.live_sessions for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- a student (no account) joining by code: the open session, its class name and roster (names only)
create or replace function public.live_join_info(p_code text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'session', s.id, 'title', coalesce(s.title, c.name), 'class', c.id,
    'roster', coalesce((select jsonb_agg(jsonb_build_object('id', st.id,
        'name', concat_ws(' ', st.first, st.second, st.third, st.family), 'sid', st.sid) order by st.first, st.family)
      from public.live_students st where st.class_id = c.id), '[]'::jsonb))
  from public.live_sessions s left join public.live_classes c on c.id = s.class_id
  where s.code = p_code and s.ended_at is null and s.started_at > now() - interval '12 hours'
  limit 1;
$$;
-- a student registering himself in the session's class (the first time)
create or replace function public.live_register(p_code text, p_first text, p_second text, p_third text, p_family text, p_sid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cid uuid; nid uuid; n int;
begin
  select s.class_id into cid from public.live_sessions s
   where s.code = p_code and s.ended_at is null and s.started_at > now() - interval '12 hours' limit 1;
  if cid is null then raise exception 'no open session for this code'; end if;
  select count(*) into n from public.live_students where class_id = cid;
  if n >= 200 then raise exception 'class full'; end if;
  if char_length(trim(coalesce(p_first,''))) = 0 then raise exception 'first name required'; end if;
  select id into nid from public.live_students where class_id = cid
    and ((nullif(trim(p_sid),'') is not null and sid = trim(p_sid))
      or (first = trim(p_first) and coalesce(second,'') = coalesce(trim(p_second),'') and coalesce(third,'') = coalesce(trim(p_third),'') and coalesce(family,'') = coalesce(trim(p_family),'')))
    limit 1;
  if nid is null then
    insert into public.live_students(class_id, first, second, third, family, sid, self_added)
    values (cid, trim(p_first), nullif(trim(p_second),''), nullif(trim(p_third),''), nullif(trim(p_family),''), nullif(trim(p_sid),''), true)
    returning id into nid;
  end if;
  return jsonb_build_object('id', nid, 'name', concat_ws(' ', trim(p_first), nullif(trim(p_second),''), nullif(trim(p_third),''), nullif(trim(p_family),'')));
end $$;
revoke all on function public.live_join_info(text) from public;
revoke all on function public.live_register(text, text, text, text, text, text) from public;
grant execute on function public.live_join_info(text) to anon, authenticated;
grant execute on function public.live_register(text, text, text, text, text, text) to anon, authenticated;
