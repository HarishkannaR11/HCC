# Chartwise

Risk adjustment coding practice on synthetic charts. A coder reads a synthetic
progress note, assigns ICD-10-CM codes, and is scored deterministically
against an expert answer key under the CMS-HCC model (V28 for PY2026).

Every chart is synthetic. The product uses ICD-10-CM and CMS-HCC data only
(both published free by the US government). It contains no CPT content and
claims no affiliation with any credentialing body.

**Status:** Phase 4 (monetization) complete: five free charts, then a
subscription through a merchant of record (Lemon Squeezy), with signed,
idempotent webhooks and a `/billing` page. Before it: Phase 3 (dashboard,
streaks, weak spots, timed mode) and Phase 2 (encoder, deterministic scoring
with V28 hierarchy trimming, result screen). See `DECISIONS.md` for choices
and deviations, and `CLAUDE.md` for the build plan.

## Stack

Next.js 16 (App Router, TypeScript strict) · Supabase (Postgres, Auth, RLS) ·
Tailwind CSS v4 + shadcn/ui-style components · zod · Vitest.

## Local setup

Requires **Node 22+** and **Docker**.

```bash
npm install
cp .env.example .env.local      # local Supabase defaults; safe demo keys
npm run db:start                # local Supabase (Postgres, Auth, REST)
npm run db:reset                # apply supabase/migrations
```

If Docker cannot pull from `public.ecr.aws`, use Docker Hub instead:
`SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npm run db:start`.

### Reference data and seed charts

With the official CMS/CDC files in `data/raw/` (see `data/README.md`):

```bash
npm run db:seed          # parse -> load PY2026 V28 -> seed the 3 synthetic charts
npm run data:verify      # spot-check codes, weights and hierarchy against CMS values
```

Without them, use the small committed fixture (92 codes, 45 HCCs):

```bash
npm run db:seed:fixture
npm run data:verify -- --fixture
```

### Run the app and become an admin

```bash
npm run dev
```

1. Sign up at http://localhost:3000/signup. Email confirmation is off locally.
2. Promote yourself: `npm run admin:grant -- you@example.com`
3. Log out and back in. You land on `/admin/charts`.

### Payments locally

Set `BILLING_PROVIDER=fake` in `.env.local`. Subscribing then opens a local
test checkout instead of Lemon Squeezy. It posts signed, Lemon-Squeezy-shaped
webhooks to `/api/billing/webhook`, so the real verification path runs. Its
page offers "webhook arrives first", "you return before the webhook" and
"card declined". Once subscribed, `/billing` shows buttons that simulate a
failed renewal, exhausted retries and the end of the paid period. Nothing is
charged, and the fake refuses to run in a Vercel production deploy.

### Tests

```bash
npm test               # unit: parser, HCC resolution, scoring engine (incl. the seed
                       # charts scored on the CMS-format fixture), schemas, compliance
npm run test:rls       # integration: RLS through PostgREST and GraphQL, incl. the
                       # practice loop and the paywall/billing events (needs the
                       # local stack running and `npm run db:seed:fixture`)
npm run typecheck
npm run lint
npm run build          # also fails if a server secret reaches a client bundle
```

## Hosted setup (Supabase + Vercel)

1. **Database.** Apply migrations with the *session pooler* URI (IPv4, port 5432):
   `npx supabase db push --db-url "$DATABASE_URL"`. The direct
   `db.<ref>.supabase.co` host is IPv6-only.
2. **Reference data.** Run `npm run db:seed` with `DATABASE_URL` set to the same pooler URI.
3. **Auth (dashboard):**
   - Site URL: your production origin.
   - Redirect URLs: `<origin>/auth/callback` and `<origin>/auth/confirm`.
   - Keep email confirmation on.
   - For Google, enable the provider with your OAuth client. Its redirect URI is
     `https://<ref>.supabase.co/auth/v1/callback`.
   - Recommended: set the "Confirm signup" email template link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/practice`
     so the link works on any device. The default template also works, but
     only in the browser that signed up.
4. **Vercel env:** set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` and `SITE_URL`. Never prefix the service key with
   `NEXT_PUBLIC_`; the build fails if it reaches the browser.
5. **First admin:** sign up, then `npm run admin:grant -- you@example.com`
   with `DATABASE_URL` set to the hosted pooler URI.
6. **Payments (Lemon Squeezy).** In a store (use test mode first):
   - Create one subscription product with two variants, monthly and annual.
     Match their prices to `src/lib/billing/plans.ts`, which is display only.
   - Add a webhook pointing at `https://<origin>/api/billing/webhook` with a
     signing secret. Subscribe it to `subscription_created`,
     `subscription_updated`, `subscription_cancelled`, `subscription_resumed`,
     `subscription_expired`, `subscription_paused` and `subscription_unpaused`.
     Payment events are accepted but carry no subscription state.
   - Set these Vercel env vars (server only, never `NEXT_PUBLIC_`):
     `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`,
     `LEMONSQUEEZY_VARIANT_MONTHLY`, `LEMONSQUEEZY_VARIANT_ANNUAL`,
     `LEMONSQUEEZY_WEBHOOK_SECRET`. Leave `BILLING_PROVIDER` unset. The build
     fails if the API key or webhook secret reaches a client bundle.
   - Before launch, run one test-mode purchase, a cancellation and a failed
     renewal end to end (see `DECISIONS.md`, Phase 4).

## Layout

```
supabase/migrations/   schema, RLS, triggers (0004+ is the versioned schema)
scripts/               reference-data parser/loader/verifier, chart seed, admin grant,
                       client-bundle secret check
scripts/seed/charts.ts the three hand-written synthetic seed charts
data/fixtures/py2026/  small CMS-format fixture for tests and local dev
src/proxy.ts           session refresh + optimistic redirects (Next 16 "proxy")
src/lib/auth/          session data-access layer, redirect guard
src/lib/charts/        constants, zod schemas, admin data helpers
src/lib/hcc/           CMS edits, HCC resolution, RAF + hierarchy engine
src/lib/scoring/       attempt scoring (SCORE_WEIGHTS) and code review; pure, tested
src/lib/practice/      encoder loaders, scoring snapshot schema, wire types, timed limits
src/lib/progress/      streaks, trend, trap/family weak spots, insights, recommender; pure, tested
src/app/dashboard/     progress dashboard
src/lib/workspace/     encoder client state, running-RAF preview, draft resume
src/components/workspace/  the encoder (chart pane, typeahead, assigned-code tray)
src/app/practice/      chart list, encoder, result screen, start/draft/submit actions
src/app/api/codes/     ICD-10-CM typeahead (signed-in only)
src/lib/supabase/      server client, service-role client (server-only), generated types
src/lib/billing/       provider interface, Lemon Squeezy adapter, dev fake, access rule
src/app/billing/       /billing, checkout/cancel/sync actions, success page (redirect race)
src/app/api/billing/webhook/  signed provider webhooks -> apply_billing_event
src/app/admin/charts/  chart + answer key editor (admin only)
tests/rls/             RLS integration suite
```

Regenerate database types after a migration with `npm run db:types`.
