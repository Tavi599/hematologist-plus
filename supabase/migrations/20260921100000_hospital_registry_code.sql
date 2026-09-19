-- The stamp at the top of every blank carries the institution, its address and its registry
-- code (ЄДРПОУ). The first two already had columns; the code did not.
alter table public.hospitals
  add column registry_code text;

comment on column public.hospitals.registry_code is
  'Код за ЄДРПОУ as printed in the header of the department''s blanks.';
