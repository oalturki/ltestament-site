-- Measures of the recitation check on the test set (/record/eval/, admin only): each run of the check over a clip,
-- with what it found against what was asked of the reader. engine names the check measured (so versions compare).
create table public.rec_evals (
  id bigint generated always as identity primary key,
  clip_id uuid not null references public.rec_clips(id) on delete cascade,
  engine text not null check (char_length(engine) <= 60),
  level text not null default 'normal',
  detected boolean,              -- the planned mistake found (null: nothing to find — clean, repeat, restart)
  false_alarms int not null,     -- words marked wrong that the reader said right (outside the planned mistake)
  unreached int not null,        -- words the check never got to
  result jsonb not null,         -- per word: what the check said; notes; timings
  created_at timestamptz not null default now()
);
create index rec_evals_clip on public.rec_evals(clip_id, created_at desc);
alter table public.rec_evals enable row level security;
create policy "admin evals" on public.rec_evals for all to authenticated using (public.is_admin()) with check (public.is_admin());
