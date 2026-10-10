-- What a drug's label says for a patient with kidney or liver impairment, heart disease or severe
-- peripheral neuropathy: each entry a condition, how strongly the label speaks (contraindicated,
-- dose reduction, caution), the threshold and dose in its own words, and the label section cited.
-- The disease page filters and marks regimens by them.
alter table public.drugs
  add column cautions jsonb
  check (cautions is null or jsonb_typeof(cautions) = 'array');

comment on column public.drugs.cautions is
  'Label statements by patient condition (renal, hepatic, cardiac, neuropathy): level contraindicated, dose_reduction or caution, notes with the threshold, and the source.';
