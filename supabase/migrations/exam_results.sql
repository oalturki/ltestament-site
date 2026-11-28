-- «اختبار» (js/exam.js): a test's result in the reader's record — its range, each part's share and score, the total,
-- and where he went wrong (to go back to). Own rows only, like recite_sessions.
create table public.exam_results (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope jsonb not null,
  parts jsonb not null,
  score numeric(4,1) not null check (score between 0 and 100),
  seconds int check (seconds between 0 and 86400),
  detail jsonb,
  created_at timestamptz not null default now()
);
create index exam_results_profile on public.exam_results(profile_id, created_at desc);
create index exam_results_account on public.exam_results(account_id);
alter table public.exam_results enable row level security;
create policy "own exams" on public.exam_results for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()) and public.owns_profile(profile_id));
revoke all on public.exam_results from public, anon;
grant select, insert, delete on public.exam_results to authenticated;
