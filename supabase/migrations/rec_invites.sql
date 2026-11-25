-- Recording invites (رابط دعوة للتسجيل): a reader from outside the family (a halaqa student) records the test set on
-- his own phone with no account. The account holder creates an invite on /record/ and sends its link (/record/?i=<token>);
-- the reader's guardian (or the reader, if adult) gives the consent on that page. The recordings belong to the inviting
-- account (account_id) with invite_id set and no profile; audio at recitations/inv/<token>/<clip id>.wav.
-- Everything the guest does goes through SECURITY DEFINER functions that check the token; the storage policies for the
-- "inv/" folder do the same through rec_invite_ok / rec_invite_exists.

create table public.rec_invites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default replace(replace(rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='), '+', '-'), '/', '_'),
  label text not null check (char_length(btrim(label)) between 1 and 40),     -- the holder's own name for it (not the reader's name)
  expires_at timestamptz not null default now() + interval '30 days',
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index rec_invites_account on public.rec_invites(account_id);
alter table public.rec_invites enable row level security;
create policy "own invites read" on public.rec_invites for select to authenticated using (account_id = (select auth.uid()) or public.is_admin());
create policy "own invites write" on public.rec_invites for insert to authenticated with check (account_id = (select auth.uid()));
create policy "own invites update" on public.rec_invites for update to authenticated using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));
create policy "own invites delete" on public.rec_invites for delete to authenticated using (account_id = (select auth.uid()));
grant select, insert, update, delete on public.rec_invites to authenticated;

-- a consent and its clips belong to a family profile or to an invite: exactly one
alter table public.rec_consents alter column profile_id drop not null;
alter table public.rec_consents add column invite_id uuid references public.rec_invites(id) on delete cascade;
alter table public.rec_consents add constraint rec_consents_one_owner check ((profile_id is null) <> (invite_id is null));
alter table public.rec_consents add constraint rec_consents_invite_once unique (invite_id, text_version);
alter table public.rec_clips alter column profile_id drop not null;
alter table public.rec_clips add column invite_id uuid references public.rec_invites(id) on delete cascade;
alter table public.rec_clips add constraint rec_clips_one_owner check ((profile_id is null) <> (invite_id is null));
create index rec_clips_invite on public.rec_clips(invite_id, task);
-- the family insert policies keep requiring a profile (an invite row comes only through the functions below)
drop policy "own consents write" on public.rec_consents;
create policy "own consents write" on public.rec_consents for insert to authenticated
  with check (account_id = (select auth.uid()) and invite_id is null
    and exists (select 1 from public.family_profiles p where p.id = profile_id and p.account_id = (select auth.uid())));
drop policy "own clips write" on public.rec_clips;
create policy "own clips write" on public.rec_clips for insert to authenticated
  with check (account_id = (select auth.uid()) and invite_id is null
    and exists (select 1 from public.rec_consents c where c.id = consent_id and c.account_id = (select auth.uid()) and c.profile_id = rec_clips.profile_id));

-- the token is usable: not revoked, not expired
create or replace function public.rec_invite_ok(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rec_invites where token = p_token and not revoked and expires_at > now());
$$;
-- the token exists (a guest may still withdraw after it expired)
create or replace function public.rec_invite_exists(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rec_invites where token = p_token);
$$;

-- what the guest page needs: is it usable, its label, the consent if given, and what was recorded
create or replace function public.rec_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.rec_invites; c public.rec_consents;
begin
  select * into i from public.rec_invites where token = p_token;
  if not found then return jsonb_build_object('state', 'none'); end if;
  select * into c from public.rec_consents where invite_id = i.id order by agreed_at desc limit 1;
  return jsonb_build_object(
    'state', case when i.revoked then 'revoked' when i.expires_at <= now() then 'expired' else 'ok' end,
    'label', i.label, 'expires_at', i.expires_at,
    'consent', case when c.id is null then null else jsonb_build_object('id', c.id, 'age_band', c.age_band, 'text_version', c.text_version) end,
    'clips', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'task', x.task, 'path', x.path)) from public.rec_clips x where x.invite_id = i.id), '[]'::jsonb));
end $$;

create or replace function public.rec_invite_consent(p_token text, p_age text, p_sex text, p_level text, p_guardian text, p_version text) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare i public.rec_invites; v uuid;
begin
  select * into i from public.rec_invites where token = p_token and not revoked and expires_at > now();
  if not found then raise exception 'رابط الدعوة غير صالح أو انتهت مدته.'; end if;
  insert into public.rec_consents (account_id, profile_id, invite_id, age_band, sex, level, guardian_name, text_version)
  values (i.account_id, null, i.id, p_age, p_sex, p_level, case when p_age = 'adult' then null else nullif(btrim(p_guardian), '') end, p_version)
  on conflict (invite_id, text_version) do update set age_band = excluded.age_band, sex = excluded.sex, level = excluded.level,
    guardian_name = excluded.guardian_name, agreed_at = now()
  returning id into v;
  return v;
end $$;

create or replace function public.rec_invite_clip(p_token text, p_id uuid, p_task text, p_surah int, p_ayah int, p_ayah_to int, p_kind text,
  p_target text, p_asked boolean, p_note text, p_seconds numeric, p_device text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare i public.rec_invites; c uuid; pth text;
begin
  select * into i from public.rec_invites where token = p_token and not revoked and expires_at > now();
  if not found then raise exception 'رابط الدعوة غير صالح أو انتهت مدته.'; end if;
  select id into c from public.rec_consents where invite_id = i.id order by agreed_at desc limit 1;
  if c is null then raise exception 'لم تُعطَ الموافقة بعد.'; end if;
  pth := 'inv/' || p_token || '/' || p_id || '.wav';
  if not exists (select 1 from storage.objects where bucket_id = 'recitations' and name = pth) then raise exception 'لم يُرفع التسجيل.'; end if;
  insert into public.rec_clips (id, account_id, profile_id, invite_id, consent_id, task, surah, ayah, ayah_to, kind, target, done_as_asked, note, seconds, device, path)
  values (p_id, i.account_id, null, i.id, c, p_task, p_surah, p_ayah, p_ayah_to, p_kind, p_target, p_asked, nullif(btrim(p_note), ''), p_seconds, left(p_device, 200), pth);
end $$;

-- the guest withdraws: rows go (the page removes the files first)
create or replace function public.rec_invite_withdraw(p_token text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare i public.rec_invites;
begin
  select * into i from public.rec_invites where token = p_token;
  if not found then return; end if;
  delete from public.rec_consents where invite_id = i.id;   -- clips cascade
end $$;

revoke execute on function public.rec_invite_ok(text), public.rec_invite_exists(text),
  public.rec_invite_info(text), public.rec_invite_consent(text, text, text, text, text, text),
  public.rec_invite_clip(text, uuid, text, int, int, int, text, text, boolean, text, numeric, text), public.rec_invite_withdraw(text) from public;
grant execute on function public.rec_invite_ok(text), public.rec_invite_exists(text), public.rec_invite_info(text),
  public.rec_invite_consent(text, text, text, text, text, text),
  public.rec_invite_clip(text, uuid, text, int, int, int, text, text, boolean, text, numeric, text), public.rec_invite_withdraw(text) to anon, authenticated;

-- storage: under inv/<token>/ only: the guest writes while the token is usable; whoever holds the token (the guest, the
-- inviter's page) may read and remove there, so a withdrawal or a deleted invite takes its files
create policy "invite recitations write" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'recitations' and (storage.foldername(name))[1] = 'inv' and public.rec_invite_ok((storage.foldername(name))[2]));
create policy "invite recitations delete" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'recitations' and (storage.foldername(name))[1] = 'inv'
    and public.rec_invite_exists((storage.foldername(name))[2]));
-- removing a file needs reading it too (the storage API checks both)
create policy "invite recitations read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'recitations' and (storage.foldername(name))[1] = 'inv'
    and public.rec_invite_exists((storage.foldername(name))[2]));
