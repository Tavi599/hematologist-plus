-- A dose option answers "by which protocol?" and admits one answer. But a dose also changes for
-- circumstances that hold or do not hold for this patient, several at a time: an azole antifungal
-- that blocks CYP3A, an organ that clears the drug poorly, an age. Venetoclax is the plain case —
-- 400 mg a day, 100 mg beside a strong CYP3A inhibitor, 200 mg beside a moderate one — and the
-- protocol that prescribes the antifungal itself writes the already reduced dose, which is how a
-- reader mistakes it for the full one.
--
-- So an item carries a list of modifiers the physician ticks. Each states the whole dose in the
-- unit the item already uses, never a percentage: the arithmetic belongs to the document that is
-- cited, not to us. When several are ticked the lowest dose applies.
alter table public.regimen_items
  add column dose_modifiers jsonb not null default '[]'::jsonb;

comment on column public.regimen_items.dose_modifiers is
  'Circumstances that change this dose, each with the whole dose it leads to and its source. Several may hold at once; the lowest dose applies. default_on marks one the protocol itself assumes.';
