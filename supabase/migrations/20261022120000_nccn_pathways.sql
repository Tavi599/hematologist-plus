-- A guideline's algorithm as its own view: risk group → treatment → what comes next.
--
-- The treatment tree can only hold regimens under headings. A guideline pathway also has steps
-- that are not regimens — allogeneic transplant, a clinical trial, surveillance, a marrow on day
-- 14 — and arrows from one page to another (induction → consolidation → maintenance). And it
-- ranks every option: preferred, other recommended, useful in certain circumstances, with a
-- category of evidence. Until now all of that was free text in descriptions and notes.
--
-- 'pathway' marks the root of such an algorithm: the app shows it on a page of its own instead of
-- in the tree. An installed copy that does not know the kind reads it as a plain group, so it keeps
-- showing the branch inside the tree as before.
alter table public.treatment_nodes
  drop constraint if exists treatment_nodes_kind_check;
alter table public.treatment_nodes
  add constraint treatment_nodes_kind_check
  check (kind in ('treatment', 'line', 'stage', 'group', 'trial', 'reference', 'situation', 'pathway'));

comment on column public.treatment_nodes.kind is
  'Where the node sits in the hierarchy. ''trial'' marks a section of regimens from published studies; ''reference'' a section of courses that are described but not calculated; ''situation'' a filter over the regimens of its parent line; ''pathway'' the root of a guideline algorithm shown on its own page.';

-- Steps of a pathway row that are not regimens: [{kind, column, label, target_id, preference,
-- category, notes}]. column 'treatment' stands beside the regimens, 'next' is the arrow out of the
-- row; target_id is the treatment node the arrow leads to. Only labels and links: never a dose.
alter table public.treatment_nodes
  add column steps jsonb not null default '[]'::jsonb
  check (jsonb_typeof(steps) = 'array');

comment on column public.treatment_nodes.steps is
  'Pathway steps that are not regimens (transplant, trial, surveillance, assessment, next page): [{kind, column, label, target_id, preference, category, notes}]. Labels and links only.';

-- How the guideline ranks a regimen in this place: the label and the badge beside it.
alter table public.treatment_node_regimens
  add column preference text
  check (preference in ('preferred', 'other', 'circumstances'));

alter table public.treatment_node_regimens
  add column category text
  check (category in ('1', '2a', '2b', '3'));

comment on column public.treatment_node_regimens.preference is
  'Guideline rank of the regimen here: preferred, other (other recommended), circumstances (useful in certain circumstances). Null = not ranked.';
comment on column public.treatment_node_regimens.category is
  'Guideline category of evidence and consensus: 1, 2a, 2b, 3. Null = not stated (NCCN default 2A).';
