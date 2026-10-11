-- Some antibodies are given at more than two rates. Daratumumab IV (EMA SmPC, table 5): the first
-- infusion, the second, and from the third on a faster start; an undivided first dose goes into
-- 1000 mL, a first dose split over two days is one first infusion. Isatuximab: the third and later
-- infusions run at a fixed rate. The new column carries what the two-rate rate_ramp cannot.
alter table public.drug_infusion_params
  add column ramp_sequence jsonb
  check (ramp_sequence is null or jsonb_typeof(ramp_sequence) = 'object');

comment on column public.drug_infusion_params.ramp_sequence is
  'Beyond rate_ramp: second (rate steps of the second infusion or null), first_bag_ml (dilution of an undivided first dose or null), split_first (consecutive first-week doses are one first infusion).';
