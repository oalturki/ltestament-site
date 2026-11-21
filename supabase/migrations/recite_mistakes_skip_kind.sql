-- a verse (or part of one) passed over while reciting is kept as its own kind of mistake: one row per word, kind 'skip'
alter table public.recite_mistakes drop constraint recite_mistakes_kind_check;
alter table public.recite_mistakes add constraint recite_mistakes_kind_check check (kind in ('wrong', 'missing', 'skip'));
