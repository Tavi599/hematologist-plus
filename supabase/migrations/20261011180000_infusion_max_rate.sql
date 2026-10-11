-- Vancomycin runs no faster than 10 mg/min and over at least an hour (SmPC 4.2): a large dose takes
-- longer than the regimen's duration. The fastest pace is stored per dilution; the calculator
-- stretches the infusion to dose ÷ rate when that is longer.
alter table public.drug_infusion_params
  add column max_rate_mg_min numeric check (max_rate_mg_min is null or max_rate_mg_min > 0);

comment on column public.drug_infusion_params.max_rate_mg_min is
  'Fastest infusion pace, mg/min; null when the label sets only a duration.';
