-- Article text is for the department only: it is written from paid and licensed sources
-- (UpToDate, NCCN) and must not be readable from the public site or the public repository.
-- It moves out of public.diseases into its own table that only a signed-in user can read.
-- Everything else about a disease (name, summary, codes, treatment tree) stays public.

create table public.disease_articles (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  disease_id text not null references public.diseases(id) on delete cascade,
  language text not null check (language in ('uk', 'en')),
  body text not null check (length(btrim(body)) > 0),
  sort_order integer not null default 0,
  unique (disease_id, language)
);

alter table public.disease_articles enable row level security;

-- No policy for anon: without a session the table is empty, whatever the request.
create policy "Signed-in read" on public.disease_articles for select to authenticated using (true);

revoke all on public.disease_articles from anon, authenticated;
grant select on public.disease_articles to authenticated;
grant select, insert, update, delete on public.disease_articles to service_role;

alter table public.diseases drop column article;
