-- Some courses are known to exist and are worth a line in the treatment tree, yet the sources
-- leave out a piece of the schedule the calculator cannot do without — the day of a drug within
-- the cycle, a step of the ramp-up. Writing the missing piece down from memory would be a dose
-- for a patient, so the course is described instead: its drugs, the short facts that matter, and
-- what the sources do not say.
--
-- Two things follow. A treatment node can be of kind 'reference', a section of its own under
-- which such courses are collected. And a regimen carries the description in one jsonb column,
-- null for every regimen that is calculated; a described one has no items and is never offered
-- in the calculator.
alter table public.treatment_nodes
  drop constraint if exists treatment_nodes_kind_check;
alter table public.treatment_nodes
  add constraint treatment_nodes_kind_check
  check (kind in ('treatment', 'line', 'stage', 'group', 'trial', 'reference'));

comment on column public.treatment_nodes.kind is
  'Where the node sits in the hierarchy. ''trial'' marks a section of regimens from published studies; ''reference'' a section of courses that are described but not calculated.';

alter table public.regimens
  add column reference jsonb
  check (reference is null or jsonb_typeof(reference) = 'object');

comment on column public.regimens.reference is
  'The description of a course that is not calculated: summary, drugs, key facts, what the sources leave out and whether it can be given in Ukraine. Null for a regimen that has items.';
