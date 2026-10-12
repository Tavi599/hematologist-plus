-- A dose per kilogram of an aminoglycoside is given on the ideal weight, or on the adjusted weight
-- when the actual one is above 120% of the ideal (UpToDate, «Dosing and administration of
-- parenteral aminoglycosides»). Vancomycin doses are rounded to 250 mg (UpToDate, «Vancomycin:
-- Parenteral dosing»). Both are properties of the drug.
alter table public.drugs
  add column dosing_weight text not null default 'actual'
    check (dosing_weight in ('actual', 'aminoglycoside'));

alter table public.drugs
  add column dose_rounding_step numeric check (dose_rounding_step is null or dose_rounding_step > 0);

comment on column public.drugs.dosing_weight is
  'Weight a dose per kilogram goes on: actual, or aminoglycoside (actual below ideal, ideal up to 1.2x, else IBW + 0.4 x excess).';
comment on column public.drugs.dose_rounding_step is
  'Rounding step of a dose, in amount_unit; null keeps the default step.';
