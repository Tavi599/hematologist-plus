-- A course given in several records — cycle 1 with its premedication and split first infusion,
-- cycles 2–6, maintenance — is one course to the physician. Each record now says which course it
-- belongs to and which phase it is: the course id and title, the phase label, its place in the
-- sequence and, for a phase that follows the cycle count, the cycles it covers. The treatment tree
-- shows the phases as one tile, and the calculator opens the phase that covers the cycle being
-- written.
alter table public.regimens
  add column course jsonb
  check (course is null or jsonb_typeof(course) = 'object');

comment on column public.regimens.course is
  'The phase of a multi-phase course this regimen is: id, title, phase, order and cycles {from, to} (to null for "and on"; cycles null for a phase by stage). Null for a course in one record.';
