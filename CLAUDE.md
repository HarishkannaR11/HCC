# CLAUDE.md — Chartwise

Project memory. Read fully before acting, then read `DECISIONS.md`.

## What this is
A practice and quality-assurance tool for Medicare Advantage risk adjustment
(HCC) coders. A user opens a **synthetic** chart, assigns ICD-10-CM codes,
submits, and is scored against an expert answer key: HCCs captured, missed,
over-coded, and RAF delta after hierarchy trimming. Target user: a coder with
~3 years of HCC experience, or one preparing for a risk adjustment
certification exam.

## Non-negotiables
1. **Synthetic charts only**, in every environment, including test fixtures.
   Enforced by `CHECK (is_synthetic = true)`, `SYN-` MRNs, and the admin form.
2. **No CPT codes or descriptors** anywhere (code, DB, seeds, copy). ICD-10-CM
   and CMS-HCC only. `scripts/__tests__/compliance.test.ts` greps for it.
3. **No claim of affiliation with AAPC or AHIMA.** Allowed: "risk adjustment
   coding practice", "aligned to the CRC exam domains". Nothing that looks like
   a credential.
4. **Scoring is deterministic table lookup.** No LLM in the scoring path, ever.
5. **The answer key never reaches the client before submission.** No learner
   RLS policy exists on `answer_key_items` or `distractors`.

## Working rules
- Build in phases; **stop at the end of each phase for review**. Never start
  the next phase unasked. Never expand scope.
- Ambiguity: pick the simplest defensible option, log it in `DECISIONS.md` with
  one line of reasoning, keep going. Ask only for irreversible choices.
- Do not refactor earlier-phase code unless it blocks the current phase.
- No `any`. Generated Supabase types (`npm run db:types`). zod at every input
  boundary. Server actions for mutations, with the role re-checked in each.
- Service role only via `src/lib/supabase/service-role.ts` (`server-only`).
  `npm run build` fails if a secret reaches `.next/static`.
- Out of scope: teams/orgs, mobile app, leaderboards, social, chat tutor,
  email courses, in-app AI chart generation.

## Stack
Next.js 16 App Router (TS strict; `src/proxy.ts` is the renamed middleware) ·
Supabase Postgres/Auth/RLS (`@supabase/ssr`) · Tailwind v4 + shadcn-style
components in `src/components/ui` · zod · Vitest · Vercel. Billing (Phase 4)
goes through a merchant-of-record provider behind `lib/billing` (billing from
India to US customers, so no US-entity requirement).

## Data model (see supabase/migrations)
- Reference, versioned by `payment_year`: `payment_years`, `icd10_codes`,
  `hcc_categories` (CNA coefficient, `hierarchy_group`, `hierarchy_rank`),
  `hcc_hierarchy` (explicit CMS suppression pairs; **trim with these**),
  `icd_hcc_map` (with CMS age/sex/MCE edits).
- Content: `charts` (synthetic patient header, DOB/sex drive edits),
  `chart_sections`, `answer_key_items`, `distractors` (both with `trap_type`).
- Attempts: `attempts`, `attempt_codes`, `attempt_results` (HCC-code arrays).
- Account: `profiles` (role via `npm run admin:grant` only), `subscriptions`,
  `daily_activity`.

## Domain notes the engine depends on
- PY2026 = CMS-HCC **V28**; dates of service in 2025.
- Hierarchy: within a family a more severe HCC suppresses a milder one. V28 is
  **not** always a chain (HCC180 > 182 and 180 > 253, but 182 and 253 are
  incomparable), so use the pairs table, judged against the pre-trim set.
- V28 HCC223 counts only alongside another HF HCC: confirm and encode in Phase 2.
- Some codes change HCC by age/sex (C50.912: HCC22 <50, HCC23 ≥50).

## Build order
1. **Foundations** (done): schema, RLS, auth (email + Google), admin chart and
   answer-key CRUD, PY2026 seed, 3 synthetic charts, RLS integration tests.
2. **Practice loop**: encoder (split pane, typeahead, trimmed running RAF,
   evidence highlighting, rationale, keyboard-first), `lib/scoring/` pure
   engine with tests before the result screen, result screen.
3. **Progress**: dashboard, streaks, per-trap weakness, recommendation, timed mode.
4. **Monetization**: 5 free charts, paywall, checkout, webhooks, `/billing`.
5. **Audit mode + hardening**: audit mode, error boundaries, search rate
   limits, Sentry, landing SEO, legal pages.

## Commands
`npm run db:start` · `db:reset` · `db:seed` (official files in `data/raw`) ·
`db:seed:fixture` · `data:verify` · `admin:grant -- <email>` · `test` ·
`test:rls` · `typecheck` · `lint` · `build`. Hosted migrations use the session
pooler URI (`npx supabase db push --db-url "$DATABASE_URL"`). Requires Node 22+.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
