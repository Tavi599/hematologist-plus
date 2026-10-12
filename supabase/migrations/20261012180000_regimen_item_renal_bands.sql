-- The dose and interval a label gives for each range of creatinine clearance, written for the
-- regimen item's own dose (cefepime 2 g every 8 h: CrCl 30-60 mL/min, 2 g every 12 h). The
-- calculator puts them in place of the item's dose and interval for the patient's clearance.
-- Shape (validated by src/schemas/common.ts): [{ "crcl_min": 30, "crcl_max": 60,
-- "dose_value": 2000, "administrations_per_day": 2, "interval_min": 720, "notes": null,
-- "source": { "name": "...", "url": "...", "version": "...", "checkedOn": "YYYY-MM-DD" } }]
alter table public.regimen_items
  add column renal_bands jsonb not null default '[]'
  check (jsonb_typeof(renal_bands) = 'array');
