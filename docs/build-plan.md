# Build plan

Superseded by the five-phase product plan in `CLAUDE.md` (Foundations →
Practice loop → Progress → Monetization → Audit mode and hardening), with
choices logged in `DECISIONS.md`.

History: the original Phase 0 (CMS PY2026 V28 data foundation) passed live
verification on 2026-09-21. Its parser and invariants carry forward in
`scripts/lib/reference-build.ts`; its tables were replaced by the versioned
schema in `supabase/migrations/0004`–`0008`.

## Phase 2 — Practice loop (done)
- [x] Encoder: split pane, PY-scoped typeahead, assigned-code tray with HCC,
      coefficient and running hierarchy-trimmed RAF, evidence highlighting,
      per-code rationale, keyboard-first, server-side drafts.
- [x] Scoring engine in `src/lib/scoring/` (pure, tested before the result screen).
- [x] Submit (server-scored, service-role write, one transaction) and the
      result screen with the arithmetic written out.

**Verified:** a chart completed end to end reproduces the hand-worked score
(72.91% for E11.22 + N18.31 on the diabetes chart), and a status code coded
where only history is documented fires its trap explanation.

## Phase 3 — Progress (done)
- [x] Dashboard: accuracy over time, local-day streaks, per-trap and per-family
      weak spots as ranked insights, recommended next chart.
- [x] Timed mode: database-set limits, database-clocked start, auto-submit at 0:00.

**Verified:** after five scored charts the dashboard names a weak spot the
learner would not guess. In the test run that was status vs. history (3 of
3 charts), not the acuity slip that cost them most visibly.

## Phase 4 — Monetization (done)
- [x] Five free charts (the first five an account starts), then a paywall
      enforced in RLS on chart text and attempt starts.
- [x] Checkout through a merchant of record behind `src/lib/billing`
      (Lemon Squeezy adapter; dev fake), `/billing`, cancel, payment portal.
- [x] Webhook: signature, body-hash idempotency, ordering, retry-safe 500s.
- [x] Webhook-before-redirect race: success page syncs then polls.

**Verified (local, fake provider posting signed webhooks to the real
endpoint):** purchase unlocks the full library in both race orders; a
declined card changes nothing; a failed renewal (past_due) keeps access;
exhausted retries lock back to the free five; a cancelled subscription keeps
access until period end, then locks back, including charts started while
subscribed. Bad signatures get 401, a redelivery is a duplicate, and a late
older event is stale. Not yet run against a live Lemon Squeezy test store.

