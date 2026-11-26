-- The measuring page (/record/eval/, admin) shows who recorded each clip: the profile's name or the invite's label.
-- Admins read all clips but not other accounts' family profiles (and must not: the account page lists profiles
-- with a plain select), so the names come through this function, for the readers of clips only.
create or replace function public.rec_reader_names()
returns table (clip_id uuid, reader text)
language sql stable security definer set search_path = public as $$
  select c.id, coalesce(p.name, 'دعوة: ' || i.label)
  from public.rec_clips c
  left join public.family_profiles p on p.id = c.profile_id
  left join public.rec_invites i on i.id = c.invite_id
  where public.is_admin();
$$;
revoke execute on function public.rec_reader_names() from public;
revoke execute on function public.rec_reader_names() from anon;
grant execute on function public.rec_reader_names() to authenticated;
