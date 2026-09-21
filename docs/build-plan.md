# Build plan

One phase at a time. Each phase ends at a **Verify** step; do not start the next
phase until that step passes.

## Phase 0 — Data foundation
Goal: the four reference tables are populated and queryable. No UI.

- [x] Init Next.js (App Router, TypeScript, Tailwind).
- [x] Acquire the official CMS/CDC source files (see `data/README.md`).
- [x] Create `codes`, `crosswalk`, `hcc_weights`, `hcc_hierarchy`.
- [x] Apply the migration to a Supabase project.
- [x] Parser: CDC FY2026 ICD-10-CM order file -> `codes`.
- [x] Parser: CMS PY2026 V28 ICD-10 mapping -> `crosswalk`.
- [x] Loader: V28 community coefficients -> `hcc_weights`.
- [x] Loader: V28 hierarchy pairs -> `hcc_hierarchy`.
- [x] Sanity check three codes: a diabetes code, a heart-failure code, an unmapped code.

**Verify:** PASSED live on 2026-09-21. `npm run data:verify` walks E11.9 -> HCC38 -> RAF 0.166,
the C50.011 age split, an unmapped code, and a hierarchy suppression baseline.

## Phase 1 — Vertical slice (one chart, no auth)
Goal: the full loop works for a single hardcoded chart.

- [ ] One hand-written sample chart with a realistic HPI and assessment.
- [ ] Chart view page. Expected codes must not appear in the payload.
- [ ] Code search box querying `codes` by code or description, debounced.
- [ ] Submit route handler accepting codes and returning a raw result.
- [ ] Result panel.

**Verify:** submit codes, see a response.

## Phase 2 — Scoring engine
Goal: correct scoring with V28 hierarchy. Pure, tested logic.

- [ ] `scoreSubmission(submitted, expected)`: correct / missed / extra.
- [ ] `computeRAF(capturedHccs)`: codes -> HCCs -> weights, suppression applied
      before summing. Never double-count a family.
- [ ] Per-chart explanation of why each expected code applies.
- [ ] Unit tests: exact match, one missed, one extra, a suppression case.

**Verify:** a chart with a known RAF returns exactly that RAF.

## Phase 3 — Auth + persistence
- [ ] Supabase Auth (email login).
- [ ] Persist `attempts` and `attempt_codes` per submission.
- [ ] Dashboard: charts done, accuracy %, streak, weak HCC families.

**Verify:** two sessions on one account show a continuous streak and accuracy.

## Phase 4 — Content + modes
- [ ] Admin: author a chart (paste note, tag expected codes + difficulty).
- [ ] Difficulty and HCC-family filters.
- [ ] Guided mode (hints) vs exam mode (timed, no hints).
- [ ] Daily challenge with streak tracking.

**Verify:** a full guided run and a full exam run on different charts.

## Charts and answer keys
The real bottleneck is content, not code. Loop: draft charts (templated or
LLM-generated) -> an experienced coder codes them -> those codes become
`chart_expected_codes`. The coder is ground truth. Target ~10 charts across
three difficulty levels before worrying about scale.
