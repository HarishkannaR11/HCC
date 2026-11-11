-- Content: charts, their sections, answer keys and distractors.
--
-- Hard rules enforced here rather than trusted to application code:
--   * every chart is synthetic (CHECK is_synthetic = true, SYN- MRNs);
--   * answer_key_items and distractors are invisible to every non-admin API
--     caller. Learners only ever see them through a server action after they
--     have submitted an attempt (Phase 2).


create type public.chart_status as enum ('draft', 'published');
create type public.patient_sex as enum ('male', 'female');
create type public.section_type as enum (
  'hpi', 'ros', 'physical_exam', 'medications', 'labs', 'assessment_plan', 'signature'
);
create type public.trap_type as enum (
  'status_vs_history',
  'unsupported_linkage',
  'missing_acuity',
  'no_treatment_documented',
  'unspecified_when_specific_exists',
  'signature_or_date_missing',
  'none'
);


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


-- ---------------------------------------------------------------------------
-- charts
--
-- The patient, provider and facility on a chart are invented. The MRN format
-- (SYN-...) is a structural reminder: a real MRN pasted in fails the CHECK.
-- patient_dob and patient_sex exist because CMS age/sex edits decide which HCC
-- some codes land in (C50.011: HCC22 under 50, HCC23 at 50+).
-- ---------------------------------------------------------------------------
create table public.charts (
  id             uuid primary key default gen_random_uuid(),
  title          text     not null check (char_length(title) between 3 and 200),
  specialty      text     not null check (char_length(specialty) between 2 and 80),
  difficulty     smallint not null check (difficulty between 1 and 3),
  payment_year   smallint not null references public.payment_years (year) on delete restrict,
  encounter_date date     not null,
  is_synthetic   boolean  not null default true,
  status         public.chart_status not null default 'draft',
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),

  patient_name   text not null check (char_length(patient_name) between 2 and 120),
  patient_dob    date not null,
  patient_sex    public.patient_sex not null,
  patient_mrn    text not null,
  provider_name  text not null check (char_length(provider_name) between 2 and 120),
  facility_name  text not null check (char_length(facility_name) between 2 and 160),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint charts_must_be_synthetic check (is_synthetic = true),
  constraint charts_synthetic_mrn check (patient_mrn ~ '^SYN-[A-Z0-9-]{3,20}$'),
  constraint charts_dob_before_encounter check (patient_dob < encounter_date)
);

comment on table public.charts is 'Synthetic charts only. No real patient data, in any environment.';

create index charts_status_idx on public.charts (status, payment_year);

create trigger charts_set_updated_at
  before update on public.charts
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- chart_sections: one row per section type per chart.
-- ---------------------------------------------------------------------------
create table public.chart_sections (
  id           uuid primary key default gen_random_uuid(),
  chart_id     uuid not null references public.charts (id) on delete cascade,
  section_type public.section_type not null,
  content      text not null check (char_length(content) between 1 and 20000),
  sort_order   smallint not null check (sort_order >= 0),
  unique (chart_id, section_type)
);

create index chart_sections_chart_idx on public.chart_sections (chart_id, sort_order);


-- ---------------------------------------------------------------------------
-- answer_key_items: the expert answer. hcc_category_id is resolved server-side
-- from icd_hcc_map for the chart's synthetic patient (never typed by hand) and
-- is informational; scoring re-resolves every code through the map.
-- ---------------------------------------------------------------------------
create table public.answer_key_items (
  id                 uuid primary key default gen_random_uuid(),
  chart_id           uuid not null references public.charts (id) on delete cascade,
  icd10_code         text not null,
  hcc_category_id    bigint references public.hcc_categories (id) on delete restrict,
  is_required        boolean not null default true,
  supporting_excerpt text check (char_length(supporting_excerpt) <= 2000),
  rationale          text check (char_length(rationale) <= 4000),
  trap_type          public.trap_type not null default 'none',
  created_at         timestamptz not null default now(),
  unique (chart_id, icd10_code)
);

create index answer_key_items_chart_idx on public.answer_key_items (chart_id);


-- ---------------------------------------------------------------------------
-- distractors: plausible wrong codes, explained after submission.
--
-- trap_type is carried here as well as on the key because several traps are
-- codes the learner must NOT assign (no_treatment_documented: BMI 41 in the
-- vitals, never addressed), so the trap only exists as a distractor. Phase 3's
-- per-trap weakness breakdown reads both tables.
-- ---------------------------------------------------------------------------
create table public.distractors (
  id         uuid primary key default gen_random_uuid(),
  chart_id   uuid not null references public.charts (id) on delete cascade,
  icd10_code text not null,
  why_wrong  text not null check (char_length(why_wrong) between 1 and 4000),
  trap_type  public.trap_type not null default 'none',
  created_at timestamptz not null default now(),
  unique (chart_id, icd10_code)
);

create index distractors_chart_idx on public.distractors (chart_id);


-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- Every key or distractor code must be a billable ICD-10-CM code in the
-- chart's payment year, and a code cannot be both right and wrong on one chart.
create or replace function public.validate_chart_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_year     smallint;
  v_billable boolean;
  v_code_id  bigint;
begin
  new.icd10_code := public.icd10_dotted(new.icd10_code);

  select c.payment_year into v_year from public.charts c where c.id = new.chart_id;
  if v_year is null then
    raise exception 'Chart % does not exist', new.chart_id using errcode = 'foreign_key_violation';
  end if;

  select i.id, i.is_billable into v_code_id, v_billable
  from public.icd10_codes i
  where i.payment_year = v_year and i.code = new.icd10_code;

  if v_code_id is null then
    raise exception '% is not an ICD-10-CM code in payment year %', new.icd10_code, v_year
      using errcode = 'check_violation';
  end if;
  if not v_billable then
    raise exception '% is a category header, not a billable code', new.icd10_code
      using errcode = 'check_violation';
  end if;

  if tg_table_name = 'answer_key_items' then
    if exists (select 1 from public.distractors d where d.chart_id = new.chart_id and d.icd10_code = new.icd10_code) then
      raise exception '% is already a distractor on this chart', new.icd10_code using errcode = 'unique_violation';
    end if;
    if new.hcc_category_id is not null and not exists (
      select 1 from public.icd_hcc_map m
      where m.icd10_code_id = v_code_id and m.hcc_category_id = new.hcc_category_id
    ) then
      raise exception '% does not map to HCC id % in payment year %', new.icd10_code, new.hcc_category_id, v_year
        using errcode = 'check_violation';
    end if;
  else
    if exists (select 1 from public.answer_key_items a where a.chart_id = new.chart_id and a.icd10_code = new.icd10_code) then
      raise exception '% is already on the answer key for this chart', new.icd10_code using errcode = 'unique_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger answer_key_items_validate
  before insert or update on public.answer_key_items
  for each row execute function public.validate_chart_code();

create trigger distractors_validate
  before insert or update on public.distractors
  for each row execute function public.validate_chart_code();


-- A chart can only be published with something to score against.
create or replace function public.enforce_publishable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not exists (select 1 from public.answer_key_items a where a.chart_id = new.id and a.is_required) then
      raise exception 'Add at least one required answer key code before publishing'
        using errcode = 'check_violation';
    end if;
    if not exists (
      select 1 from public.chart_sections s
      where s.chart_id = new.id and s.section_type = 'assessment_plan'
    ) then
      raise exception 'Add an Assessment & Plan section before publishing'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger charts_enforce_publishable
  before insert or update of status on public.charts
  for each row execute function public.enforce_publishable();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.charts           enable row level security;
alter table public.chart_sections   enable row level security;
alter table public.answer_key_items enable row level security;
alter table public.distractors      enable row level security;

-- Learners see published charts; admins see everything.
create policy "read published charts" on public.charts
  for select to authenticated
  using (status = 'published' or (select public.is_admin()));

create policy "admins write charts" on public.charts
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

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
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Answer keys and distractors: admins only. There is deliberately no learner
-- policy of any kind, so a learner's select returns zero rows by every API
-- path (direct select, resource embedding from charts, filters, counts).
create policy "admins only" on public.answer_key_items
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "admins only" on public.distractors
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.charts, public.chart_sections, public.answer_key_items, public.distractors from anon;
revoke truncate, references, trigger
  on public.charts, public.chart_sections, public.answer_key_items, public.distractors
  from authenticated;
