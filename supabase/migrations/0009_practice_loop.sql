-- 0009 — Phase 2: the practice loop.
--
-- * search_icd10_codes: the encoder's typeahead over one payment year's
--   billable codes, with each code's HCC mappings and CMS edits so the encoder
--   can show the HCC and run the hierarchy-trimmed RAF for this chart's
--   patient. Public reference data only: nothing here touches a chart or key.
-- * attempts: learners may set only (user_id, chart_id, mode) when starting an
--   attempt. started_at always comes from the database clock, so Phase 3's
--   timed mode can trust it. One open attempt per learner per chart.
-- * attempt_results.breakdown: the full scoring snapshot, written once.
-- * submit_scored_attempt: writes the final codes, the submission time and the
--   result in one transaction. Service role only; learners still cannot submit
--   or score.


-- ---------------------------------------------------------------------------
-- Typeahead
-- ---------------------------------------------------------------------------

-- 'e11.9 ' -> 'E11.9', 'e119' -> 'E11.9'. Created by 0003; restated so this
-- migration does not depend on it surviving.
create or replace function public.icd10_dotted(raw text)
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

create or replace function public.search_icd10_codes(
  q              text,
  p_payment_year smallint,
  hcc_only       boolean default false,
  result_limit   integer default 20
)
returns table (
  code        text,
  description text,
  hccs        jsonb
)
language sql
stable
parallel safe
set search_path = public, extensions
as $$
  with needle as (
    select icd10_dotted(q) as code_prefix, btrim(coalesce(q, '')) as phrase
  ),
  matched as (
    select
      c.id,
      c.code,
      c.description,
      case
        when n.code_prefix <> '' and c.code = n.code_prefix then 0
        when n.code_prefix <> '' and c.code like n.code_prefix || '%' then 1
        else 2
      end as tier,
      case when length(n.phrase) >= 2 then similarity(c.description, n.phrase) else 0 end as sim
    from icd10_codes c
    cross join needle n
    where c.payment_year = p_payment_year
      and c.is_billable
      and (
        (n.code_prefix <> '' and c.code like n.code_prefix || '%')
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
                     'hcc_code',          h.hcc_code,
                     'label',             h.label,
                     'age_edit',          x.age_edit,
                     'sex_edit',          x.sex_edit,
                     'mce_age_condition', x.mce_age_condition
                   )
                   order by substr(h.hcc_code, 4)::integer
                 )
          from icd_hcc_map x
          join hcc_categories h on h.id = x.hcc_category_id
          where x.icd10_code_id = m.id
        ),
        '[]'::jsonb
      ) as hccs
    from matched m
  )
  select w.code, w.description, w.hccs
  from with_hcc w
  where not hcc_only or w.hccs <> '[]'::jsonb
  order by w.tier, w.sim desc, length(w.code), w.code
  limit least(greatest(coalesce(result_limit, 20), 1), 100);
$$;

grant execute on function public.icd10_dotted(text) to anon, authenticated, service_role;
grant execute on function public.search_icd10_codes(text, smallint, boolean, integer) to authenticated, service_role;
revoke execute on function public.search_icd10_codes(text, smallint, boolean, integer) from public, anon;


-- ---------------------------------------------------------------------------
-- Attempts: database-clocked start, one open attempt per chart
-- ---------------------------------------------------------------------------

revoke insert on public.attempts from authenticated;
grant insert (user_id, chart_id, mode) on public.attempts to authenticated;

create unique index attempts_one_open_per_chart
  on public.attempts (user_id, chart_id)
  where submitted_at is null;

alter table public.attempt_results
  add column breakdown jsonb not null default '{}'::jsonb;

comment on column public.attempt_results.breakdown is
  'Scoring snapshot (lib/scoring AttemptScore + code review), written once at submission.';


-- ---------------------------------------------------------------------------
-- Submission
-- ---------------------------------------------------------------------------

create or replace function public.submit_scored_attempt(
  p_attempt_id uuid,
  p_user_id    uuid,
  p_codes      jsonb,
  p_result     jsonb
)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_started_at   timestamptz;
  v_submitted_at timestamptz := now();
begin
  -- Lock the attempt so a concurrent draft save or a second submit waits.
  select started_at into v_started_at
  from public.attempts
  where id = p_attempt_id and user_id = p_user_id and submitted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Attempt not found, not yours, or already submitted.';
  end if;

  -- The submitted list is authoritative; draft rows are replaced.
  delete from public.attempt_codes where attempt_id = p_attempt_id;
  insert into public.attempt_codes (attempt_id, icd10_code, supporting_excerpt, user_rationale)
  select
    p_attempt_id,
    c ->> 'icd10_code',
    nullif(c ->> 'supporting_excerpt', ''),
    nullif(c ->> 'user_rationale', '')
  from jsonb_array_elements(p_codes) as c;

  update public.attempts
  set submitted_at     = v_submitted_at,
      duration_seconds = greatest(0, floor(extract(epoch from (v_submitted_at - v_started_at))))::integer
  where id = p_attempt_id;

  insert into public.attempt_results (
    attempt_id, captured, missed, over_coded, precision, recall,
    raf_user, raf_key, raf_delta, score_pct, breakdown
  )
  values (
    p_attempt_id,
    array(select jsonb_array_elements_text(p_result -> 'captured')),
    array(select jsonb_array_elements_text(p_result -> 'missed')),
    array(select jsonb_array_elements_text(p_result -> 'over_coded')),
    (p_result ->> 'precision')::numeric,
    (p_result ->> 'recall')::numeric,
    (p_result ->> 'raf_user')::numeric,
    (p_result ->> 'raf_key')::numeric,
    (p_result ->> 'raf_delta')::numeric,
    (p_result ->> 'score_pct')::numeric,
    coalesce(p_result -> 'breakdown', '{}'::jsonb)
  );

  return v_submitted_at;
end;
$$;

-- Supabase grants new functions to anon and authenticated by default.
revoke execute on function public.submit_scored_attempt(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant  execute on function public.submit_scored_attempt(uuid, uuid, jsonb, jsonb) to service_role;
