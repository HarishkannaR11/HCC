-- Phase 1 — the code search behind GET /api/codes.
--
-- Search lives in SQL rather than in the route handler so it can use the two
-- indexes created in 0001: a text_pattern_ops btree for code prefixes and a
-- gin_trgm_ops index for fuzzy description matching.

-- ---------------------------------------------------------------------------
-- Dotted canonical form of a typed query. Codes are stored with the decimal
-- ('E11.9') but coders type either spelling, so the needle is normalised to the
-- stored form and prefix-matched directly against icd10_code -- which keeps the
-- btree index usable. A wrapping replace() on the column would not.
--
--   'e11.9 ' -> 'E11.9'      'e119' -> 'E11.9'      'E11' -> 'E11'
-- ---------------------------------------------------------------------------
create or replace function icd10_dotted(raw text)
returns text
language sql
immutable
parallel safe
as $$
  select case
           when length(flat) > 3 then substr(flat, 1, 3) || '.' || substr(flat, 4)
           else flat
         end
  from (select upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g')) as flat) f;
$$;


-- ---------------------------------------------------------------------------
-- search_codes(q, hcc_only, result_limit)
--
-- Returns at most `result_limit` billable FY2026 codes matching `q`, each with
-- its HCC mappings aggregated into a jsonb array. The array is almost always
-- zero or one element; 339 codes map to two HCCs, and those are returned with
-- both so the UI can show both badges rather than silently picking one.
--
-- Nothing here depends on a chart, so no answer key can leak through it: it is
-- a lookup over public CMS reference data, exactly like a paper code book.
--
-- Deliberately no RAF weight in the payload. Search says *which* HCC a code
-- belongs to; what it is worth for this patient depends on age, sex edits and
-- hierarchy suppression, so every number the coder sees comes from one place:
-- POST /api/raf-preview.
--
-- Ranking: exact code, then code prefix, then description matches by trigram
-- similarity. Shorter codes win ties so 'E11' surfaces the category before its
-- children.
-- ---------------------------------------------------------------------------
create or replace function search_codes(
  q            text,
  hcc_only     boolean default false,
  result_limit integer default 25
)
returns table (
  icd10_code  text,
  description text,
  chapter     text,
  hccs        jsonb
)
language sql
stable
parallel safe
as $$
  with needle as (
    select
      icd10_dotted(q)      as code_prefix,
      btrim(coalesce(q, '')) as phrase
  ),
  matched as (
    select
      c.icd10_code,
      c.description,
      c.chapter,
      case
        when n.code_prefix <> '' and c.icd10_code = n.code_prefix then 0
        when n.code_prefix <> '' and c.icd10_code like n.code_prefix || '%' then 1
        else 2
      end as tier,
      case when length(n.phrase) >= 2 then similarity(c.description, n.phrase) else 0 end as sim
    from codes c
    cross join needle n
    where c.is_billable
      and (
        (n.code_prefix <> '' and c.icd10_code like n.code_prefix || '%')
        or (length(n.phrase) >= 2 and c.description ilike '%' || n.phrase || '%')
      )
  ),
  with_hcc as (
    select
      m.*,
      coalesce(
        (
          select jsonb_agg(
                   jsonb_build_object(
                     'category', x.hcc_category,
                     'label',    w.label
                   )
                   order by x.hcc_category
                 )
          from crosswalk x
          join hcc_weights w on w.hcc_category = x.hcc_category
          where x.icd10_code = m.icd10_code
        ),
        '[]'::jsonb
      ) as hccs
    from matched m
  )
  select h.icd10_code, h.description, h.chapter, h.hccs
  from with_hcc h
  where not hcc_only or h.hccs <> '[]'::jsonb
  order by h.tier, h.sim desc, length(h.icd10_code), h.icd10_code
  limit least(greatest(coalesce(result_limit, 25), 1), 100);
$$;

grant execute on function icd10_dotted(text) to anon, authenticated, service_role;
grant execute on function search_codes(text, boolean, integer) to anon, authenticated, service_role;
