-- How the drug can actually be obtained. A regimen is never left out of the catalog because a
-- drug is missing: the drug is marked instead, so regimens can be filtered by what is obtainable.
--   department  — in the department's own procurement list (the lists imported into data/drugs)
--   registered  — registered in Ukraine, obtainable, but not on the department's list
--   unavailable — not registered in Ukraine or otherwise not obtainable

alter table public.drugs
  add column availability text not null default 'registered'
  check (availability in ('department', 'registered', 'unavailable'));
