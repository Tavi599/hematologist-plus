-- Antimicrobials run over a range of durations: meropenem 15-30 min by the label or 3 h as an
-- extended infusion, vancomycin at least an hour. The calculator offers the recommended ones and
-- lets the physician type another, never shorter than the label's shortest.
alter table public.drug_infusion_params
  add column duration_options jsonb not null default '[]'::jsonb;

alter table public.drug_infusion_params
  add column min_duration_min integer check (min_duration_min is null or min_duration_min > 0);

comment on column public.drug_infusion_params.duration_options is
  'Recommended durations: [{"duration_min": 30, "extended": false}, ...]; extended marks a prolonged infusion.';
comment on column public.drug_infusion_params.min_duration_min is
  'Shortest infusion the label allows, min; null when it names none.';
