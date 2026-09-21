-- Phase 1 — chart content and answer keys.
--
-- `charts` is the practice content: synthetic progress notes, no PHI ever.
-- `chart_expected_codes` is the answer key and is deliberately unreadable to
-- every client-facing role (hard rule 1: keys and scoring stay server-side).


-- ---------------------------------------------------------------------------
-- charts
--
-- `body` holds the note itself, shaped for rendering *and* for anchoring
-- evidence links:
--
--   {
--     "sections": [
--       { "id": "hpi", "heading": "History of present illness",
--         "kind": "prose" | "ordered",
--         "blocks": [ { "id": "hpi.0", "text": "72-year-old male with ..." } ] }
--     ],
--     "signature": "Electronically signed · [PROVIDER NAME], MD"
--   }
--
-- Every selectable run of text is a block with a stable id, so an evidence link
-- is (block id, start offset, end offset) and survives a re-render.
--
-- patient_age / patient_sex are columns rather than body fields because the
-- crosswalk's age and sex edits are evaluated against them server-side: the
-- same ICD-10 code can land in different HCCs depending on the patient.
-- ---------------------------------------------------------------------------
create table charts (
  id              text    primary key,     -- slug, e.g. 'dm-ckd-copd-72m'
  title           text    not null,
  body            jsonb   not null,
  difficulty      text    not null check (difficulty in ('introductory', 'intermediate', 'advanced')),

  patient_ref     text    not null,        -- synthetic label shown in the UI, e.g. 'PX-0142'
  patient_age     integer not null check (patient_age between 0 and 120),
  patient_sex     text    not null check (patient_sex in ('male', 'female')),
  date_of_service date    not null,
  visit_type      text    not null,        -- e.g. 'Face-to-face'

  hint            text,                    -- shown in guided mode only
  created_at      timestamptz not null default now()
);

comment on column charts.body is 'Synthetic note content only. No real patient data, ever.';


-- ---------------------------------------------------------------------------
-- chart_expected_codes: the answer key.
--
-- `supported_by` names the section of the note that supports the code, and
-- `rationale` explains why it applies. Both are for the post-submit result
-- screen; neither may be sent to the browser before scoring.
-- ---------------------------------------------------------------------------
create table chart_expected_codes (
  chart_id     text not null references charts (id)          on delete cascade,
  icd10_code   text not null references codes (icd10_code)   on delete restrict,
  supported_by text,
  rationale    text,
  primary key (chart_id, icd10_code)
);


-- ---------------------------------------------------------------------------
-- Charts are public reference content. Answer keys are not: RLS is enabled with
-- no select policy at all, so anon and authenticated roles cannot read a single
-- row even if a future query forgets to exclude the table. Only the service
-- role (which bypasses RLS) can see it, and it is only ever used from route
-- handlers.
-- ---------------------------------------------------------------------------
alter table charts               enable row level security;
alter table chart_expected_codes enable row level security;

create policy "charts are readable" on charts for select using (true);
-- Intentionally no policy on chart_expected_codes.
