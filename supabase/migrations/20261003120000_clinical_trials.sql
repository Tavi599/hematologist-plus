-- A protocol and a trial are not the same kind of document, and a regimen taken from a published
-- trial must not sit in the treatment tree looking like a guideline. Two things follow.
--
-- First, a treatment node can now be of kind 'trial': a section of its own, under which the
-- regimens that exist only as published studies are collected, so a reader sees what they are
-- before opening one.
--
-- Second, such a regimen carries the study behind it: what the design was, who was enrolled, what
-- came out of it, and what the conduct demands that a bare dose list does not say. It is one
-- jsonb column rather than four, because the fields are read together and are all optional —
-- a regimen from a guideline has none of them.
alter table public.treatment_nodes
  drop constraint if exists treatment_nodes_kind_check;
alter table public.treatment_nodes
  add constraint treatment_nodes_kind_check
  check (kind in ('treatment', 'line', 'stage', 'group', 'trial'));

comment on column public.treatment_nodes.kind is
  'Where the node sits in the hierarchy. ''trial'' marks a section holding regimens that come from published studies rather than from a protocol or a label.';

alter table public.regimens
  add column evidence jsonb
  check (evidence is null or jsonb_typeof(evidence) = 'object');

comment on column public.regimens.evidence is
  'The study a trial regimen comes from: design, population, results and conduct, each localized text and each optional. Null for a regimen taken from a protocol or a label.';
