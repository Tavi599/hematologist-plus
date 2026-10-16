-- The list of diseases used to be grouped by the first letter of the ICD-10 code: "Клас МКХ-10: C"
-- held the lymphomas together with the leukaemias and the myeloma, while "D" held the
-- myelodysplastic syndrome beside the myeloproliferative neoplasms. A physician looking for a
-- disease reads neither heading: the department thinks in clinical groups.
--
-- The group is a property of the disease, so it is stored with it rather than as a list of ids
-- inside the app. Nullable: a disease nobody has placed yet is shown under "Other" instead of
-- being left out, and the column only decides a heading — never a dose.
alter table public.diseases
  add column clinical_group text
  check (clinical_group in ('lymphoma', 'acute-leukemia', 'chronic-leukemia', 'plasma-cell', 'mds', 'myeloproliferative'));

comment on column public.diseases.clinical_group is
  'Clinical group the list of diseases is grouped by: lymphoma, acute-leukemia, chronic-leukemia, plasma-cell, mds, myeloproliferative. Null = shown under "Other".';
