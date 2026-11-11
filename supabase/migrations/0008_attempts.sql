-- Attempts: a learner's run at a chart, the codes they assigned, and the
-- deterministic score computed on submit (Phase 2).
--
-- Learners create attempts and edit their codes until submission. They cannot
-- submit, score, or edit results through the API: submission is a server
-- action that scores by table lookup and writes attempt_results with the
-- service role, so a learner can never write their own score.


create type public.attempt_mode as enum ('practice', 'timed', 'audit');

create table public.attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  chart_id         uuid not null references public.charts (id) on delete restrict,
  mode             public.attempt_mode not null default 'practice',
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  constraint attempts_submitted_after_start check (submitted_at is null or submitted_at >= started_at)
);

create index attempts_user_idx on public.attempts (user_id, submitted_at desc);
create index attempts_chart_idx on public.attempts (chart_id);


create table public.attempt_codes (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.attempts (id) on delete cascade,
  icd10_code         text not null check (icd10_code ~ '^[A-Z][A-Z0-9]{2}(\.[A-Z0-9]{1,4})?$'),
  supporting_excerpt text check (char_length(supporting_excerpt) <= 2000),
  user_rationale     text check (char_length(user_rationale) <= 2000),
  unique (attempt_id, icd10_code)
);


-- captured / missed / over_coded hold the HCC codes (e.g. {HCC37,HCC280})
-- after hierarchy trimming, so the result screen and the weakness analytics
-- read which HCCs, not just how many. Counts are cardinality().
create table public.attempt_results (
  attempt_id uuid primary key references public.attempts (id) on delete cascade,
  captured   text[] not null default '{}',
  missed     text[] not null default '{}',
  over_coded text[] not null default '{}',
  precision  numeric(5, 4) not null check (precision between 0 and 1),
  recall     numeric(5, 4) not null check (recall between 0 and 1),
  raf_user   numeric(7, 3) not null,
  raf_key    numeric(7, 3) not null,
  raf_delta  numeric(7, 3) not null,
  score_pct  numeric(5, 2) not null check (score_pct between 0 and 100),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.attempts        enable row level security;
alter table public.attempt_codes   enable row level security;
alter table public.attempt_results enable row level security;

create policy "read own attempts" on public.attempts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "start an attempt on a published chart" on public.attempts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and submitted_at is null
    and exists (select 1 from public.charts c where c.id = chart_id and c.status = 'published')
  );

create policy "read own attempt codes" on public.attempt_codes
  for select to authenticated
  using (exists (
    select 1 from public.attempts a
    where a.id = attempt_codes.attempt_id and a.user_id = (select auth.uid())
  ));

create policy "edit codes on own open attempt" on public.attempt_codes
  for all to authenticated
  using (exists (
    select 1 from public.attempts a
    where a.id = attempt_codes.attempt_id and a.user_id = (select auth.uid()) and a.submitted_at is null
  ))
  with check (exists (
    select 1 from public.attempts a
    where a.id = attempt_codes.attempt_id and a.user_id = (select auth.uid()) and a.submitted_at is null
  ));

create policy "read own results" on public.attempt_results
  for select to authenticated
  using (exists (
    select 1 from public.attempts a
    where a.id = attempt_results.attempt_id and a.user_id = (select auth.uid())
  ));

revoke all on public.attempts, public.attempt_codes, public.attempt_results from anon;
revoke update, delete, truncate, references, trigger on public.attempts from authenticated;
revoke truncate, references, trigger on public.attempt_codes from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.attempt_results from authenticated;
