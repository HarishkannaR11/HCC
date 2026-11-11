# Chartwise — HCC coding practice

Risk adjustment coding practice for Medicare Advantage coders: read a synthetic
physician chart, assign ICD-10-CM codes, and get scored on the HCCs you captured,
missed and over-coded under CMS-HCC V28. Aligned to the CRC exam domains; not
affiliated with AAPC or AHIMA.

**Every chart is synthetic.** Invented patients, providers and facilities. No real
patient data goes into any environment, ever. No CPT content anywhere.

- Product spec and phase plan: [`docs/build-plan.md`](docs/build-plan.md)
- Why things are the way they are: [`DECISIONS.md`](DECISIONS.md)
- CMS/CDC source files: [`data/README.md`](data/README.md)

## Stack

Next.js 16 (App Router, TypeScript strict) · Supabase (Postgres, Auth, RLS) ·
Tailwind v4 + shadcn/ui · Zod · Vitest. Requires **Node 22+**.

## Local setup

### 1. Install

```bash
npm install
```

### 2. Point at a Supabase **dev** project

Never point local development at prod. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dev-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable or legacy anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role / secret key — server only>
DATABASE_URL=postgresql://postgres.<dev-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
# Optional; used for auth email links. Falls back to the request origin.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`DATABASE_URL` is the **session pooler** URI (IPv4, port 5432); the direct
`db.<ref>.supabase.co` host is IPv6-only.

### 3. Apply migrations

```bash
npx supabase db push --db-url "$DATABASE_URL"
```

`db push` applies every pending file in `supabase/migrations/`. Migration 0004
moves any PY2026 reference data already loaded by 0001 into the versioned tables,
so an existing project does not need a reload.

### 4. Load reference data (skip if 0001's tables were already loaded)

Download the CMS/CDC files listed in [`data/README.md`](data/README.md) into
`data/raw/`, then:

```bash
npm run data:build
```

```bash
npm run data:load
```

```bash
npm run data:verify
```

### 5. Seed the three charts (as drafts)

```bash
npm run seed:charts
```

### 6. Make yourself an admin

Sign up at `http://localhost:3000/signup` (after `npm run dev`), then:

```bash
npm run admin:grant -- you@example.com
```

## Supabase Auth configuration (dashboard → Authentication)

- **URL configuration:** Site URL `http://localhost:3000` (dev) / your domain
  (prod). Add `http://localhost:3000/**` and `https://<your-domain>/**` to the
  redirect allow list.
- **Email confirmation template** (Emails → Confirm signup): link to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/practice`
  so confirmation works even when opened in a different browser. The default
  template also works, via `/auth/callback`, in the same browser.
- **Google:** create an OAuth client in Google Cloud (authorised redirect URI
  `https://<ref>.supabase.co/auth/v1/callback`), then enable the Google provider
  in Supabase with its client id and secret.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build, then fails if any service-role marker is in the client bundle |
| `npm test` | Vitest: scoring engine, chart validation, seed-chart RAF checks |
| `npm run typecheck` / `npm run lint` | Types and lint |
| `npm run data:build -- --year=2026` | Parse CMS files in `data/raw` (or `$HCC_RAW_DIR`) |
| `npm run data:load` | Upsert one payment year's reference data |
| `npm run data:verify` | Walk known codes to HCCs and RAF weights against the loaded data |
| `npm run seed:charts` | Load the hand-written charts as drafts (`-- --force`, `-- --publish`) |
| `npm run admin:grant -- <email>` | Grant admin (`--revoke` to remove) |
| `npm run verify:rls` | Attack the answer key as a learner and as anon against the configured project (dev only) |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |

## Security model in one paragraph

Learners read published charts and their own attempts; nothing else. Answer keys
and distractors have no learner RLS policy at all; the only read path is
`get_attempt_answer_key()`, which returns rows only for the caller's own attempt
after it has been submitted, and submission happens server-side. The service-role
key is server-only (`server-only` import plus a post-build bundle scan).
`npm run verify:rls` proves this against a real project rather than by reading
policies.
