-- Applied to Supabase project "ltestament" (nikwwjswwlwcqekbnpzq) on 2026-11-12.
-- Calls the Edge Function notify-question for every new question.
create extension if not exists pg_net with schema extensions;

alter table public.questions add column if not exists notified_at timestamptz;

create or replace function public.notify_new_question()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://nikwwjswwlwcqekbnpzq.supabase.co/functions/v1/notify-question',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  return new; -- never block a question because of the notification
end;
$$;

revoke all on function public.notify_new_question() from public, anon, authenticated;

drop trigger if exists questions_notify on public.questions;
create trigger questions_notify
after insert on public.questions
for each row execute function public.notify_new_question();
