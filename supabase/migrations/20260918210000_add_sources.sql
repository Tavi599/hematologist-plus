-- Where a clinical value comes from. Doses, caps and dilution parameters must be traceable
-- to a named protocol with the date it was checked; this is also the basis for stage 5 calibration.
-- Shape (validated by src/schemas/common.ts): [{ "name": "...", "url": "...", "version": "...",
-- "checkedOn": "YYYY-MM-DD" }]

alter table public.drugs
  add column sources jsonb not null default '[]'
  check (jsonb_typeof(sources) = 'array');

alter table public.drug_infusion_params
  add column sources jsonb not null default '[]'
  check (jsonb_typeof(sources) = 'array');

alter table public.regimens
  add column sources jsonb not null default '[]'
  check (jsonb_typeof(sources) = 'array');
