-- Test-set tasks for mistakes the check might let pass as right (the owner's rule, 27 Nov 2026: calling a wrong word
-- right is worse than calling a right word wrong — a student may memorise the mistake): a word said in place of
-- another (swap), a letter or vowel changed (harf), a short word left out (short).
alter table public.rec_clips drop constraint rec_clips_kind_check;
alter table public.rec_clips add constraint rec_clips_kind_check check (kind = any (array[
  'clean','word','ayah','repeat','restart','other','madd','ghunna','qalqala','swap','harf','short']));
