-- Doses and pack strengths are not always in milligrams: bleomycin and interferon are
-- measured in international units, filgrastim in micrograms. A column named *_mg holding
-- 15000 IU is a dosing error waiting to happen, so the amount columns are renamed and the
-- unit is stated per drug (the unit the drug is officially prescribed and packaged in).

-- Which units this drug is measured in. `amount_unit` is what its pack strengths and caps
-- are expressed in; `dose_units` lists the dose units the drug is officially prescribed in
-- (empty = unrestricted). Both are checked against each other by scripts/validate-data.ts.
alter table public.drugs
  add column amount_unit text not null default 'mg' check (amount_unit in ('mg', 'mcg', 'iu', 'miu'));
alter table public.drugs
  add column dose_units jsonb not null default '[]' check (jsonb_typeof(dose_units) = 'array');

alter table public.drugs
  add column max_single_dose_amount numeric check (max_single_dose_amount > 0);
update public.drugs set max_single_dose_amount = max_single_dose_mg;
alter table public.drugs drop column max_single_dose_mg;

alter table public.drug_presentations
  add column strength_amount numeric check (strength_amount > 0);
alter table public.drug_presentations
  add column strength_unit text not null default 'mg' check (strength_unit in ('mg', 'mcg', 'iu', 'miu'));
update public.drug_presentations set strength_amount = strength_mg;
alter table public.drug_presentations alter column strength_amount set not null;
alter table public.drug_presentations drop column strength_mg;

alter table public.regimen_items
  add column cap_amount numeric check (cap_amount > 0);
update public.regimen_items set cap_amount = cap_mg;
alter table public.regimen_items drop column cap_mg;

-- A dose unit is now <amount unit>_<basis>; `auc` (Calvert) stays milligram-only.
alter table public.regimen_items drop constraint regimen_items_dose_unit_check;
alter table public.regimen_items add constraint regimen_items_dose_unit_check check (dose_unit in (
  'mg_m2', 'mg_kg', 'mg_flat',
  'mcg_m2', 'mcg_kg', 'mcg_flat',
  'iu_m2', 'iu_kg', 'iu_flat',
  'miu_m2', 'miu_kg', 'miu_flat',
  'auc'
));
