-- Routes by which a drug's label allows the same dose: azacitidine subcutaneously or
-- intravenously, bortezomib subcutaneously or as an IV bolus. The calculator offers a switch
-- between them on the dose row. Shape: [{"routes": ["subcutaneous", "iv_infusion"],
-- "infusion": {"solvent": ..., "volume_ml": ..., "duration_min": ...} | null,
-- "notes": {...} | null, "sources": [...]}]. Null — no alternative, no switch.
alter table public.drugs
  add column route_alternatives jsonb
  check (route_alternatives is null or jsonb_typeof(route_alternatives) = 'array');

comment on column public.drugs.route_alternatives is
  'Routes the label allows at the same dose, with the dilution for an IV infusion reached by the switch. Never a route that needs another dose or product.';
