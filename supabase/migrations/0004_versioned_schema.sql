-- 0004 — Product schema: payment-year-versioned reference data, chart content,
-- answer keys, attempts, accounts, and row level security on every table.
--
-- What this replaces
-- ------------------
-- 0001's `codes`, `crosswalk`, `hcc_weights` and `hcc_hierarchy` were built for
-- PY2026 only. CMS republishes the model and the ICD-10-CM code set every year,
-- so every reference row now carries the payment year it belongs to. Rows that
-- 0001 loaded are copied across as payment year 2026 (V28) — no reload needed —
-- and the old tables are dropped.
--
-- 0002's `charts` / `chart_expected_codes` are superseded by `charts`,
-- `chart_sections`, `answer_key_items` and `distractors`. They are dropped only
-- if they are empty; authored content is never silently discarded.
--
-- Hierarchy trimming
-- ------------------
-- `hcc_hierarchy` keeps CMS's published suppression pairs and is the source of
-- truth for trimming. `hcc_categories.hierarchy_group` / `hierarchy_rank` are
-- descriptive (grouping for dashboards, ordering for display): four of the 21
-- multi-HCC V28 families are not strict chains — HCC78 and HCC80 share a family
-- and neither suppresses the other — so "highest rank in the group wins" would
-- drop HCCs CMS pays. See DECISIONS.md.


-- ===========================================================================
-- 0. Guard authored content and move the PY2026-only tables aside.
-- ===========================================================================

do $$
begin
  if to_regclass('public.chart_expected_codes') is not null
     and exists (select 1 from public.chart_expected_codes) then
    raise exception 'chart_expected_codes (0002) has rows. Export them before applying 0004 — it would drop them.';
  end if;
  if to_regclass('public.charts') is not null
     and exists (select 1 from public.charts) then
    raise exception 'charts (0002) has rows. Export them before applying 0004 — it would drop them.';
  end if;
end $$;

drop table if exists public.chart_expected_codes;
drop table if exists public.charts;

-- search_codes reads the 0001 tables; its replacement is search_icd10_codes below.
drop function if exists public.search_codes(text, boolean, integer);

-- A separate schema rather than a rename: the 0001 index and primary-key names
-- (hcc_hierarchy_pkey, ...) would otherwise collide with the new tables'.
create schema legacy_0001;
alter table if exists public.hcc_hierarchy set schema legacy_0001;
alter table if exists public.crosswalk     set schema legacy_0001;
alter table if exists public.hcc_weights   set schema legacy_0001;
alter table if exists public.codes         set schema legacy_0001;


-- ===========================================================================
-- 1. Enums
-- ===========================================================================

create type public.app_role      as enum ('learner', 'admin');
create type public.chart_status  as enum ('draft', 'published');
create type public.patient_sex   as enum ('male', 'female');
create type public.attempt_mode  as enum ('practice', 'timed', 'audit');

create type public.section_type as enum (
  'chief_complaint',
  'hpi',
  'past_medical_history',
  'ros',
  'physical_exam',
  'medications',
  'labs',
  'assessment_plan',
  'addendum',
  'signature'
);

-- The teaching content: which documentation trap an answer-key item or a
-- distractor is built around.
create type public.trap_type as enum (
  'status_vs_history',
  'unsupported_linkage',
  'missing_acuity',
  'no_treatment_documented',
  'unspecified_when_specific_exists',
  'signature_or_date_missing',
  'none'
);


-- ===========================================================================
-- 2. Shared trigger helpers
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ===========================================================================
-- 3. Reference data, versioned by payment year
-- ===========================================================================

create table public.payment_years (
  year              smallint    primary key check (year between 2020 and 2100),
  hcc_model_version text        not null check (hcc_model_version ~ '^V[0-9]+$'),
  is_active         boolean     not null default false,
  created_at        timestamptz not null default now()
);

comment on table public.payment_years is
  'One row per CMS payment year loaded. PY2026 = CMS-HCC V28 at 100%, scored on 2025 dates of service.';


create table public.icd10_codes (
  id           bigint   generated always as identity primary key,
  payment_year smallint not null references public.payment_years (year) on delete cascade,
  code         text     not null check (code ~ '^[A-Z][A-Z0-9]{2}(\.[A-Z0-9]{1,4})?$'),
  description  text     not null,
  chapter      text,
  is_billable  boolean  not null,
  unique (payment_year, code),
  unique (id, payment_year)            -- target for same-year composite foreign keys
);

comment on column public.icd10_codes.code is 'Canonical dotted form, e.g. E11.22.';

create index icd10_codes_prefix_idx      on public.icd10_codes (payment_year, code text_pattern_ops);
create index icd10_codes_description_idx on public.icd10_codes using gin (description gin_trgm_ops);


create table public.hcc_categories (
  id            bigint   generated always as identity primary key,
  payment_year  smallint not null references public.payment_years (year) on delete cascade,
  hcc_code      text     not null check (hcc_code ~ '^HCC[0-9]+$'),
  hcc_number    integer  generated always as (substr(hcc_code, 4)::integer) stored,
  label         text     not null,

  -- CMS "Community, Non-dual, Aged" relative factor: the reference weight for a
  -- coder-facing tool. The other published segments are kept for later use.
  raf_community_nondual numeric(6,3) not null,
  coef_community_pba    numeric(6,3),   -- partial-benefit dual, aged
  coef_community_fba    numeric(6,3),   -- full-benefit dual, aged
  coef_community_nd     numeric(6,3),   -- non-dual, disabled
  coef_community_pbd    numeric(6,3),   -- partial-benefit dual, disabled
  coef_community_fbd    numeric(6,3),   -- full-benefit dual, disabled
  coef_institutional    numeric(6,3),

  -- Descriptive only; trimming reads hcc_hierarchy. A group is a connected
  -- component of the suppression graph; rank 1 is suppressed by nothing.
  hierarchy_group text     not null,
  hierarchy_rank  smallint not null check (hierarchy_rank >= 1),

  unique (payment_year, hcc_code),
  unique (payment_year, hcc_number),
  unique (id, payment_year)
);

create index hcc_categories_group_idx on public.hcc_categories (payment_year, hierarchy_group);


-- One row per (severe HCC, HCC it suppresses), exactly as CMS publishes them,
-- already transitively expanded: HCC326 lists 327, 328 and 329 directly.
create table public.hcc_hierarchy (
  payment_year               smallint not null,
  hcc_category_id            bigint   not null,
  suppressed_hcc_category_id bigint   not null,
  primary key (hcc_category_id, suppressed_hcc_category_id),
  foreign key (hcc_category_id, payment_year)
    references public.hcc_categories (id, payment_year) on delete cascade,
  foreign key (suppressed_hcc_category_id, payment_year)
    references public.hcc_categories (id, payment_year) on delete cascade,
  constraint hcc_hierarchy_no_self_suppression check (hcc_category_id <> suppressed_hcc_category_id)
);

create index hcc_hierarchy_suppressed_idx on public.hcc_hierarchy (suppressed_hcc_category_id);


-- ICD-10-CM -> HCC. A code can map to two HCCs; the CMS age/sex edits decide
-- which apply to a given patient (C50.011 is HCC22 under 50, HCC23 at 50+).
create table public.icd_hcc_map (
  payment_year      smallint not null,
  icd10_code_id     bigint   not null,
  hcc_category_id   bigint   not null,
  age_edit          text,    -- e.g. 'age >= 50'
  sex_edit          text,    -- CMS sex code as published: '1.0' male, '2.0' female
  mce_age_condition text,    -- Medicare Code Editor age band
  primary key (icd10_code_id, hcc_category_id),
  foreign key (icd10_code_id, payment_year)
    references public.icd10_codes (id, payment_year) on delete cascade,
  foreign key (hcc_category_id, payment_year)
    references public.hcc_categories (id, payment_year) on delete cascade
);

create index icd_hcc_map_hcc_idx  on public.icd_hcc_map (hcc_category_id);
create index icd_hcc_map_year_idx on public.icd_hcc_map (payment_year);


-- ---------------------------------------------------------------------------
-- Carry PY2026 rows over from the 0001 tables, if they were loaded.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('legacy_0001.codes') is null then
    return;
  end if;

  if exists (select 1 from legacy_0001.codes) then
    insert into public.payment_years (year, hcc_model_version, is_active)
    values (2026, 'V28', true)
    on conflict (year) do nothing;

    insert into public.icd10_codes (payment_year, code, description, chapter, is_billable)
    select 2026, icd10_code, description, chapter, is_billable
    from legacy_0001.codes;

    insert into public.hcc_categories (
      payment_year, hcc_code, label, raf_community_nondual,
      coef_community_pba, coef_community_fba, coef_community_nd,
      coef_community_pbd, coef_community_fbd, coef_institutional,
      hierarchy_group, hierarchy_rank
    )
    select
      2026, 'HCC' || w.hcc_category, w.label, w.coef_community_na,
      w.coef_community_pba, w.coef_community_fba, w.coef_community_nd,
      w.coef_community_pbd, w.coef_community_fbd, w.coef_institutional,
      w.disease_family,
      1 + (select count(*) from legacy_0001.hcc_hierarchy h where h.suppressed_hcc = w.hcc_category)
    from legacy_0001.hcc_weights w;

    insert into public.hcc_hierarchy (payment_year, hcc_category_id, suppressed_hcc_category_id)
    select 2026, parent.id, child.id
    from legacy_0001.hcc_hierarchy h
    join public.hcc_categories parent on parent.payment_year = 2026 and parent.hcc_number = h.hcc_category
    join public.hcc_categories child  on child.payment_year  = 2026 and child.hcc_number  = h.suppressed_hcc;

    insert into public.icd_hcc_map (payment_year, icd10_code_id, hcc_category_id, age_edit, sex_edit, mce_age_condition)
    select 2026, c.id, hc.id, x.age_edit, x.sex_edit, x.mce_age_condition
    from legacy_0001.crosswalk x
    join public.icd10_codes    c  on c.payment_year  = 2026 and c.code = x.icd10_code
    join public.hcc_categories hc on hc.payment_year = 2026 and hc.hcc_number = x.hcc_category;
  end if;
end $$;

drop schema legacy_0001 cascade;


-- ---------------------------------------------------------------------------
-- search_icd10_codes: the typeahead behind the encoder and the admin editor.
--
-- Public reference data only — nothing here depends on a chart, so no answer
-- key can leak through it. Same ranking as 0003's search_codes: exact code,
-- then code prefix, then description similarity; shorter codes win ties.
-- ---------------------------------------------------------------------------
create or replace function public.search_icd10_codes(
  q              text,
  p_payment_year smallint,
  hcc_only       boolean default false,
  result_limit   integer default 25
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
                   jsonb_build_object('hcc_code', h.hcc_code, 'label', h.label)
                   order by h.hcc_number
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
  limit least(greatest(coalesce(result_limit, 25), 1), 100);
$$;


-- ===========================================================================
-- 4. Accounts
-- ===========================================================================

create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  full_name  text        check (char_length(full_name) <= 120),
  role       public.app_role not null default 'learner',
  created_at timestamptz not null default now()
);

-- Every new auth user gets a learner profile. The role is never read from
-- user metadata: sign-up metadata is user-controlled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), 120), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security definer so policies can call it without recursing through
-- profiles' own RLS. Reads only the caller's own row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated, service_role;


create table public.subscriptions (
  user_id              uuid        primary key references public.profiles (id) on delete cascade,
  provider             text        not null,
  provider_customer_id text,
  plan                 text        not null,
  -- Provider statuses are normalised into this set by lib/billing.
  status               text        not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
  current_period_end   timestamptz,
  updated_at           timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();


create table public.daily_activity (
  user_id          uuid    not null references public.profiles (id) on delete cascade,
  activity_date    date    not null,
  charts_completed integer not null default 0 check (charts_completed >= 0),
  primary key (user_id, activity_date)
);


-- ===========================================================================
-- 5. Chart content
-- ===========================================================================

create table public.charts (
  id             uuid        primary key default gen_random_uuid(),
  title          text        not null check (char_length(title) between 3 and 200),
  specialty      text        not null check (char_length(specialty) between 2 and 80),
  difficulty     smallint    not null check (difficulty between 1 and 3),
  payment_year   smallint    not null references public.payment_years (year),
  encounter_date date        not null,

  -- Synthetic header. Every value is invented; see charts_must_be_synthetic.
  patient_name   text        not null check (char_length(patient_name) between 2 and 120),
  patient_dob    date        not null,
  patient_sex    public.patient_sex not null,
  patient_mrn    text        not null check (char_length(patient_mrn) between 2 and 40),
  provider_name  text        not null check (char_length(provider_name) between 2 and 120),
  facility_name  text        not null check (char_length(facility_name) between 2 and 120),

  is_synthetic   boolean     not null default true,
  status         public.chart_status not null default 'draft',
  created_by     uuid        default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,

  constraint charts_must_be_synthetic check (is_synthetic = true),
  constraint charts_dob_before_encounter check (patient_dob < encounter_date)
);

comment on table public.charts is
  'Synthetic practice charts only. No real patient data may be stored here, in any environment.';

create index charts_published_idx on public.charts (status, payment_year, difficulty);

create trigger charts_set_updated_at
  before update on public.charts
  for each row execute function public.set_updated_at();

-- published_at follows status; a chart's payment year is frozen once it has an
-- answer key, because every key code was validated against that year.
create or replace function public.charts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;

  if tg_op = 'UPDATE' and new.payment_year <> old.payment_year and (
       exists (select 1 from public.answer_key_items where chart_id = new.id)
    or exists (select 1 from public.distractors      where chart_id = new.id)
  ) then
    raise exception using
      errcode = '23514',
      message = 'Payment year cannot change once the chart has answer-key items or distractors.';
  end if;

  return new;
end;
$$;


create table public.chart_sections (
  id           uuid    primary key default gen_random_uuid(),
  chart_id     uuid    not null references public.charts (id) on delete cascade,
  section_type public.section_type not null,
  content      text    not null check (char_length(content) between 1 and 20000),
  sort_order   integer not null check (sort_order >= 0),
  constraint chart_sections_order_unique unique (chart_id, sort_order) deferrable initially deferred
);


-- The answer key. Never readable by a learner except through
-- get_attempt_answer_key(), after that learner has submitted that attempt.
create table public.answer_key_items (
  id                 uuid    primary key default gen_random_uuid(),
  chart_id           uuid    not null references public.charts (id) on delete cascade,
  icd10_code         text    not null,
  -- The HCC this code captures for this chart's patient, derived server-side
  -- from icd_hcc_map and the CMS edits. Display convenience: scoring re-derives
  -- every HCC from the map and never trusts this column.
  hcc_category_id    bigint  references public.hcc_categories (id) on delete set null,
  -- false = acceptable but optional: neither a miss when absent nor an
  -- over-code when present.
  is_required        boolean not null default true,
  supporting_excerpt text    check (char_length(supporting_excerpt) <= 2000),
  rationale          text    check (char_length(rationale) <= 4000),
  trap_type          public.trap_type not null default 'none',
  created_at         timestamptz not null default now(),
  constraint answer_key_items_code_unique unique (chart_id, icd10_code)
);


-- Plausible wrong codes, shown with their explanation after submission.
create table public.distractors (
  id         uuid primary key default gen_random_uuid(),
  chart_id   uuid not null references public.charts (id) on delete cascade,
  icd10_code text not null,
  why_wrong  text not null check (char_length(why_wrong) between 1 and 4000),
  trap_type  public.trap_type not null default 'none',
  created_at timestamptz not null default now(),
  constraint distractors_code_unique unique (chart_id, icd10_code)
);


-- Every key and distractor code must be a billable code in the chart's payment
-- year, and a code cannot be both right and wrong on the same chart.
create or replace function public.validate_chart_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_year    smallint;
  v_code_id bigint;
begin
  select payment_year into v_year from public.charts where id = new.chart_id;
  if v_year is null then
    raise exception using errcode = '23503', message = 'Chart not found.';
  end if;

  select id into v_code_id
  from public.icd10_codes
  where payment_year = v_year and code = new.icd10_code and is_billable;

  if v_code_id is null then
    raise exception using
      errcode = '23514',
      message = format('%s is not a billable ICD-10-CM code for payment year %s.', new.icd10_code, v_year);
  end if;

  if tg_table_name = 'answer_key_items' then
    if new.hcc_category_id is not null and not exists (
      select 1 from public.icd_hcc_map
      where icd10_code_id = v_code_id and hcc_category_id = new.hcc_category_id
    ) then
      raise exception using
        errcode = '23514',
        message = format('%s does not map to that HCC in payment year %s.', new.icd10_code, v_year);
    end if;

    if exists (select 1 from public.distractors where chart_id = new.chart_id and icd10_code = new.icd10_code) then
      raise exception using
        errcode = '23505',
        message = format('%s is already a distractor on this chart.', new.icd10_code);
    end if;
  else
    if exists (select 1 from public.answer_key_items where chart_id = new.chart_id and icd10_code = new.icd10_code) then
      raise exception using
        errcode = '23505',
        message = format('%s is already on this chart''s answer key.', new.icd10_code);
    end if;
  end if;

  return new;
end;
$$;

create trigger charts_guard
  before insert or update on public.charts
  for each row execute function public.charts_guard();

create trigger answer_key_items_validate
  before insert or update on public.answer_key_items
  for each row execute function public.validate_chart_code();

create trigger distractors_validate
  before insert or update on public.distractors
  for each row execute function public.validate_chart_code();


-- ===========================================================================
-- 6. Attempts
--
-- Learners read their own attempts and nothing else. Every write — starting,
-- submitting, scoring — goes through a server action that authenticates the
-- user and uses the service role, so a learner can never forge a submission
-- or a score through the Data API.
-- ===========================================================================

create table public.attempts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  chart_id         uuid        not null references public.charts (id) on delete cascade,
  mode             public.attempt_mode not null default 'practice',
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  duration_seconds integer     check (duration_seconds >= 0),
  constraint attempts_submitted_after_start check (submitted_at is null or submitted_at >= started_at)
);

create index attempts_user_idx  on public.attempts (user_id, submitted_at desc);
create index attempts_chart_idx on public.attempts (chart_id);


create table public.attempt_codes (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.attempts (id) on delete cascade,
  icd10_code         text not null,
  supporting_excerpt text check (char_length(supporting_excerpt) <= 2000),
  user_rationale     text check (char_length(user_rationale) <= 2000),
  constraint attempt_codes_unique unique (attempt_id, icd10_code)
);


create table public.attempt_results (
  attempt_id uuid          primary key references public.attempts (id) on delete cascade,
  captured   integer       not null check (captured >= 0),
  missed     integer       not null check (missed >= 0),
  over_coded integer       not null check (over_coded >= 0),
  precision  numeric(5,4)  not null check (precision between 0 and 1),
  recall     numeric(5,4)  not null check (recall between 0 and 1),
  raf_user   numeric(7,3)  not null,
  raf_key    numeric(7,3)  not null,
  raf_delta  numeric(7,3)  not null,
  score_pct  numeric(5,2)  not null check (score_pct between 0 and 100),
  scored_at  timestamptz   not null default now()
);


-- The only door to an answer key for a learner: their own attempt, already
-- submitted. Security definer because answer_key_items has no learner policy.
create or replace function public.get_attempt_answer_key(p_attempt_id uuid)
returns table (
  icd10_code         text,
  hcc_category_id    bigint,
  is_required        boolean,
  supporting_excerpt text,
  rationale          text,
  trap_type          public.trap_type
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.icd10_code, k.hcc_category_id, k.is_required, k.supporting_excerpt, k.rationale, k.trap_type
  from public.attempts a
  join public.answer_key_items k on k.chart_id = a.chart_id
  where a.id = p_attempt_id
    and a.user_id = (select auth.uid())
    and a.submitted_at is not null
  order by k.icd10_code;
$$;

create or replace function public.get_attempt_distractors(p_attempt_id uuid)
returns table (
  icd10_code text,
  why_wrong  text,
  trap_type  public.trap_type
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.icd10_code, d.why_wrong, d.trap_type
  from public.attempts a
  join public.distractors d on d.chart_id = a.chart_id
  where a.id = p_attempt_id
    and a.user_id = (select auth.uid())
    and a.submitted_at is not null
  order by d.icd10_code;
$$;

revoke execute on function public.get_attempt_answer_key(uuid)  from public, anon;
revoke execute on function public.get_attempt_distractors(uuid) from public, anon;
grant  execute on function public.get_attempt_answer_key(uuid)  to authenticated, service_role;
grant  execute on function public.get_attempt_distractors(uuid) to authenticated, service_role;


-- ===========================================================================
-- 7. Row level security — every table.
--
-- Supabase grants table privileges to anon and authenticated by default, so
-- RLS is the real gate. Anything that is not public reference data is also
-- revoked from anon outright, as a second lock.
-- ===========================================================================

alter table public.payment_years    enable row level security;
alter table public.icd10_codes      enable row level security;
alter table public.hcc_categories   enable row level security;
alter table public.hcc_hierarchy    enable row level security;
alter table public.icd_hcc_map      enable row level security;
alter table public.profiles         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.daily_activity   enable row level security;
alter table public.charts           enable row level security;
alter table public.chart_sections   enable row level security;
alter table public.answer_key_items enable row level security;
alter table public.distractors      enable row level security;
alter table public.attempts         enable row level security;
alter table public.attempt_codes    enable row level security;
alter table public.attempt_results  enable row level security;

revoke all on table
  public.profiles, public.subscriptions, public.daily_activity,
  public.charts, public.chart_sections, public.answer_key_items, public.distractors,
  public.attempts, public.attempt_codes, public.attempt_results
from anon;

-- TRUNCATE ignores RLS. No client path issues it today; take the privilege
-- away anyway so none ever can.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Reference data: public CMS/CDC tables, no PHI, read-only to clients. Writes
-- happen through the service role (which bypasses RLS) in the loader.
create policy "reference data is readable" on public.payment_years  for select to anon, authenticated using (true);
create policy "reference data is readable" on public.icd10_codes    for select to anon, authenticated using (true);
create policy "reference data is readable" on public.hcc_categories for select to anon, authenticated using (true);
create policy "reference data is readable" on public.hcc_hierarchy  for select to anon, authenticated using (true);
create policy "reference data is readable" on public.icd_hcc_map    for select to anon, authenticated using (true);

-- Profiles: read your own (admins read all); update your own name only.
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column privilege: the role column is not writable by any client role.
revoke update on table public.profiles from authenticated;
grant  update (full_name) on table public.profiles to authenticated;

create policy "read own subscription" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "read own activity" on public.daily_activity
  for select to authenticated using (user_id = (select auth.uid()));

-- Charts: learners see published charts; admins see and edit everything.
create policy "read published charts" on public.charts
  for select to authenticated
  using (status = 'published' or (select public.is_admin()));

create policy "admins insert charts" on public.charts
  for insert to authenticated with check ((select public.is_admin()));

create policy "admins update charts" on public.charts
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins delete charts" on public.charts
  for delete to authenticated using ((select public.is_admin()));

create policy "read sections of published charts" on public.chart_sections
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.charts c
      where c.id = chart_sections.chart_id and c.status = 'published'
    )
  );

create policy "admins write sections" on public.chart_sections
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Answer keys and distractors: admins only. There is deliberately no learner
-- policy; get_attempt_answer_key() is the single, gated read path.
create policy "admins manage answer keys" on public.answer_key_items
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins manage distractors" on public.distractors
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Attempts: read your own. No client write policies (see section 6).
create policy "read own attempts" on public.attempts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "read own attempt codes" on public.attempt_codes
  for select to authenticated
  using (exists (
    select 1 from public.attempts a
    where a.id = attempt_codes.attempt_id and a.user_id = (select auth.uid())
  ));

create policy "read own attempt results" on public.attempt_results
  for select to authenticated
  using (exists (
    select 1 from public.attempts a
    where a.id = attempt_results.attempt_id and a.user_id = (select auth.uid())
  ));
