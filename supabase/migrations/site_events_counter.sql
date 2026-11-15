-- Applied 2026-11-15. Anonymous, aggregated interaction counters (no IP, no identity).
-- Written by js/site.js via rpc track_event; read by the admin «الإحصاءات» tab via rpc site_stats.
-- See the live definitions in Supabase; this file mirrors migration "site_events_counter".
create table if not exists public.site_events_daily (
  day date not null default (now() at time zone 'utc')::date,
  event text not null,
  lang text not null,
  detail text not null default '',
  n integer not null default 0,
  primary key (day, event, lang, detail)
);
alter table public.site_events_daily enable row level security;

create or replace function public.track_event(p_event text, p_lang text, p_detail text default '')
returns void language plpgsql security definer set search_path = public as $$
declare d text := coalesce(p_detail, '');
begin
  if p_event not in ('session','view','reader_open','surah','modal','ask_open','ask_submit','feedback_open','feedback_submit','lang_switch','social_click')
     or p_lang not in ('ar','en','ur','fr','es','ru')
     or d !~ '^[a-z0-9_-]{0,40}$' then
    return;
  end if;
  insert into public.site_events_daily as s (day, event, lang, detail, n)
  values ((now() at time zone 'utc')::date, p_event, p_lang, d, 1)
  on conflict (day, event, lang, detail) do update set n = s.n + 1;
end; $$;
revoke all on function public.track_event(text, text, text) from public;
grant execute on function public.track_event(text, text, text) to anon, authenticated;

-- site_stats(p_days) returns jsonb {since, totals, by_lang, details, daily}; admin only.
-- (full body in Supabase migration "site_events_counter")
