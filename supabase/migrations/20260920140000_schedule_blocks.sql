-- How a row is timed and which sheet it belongs to. Until now every administration was chained
-- one after another, so shifting an infusion moved the evening tablets with it.
--   infusion    — in the hourly chain of the infusion sheet (premedication and the drugs)
--   day_support — on the infusion sheet, timed from the start of the day's first cytostatic
--                 (ondansetron 30 min before it and then every 8 hours)
--   ward        — the inpatient sheet: a daily count, never placed in the hourly grid
alter table public.regimen_items
  add column block text not null default 'infusion'
  check (block in ('infusion', 'day_support', 'ward'));

-- Repeats within one day: minutes between administrations (q8h = 480).
alter table public.regimen_items add column interval_min integer check (interval_min > 0);

-- For day_support: minutes from the start of the day's first chained drug; negative is before it.
alter table public.regimen_items add column anchor_offset_min integer;

update public.regimen_items
set block = case
  when role <> 'supportive' then 'infusion'
  when route = 'oral' then 'ward'
  else 'day_support'
end;

-- Rituximab and the other antibodies are not given at one rate: the rate is raised in steps.
-- {"first": {"start_ml_h": 25, "step_ml_h": 25, "every_min": 30, "max_ml_h": 200},
--  "next":  {"start_ml_h": 50, "step_ml_h": 50, "every_min": 30, "max_ml_h": 200}}
alter table public.drug_infusion_params
  add column rate_ramp jsonb
  check (rate_ramp is null or jsonb_typeof(rate_ramp) = 'object');
