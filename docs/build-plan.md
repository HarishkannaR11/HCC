# Build plan

The product spec is the master build prompt (Nov 2026). One phase at a time; each
phase stops for review before the next starts. Phase 0 (CMS data pipeline) was
completed under the earlier plan and is reused.

## Phase 0 — Data foundation (done, 2026-09-21)
CMS PY2026 V28 files parsed and loaded; `npm run data:verify` walks E11.9 → HCC38
→ 0.166, the C50.011 age split, an unmapped code and a suppression baseline.

## Phase 1 — Foundations
- [x] Supabase wiring: `@supabase/ssr` server client, server-only service client, `proxy.ts` session refresh, DAL.
- [x] Full schema with payment-year versioning (`0004_versioned_schema.sql`), carrying 0001's data across.
- [x] RLS on every table; answer keys readable only via the post-submission gate.
- [x] Auth: email + password, Google OAuth, confirm/callback routes, `profiles` trigger.
- [x] Admin role check (`is_admin()`, DAL, `npm run admin:grant`).
- [x] Admin chart CRUD with answer-key and distractor editor and publish checklist.
- [x] Seed script for CMS reference data (versioned loader), three hand-written synthetic charts.
- [x] Learner chart list (published only).

**Done when:** an admin logs in, creates a chart with an answer key, and a learner
sees the published list but cannot read any answer-key row by any means.
Verified by `npm run verify:rls` and a browser run (see the Phase 1 report).

**Review gates (owner):** log in as a learner and search devtools for any answer
key; have the coder review the three seed charts before publishing them.

## Phase 2 — The practice loop
Encoder screen (split pane, typeahead over `search_icd10_codes`, assigned-code tray
with HCC and coefficient, running trimmed RAF, evidence highlighting, rationale),
submit, scoring engine in `lib/scoring/` with tests, result screen.
**Done when:** every number on the result screen is reproducible by hand,
including hierarchy trimming.

## Phase 3 — Progress and retention
Dashboard (accuracy trend, streaks, per-trap weakness, next chart), timed mode.

## Phase 4 — Monetisation
Free tier of five charts, paywall, merchant-of-record checkout behind `lib/billing`,
webhooks (signature, idempotency, webhook-before-redirect race), `/billing`.

## Phase 5 — Audit mode and hardening
Audit mode, error boundaries, search rate limiting, Sentry, landing-page SEO, legal pages.

## Content
The product is the chart library. Every answer key is reviewed by a working coder
before publish. Seed charts live in `supabase/seed/charts.ts`; their expected RAF
is asserted in `supabase/seed/__tests__/charts.test.ts`.
