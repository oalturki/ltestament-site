-- a reader's own real slips in a clip, beyond the task asked of him (as he or the family confirmed): the measure counts
-- them as mistakes found, not as false alarms
alter table public.rec_clips add column if not exists slips text[] not null default '{}';
-- محمد 1 · fatiha-other: after the other speech he went on from «الرحمن الرحيم», «الحمد لله رب العالمين» forgotten
update public.rec_clips c set slips = array['1:2:1','1:2:2','1:2:3','1:2:4']
  from public.family_profiles p where p.id = c.profile_id and p.name = 'محمد 1' and c.task = 'fatiha-other';
update public.rec_evals e set false_alarms = greatest(0, e.false_alarms - 4)
  from public.rec_clips c join public.family_profiles p on p.id = c.profile_id
  where e.clip_id = c.id and p.name = 'محمد 1' and c.task = 'fatiha-other' and e.engine in ('live-2026-11-22i', 'live-2026-11-22j');
