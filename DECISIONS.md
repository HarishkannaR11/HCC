# Decisions

Running log of choices the spec left open or that deviate from it. One line of
reasoning each. Newest phase at the bottom.

## Phase 1 — Foundations

### Repository and naming
- **Built in the existing `HarishkannaR11/HCC` repo** (Phase 0 "Chartwise"): it already had the CMS parser, the RAF engine and the encoder shell, all reusable.
- **Product name stays "Chartwise"**, defined once in `src/lib/brand.ts`: the spec leaves `<YOUR_PRODUCT_NAME>` open and this is a one-line change.

### Reference data
- **Phase 0 reference tables dropped and replaced** (`0004`): they were not versioned by payment year, and their contents are regenerated from the CMS files.
- **Hierarchy trimming uses CMS's explicit suppression pairs (`hcc_hierarchy`), not `hierarchy_group`/`hierarchy_rank` alone.** 4 of the 21 multi-HCC V28 groups are partial orders: HCC180 suppresses both 182 and 253, which do not suppress each other, so "keep the highest rank" would wrongly drop one. The spec's two columns are kept and populated: group = connected component, rank = depth (1 = most severe). They drive display and analytics.
- **Suppression is judged against the HCCs present before trimming**, the way CMS's software and public reimplementations apply the table. This only matters for V28's one non-transitive chain (62→63→202 without 62→202).
- **Open for Phase 2:** V28 counts HCC223 (heart assist device) only alongside another heart-failure HCC (221/222/224/225/226). This will be confirmed against the CMS software you supply and encoded in the engine.
- **CMS age/sex/MCE edits are kept on `icd_hcc_map`, and charts carry `patient_dob` and `patient_sex`.** The spec's map has no edits, but some codes change HCC with age (C50.912: HCC22 under 50, HCC23 at 50+), so dropping the edits would mis-score.
- **Patient age is computed at the encounter date** from the synthetic date of birth (whole years, date-only arithmetic).
- **`raf_community_nondual` = Community, Non-dual, Aged (CMS `CNA_`)**, the conventional reference segment for coder-facing tools.
- **The ICD-10-CM release loaded for PY2026 is CDC FY2026** (same files as Phase 0).
- **The loader writes over a direct Postgres connection in one transaction**, not through the Data API: the map is keyed by surrogate ids, so rows are inserted with joins, and a failed load rolls back cleanly.
- **Re-loading a year upserts codes and categories (stable ids) and rebuilds the map and hierarchy.** It fails if the new release drops a code an existing chart uses.
- **A small committed fixture (`data/fixtures/py2026`) in the exact CMS/CDC file formats** covers 92 codes and 45 HCCs (11 complete hierarchy groups). It powers the unit tests and local dev without the large official files. Values are from public copies of the PY2026 V28 tables and match the Phase 0 live checks. Production always loads the official files.

### Content model
- **Synthetic-only is enforced in three places:**
  - the DB `CHECK (is_synthetic = true)`;
  - a `CHECK` that MRNs match `SYN-…`, so a real MRN pasted in is rejected;
  - a warning plus a required confirmation box on the admin chart form.
- **The chart header carries invented patient name, DOB, MRN, provider and facility as columns**, as the spec's synthetic-data rule lists them.
- **`section_type` adds `signature` to the spec's six sections.** The `signature_or_date_missing` trap cannot be taught without one.
- **`distractors` also has `trap_type`.** Several traps are codes a learner must *not* assign (e.g. `no_treatment_documented`: BMI in the vitals, never addressed), so they only exist as distractors. Phase 3's per-trap breakdown needs it.
- **`answer_key_items.hcc_category_id` is resolved server-side** from the map for the chart's patient, never typed by the author. For the rare code that lands in two HCCs it stores the lowest-numbered one. It is display-only; scoring re-resolves every code through the full map.
- **`is_required = true` means omitting the code counts as a miss.** Optional items (e.g. Z79.01) are accepted when present and not penalised when absent. Misses on non-HCC codes will be reported as "no HCC impact".
- **Dates of service must fall in the payment year's service year** (PY2026 → 2025, zod), as in real MA risk adjustment.
- **Specialty is a fixed list in the app** (`SPECIALTIES`) and free text in the DB, so adding one needs no migration.
- **Codes are stored in dotted canonical form**; the validation trigger normalises `e1122` to `E11.22`.
- **More than one payment year may be active at once** (no uniqueness on `is_active`), so charts for adjacent years can coexist.
- **Publishing requires at least one required key code and an Assessment & plan** (DB trigger), plus verbatim supporting excerpts (server action), because Phase 2 compares excerpts with learner highlights.
- **Charts with learner attempts cannot be deleted** (FK `restrict`); unpublish instead.

### Attempts and scoring storage
- **`attempt_results.captured / missed / over_coded` are `text[]` of HCC codes**, not counts: the result screen and weakness analytics need *which* HCCs, and counts are `cardinality()`.
- **Learners can create attempts and edit their codes until submission, but cannot submit, score, or write results.** Phase 2's submit is a server action that scores deterministically and writes results with the service role, so no learner can forge a score.

### Security
- **Answer keys and distractors have no learner RLS policy of any kind** (admins only). Phase 2 reads them with the service role, only after verifying the attempt belongs to the caller and is submitted.
- **Admin role is granted only by `npm run admin:grant`** (direct DB). `profiles.role` is not updatable by any API role (column-level grant on `full_name` only), and signup metadata cannot set it.
- **Learners get a 404 on `/admin`**, not a 403, so the admin surface is not advertised.
- **The proxy (Next 16's renamed middleware) only refreshes the session and does optimistic redirects.** Real checks run in pages and actions (`getUser()`, server-verified) and again in RLS.
- **Service-role leak protection:**
  - `server-only` on the service-role client;
  - a `postbuild` scan of `.next/static` that fails the build on the key value, the variable name, `sb_secret_…` keys, or any JWT claiming `service_role`.
- **The RLS suite enables `pg_graphql` for its GraphQL test**: it is off in the local stack but may be on in a hosted project, and an always-empty result would prove nothing.

### Auth and UI
- **Google sign-in is wired but disabled in local `config.toml`**: the Supabase CLI refuses an enabled provider without credentials. It is configured in the dashboard for hosted environments (README).
- **Email confirmation is off locally and on in hosted Supabase** (its default). `/auth/confirm` handles the token-hash link.
- **shadcn/ui components are hand-written to shadcn's API** (cva variants, Radix `Slot`) on the existing design tokens: the shadcn registry was unreachable from the build environment. `components.json` is in place, so `npx shadcn add` works later.
- **Admin forms dispatch from `onSubmit`**, so React 19 does not wipe typed values after a failed validation. They still post natively without JavaScript.
- **`/practice` is a bare published-chart list in Phase 1** (the done-criterion needs it): no filters, and no links until the encoder exists.
- **`/` is a placeholder** until the landing page and pricing.
- **New charts are created at `/admin/charts/new`** (a static segment) rather than overloading `[id]`.
- **The Phase 0 mock encoder at `/practice/[chartId]` is untouched**, now behind login. Phase 2 replaces it.

### Noted, not changed (no-refactor rule)
- `src/lib/hcc/__tests__/raf.test.ts` uses 0.237 for HCC327. The PY2026 V28 table says **0.514** (the fixture and DB have 0.514). The test still passes because it only checks its own fixture. It will be corrected when Phase 2 builds `lib/scoring` and its tests.

## Phase 2 — Practice loop

### Base
- **Phase 2 builds on `phase-1-foundations`.** A parallel Phase 1 (`98363bc`) existed on the working branch. It is kept in history through a merge whose tree is exactly `phase-1-foundations`, so nothing was force-pushed or lost.

### Scoring (`src/lib/scoring/`)
- **The spec's six steps, exactly, with weights in `SCORE_WEIGHTS` (0.5 / 0.3 / 0.2).** The engine is pure, built on the Phase 0 RAF core (`src/lib/hcc/raf.ts`), and covered by hand-worked tests.
- **Step 2 trims with CMS's suppression pairs, on each side separately, before comparing** (see Phase 1). For example, coding I50.23 suppresses the key's HCC226 on the learner's side: HCC226 counts as missed and HCC224 as over-coded.
- **RAF accuracy with an HCC-free key** is 1 if the submission is also HCC-free, else 0. The spec's formula divides by the key's RAF, which would be zero.
- **Spec consequence, kept as written:** precision is 1 when the denominator is 0, so a submission with no HCCs at all scores 30%. Tune `SCORE_WEIGHTS` or the rule if that is too generous.
- **Optional key codes (`is_required = false`) are set aside entirely.** They are never a miss, never an over-code, and stay out of both RAFs.
- **A code-level review sits alongside the HCC score** (correct / optional / planted trap / not on the key / missed). Non-HCC specificity errors (I10 vs I12.9) are taught even though they cannot move the score. It also records the traps hit and avoided for Phase 3's weakness breakdown.
- **Patient age follows Phase 1's decision: whole years at the encounter.** CMS's software applies its edits at age on Feb 1 of the payment year. The two differ only within a year of an edit boundary (e.g. breast cancer at 50); flagged for review.

### Storage and security
- **`attempt_results.breakdown` (jsonb) snapshots the full scoring detail at submission.** The result screen renders from it, so every number stays reproducible even if the key or reference data change later. It is validated with zod on read.
- **`submit_scored_attempt()` writes the final codes, `submitted_at`, the duration and the result in one transaction.** It is service-role only. It locks the open attempt, so a concurrent draft save or double submit cannot interleave.
- **Every attempt timestamp comes from the database clock.** Learners may set only `user_id`, `chart_id` and `mode` when starting an attempt, so `started_at` can't be forged. Phase 3's timed mode can trust it.
- **One open attempt per learner per chart** (partial unique index). Reopening a chart resumes it.
- **The answer key is read only in the submit action and on the result screen**, with the service role, after confirming the attempt is the caller's own (and, on the result screen, submitted). No learner-callable path to it exists, as in Phase 1.
- **The typeahead is signed-in only.** `search_icd10_codes` is revoked from anon and `/api/codes` checks the session. Rate limiting is Phase 5.

### Encoder
- **Drafts live on the server** (`attempt_codes` of the open attempt, autosaved), not in the browser, so a reload or another device resumes. Highlights are rebuilt by finding the saved excerpt text in the note. Multiple snippets per code are joined with " … ".
- **The attempt, and its clock, starts with the first assigned code**, not when the page opens. A GET must not create rows, and abandoned page views should not count as attempts.
- **The running RAF in the tray runs the same engine over public reference data in the browser.** It never touches the key, and the server re-scores from scratch at submission.
- **MEAT tags from the Phase 0 draft encoder were dropped.** They were neither stored nor scored, and are a candidate for audit mode.
- **The evidence popover defaults to the most recently assigned code** (add a code, then highlight its support). Keys 1–9 pick another.
- **Practice list filters (specialty, difficulty, payment year, not yet scored) and best/last scores** come from the spec's route list. They needed no schema change.
