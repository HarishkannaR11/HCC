-- 0010 — Phase 3: progress and timed mode.
--
-- * Streaks: every scored submission now counts towards daily_activity on the
--   learner's own local date (their browser's IANA time zone, remembered on
--   profiles.timezone). Phase 2 submissions are backfilled on UTC dates.
-- * Timed mode: a timed attempt's limit is set by the database from the
--   chart's difficulty when the attempt starts. Learners cannot set or change
--   it (they may insert only user_id, chart_id and mode), and started_at is
--   already database-clocked, so time on a timed chart cannot be forged.
-- * Audit mode is refused until Phase 5 builds it.


-- ---------------------------------------------------------------------------
-- Time zone for local-day streaks
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64);

comment on column public.profiles.timezone is
  'IANA zone the learner submits from; decides which local day a submission counts towards. Written by submit_scored_attempt.';


-- ---------------------------------------------------------------------------
-- Timed mode
-- ---------------------------------------------------------------------------

alter table public.attempts
  add column time_limit_seconds integer check (time_limit_seconds > 0);

-- Limits by difficulty. One place to tune them.
create or replace function public.timed_limit_seconds(p_difficulty smallint)
returns integer
language sql
immutable
as $$
  select case p_difficulty when 1 then 600 when 2 then 900 else 1200 end;
$$;

create or replace function public.attempts_apply_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_difficulty smallint;
begin
  if new.mode = 'audit' then
    raise exception using errcode = '22023', message = 'Audit mode is not available yet.';
  end if;

  if new.mode = 'timed' then
    select difficulty into v_difficulty from public.charts where id = new.chart_id;
    new.time_limit_seconds := public.timed_limit_seconds(v_difficulty);
  else
    new.time_limit_seconds := null;
  end if;
  return new;
end;
$$;

create trigger attempts_apply_mode
  before insert on public.attempts
  for each row execute function public.attempts_apply_mode();


-- ---------------------------------------------------------------------------
-- Submission now records the day's activity
-- ---------------------------------------------------------------------------

drop function if exists public.submit_scored_attempt(uuid, uuid, jsonb, jsonb);

create or replace function public.submit_scored_attempt(
  p_attempt_id uuid,
  p_user_id    uuid,
  p_codes      jsonb,
  p_result     jsonb,
  p_timezone   text
)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_started_at   timestamptz;
  v_submitted_at timestamptz := now();
  v_timezone     text;
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

  -- An unknown zone falls back to UTC rather than failing the submission.
  select name into v_timezone from pg_catalog.pg_timezone_names where name = p_timezone;
  v_timezone := coalesce(v_timezone, 'UTC');

  insert into public.daily_activity (user_id, activity_date, charts_completed)
  values (p_user_id, (v_submitted_at at time zone v_timezone)::date, 1)
  on conflict (user_id, activity_date)
  do update set charts_completed = public.daily_activity.charts_completed + 1;

  update public.profiles set timezone = v_timezone where id = p_user_id;

  return v_submitted_at;
end;
$$;

revoke execute on function public.submit_scored_attempt(uuid, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant  execute on function public.submit_scored_attempt(uuid, uuid, jsonb, jsonb, text) to service_role;


-- ---------------------------------------------------------------------------
-- Backfill: Phase 2 submissions, on UTC dates (their zones were not recorded).
-- ---------------------------------------------------------------------------

insert into public.daily_activity (user_id, activity_date, charts_completed)
select user_id, (submitted_at at time zone 'UTC')::date, count(*)
from public.attempts
where submitted_at is not null
group by 1, 2
on conflict (user_id, activity_date)
do update set charts_completed = excluded.charts_completed;
