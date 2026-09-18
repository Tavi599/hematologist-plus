-- Alternative doses for the same regimen item, so the physician can switch between protocols
-- (NSSG, eviQ, NCCN ...) instead of the value being fixed by whoever entered the regimen.
-- The item's own dose_value/dose_unit stays the default; these are the alternatives.
-- Shape (validated by src/schemas/common.ts): [{ "dose_value": 100, "dose_unit": "mg_flat",
-- "cap_mg": null, "notes": null, "source": { "name": "eviQ 123", "url": "...",
-- "version": "...", "checkedOn": "YYYY-MM-DD" } }]

alter table public.regimen_items
  add column dose_options jsonb not null default '[]'
  check (jsonb_typeof(dose_options) = 'array');
