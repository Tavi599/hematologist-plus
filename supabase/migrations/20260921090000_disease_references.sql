-- Where to read more about a disease: the guideline pages a physician opens next.
-- Kept next to the disease rather than in the article, because the article is private and the
-- links are not: a colleague without a session still gets the buttons.
alter table public.diseases
  add column references_json jsonb not null default '[]'::jsonb;

comment on column public.diseases.references_json is
  'External guideline links: [{"kind":"nccn|uptodate|eviq|nssg|other","url":"https://...","label":{"uk":"...","en":"..."}}]. No article text is copied from them.';
