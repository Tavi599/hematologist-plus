-- What to watch while a drug is given (levels, kidneys, blood count, hearing), each line with
-- its source. A reminder in the calculator row; it changes no dose.
alter table public.drugs
  add column monitoring jsonb
    check (monitoring is null or jsonb_typeof(monitoring) = 'array');

comment on column public.drugs.monitoring is
  'What to watch while the drug is given: [{notes: {uk, en}, source}], or null.';
