-- Phase 0 — CMS-HCC V28 reference tables.
--
-- Source files (official CMS/CDC, PY2026):
--   codes          <- CDC FY2026 ICD-10-CM order file (icd10cm-order-2026.txt)
--   crosswalk      <- ICD10_CC_mappings_CMS_HCC_2026_v28.csv  (2026 Midyear/Final Model Software)
--   hcc_weights    <- V28_CE_Relative_Factors.csv              (same package)
--   hcc_hierarchy  <- V28_HCC_Hierarchies.csv                  (same package)
--
-- These four tables are static reference data: no PHI, world-readable, and
-- rewritten only when CMS publishes a new payment year.

create extension if not exists pg_trgm;


-- ---------------------------------------------------------------------------
-- codes: every FY2026 ICD-10-CM code (98,186 rows, headers included).
-- ---------------------------------------------------------------------------
create table codes (
  icd10_code  text    primary key,               -- canonical dotted form, e.g. 'E11.9'
  description text    not null,                  -- CMS long description
  chapter     text,                              -- derived from the code range
  is_billable boolean not null                   -- order-file flag: 1 = valid for submission
);

-- Phase 1 search box: prefix match on the code, fuzzy match on the description.
create index codes_code_prefix_idx on codes (icd10_code text_pattern_ops);
create index codes_description_trgm_idx on codes using gin (description gin_trgm_ops);
create index codes_billable_idx on codes (is_billable) where is_billable;


-- ---------------------------------------------------------------------------
-- hcc_weights: the 115 V28 condition categories and their coefficients.
--
-- CMS publishes seven coefficient segments, not one. `raf_weight` is a stored
-- alias for the Community Non-dual Aged segment (CNA) -- the conventional
-- reference weight for coder-facing tools -- and the raw segments are kept so
-- the engine can support other populations later without re-parsing.
-- ---------------------------------------------------------------------------
create table hcc_weights (
  hcc_category   integer primary key,            -- 1..238 (115 in use), CMS 'HCC17' -> 17
  label          text    not null,               -- CMS category label
  disease_family text    not null,               -- see note in 0001 review; derived, not published per-HCC

  coef_community_na  numeric(6,3),               -- non-dual aged
  coef_community_pba numeric(6,3),               -- partial-benefit dual aged
  coef_community_fba numeric(6,3),               -- full-benefit dual aged
  coef_community_nd  numeric(6,3),               -- non-dual disabled
  coef_community_pbd numeric(6,3),               -- partial-benefit dual disabled
  coef_community_fbd numeric(6,3),               -- full-benefit dual disabled
  coef_institutional numeric(6,3),

  raf_weight numeric(6,3) generated always as (coef_community_na) stored
);

create index hcc_weights_family_idx on hcc_weights (disease_family);


-- ---------------------------------------------------------------------------
-- crosswalk: ICD-10-CM -> HCC. 8,019 distinct codes, 8,358 rows.
--
-- 339 codes map to more than one HCC, disambiguated by an age or sex edit
-- (breast cancer splits on age < 50 vs >= 50, for example), so the key is the
-- pair -- not the code alone. The edit columns are stored verbatim from CMS.
--
-- CMS's own file carries 8,933 rows because 575 (code, HCC) pairs appear twice,
-- split across complementary age bands that together cover every age. The
-- parser collapses those to a single unconditional row; see
-- scripts/build-reference-data.ts.
-- ---------------------------------------------------------------------------
create table crosswalk (
  icd10_code        text    not null references codes (icd10_code) on delete cascade,
  hcc_category      integer not null references hcc_weights (hcc_category) on delete cascade,
  age_edit          text,                        -- e.g. 'age >= 50'
  sex_edit          text,
  mce_age_condition text,                        -- CMS Medicare Code Editor age band
  primary key (icd10_code, hcc_category)
);

create index crosswalk_hcc_idx on crosswalk (hcc_category);


-- ---------------------------------------------------------------------------
-- hcc_hierarchy: V28 suppression pairs (149 rows).
--
-- One row per (severe HCC, HCC it knocks out). Read as: if hcc_category is
-- captured, suppressed_hcc does not also score. Stored fully expanded, so
-- suppression is a single join rather than a graph walk.
-- ---------------------------------------------------------------------------
create table hcc_hierarchy (
  hcc_category  integer not null references hcc_weights (hcc_category) on delete cascade,
  suppressed_hcc integer not null references hcc_weights (hcc_category) on delete cascade,
  primary key (hcc_category, suppressed_hcc),
  constraint hcc_hierarchy_no_self_suppression check (hcc_category <> suppressed_hcc)
);

create index hcc_hierarchy_suppressed_idx on hcc_hierarchy (suppressed_hcc);


-- ---------------------------------------------------------------------------
-- Reference data is public and contains no PHI: RLS on, read open to everyone,
-- writes reserved for the service role (which bypasses RLS entirely).
-- ---------------------------------------------------------------------------
alter table codes         enable row level security;
alter table hcc_weights   enable row level security;
alter table crosswalk     enable row level security;
alter table hcc_hierarchy enable row level security;

create policy "reference data is readable" on codes         for select using (true);
create policy "reference data is readable" on hcc_weights   for select using (true);
create policy "reference data is readable" on crosswalk     for select using (true);
create policy "reference data is readable" on hcc_hierarchy for select using (true);
