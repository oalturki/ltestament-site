-- Recitation test set (مجموعة الاختبار), step 1 of «منهجية نظام التسميع الذكي».
-- Recordings made on /record/ by the profiles of a family account, each under a consent the account holder gave for
-- that profile (for a child, the guardian's consent). Used only to test and improve the recitation check; never published.
-- Audio: private bucket "recitations", path <account id>/<profile id>/<clip id>.wav (16 kHz mono WAV).
-- Each account sees and deletes only its own; the admin (public.is_admin()) reads all. Withdrawing a consent deletes
-- its recordings (the page removes the files, then the rows).

create table public.rec_consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  age_band text not null check (age_band in ('child', 'teen', 'adult')),   -- under 13, 13–17, 18+
  sex text not null check (sex in ('m', 'f')),
  level text not null check (level in ('beginner', 'middle', 'hafiz')),
  guardian_name text check (guardian_name is null or char_length(btrim(guardian_name)) between 2 and 60),
  text_version text not null,                                              -- the consent text agreed to (RECORD.CONSENT_V)
  agreed_at timestamptz not null default now(),
  unique (profile_id, text_version)
);
create index rec_consents_account on public.rec_consents(account_id);

create table public.rec_clips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  consent_id uuid not null references public.rec_consents(id) on delete cascade,
  task text not null check (char_length(task) <= 40),                      -- task id in data/testset/tasks.json
  surah int not null check (surah between 1 and 114),
  ayah int not null, ayah_to int not null,
  kind text not null check (kind in ('clean', 'word', 'ayah', 'repeat', 'restart', 'other', 'madd', 'ghunna', 'qalqala')),
  target text check (target is null or target ~ '^[0-9]{1,3}:[0-9]{1,3}(:[0-9]{1,3})?$'),   -- the word or verse of the planned error
  done_as_asked boolean,                                                   -- the reader's own answer after recording
  note text check (note is null or char_length(note) <= 300),
  seconds numeric(6,1) check (seconds between 0 and 600),
  device text check (device is null or char_length(device) <= 200),
  path text not null,
  created_at timestamptz not null default now()
);
create index rec_clips_account on public.rec_clips(account_id);
create index rec_clips_profile on public.rec_clips(profile_id, task);
create index rec_clips_consent on public.rec_clips(consent_id);

alter table public.rec_consents enable row level security;
alter table public.rec_clips enable row level security;

create policy "own or admin consents read" on public.rec_consents for select to authenticated
  using (account_id = (select auth.uid()) or public.is_admin());
create policy "own consents write" on public.rec_consents for insert to authenticated
  with check (account_id = (select auth.uid())
    and exists (select 1 from public.family_profiles p where p.id = profile_id and p.account_id = (select auth.uid())));
create policy "own consents delete" on public.rec_consents for delete to authenticated
  using (account_id = (select auth.uid()));

create policy "own or admin clips read" on public.rec_clips for select to authenticated
  using (account_id = (select auth.uid()) or public.is_admin());
create policy "own clips write" on public.rec_clips for insert to authenticated
  with check (account_id = (select auth.uid())
    and exists (select 1 from public.rec_consents c where c.id = consent_id and c.account_id = (select auth.uid()) and c.profile_id = rec_clips.profile_id));
create policy "own clips delete" on public.rec_clips for delete to authenticated
  using (account_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recitations', 'recitations', false, 20971520, array['audio/wav'])
on conflict (id) do nothing;

create policy "own or admin recitations read" on storage.objects for select to authenticated
  using (bucket_id = 'recitations' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "own recitations write" on storage.objects for insert to authenticated
  with check (bucket_id = 'recitations' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own recitations delete" on storage.objects for delete to authenticated
  using (bucket_id = 'recitations' and (storage.foldername(name))[1] = (select auth.uid())::text);
