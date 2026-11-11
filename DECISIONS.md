# Decisions

One line of reasoning per decision. Newest phase at the bottom of each list.

## Phase 1 — Foundations

### Spec deviations (read these first)

- **Hierarchy trimming uses CMS's suppression pairs, not "highest rank in the group wins".**
  Four of the 21 multi-HCC V28 families are not strict chains: HCC78 (intestinal obstruction) and HCC80 (Crohn's) share a family but neither suppresses the other, as do HCC182/HCC253 and HCC263/HCC405. Group-and-rank trimming would drop HCCs CMS pays. `hcc_hierarchy` keeps the published pairs; `hierarchy_group` / `hierarchy_rank` exist as the spec asks, but only for display and grouping. Phase 2's scoring step 2 must read the pairs (the existing `src/lib/hcc/raf.ts` already does).
- **`icd_hcc_map` keeps CMS's age, sex and MCE edit columns.** The spec's three columns can't express C50.011 → HCC22 under 50 / HCC23 at 50+, and a silently wrong HCC is the failure this product can't afford.
- **`charts` gained a synthetic header: `patient_name`, `patient_dob`, `patient_sex`, `patient_mrn`, `provider_name`, `facility_name`.** The age/sex edits need DOB and sex, and the synthetic-data rule names exactly these fields.
- **`distractors` gained `trap_type`.** Most traps are over-codes (status-vs-history, no-MEAT problem-list entries), so Phase 3's per-trap weakness breakdown needs the trap on the distractor, not only on the key.
- **`answer_key_items.icd10_code` is text validated by a trigger, not a foreign key to `icd10_codes.id`.** Reloading reference data can then never cascade into an answer key.

### Reference data

- Every reference row carries `payment_year`. Migration 0004 copies the 0001 tables across as PY2026/V28 and drops them, so the live project needs no reload.
- `raf_community_nondual` is CMS's "Community, Non-dual, Aged" (CNA) coefficient, the standard reference weight for coder-facing tools. The six other published segments are kept as `coef_*` columns.
- The loader upserts codes and HCCs on natural keys `(payment_year, code)` / `(payment_year, hcc_code)`, so ids stay stable across reloads; the map and hierarchy are replaced per year.
- `hierarchy_rank` = 1 + the number of HCCs that suppress it, because the CMS hierarchy is stored fully expanded. For example, CKD 5 (HCC326) is rank 1 and CKD 3 (HCC329) is rank 4.
- The build takes `--year=` and `HCC_RAW_DIR`, with each year's file names in one `RELEASES` map. Adding PY2027 is one entry, not a rewrite.
- A chart's payment year is frozen once it has answer-key or distractor rows, because those codes were validated against that year's code set.
- Patient age for CMS edits is completed years on **Feb 1 of the payment year**, which is the CMS software's convention, not age on the date of service.
- PY2026 is scored on 2025 dates of service, so the seed charts are dated 2025. The editor flags any other year as an advisory, not a blocker.

### Content and answer keys

- `answer_key_items.hcc_category_id` is derived server-side from the map and the patient's age and sex. It is a label for the editor only; scoring re-derives every HCC. When a code captures two HCCs, the lower-numbered (more severe) one is stored.
- `is_required = false` means acceptable but optional: a missing optional code is not a miss, and including one is not an over-code.
- Publishing runs a checklist. Blocking checks: marked synthetic, has text, has an A&P section, has at least one required key code, and every supporting excerpt appears verbatim (whitespace- and case-insensitive) in the chart. Advisory checks: every required code has an excerpt, at least one distractor, a signature section, and a DOS year that matches the payment year. The signature check is advisory because a missing signature can itself be the trap.
- The verbatim-excerpt rule exists so Phase 2 can compare a learner's highlighted evidence with the key's.
- Section content is plain text, one row per section, as the spec says. Phase 2 evidence links will be `(section_id, start, end)`.
- Seed charts load as **drafts**. A working coder reviews each key before anything is published (`--publish` exists for local testing).

### Security

- Learners have **no** write policies on `attempts`, `attempt_codes` or `attempt_results`. Phase 2's submit action authenticates the user, then writes with the service role. A learner can't forge a submission or a score through the Data API.
- The only learner read path to a key is `get_attempt_answer_key()` / `get_attempt_distractors()`. They are security definer, and return rows only for the caller's own attempt with `submitted_at` set.
- Attempt timestamps must be written from one clock. The `submitted_at >= started_at` check caught real skew between the app server and the DB during verification.
- The role column is protected by column privileges (`grant update (full_name)`), not a trigger. The role is never read from sign-up metadata, which the user controls. Admins are made only with `npm run admin:grant`.
- Anything that isn't public reference data is also `revoke`d from `anon`, as a second lock behind RLS. `TRUNCATE` (which ignores RLS) is revoked from client roles.
- Non-admins get a **404**, not a 403, on `/admin/*`, so a learner doesn't learn the admin area exists. Every admin Server Action re-checks the role and writes through the admin's own RLS session, so the database enforces the role a second time.
- The service-role key has two locks: `import "server-only"` (a client import fails to compile) and `scripts/check-client-bundle.ts` after every `npm run build`, which scans `.next/static` for the key value, the env var name, a service-role JWT payload and `sb_secret_`.

### Auth

- Sign-in is email + password plus Google OAuth via `@supabase/ssr`. `/auth/callback` handles the PKCE code exchange. `/auth/confirm` handles token-hash email links, which work even when the link is opened in another browser.
- Next 16 renamed `middleware` to `proxy`. `src/proxy.ts` refreshes the session and bounces signed-out users. It is an optimistic check only; the DAL (`src/lib/auth/dal.ts`) verifies the user on every page and action with `getUser()`.
- `/` redirects by role (admin → `/admin/charts`, learner → `/practice`) until the landing page exists.

### Tooling

- shadcn/ui components are vendored by hand in shadcn's structure (`components.json`, `src/components/ui/*`, `cn()`), because the registry was unreachable from the build sandbox. They use the project's existing design tokens rather than shadcn's defaults, which would have clashed with the workspace (`muted` means different things). Selects are native (`native-select`), so forms post without client JS.
- New dependencies, all named by the spec's stack: `zod`, `@supabase/ssr`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `server-only`.
- Supabase types are generated by postgres-meta, the generator `supabase gen types` wraps. Regenerate with `npm run db:types`.
- `subscriptions` stores a normalised `status` (text + CHECK, so it's easy to extend) with one row per user. `lib/billing` will map provider statuses into it in Phase 4.
- Migrations 0001–0003 stay in history; 0004 supersedes them. 0004 refuses to run if the 0002 `charts` tables hold rows, rather than drop authored content.
- The Phase 1/2 draft encoder at `/practice/[chartId]` (mock data) is left untouched for Phase 2 to wire up. It now sits behind login.
