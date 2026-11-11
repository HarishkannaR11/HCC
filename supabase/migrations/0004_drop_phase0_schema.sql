-- Retire the Phase 0 schema.
--
-- The Phase 0 reference tables (codes, crosswalk, hcc_weights, hcc_hierarchy)
-- and the slug-keyed charts table were not versioned by payment year, which
-- the product spec makes mandatory. They are replaced in 0005-0008.
--
-- Nothing irreplaceable is dropped here: the four reference tables are
-- regenerated from the CMS files by `npm run db:seed`, and charts held only the
-- Phase 0 mock chart (no learner data existed yet).
--
-- icd10_dotted() from 0003 is kept: the versioned code search reuses it.

drop function if exists public.search_codes(text, boolean, integer);

drop table if exists public.chart_expected_codes;
drop table if exists public.charts;
drop table if exists public.crosswalk;
drop table if exists public.hcc_hierarchy;
drop table if exists public.codes;
drop table if exists public.hcc_weights;
