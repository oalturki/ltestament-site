-- Applied to Supabase project "ltestament" on 2026-11-12.
-- Site-wide settings edited from the admin panel tab «إعدادات الموقع», read by /js/site.js.
create table if not exists public.site_settings (
  key text primary key check (key in ('social','dev_banner')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_settings enable row level security;
create policy site_settings_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_update on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.site_settings to anon, authenticated;
grant update (value, updated_at, updated_by) on public.site_settings to authenticated;

create or replace function public.site_settings_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end; $$;
create trigger site_settings_touch before update on public.site_settings
for each row execute function public.site_settings_touch();

insert into public.site_settings (key, value) values
  ('social', '{"x":{"url":"https://x.com/ltestament4u","show":false}}'::jsonb),
  ('dev_banner', '{"show":true}'::jsonb)
on conflict (key) do nothing;
