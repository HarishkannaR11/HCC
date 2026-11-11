# CLAUDE.md — HCC Coding Practice Tool

Project memory for Claude Code. Read this fully before acting.

## What this is
A web app for practicing **HCC medical coding**: read a synthetic doctor chart,
assign the correct ICD-10-CM codes, get scored on accuracy and RAF impact.
It simulates the real-world workflow a risk-adjustment coder does at work.

Personal project (built for a working HCC coder to practice and stay sharp).
Keep the *code* professional; the motivational layer lives in the product
(streaks, accuracy dashboard, daily challenge), not in comments.

## Domain primer (do not skip — the logic depends on this)
- **ICD-10-CM**: the diagnosis code set. ~74k billable codes total.
- **HCC** (Hierarchical Condition Category): risk-adjustment groupings. Only a
  subset of ICD-10 codes "map to an HCC" and carry payment weight.
- **RAF** (Risk Adjustment Factor): each payment HCC carries a weight; summed
  per patient, it sets Medicare Advantage payment.
- **Model = CMS-HCC V28.** This is the current model (100% operative from
  Jan 1 2026, replacing V24). Build against V28 only.
  - ~7,770 ICD-10 codes map to **115 HCC categories** across 26 disease families.
  - **Hierarchy / constraining**: within a disease family, related HCCs are
    constrained, and a more severe HCC suppresses a less severe one so a
    condition is never counted twice. The scoring engine MUST apply this.
- **Coding errors to detect**: undercoding (missed a code), overcoding (added an
  unsupported one), wrong specificity.

## Data sources (all free, official — never scrape)
- ICD-10-CM valid codes + descriptions: **CMS FY2026 ICD-10-CM files** (tabular).
- ICD-10 → HCC crosswalk: **CMS PY2026 Model Software / ICD-10 Mappings (V28)**.
- RAF weights: **V28 coefficients from the 2026 Rate Announcement**.
- DO NOT scrape icd10data.com or the Optum Encoder. icd10data.com may be
  linked out to for human reference only.

## Stack
- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + zod** — frontend AND backend.
- **Supabase**: Postgres (data) + Auth (login/sessions).
- Scoring logic lives in pure functions (`lib/scoring/`), called server-side.
- Do NOT add a separate Python/FastAPI service yet. Only extract the scoring
  engine into FastAPI if its logic outgrows a route handler. Flag it first.

## Hard rules
1. **Answer keys never reach the client before submission.** `answer_key_items`
   and `distractors` have no learner RLS policy; the only read path is
   `get_attempt_answer_key()` / `get_attempt_distractors()` (own attempt, already
   submitted). Never select them into a learner page or response.
2. **Synthetic charts only.** No real patient data, ever, in any environment or
   fixture. `charts.is_synthetic` must be true (CHECK constraint).
3. **No CPT codes or descriptors** anywhere: product, database, seeds, copy.
4. **No AAPC/AHIMA affiliation claims.** "Risk adjustment coding practice" and
   "aligned to the CRC exam domains" are fine; "official", logos, credentials are not.
5. **Scoring is deterministic** table lookup. No LLM in the scoring path.
6. **V28 hierarchy is not optional** in RAF math, and it uses the CMS suppression
   pairs in `hcc_hierarchy` — not "highest rank in group" (see DECISIONS.md).
7. Server-side validation (zod) on every input; every Server Action re-checks auth.
8. Service-role key is server-only (`src/lib/supabase/service.ts`); the build
   fails if it reaches the client bundle.

## Data model (Postgres) — see supabase/migrations/0004_versioned_schema.sql
- Reference, versioned by `payment_year`: `payment_years`, `icd10_codes`,
  `hcc_categories` (`raf_community_nondual` = CNA), `hcc_hierarchy` (pairs),
  `icd_hcc_map` (with CMS age/sex/MCE edits).
- Content: `charts` (synthetic header, status draft|published), `chart_sections`,
  `answer_key_items` (trap_type), `distractors` (trap_type).
- Attempts: `attempts`, `attempt_codes`, `attempt_results` — learners read their
  own; all writes are server-side.
- Account: `profiles` (role learner|admin), `subscriptions`, `daily_activity`.

## Build order (stop after each phase for review)
1. Foundations — schema, RLS, auth, admin chart CRUD, seeds. (done)
2. Practice loop — encoder, scoring engine (`lib/scoring/`, tested first), results.
3. Progress — dashboard, streaks, trap-type weaknesses, timed mode.
4. Monetisation — free tier, merchant-of-record billing behind `lib/billing`.
5. Audit mode and hardening.

See `docs/build-plan.md` and `DECISIONS.md`.

## Migrations
- Schema changes are SQL files in `supabase/migrations/`, numbered `0001_`, `0002_`, ...
- Apply them with the session pooler URI (IPv4, port 5432) from `.env.local`:
  `npx supabase db push --db-url "$DATABASE_URL"`
- This is the standard path. The service-role key cannot run DDL, and the
  direct `db.<ref>.supabase.co` host is IPv6-only.
- `db push` applies *every* pending migration in the directory, so check what
  is pending before running it mid-phase.

## Node version
- **Requires Node 22 LTS or later** (`engines.node` in package.json).
  supabase-js builds a Realtime client on `createClient`, which needs a
  global `WebSocket`; Node 22 has one built in, Node 20 does not and throws
  at startup (route handlers would hit the same throw, not just scripts).
- Node 20 could limp along behind `--experimental-websocket`, but that was a
  workaround, not a fix — dropped once the project moved to Node 22.

## Conventions
- Build sequentially. Finish and verify a phase before starting the next.
- After each phase, run it and confirm the loop works end to end.
- Keep functions small; scoring logic pure and unit-tested.
- Ask before adding a new service, dependency, or irreversible schema change.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
