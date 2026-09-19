-- Colleagues can only read the catalog; this is the one thing they may write. A proposal is a
-- note asking for a regimen, a drug, an article or a fix. The owner of the project reviews the
-- list and marks what is being worked on.
--
-- Nothing about a patient belongs here: the form says so, and the table holds no field for it.

-- Who may review proposals. Membership is granted by hand in the SQL editor, so being signed in
-- is never enough on its own.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text
);
alter table public.admins enable row level security;
-- A signed-in user may check whether they themselves are an admin, and see nobody else.
create policy "Read own admin row" on public.admins for select to authenticated using (
  user_id = (select auth.uid())
);
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.admins to service_role;

-- Bypasses the policy above so a policy on another table can ask the question for any row.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author_id uuid not null references auth.users (id) on delete cascade,
  -- Shown to the owner so a proposal has a face; author_id is what the policies trust.
  author_email text not null check (length(btrim(author_email)) > 0),
  kind text not null check (kind in ('regimen', 'drug', 'disease', 'article', 'bug', 'other')),
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 5000),
  status text not null default 'new'
    check (status in ('new', 'accepted', 'in_progress', 'done', 'declined')),
  decision_note text check (decision_note is null or length(decision_note) <= 2000),
  decided_at timestamptz
);
alter table public.proposals enable row level security;

-- A colleague sees their own proposals and the decision on them; the whole list is the owner's.
create policy "Read own or admin" on public.proposals for select to authenticated using (
  author_id = (select auth.uid()) or public.is_admin()
);
create policy "Write own" on public.proposals for insert to authenticated with check (
  author_id = (select auth.uid()) and status = 'new' and decision_note is null
);
create policy "Admin decides" on public.proposals for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admin removes" on public.proposals for delete to authenticated using (
  public.is_admin()
);

revoke all on public.proposals from anon, authenticated;
grant select, insert, update, delete on public.proposals to authenticated;
grant select, insert, update, delete on public.proposals to service_role;

create index proposals_author_created_idx on public.proposals (author_id, created_at desc);
