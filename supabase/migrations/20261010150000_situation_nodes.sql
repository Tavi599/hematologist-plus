-- A line can carry situations — transplant candidates, refractory to lenalidomide — that are not
-- sections to read through but filters over the line's own list: a 'situation' node names the
-- regimens of its parent line that fit it, and the line is shown whole with the situations as
-- switches above it.
alter table public.treatment_nodes
  drop constraint if exists treatment_nodes_kind_check;
alter table public.treatment_nodes
  add constraint treatment_nodes_kind_check
  check (kind in ('treatment', 'line', 'stage', 'group', 'trial', 'reference', 'situation'));

comment on column public.treatment_nodes.kind is
  'Where the node sits in the hierarchy. ''trial'' marks a section of regimens from published studies; ''reference'' a section of courses that are described but not calculated; ''situation'' a filter over the regimens of its parent line.';
