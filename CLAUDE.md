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
- **Next.js (App Router) + TypeScript + Tailwind** — frontend AND backend.
- **Supabase**: Postgres (data) + Auth (login/sessions).
- Scoring logic lives in Next.js **route handlers** (server-side).
- Do NOT add a separate Python/FastAPI service yet. Only extract the scoring
  engine into FastAPI if its logic outgrows a route handler. Flag it first.

## Hard rules
1. **Answer keys and scoring never reach the client.** The chart goes to the
   browser; the submitted codes come back; scoring happens on the server.
   Never send `expected_codes` in a chart-fetch response.
2. **Synthetic charts only.** No real patient data, ever. No PHI.
3. **V28 hierarchy is not optional** in RAF math.
4. Server-side validation on every input (empty submissions, invalid codes).

## Data model (Postgres)
- `codes` — icd10_code (PK), description, chapter, is_billable
- `crosswalk` — icd10_code (FK), hcc_category
- `hcc_weights` — hcc_category (PK), raf_weight, disease_family
- `hcc_hierarchy` — hcc_category, suppressed_hcc  (V28 suppression pairs)
- `charts` — id, title, body (JSONB: hpi, meds, labs, assessment…), difficulty
- `chart_expected_codes` — chart_id (FK), icd10_code  (the answer key)
- `attempts` — id, user_id, chart_id, submitted_at, score, raf_captured
- `attempt_codes` — attempt_id (FK), icd10_code, verdict (correct|missed|extra)

## Build order (one phase at a time — verify before moving on)
0. Data foundation: parse CMS files into `codes`, `crosswalk`, `hcc_weights`,
   `hcc_hierarchy`. Nothing else works without this.
1. Vertical slice: one hardcoded chart → code search → scoring route → result.
2. Scoring engine: correct / missed / extra + RAF with V28 hierarchy.
3. Auth + persistence: Supabase login, save attempts, dashboard (streak, accuracy).
4. Content + modes: chart authoring, difficulty, guided vs exam, daily challenge.

See `docs/build-plan.md` for the task breakdown of each phase.

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
