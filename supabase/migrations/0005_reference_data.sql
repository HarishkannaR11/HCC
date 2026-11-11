-- Reference data, versioned by payment year.
--
-- Every row here is public US-government data (CDC ICD-10-CM, CMS-HCC model
-- software) and contains no PHI. It is loaded by scripts/seed-reference.ts and
-- is read-only to every API role.
--
-- Payment-year consistency is enforced structurally: each child table carries
-- payment_year and references its parents through (payment_year, id), so an
-- ICD-10 code from one year can never be mapped to an HCC from another.


-- ---------------------------------------------------------------------------
-- payment_years
-- ---------------------------------------------------------------------------
create table public.payment_years (
  year              smallint primary key check (year between 2020 and 2100),
  hcc_model_version text     not null check (hcc_model_version ~ '^V[0-9]{2}$'),
  is_active         boolean  not null default false
);

comment on column public.payment_years.is_active is
  'Active years are offered to authors and learners. More than one may be active.';


-- ---------------------------------------------------------------------------
-- icd10_codes: the ICD-10-CM release that feeds a payment year's model.
-- Category headers are kept (is_billable = false) so the chapter structure is
-- complete, but only billable codes may be assigned.
-- ---------------------------------------------------------------------------
create table public.icd10_codes (
  id           bigint   generated always as identity primary key,
  code         text     not null check (code ~ '^[A-Z][A-Z0-9]{2}(\.[A-Z0-9]{1,4})?$'),
  description  text     not null check (char_length(description) > 0),
  payment_year smallint not null references public.payment_years (year) on delete cascade,
  is_billable  boolean  not null,
  unique (payment_year, code),
  unique (payment_year, id)
);

-- Code-prefix typeahead and fuzzy description search (used from Phase 2).
create index icd10_codes_code_prefix_idx on public.icd10_codes (payment_year, code text_pattern_ops);
create index icd10_codes_description_trgm_idx on public.icd10_codes using gin (description gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- hcc_categories
--
-- raf_community_nondual is the Community, Non-dual, Aged segment (CMS
-- variable prefix CNA_), the conventional reference weight for coder-facing
-- tools.
--
-- hierarchy_group / hierarchy_rank describe where the HCC sits in its CMS
-- hierarchy: the group is the connected component of the suppression graph,
-- rank 1 is the most severe member. They are for display and analytics. They
-- are NOT sufficient for trimming: four V28 groups are partial orders (HCC180
-- suppresses both 182 and 253, which do not suppress each other), so trimming
-- uses the explicit pairs in hcc_hierarchy. See DECISIONS.md.
-- ---------------------------------------------------------------------------
create table public.hcc_categories (
  id                    bigint   generated always as identity primary key,
  payment_year          smallint not null references public.payment_years (year) on delete cascade,
  hcc_code              text     not null check (hcc_code ~ '^HCC[0-9]{1,4}$'),
  label                 text     not null check (char_length(label) > 0),
  raf_community_nondual numeric(6, 3) not null,
  hierarchy_group       text     not null check (hierarchy_group ~ '^[a-z0-9-]+$'),
  hierarchy_rank        smallint not null check (hierarchy_rank >= 1),
  unique (payment_year, hcc_code),
  unique (payment_year, id)
);

create index hcc_categories_group_idx on public.hcc_categories (payment_year, hierarchy_group);


-- ---------------------------------------------------------------------------
-- hcc_hierarchy: CMS suppression pairs, verbatim. "If parent is present on the
-- chart, child does not score." Judged against the HCCs present before any
-- trimming, which is how the CMS software applies its hierarchy table.
-- ---------------------------------------------------------------------------
create table public.hcc_hierarchy (
  payment_year  smallint not null,
  parent_hcc_id bigint   not null,
  child_hcc_id  bigint   not null,
  primary key (parent_hcc_id, child_hcc_id),
  foreign key (payment_year, parent_hcc_id) references public.hcc_categories (payment_year, id) on delete cascade,
  foreign key (payment_year, child_hcc_id)  references public.hcc_categories (payment_year, id) on delete cascade,
  constraint hcc_hierarchy_no_self_suppression check (parent_hcc_id <> child_hcc_id)
);

create index hcc_hierarchy_year_idx on public.hcc_hierarchy (payment_year);


-- ---------------------------------------------------------------------------
-- icd_hcc_map: ICD-10-CM -> HCC for one payment year.
--
-- A code can map to two HCCs. CMS disambiguates some of those with age or sex
-- edits (C50.011 is HCC22 under 50, HCC23 at 50+), so the edits are kept
-- verbatim and evaluated against the chart's synthetic patient.
--   age_edit           'age < 50', 'age >= 50', ...
--   sex_edit           CMS sex code as published: '1.0' male, '2.0' female
--   mce_age_condition  Medicare Code Editor band, e.g. '0 <= age <= 17'
-- ---------------------------------------------------------------------------
create table public.icd_hcc_map (
  icd10_code_id     bigint   not null,
  hcc_category_id   bigint   not null,
  payment_year      smallint not null,
  age_edit          text,
  sex_edit          text check (sex_edit ~ '^[12](\.0)?$'),
  mce_age_condition text,
  primary key (icd10_code_id, hcc_category_id),
  foreign key (payment_year, icd10_code_id)   references public.icd10_codes (payment_year, id)    on delete cascade,
  foreign key (payment_year, hcc_category_id) references public.hcc_categories (payment_year, id) on delete cascade
);

create index icd_hcc_map_hcc_idx on public.icd_hcc_map (hcc_category_id);
create index icd_hcc_map_year_idx on public.icd_hcc_map (payment_year);


-- ---------------------------------------------------------------------------
-- RLS: readable by everyone, writable by no API role. The seed script writes
-- over a direct Postgres connection; the service role bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.payment_years  enable row level security;
alter table public.icd10_codes    enable row level security;
alter table public.hcc_categories enable row level security;
alter table public.hcc_hierarchy  enable row level security;
alter table public.icd_hcc_map    enable row level security;

create policy "reference data is readable" on public.payment_years  for select to anon, authenticated using (true);
create policy "reference data is readable" on public.icd10_codes    for select to anon, authenticated using (true);
create policy "reference data is readable" on public.hcc_categories for select to anon, authenticated using (true);
create policy "reference data is readable" on public.hcc_hierarchy  for select to anon, authenticated using (true);
create policy "reference data is readable" on public.icd_hcc_map    for select to anon, authenticated using (true);

revoke insert, update, delete, truncate, references, trigger
  on public.payment_years, public.icd10_codes, public.hcc_categories, public.hcc_hierarchy, public.icd_hcc_map
  from anon, authenticated;
