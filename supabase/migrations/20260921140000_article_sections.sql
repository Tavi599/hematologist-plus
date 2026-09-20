-- The buttons under a disease used to open NCCN, UpToDate and eviQ in another tab. The
-- department wants them to open its own write-up of what that guideline says, inside the app and
-- behind the same sign-in as the rest of the article text — nothing leaves for a third-party site.
--
-- So an article is no longer one text per language but one text per language and per source:
-- 'own' is the department's own article, the rest are written from the named guideline. The text
-- stays in this table, which has no policy for anon and is never cached offline.
alter table public.disease_articles
  add column section text not null default 'own'
  check (section in ('own', 'nccn', 'uptodate', 'eviq', 'nssg', 'other'));

alter table public.disease_articles
  drop constraint disease_articles_disease_id_language_key;
alter table public.disease_articles
  add constraint disease_articles_disease_id_language_section_key
  unique (disease_id, language, section);

comment on column public.disease_articles.section is
  'Which source this text was written from: own = the department''s own article; nccn/uptodate/eviq/nssg/other = what the department wrote from that guideline. The guideline''s own text is not stored.';
