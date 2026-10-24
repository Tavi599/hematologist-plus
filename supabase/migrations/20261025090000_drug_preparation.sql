-- How the label says to prepare a drug for each route: reconstitution of a powder, dilution,
-- how long the solution keeps, light and filters, each line with its source. Shown on the
-- preparation tab of the calculator; it changes no dose and no volume.
alter table public.drugs
  add column preparation jsonb
    check (preparation is null or jsonb_typeof(preparation) = 'array');

comment on column public.drugs.preparation is
  'How to prepare the drug: [{routes: [route], notes: {uk, en}, source}], or null.';
