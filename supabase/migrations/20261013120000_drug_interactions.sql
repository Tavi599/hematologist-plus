-- What a drug's label says of giving it with other drugs of the catalog, each with its source.
-- Shown in the calculator when both are in the course; it changes no dose.
alter table public.drugs
  add column interactions jsonb
    check (interactions is null or jsonb_typeof(interactions) = 'array');

comment on column public.drugs.interactions is
  'Label interactions: [{with: [drug ids], level, notes: {uk, en}, source}], or null.';
