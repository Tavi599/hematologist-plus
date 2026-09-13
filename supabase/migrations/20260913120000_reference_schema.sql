-- Reference data for Hematologist+.
-- The site reads these tables with the publishable key (role anon): SELECT only.
-- Content is written exclusively by scripts/sync-supabase.ts with the secret key.
-- Column names must match the Zod row schemas in src/schemas/catalog.ts (checked by a test).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Localized text: {"uk": "...", "en": "..."}; at least one non-empty language, no other keys.
create or replace function private.is_localized_text(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and not exists (
      select 1 from jsonb_each(value) e
      where e.key not in ('uk', 'en')
         or jsonb_typeof(e.value) not in ('string', 'null')
    )
    and exists (
      select 1 from jsonb_each_text(value) e
      where btrim(coalesce(e.value, '')) <> ''
    )
$$;

-- ---------------------------------------------------------------------------
-- Hospitals (print form header; Ukrainian only because forms are printed in Ukrainian)
-- ---------------------------------------------------------------------------
create table public.hospitals (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  institution_name text not null check (btrim(institution_name) <> ''),
  department_name text not null check (btrim(department_name) <> ''),
  head_of_department text,
  doctors text[] not null default '{}',
  address text,
  is_default boolean not null default false,
  sort_order integer not null default 0
);
create unique index hospitals_single_default on public.hospitals (is_default) where is_default;

-- ---------------------------------------------------------------------------
-- Drugs
-- ---------------------------------------------------------------------------
create table public.drugs (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  name jsonb not null check (private.is_localized_text(name)),
  trade_names text[] not null default '{}',
  atc_code text check (atc_code ~ '^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$'),
  max_single_dose_mg numeric check (max_single_dose_mg > 0),
  review_rules jsonb check (review_rules is null or jsonb_typeof(review_rules) = 'object'),
  notes jsonb check (notes is null or private.is_localized_text(notes)),
  sort_order integer not null default 0
);

create table public.drug_presentations (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  drug_id text not null references public.drugs (id) on delete cascade,
  form text not null check (form in ('vial', 'ampoule', 'tablet', 'capsule', 'syringe', 'other')),
  strength_mg numeric not null check (strength_mg > 0),
  volume_ml numeric check (volume_ml > 0),
  label jsonb check (label is null or private.is_localized_text(label)),
  sort_order integer not null default 0
);
create index drug_presentations_drug_id on public.drug_presentations (drug_id);

create table public.drug_infusion_params (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  drug_id text not null references public.drugs (id) on delete cascade,
  solvent text not null check (solvent in ('sodium_chloride_0_9', 'glucose_5', 'water_for_injection')),
  concentration_min_mg_ml numeric check (concentration_min_mg_ml > 0),
  concentration_max_mg_ml numeric check (concentration_max_mg_ml > 0),
  stock_concentration_mg_ml numeric check (stock_concentration_mg_ml > 0),
  bag_volumes_ml numeric[] not null default '{}' check (0 < all (bag_volumes_ml)),
  duration_min integer check (duration_min >= 0),
  is_default boolean not null default false,
  notes jsonb check (notes is null or private.is_localized_text(notes)),
  sort_order integer not null default 0,
  check (concentration_min_mg_ml is null or concentration_max_mg_ml is null
         or concentration_min_mg_ml <= concentration_max_mg_ml)
);
create index drug_infusion_params_drug_id on public.drug_infusion_params (drug_id);
create unique index drug_infusion_params_single_default
  on public.drug_infusion_params (drug_id) where is_default;

-- ---------------------------------------------------------------------------
-- Regimens
-- ---------------------------------------------------------------------------
create table public.regimens (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  short_name text not null check (btrim(short_name) <> ''),
  name jsonb not null check (private.is_localized_text(name)),
  description jsonb check (description is null or private.is_localized_text(description)),
  cycle_length_days integer check (cycle_length_days > 0),
  default_cycles integer check (default_cycles > 0),
  -- Print form list and templates; validated by src/schemas/print-forms.ts before sync and render.
  print_forms jsonb not null default '{"version": 1, "forms": []}'
    check (jsonb_typeof(print_forms) = 'object'),
  sort_order integer not null default 0
);

create table public.regimen_items (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  regimen_id text not null references public.regimens (id) on delete cascade,
  drug_id text not null references public.drugs (id) on delete restrict,
  role text not null default 'main' check (role in ('main', 'premedication', 'supportive')),
  route text not null check (route in
    ('iv_infusion', 'iv_bolus', 'subcutaneous', 'intramuscular', 'oral', 'intrathecal')),
  -- Dose per administration.
  dose_value numeric not null check (dose_value > 0),
  dose_unit text not null check (dose_unit in ('mg_m2', 'mg_kg', 'mg_flat', 'auc')),
  cap_mg numeric check (cap_mg > 0),
  days smallint[] not null check (cardinality(days) > 0 and 0 <= all (days)),
  administrations_per_day smallint not null default 1 check (administrations_per_day > 0),
  infusion_params_id text references public.drug_infusion_params (id) on delete set null,
  -- Fallbacks from the regimen template when the drug catalog lacks infusion parameters.
  duration_min integer check (duration_min >= 0),
  fallback_solvent text check (fallback_solvent in
    ('sodium_chloride_0_9', 'glucose_5', 'water_for_injection')),
  fallback_volume_ml numeric check (fallback_volume_ml > 0),
  gap_before_min integer check (gap_before_min >= 0),
  notes jsonb check (notes is null or private.is_localized_text(notes)),
  sort_order integer not null default 0
);
create index regimen_items_regimen_id on public.regimen_items (regimen_id);
create index regimen_items_drug_id on public.regimen_items (drug_id);
create index regimen_items_infusion_params_id on public.regimen_items (infusion_params_id);

-- ---------------------------------------------------------------------------
-- Diseases and classifications
-- ---------------------------------------------------------------------------
create table public.classification_systems (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  name jsonb not null check (private.is_localized_text(name)),
  version text,
  url text,
  sort_order integer not null default 0
);

create table public.diseases (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  name jsonb not null check (private.is_localized_text(name)),
  summary jsonb check (summary is null or private.is_localized_text(summary)),
  -- Markdown article per language.
  article jsonb check (article is null or private.is_localized_text(article)),
  sort_order integer not null default 0
);

create table public.disease_codes (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  disease_id text not null references public.diseases (id) on delete cascade,
  system_id text not null references public.classification_systems (id) on delete restrict,
  code text not null check (btrim(code) <> ''),
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  unique (disease_id, system_id, code)
);
create index disease_codes_system_id on public.disease_codes (system_id);

-- Treatment hierarchy: disease → treatment → line / stage → regimens.
create table public.treatment_nodes (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  disease_id text not null references public.diseases (id) on delete cascade,
  parent_id text,
  kind text not null check (kind in ('treatment', 'line', 'stage', 'group')),
  title jsonb not null check (private.is_localized_text(title)),
  description jsonb check (description is null or private.is_localized_text(description)),
  sort_order integer not null default 0,
  unique (id, disease_id),
  check (parent_id is null or parent_id <> id),
  -- A parent must belong to the same disease.
  foreign key (parent_id, disease_id)
    references public.treatment_nodes (id, disease_id) on delete cascade
);
create index treatment_nodes_disease_id on public.treatment_nodes (disease_id);
create index treatment_nodes_parent on public.treatment_nodes (parent_id, disease_id);

create table public.treatment_node_regimens (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]*$'),
  node_id text not null references public.treatment_nodes (id) on delete cascade,
  regimen_id text not null references public.regimens (id) on delete cascade,
  notes jsonb check (notes is null or private.is_localized_text(notes)),
  sort_order integer not null default 0,
  unique (node_id, regimen_id)
);
create index treatment_node_regimens_regimen_id on public.treatment_node_regimens (regimen_id);

-- ---------------------------------------------------------------------------
-- Row level security: public read, no writes through the Data API.
-- ---------------------------------------------------------------------------
alter table public.hospitals enable row level security;
alter table public.drugs enable row level security;
alter table public.drug_presentations enable row level security;
alter table public.drug_infusion_params enable row level security;
alter table public.regimens enable row level security;
alter table public.regimen_items enable row level security;
alter table public.classification_systems enable row level security;
alter table public.diseases enable row level security;
alter table public.disease_codes enable row level security;
alter table public.treatment_nodes enable row level security;
alter table public.treatment_node_regimens enable row level security;

create policy "Public read" on public.hospitals for select to anon, authenticated using (true);
create policy "Public read" on public.drugs for select to anon, authenticated using (true);
create policy "Public read" on public.drug_presentations for select to anon, authenticated using (true);
create policy "Public read" on public.drug_infusion_params for select to anon, authenticated using (true);
create policy "Public read" on public.regimens for select to anon, authenticated using (true);
create policy "Public read" on public.regimen_items for select to anon, authenticated using (true);
create policy "Public read" on public.classification_systems for select to anon, authenticated using (true);
create policy "Public read" on public.diseases for select to anon, authenticated using (true);
create policy "Public read" on public.disease_codes for select to anon, authenticated using (true);
create policy "Public read" on public.treatment_nodes for select to anon, authenticated using (true);
create policy "Public read" on public.treatment_node_regimens for select to anon, authenticated using (true);

-- Defense in depth: even with RLS, API roles get no write privileges.
revoke all on
  public.hospitals, public.drugs, public.drug_presentations, public.drug_infusion_params,
  public.regimens, public.regimen_items, public.classification_systems, public.diseases,
  public.disease_codes, public.treatment_nodes, public.treatment_node_regimens
from anon, authenticated;
grant select on
  public.hospitals, public.drugs, public.drug_presentations, public.drug_infusion_params,
  public.regimens, public.regimen_items, public.classification_systems, public.diseases,
  public.disease_codes, public.treatment_nodes, public.treatment_node_regimens
to anon, authenticated;
grant select, insert, update, delete on
  public.hospitals, public.drugs, public.drug_presentations, public.drug_infusion_params,
  public.regimens, public.regimen_items, public.classification_systems, public.diseases,
  public.disease_codes, public.treatment_nodes, public.treatment_node_regimens
to service_role;
