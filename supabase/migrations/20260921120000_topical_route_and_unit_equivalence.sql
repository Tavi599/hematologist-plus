-- Two things the department's own sheets need and the schema did not have.

-- 1. Drops, ointments and gels. The HD ARA-C sheet prescribes dexamethasone eye drops four
--    times a day alongside the infusion; there was no route to write that down.
alter table public.regimen_items drop constraint regimen_items_route_check;
alter table public.regimen_items add constraint regimen_items_route_check check (route in (
  'iv_infusion', 'iv_bolus', 'subcutaneous', 'intramuscular', 'oral', 'intrathecal', 'topical'
));

-- 2. What a drug's mass is worth in biological activity. Mass (mg, mcg) and activity (iu, miu)
--    are never interchangeable by arithmetic, but a few drugs are sold and prescribed both
--    ways: the same filgrastim syringe is labelled 300 mcg and 30 million IU. That number comes
--    off the pack, so it is stored with the drug and is the only bridge between the two
--    families. Shape: {"amount": 300, "amount_unit": "mcg", "activity": 30,
--    "activity_unit": "miu"} — mass on the left, activity on the right, both positive.
alter table public.drugs
  add column unit_equivalence jsonb
  check (
    unit_equivalence is null
    or (
      jsonb_typeof(unit_equivalence) = 'object'
      and (unit_equivalence ->> 'amount')::numeric > 0
      and unit_equivalence ->> 'amount_unit' in ('mg', 'mcg')
      and (unit_equivalence ->> 'activity')::numeric > 0
      and unit_equivalence ->> 'activity_unit' in ('iu', 'miu')
    )
  );

comment on column public.drugs.unit_equivalence is
  'What the label says this drug''s mass is worth in activity, e.g. filgrastim 300 mcg = 30 miu. Read off the pack, never calculated; without it mass and activity never convert.';
